import { create } from 'zustand';
import { db } from '../services/storage/db';
import { calculateSM2, getDueCards, getCardCounts, createNewFlashcard, XP_PER_RESPONSE } from '../features/flashcards/services/sm2Algorithm';
import { useUserStore } from './userStore';
import { useGameStore } from './gameStore';
import type { Flashcard, SM2Response, ReviewSession } from '../types';

interface FlashcardStore {
  cards: Flashcard[];
  currentSession: ReviewSession | null;
  currentCardIndex: number;
  isLoading: boolean;

  // Actions
  loadCards: () => Promise<void>;
  addCard: (front: string, back: string, options?: Partial<Omit<Flashcard, 'id' | 'front' | 'back'>>) => Promise<Flashcard>;
  updateCard: (id: string, updates: Partial<Omit<Flashcard, 'id'>>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  reviewCard: (response: SM2Response) => Promise<void>;
  startSession: () => void;
  endSession: () => Promise<ReviewSession | null>;

  // Getters
  getDueCards: () => Flashcard[];
  getCurrentCard: () => Flashcard | null;
  getCardCounts: () => { new: number; learning: number; review: number; due: number };
}

export const useFlashcardStore = create<FlashcardStore>((set, get) => ({
  cards: [],
  currentSession: null,
  currentCardIndex: 0,
  isLoading: true,

  loadCards: async () => {
    set({ isLoading: true });
    const cards = await db.flashcards.toArray();
    set({ cards, isLoading: false });
  },

  addCard: async (front, back, options) => {
    const cardData = createNewFlashcard(front, back, options);
    const id = crypto.randomUUID();
    const card: Flashcard = { ...cardData, id };

    await db.flashcards.add(card);
    set((state) => ({ cards: [...state.cards, card] }));

    return card;
  },

  updateCard: async (id, updates) => {
    const { cards } = get();
    const existingCard = cards.find((c) => c.id === id);
    if (!existingCard) return;

    const updatedCard = { ...existingCard, ...updates };
    await db.flashcards.put(updatedCard);
    set((state) => ({
      cards: state.cards.map((c) => (c.id === id ? updatedCard : c)),
    }));
  },

  deleteCard: async (id) => {
    await db.flashcards.delete(id);
    set((state) => ({ cards: state.cards.filter((c) => c.id !== id) }));
  },

  reviewCard: async (response: SM2Response) => {
    const { cards, currentSession, currentCardIndex } = get();
    const dueCards = getDueCards(cards);
    const currentCard = dueCards[currentCardIndex];

    if (!currentCard || !currentSession) return;

    // Calculate new SM-2 values
    const result = calculateSM2(currentCard, response);

    // Update card
    const updatedCard: Flashcard = {
      ...currentCard,
      ...result,
      lastReviewDate: new Date(),
    };

    await db.flashcards.put(updatedCard);

    // Trigger game action
    const gameAction = await useGameStore.getState().performAction(response);

    // Award XP
    const xp = XP_PER_RESPONSE[response];
    if (xp > 0) {
      await useUserStore.getState().addXP({
        type: 'flashcard',
        amount: xp,
        description: `Flashcard review (${response})`,
        timestamp: new Date(),
      });
    }

    // Update streak
    await useUserStore.getState().updateStreak();

    // Update session
    const updatedSession: ReviewSession = {
      ...currentSession,
      cardsReviewed: currentSession.cardsReviewed + 1,
      xpEarned: currentSession.xpEarned + xp,
      gameActions: [...currentSession.gameActions, gameAction],
    };

    // Update cards array
    set((state) => ({
      cards: state.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
      currentSession: updatedSession,
      currentCardIndex: currentCardIndex + 1,
    }));
  },

  startSession: () => {
    const session: ReviewSession = {
      id: crypto.randomUUID(),
      startedAt: new Date(),
      cardsReviewed: 0,
      xpEarned: 0,
      gameActions: [],
    };
    set({ currentSession: session, currentCardIndex: 0 });
  },

  endSession: async () => {
    const { currentSession } = get();
    if (!currentSession) return null;

    const completedSession: ReviewSession = {
      ...currentSession,
      completedAt: new Date(),
    };

    await db.reviewSessions.add(completedSession);

    // Update user progress
    const userStore = useUserStore.getState();
    if (userStore.progress) {
      const updatedProgress = {
        ...userStore.progress,
        totalFlashcardsReviewed:
          userStore.progress.totalFlashcardsReviewed + completedSession.cardsReviewed,
      };
      await db.userProgress.put({ ...updatedProgress, id: 'default' });
    }

    set({ currentSession: null, currentCardIndex: 0 });
    return completedSession;
  },

  getDueCards: () => {
    const { cards } = get();
    return getDueCards(cards);
  },

  getCurrentCard: () => {
    const { cards, currentCardIndex } = get();
    const dueCards = getDueCards(cards);
    return dueCards[currentCardIndex] || null;
  },

  getCardCounts: () => {
    const { cards } = get();
    return getCardCounts(cards);
  },
}));
