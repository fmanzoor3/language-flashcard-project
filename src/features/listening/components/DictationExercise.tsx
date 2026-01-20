import { useState, useEffect, useRef } from 'react';
import { useListeningStore, calculateTurkishSimilarity } from '../../../stores/listeningStore';
import type { ListeningExercise, ExerciseProgress } from '../../../types';

interface DictationExerciseProps {
  exercise: ListeningExercise;
  progress: ExerciseProgress | null;
  onComplete: () => void;
  isLast: boolean;
}

export default function DictationExercise({
  exercise,
  progress,
  onComplete,
  isLast,
}: DictationExerciseProps) {
  const { submitDictationAnswer, useHint } = useListeningStore();

  const [userAnswer, setUserAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; xpEarned: number } | null>(null);
  const [currentHintIndex, setCurrentHintIndex] = useState(-1);
  const [showTranslation, setShowTranslation] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when exercise changes
  useEffect(() => {
    setUserAnswer('');
    setSubmitted(false);
    setResult(null);
    setCurrentHintIndex(-1);
    setShowTranslation(false);
    inputRef.current?.focus();
  }, [exercise.id]);

  // Restore previous answer if exercise was already attempted
  useEffect(() => {
    if (progress?.userAnswer && progress.completed) {
      setUserAnswer(progress.userAnswer);
      setSubmitted(true);
      setResult({ correct: progress.correct, xpEarned: progress.xpEarned });
    }
  }, [progress]);

  const handleSubmit = async () => {
    if (!userAnswer.trim() || submitted) return;

    const res = await submitDictationAnswer(userAnswer.trim());
    setResult(res);
    setSubmitted(true);
  };

  const handleShowHint = () => {
    if (!exercise.hints || currentHintIndex >= exercise.hints.length - 1) return;

    useHint();
    setCurrentHintIndex((prev) => prev + 1);
  };

  const handleTryAgain = () => {
    setUserAnswer('');
    setSubmitted(false);
    setResult(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!submitted) {
        handleSubmit();
      } else if (result?.correct) {
        onComplete();
      }
    }
  };

  const similarity = submitted
    ? calculateTurkishSimilarity(userAnswer, exercise.targetText || exercise.audioText)
    : 0;

  const hasMoreHints = exercise.hints && currentHintIndex < exercise.hints.length - 1;

  return (
    <div className="space-y-6">
      {/* Exercise Type Badge */}
      <div className="flex items-center gap-2">
        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
          Dictation
        </span>
        <span className="text-slate-400 text-sm">
          Type what you hear
        </span>
      </div>

      {/* Hints Section */}
      {exercise.hints && exercise.hints.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Hints</span>
            {hasMoreHints && !submitted && (
              <button
                onClick={handleShowHint}
                className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
              >
                Show hint ({currentHintIndex + 2}/{exercise.hints.length})
              </button>
            )}
          </div>

          {currentHintIndex >= 0 ? (
            <div className="space-y-2">
              {exercise.hints.slice(0, currentHintIndex + 1).map((hint, idx) => (
                <p key={idx} className="text-sm text-amber-300/80">
                  {idx + 1}. {hint}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">
              Click "Show hint" if you need help
            </p>
          )}
        </div>
      )}

      {/* Input Area */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">
          Your answer:
        </label>
        <textarea
          ref={inputRef}
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitted}
          placeholder="Type what you heard in Turkish..."
          className={`w-full px-4 py-3 bg-slate-800 border rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-colors resize-none ${
            submitted
              ? result?.correct
                ? 'border-emerald-500 focus:ring-emerald-500'
                : 'border-red-500 focus:ring-red-500'
              : 'border-slate-600 focus:ring-emerald-500 focus:border-emerald-500'
          }`}
          rows={3}
        />
      </div>

      {/* Result Feedback */}
      {submitted && result && (
        <div
          className={`rounded-lg p-4 ${
            result.correct ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-red-500/20 border border-red-500/50'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{result.correct ? '✅' : '❌'}</span>
            <span className={`font-medium ${result.correct ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.correct ? 'Correct!' : 'Not quite right'}
            </span>
            {result.xpEarned > 0 && (
              <span className="ml-auto text-sm text-emerald-400">+{result.xpEarned} XP</span>
            )}
          </div>

          {/* Show correct answer if wrong */}
          {!result.correct && (
            <div className="mb-3">
              <p className="text-sm text-slate-400 mb-1">Correct answer:</p>
              <p className="text-slate-100 font-medium">{exercise.targetText || exercise.audioText}</p>
              <p className="text-sm text-slate-400 mt-1">Your accuracy: {similarity}%</p>
            </div>
          )}

          {/* Show translation toggle */}
          <div className="pt-3 border-t border-slate-700">
            <button
              onClick={() => setShowTranslation(!showTranslation)}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showTranslation ? 'Hide' : 'Show'} translation
            </button>
            {showTranslation && (
              <p className="text-sm text-slate-300 mt-2 italic">{exercise.audioTextTranslation}</p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        {submitted ? (
          <>
            {!result?.correct && (
              <button
                onClick={handleTryAgain}
                className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                Try Again
              </button>
            )}
            <button
              onClick={onComplete}
              className="ml-auto px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
            >
              {isLast ? 'Finish' : 'Continue'} →
            </button>
          </>
        ) : (
          <>
            <div className="text-xs text-slate-500">Press Enter to submit</div>
            <button
              onClick={handleSubmit}
              disabled={!userAnswer.trim()}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              Check Answer
            </button>
          </>
        )}
      </div>
    </div>
  );
}
