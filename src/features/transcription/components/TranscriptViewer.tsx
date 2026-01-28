import { useEffect, useRef, useState } from 'react';
import { useTranscriptionStore } from '../../../stores/transcriptionStore';
import { useFlashcardStore } from '../../../stores/flashcardStore';
import { getWordTranslation } from '../../../services/azure/conversationService';

export default function TranscriptViewer() {
  const { currentSession, currentSegmentText, translateSegment } = useTranscriptionStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentSession?.segments.length, currentSegmentText, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  if (!currentSession) return null;

  const segments = currentSession.segments;
  const hasContent = segments.length > 0 || currentSegmentText;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto p-4 space-y-4"
    >
      {!hasContent ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-slate-400">
            <div className="text-4xl mb-2">🎤</div>
            <p>Listening for Turkish speech...</p>
            <p className="text-sm mt-1 text-slate-500">
              Start speaking and your words will appear here
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Completed segments */}
          {segments.map((segment, index) => (
            <SegmentCard
              key={segment.id}
              segment={segment}
              index={index}
              onTranslate={() => translateSegment(segment.id)}
            />
          ))}

          {/* Current partial transcription */}
          {currentSegmentText && (
            <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded-lg p-4 animate-pulse">
              <div className="text-emerald-400 font-medium">{currentSegmentText}</div>
              <div className="text-xs text-slate-500 mt-1">Transcribing...</div>
            </div>
          )}
        </>
      )}

      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            if (containerRef.current) {
              containerRef.current.scrollTop = containerRef.current.scrollHeight;
            }
          }}
          className="fixed bottom-24 right-4 bg-emerald-500 text-white px-3 py-2 rounded-full shadow-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
        >
          <span>↓</span>
          <span className="text-sm">Follow</span>
        </button>
      )}
    </div>
  );
}

interface SegmentCardProps {
  segment: {
    id: string;
    turkishText: string;
    englishTranslation?: string;
    timestamp: Date;
    confidence?: number;
  };
  index: number;
  onTranslate: () => void;
}

function SegmentCard({ segment, index, onTranslate }: SegmentCardProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [wordTranslation, setWordTranslation] = useState<{
    english: string;
    pronunciation?: string;
    exampleSentence?: string;
    exampleTranslation?: string;
  } | null>(null);
  const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set());

  const { addCard } = useFlashcardStore();

  const handleWordClick = async (word: string) => {
    // Clean the word (remove punctuation)
    const cleanWord = word.replace(/[.,!?;:'"()[\]{}]/g, '').trim();
    if (!cleanWord) return;

    setSelectedWord(cleanWord);
    setWordTranslation(null);
    setIsLoadingTranslation(true);

    try {
      const translation = await getWordTranslation(cleanWord);
      setWordTranslation(translation);
    } catch (error) {
      console.error('Failed to get word translation:', error);
    } finally {
      setIsLoadingTranslation(false);
    }
  };

  const handleAddToFlashcards = async () => {
    if (!selectedWord || !wordTranslation) return;

    await addCard(selectedWord, wordTranslation.english, {
      pronunciation: wordTranslation.pronunciation,
      exampleSentence: wordTranslation.exampleSentence,
      exampleTranslation: wordTranslation.exampleTranslation,
    });

    setAddedWords((prev) => new Set([...prev, selectedWord]));
    setSelectedWord(null);
    setWordTranslation(null);
  };

  const words = segment.turkishText.split(/\s+/);

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      {/* Segment header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">
          #{index + 1} • {formatTime(new Date(segment.timestamp))}
        </span>
        {segment.confidence && (
          <span className="text-xs text-slate-500">
            {Math.round(segment.confidence * 100)}% confidence
          </span>
        )}
      </div>

      {/* Turkish text with clickable words */}
      <div className="text-lg leading-relaxed mb-2">
        {words.map((word, i) => {
          const cleanWord = word.replace(/[.,!?;:'"()[\]{}]/g, '').trim();
          const isAdded = addedWords.has(cleanWord);

          return (
            <span key={i}>
              <span
                onClick={() => handleWordClick(word)}
                className={`cursor-pointer transition-colors rounded px-0.5 ${
                  isAdded
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'hover:bg-emerald-500/20 hover:text-emerald-400'
                }`}
              >
                {word}
              </span>
              {i < words.length - 1 && ' '}
            </span>
          );
        })}
      </div>

      {/* English translation */}
      {segment.englishTranslation ? (
        <div className="text-slate-400 text-sm italic">
          {segment.englishTranslation}
        </div>
      ) : (
        <button
          onClick={onTranslate}
          className="text-emerald-400 text-sm hover:text-emerald-300 transition-colors"
        >
          Translate →
        </button>
      )}

      {/* Word translation popup */}
      {selectedWord && (
        <div className="mt-3 bg-slate-900 rounded-lg p-3 border border-slate-700">
          <div className="flex items-start justify-between">
            <div className="font-medium text-emerald-400">{selectedWord}</div>
            <button
              onClick={() => {
                setSelectedWord(null);
                setWordTranslation(null);
              }}
              className="text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          </div>

          {isLoadingTranslation ? (
            <div className="text-slate-400 text-sm mt-2">Loading...</div>
          ) : wordTranslation ? (
            <div className="mt-2 space-y-2">
              <div className="text-white">{wordTranslation.english}</div>
              {wordTranslation.pronunciation && (
                <div className="text-slate-400 text-sm">
                  /{wordTranslation.pronunciation}/
                </div>
              )}
              {wordTranslation.exampleSentence && (
                <div className="text-sm">
                  <div className="text-slate-300">{wordTranslation.exampleSentence}</div>
                  {wordTranslation.exampleTranslation && (
                    <div className="text-slate-500 italic">
                      {wordTranslation.exampleTranslation}
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={handleAddToFlashcards}
                disabled={addedWords.has(selectedWord)}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                  addedWords.has(selectedWord)
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                }`}
              >
                {addedWords.has(selectedWord) ? '✓ Added' : '+ Add to Flashcards'}
              </button>
            </div>
          ) : (
            <div className="text-red-400 text-sm mt-2">
              Failed to load translation
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
