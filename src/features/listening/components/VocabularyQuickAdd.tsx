import { useState } from 'react';
import { useFlashcardStore } from '../../../stores/flashcardStore';
import { getWordTranslation, type TranslationResult } from '../../../services/azure/conversationService';

interface FlashcardSelection {
  text: string;
  translation: TranslationResult | null;
  isLoading: boolean;
  userNote: string;
}

interface VocabularyQuickAddProps {
  /** The Turkish text to display with clickable words */
  text: string;
  /** English translation to show optionally */
  translation?: string;
  /** Set of words already added to flashcards */
  addedWords: Set<string>;
  /** Callback when a word is added */
  onWordAdded: (word: string) => void;
  /** Optional class name for the container */
  className?: string;
  /** Whether to show translation toggle */
  showTranslationToggle?: boolean;
}

/**
 * Component that renders Turkish text with clickable words for quick-add to flashcards
 */
export default function VocabularyQuickAdd({
  text,
  translation,
  addedWords,
  onWordAdded,
  className = '',
  showTranslationToggle = false,
}: VocabularyQuickAddProps) {
  const addCard = useFlashcardStore((state) => state.addCard);
  const [flashcardSelection, setFlashcardSelection] = useState<FlashcardSelection | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);

  const handleSelectText = async (word: string) => {
    const cleanText = word.trim();
    if (cleanText.length < 2 || addedWords.has(cleanText)) return;

    setFlashcardSelection({
      text: cleanText,
      translation: null,
      isLoading: true,
      userNote: '',
    });

    try {
      const translationResult = await getWordTranslation(cleanText);
      setFlashcardSelection((prev) =>
        prev ? { ...prev, translation: translationResult, isLoading: false } : null
      );
    } catch {
      setFlashcardSelection((prev) =>
        prev ? { ...prev, isLoading: false } : null
      );
    }
  };

  const handleAddToFlashcards = async () => {
    if (!flashcardSelection || !flashcardSelection.translation) return;

    const { text: selectedText, translation: trans, userNote } = flashcardSelection;

    await addCard(selectedText, trans.english, {
      pronunciation: trans.pronunciation,
      exampleSentence: trans.exampleSentence,
      exampleTranslation: trans.exampleTranslation,
      notes: userNote || undefined,
    });

    onWordAdded(selectedText);
    setFlashcardSelection(null);
  };

  const handleCancelFlashcard = () => {
    setFlashcardSelection(null);
  };

  // Handle text selection for phrases
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (selectedText.length >= 2) {
      handleSelectText(selectedText);
      selection.removeAllRanges();
    }
  };

  // Render Turkish text with clickable words
  const renderClickableText = (content: string) => {
    const words = content.split(/(\s+)/);
    return words.map((word, index) => {
      const cleanWord = word.replace(/[.,!?;:'"]/g, '');
      if (cleanWord.length < 2 || /^\s+$/.test(word)) {
        return word;
      }

      const isAdded = addedWords.has(cleanWord);

      return (
        <span
          key={index}
          className={`rounded px-0.5 transition-colors ${
            isAdded
              ? 'text-emerald-400/60'
              : 'hover:bg-emerald-500/20 hover:text-emerald-300 cursor-pointer'
          }`}
          onClick={(e) => {
            if (isAdded) return;
            e.stopPropagation();
            handleSelectText(cleanWord);
          }}
          title={isAdded ? 'Already in flashcards' : 'Click to add to flashcards'}
        >
          {word}
        </span>
      );
    });
  };

  return (
    <>
      <div className={className} onMouseUp={handleTextSelection}>
        <div className="select-text">{renderClickableText(text)}</div>

        {showTranslationToggle && translation && (
          <div className="mt-2">
            <button
              onClick={() => setShowTranslation(!showTranslation)}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showTranslation ? 'Hide' : 'Show'} translation
            </button>
            {showTranslation && (
              <p className="text-sm text-slate-400 mt-1 italic">{translation}</p>
            )}
          </div>
        )}

        <p className="text-xs text-slate-500 mt-2">
          Tap a word or select a phrase to add to flashcards
        </p>
      </div>

      {/* Flashcard Modal */}
      {flashcardSelection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add to Flashcards</h3>

            {/* Selected Text */}
            <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
              <p className="text-xs text-slate-400 mb-1">
                {flashcardSelection.translation?.isPhrase ? 'Selected Phrase' : 'Selected Word'}
              </p>
              <p className="text-xl font-bold text-emerald-400">{flashcardSelection.text}</p>
            </div>

            {/* Translation Preview */}
            {flashcardSelection.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <span className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                <span className="ml-2 text-slate-400">Looking up translation...</span>
              </div>
            ) : flashcardSelection.translation ? (
              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Translation</p>
                  <p className="text-white font-medium">{flashcardSelection.translation.english}</p>
                </div>

                {flashcardSelection.translation.pronunciation && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Pronunciation</p>
                    <p className="text-slate-300 italic">{flashcardSelection.translation.pronunciation}</p>
                  </div>
                )}

                {flashcardSelection.translation.exampleSentence && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Example</p>
                    <p className="text-slate-300">{flashcardSelection.translation.exampleSentence}</p>
                    <p className="text-xs text-slate-400 italic mt-1">
                      {flashcardSelection.translation.exampleTranslation}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-red-400 text-sm mb-4">Could not load translation. You can still add it manually.</p>
            )}

            {/* User Notes */}
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1">Personal Note (optional)</label>
              <textarea
                value={flashcardSelection.userNote}
                onChange={(e) =>
                  setFlashcardSelection((prev) =>
                    prev ? { ...prev, userNote: e.target.value } : null
                  )
                }
                placeholder="Add a memory tip, context, or anything to help you remember..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm resize-none h-20"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelFlashcard}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToFlashcards}
                disabled={flashcardSelection.isLoading || !flashcardSelection.translation}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors"
              >
                {flashcardSelection.isLoading ? 'Loading...' : 'Add to Flashcards'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
