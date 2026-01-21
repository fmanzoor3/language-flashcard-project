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
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 shrink-0">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('practice')}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'practice'
                ? 'text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>Practice</span>
              {dueCount > 0 && (
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-1.5 py-0.5 rounded-full">
                  {dueCount}
                </span>
              )}
            </span>
            {activeTab === 'practice' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-4 py-3 font-medium text-sm transition-colors relative ${
              activeTab === 'cards'
                ? 'text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <span>My Cards</span>
              <span className="text-slate-500 text-xs">({cards.length})</span>
            </span>
            {activeTab === 'cards' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
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
