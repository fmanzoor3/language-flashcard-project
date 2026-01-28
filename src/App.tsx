import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { initializeDatabase } from './services/storage/db';
import { useUserStore } from './stores/userStore';
import { useFlashcardStore } from './stores/flashcardStore';
import { useGameStore } from './stores/gameStore';
import { useConversationStore } from './stores/conversationStore';
import { useListeningStore } from './stores/listeningStore';
import FlashcardsPage from './features/flashcards/components/FlashcardsPage';
import ConversationsPage from './features/conversations/components/ConversationsPage';
import ListeningPage from './features/listening/components/ListeningPage';
import ProgressionPage from './features/game/components/ProgressionPage';
import SettingsPage from './features/settings/components/SettingsPage';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const loadUser = useUserStore((state) => state.loadUser);
  const loadCards = useFlashcardStore((state) => state.loadCards);
  const loadGameState = useGameStore((state) => state.loadGameState);
  const progress = useUserStore((state) => state.progress);
  const settings = useUserStore((state) => state.settings);
  const getXPProgress = useUserStore((state) => state.getXPProgress);

  const gameModeEnabled = settings?.gameModeEnabled ?? true;

  // Get setDifficulty actions from conversation and listening stores
  const setConversationDifficulty = useConversationStore((state) => state.setDifficulty);
  const setListeningDifficulty = useListeningStore((state) => state.setDifficulty);

  useEffect(() => {
    async function init() {
      await initializeDatabase();
      await Promise.all([loadUser(), loadCards(), loadGameState()]);
      setIsInitialized(true);
    }
    init();
  }, [loadUser, loadCards, loadGameState]);

  // Sync difficulty setting to conversation and listening stores
  useEffect(() => {
    if (settings?.difficultyLevel) {
      setConversationDifficulty(settings.difficultyLevel);
      setListeningDifficulty(settings.difficultyLevel);
    }
  }, [settings?.difficultyLevel, setConversationDifficulty, setListeningDifficulty]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🌀</div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  const xpProgress = getXPProgress();

  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold text-emerald-400">
              🇹🇷 Turkish Adventure
            </h1>

            {/* Level & XP */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Level</span>
                <span className="bg-emerald-500 text-white text-sm font-bold px-2 py-0.5 rounded">
                  {progress?.level || 1}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${xpProgress.percentage}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">
                  {xpProgress.current}/{xpProgress.required} XP
                </span>
              </div>
              {progress?.currentStreak ? (
                <div className="flex items-center gap-1 text-orange-400">
                  <span>🔥</span>
                  <span className="text-sm font-medium">{progress.currentStreak}</span>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden min-h-0">
          <Routes>
            <Route path="/" element={<FlashcardsPage />} />
            <Route path="/conversations" element={<ConversationsPage />} />
            <Route path="/listening" element={<ListeningPage />} />
            {gameModeEnabled && <Route path="/progression" element={<ProgressionPage />} />}
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>

        {/* Bottom Navigation */}
        <nav className="bg-slate-800 border-t border-slate-700">
          <div className="max-w-6xl mx-auto flex">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-3 text-sm transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <span className="text-xl mb-1">📚</span>
              <span>Flashcards</span>
            </NavLink>
            <NavLink
              to="/conversations"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-3 text-sm transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <span className="text-xl mb-1">💬</span>
              <span>Conversations</span>
            </NavLink>
            <NavLink
              to="/listening"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-3 text-sm transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <span className="text-xl mb-1">🎧</span>
              <span>Listening</span>
            </NavLink>
            {gameModeEnabled && (
              <NavLink
                to="/progression"
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center py-3 text-sm transition-colors ${
                    isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                <span className="text-xl mb-1">🏝️</span>
                <span>Island</span>
              </NavLink>
            )}
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-3 text-sm transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <span className="text-xl mb-1">⚙️</span>
              <span>Settings</span>
            </NavLink>
          </div>
        </nav>
      </div>
    </BrowserRouter>
  );
}

export default App;
