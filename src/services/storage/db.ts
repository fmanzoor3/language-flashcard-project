import Dexie, { type EntityTable } from 'dexie';
import type {
  Flashcard,
  Conversation,
  ReviewSession,
  UserProgress,
  UserSettings,
  GameState,
  Scenario,
  CustomScenarioCategory,
  ListeningLesson,
  ListeningLessonProgress,
  ConversationAssessment,
  TranscriptionSession,
} from '../../types';

// Database schema for IndexedDB
const db = new Dexie('TurkishLearningApp') as Dexie & {
  flashcards: EntityTable<Flashcard, 'id'>;
  conversations: EntityTable<Conversation, 'id'>;
  reviewSessions: EntityTable<ReviewSession, 'id'>;
  userProgress: EntityTable<UserProgress & { id: string }, 'id'>;
  userSettings: EntityTable<UserSettings & { id: string }, 'id'>;
  gameState: EntityTable<GameState & { id: string }, 'id'>;
  scenarios: EntityTable<Scenario, 'id'>;
  scenarioCategories: EntityTable<CustomScenarioCategory, 'id'>;
  listeningLessons: EntityTable<ListeningLesson, 'id'>;
  listeningProgress: EntityTable<ListeningLessonProgress, 'id'>;
  assessments: EntityTable<ConversationAssessment, 'id'>;
  transcriptionSessions: EntityTable<TranscriptionSession, 'id'>;
};

db.version(2).stores({
  flashcards: 'id, status, nextReviewDate, category, createdAt',
  conversations: 'id, scenarioId, startedAt',
  reviewSessions: 'id, startedAt',
  userProgress: 'id',
  userSettings: 'id',
  gameState: 'id',
  scenarios: 'id, type, isPreset',
});

db.version(3).stores({
  flashcards: 'id, status, nextReviewDate, category, createdAt',
  conversations: 'id, scenarioId, startedAt',
  reviewSessions: 'id, startedAt',
  userProgress: 'id',
  userSettings: 'id',
  gameState: 'id',
  scenarios: 'id, type, isPreset',
  listeningLessons: 'id, difficulty, scenarioId, createdAt',
  listeningProgress: 'id, lessonId, startedAt, completedAt',
});

db.version(4).stores({
  flashcards: 'id, status, nextReviewDate, category, createdAt',
  conversations: 'id, scenarioId, startedAt, assessmentId',
  reviewSessions: 'id, startedAt',
  userProgress: 'id',
  userSettings: 'id',
  gameState: 'id',
  scenarios: 'id, type, isPreset',
  listeningLessons: 'id, difficulty, scenarioId, createdAt',
  listeningProgress: 'id, lessonId, startedAt, completedAt',
  assessments: 'id, conversationId, difficulty, createdAt',
});

// Version 5: Add pet and tool tracking to game state
db.version(5).stores({
  flashcards: 'id, status, nextReviewDate, category, createdAt',
  conversations: 'id, scenarioId, startedAt, assessmentId',
  reviewSessions: 'id, startedAt',
  userProgress: 'id',
  userSettings: 'id',
  gameState: 'id',
  scenarios: 'id, type, isPreset',
  listeningLessons: 'id, difficulty, scenarioId, createdAt',
  listeningProgress: 'id, lessonId, startedAt, completedAt',
  assessments: 'id, conversationId, difficulty, createdAt',
}).upgrade(async (tx) => {
  // Migrate existing game state to include new fields
  const gameStates = await tx.table('gameState').toArray();
  for (const state of gameStates) {
    await tx.table('gameState').put({
      ...state,
      craftedTools: state.craftedTools || [],
      petStates: state.petStates || {},
      autoGatherQueue: state.autoGatherQueue || [],
    });
  }
});

// Version 6: Add transcription sessions table
db.version(6).stores({
  flashcards: 'id, status, nextReviewDate, category, createdAt',
  conversations: 'id, scenarioId, startedAt, assessmentId',
  reviewSessions: 'id, startedAt',
  userProgress: 'id',
  userSettings: 'id',
  gameState: 'id',
  scenarios: 'id, type, isPreset',
  listeningLessons: 'id, difficulty, scenarioId, createdAt',
  listeningProgress: 'id, lessonId, startedAt, completedAt',
  assessments: 'id, conversationId, difficulty, createdAt',
  transcriptionSessions: 'id, startedAt, status',
});

// Version 7: Add gameModeEnabled setting
db.version(7).stores({
  flashcards: 'id, status, nextReviewDate, category, createdAt',
  conversations: 'id, scenarioId, startedAt, assessmentId',
  reviewSessions: 'id, startedAt',
  userProgress: 'id',
  userSettings: 'id',
  gameState: 'id',
  scenarios: 'id, type, isPreset',
  listeningLessons: 'id, difficulty, scenarioId, createdAt',
  listeningProgress: 'id, lessonId, startedAt, completedAt',
  assessments: 'id, conversationId, difficulty, createdAt',
  transcriptionSessions: 'id, startedAt, status',
}).upgrade(async (tx) => {
  // Add gameModeEnabled to existing user settings
  const settings = await tx.table('userSettings').toArray();
  for (const setting of settings) {
    await tx.table('userSettings').put({
      ...setting,
      gameModeEnabled: setting.gameModeEnabled ?? true, // Default to enabled
    });
  }
});

// Version 8: Add custom scenario categories table
db.version(8).stores({
  flashcards: 'id, status, nextReviewDate, category, createdAt',
  conversations: 'id, scenarioId, startedAt, assessmentId',
  reviewSessions: 'id, startedAt',
  userProgress: 'id',
  userSettings: 'id',
  gameState: 'id',
  scenarios: 'id, type, isPreset',
  scenarioCategories: 'id, type, createdAt',
  listeningLessons: 'id, difficulty, scenarioId, createdAt',
  listeningProgress: 'id, lessonId, startedAt, completedAt',
  assessments: 'id, conversationId, difficulty, createdAt',
  transcriptionSessions: 'id, startedAt, status',
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
      gameModeEnabled: true,
    });
  }

  const gameStateCount = await db.gameState.count();
  if (gameStateCount === 0) {
    await db.gameState.add({
      id: 'default',
      inventory: [],
      craftedItems: [],
      craftedTools: [],
      unlockedLocations: ['tree'],
      unlockedPets: [],
      activePet: null,
      petStates: {},
      raftProgress: {
        rope: false,
        sailCloth: false,
        sturdyHull: false,
        navigationTools: false,
        raft: false,
      },
      currentAction: null,
      autoGatherQueue: [],
    });
  }
}

export { db };
