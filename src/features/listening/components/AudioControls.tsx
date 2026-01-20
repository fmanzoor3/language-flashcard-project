import { useState, useCallback } from 'react';
import { useListeningStore } from '../../../stores/listeningStore';
import {
  synthesizeSpeech,
  stopPlayback,
  type VoiceOption,
  type PlaybackSpeed,
} from '../../../services/azure/realtimeAudioService';

interface AudioControlsProps {
  text: string;
  speed: number;
  voice: VoiceOption;
  onSpeedChange: (speed: number) => void;
  onVoiceChange: (voice: VoiceOption) => void;
}

const SPEED_OPTIONS: { value: PlaybackSpeed; label: string }[] = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1.0, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
];

const VOICE_OPTIONS: { value: VoiceOption; label: string; description: string }[] = [
  { value: 'alloy', label: 'Alloy', description: 'Neutral' },
  { value: 'echo', label: 'Echo', description: 'Male' },
  { value: 'shimmer', label: 'Shimmer', description: 'Female' },
];

export default function AudioControls({
  text,
  speed,
  voice,
  onSpeedChange,
  onVoiceChange,
}: AudioControlsProps) {
  const { isPlaying, setPlaying } = useListeningStore();
  const [playCount, setPlayCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handlePlay = useCallback(async () => {
    if (isPlaying) {
      stopPlayback();
      setPlaying(false);
      return;
    }

    setError(null);
    setPlaying(true);

    try {
      await synthesizeSpeech(text, {
        voice,
        speed: speed as PlaybackSpeed,
        onStart: () => {
          setPlayCount((c) => c + 1);
        },
        onComplete: () => {
          setPlaying(false);
        },
        onError: (err) => {
          setError(err.message);
          setPlaying(false);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to play audio');
      setPlaying(false);
    }
  }, [text, voice, speed, isPlaying, setPlaying]);

  return (
    <div className="space-y-4">
      {/* Main Play Button */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={handlePlay}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all ${
            isPlaying
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-emerald-500 hover:bg-emerald-600'
          }`}
        >
          {isPlaying ? '⏹️' : '▶️'}
        </button>
      </div>

      {/* Play Count & Status */}
      <div className="text-center">
        {isPlaying ? (
          <p className="text-sm text-emerald-400 animate-pulse">Playing audio...</p>
        ) : playCount > 0 ? (
          <p className="text-sm text-slate-400">Played {playCount} time{playCount !== 1 ? 's' : ''}</p>
        ) : (
          <p className="text-sm text-slate-400">Click to listen</p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded px-3 py-2 text-center">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Speed & Voice Controls */}
      <div className="flex items-center justify-center gap-6 flex-wrap">
        {/* Speed Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Speed:</span>
          <div className="flex gap-1">
            {SPEED_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onSpeedChange(option.value)}
                disabled={isPlaying}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  speed === option.value
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                } disabled:opacity-50`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Voice:</span>
          <div className="flex gap-1">
            {VOICE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onVoiceChange(option.value)}
                disabled={isPlaying}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  voice === option.value
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                } disabled:opacity-50`}
                title={option.description}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Keyboard Hint */}
      <p className="text-center text-xs text-slate-500">
        Tip: Listen multiple times at slower speeds to catch every word
      </p>
    </div>
  );
}
