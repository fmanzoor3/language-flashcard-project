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

  const { currentAction, inventory } = useGameStore();
  const progress = useUserStore((state) => state.progress);

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

  // Get loot display info
  const lootInfo = currentAction?.result?.resourceId
    ? RESOURCES[currentAction.result.resourceId]
    : null;

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden" style={{ backgroundColor: 'var(--color-ottoman-navy)' }}>
      {/* Flashcard Section */}
      <div className="flex-1 flex flex-col p-4 md:p-6 min-h-0 md:h-full overflow-hidden">
        {!currentSession ? (
          // Session Start / Empty State
          <div className="flex-1 flex flex-col items-center justify-center animate-fadeIn">
            {!hasCards ? (
              <div className="text-center">
                <p className="text-6xl mb-6">📝</p>
                <h2 className="font-display text-2xl mb-3" style={{ color: 'var(--color-text-primary)' }}>No flashcards yet!</h2>
                <p className="mb-8" style={{ color: 'var(--color-text-muted)' }}>
                  Add some Turkish vocabulary to start learning
                </p>
                <button
                  onClick={onSwitchToCards}
                  className="ottoman-btn ottoman-btn-primary font-semibold"
                >
                  Add Your First Card
                </button>
              </div>
            ) : !hasDueCards ? (
              <div className="text-center">
                <p className="text-6xl mb-6 gold-shimmer">🎉</p>
                <h2 className="font-display text-2xl mb-3" style={{ color: 'var(--color-text-primary)' }}>All caught up!</h2>
                <p className="mb-8" style={{ color: 'var(--color-text-muted)' }}>
                  No cards due for review. Add more or come back later!
                </p>
                <button
                  onClick={onSwitchToCards}
                  className="ottoman-btn ottoman-btn-primary font-semibold"
                >
                  Manage Cards
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-6xl mb-6">📚</p>
                <h2 className="font-display text-2xl mb-3" style={{ color: 'var(--color-text-primary)' }}>Ready to study?</h2>
                <p className="mb-8" style={{ color: 'var(--color-text-muted)' }}>
                  You have <span style={{ color: 'var(--color-turquoise-light)' }}>{dueCards.length}</span> card{dueCards.length !== 1 ? 's' : ''} due for review
                </p>
                <button
                  onClick={handleStartSession}
                  className="ottoman-btn ottoman-btn-gold font-bold text-lg px-10 py-4 pulse-gold"
                >
                  Start Review
                </button>
              </div>
            )}
          </div>
        ) : !currentCard ? (
          // Session Complete
          <div className="flex-1 flex flex-col items-center justify-center animate-scaleIn">
            <p className="text-6xl mb-6 gold-shimmer">🏆</p>
            <h2 className="font-display text-2xl mb-3" style={{ color: 'var(--color-gold)' }}>Session Complete!</h2>
            <p className="mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Cards reviewed: <span style={{ color: 'var(--color-text-primary)' }}>{currentSession.cardsReviewed}</span>
            </p>
            <p className="font-semibold mb-8" style={{ color: 'var(--color-turquoise-light)' }}>
              +{currentSession.xpEarned} XP earned
            </p>
            <button
              onClick={handleEndSession}
              className="ottoman-btn font-medium"
              style={{ backgroundColor: 'var(--color-ottoman-elevated)', border: '1px solid rgba(212, 165, 116, 0.2)' }}
            >
              Finish Session
            </button>
          </div>
        ) : (
          // Active Review
          <div className="flex-1 flex flex-col">
            {/* Progress indicator */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Card <span style={{ color: 'var(--color-gold)' }}>{(dueCards.findIndex(c => c.id === currentCard.id) + 1) || 1}</span> of {dueCards.length}
              </span>
              <button
                onClick={handleEndSession}
                className="text-sm transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
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
                <div className="absolute inset-0 flashcard-front rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 backface-hidden">
                  <span className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--color-gold)' }}>
                    Turkish
                  </span>
                  <span className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-center" style={{ color: 'var(--color-text-primary)' }}>
                    {currentCard.front}
                  </span>
                  {currentCard.pronunciation && (
                    <span className="mt-4 text-lg font-display-light" style={{ color: 'var(--color-text-secondary)' }}>
                      [{currentCard.pronunciation}]
                    </span>
                  )}
                  <span className="text-sm mt-8" style={{ color: 'var(--color-text-muted)' }}>
                    Tap to reveal translation
                  </span>
                </div>

                {/* Back - English translation */}
                <div className="absolute inset-0 flashcard-back rounded-2xl shadow-xl flex flex-col items-center justify-center p-8 backface-hidden rotate-y-180">
                  <span className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--color-turquoise-light)' }}>
                    English
                  </span>
                  <span className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-center text-turquoise-gradient">
                    {currentCard.back}
                  </span>
                  {currentCard.exampleSentence && (
                    <div className="mt-6 text-center max-w-sm">
                      <p className="text-base font-display-light" style={{ color: 'var(--color-text-secondary)' }}>
                        "{currentCard.exampleSentence}"
                      </p>
                      {currentCard.exampleTranslation && (
                        <p className="text-sm mt-2" style={{ color: 'var(--color-text-muted)' }}>
                          {currentCard.exampleTranslation}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="mt-6 text-sm">
                    <span style={{ color: 'var(--color-text-muted)' }}>{currentCard.front}</span>
                    <span className="mx-2" style={{ color: 'var(--color-gold)', opacity: 0.5 }}>→</span>
                    <span style={{ color: 'var(--color-turquoise-light)' }}>{currentCard.back}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Response Buttons */}
            {isFlipped && intervalPreviews && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                <button
                  onClick={() => handleResponse('again')}
                  className="response-btn response-btn-again flex flex-col items-center"
                >
                  <span className="font-medium" style={{ color: 'var(--color-again)' }}>Again</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {intervalPreviews.again}
                  </span>
                </button>
                <button
                  onClick={() => handleResponse('hard')}
                  className="response-btn response-btn-hard flex flex-col items-center"
                >
                  <span className="font-medium" style={{ color: 'var(--color-hard)' }}>Hard</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {intervalPreviews.hard}
                  </span>
                </button>
                <button
                  onClick={() => handleResponse('good')}
                  className="response-btn response-btn-good flex flex-col items-center"
                >
                  <span className="font-medium" style={{ color: 'var(--color-good)' }}>Good</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {intervalPreviews.good}
                  </span>
                </button>
                <button
                  onClick={() => handleResponse('easy')}
                  className="response-btn response-btn-easy flex flex-col items-center"
                >
                  <span className="font-medium" style={{ color: 'var(--color-easy)' }}>Easy</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {intervalPreviews.easy}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Game Section */}
      <div
        className="h-64 md:h-full md:w-1/2 lg:w-2/5 border-t md:border-t-0 md:border-l p-4 flex flex-col shrink-0 ottoman-pattern"
        style={{ backgroundColor: 'var(--color-ottoman-surface)', borderColor: 'rgba(212, 165, 116, 0.1)' }}
      >
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
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {currentAction.animationState === 'walking' && 'Walking...'}
                {currentAction.animationState === 'searching' && 'Searching...'}
                {currentAction.animationState === 'found' && lootInfo && (
                  <span className={getRarityColor(lootInfo.rarity)}>
                    Found {currentAction.result?.quantity}x {lootInfo.emoji} {lootInfo.name}!
                  </span>
                )}
                {currentAction.animationState === 'failed' && (
                  <span style={{ color: 'var(--color-text-muted)' }}>Nothing found...</span>
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
        <div className="border-t pt-3 mt-2" style={{ borderColor: 'rgba(212, 165, 116, 0.1)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-gold)', opacity: 0.7 }}>Recent Loot</span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Level {progress?.level || 1}
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {inventory.slice(0, 8).map((item) => {
              const resource = RESOURCES[item.resourceId];
              return (
                <div
                  key={item.resourceId}
                  className="flex items-center gap-1 px-2 py-1 rounded text-sm"
                  style={{ backgroundColor: 'var(--color-ottoman-elevated)', border: '1px solid rgba(212, 165, 116, 0.1)' }}
                  title={resource?.name}
                >
                  <span>{resource?.emoji}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{item.quantity}</span>
                </div>
              );
            })}
            {inventory.length === 0 && (
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Review flashcards to gather resources!
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
