import { useState } from 'react';
import type { Scenario, DifficultyLevel, ListeningExerciseType } from '../../../types';

const DIFFICULTY_STYLES: Record<DifficultyLevel, string> = {
  A1: 'bg-green-500/20 text-green-400 border-green-500/50',
  A2: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  B1: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  B2: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  C1: 'bg-red-500/20 text-red-400 border-red-500/50',
  C2: 'bg-pink-500/20 text-pink-400 border-pink-500/50',
};

const DIFFICULTY_DESCRIPTIONS: Record<DifficultyLevel, string> = {
  A1: 'Beginner - Simple words and short phrases',
  A2: 'Elementary - Basic sentences and everyday vocabulary',
  B1: 'Intermediate - Longer sentences with varied vocabulary',
  B2: 'Upper Intermediate - Complex sentences and idioms',
  C1: 'Advanced - Sophisticated language and nuances',
  C2: 'Proficient - Native-level complexity',
};

export interface LessonConfigOptions {
  difficulty: DifficultyLevel;
  exerciseTypes: ListeningExerciseType[];
  exerciseCount: number;
}

interface LessonConfigProps {
  scenario: Scenario;
  onStart: (options: LessonConfigOptions) => void;
  onCancel: () => void;
  isGenerating: boolean;
}

export default function LessonConfig({
  scenario,
  onStart,
  onCancel,
  isGenerating,
}: LessonConfigProps) {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(scenario.difficulty);
  const [exerciseTypes, setExerciseTypes] = useState<ListeningExerciseType[]>(['dictation', 'comprehension']);
  const [exerciseCount, setExerciseCount] = useState(6);

  const toggleExerciseType = (type: ListeningExerciseType) => {
    setExerciseTypes((prev) => {
      if (prev.includes(type)) {
        // Don't allow removing if it's the only one selected
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  };

  const handleStart = () => {
    onStart({ difficulty, exerciseTypes, exerciseCount });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-100">Configure Lesson</h3>
            <button
              onClick={onCancel}
              disabled={isGenerating}
              className="text-slate-400 hover:text-slate-200 disabled:opacity-50"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Based on: <span className="text-emerald-400">{scenario.title}</span>
          </p>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Difficulty Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Difficulty Level
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as DifficultyLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  disabled={isGenerating}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    difficulty === level
                      ? DIFFICULTY_STYLES[level] + ' border-2'
                      : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                  } disabled:opacity-50`}
                >
                  <div className="font-medium text-slate-100">{level}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {DIFFICULTY_DESCRIPTIONS[level].split(' - ')[0]}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {DIFFICULTY_DESCRIPTIONS[difficulty]}
            </p>
          </div>

          {/* Exercise Types */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Exercise Types
            </label>
            <div className="space-y-2">
              <button
                onClick={() => toggleExerciseType('dictation')}
                disabled={isGenerating}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  exerciseTypes.includes('dictation')
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500 text-slate-300'
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">✍️</span>
                  <div>
                    <div className="font-medium">Dictation</div>
                    <div className="text-xs opacity-75">
                      Listen and type what you hear in Turkish
                    </div>
                  </div>
                  {exerciseTypes.includes('dictation') && (
                    <span className="ml-auto text-blue-400">✓</span>
                  )}
                </div>
              </button>

              <button
                onClick={() => toggleExerciseType('comprehension')}
                disabled={isGenerating}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  exerciseTypes.includes('comprehension')
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                    : 'bg-slate-700/50 border-slate-600 hover:border-slate-500 text-slate-300'
                } disabled:opacity-50`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🧠</span>
                  <div>
                    <div className="font-medium">Comprehension</div>
                    <div className="text-xs opacity-75">
                      Listen to passages and answer questions
                    </div>
                  </div>
                  {exerciseTypes.includes('comprehension') && (
                    <span className="ml-auto text-purple-400">✓</span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Exercise Count */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Number of Exercises
            </label>
            <div className="flex gap-2">
              {[4, 6, 8, 10].map((count) => (
                <button
                  key={count}
                  onClick={() => setExerciseCount(count)}
                  disabled={isGenerating}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                    exerciseCount === count
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-700/50 border-slate-600 hover:border-slate-500 text-slate-300'
                  } disabled:opacity-50`}
                >
                  {count}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Estimated time: ~{Math.ceil(exerciseCount * 1.5)} minutes
            </p>
          </div>

          {/* Vocabulary Preview */}
          {scenario.vocabularyFocus && scenario.vocabularyFocus.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Vocabulary Focus
              </label>
              <div className="flex flex-wrap gap-2">
                {scenario.vocabularyFocus.map((word) => (
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isGenerating}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={isGenerating}
            className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="animate-spin">🔄</span>
                Generating...
              </>
            ) : (
              'Start Lesson'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
