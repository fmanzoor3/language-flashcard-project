import { useState, useEffect } from 'react';
import { useFlashcardStore } from '../../../stores/flashcardStore';
import { useGameStore } from '../../../stores/gameStore';
import { useUserStore } from '../../../stores/userStore';
import { getIntervalPreviews } from '../services/sm2Algorithm';
import { RESOURCES } from '../../game/data/resources';
import { getRarityColor, getRarityGlow } from '../../game/engine/LootSystem';
import type { SM2Response } from '../../../types';

const LOCATION_ICONS: Record<string, string> = {
  tree: '🌳',
  bush: '🌿',
  beach: '🏖️',
  sea: '🌊',
};

export default function FlashcardsPage() {
  const {
    getDueCards,
    getCurrentCard,
    currentSession,
    startSession,
    endSession,
    reviewCard,
    addCard,
    cards,
  } = useFlashcardStore();

  const { currentAction, inventory } = useGameStore();
  const progress = useUserStore((state) => state.progress);

  const [isFlipped, setIsFlipped] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  const dueCards = getDueCards();
  const currentCard = getCurrentCard();
  const hasCards = cards.length > 0;
  const hasDueCards = dueCards.length > 0;

  useEffect(() => {
    setIsFlipped(false);
  }, [currentCard?.id]);

  const handleResponse = async (response: SM2Response) => {
    if (!currentCard) return;
    setIsFlipped(false);
    await reviewCard(response);
  };

  const handleStartSession = () => {
    startSession();
  };

  const handleEndSession = async () => {
    await endSession();
  };

  const handleAddCard = async () => {
    if (!newFront.trim() || !newBack.trim()) return;
    await addCard(newFront.trim(), newBack.trim());
    setNewFront('');
    setNewBack('');
    setShowAddCard(false);
  };

  const intervalPreviews = currentCard
    ? getIntervalPreviews(currentCard)
    : null;

  // Get loot display info
  const lootInfo = currentAction?.result?.resourceId
    ? RESOURCES[currentAction.result.resourceId]
    : null;

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Flashcard Section */}
      <div className="flex-1 flex flex-col p-4 md:p-6 min-h-0">
        {!currentSession ? (
          // Session Start / Empty State
          <div className="flex-1 flex flex-col items-center justify-center">
            {!hasCards ? (
              <div className="text-center">
                <p className="text-6xl mb-4">📝</p>
                <h2 className="text-xl font-bold mb-2">No flashcards yet!</h2>
                <p className="text-slate-400 mb-6">
                  Add some Turkish vocabulary to start learning
                </p>
                <button
                  onClick={() => setShowAddCard(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                >
                  Add Your First Card
                </button>
              </div>
            ) : !hasDueCards ? (
              <div className="text-center">
                <p className="text-6xl mb-4">🎉</p>
                <h2 className="text-xl font-bold mb-2">All caught up!</h2>
                <p className="text-slate-400 mb-6">
                  No cards due for review. Add more or come back later!
                </p>
                <button
                  onClick={() => setShowAddCard(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                >
                  Add More Cards
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-6xl mb-4">📚</p>
                <h2 className="text-xl font-bold mb-2">Ready to study?</h2>
                <p className="text-slate-400 mb-6">
                  You have {dueCards.length} card{dueCards.length !== 1 ? 's' : ''} due for review
                </p>
                <button
                  onClick={handleStartSession}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-4 rounded-lg text-lg transition-colors"
                >
                  Start Review
                </button>
              </div>
            )}
          </div>
        ) : !currentCard ? (
          // Session Complete
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="text-6xl mb-4">🏆</p>
            <h2 className="text-xl font-bold mb-2">Session Complete!</h2>
            <p className="text-slate-400 mb-2">
              Cards reviewed: {currentSession.cardsReviewed}
            </p>
            <p className="text-emerald-400 font-medium mb-6">
              +{currentSession.xpEarned} XP earned
            </p>
            <button
              onClick={handleEndSession}
              className="bg-slate-700 hover:bg-slate-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Finish Session
            </button>
          </div>
        ) : (
          // Active Review
          <div className="flex-1 flex flex-col">
            {/* Progress indicator */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-slate-400">
                Card {(dueCards.findIndex(c => c.id === currentCard.id) + 1) || 1} of {dueCards.length}
              </span>
              <button
                onClick={handleEndSession}
                className="text-sm text-slate-400 hover:text-slate-200"
              >
                End Session
              </button>
            </div>

            {/* Flashcard */}
            <div
              className="flex-1 flex items-center justify-center cursor-pointer perspective-1000"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div
                className={`relative w-full max-w-md aspect-[3/2] transition-transform duration-500 transform-style-3d ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front */}
                <div className="absolute inset-0 bg-slate-800 rounded-2xl shadow-xl flex flex-col items-center justify-center p-6 backface-hidden border border-slate-700">
                  <span className="text-3xl md:text-4xl font-bold text-center">
                    {currentCard.front}
                  </span>
                  {currentCard.pronunciation && (
                    <span className="text-slate-400 mt-2">
                      [{currentCard.pronunciation}]
                    </span>
                  )}
                  <span className="text-slate-500 text-sm mt-4">
                    Tap to reveal
                  </span>
                </div>

                {/* Back */}
                <div className="absolute inset-0 bg-slate-800 rounded-2xl shadow-xl flex flex-col items-center justify-center p-6 backface-hidden rotate-y-180 border border-emerald-500/30">
                  <span className="text-3xl md:text-4xl font-bold text-center text-emerald-400">
                    {currentCard.back}
                  </span>
                  {currentCard.exampleSentence && (
                    <div className="mt-4 text-center">
                      <p className="text-slate-300 text-sm italic">
                        "{currentCard.exampleSentence}"
                      </p>
                      {currentCard.exampleTranslation && (
                        <p className="text-slate-500 text-xs mt-1">
                          {currentCard.exampleTranslation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Response Buttons */}
            {isFlipped && intervalPreviews && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                <button
                  onClick={() => handleResponse('again')}
                  className="flex flex-col items-center py-3 px-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 transition-colors"
                >
                  <span className="font-medium text-red-400">Again</span>
                  <span className="text-xs text-slate-400">
                    {intervalPreviews.again}
                  </span>
                </button>
                <button
                  onClick={() => handleResponse('hard')}
                  className="flex flex-col items-center py-3 px-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 transition-colors"
                >
                  <span className="font-medium text-orange-400">Hard</span>
                  <span className="text-xs text-slate-400">
                    {intervalPreviews.hard}
                  </span>
                </button>
                <button
                  onClick={() => handleResponse('good')}
                  className="flex flex-col items-center py-3 px-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 transition-colors"
                >
                  <span className="font-medium text-green-400">Good</span>
                  <span className="text-xs text-slate-400">
                    {intervalPreviews.good}
                  </span>
                </button>
                <button
                  onClick={() => handleResponse('easy')}
                  className="flex flex-col items-center py-3 px-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 transition-colors"
                >
                  <span className="font-medium text-blue-400">Easy</span>
                  <span className="text-xs text-slate-400">
                    {intervalPreviews.easy}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add Card Button (floating) */}
        {!showAddCard && (
          <button
            onClick={() => setShowAddCard(true)}
            className="fixed bottom-20 right-4 md:absolute md:bottom-4 md:right-4 w-12 h-12 bg-emerald-500 hover:bg-emerald-600 rounded-full shadow-lg flex items-center justify-center text-2xl transition-colors"
          >
            +
          </button>
        )}
      </div>

      {/* Game Section */}
      <div className="h-48 md:h-auto md:w-1/2 lg:w-2/5 bg-slate-800/50 border-t md:border-t-0 md:border-l border-slate-700 p-4 flex flex-col">
        {/* Island Scene */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {/* Character */}
          <div
            className={`text-6xl transition-all duration-500 ${
              currentAction?.animationState === 'walking'
                ? 'animate-bounce'
                : currentAction?.animationState === 'searching'
                ? 'animate-pulse'
                : ''
            }`}
          >
            🧑
          </div>

          {/* Current Action Display */}
          {currentAction && (
            <div className="mt-2 text-center">
              <span className="text-2xl">
                {LOCATION_ICONS[currentAction.location]}
              </span>
              <p className="text-sm text-slate-400 mt-1">
                {currentAction.animationState === 'walking' && 'Walking...'}
                {currentAction.animationState === 'searching' && 'Searching...'}
                {currentAction.animationState === 'found' && lootInfo && (
                  <span className={getRarityColor(lootInfo.rarity)}>
                    Found {currentAction.result?.quantity}x {lootInfo.emoji} {lootInfo.name}!
                  </span>
                )}
                {currentAction.animationState === 'failed' && (
                  <span className="text-slate-500">Nothing found...</span>
                )}
              </p>
            </div>
          )}

          {/* Loot Animation */}
          {currentAction?.animationState === 'found' && lootInfo && (
            <div
              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl animate-bounce ${getRarityGlow(
                lootInfo.rarity
              )}`}
            >
              {lootInfo.emoji}
            </div>
          )}

          {/* Location Icons (when idle) */}
          {!currentAction && currentSession && (
            <div className="flex gap-4 mt-4">
              {Object.entries(LOCATION_ICONS).map(([loc, icon]) => (
                <div
                  key={loc}
                  className="text-2xl opacity-50"
                  title={loc}
                >
                  {icon}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mini Inventory */}
        <div className="border-t border-slate-700 pt-2 mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Recent Loot</span>
            <span className="text-xs text-slate-500">
              Level {progress?.level || 1}
            </span>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {inventory.slice(0, 8).map((item) => {
              const resource = RESOURCES[item.resourceId];
              return (
                <div
                  key={item.resourceId}
                  className="flex items-center gap-1 bg-slate-700/50 px-2 py-1 rounded text-sm"
                  title={resource?.name}
                >
                  <span>{resource?.emoji}</span>
                  <span className="text-xs">{item.quantity}</span>
                </div>
              );
            })}
            {inventory.length === 0 && (
              <span className="text-xs text-slate-500">
                Review flashcards to gather resources!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Flashcard</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Turkish (Front)
                </label>
                <input
                  type="text"
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g., Merhaba"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  English (Back)
                </label>
                <input
                  type="text"
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g., Hello"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddCard(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCard}
                disabled={!newFront.trim() || !newBack.trim()}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors"
              >
                Add Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
