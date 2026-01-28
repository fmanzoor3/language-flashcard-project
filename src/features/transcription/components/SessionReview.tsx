import { useEffect, useState } from 'react';
import { useTranscriptionStore } from '../../../stores/transcriptionStore';
import { useFlashcardStore } from '../../../stores/flashcardStore';
import { chatCompletion } from '../../../services/azure/openaiClient';
import type { TranscriptionSession, ExtractedVocabulary } from '../../../types';

interface SessionReviewProps {
  sessionId: string;
  onBack: () => void;
}

export default function SessionReview({ sessionId, onBack }: SessionReviewProps) {
  const { pastSessions, deleteSession } = useTranscriptionStore();
  const { addCard } = useFlashcardStore();

  const [session, setSession] = useState<TranscriptionSession | null>(null);
  const [extractedVocabulary, setExtractedVocabulary] = useState<ExtractedVocabulary[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set());

  useEffect(() => {
    const found = pastSessions.find((s) => s.id === sessionId);
    setSession(found || null);
  }, [sessionId, pastSessions]);

  if (!session) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">Session not found</p>
          <button
            onClick={onBack}
            className="mt-4 text-emerald-400 hover:text-emerald-300"
          >
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  const handleExtractVocabulary = async () => {
    if (!session || session.segments.length === 0) return;

    setIsExtracting(true);
    try {
      const turkishText = session.segments.map((s) => s.turkishText).join(' ');
      const vocabulary = await extractVocabularyFromText(turkishText);
      setExtractedVocabulary(vocabulary);
    } catch (error) {
      console.error('Failed to extract vocabulary:', error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddSelectedToFlashcards = async () => {
    const wordsToAdd = extractedVocabulary.filter((v) => selectedWords.has(v.turkish));

    for (const word of wordsToAdd) {
      await addCard(word.turkish, word.english, {
        exampleSentence: word.contexts[0],
      });
      setAddedWords((prev) => new Set([...prev, word.turkish]));
    }

    setSelectedWords(new Set());
  };

  const handleDeleteSession = async () => {
    if (confirm('Are you sure you want to delete this session? This cannot be undone.')) {
      await deleteSession(sessionId);
      onBack();
    }
  };

  const toggleWordSelection = (word: string) => {
    setSelectedWords((prev) => {
      const next = new Set(prev);
      if (next.has(word)) {
        next.delete(word);
      } else {
        next.add(word);
      }
      return next;
    });
  };

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <div>
              <h2 className="font-bold">
                {session.title || formatDate(session.startedAt)}
              </h2>
              <div className="text-sm text-slate-400">
                {session.segments.length} segments • {formatDuration(session.totalDuration)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteSession}
              className="text-red-400 hover:text-red-300 text-sm px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {session.segments.length}
            </div>
            <div className="text-sm text-slate-400">Segments</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {formatDuration(session.totalDuration)}
            </div>
            <div className="text-sm text-slate-400">Duration</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {countWords(session)}
            </div>
            <div className="text-sm text-slate-400">Words</div>
          </div>
        </div>

        {/* Vocabulary Extraction */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Extract Vocabulary</h3>
            {extractedVocabulary.length === 0 ? (
              <button
                onClick={handleExtractVocabulary}
                disabled={isExtracting}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                {isExtracting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    <span>Extract Key Words</span>
                  </>
                )}
              </button>
            ) : selectedWords.size > 0 ? (
              <button
                onClick={handleAddSelectedToFlashcards}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Add {selectedWords.size} to Flashcards
              </button>
            ) : null}
          </div>

          {extractedVocabulary.length > 0 ? (
            <div className="space-y-2">
              {extractedVocabulary.map((vocab) => {
                const isSelected = selectedWords.has(vocab.turkish);
                const isAdded = addedWords.has(vocab.turkish);

                return (
                  <button
                    key={vocab.turkish}
                    onClick={() => !isAdded && toggleWordSelection(vocab.turkish)}
                    disabled={isAdded}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isAdded
                        ? 'bg-emerald-500/10 border border-emerald-500/30'
                        : isSelected
                        ? 'bg-emerald-500/20 border border-emerald-500/50'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-emerald-400">
                          {vocab.turkish}
                        </span>
                        <span className="text-slate-400 mx-2">—</span>
                        <span>{vocab.english}</span>
                        {vocab.isPhrase && (
                          <span className="ml-2 text-xs bg-slate-600 px-1.5 py-0.5 rounded">
                            phrase
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {vocab.frequency}x
                        </span>
                        {isAdded && (
                          <span className="text-emerald-400 text-sm">✓</span>
                        )}
                      </div>
                    </div>
                    {vocab.contexts[0] && (
                      <div className="text-sm text-slate-500 mt-1 truncate">
                        "{vocab.contexts[0]}"
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">
              AI will analyze your transcript and suggest important vocabulary to learn.
            </p>
          )}
        </div>

        {/* Full Transcript */}
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="font-bold mb-3">Full Transcript</h3>
          <div className="space-y-3">
            {session.segments.map((segment, index) => (
              <div key={segment.id} className="border-b border-slate-700 pb-3 last:border-0">
                <div className="text-xs text-slate-500 mb-1">
                  #{index + 1} • {formatTime(new Date(segment.timestamp))}
                </div>
                <div className="text-white">{segment.turkishText}</div>
                {segment.englishTranslation && (
                  <div className="text-slate-400 text-sm italic mt-1">
                    {segment.englishTranslation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Extract vocabulary from Turkish text using AI
 */
async function extractVocabularyFromText(turkishText: string): Promise<ExtractedVocabulary[]> {
  const response = await chatCompletion(
    [
      {
        role: 'system',
        content: `You are a Turkish language expert. Analyze the given Turkish text and extract important vocabulary for language learners.

For each word or phrase, provide:
- turkish: The Turkish word/phrase
- english: English translation
- frequency: How many times it appears (estimate)
- contexts: One example sentence from the text containing this word
- isPhrase: true if it's a multi-word expression, false if single word

Return JSON array. Focus on:
1. Words that appear multiple times (high frequency)
2. Important/useful everyday vocabulary
3. Interesting phrases or expressions
4. Words that might be new to an intermediate learner

Limit to 10-15 most important items.`,
      },
      {
        role: 'user',
        content: turkishText,
      },
    ],
    { model: 'gpt-4o-mini', temperature: 0.3 }
  );

  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch {
    console.error('Failed to parse vocabulary response');
    return [];
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function countWords(session: TranscriptionSession): number {
  return session.segments.reduce((count, segment) => {
    return count + segment.turkishText.split(/\s+/).length;
  }, 0);
}
