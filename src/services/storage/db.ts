import Dexie, { type EntityTable } from 'dexie';
import type { Flashcard, Conversation, ReviewSession, UserProgress, UserSettings, GameState } from '../../types';

// Database schema for IndexedDB
const db = new Dexie('TurkishLearningApp') as Dexie & {
  flashcards: EntityTable<Flashcard, 'id'>;
  conversations: EntityTable<Conversation, 'id'>;
  reviewSessions: EntityTable<ReviewSession, 'id'>;
  userProgress: EntityTable<UserProgress & { id: string }, 'id'>;
  userSettings: EntityTable<UserSettings & { id: string }, 'id'>;
  gameState: EntityTable<GameState & { id: string }, 'id'>;
};

db.version(1).stores({
  flashcards: 'id, status, nextReviewDate, category, createdAt',
  conversations: 'id, scenarioId, startedAt',
  reviewSessions: 'id, startedAt',
  userProgress: 'id',
  userSettings: 'id',
  gameState: 'id',
});

// Initialize default data if not exists
export async function initializeDatabase() {
  const progressCount = await db.userProgress.count();
  if (progressCount === 0) {
    await db.userProgress.add({
      id: 'default',
      level: 1,
      currentXP: 0,
      totalXPEarned: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: new Date().toISOString().split('T')[0],
      totalFlashcardsReviewed: 0,
      totalConversationsCompleted: 0,
    });
  }

  const settingsCount = await db.userSettings.count();
  if (settingsCount === 0) {
    await db.userSettings.add({
      id: 'default',
      dailyGoalMinutes: 10,
      soundEffectsEnabled: true,
      preferredResponseMode: 'hybrid',
      difficultyLevel: 'A1',
    });
  }

  const gameStateCount = await db.gameState.count();
  if (gameStateCount === 0) {
    await db.gameState.add({
      id: 'default',
      inventory: [],
      craftedItems: [],
      unlockedLocations: ['tree'],
      unlockedPets: [],
      activePet: null,
      raftProgress: {
        rope: false,
        sailCloth: false,
        sturdyHull: false,
        navigationTools: false,
        raft: false,
      },
      currentAction: null,
    });
  }
}

export { db };
