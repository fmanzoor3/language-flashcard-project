import { create } from 'zustand';
import { db } from '../services/storage/db';
import {
  startConversation,
  sendMessage,
  generateCustomScenario,
  generateCustomLesson,
  getWordTranslation,
  getAssistSuggestions,
  PRESET_SCENARIOS,
  type WordBankItem,
  type TranslationMode,
  type ConversationOptions,
  type AssistSuggestion,
} from '../services/azure/conversationService';
import { assessConversation, calculateXPFromAssessment } from '../services/azure/assessmentService';
import { useUserStore } from './userStore';
import { useFlashcardStore } from './flashcardStore';
import type {
  Scenario,
  CustomScenarioCategory,
  Conversation,
  ConversationMessage,
  ConversationAssessment,
  VocabularySuggestion,
  DifficultyLevel,
} from '../types';

interface ConversationStore {
  // State
  scenarios: Scenario[];
  customCategories: CustomScenarioCategory[];
  currentScenario: Scenario | null;
  currentConversation: Conversation | null;
  messages: ConversationMessage[];
  systemPrompt: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  wordBank: WordBankItem[];
  error: string | null;

  // User preferences for conversation
  selectedDifficulty: DifficultyLevel;
  translationMode: TranslationMode;

  // Assist feature
  assistSuggestions: AssistSuggestion[];
  isLoadingAssist: boolean;
  usedAssistInSession: boolean;

  // Assessment
  currentAssessment: ConversationAssessment | null;
  isAssessing: boolean;
  showAssessmentModal: boolean;

  // Actions
  loadScenarios: () => Promise<void>;
  selectScenario: (scenario: Scenario) => void;
  setDifficulty: (difficulty: DifficultyLevel) => void;
  setTranslationMode: (mode: TranslationMode) => void;
  startNewConversation: () => Promise<void>;
  sendUserMessage: (message: string) => Promise<void>;
  endConversation: () => Promise<void>;
  createCustomScenario: (description: string, difficulty: DifficultyLevel) => Promise<Scenario>;
  createCustomCategory: (title: string, titleTurkish: string, description: string, emoji: string) => Promise<CustomScenarioCategory>;
  createLessonInCategory: (categoryType: string, description: string, difficulty: DifficultyLevel) => Promise<Scenario>;
  deleteScenario: (scenarioId: string) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  moveScenarioToCategory: (scenarioId: string, targetCategoryType: string) => Promise<void>;
  addWordToFlashcards: (turkish: string) => Promise<void>;
  requestAssist: () => Promise<void>;
  clearAssist: () => void;
  clearError: () => void;
  reset: () => void;

  // Assessment actions
  runAssessment: () => Promise<void>;
  addVocabSuggestionToFlashcards: (suggestion: VocabularySuggestion) => Promise<void>;
  closeAssessmentModal: () => void;
  dismissAssessment: () => void;
}

const XP_PER_MESSAGE = 5;
const XP_CONVERSATION_COMPLETE = 25;

export const useConversationStore = create<ConversationStore>((set, get) => ({
  scenarios: PRESET_SCENARIOS,
  customCategories: [],
  currentScenario: null,
  currentConversation: null,
  messages: [],
  systemPrompt: null,
  isLoading: false,
  isStreaming: false,
  streamingContent: '',
  wordBank: [],
  error: null,

  // Default preferences
  selectedDifficulty: 'A1',
  translationMode: 'always',

  // Assist feature
  assistSuggestions: [],
  isLoadingAssist: false,
  usedAssistInSession: false,

  // Assessment
  currentAssessment: null,
  isAssessing: false,
  showAssessmentModal: false,

  loadScenarios: async () => {
    // Load any custom scenarios and categories from database
    const customScenarios = await db.scenarios?.toArray() || [];
    const customCategories = await db.scenarioCategories?.toArray() || [];
    set({
      scenarios: [...PRESET_SCENARIOS, ...customScenarios],
      customCategories,
    });
  },

  selectScenario: (scenario) => {
    set({
      currentScenario: scenario,
      currentConversation: null,
      messages: [],
      systemPrompt: null,
      wordBank: [],
      error: null,
      // Set default difficulty from scenario, user can override
      selectedDifficulty: scenario.difficulty,
    });
  },

  setDifficulty: (difficulty) => {
    set({ selectedDifficulty: difficulty });
  },

  setTranslationMode: (mode) => {
    set({ translationMode: mode });
  },

  startNewConversation: async () => {
    const { currentScenario, selectedDifficulty, translationMode } = get();
    if (!currentScenario) {
      set({ error: 'No scenario selected' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const options: ConversationOptions = {
        difficulty: selectedDifficulty,
        translationMode: translationMode,
        responseMode: 'hybrid',
      };

      const { systemPrompt, greeting, wordBank } = await startConversation(
        currentScenario,
        options
      );

      const conversationId = `conv-${Date.now()}`;
      const greetingMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
      };

      const conversation: Conversation = {
        id: conversationId,
        scenarioId: currentScenario.id,
        messages: [greetingMessage],
        startedAt: new Date(),
        xpEarned: 0,
        usedAssist: false,
      };

      // Save to database
      await db.conversations.add(conversation);

      set({
        currentConversation: conversation,
        messages: [greetingMessage],
        systemPrompt,
        wordBank: wordBank || [],
        isLoading: false,
        usedAssistInSession: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to start conversation',
        isLoading: false,
      });
    }
  },

  sendUserMessage: async (message: string) => {
    const { messages, systemPrompt, currentConversation } = get();
    if (!systemPrompt || !currentConversation) return;

    const userMessage: ConversationMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    set({
      messages: updatedMessages,
      isStreaming: true,
      streamingContent: '',
      error: null,
    });

    try {
      const { response, wordBank, translation } = await sendMessage(
        messages,
        message,
        systemPrompt,
        (chunk) => {
          set((state) => ({
            streamingContent: state.streamingContent + chunk,
          }));
        }
      );

      const assistantMessage: ConversationMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: response,
        translation,
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];

      // Update conversation in database
      const xpEarned = currentConversation.xpEarned + XP_PER_MESSAGE;
      await db.conversations.update(currentConversation.id, {
        messages: finalMessages,
        xpEarned,
      });

      // Add XP
      useUserStore.getState().addXP({
        type: 'conversation',
        amount: XP_PER_MESSAGE,
        description: 'Conversation message',
        timestamp: new Date(),
      });

      set({
        messages: finalMessages,
        currentConversation: { ...currentConversation, messages: finalMessages, xpEarned },
        wordBank: wordBank || get().wordBank,
        isStreaming: false,
        streamingContent: '',
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to send message',
        isStreaming: false,
        streamingContent: '',
      });
    }
  },

  endConversation: async () => {
    const { currentConversation, currentScenario, selectedDifficulty, usedAssistInSession } = get();
    if (!currentConversation) return;

    const completedAt = new Date();
    const finalXP = currentConversation.xpEarned + XP_CONVERSATION_COMPLETE;

    await db.conversations.update(currentConversation.id, {
      completedAt,
      xpEarned: finalXP,
    });

    // Add completion bonus XP
    useUserStore.getState().addXP({
      type: 'conversation',
      amount: XP_CONVERSATION_COMPLETE,
      description: 'Conversation completed',
      timestamp: new Date(),
    });

    // Update total conversations completed
    const progress = useUserStore.getState().progress;
    if (progress) {
      await useUserStore.getState().updateProgress({
        totalConversationsCompleted: progress.totalConversationsCompleted + 1,
      });
    }

    // Update scenario mastery
    if (currentScenario) {
      const completedWithoutAssist = !usedAssistInSession && !currentConversation.usedAssist;
      await useUserStore.getState().updateScenarioMastery(
        currentScenario.type,
        selectedDifficulty,
        completedWithoutAssist
      );
    }

    set({
      currentConversation: null,
      currentScenario: null,
      messages: [],
      systemPrompt: null,
      wordBank: [],
      usedAssistInSession: false,
    });
  },

  createCustomScenario: async (description: string, difficulty: DifficultyLevel) => {
    set({ isLoading: true, error: null });

    try {
      const scenario = await generateCustomScenario(description, difficulty);

      // Save to database for persistence
      await db.scenarios?.add(scenario);

      set((state) => ({
        scenarios: [...state.scenarios, scenario],
        isLoading: false,
      }));

      return scenario;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create scenario',
        isLoading: false,
      });
      throw error;
    }
  },

  createCustomCategory: async (title: string, titleTurkish: string, description: string, emoji: string) => {
    set({ isLoading: true, error: null });

    try {
      // Generate a unique type identifier from the title
      const typeId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const category: CustomScenarioCategory = {
        id: `cat-${Date.now()}`,
        type: typeId,
        title,
        titleTurkish,
        description,
        emoji,
        createdAt: new Date(),
      };

      // Save to database
      await db.scenarioCategories.add(category);

      set((state) => ({
        customCategories: [...state.customCategories, category],
        isLoading: false,
      }));

      return category;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create category',
        isLoading: false,
      });
      throw error;
    }
  },

  createLessonInCategory: async (categoryType: string, description: string, difficulty: DifficultyLevel) => {
    set({ isLoading: true, error: null });

    try {
      // Find the category to get its context
      const category = get().customCategories.find(c => c.type === categoryType);
      const categoryTitle = category?.title || categoryType;

      const scenario = await generateCustomLesson(categoryType, categoryTitle, description, difficulty);

      // Save to database for persistence
      await db.scenarios?.add(scenario);

      set((state) => ({
        scenarios: [...state.scenarios, scenario],
        isLoading: false,
      }));

      return scenario;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create lesson',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteScenario: async (scenarioId: string) => {
    try {
      await db.scenarios?.delete(scenarioId);
      set((state) => ({
        scenarios: state.scenarios.filter(s => s.id !== scenarioId),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete scenario',
      });
    }
  },

  deleteCategory: async (categoryId: string) => {
    try {
      const category = get().customCategories.find(c => c.id === categoryId);
      if (category) {
        // Delete all scenarios in this category
        const scenariosToDelete = get().scenarios.filter(s => s.type === category.type && !s.isPreset);
        for (const scenario of scenariosToDelete) {
          await db.scenarios?.delete(scenario.id);
        }
        // Delete the category
        await db.scenarioCategories?.delete(categoryId);

        set((state) => ({
          customCategories: state.customCategories.filter(c => c.id !== categoryId),
          scenarios: state.scenarios.filter(s => s.type !== category.type || s.isPreset),
        }));
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete category',
      });
    }
  },

  moveScenarioToCategory: async (scenarioId: string, targetCategoryType: string) => {
    try {
      const scenario = get().scenarios.find(s => s.id === scenarioId);
      if (!scenario) {
        throw new Error('Scenario not found');
      }

      // Update the scenario's type to the target category
      const updatedScenario = { ...scenario, type: targetCategoryType as Scenario['type'] };

      // Update in database
      await db.scenarios?.update(scenarioId, { type: targetCategoryType });

      // Update in state
      set((state) => ({
        scenarios: state.scenarios.map(s =>
          s.id === scenarioId ? updatedScenario : s
        ),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to move scenario',
      });
    }
  },

  addWordToFlashcards: async (turkish: string) => {
    set({ isLoading: true });

    try {
      const wordInfo = await getWordTranslation(turkish);

      await useFlashcardStore.getState().addCard(turkish, wordInfo.english, {
        pronunciation: wordInfo.pronunciation,
        exampleSentence: wordInfo.exampleSentence,
        exampleTranslation: wordInfo.exampleTranslation,
        sourceScenarioId: get().currentScenario?.id,
      });

      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add word',
        isLoading: false,
      });
    }
  },

  requestAssist: async () => {
    const { messages, selectedDifficulty, currentConversation } = get();
    if (messages.length === 0) return;

    set({ isLoadingAssist: true, assistSuggestions: [], usedAssistInSession: true });

    // Update conversation to track assist usage
    if (currentConversation) {
      await db.conversations.update(currentConversation.id, { usedAssist: true });
      set({ currentConversation: { ...currentConversation, usedAssist: true } });
    }

    try {
      const suggestions = await getAssistSuggestions(messages, selectedDifficulty);
      set({ assistSuggestions: suggestions, isLoadingAssist: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to get suggestions',
        isLoadingAssist: false,
      });
    }
  },

  clearAssist: () => set({ assistSuggestions: [] }),

  clearError: () => set({ error: null }),

  reset: () => set({
    currentScenario: null,
    currentConversation: null,
    messages: [],
    systemPrompt: null,
    wordBank: [],
    error: null,
    isLoading: false,
    isStreaming: false,
    streamingContent: '',
    assistSuggestions: [],
    isLoadingAssist: false,
    usedAssistInSession: false,
    currentAssessment: null,
    isAssessing: false,
    showAssessmentModal: false,
  }),

  runAssessment: async () => {
    const { currentConversation, messages, selectedDifficulty, usedAssistInSession, currentScenario, translationMode } = get();
    if (!currentConversation || messages.length < 2) {
      set({ error: 'Need at least one exchange to assess' });
      return;
    }

    set({ isAssessing: true, error: null });

    try {
      const assessment = await assessConversation({
        messages,
        difficulty: selectedDifficulty,
        usedAssist: usedAssistInSession || currentConversation.usedAssist || false,
        conversationId: currentConversation.id,
      });

      // Save assessment to database
      await db.assessments.add(assessment);

      // Update conversation with assessment ID
      const completedAt = new Date();
      await db.conversations.update(currentConversation.id, {
        completedAt,
        assessmentId: assessment.id,
      });

      // Calculate and award XP
      const xpEarned = calculateXPFromAssessment(assessment);
      useUserStore.getState().addXP({
        type: 'conversation',
        amount: xpEarned,
        description: `Conversation completed (${assessment.overallScore}% score)`,
        timestamp: new Date(),
      });

      // Update total conversations completed
      const progress = useUserStore.getState().progress;
      if (progress) {
        await useUserStore.getState().updateProgress({
          totalConversationsCompleted: progress.totalConversationsCompleted + 1,
        });
      }

      // Update scenario mastery based on assessment score
      // Mastery requires: good score (isMastered), no assist used, and Turkish-only mode (no translations)
      const completedWithFullImmersion = assessment.isMastered && translationMode === 'none';
      if (currentScenario && completedWithFullImmersion) {
        await useUserStore.getState().updateScenarioMastery(
          currentScenario.type,
          selectedDifficulty,
          true
        );
      }

      set({
        currentAssessment: assessment,
        isAssessing: false,
        showAssessmentModal: true,
        currentConversation: {
          ...currentConversation,
          completedAt,
          assessmentId: assessment.id,
        },
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to assess conversation',
        isAssessing: false,
      });
    }
  },

  addVocabSuggestionToFlashcards: async (suggestion: VocabularySuggestion) => {
    set({ isLoading: true });

    try {
      await useFlashcardStore.getState().addCard(suggestion.turkish, suggestion.english, {
        pronunciation: suggestion.pronunciation,
        exampleSentence: suggestion.exampleSentence,
        sourceScenarioId: get().currentScenario?.id,
      });

      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add vocabulary',
        isLoading: false,
      });
    }
  },

  closeAssessmentModal: () => {
    set({
      showAssessmentModal: false,
      currentConversation: null,
      currentScenario: null,
      messages: [],
      systemPrompt: null,
      wordBank: [],
      usedAssistInSession: false,
      currentAssessment: null,
    });
  },

  dismissAssessment: () => {
    set({ showAssessmentModal: false });
  },
}));
