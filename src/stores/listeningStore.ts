import { create } from 'zustand';
import { db } from '../services/storage/db';
import { useUserStore } from './userStore';
import type {
  ListeningLesson,
  ListeningLessonProgress,
  ListeningExercise,
  ListeningExerciseType,
  ExerciseProgress,
  DifficultyLevel,
  Scenario,
} from '../types';

export interface LessonGenerationOptions {
  difficulty: DifficultyLevel;
  exerciseTypes: ListeningExerciseType[];
  exerciseCount: number;
}

// XP rewards for listening exercises
const XP_DICTATION_CORRECT_FIRST_TRY = 20;
const XP_DICTATION_CORRECT_WITH_HINTS = 10;
const XP_DICTATION_CORRECT_SECOND_TRY = 5;
const XP_COMPREHENSION_CORRECT = 15;
const XP_LESSON_COMPLETE = 30;
const XP_PERFECT_LESSON = 50;

interface ListeningStore {
  // State
  lessons: ListeningLesson[];
  currentLesson: ListeningLesson | null;
  currentExerciseIndex: number;
  currentProgress: ListeningLessonProgress | null;
  isLoading: boolean;
  isGenerating: boolean;
  isPlaying: boolean;
  error: string | null;

  // User preferences
  selectedDifficulty: DifficultyLevel;
  playbackSpeed: number;
  selectedVoice: 'alloy' | 'echo' | 'shimmer';

  // Actions
  loadLessons: () => Promise<void>;
  generateLessonFromScenario: (scenario: Scenario, options?: LessonGenerationOptions) => Promise<ListeningLesson>;
  startLesson: (lessonId: string) => Promise<void>;
  submitDictationAnswer: (answer: string) => Promise<{ correct: boolean; xpEarned: number }>;
  submitComprehensionAnswer: (questionId: string, answer: string) => Promise<{ correct: boolean; xpEarned: number }>;
  useHint: () => void;
  nextExercise: () => void;
  previousExercise: () => void;
  endLesson: () => Promise<ListeningLessonProgress | null>;
  setDifficulty: (difficulty: DifficultyLevel) => void;
  setPlaybackSpeed: (speed: number) => void;
  setVoice: (voice: 'alloy' | 'echo' | 'shimmer') => void;
  setPlaying: (playing: boolean) => void;
  clearError: () => void;
  reset: () => void;

  // Getters
  getCurrentExercise: () => ListeningExercise | null;
  getCurrentExerciseProgress: () => ExerciseProgress | null;
  getLessonsByDifficulty: (difficulty?: DifficultyLevel) => ListeningLesson[];
  getLessonsByScenario: (scenarioId: string) => ListeningLesson[];
}

export const useListeningStore = create<ListeningStore>((set, get) => ({
  lessons: [],
  currentLesson: null,
  currentExerciseIndex: 0,
  currentProgress: null,
  isLoading: false,
  isGenerating: false,
  isPlaying: false,
  error: null,

  selectedDifficulty: 'A1',
  playbackSpeed: 1.0,
  selectedVoice: 'alloy',

  loadLessons: async () => {
    set({ isLoading: true });
    try {
      const lessons = await db.listeningLessons.toArray();
      set({ lessons, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load lessons',
        isLoading: false,
      });
    }
  },

  generateLessonFromScenario: async (scenario: Scenario, options?: LessonGenerationOptions) => {
    set({ isGenerating: true, error: null });

    try {
      // Import dynamically to avoid circular dependencies
      const { generateListeningLesson } = await import('../services/azure/listeningLessonService');
      const lesson = await generateListeningLesson(scenario, options);

      // Save to database
      await db.listeningLessons.add(lesson);

      set((state) => ({
        lessons: [...state.lessons, lesson],
        isGenerating: false,
      }));

      return lesson;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to generate lesson',
        isGenerating: false,
      });
      throw error;
    }
  },

  startLesson: async (lessonId: string) => {
    const { lessons } = get();
    const lesson = lessons.find((l) => l.id === lessonId);

    if (!lesson) {
      set({ error: 'Lesson not found' });
      return;
    }

    // Initialize progress
    const progress: ListeningLessonProgress = {
      id: `progress-${Date.now()}`,
      lessonId,
      startedAt: new Date(),
      exerciseProgress: lesson.exercises.map((ex) => ({
        exerciseId: ex.id,
        completed: false,
        attempts: 0,
        hintsUsed: 0,
        correct: false,
        xpEarned: 0,
      })),
      totalXPEarned: 0,
      accuracy: 0,
    };

    set({
      currentLesson: lesson,
      currentExerciseIndex: 0,
      currentProgress: progress,
      error: null,
    });
  },

  submitDictationAnswer: async (answer: string) => {
    const { currentLesson, currentExerciseIndex, currentProgress } = get();

    if (!currentLesson || !currentProgress) {
      return { correct: false, xpEarned: 0 };
    }

    const exercise = currentLesson.exercises[currentExerciseIndex];
    if (!exercise || exercise.type !== 'dictation') {
      return { correct: false, xpEarned: 0 };
    }

    const exerciseProgress = currentProgress.exerciseProgress[currentExerciseIndex];
    const attempts = exerciseProgress.attempts + 1;

    // Check answer using Turkish-aware comparison
    const isCorrect = compareTurkishStrings(answer, exercise.targetText || exercise.audioText) ||
      (exercise.acceptableVariants?.some((variant) => compareTurkishStrings(answer, variant)) ?? false);

    // Calculate XP
    let xpEarned = 0;
    if (isCorrect) {
      if (attempts === 1 && exerciseProgress.hintsUsed === 0) {
        xpEarned = XP_DICTATION_CORRECT_FIRST_TRY;
      } else if (exerciseProgress.hintsUsed > 0) {
        xpEarned = XP_DICTATION_CORRECT_WITH_HINTS;
      } else {
        xpEarned = XP_DICTATION_CORRECT_SECOND_TRY;
      }
    }

    // Update progress
    const updatedExerciseProgress = [...currentProgress.exerciseProgress];
    updatedExerciseProgress[currentExerciseIndex] = {
      ...exerciseProgress,
      attempts,
      completed: isCorrect,
      correct: isCorrect,
      userAnswer: answer,
      xpEarned: isCorrect ? xpEarned : exerciseProgress.xpEarned,
    };

    const totalXP = updatedExerciseProgress.reduce((sum, ep) => sum + ep.xpEarned, 0);

    set({
      currentProgress: {
        ...currentProgress,
        exerciseProgress: updatedExerciseProgress,
        totalXPEarned: totalXP,
      },
    });

    // Award XP immediately if correct
    if (isCorrect && xpEarned > 0) {
      useUserStore.getState().addXP({
        type: 'listening',
        amount: xpEarned,
        description: 'Dictation exercise correct',
        timestamp: new Date(),
      });
    }

    return { correct: isCorrect, xpEarned };
  },

  submitComprehensionAnswer: async (questionId: string, answer: string) => {
    const { currentLesson, currentExerciseIndex, currentProgress } = get();

    if (!currentLesson || !currentProgress) {
      return { correct: false, xpEarned: 0 };
    }

    const exercise = currentLesson.exercises[currentExerciseIndex];
    if (!exercise || exercise.type !== 'comprehension' || !exercise.questions) {
      return { correct: false, xpEarned: 0 };
    }

    const question = exercise.questions.find((q) => q.id === questionId);
    if (!question) {
      return { correct: false, xpEarned: 0 };
    }

    const isCorrect = answer === question.correctAnswer;
    const xpEarned = isCorrect ? XP_COMPREHENSION_CORRECT : 0;

    // Update progress
    const exerciseProgress = currentProgress.exerciseProgress[currentExerciseIndex];
    const updatedExerciseProgress = [...currentProgress.exerciseProgress];
    updatedExerciseProgress[currentExerciseIndex] = {
      ...exerciseProgress,
      attempts: exerciseProgress.attempts + 1,
      completed: true,
      correct: isCorrect,
      userAnswer: answer,
      xpEarned: exerciseProgress.xpEarned + xpEarned,
    };

    const totalXP = updatedExerciseProgress.reduce((sum, ep) => sum + ep.xpEarned, 0);

    set({
      currentProgress: {
        ...currentProgress,
        exerciseProgress: updatedExerciseProgress,
        totalXPEarned: totalXP,
      },
    });

    // Award XP
    if (xpEarned > 0) {
      useUserStore.getState().addXP({
        type: 'listening',
        amount: xpEarned,
        description: 'Comprehension question correct',
        timestamp: new Date(),
      });
    }

    return { correct: isCorrect, xpEarned };
  },

  useHint: () => {
    const { currentProgress, currentExerciseIndex } = get();
    if (!currentProgress) return;

    const updatedExerciseProgress = [...currentProgress.exerciseProgress];
    updatedExerciseProgress[currentExerciseIndex] = {
      ...updatedExerciseProgress[currentExerciseIndex],
      hintsUsed: updatedExerciseProgress[currentExerciseIndex].hintsUsed + 1,
    };

    set({
      currentProgress: {
        ...currentProgress,
        exerciseProgress: updatedExerciseProgress,
      },
    });
  },

  nextExercise: () => {
    const { currentLesson, currentExerciseIndex } = get();
    if (!currentLesson) return;

    if (currentExerciseIndex < currentLesson.exercises.length - 1) {
      set({ currentExerciseIndex: currentExerciseIndex + 1 });
    }
  },

  previousExercise: () => {
    const { currentExerciseIndex } = get();
    if (currentExerciseIndex > 0) {
      set({ currentExerciseIndex: currentExerciseIndex - 1 });
    }
  },

  endLesson: async () => {
    const { currentProgress, currentLesson } = get();
    if (!currentProgress || !currentLesson) return null;

    // Calculate accuracy
    const completedExercises = currentProgress.exerciseProgress.filter((ep) => ep.completed);
    const correctExercises = currentProgress.exerciseProgress.filter((ep) => ep.correct);
    const accuracy = completedExercises.length > 0
      ? (correctExercises.length / currentLesson.exercises.length) * 100
      : 0;

    // Add completion bonus
    let bonusXP = XP_LESSON_COMPLETE;
    if (accuracy === 100) {
      bonusXP += XP_PERFECT_LESSON;
    }

    const finalProgress: ListeningLessonProgress = {
      ...currentProgress,
      completedAt: new Date(),
      totalXPEarned: currentProgress.totalXPEarned + bonusXP,
      accuracy,
    };

    // Save to database
    await db.listeningProgress.add(finalProgress);

    // Award completion XP
    useUserStore.getState().addXP({
      type: 'listening',
      amount: bonusXP,
      description: accuracy === 100 ? 'Perfect lesson completion!' : 'Lesson completed',
      timestamp: new Date(),
    });

    // Update streak
    await useUserStore.getState().updateStreak();

    set({
      currentLesson: null,
      currentExerciseIndex: 0,
      currentProgress: null,
    });

    return finalProgress;
  },

  setDifficulty: (difficulty) => set({ selectedDifficulty: difficulty }),
  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
  setVoice: (voice) => set({ selectedVoice: voice }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  clearError: () => set({ error: null }),

  reset: () =>
    set({
      currentLesson: null,
      currentExerciseIndex: 0,
      currentProgress: null,
      isPlaying: false,
      error: null,
    }),

  getCurrentExercise: () => {
    const { currentLesson, currentExerciseIndex } = get();
    if (!currentLesson) return null;
    return currentLesson.exercises[currentExerciseIndex] || null;
  },

  getCurrentExerciseProgress: () => {
    const { currentProgress, currentExerciseIndex } = get();
    if (!currentProgress) return null;
    return currentProgress.exerciseProgress[currentExerciseIndex] || null;
  },

  getLessonsByDifficulty: (difficulty) => {
    const { lessons, selectedDifficulty } = get();
    const targetDifficulty = difficulty || selectedDifficulty;
    return lessons.filter((l) => l.difficulty === targetDifficulty);
  },

  getLessonsByScenario: (scenarioId) => {
    const { lessons } = get();
    return lessons.filter((l) => l.scenarioId === scenarioId);
  },
}));

/**
 * Compare two Turkish strings with normalization
 * Handles common Turkish character variations
 */
function compareTurkishStrings(input: string, target: string): boolean {
  // Normalize both strings
  const normalizedInput = normalizeTurkish(input);
  const normalizedTarget = normalizeTurkish(target);

  return normalizedInput === normalizedTarget;
}

/**
 * Normalize Turkish text for comparison
 */
function normalizeTurkish(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove punctuation
    .replace(/[.,!?;:'"]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Normalize Turkish-specific characters for comparison
    // Note: We don't convert ı to i or ş to s because these are distinct letters in Turkish
    // But we handle common typing mistakes
    .normalize('NFC');
}

/**
 * Calculate similarity score between two Turkish strings (0-100)
 */
export function calculateTurkishSimilarity(input: string, target: string): number {
  const normalizedInput = normalizeTurkish(input);
  const normalizedTarget = normalizeTurkish(target);

  if (normalizedInput === normalizedTarget) return 100;

  // Use Levenshtein distance
  const distance = levenshteinDistance(normalizedInput, normalizedTarget);
  const maxLength = Math.max(normalizedInput.length, normalizedTarget.length);

  if (maxLength === 0) return 100;

  return Math.round((1 - distance / maxLength) * 100);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
