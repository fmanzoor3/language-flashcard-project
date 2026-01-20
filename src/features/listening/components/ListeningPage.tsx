import { useState, useEffect } from 'react';
import { useListeningStore } from '../../../stores/listeningStore';
import { useConversationStore } from '../../../stores/conversationStore';
import { useUserStore } from '../../../stores/userStore';
import { isRealtimeAudioAvailable } from '../../../services/azure/realtimeAudioService';
import LessonPlayer from './LessonPlayer';
import LessonConfig, { type LessonConfigOptions } from './LessonConfig';
import type { Scenario, DifficultyLevel, ListeningLesson, ScenarioType } from '../../../types';
import { MASTERY_TIER_STYLES } from '../../../types';

const DIFFICULTY_STYLES: Record<DifficultyLevel, string> = {
  A1: 'bg-green-500/20 text-green-400',
  A2: 'bg-blue-500/20 text-blue-400',
  B1: 'bg-purple-500/20 text-purple-400',
  B2: 'bg-orange-500/20 text-orange-400',
  C1: 'bg-red-500/20 text-red-400',
  C2: 'bg-pink-500/20 text-pink-400',
};

const SCENARIO_EMOJIS: Record<string, string> = {
  restaurant: '🍽️',
  shopping: '🛍️',
  travel: '🚌',
  social: '👋',
  work: '💼',
  healthcare: '🏥',
  custom: '✨',
};

export default function ListeningPage() {
  const {
    lessons,
    currentLesson,
    isLoading,
    isGenerating,
    error,
    selectedDifficulty,
    loadLessons,
    generateLessonFromScenario,
    startLesson,
    setDifficulty,
    clearError,
  } = useListeningStore();

  const { scenarios, loadScenarios } = useConversationStore();
  const getScenarioMasteryTier = useUserStore((state) => state.getScenarioMasteryTier);

  const [view, setView] = useState<'lessons' | 'scenarios'>('lessons');
  const [configScenario, setConfigScenario] = useState<Scenario | null>(null);

  const audioAvailable = isRealtimeAudioAvailable();

  useEffect(() => {
    loadLessons();
    loadScenarios();
  }, [loadLessons, loadScenarios]);

  // If in a lesson, show the lesson player
  if (currentLesson) {
    return <LessonPlayer />;
  }

  const filteredLessons = lessons.filter((l) => l.difficulty === selectedDifficulty);
  // Show all scenarios, user can override difficulty in config
  const allScenarios = scenarios;

  const handleSelectScenario = (scenario: Scenario) => {
    setConfigScenario(scenario);
  };

  const handleStartLesson = async (options: LessonConfigOptions) => {
    if (!configScenario) return;

    try {
      // Create a modified scenario with user's chosen difficulty
      const scenarioWithConfig = {
        ...configScenario,
        difficulty: options.difficulty,
      };
      const lesson = await generateLessonFromScenario(scenarioWithConfig, options);
      await startLesson(lesson.id);
      setConfigScenario(null);
    } catch {
      // Error handled in store
    }
  };

  const handleStartExistingLesson = async (lesson: ListeningLesson) => {
    await startLesson(lesson.id);
  };

  if (!audioAvailable) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <span className="text-6xl mb-4 block">🎧</span>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Listening Lessons</h2>
          <p className="text-slate-400 mb-4">
            Realtime audio is not configured. Please enable it in your environment settings
            to use listening lessons.
          </p>
          <p className="text-sm text-slate-500">
            Set <code className="bg-slate-700 px-1 rounded">VITE_ENABLE_REALTIME_AUDIO=true</code> in your .env file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Lesson Config Modal */}
      {configScenario && (
        <LessonConfig
          scenario={configScenario}
          onStart={handleStartLesson}
          onCancel={() => setConfigScenario(null)}
          isGenerating={isGenerating}
        />
      )}

      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>🎧</span>
              Listening Practice
            </h2>
          </div>

          {/* Difficulty Selector (for filtering existing lessons) */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as DifficultyLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  selectedDifficulty === level
                    ? DIFFICULTY_STYLES[level] + ' ring-2 ring-offset-2 ring-offset-slate-900'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setView('lessons')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                view === 'lessons'
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              My Lessons ({filteredLessons.length})
            </button>
            <button
              onClick={() => setView('scenarios')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                view === 'scenarios'
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Generate New
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 max-w-4xl mx-auto">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-red-300 text-sm">{error}</p>
            <button onClick={clearError} className="text-red-300 hover:text-red-100">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin text-4xl">🔄</div>
            </div>
          ) : view === 'lessons' ? (
            /* Existing Lessons */
            filteredLessons.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-4xl mb-4 block">📭</span>
                <p className="text-slate-400 mb-2">No lessons at {selectedDifficulty} level yet</p>
                <button
                  onClick={() => setView('scenarios')}
                  className="text-emerald-400 hover:text-emerald-300 text-sm"
                >
                  Generate a new lesson →
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredLessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => handleStartExistingLesson(lesson)}
                    className="text-left bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-emerald-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-slate-100">{lesson.title}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs ${DIFFICULTY_STYLES[lesson.difficulty]}`}>
                        {lesson.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">{lesson.titleTurkish}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{lesson.exercises.length} exercises</span>
                      <span>~{lesson.estimatedMinutes} min</span>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            /* Generate from Scenarios */
            <div>
              <p className="text-slate-400 text-sm mb-4">
                Select a scenario to create a custom listening lesson. You'll be able to choose difficulty and exercise types.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {allScenarios.map((scenario) => {
                  const existingLessons = lessons.filter((l) => l.scenarioId === scenario.id);
                  const masteryTier = getScenarioMasteryTier(scenario.type as ScenarioType);
                  const masteryStyles = MASTERY_TIER_STYLES[masteryTier];

                  return (
                    <button
                      key={scenario.id}
                      onClick={() => handleSelectScenario(scenario)}
                      disabled={isGenerating}
                      className={`text-left rounded-lg p-4 border transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:border-emerald-500/50 ${masteryStyles.bg} ${masteryStyles.border} ${masteryStyles.glow}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{SCENARIO_EMOJIS[scenario.type] || '📝'}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="font-medium text-slate-100">{scenario.title}</h3>
                            <div className="flex items-center gap-1.5">
                              {masteryTier !== 'none' && (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${masteryStyles.badge}`}>
                                  {masteryStyles.label}
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded text-xs ${DIFFICULTY_STYLES[scenario.difficulty]}`}>
                                {scenario.difficulty}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-slate-400 mb-2">{scenario.titleTurkish}</p>
                          <p className="text-xs text-slate-500">{scenario.description}</p>

                          {existingLessons.length > 0 && (
                            <p className="text-xs text-emerald-400 mt-2">
                              {existingLessons.length} lesson(s) generated
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
