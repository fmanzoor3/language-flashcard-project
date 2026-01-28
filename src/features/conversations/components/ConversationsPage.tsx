import { useState, useEffect, useRef } from 'react';
import { useConversationStore } from '../../../stores/conversationStore';
import { useFlashcardStore } from '../../../stores/flashcardStore';
import { useUserStore } from '../../../stores/userStore';
import { isConfigured } from '../../../services/azure/openaiClient';
import { getWordTranslation, type TranslationMode, type TranslationResult } from '../../../services/azure/conversationService';
import ConversationAssessmentModal from './ConversationAssessmentModal';
import type { Scenario, DifficultyLevel, ScenarioType } from '../../../types';
import { MASTERY_TIER_STYLES } from '../../../types';

interface FlashcardSelection {
  text: string;
  translation: TranslationResult | null;
  isLoading: boolean;
  userNote: string;
}

const SCENARIO_EMOJIS: Record<string, string> = {
  restaurant: '🍽️',
  shopping: '🛍️',
  travel: '🚌',
  social: '👋',
  work: '💼',
  healthcare: '🏥',
  custom: '✨',
};

const TRANSLATION_OPTIONS: { value: TranslationMode; label: string; description: string }[] = [
  { value: 'always', label: 'With Translations', description: 'Show English after each Turkish sentence' },
  { value: 'none', label: 'Turkish Only', description: 'Full immersion - no English translations' },
  { value: 'on-request', label: 'On Request', description: 'Only translate when you ask' },
];

export default function ConversationsPage() {
  const {
    scenarios,
    currentScenario,
    currentConversation,
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    wordBank,
    error,
    selectedDifficulty,
    translationMode,
    assistSuggestions,
    isLoadingAssist,
    isAssessing,
    loadScenarios,
    selectScenario,
    setDifficulty,
    setTranslationMode,
    startNewConversation,
    sendUserMessage,
    createCustomScenario,
    requestAssist,
    clearAssist,
    clearError,
    runAssessment,
  } = useConversationStore();

  const addCard = useFlashcardStore((state) => state.addCard);
  const getScenarioMasteryTier = useUserStore((state) => state.getScenarioMasteryTier);
  const getScenarioMastery = useUserStore((state) => state.getScenarioMastery);

  const [userInput, setUserInput] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [customDescription, setCustomDescription] = useState('');
  const [customDifficulty, setCustomDifficulty] = useState<DifficultyLevel>('A2');
  const [flashcardSelection, setFlashcardSelection] = useState<FlashcardSelection | null>(null);
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const apiConfigured = isConfigured();

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (currentConversation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentConversation]);

  const handleSelectScenario = (scenario: Scenario) => {
    selectScenario(scenario);
    setShowScenarioModal(true);
  };

  const handleCloseScenarioModal = () => {
    setShowScenarioModal(false);
  };

  const handleStartConversation = async () => {
    setShowScenarioModal(false);
    await startNewConversation();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isStreaming) return;

    const message = userInput;
    setUserInput('');
    await sendUserMessage(message);
  };

  const handleEndConversation = async () => {
    // Run assessment instead of just ending
    await runAssessment();
  };

  const handleCreateCustomScenario = async () => {
    if (!customDescription.trim()) return;

    try {
      const scenario = await createCustomScenario(customDescription, customDifficulty);
      selectScenario(scenario);
      setShowCustomModal(false);
      setCustomDescription('');
    } catch {
      // Error is handled in store
    }
  };

  const handleSelectText = async (text: string) => {
    const cleanText = text.trim();
    if (cleanText.length < 2 || addedWords.has(cleanText)) return;

    setFlashcardSelection({
      text: cleanText,
      translation: null,
      isLoading: true,
      userNote: '',
    });

    try {
      const translation = await getWordTranslation(cleanText);
      setFlashcardSelection((prev) =>
        prev ? { ...prev, translation, isLoading: false } : null
      );
    } catch {
      setFlashcardSelection((prev) =>
        prev ? { ...prev, isLoading: false } : null
      );
    }
  };

  const handleAddToFlashcards = async () => {
    if (!flashcardSelection || !flashcardSelection.translation) return;

    const { text, translation, userNote } = flashcardSelection;

    await addCard(text, translation.english, {
      pronunciation: translation.pronunciation,
      exampleSentence: translation.exampleSentence,
      exampleTranslation: translation.exampleTranslation,
      notes: userNote || undefined,
      sourceScenarioId: currentScenario?.id,
    });

    setAddedWords((prev) => new Set(prev).add(text));
    setFlashcardSelection(null);
  };

  const handleCancelFlashcard = () => {
    setFlashcardSelection(null);
  };

  const handleUseSuggestion = (turkish: string) => {
    setUserInput(turkish);
    clearAssist();
    inputRef.current?.focus();
  };

  const handleQuickAddPhrase = async (turkish: string, english: string) => {
    await addCard(turkish, english);
    setAddedWords((prev) => new Set(prev).add(turkish));
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
  const renderClickableText = (text: string) => {
    const words = text.split(/(\s+)/);
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

  // Parse and render message content with styled translations
  const renderMessageContent = (content: string, isAssistant: boolean) => {
    if (!isAssistant) return content;

    // Split content by translation markers [[ ]]
    const parts = content.split(/(\[\[.*?\]\])/g);

    return parts.map((part, index) => {
      // Check if this part is a translation
      const translationMatch = part.match(/^\[\[(.*?)\]\]$/);
      if (translationMatch) {
        // Render translation as small, italic, grey text
        return (
          <span key={index} className="block text-xs italic text-slate-400 mt-0.5 mb-2">
            {translationMatch[1]}
          </span>
        );
      }

      // Regular Turkish text - make words clickable
      return <span key={index}>{renderClickableText(part)}</span>;
    });
  };

  // If in active conversation, show chat interface
  if (currentConversation) {
    return (
      <div className="h-full flex flex-col">
        {/* Assessment Modal */}
        <ConversationAssessmentModal />
        {/* Conversation Header */}
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {currentScenario && SCENARIO_EMOJIS[currentScenario.type]}
            </span>
            <div>
              <h2 className="font-bold">{currentScenario?.title}</h2>
              <p className="text-xs text-slate-400">{currentScenario?.titleTurkish}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAssessing && (
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <span className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                <span>Analyzing...</span>
              </div>
            )}
            <button
              onClick={handleEndConversation}
              disabled={isAssessing || isStreaming}
              className="text-sm text-slate-400 hover:text-white px-3 py-1 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAssessing ? 'Assessing...' : 'End & Review'}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0" onMouseUp={handleTextSelection}>
          <p className="text-xs text-slate-500 text-center mb-2">
            Tap a word or select a phrase to add it to your flashcards
          </p>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && <span className="text-xl shrink-0">🤖</span>}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-emerald-500/20 border border-emerald-500/30'
                    : 'bg-slate-700'
                }`}
              >
                <div className="text-sm select-text">
                  {renderMessageContent(message.content, message.role === 'assistant')}
                </div>
              </div>
              {message.role === 'user' && <span className="text-xl shrink-0">👤</span>}
            </div>
          ))}

          {/* Streaming response */}
          {isStreaming && streamingContent && (
            <div className="flex gap-3">
              <span className="text-xl shrink-0">🤖</span>
              <div className="max-w-[80%] rounded-lg px-4 py-2 bg-slate-700">
                <div className="text-sm">
                  {renderMessageContent(streamingContent, true)}
                </div>
                <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-1" />
              </div>
            </div>
          )}

          {isLoading && !isStreaming && (
            <div className="flex gap-3">
              <span className="text-xl">🤖</span>
              <div className="bg-slate-700 rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Word Bank */}
        {wordBank.length > 0 && (
          <div className="border-t border-slate-700 px-4 py-2 bg-slate-800/50 shrink-0">
            <p className="text-xs text-slate-400 mb-2">Suggested words:</p>
            <div className="flex flex-wrap gap-2">
              {wordBank.map((item) => (
                <button
                  key={item.turkish}
                  onClick={() => setUserInput((prev) => prev + ' ' + item.turkish)}
                  className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors"
                  title={item.english}
                >
                  {item.turkish}
                  <span className="text-slate-400 ml-1">({item.english})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Assist Suggestions */}
        {assistSuggestions.length > 0 && (
          <div className="border-t border-slate-700 px-4 py-3 bg-amber-500/5 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-amber-400 font-medium">Suggested responses:</p>
              <button
                onClick={clearAssist}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Dismiss
              </button>
            </div>
            <div className="space-y-2">
              {assistSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleUseSuggestion(suggestion.turkish)}
                  className="w-full text-left p-3 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 transition-colors"
                >
                  <p className="font-medium text-white">{suggestion.turkish}</p>
                  <p className="text-xs text-slate-400 mt-1">{suggestion.english}</p>
                  {suggestion.explanation && (
                    <p className="text-xs text-amber-400/70 mt-1 italic">{suggestion.explanation}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700 shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={requestAssist}
              disabled={isStreaming || isLoading || isLoadingAssist || messages.length === 0}
              className="bg-amber-500/20 hover:bg-amber-500/30 disabled:bg-slate-700 disabled:cursor-not-allowed text-amber-400 disabled:text-slate-500 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
              title="Get help with your response"
            >
              {isLoadingAssist ? (
                <span className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              ) : (
                <span className="text-lg">💡</span>
              )}
              <span className="text-sm font-medium hidden sm:inline">Assist</span>
            </button>
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your response in Turkish..."
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              disabled={isStreaming || isLoading}
            />
            <button
              type="submit"
              disabled={!userInput.trim() || isStreaming || isLoading}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
            >
              Send
            </button>
          </div>
        </form>

        {/* Enhanced Flashcard Modal */}
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

        {/* Error Toast */}
        {error && (
          <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-red-500/90 text-white px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <p className="text-sm">{error}</p>
              <button onClick={clearError} className="text-white/80 hover:text-white">
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Scenario selection view
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Conversation Practice</h2>
          <p className="text-slate-400">
            Choose a scenario to practice real-world Turkish conversations
          </p>
        </div>

        {/* API Configuration Warning */}
        {!apiConfigured && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-medium text-amber-400">Azure OpenAI Not Configured</p>
                <p className="text-sm text-slate-400">
                  To use AI conversations, copy .env.example to .env and add your Azure OpenAI credentials.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">❌</span>
                <p className="text-red-400">{error}</p>
              </div>
              <button onClick={clearError} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Scenario Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {scenarios.map((scenario) => {
            const masteryTier = getScenarioMasteryTier(scenario.type as ScenarioType);
            const masteryData = getScenarioMastery(scenario.type as ScenarioType);
            const masteryStyles = MASTERY_TIER_STYLES[masteryTier];
            const highestCompleted = masteryData?.highestMastered;

            return (
              <button
                key={scenario.id}
                onClick={() => handleSelectScenario(scenario)}
                className={`text-left p-4 rounded-xl border transition-all ${masteryStyles.bg} ${masteryStyles.border} ${masteryStyles.glow} hover:border-slate-500`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{SCENARIO_EMOJIS[scenario.type]}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`font-bold ${masteryStyles.textClass || 'text-slate-100'}`}>{scenario.title}</h3>
                      {highestCompleted && (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${masteryStyles.badge || 'bg-emerald-500/20 text-emerald-400'}`}>
                          {highestCompleted === 'C2' ? 'Mastered' : `Up to ${highestCompleted}`}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${masteryStyles.textClass ? 'opacity-80' : 'text-slate-400'} ${masteryStyles.textClass || ''}`}>{scenario.titleTurkish}</p>
                    <p className={`text-sm mt-2 ${masteryStyles.textClass ? 'opacity-70' : 'text-slate-500'} ${masteryStyles.textClass || ''}`}>{scenario.description}</p>
                    {scenario.vocabularyFocus && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {scenario.vocabularyFocus.slice(0, 4).map((word) => (
                          <span key={word} className="text-xs bg-slate-700 px-2 py-0.5 rounded">
                            {word}
                          </span>
                        ))}
                      </div>
                    )}
                    {masteryStyles.showMasteredLabel && (
                      <div className="mt-3 pt-2 border-t border-amber-500/30">
                        <span className="text-xs font-bold text-amber-400 tracking-wider">
                          MASTERED
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Scenario Button */}
        <button
          onClick={() => setShowCustomModal(true)}
          disabled={!apiConfigured}
          className="w-full mt-6 p-4 rounded-xl border border-dashed border-slate-600 bg-slate-800/30 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">✨</span>
            <div className="flex-1 text-left">
              <h3 className="font-bold">Create Custom Scenario</h3>
              <p className="text-sm text-slate-400 mt-1">
                Describe any situation and AI will generate a conversation for you
              </p>
            </div>
          </div>
        </button>

        {/* Quick Vocabulary Section */}
        <div className="mt-8">
          <h3 className="font-bold text-lg mb-4">Quick Vocabulary</h3>
          <p className="text-sm text-slate-400 mb-4">
            Common phrases you'll use in conversations. Tap to add to flashcards!
          </p>

          <div className="grid gap-2 md:grid-cols-2">
            {[
              { turkish: 'Merhaba', english: 'Hello' },
              { turkish: 'Teşekkür ederim', english: 'Thank you' },
              { turkish: 'Lütfen', english: 'Please' },
              { turkish: 'Evet / Hayır', english: 'Yes / No' },
              { turkish: 'Ne kadar?', english: 'How much?' },
              { turkish: 'Hesap lütfen', english: 'The bill please' },
              { turkish: 'Anlıyorum', english: 'I understand' },
              { turkish: 'Anlamıyorum', english: "I don't understand" },
            ].map((phrase) => (
              <button
                key={phrase.turkish}
                onClick={() => handleQuickAddPhrase(phrase.turkish, phrase.english)}
                disabled={addedWords.has(phrase.turkish)}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                  addedWords.has(phrase.turkish)
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-slate-800/50 border-slate-700 hover:border-emerald-500/50'
                }`}
              >
                <div>
                  <p className="font-medium">{phrase.turkish}</p>
                  <p className="text-sm text-slate-400">{phrase.english}</p>
                </div>
                <span className={addedWords.has(phrase.turkish) ? 'text-emerald-400' : 'text-slate-500'}>
                  {addedWords.has(phrase.turkish) ? '✓' : '+'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Scenario Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Custom Scenario</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Describe your scenario
                </label>
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="e.g., I'm at a Turkish coffee shop and want to order a traditional Turkish coffee and chat with the barista about coffee culture..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 h-32 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Difficulty Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as DifficultyLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setCustomDifficulty(level)}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        customDifficulty === level
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCustomModal(false);
                  setCustomDescription('');
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomScenario}
                disabled={!customDescription.trim() || isLoading}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors"
              >
                {isLoading ? 'Creating...' : 'Create Scenario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scenario Configuration Modal */}
      {showScenarioModal && currentScenario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{SCENARIO_EMOJIS[currentScenario.type]}</span>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{currentScenario.title}</h2>
                <p className="text-sm text-slate-400">{currentScenario.titleTurkish}</p>
              </div>
              <button
                onClick={handleCloseScenarioModal}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-300 text-sm mb-4">{currentScenario.description}</p>

            {/* Vocabulary Preview */}
            {currentScenario.vocabularyFocus && currentScenario.vocabularyFocus.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-slate-400 mb-2">Vocabulary focus</p>
                <div className="flex flex-wrap gap-1">
                  {currentScenario.vocabularyFocus.slice(0, 6).map((word) => (
                    <span key={word} className="text-xs bg-slate-700 px-2 py-0.5 rounded">
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Difficulty Selection */}
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2">Difficulty Level</label>
              <div className="grid grid-cols-6 gap-1">
                {(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as DifficultyLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`py-2 rounded text-sm font-medium transition-colors ${
                      selectedDifficulty === level
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Translation Mode Selection */}
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">Translation Mode</label>
              <div className="space-y-2">
                {TRANSLATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTranslationMode(option.value)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      translationMode === option.value
                        ? 'bg-emerald-500/10 border-emerald-500/50'
                        : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option.label}</span>
                      {translationMode === option.value && (
                        <span className="text-emerald-400">✓</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCloseScenarioModal}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartConversation}
                disabled={isLoading || !apiConfigured}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Starting...
                  </span>
                ) : (
                  'Start Conversation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
