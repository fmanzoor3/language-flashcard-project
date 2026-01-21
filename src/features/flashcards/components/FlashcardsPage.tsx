import { useState } from 'react';
import FlashcardPractice from './FlashcardPractice';
import FlashcardManager from './FlashcardManager';
import { useFlashcardStore } from '../../../stores/flashcardStore';

type FlashcardTab = 'practice' | 'cards';

export default function FlashcardsPage() {
  const [activeTab, setActiveTab] = useState<FlashcardTab>('practice');
  const { getDueCards, cards } = useFlashcardStore();

  const dueCount = getDueCards().length;

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--color-ottoman-navy)' }}>
      {/* Tab Navigation */}
      <div className="px-4 shrink-0 border-b" style={{ backgroundColor: 'var(--color-ottoman-surface)', borderColor: 'rgba(212, 165, 116, 0.1)' }}>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('practice')}
            className={`px-5 py-3.5 font-medium text-sm transition-all duration-200 relative ${
              activeTab === 'practice'
                ? 'text-[var(--color-gold)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>Practice</span>
              {dueCount > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    backgroundColor: 'rgba(20, 184, 166, 0.15)',
                    color: 'var(--color-turquoise-light)',
                    border: '1px solid rgba(20, 184, 166, 0.3)'
                  }}
                >
                  {dueCount}
                </span>
              )}
            </span>
            {activeTab === 'practice' && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }} />
            )}
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-5 py-3.5 font-medium text-sm transition-all duration-200 relative ${
              activeTab === 'cards'
                ? 'text-[var(--color-gold)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>My Cards</span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({cards.length})</span>
            </span>
            {activeTab === 'cards' && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)' }} />
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'practice' ? (
          <FlashcardPractice onSwitchToCards={() => setActiveTab('cards')} />
        ) : (
          <FlashcardManager />
        )}
      </div>
    </div>
  );
}
