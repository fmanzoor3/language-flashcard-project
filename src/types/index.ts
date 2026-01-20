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
  scenarioMastery?: ScenarioMasteryMap;
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
  usedAssist?: boolean;
}

// ============ Scenario Mastery Types ============

/** Map of scenario type to mastery data */
export type ScenarioMasteryMap = {
  [scenarioType in ScenarioType]?: ScenarioMasteryData;
};

/** Mastery data for a single scenario type */
export interface ScenarioMasteryData {
  /** Highest difficulty completed without assistance */
  highestMastered: DifficultyLevel | null;
  /** Date when highest mastery was achieved */
  masteredAt: string | null;
  /** Track attempts per difficulty */
  attempts: Partial<Record<DifficultyLevel, ScenarioAttemptData>>;
}

/** Attempt data for a specific difficulty level */
export interface ScenarioAttemptData {
  /** Total number of attempts at this difficulty */
  totalAttempts: number;
  /** Number of completions without assistance */
  masteredCount: number;
  /** Last attempt date */
  lastAttempt: string;
}

/** Mastery tier for visual display (derived from highestMastered) */
export type MasteryTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';

/** Maps difficulty levels to mastery tiers */
export const DIFFICULTY_TO_MASTERY_TIER: Record<DifficultyLevel, MasteryTier> = {
  A1: 'bronze',
  A2: 'silver',
  B1: 'gold',
  B2: 'platinum',
  C1: 'diamond',
  C2: 'master',
};

/** Visual styling for each mastery tier (martial arts belt progression) */
export const MASTERY_TIER_STYLES: Record<MasteryTier, {
  border: string;
  bg: string;
  glow: string;
  badge: string;
  label: string;
  textClass?: string;
  showMasteredLabel?: boolean;
}> = {
  none: {
    border: 'border-slate-700',
    bg: 'bg-slate-800/50',
    glow: '',
    badge: '',
    label: '',
  },
  bronze: {
    // White belt - beginner
    border: 'border-slate-400',
    bg: 'bg-slate-500/80',
    glow: '',
    badge: 'bg-slate-200 text-slate-800',
    label: 'A1',
    textClass: 'text-white',
  },
  silver: {
    // Yellow belt
    border: 'border-yellow-500',
    bg: 'bg-yellow-500/80',
    glow: '',
    badge: 'bg-yellow-300 text-yellow-900',
    label: 'A2',
    textClass: 'text-yellow-950',
  },
  gold: {
    // Orange belt
    border: 'border-orange-500',
    bg: 'bg-orange-500/80',
    glow: '',
    badge: 'bg-orange-300 text-orange-900',
    label: 'B1',
    textClass: 'text-white',
  },
  platinum: {
    // Green belt
    border: 'border-green-500',
    bg: 'bg-green-600/80',
    glow: '',
    badge: 'bg-green-300 text-green-900',
    label: 'B2',
    textClass: 'text-white',
  },
  diamond: {
    // Blue belt
    border: 'border-blue-500',
    bg: 'bg-blue-600/80',
    glow: '',
    badge: 'bg-blue-300 text-blue-900',
    label: 'C1',
    textClass: 'text-white',
  },
  master: {
    // Black belt with gold border - master
    border: 'border-amber-500/70 ring-1 ring-amber-400/40',
    bg: 'bg-gradient-to-br from-slate-800/80 via-slate-900/85 to-slate-950/90 master-shine',
    glow: 'shadow-amber-500/30 shadow-lg',
    badge: 'bg-gradient-to-r from-slate-800 to-slate-900 text-amber-400 ring-1 ring-amber-500/50',
    label: 'C2',
    showMasteredLabel: true,
  },
};

/** Difficulty level comparison for determining if one is higher than another */
export const DIFFICULTY_ORDER: DifficultyLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/** Check if difficulty a is higher than difficulty b */
export function isHigherDifficulty(a: DifficultyLevel, b: DifficultyLevel | null): boolean {
  if (b === null) return true;
  return DIFFICULTY_ORDER.indexOf(a) > DIFFICULTY_ORDER.indexOf(b);
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
