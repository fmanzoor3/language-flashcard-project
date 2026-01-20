import type { ListeningLessonProgress, ListeningLesson } from '../../../types';

interface LessonCompleteProps {
  progress: ListeningLessonProgress;
  lesson: ListeningLesson;
  onClose: () => void;
}

export default function LessonComplete({ progress, lesson, onClose }: LessonCompleteProps) {
  const correctCount = progress.exerciseProgress.filter((ep) => ep.correct).length;
  const totalExercises = lesson.exercises.length;
  const isPerfect = progress.accuracy === 100;

  return (
    <div className="h-full flex items-center justify-center p-6 bg-slate-900">
      <div className="max-w-md w-full text-center">
        {/* Celebration Icon */}
        <div className="mb-6">
          <span className="text-7xl">{isPerfect ? '🏆' : progress.accuracy >= 70 ? '🎉' : '📚'}</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-slate-100 mb-2">
          {isPerfect ? 'Perfect Score!' : progress.accuracy >= 70 ? 'Well Done!' : 'Lesson Complete'}
        </h2>
        <p className="text-slate-400 mb-8">{lesson.title}</p>

        {/* Stats Card */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700">
          <div className="grid grid-cols-2 gap-4">
            {/* XP Earned */}
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400 mb-1">
                +{progress.totalXPEarned}
              </div>
              <div className="text-sm text-slate-400">XP Earned</div>
            </div>

            {/* Accuracy */}
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">
                {Math.round(progress.accuracy)}%
              </div>
              <div className="text-sm text-slate-400">Accuracy</div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700 my-4" />

          {/* Exercise Breakdown */}
          <div className="flex justify-center gap-6 text-sm">
            <div>
              <span className="text-emerald-400 font-medium">{correctCount}</span>
              <span className="text-slate-400 ml-1">Correct</span>
            </div>
            <div>
              <span className="text-red-400 font-medium">{totalExercises - correctCount}</span>
              <span className="text-slate-400 ml-1">Incorrect</span>
            </div>
            <div>
              <span className="text-slate-300 font-medium">{totalExercises}</span>
              <span className="text-slate-400 ml-1">Total</span>
            </div>
          </div>
        </div>

        {/* XP Breakdown */}
        <div className="bg-slate-800/50 rounded-lg p-4 mb-6 text-left">
          <h3 className="text-sm font-medium text-slate-300 mb-3">XP Breakdown</h3>
          <div className="space-y-2 text-sm">
            {progress.exerciseProgress.map((ep, idx) => (
              <div key={ep.exerciseId} className="flex items-center justify-between">
                <span className="text-slate-400">
                  Exercise {idx + 1}
                  <span className={`ml-2 ${ep.correct ? 'text-emerald-400' : 'text-red-400'}`}>
                    {ep.correct ? '✓' : '✗'}
                  </span>
                </span>
                <span className={ep.xpEarned > 0 ? 'text-emerald-400' : 'text-slate-500'}>
                  +{ep.xpEarned} XP
                </span>
              </div>
            ))}
            <div className="border-t border-slate-700 pt-2 mt-2 flex items-center justify-between font-medium">
              <span className="text-slate-300">Completion Bonus</span>
              <span className="text-emerald-400">
                +{isPerfect ? 80 : 30} XP
              </span>
            </div>
          </div>
        </div>

        {/* Vocabulary Review */}
        {lesson.vocabularyFocus.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Vocabulary Practiced</h3>
            <div className="flex flex-wrap gap-2">
              {lesson.vocabularyFocus.map((word) => (
                <span
                  key={word}
                  className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded"
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
        >
          Back to Lessons
        </button>

        {/* Encouragement */}
        {progress.accuracy < 70 && (
          <p className="mt-4 text-sm text-slate-400">
            Keep practicing! Each lesson helps build your listening skills.
          </p>
        )}
      </div>
    </div>
  );
}
