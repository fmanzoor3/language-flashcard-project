import { useUserStore } from '../../../stores/userStore';
import type { DifficultyLevel, ResponseMode } from '../../../types';

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string; description: string }[] = [
  { value: 'A1', label: 'A1 - Beginner', description: 'Basic words and simple phrases' },
  { value: 'A2', label: 'A2 - Elementary', description: 'Common expressions and basic conversations' },
  { value: 'B1', label: 'B1 - Intermediate', description: 'Can handle most situations while traveling' },
  { value: 'B2', label: 'B2 - Upper Intermediate', description: 'Can interact with fluency and spontaneity' },
  { value: 'C1', label: 'C1 - Advanced', description: 'Can express ideas fluently in complex situations' },
  { value: 'C2', label: 'C2 - Mastery', description: 'Near-native understanding and expression' },
];

const RESPONSE_MODE_OPTIONS: { value: ResponseMode; label: string; description: string }[] = [
  { value: 'word-bank', label: 'Word Bank', description: 'Select from provided words (easier)' },
  { value: 'hybrid', label: 'Hybrid', description: 'Word bank with free text option' },
  { value: 'free-text', label: 'Free Text', description: 'Type your own responses (harder)' },
];

export default function SettingsPage() {
  const { settings, updateSettings } = useUserStore();

  if (!settings) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin text-4xl">🔄</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>

        {/* Game Mode Toggle */}
        <section className="bg-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <span>🏝️</span>
                Island Game Mode
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Enable the gamified island survival experience. When disabled, the app focuses
                purely on language learning features without the game elements.
              </p>
            </div>
            <button
              onClick={() => updateSettings({ gameModeEnabled: !settings.gameModeEnabled })}
              className={`relative w-14 h-8 rounded-full transition-colors shrink-0 ${
                settings.gameModeEnabled ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                  settings.gameModeEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {settings.gameModeEnabled && (
            <div className="text-sm text-slate-500 bg-slate-700/50 rounded-lg p-3">
              <strong className="text-slate-300">Game features include:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Island exploration after flashcard reviews</li>
                <li>Resource gathering and crafting</li>
                <li>Pet companions with special abilities</li>
                <li>Build a raft to escape the island</li>
              </ul>
            </div>
          )}
        </section>

        {/* Difficulty Level */}
        <section className="bg-slate-800 rounded-xl p-4 space-y-4">
          <div>
            <h2 className="font-semibold text-lg">Difficulty Level</h2>
            <p className="text-sm text-slate-400 mt-1">
              Your Turkish proficiency level. This affects conversation complexity and vocabulary.
            </p>
          </div>
          <div className="grid gap-2">
            {DIFFICULTY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => updateSettings({ difficultyLevel: option.value })}
                className={`text-left p-3 rounded-lg transition-colors ${
                  settings.difficultyLevel === option.value
                    ? 'bg-emerald-500/20 border border-emerald-500/50'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-slate-400">{option.description}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Response Mode - Coming Soon */}
        <section className="bg-slate-800 rounded-xl p-4 space-y-4 opacity-60">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              Response Mode
              <span className="text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full">
                Coming Soon
              </span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Choose how you respond in conversations. This feature is planned for a future update.
            </p>
          </div>
          <div className="grid gap-2">
            {RESPONSE_MODE_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`text-left p-3 rounded-lg cursor-not-allowed ${
                  settings.preferredResponseMode === option.value
                    ? 'bg-emerald-500/20 border border-emerald-500/50'
                    : 'bg-slate-700'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-slate-400">{option.description}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Daily Goal */}
        <section className="bg-slate-800 rounded-xl p-4 space-y-4">
          <div>
            <h2 className="font-semibold text-lg">Daily Goal</h2>
            <p className="text-sm text-slate-400 mt-1">
              Target practice time per day.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={settings.dailyGoalMinutes}
              onChange={(e) => updateSettings({ dailyGoalMinutes: parseInt(e.target.value) })}
              className="flex-1 accent-emerald-500"
            />
            <span className="text-lg font-mono w-20 text-right">
              {settings.dailyGoalMinutes} min
            </span>
          </div>
        </section>

        {/* Sound Effects */}
        <section className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">Sound Effects</h2>
              <p className="text-sm text-slate-400 mt-1">
                Play sounds for actions and achievements.
              </p>
            </div>
            <button
              onClick={() => updateSettings({ soundEffectsEnabled: !settings.soundEffectsEnabled })}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                settings.soundEffectsEnabled ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
            >
              <div
                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                  settings.soundEffectsEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* App Info */}
        <section className="text-center text-slate-500 text-sm py-4">
          <p>Turkish Adventure v1.0</p>
          <p className="mt-1">Made with AI assistance</p>
        </section>
      </div>
    </div>
  );
}
