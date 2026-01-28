import { useState, useEffect } from 'react';
import { useFlashcardStore } from '../../../stores/flashcardStore';
import { useGameStore } from '../../../stores/gameStore';
import { useUserStore } from '../../../stores/userStore';
import { getIntervalPreviews } from '../services/sm2Algorithm';
import { RESOURCES } from '../../game/data/resources';
import { IslandView } from '../../game/components/island';
import { PetSelector } from '../../game/components/island/PetManager';
import type { SM2Response } from '../../../types';

interface FlashcardPracticeProps {
  onSwitchToCards: () => void;
}

export default function FlashcardPractice({ onSwitchToCards }: FlashcardPracticeProps) {
  const {
    getDueCards,
    getCurrentCard,
    currentSession,
    startSession,
    endSession,
    reviewCard,
    cards,
  } = useFlashcardStore();

  const {
    currentAction,
    inventory,
    activePet,
    unlockedPets,
    unlockedLocations,
    setActivePet,
  } = useGameStore();
  const progress = useUserStore((state) => state.progress);
  const settings = useUserStore((state) => state.settings);

  const gameModeEnabled = settings?.gameModeEnabled ?? true;

  const [isFlipped, setIsFlipped] = useState(false);

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

  const intervalPreviews = currentCard
    ? getIntervalPreviews(currentCard)
    : null;

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      {/* Flashcard Section */}
      <div className={`flex-1 flex flex-col p-4 md:p-6 min-h-0 md:h-full overflow-hidden ${!gameModeEnabled ? 'max-w-4xl mx-auto w-full' : ''}`}>
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
                  onClick={onSwitchToCards}
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
                  onClick={onSwitchToCards}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
                >
                  Manage Cards
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
              className="flex-1 flex items-center justify-center cursor-pointer perspective-1000 min-h-[250px] md:min-h-[350px]"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div
                className={`relative w-full max-w-xl h-full max-h-[450px] min-h-[250px] transition-transform duration-500 transform-style-3d ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front - Turkish word */}
                <div className="absolute inset-0 bg-slate-800 rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 backface-hidden border border-slate-700">
                  <span className="text-xs text-slate-500 uppercase tracking-wider mb-4">
                    Turkish
                  </span>
                  <span className="text-4xl md:text-5xl lg:text-6xl font-bold text-center">
                    {currentCard.front}
                  </span>
                  {currentCard.pronunciation && (
                    <span className="text-slate-400 mt-4 text-lg">
                      [{currentCard.pronunciation}]
                    </span>
                  )}
                  <span className="text-slate-500 text-sm mt-8">
                    Tap to reveal translation
                  </span>
                </div>

                {/* Back - English translation */}
                <div className="absolute inset-0 bg-slate-800 rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 backface-hidden rotate-y-180 border border-emerald-500/30">
                  <span className="text-xs text-emerald-500 uppercase tracking-wider mb-4">
                    English
                  </span>
                  <span className="text-4xl md:text-5xl lg:text-6xl font-bold text-center text-emerald-400">
                    {currentCard.back}
                  </span>
                  {currentCard.exampleSentence && (
                    <div className="mt-6 text-center max-w-sm">
                      <p className="text-slate-300 text-base italic">
                        "{currentCard.exampleSentence}"
                      </p>
                      {currentCard.exampleTranslation && (
                        <p className="text-slate-500 text-sm mt-2">
                          {currentCard.exampleTranslation}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="mt-6 text-sm">
                    <span className="text-slate-400">{currentCard.front}</span>
                    <span className="mx-2 text-slate-600">→</span>
                    <span className="text-emerald-400">{currentCard.back}</span>
                  </div>
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
      </div>

      {/* Game Section - Only shown when game mode is enabled */}
      {gameModeEnabled && (
        <div className="h-64 md:h-full md:w-1/2 lg:w-2/5 bg-slate-800/50 border-t md:border-t-0 md:border-l border-slate-700 flex flex-col shrink-0">
          {/* Island Visualization */}
          <div className="flex-1 min-h-0">
            <IslandView
              currentAction={currentAction}
              activePet={activePet}
              unlockedLocations={unlockedLocations}
              isCompact={false}
            />
          </div>

          {/* Bottom Panel: Pet Selector + Mini Inventory */}
          <div className="border-t border-slate-700 p-3">
            {/* Pet selector row */}
            {unlockedPets.length > 0 && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Active Pet</span>
                <PetSelector
                  unlockedPets={unlockedPets}
                  activePet={activePet}
                  onSetActivePet={setActivePet}
                />
              </div>
            )}

            {/* Mini Inventory */}
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
      )}
    </div>
  );
}
