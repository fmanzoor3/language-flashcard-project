import { useState, useMemo } from 'react';
import { useFlashcardStore } from '../../../stores/flashcardStore';
import type { Flashcard, CardStatus } from '../../../types';

interface EditingCard {
  id: string;
  front: string;
  back: string;
  pronunciation: string;
  exampleSentence: string;
  exampleTranslation: string;
  notes: string;
}

const STATUS_LABELS: Record<CardStatus, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-500/20 text-blue-400' },
  learning: { label: 'Learning', color: 'bg-orange-500/20 text-orange-400' },
  review: { label: 'Review', color: 'bg-green-500/20 text-green-400' },
  relearning: { label: 'Relearning', color: 'bg-red-500/20 text-red-400' },
};

function formatNextReview(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return 'Due now';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  if (days < 30) return `In ${Math.floor(days / 7)} weeks`;
  return `In ${Math.floor(days / 30)} months`;
}

export default function FlashcardManager() {
  const { cards, updateCard, deleteCard, addCard } = useFlashcardStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CardStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'nextReview' | 'alphabetical'>('created');
  const [editingCard, setEditingCard] = useState<EditingCard | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showAddCard, setShowAddCard] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  // Filter and sort cards
  const filteredCards = useMemo(() => {
    let result = [...cards];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (card) =>
          card.front.toLowerCase().includes(query) ||
          card.back.toLowerCase().includes(query) ||
          card.notes?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((card) => card.status === statusFilter);
    }

    // Apply sorting
    switch (sortBy) {
      case 'alphabetical':
        result.sort((a, b) => a.front.localeCompare(b.front));
        break;
      case 'nextReview':
        result.sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());
        break;
      case 'created':
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return result;
  }, [cards, searchQuery, statusFilter, sortBy]);

  const handleEditCard = (card: Flashcard) => {
    setEditingCard({
      id: card.id,
      front: card.front,
      back: card.back,
      pronunciation: card.pronunciation || '',
      exampleSentence: card.exampleSentence || '',
      exampleTranslation: card.exampleTranslation || '',
      notes: card.notes || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCard) return;

    await updateCard(editingCard.id, {
      front: editingCard.front.trim(),
      back: editingCard.back.trim(),
      pronunciation: editingCard.pronunciation.trim() || undefined,
      exampleSentence: editingCard.exampleSentence.trim() || undefined,
      exampleTranslation: editingCard.exampleTranslation.trim() || undefined,
      notes: editingCard.notes.trim() || undefined,
    });

    setEditingCard(null);
  };

  const handleDeleteCard = async (id: string) => {
    await deleteCard(id);
    setDeleteConfirm(null);
  };

  const handleAddCard = async () => {
    if (!newFront.trim() || !newBack.trim()) return;
    await addCard(newFront.trim(), newBack.trim());
    setNewFront('');
    setNewBack('');
    setShowAddCard(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100">My Flashcards</h2>
            <p className="text-sm text-slate-400">{cards.length} cards total</p>
          </div>
          <button
            onClick={() => setShowAddCard(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            <span>Add Card</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cards..."
              className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as CardStatus | 'all')}
                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All</option>
                <option value="new">New</option>
                <option value="learning">Learning</option>
                <option value="review">Review</option>
                <option value="relearning">Relearning</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="created">Recently Added</option>
                <option value="nextReview">Next Review</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>

            {searchQuery && (
              <span className="text-sm text-slate-400 self-center">
                {filteredCards.length} result{filteredCards.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Card List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredCards.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-4">{cards.length === 0 ? '📝' : '📭'}</p>
            <p className="text-slate-400 mb-4">
              {cards.length === 0
                ? 'No flashcards yet. Add your first card to get started!'
                : 'No cards match your search'}
            </p>
            {cards.length === 0 && (
              <button
                onClick={() => setShowAddCard(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
              >
                Add Your First Card
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCards.map((card) => (
              <div
                key={card.id}
                className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-white">{card.front}</span>
                      <span className="text-slate-500">→</span>
                      <span className="text-emerald-400">{card.back}</span>
                    </div>
                    {card.pronunciation && (
                      <p className="text-sm text-slate-500 mb-1">[{card.pronunciation}]</p>
                    )}
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <span className={`px-2 py-0.5 rounded ${STATUS_LABELS[card.status].color}`}>
                        {STATUS_LABELS[card.status].label}
                      </span>
                      <span className="text-slate-500">
                        {formatNextReview(new Date(card.nextReviewDate))}
                      </span>
                      {card.notes && (
                        <span className="text-slate-500 truncate max-w-[200px]" title={card.notes}>
                          📝 {card.notes}
                        </span>
                      )}
                    </div>
                    {card.exampleSentence && (
                      <p className="text-sm text-slate-400 mt-2 italic">"{card.exampleSentence}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleEditCard(card)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      title="Edit card"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(card.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete card"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
                onClick={() => {
                  setShowAddCard(false);
                  setNewFront('');
                  setNewBack('');
                }}
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

      {/* Edit Modal */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Edit Flashcard</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Turkish (Front)</label>
                <input
                  type="text"
                  value={editingCard.front}
                  onChange={(e) => setEditingCard({ ...editingCard, front: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">English (Back)</label>
                <input
                  type="text"
                  value={editingCard.back}
                  onChange={(e) => setEditingCard({ ...editingCard, back: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Pronunciation (optional)</label>
                <input
                  type="text"
                  value={editingCard.pronunciation}
                  onChange={(e) => setEditingCard({ ...editingCard, pronunciation: e.target.value })}
                  placeholder="e.g., mehr-hah-bah"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Example Sentence (optional)</label>
                <input
                  type="text"
                  value={editingCard.exampleSentence}
                  onChange={(e) => setEditingCard({ ...editingCard, exampleSentence: e.target.value })}
                  placeholder="Turkish example sentence"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Example Translation (optional)</label>
                <input
                  type="text"
                  value={editingCard.exampleTranslation}
                  onChange={(e) => setEditingCard({ ...editingCard, exampleTranslation: e.target.value })}
                  placeholder="English translation of example"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Notes (optional)</label>
                <textarea
                  value={editingCard.notes}
                  onChange={(e) => setEditingCard({ ...editingCard, notes: e.target.value })}
                  placeholder="Personal notes about this word..."
                  rows={2}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingCard(null)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editingCard.front.trim() || !editingCard.back.trim()}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">Delete Card?</h3>
            <p className="text-slate-400 mb-4">
              This action cannot be undone. The card and its review history will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCard(deleteConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
