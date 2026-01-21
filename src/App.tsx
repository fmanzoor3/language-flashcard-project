import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { initializeDatabase } from './services/storage/db';
import { useUserStore } from './stores/userStore';
import { useFlashcardStore } from './stores/flashcardStore';
import { useGameStore } from './stores/gameStore';
import FlashcardsPage from './features/flashcards/components/FlashcardsPage';
import ConversationsPage from './features/conversations/components/ConversationsPage';
import ListeningPage from './features/listening/components/ListeningPage';
import ProgressionPage from './features/game/components/ProgressionPage';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const loadUser = useUserStore((state) => state.loadUser);
  const loadCards = useFlashcardStore((state) => state.loadCards);
  const loadGameState = useGameStore((state) => state.loadGameState);
  const progress = useUserStore((state) => state.progress);
  const getXPProgress = useUserStore((state) => state.getXPProgress);

  useEffect(() => {
    async function init() {
      await initializeDatabase();
      await Promise.all([loadUser(), loadCards(), loadGameState()]);
      setIsInitialized(true);
    }
    init();
  }, [loadUser, loadCards, loadGameState]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center ottoman-pattern" style={{ backgroundColor: 'var(--color-ottoman-navy)' }}>
        <div className="text-center animate-fadeIn">
          <div className="text-5xl mb-6 gold-shimmer">🕌</div>
          <p className="font-display text-2xl text-gold-gradient mb-2">Turkish Adventure</p>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading your journey...</p>
        </div>
      </div>
    );
  }

  const xpProgress = getXPProgress();

  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col overflow-hidden tile-pattern" style={{ backgroundColor: 'var(--color-ottoman-navy)', color: 'var(--color-text-primary)' }}>
        {/* Header */}
        <header className="px-4 py-3 border-b relative" style={{ backgroundColor: 'var(--color-ottoman-surface)', borderColor: 'rgba(212, 165, 116, 0.15)' }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <span className="text-2xl">🕌</span>
              <h1 className="font-display text-xl text-gold-gradient tracking-wide">
                Turkish Adventure
              </h1>
            </div>

            {/* Level & XP */}
            <div className="flex items-center gap-4">
              {/* Level Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Level</span>
                <span className="level-badge text-sm font-bold px-2.5 py-1 rounded" style={{ color: 'var(--color-ottoman-navy)' }}>
                  {progress?.level || 1}
                </span>
              </div>

              {/* XP Bar */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="xp-bar w-28 h-2.5">
                  <div
                    className="xp-bar-fill h-full"
                    style={{ width: `${xpProgress.percentage}%` }}
                  />
                </div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {xpProgress.current}/{xpProgress.required}
                </span>
              </div>

              {/* Streak */}
              {progress?.currentStreak ? (
                <div className="flex items-center gap-1.5 streak-flame">
                  <span className="text-lg">🔥</span>
                  <span className="text-sm font-semibold" style={{ color: '#f97316' }}>{progress.currentStreak}</span>
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
            <Route path="/progression" element={<ProgressionPage />} />
          </Routes>
        </main>

        {/* Bottom Navigation */}
        <nav className="border-t" style={{ backgroundColor: 'var(--color-ottoman-surface)', borderColor: 'rgba(212, 165, 116, 0.15)' }}>
          <div className="max-w-6xl mx-auto flex">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-3 text-sm transition-all duration-200 relative ${
                  isActive ? '' : 'hover:opacity-80'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-gold)' : 'var(--color-text-muted)'
              })}
            >
              {({ isActive }) => (
                <>
                  <span className="text-xl mb-1">📚</span>
                  <span className={isActive ? 'font-medium' : ''}>Flashcards</span>
                  {isActive && <div className="nav-active-indicator" />}
                </>
              )}
            </NavLink>
            <NavLink
              to="/conversations"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-3 text-sm transition-all duration-200 relative ${
                  isActive ? '' : 'hover:opacity-80'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-gold)' : 'var(--color-text-muted)'
              })}
            >
              {({ isActive }) => (
                <>
                  <span className="text-xl mb-1">💬</span>
                  <span className={isActive ? 'font-medium' : ''}>Conversations</span>
                  {isActive && <div className="nav-active-indicator" />}
                </>
              )}
            </NavLink>
            <NavLink
              to="/listening"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-3 text-sm transition-all duration-200 relative ${
                  isActive ? '' : 'hover:opacity-80'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-gold)' : 'var(--color-text-muted)'
              })}
            >
              {({ isActive }) => (
                <>
                  <span className="text-xl mb-1">🎧</span>
                  <span className={isActive ? 'font-medium' : ''}>Listening</span>
                  {isActive && <div className="nav-active-indicator" />}
                </>
              )}
            </NavLink>
            <NavLink
              to="/progression"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-3 text-sm transition-all duration-200 relative ${
                  isActive ? '' : 'hover:opacity-80'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--color-gold)' : 'var(--color-text-muted)'
              })}
            >
              {({ isActive }) => (
                <>
                  <span className="text-xl mb-1">🏝️</span>
                  <span className={isActive ? 'font-medium' : ''}>Island</span>
                  {isActive && <div className="nav-active-indicator" />}
                </>
              )}
            </NavLink>
          </div>
        </nav>
      </div>
    </BrowserRouter>
  );
}

export default App;
