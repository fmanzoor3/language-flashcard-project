import { useState } from 'react';
import { useListeningStore } from '../../../stores/listeningStore';
import DictationExercise from './DictationExercise';
import ComprehensionExercise from './ComprehensionExercise';
import LessonComplete from './LessonComplete';
import AudioControls from './AudioControls';
import type { DifficultyLevel } from '../../../types';

const DIFFICULTY_STYLES: Record<DifficultyLevel, string> = {
  A1: 'bg-green-500/20 text-green-400',
  A2: 'bg-blue-500/20 text-blue-400',
  B1: 'bg-purple-500/20 text-purple-400',
  B2: 'bg-orange-500/20 text-orange-400',
  C1: 'bg-red-500/20 text-red-400',
  C2: 'bg-pink-500/20 text-pink-400',
};

export default function LessonPlayer() {
  const {
    currentLesson,
    currentExerciseIndex,
    currentProgress,
    error,
    playbackSpeed,
    selectedVoice,
    getCurrentExercise,
    getCurrentExerciseProgress,
    nextExercise,
    previousExercise,
    endLesson,
    setPlaybackSpeed,
    setVoice,
    reset,
  } = useListeningStore();

  const [showComplete, setShowComplete] = useState(false);
  const [finalProgress, setFinalProgress] = useState<typeof currentProgress>(null);

  if (!currentLesson) {
    return null;
  }

  const currentExercise = getCurrentExercise();
  const exerciseProgress = getCurrentExerciseProgress();
  const totalExercises = currentLesson.exercises.length;
  const completedCount = currentProgress?.exerciseProgress.filter((ep) => ep.completed).length || 0;
  const isLastExercise = currentExerciseIndex === totalExercises - 1;

  const handleExerciseComplete = () => {
    if (isLastExercise) {
      handleFinishLesson();
    } else {
      nextExercise();
    }
  };

  const handleFinishLesson = async () => {
    const progress = await endLesson();
    setFinalProgress(progress);
    setShowComplete(true);
  };

  const handleClose = () => {
    setShowComplete(false);
    setFinalProgress(null);
    reset();
  };

  if (showComplete && finalProgress) {
    return <LessonComplete progress={finalProgress} lesson={currentLesson} onClose={handleClose} />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <span>←</span>
              <span className="text-sm">Exit</span>
            </button>
            <span className={`px-2 py-0.5 rounded text-xs ${DIFFICULTY_STYLES[currentLesson.difficulty]}`}>
              {currentLesson.difficulty}
            </span>
          </div>

          <h2 className="text-lg font-bold text-slate-100 mb-1">{currentLesson.title}</h2>
          <p className="text-sm text-slate-400">{currentLesson.titleTurkish}</p>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Exercise {currentExerciseIndex + 1} of {totalExercises}</span>
              <span>{completedCount} completed</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${((currentExerciseIndex + 1) / totalExercises) * 100}%` }}
              />
            </div>

            {/* Exercise Indicators */}
            <div className="flex gap-1 mt-2">
              {currentLesson.exercises.map((ex, idx) => {
                const ep = currentProgress?.exerciseProgress[idx];
                let bgColor = 'bg-slate-700';
                if (ep?.correct) bgColor = 'bg-emerald-500';
                else if (ep?.completed && !ep.correct) bgColor = 'bg-red-500';
                else if (idx === currentExerciseIndex) bgColor = 'bg-emerald-500/50';

                return (
                  <div
                    key={ex.id}
                    className={`flex-1 h-1 rounded ${bgColor} transition-colors`}
                    title={`Exercise ${idx + 1}: ${ex.type}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Audio Controls */}
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-3xl mx-auto">
          <AudioControls
            text={currentExercise?.audioText || ''}
            speed={playbackSpeed}
            voice={selectedVoice}
            onSpeedChange={setPlaybackSpeed}
            onVoiceChange={setVoice}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 max-w-3xl mx-auto">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Exercise Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto">
          {currentExercise?.type === 'dictation' ? (
            <DictationExercise
              exercise={currentExercise}
              progress={exerciseProgress}
              onComplete={handleExerciseComplete}
              isLast={isLastExercise}
            />
          ) : currentExercise?.type === 'comprehension' ? (
            <ComprehensionExercise
              exercise={currentExercise}
              progress={exerciseProgress}
              onComplete={handleExerciseComplete}
              isLast={isLastExercise}
            />
          ) : null}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="p-4 border-t border-slate-700 bg-slate-800">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={previousExercise}
            disabled={currentExerciseIndex === 0}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          {currentProgress && (
            <div className="text-sm text-emerald-400">
              +{currentProgress.totalXPEarned} XP
            </div>
          )}

          {isLastExercise ? (
            <button
              onClick={handleFinishLesson}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Finish Lesson
            </button>
          ) : (
            <button
              onClick={nextExercise}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
            >
              Skip →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
