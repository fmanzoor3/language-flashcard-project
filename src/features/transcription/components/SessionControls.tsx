import { useEffect, useState, useRef } from 'react';
import { useTranscriptionStore } from '../../../stores/transcriptionStore';

export default function SessionControls() {
  const {
    currentSession,
    stopSession,
    pauseSession,
    resumeSession,
    autoTranslate,
    setAutoTranslate,
  } = useTranscriptionStore();

  const [duration, setDuration] = useState(0);
  const accumulatedTimeRef = useRef(0);
  const lastUpdateRef = useRef<number | null>(null);

  // Update duration every second, but only when recording
  useEffect(() => {
    if (!currentSession) {
      // Reset when session ends
      accumulatedTimeRef.current = 0;
      lastUpdateRef.current = null;
      setDuration(0);
      return;
    }

    const isRecording = currentSession.status === 'recording';

    if (isRecording) {
      // Start or resume timing
      if (lastUpdateRef.current === null) {
        lastUpdateRef.current = Date.now();
      }

      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - (lastUpdateRef.current || now);
        accumulatedTimeRef.current += elapsed;
        lastUpdateRef.current = now;
        setDuration(accumulatedTimeRef.current);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      // Paused - stop tracking but keep accumulated time
      lastUpdateRef.current = null;
    }
  }, [currentSession, currentSession?.status]);

  if (!currentSession) return null;

  const isRecording = currentSession.status === 'recording';
  const isPaused = currentSession.status === 'paused';

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Status and Duration */}
        <div className="flex items-center gap-4">
          {/* Recording indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isRecording
                  ? 'bg-red-500 animate-pulse'
                  : isPaused
                  ? 'bg-yellow-500'
                  : 'bg-slate-500'
              }`}
            />
            <span className="font-medium">
              {isRecording ? 'Recording' : isPaused ? 'Paused' : 'Stopped'}
            </span>
          </div>

          {/* Duration */}
          <div className="text-lg font-mono text-slate-300">
            {formatDuration(duration)}
          </div>

          {/* Segment count */}
          <div className="text-sm text-slate-400">
            {currentSession.segments.length} segments
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Auto-translate toggle */}
          <button
            onClick={() => setAutoTranslate(!autoTranslate)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
              autoTranslate
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
            title={autoTranslate ? 'Auto-translate on' : 'Auto-translate off'}
          >
            <span>🌐</span>
            <span className="hidden sm:inline">
              {autoTranslate ? 'Auto' : 'Manual'}
            </span>
          </button>

          {/* Pause/Resume */}
          {isRecording ? (
            <button
              onClick={pauseSession}
              className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 px-4 py-1.5 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>⏸</span>
              <span className="hidden sm:inline">Pause</span>
            </button>
          ) : isPaused ? (
            <button
              onClick={resumeSession}
              className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-4 py-1.5 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>▶</span>
              <span className="hidden sm:inline">Resume</span>
            </button>
          ) : null}

          {/* Stop */}
          <button
            onClick={stopSession}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg transition-colors flex items-center gap-2"
          >
            <span>⏹</span>
            <span className="hidden sm:inline">Stop & Review</span>
          </button>
        </div>
      </div>

      {/* Live indicator bar */}
      {isRecording && (
        <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 animate-pulse" />
        </div>
      )}
    </div>
  );
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
