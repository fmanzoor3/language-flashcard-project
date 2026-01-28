import { create } from 'zustand';
import { db } from '../services/storage/db';
import { useUserStore } from './userStore';
import { chatCompletion } from '../services/azure/openaiClient';
import {
  initializeMicrophone,
  initializeTabCapture,
  isTabCaptureSupported,
  getAudioSource,
  startCapture,
  stopCapture,
  pauseCapture,
  resumeCapture,
  checkMicrophonePermission,
  type MicrophonePermission,
} from '../services/azure/audioCapture';
import {
  startTranscriptionSession,
  stopTranscriptionSession,
  sendAudioChunk,
  pauseTranscription,
  resumeTranscription,
  isTranscriptionAvailable,
} from '../services/azure/transcriptionService';
import type {
  TranscriptionSession,
  TranscriptionSegment,
  TranscriptionStatus,
  NoiseReductionMode,
  AudioSourceType,
} from '../types';

// XP rewards for transcription
const XP_SESSION_COMPLETE = 25;
const XP_PER_MINUTE = 2; // 2 XP per minute of transcription

interface TranscriptionStore {
  // State
  currentSession: TranscriptionSession | null;
  pastSessions: TranscriptionSession[];
  isLoading: boolean;
  error: string | null;

  // Live transcription state
  currentSegmentText: string;      // Partial text being transcribed
  microphonePermission: MicrophonePermission;

  // Settings
  autoTranslate: boolean;
  noiseReduction: NoiseReductionMode;
  vadThreshold: number;
  silenceDuration: number;

  // Actions
  loadPastSessions: () => Promise<void>;
  startSession: (audioSource?: AudioSourceType) => Promise<void>;
  stopSession: () => Promise<TranscriptionSession | null>;
  pauseSession: () => void;
  resumeSession: () => void;
  deleteSession: (sessionId: string) => Promise<void>;

  // Translation
  translateSegment: (segmentId: string) => Promise<void>;
  translateAllSegments: () => Promise<void>;

  // Settings
  setAutoTranslate: (enabled: boolean) => void;
  setNoiseReduction: (mode: NoiseReductionMode) => void;
  setVadThreshold: (threshold: number) => void;
  setSilenceDuration: (duration: number) => void;

  // Utilities
  clearError: () => void;
  checkMicrophoneAccess: () => Promise<MicrophonePermission>;

  // Getters
  getSessionDuration: () => number;
  getSessionStatus: () => TranscriptionStatus;
  isServiceAvailable: () => boolean;
  isTabCaptureSupported: () => boolean;
}

export const useTranscriptionStore = create<TranscriptionStore>((set, get) => ({
  currentSession: null,
  pastSessions: [],
  isLoading: false,
  error: null,
  currentSegmentText: '',
  microphonePermission: 'prompt',

  // Default settings
  autoTranslate: true,
  noiseReduction: 'near_field',
  vadThreshold: 0.5,
  silenceDuration: 500,

  loadPastSessions: async () => {
    set({ isLoading: true });
    try {
      const sessions = await db.transcriptionSessions
        .where('status')
        .equals('completed')
        .reverse()
        .sortBy('startedAt');
      set({ pastSessions: sessions, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load sessions',
        isLoading: false,
      });
    }
  },

  startSession: async (audioSource: AudioSourceType = 'microphone') => {
    const { noiseReduction, vadThreshold, silenceDuration } = get();

    set({ isLoading: true, error: null });

    try {
      // Check if service is available
      if (!isTranscriptionAvailable()) {
        throw new Error('Transcription service is not configured. Check your Azure settings.');
      }

      // Initialize audio source based on selection
      if (audioSource === 'tab') {
        if (!isTabCaptureSupported()) {
          throw new Error('Tab audio capture is not supported in this browser. Please use Chrome or Edge.');
        }
        await initializeTabCapture();
      } else {
        await initializeMicrophone();
        set({ microphonePermission: 'granted' });
      }

      // Create new session with audio source
      const session: TranscriptionSession = {
        id: crypto.randomUUID(),
        startedAt: new Date(),
        segments: [],
        totalDuration: 0,
        status: 'recording',
        savedVocabulary: [],
        audioSource: getAudioSource(),
      };

      // Start transcription WebSocket connection
      await startTranscriptionSession(
        {
          onTranscriptionDelta: (text) => {
            // Update partial transcription
            set((state) => ({
              currentSegmentText: state.currentSegmentText + text,
            }));
          },
          onTranscriptionComplete: async (text, confidence) => {
            const { currentSession, autoTranslate } = get();
            if (!currentSession || !text.trim()) return;

            // Create new segment
            const segment: TranscriptionSegment = {
              id: crypto.randomUUID(),
              turkishText: text.trim(),
              timestamp: new Date(),
              startTime: Date.now() - currentSession.startedAt.getTime(),
              confidence,
            };

            // Auto-translate if enabled
            if (autoTranslate) {
              try {
                const translation = await translateText(text.trim());
                segment.englishTranslation = translation;
              } catch {
                // Translation failed, continue without it
              }
            }

            // Add segment to session
            set((state) => ({
              currentSession: state.currentSession
                ? {
                    ...state.currentSession,
                    segments: [...state.currentSession.segments, segment],
                  }
                : null,
              currentSegmentText: '',
            }));
          },
          onError: (error) => {
            set({ error: error.message });
          },
          onConnected: () => {
            // Start audio capture and send to transcription service
            startCapture((base64Audio) => {
              sendAudioChunk(base64Audio);
            });
          },
          onDisconnected: () => {
            stopCapture();
          },
        },
        { noiseReduction, vadThreshold, silenceDuration }
      );

      set({
        currentSession: session,
        isLoading: false,
        currentSegmentText: '',
      });
    } catch (error) {
      stopCapture();
      set({
        error: error instanceof Error ? error.message : 'Failed to start transcription',
        isLoading: false,
        microphonePermission: error instanceof Error && error.message.includes('permission')
          ? 'denied'
          : get().microphonePermission,
      });
    }
  },

  stopSession: async () => {
    const { currentSession } = get();
    if (!currentSession) return null;

    // Stop audio capture and transcription
    stopCapture();
    stopTranscriptionSession();

    // Calculate final duration
    const endTime = new Date();
    const totalDuration = endTime.getTime() - currentSession.startedAt.getTime();

    // Update session with final data
    const completedSession: TranscriptionSession = {
      ...currentSession,
      endedAt: endTime,
      totalDuration,
      status: 'completed',
    };

    // Save to database
    try {
      await db.transcriptionSessions.add(completedSession);

      // Award XP
      const minutes = Math.floor(totalDuration / 60000);
      const xpAmount = XP_SESSION_COMPLETE + (minutes * XP_PER_MINUTE);
      useUserStore.getState().addXP({
        type: 'transcription',
        amount: xpAmount,
        description: `Completed ${minutes} minute transcription session`,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to save session:', error);
    }

    set({
      currentSession: null,
      currentSegmentText: '',
      pastSessions: [completedSession, ...get().pastSessions],
    });

    return completedSession;
  },

  pauseSession: () => {
    const { currentSession } = get();
    if (!currentSession || currentSession.status !== 'recording') return;

    pauseCapture();
    pauseTranscription();

    set({
      currentSession: {
        ...currentSession,
        status: 'paused',
      },
    });
  },

  resumeSession: () => {
    const { currentSession } = get();
    if (!currentSession || currentSession.status !== 'paused') return;

    resumeCapture();
    resumeTranscription();

    set({
      currentSession: {
        ...currentSession,
        status: 'recording',
      },
    });
  },

  deleteSession: async (sessionId: string) => {
    try {
      await db.transcriptionSessions.delete(sessionId);
      set((state) => ({
        pastSessions: state.pastSessions.filter((s) => s.id !== sessionId),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete session',
      });
    }
  },

  translateSegment: async (segmentId: string) => {
    const { currentSession, pastSessions } = get();

    // Find the segment in current or past sessions
    let session = currentSession;
    if (!session || !session.segments.find((s) => s.id === segmentId)) {
      session = pastSessions.find((s) => s.segments.find((seg) => seg.id === segmentId)) || null;
    }

    if (!session) return;

    const segment = session.segments.find((s) => s.id === segmentId);
    if (!segment || segment.englishTranslation) return;

    try {
      const translation = await translateText(segment.turkishText);

      // Update the segment
      const updatedSegments = session.segments.map((s) =>
        s.id === segmentId ? { ...s, englishTranslation: translation } : s
      );

      if (currentSession?.id === session.id) {
        set({
          currentSession: { ...currentSession, segments: updatedSegments },
        });
      } else {
        // Update in database and state for past sessions
        const updatedSession = { ...session, segments: updatedSegments };
        await db.transcriptionSessions.put(updatedSession);
        set((state) => ({
          pastSessions: state.pastSessions.map((s) =>
            s.id === session.id ? updatedSession : s
          ),
        }));
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to translate segment',
      });
    }
  },

  translateAllSegments: async () => {
    const { currentSession } = get();
    if (!currentSession) return;

    const untranslatedSegments = currentSession.segments.filter((s) => !s.englishTranslation);

    for (const segment of untranslatedSegments) {
      await get().translateSegment(segment.id);
    }
  },

  setAutoTranslate: (enabled: boolean) => {
    set({ autoTranslate: enabled });
  },

  setNoiseReduction: (mode: NoiseReductionMode) => {
    set({ noiseReduction: mode });
  },

  setVadThreshold: (threshold: number) => {
    set({ vadThreshold: Math.max(0, Math.min(1, threshold)) });
  },

  setSilenceDuration: (duration: number) => {
    set({ silenceDuration: Math.max(200, Math.min(2000, duration)) });
  },

  clearError: () => {
    set({ error: null });
  },

  checkMicrophoneAccess: async () => {
    const permission = await checkMicrophonePermission();
    set({ microphonePermission: permission });
    return permission;
  },

  getSessionDuration: () => {
    const { currentSession } = get();
    if (!currentSession) return 0;
    return Date.now() - currentSession.startedAt.getTime();
  },

  getSessionStatus: () => {
    const { currentSession } = get();
    return currentSession?.status || 'idle';
  },

  isServiceAvailable: () => {
    return isTranscriptionAvailable();
  },

  isTabCaptureSupported: () => {
    return isTabCaptureSupported();
  },
}));

/**
 * Translate Turkish text to English using the OpenAI client
 */
async function translateText(turkishText: string): Promise<string> {
  const response = await chatCompletion([
    {
      role: 'system',
      content: 'You are a Turkish to English translator. Translate the given Turkish text to English. Return only the translation, nothing else.',
    },
    {
      role: 'user',
      content: turkishText,
    },
  ], { model: 'gpt-4o-mini', temperature: 0.3 });

  return response.trim();
}
