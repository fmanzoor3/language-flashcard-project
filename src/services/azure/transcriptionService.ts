/**
 * Azure OpenAI Realtime Transcription Service
 * Handles real-time speech-to-text via WebSocket connection using gpt-4o-mini-transcribe
 *
 * This service converts Turkish speech to text in real-time, supporting long sessions
 * (30+ minutes) for transcribing meetings and conversations.
 */

import type { NoiseReductionMode } from '../../types';

interface TranscriptionConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
}

interface TranscriptionCallbacks {
  onTranscriptionDelta?: (text: string) => void;
  onTranscriptionComplete?: (text: string, confidence?: number) => void;
  onError?: (error: Error) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

interface TranscriptionSession {
  ws: WebSocket;
  callbacks: TranscriptionCallbacks;
  isConnected: boolean;
  reconnectAttempts: number;
}

let currentSession: TranscriptionSession | null = null;

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 2000; // 2 seconds

/**
 * Get transcription configuration from environment variables
 */
function getTranscriptionConfig(): TranscriptionConfig {
  let endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT?.trim();
  const apiKey = import.meta.env.VITE_AZURE_OPENAI_API_KEY?.trim();
  const deployment = import.meta.env.VITE_AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT?.trim() || 'gpt-4o-mini-transcribe';

  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI configuration missing for transcription service.');
  }

  // Convert HTTP endpoint to WebSocket endpoint
  endpoint = endpoint.replace(/\/$/, '').replace('https://', '').replace('http://', '');

  return { endpoint: `wss://${endpoint}`, apiKey, deployment };
}

/**
 * Check if transcription service is available
 */
export function isTranscriptionAvailable(): boolean {
  const enabled = import.meta.env.VITE_ENABLE_TRANSCRIPTION === 'true';
  const hasConfig = !!import.meta.env.VITE_AZURE_OPENAI_ENDPOINT && !!import.meta.env.VITE_AZURE_OPENAI_API_KEY;
  return enabled && hasConfig;
}

/**
 * Start a transcription session
 * Opens WebSocket connection to Azure OpenAI Realtime API configured for speech-to-text
 */
export async function startTranscriptionSession(
  callbacks: TranscriptionCallbacks,
  options: {
    noiseReduction?: NoiseReductionMode;
    vadThreshold?: number;
    silenceDuration?: number;
  } = {}
): Promise<void> {
  const { noiseReduction = 'near_field', vadThreshold = 0.5, silenceDuration = 500 } = options;

  // Stop any existing session
  stopTranscriptionSession();

  const config = getTranscriptionConfig();
  const apiVersion = '2024-12-17';

  // Build WebSocket URL with API key as query parameter
  const wsUrl = `${config.endpoint}/openai/realtime?api-version=${apiVersion}&deployment=${config.deployment}&api-key=${encodeURIComponent(config.apiKey)}`;

  return new Promise((resolve, reject) => {
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      const error = new Error(
        'Failed to create WebSocket connection. Make sure the gpt-4o-mini-transcribe model is deployed in your Azure OpenAI resource.'
      );
      callbacks.onError?.(error);
      reject(error);
      return;
    }

    currentSession = {
      ws,
      callbacks,
      isConnected: false,
      reconnectAttempts: 0,
    };

    ws.onopen = () => {
      if (!currentSession) return;

      currentSession.isConnected = true;
      currentSession.reconnectAttempts = 0;

      // Configure session for transcription
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text'],
          input_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            threshold: vadThreshold,
            prefix_padding_ms: 300,
            silence_duration_ms: silenceDuration,
            create_response: false, // We just want transcription, not AI responses
          },
          ...(noiseReduction !== 'none' && {
            input_audio_noise_reduction: {
              type: noiseReduction,
            },
          }),
        },
      };

      ws.send(JSON.stringify(sessionConfig));

      callbacks.onConnected?.();
      resolve();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleTranscriptionMessage(message);
      } catch (err) {
        console.error('Error processing transcription message:', err);
      }
    };

    ws.onerror = () => {
      const error = new Error(
        'WebSocket connection failed. Possible causes:\n' +
        '1. The gpt-4o-mini-transcribe model is not deployed in your Azure OpenAI resource\n' +
        '2. The Realtime API may not be available in your Azure region\n' +
        '3. Check your Azure OpenAI deployment settings'
      );

      if (currentSession && currentSession.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        // Attempt reconnection
        currentSession.reconnectAttempts++;
        setTimeout(() => {
          if (currentSession) {
            startTranscriptionSession(callbacks, options);
          }
        }, RECONNECT_DELAY);
      } else {
        callbacks.onError?.(error);
        reject(error);
      }
    };

    ws.onclose = () => {
      if (currentSession?.ws === ws) {
        currentSession.isConnected = false;
        callbacks.onDisconnected?.();
      }
    };
  });
}

/**
 * Handle incoming transcription messages from WebSocket
 */
function handleTranscriptionMessage(message: Record<string, unknown>): void {
  if (!currentSession) return;

  const { callbacks } = currentSession;

  switch (message.type) {
    case 'session.created':
    case 'session.updated':
      // Session is ready for audio input
      break;

    case 'conversation.item.input_audio_transcription.delta':
      // Incremental transcription update
      if (typeof message.delta === 'string') {
        callbacks.onTranscriptionDelta?.(message.delta);
      }
      break;

    case 'conversation.item.input_audio_transcription.completed':
      // Segment transcription complete
      if (typeof message.transcript === 'string') {
        const confidence = typeof message.confidence === 'number' ? message.confidence : undefined;
        callbacks.onTranscriptionComplete?.(message.transcript, confidence);
      }
      break;

    case 'input_audio_buffer.speech_started':
      // User started speaking
      break;

    case 'input_audio_buffer.speech_stopped':
      // User stopped speaking
      break;

    case 'error':
      // Handle error messages
      const errorMessage = (message.error as { message?: string })?.message || 'Transcription error';
      callbacks.onError?.(new Error(errorMessage));
      break;

    default:
      // Log unknown message types for debugging
      if (import.meta.env.DEV) {
        console.log('Unknown transcription message:', message.type);
      }
  }
}

/**
 * Send audio data to the transcription service
 * @param base64Audio - Base64-encoded PCM16 audio chunk
 */
export function sendAudioChunk(base64Audio: string): void {
  if (!currentSession?.isConnected) {
    console.warn('Cannot send audio: transcription session not connected');
    return;
  }

  const audioMessage = {
    type: 'input_audio_buffer.append',
    audio: base64Audio,
  };

  try {
    currentSession.ws.send(JSON.stringify(audioMessage));
  } catch (err) {
    console.error('Error sending audio chunk:', err);
    currentSession.callbacks.onError?.(new Error('Failed to send audio data'));
  }
}

/**
 * Commit the current audio buffer (triggers transcription of buffered audio)
 */
export function commitAudioBuffer(): void {
  if (!currentSession?.isConnected) return;

  const commitMessage = {
    type: 'input_audio_buffer.commit',
  };

  try {
    currentSession.ws.send(JSON.stringify(commitMessage));
  } catch (err) {
    console.error('Error committing audio buffer:', err);
  }
}

/**
 * Clear the audio buffer without transcribing
 */
export function clearAudioBuffer(): void {
  if (!currentSession?.isConnected) return;

  const clearMessage = {
    type: 'input_audio_buffer.clear',
  };

  try {
    currentSession.ws.send(JSON.stringify(clearMessage));
  } catch (err) {
    console.error('Error clearing audio buffer:', err);
  }
}

/**
 * Stop the transcription session and close WebSocket connection
 */
export function stopTranscriptionSession(): void {
  if (currentSession) {
    if (currentSession.ws.readyState === WebSocket.OPEN) {
      // Commit any remaining audio before closing
      commitAudioBuffer();
      currentSession.ws.close();
    }

    currentSession = null;
  }
}

/**
 * Pause transcription (keeps connection but stops processing)
 */
export function pauseTranscription(): void {
  // Clear any buffered audio when pausing
  clearAudioBuffer();
}

/**
 * Resume transcription
 */
export function resumeTranscription(): void {
  // Nothing special needed - just start sending audio again
}

/**
 * Check if transcription session is connected
 */
export function isSessionConnected(): boolean {
  return currentSession?.isConnected ?? false;
}

/**
 * Get current session state for debugging
 */
export function getSessionState(): {
  isConnected: boolean;
  reconnectAttempts: number;
} | null {
  if (!currentSession) return null;
  return {
    isConnected: currentSession.isConnected,
    reconnectAttempts: currentSession.reconnectAttempts,
  };
}
