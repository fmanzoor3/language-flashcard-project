// Core Types for Turkish Language Learning App

// ============ User & Progress Types ============

export interface UserProgress {
  level: number;
  currentXP: number;
  totalXPEarned: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  totalFlashcardsReviewed: number;
  totalConversationsCompleted: number;
}

export interface UserSettings {
  dailyGoalMinutes: number;
  soundEffectsEnabled: boolean;
  preferredResponseMode: ResponseMode;
  difficultyLevel: DifficultyLevel;
}

export type ResponseMode = 'free-text' | 'word-bank' | 'hybrid';
export type DifficultyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

// ============ Flashcard Types ============

export interface Flashcard {
  id: string;
  front: string;          // Turkish
  back: string;           // English
  pronunciation?: string;
  audioUrl?: string;
  exampleSentence?: string;
  exampleTranslation?: string;
  notes?: string;         // User's personal notes
  category?: string;
  tags: string[];
  sourceScenarioId?: string;
  createdAt: Date;

  // SM-2 Algorithm fields
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReviewDate: Date;
  lastReviewDate?: Date;
  status: CardStatus;
}

export type CardStatus = 'new' | 'learning' | 'review' | 'relearning';

export type SM2Response = 'again' | 'hard' | 'good' | 'easy';

export interface SM2Result {
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReviewDate: Date;
  status: CardStatus;
}

export interface ReviewSession {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  cardsReviewed: number;
  xpEarned: number;
  gameActions: GameAction[];
}

// ============ Game Types ============

export type LocationType = 'tree' | 'bush' | 'beach' | 'sea';
export type RarityTier = 'common' | 'rare' | 'veryRare' | 'legendary';

export interface Resource {
  id: string;
  name: string;
  emoji: string;
  category: ResourceCategory;
  rarity: RarityTier;
  maxStack: number;
}

export type ResourceCategory = 'wood' | 'food' | 'material' | 'treasure' | 'special';

export interface InventoryItem {
  resourceId: string;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  emoji: string;
  ingredients: { resourceId: string; quantity: number }[];
  result: { resourceId: string; quantity: number };
  requiredLevel: number;
  description: string;
  effect?: string;
  isRaftComponent?: boolean;
}

export interface GameAction {
  location: LocationType;
  response: SM2Response;
  lootResult: LootResult;
  timestamp: Date;
}

export interface LootResult {
  resourceId: string | null;
  quantity: number;
  rarity: RarityTier | null;
}

export interface GameState {
  inventory: InventoryItem[];
  craftedItems: string[];
  unlockedLocations: LocationType[];
  unlockedPets: string[];
  activePet: string | null;
  raftProgress: RaftProgress;
  currentAction: PendingAction | null;
}

export interface RaftProgress {
  rope: boolean;
  sailCloth: boolean;
  sturdyHull: boolean;
  navigationTools: boolean;
  raft: boolean;
}

export interface PendingAction {
  location: LocationType;
  animationState: 'idle' | 'walking' | 'searching' | 'found' | 'failed';
  result: LootResult | null;
}

// ============ Conversation Types ============

export type ScenarioType =
  | 'restaurant'
  | 'shopping'
  | 'work'
  | 'travel'
  | 'healthcare'
  | 'social'
  | 'custom';

export interface Scenario {
  id: string;
  type: ScenarioType;
  title: string;
  titleTurkish: string;
  description: string;
  difficulty: DifficultyLevel;
  customPrompt?: string;
  vocabularyFocus?: string[];
  grammarFocus?: string[];
  isPreset: boolean;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  translation?: string;
  timestamp: Date;
  audioUrl?: string;
}

export interface Conversation {
  id: string;
  scenarioId: string;
  messages: ConversationMessage[];
  startedAt: Date;
  completedAt?: Date;
  xpEarned: number;
}

// ============ Listening Lesson Types ============

export type ListeningExerciseType = 'dictation' | 'comprehension';

export interface ListeningLesson {
  id: string;
  title: string;
  titleTurkish: string;
  description: string;
  difficulty: DifficultyLevel;
  scenarioId?: string;           // Links to conversation scenario
  vocabularyFocus: string[];
  grammarFocus: string[];
  estimatedMinutes: number;
  exercises: ListeningExercise[];
  createdAt: Date;
  isGenerated: boolean;
}

export interface ListeningExercise {
  id: string;
  type: ListeningExerciseType;
  order: number;
  audioText: string;             // Text to be spoken
  audioTextTranslation: string;
  targetText?: string;           // For dictation: expected answer
  acceptableVariants?: string[];
  hints?: string[];
  questions?: ComprehensionQuestion[];  // For comprehension
  difficulty: DifficultyLevel;
}

export interface ComprehensionQuestion {
  id: string;
  questionText: string;
  questionTranslation: string;
  questionType: 'multiple-choice' | 'true-false';
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface ListeningLessonProgress {
  id: string;
  lessonId: string;
  startedAt: Date;
  completedAt?: Date;
  exerciseProgress: ExerciseProgress[];
  totalXPEarned: number;
  accuracy: number;
}

export interface ExerciseProgress {
  exerciseId: string;
  completed: boolean;
  attempts: number;
  hintsUsed: number;
  correct: boolean;
  userAnswer?: string;
  xpEarned: number;
}

// ============ XP & Level Types ============

export interface XPEvent {
  type: 'flashcard' | 'conversation' | 'crafting' | 'achievement' | 'streak' | 'listening';
  amount: number;
  description: string;
  timestamp: Date;
}
