import { useEffect, useState } from 'react';
import { useTranscriptionStore } from '../../../stores/transcriptionStore';
import SessionControls from './SessionControls';
import TranscriptViewer from './TranscriptViewer';
import SessionReview from './SessionReview';

export default function TranscriptionPage() {
  const {
    currentSession,
    isLoading,
    error,
    clearError,
    isServiceAvailable,
    checkMicrophoneAccess,
    microphonePermission,
  } = useTranscriptionStore();

  const [reviewSession, setReviewSession] = useState<string | null>(null);

  useEffect(() => {
    // Check microphone permission on mount
    checkMicrophoneAccess();
  }, [checkMicrophoneAccess]);

  // Show configuration error if service is not available
  if (!isServiceAvailable()) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-xl p-6 max-w-md text-center">
          <div className="text-4xl mb-4">🎙️</div>
          <h2 className="text-xl font-bold mb-2">Transcription Not Configured</h2>
          <p className="text-slate-400 mb-4">
            To use live transcription, you need to configure the Azure OpenAI transcription service.
          </p>
          <div className="text-sm text-slate-500 bg-slate-900 rounded-lg p-3 text-left">
            <p className="font-medium text-slate-300 mb-2">Add to your .env file:</p>
            <code className="text-emerald-400 text-xs">
              VITE_ENABLE_TRANSCRIPTION=true<br />
              VITE_AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT=gpt-4o-mini-transcribe
            </code>
          </div>
        </div>
      </div>
    );
  }

  // Show microphone permission denied error
  if (microphonePermission === 'denied') {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-xl p-6 max-w-md text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h2 className="text-xl font-bold mb-2">Microphone Access Required</h2>
          <p className="text-slate-400 mb-4">
            Please allow microphone access in your browser settings to use live transcription.
          </p>
          <button
            onClick={() => checkMicrophoneAccess()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  // Show review mode for a specific session
  if (reviewSession) {
    return (
      <SessionReview
        sessionId={reviewSession}
        onBack={() => setReviewSession(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-2 flex items-center justify-between">
          <span className="text-red-400 text-sm">{error}</span>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-300"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {currentSession ? (
          // Active session view
          <>
            {/* Session Controls */}
            <SessionControls />

            {/* Transcript Viewer */}
            <div className="flex-1 min-h-0">
              <TranscriptViewer />
            </div>
          </>
        ) : (
          // Idle state - Start screen
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-center max-w-md mx-auto pt-8">
              <div className="text-6xl mb-4">🎙️</div>
              <h2 className="text-2xl font-bold mb-2">Live Transcription</h2>
              <p className="text-slate-400 mb-6">
                Transcribe Turkish conversations in real-time with English translation.
                Perfect for meetings, lectures, or conversations.
              </p>

              {isLoading ? (
                <div className="flex items-center justify-center gap-2 text-slate-400">
                  <div className="animate-spin">🔄</div>
                  <span>Connecting...</span>
                </div>
              ) : (
                <button
                  onClick={() => useTranscriptionStore.getState().startSession()}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-8 py-3 rounded-xl transition-colors flex items-center gap-2 mx-auto"
                >
                  <span className="text-xl">▶</span>
                  <span>Start Transcription</span>
                </button>
              )}

              {/* Features list */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-lg mb-1">🇹🇷</div>
                  <div className="font-medium">Turkish Speech</div>
                  <div className="text-slate-500">Real-time recognition</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-lg mb-1">🇬🇧</div>
                  <div className="font-medium">English Translation</div>
                  <div className="text-slate-500">Automatic translation</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-lg mb-1">📚</div>
                  <div className="font-medium">Save Vocabulary</div>
                  <div className="text-slate-500">Add to flashcards</div>
                </div>
              </div>
            </div>

            {/* Past Sessions */}
            <div className="w-full flex justify-center">
              <PastSessionsList onSelectSession={setReviewSession} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PastSessionsList({ onSelectSession }: { onSelectSession: (id: string) => void }) {
  const { pastSessions, loadPastSessions } = useTranscriptionStore();

  useEffect(() => {
    loadPastSessions();
  }, [loadPastSessions]);

  if (pastSessions.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mt-8">
      <h3 className="text-sm font-medium text-slate-400 mb-2">Recent Sessions</h3>
      <div className="space-y-2">
        {pastSessions.slice(0, 5).map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className="w-full bg-slate-800 hover:bg-slate-700 rounded-lg p-3 text-left transition-colors flex items-center justify-between"
          >
            <div>
              <div className="font-medium">
                {session.title || formatDate(session.startedAt)}
              </div>
              <div className="text-sm text-slate-400">
                {session.segments.length} segments • {formatDuration(session.totalDuration)}
              </div>
            </div>
            <span className="text-slate-500">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
