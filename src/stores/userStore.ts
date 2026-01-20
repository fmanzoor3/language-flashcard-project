import { create } from 'zustand';
import { db } from '../services/storage/db';
import type {
  UserProgress,
  UserSettings,
  XPEvent,
  ScenarioType,
  DifficultyLevel,
  ScenarioMasteryData,
  MasteryTier,
} from '../types';
import { DIFFICULTY_TO_MASTERY_TIER, isHigherDifficulty } from '../types';

// XP required per level using formula: 100 * level^1.8 (smoothed for early levels)
function xpRequiredForLevel(level: number): number {
  const baseXP = Math.floor(100 * Math.pow(level, 1.8));
  if (level <= 5) {
    return Math.floor(baseXP * 0.7);
  }
  return baseXP;
}

function calculateTotalXPForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpRequiredForLevel(i);
  }
  return total;
}

interface UserStore {
  progress: UserProgress | null;
  settings: UserSettings | null;
  isLoading: boolean;

  // Actions
  loadUser: () => Promise<void>;
  addXP: (event: XPEvent) => Promise<{ leveledUp: boolean; newLevel?: number }>;
  updateStreak: () => Promise<void>;
  updateProgress: (updates: Partial<UserProgress>) => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  getXPToNextLevel: () => number;
  getXPProgress: () => { current: number; required: number; percentage: number };

  // Scenario Mastery
  updateScenarioMastery: (
    scenarioType: ScenarioType,
    difficulty: DifficultyLevel,
    completedWithoutAssist: boolean
  ) => Promise<void>;
  getScenarioMastery: (scenarioType: ScenarioType) => ScenarioMasteryData | null;
  getScenarioMasteryTier: (scenarioType: ScenarioType) => MasteryTier;
}

export const useUserStore = create<UserStore>((set, get) => ({
  progress: null,
  settings: null,
  isLoading: true,

  loadUser: async () => {
    set({ isLoading: true });
    const progress = await db.userProgress.get('default');
    const settings = await db.userSettings.get('default');
    set({
      progress: progress || null,
      settings: settings || null,
      isLoading: false,
    });
  },

  addXP: async (event: XPEvent) => {
    const { progress } = get();
    if (!progress) return { leveledUp: false };

    const newTotalXP = progress.totalXPEarned + event.amount;
    const newCurrentXP = progress.currentXP + event.amount;

    // Calculate if level up occurred
    let newLevel = progress.level;
    let remainingXP = newCurrentXP;

    while (remainingXP >= xpRequiredForLevel(newLevel)) {
      remainingXP -= xpRequiredForLevel(newLevel);
      newLevel++;
    }

    const leveledUp = newLevel > progress.level;

    const updatedProgress: UserProgress = {
      ...progress,
      totalXPEarned: newTotalXP,
      currentXP: remainingXP,
      level: newLevel,
    };

    await db.userProgress.put({ ...updatedProgress, id: 'default' });
    set({ progress: updatedProgress });

    return { leveledUp, newLevel: leveledUp ? newLevel : undefined };
  },

  updateStreak: async () => {
    const { progress } = get();
    if (!progress) return;

    const today = new Date().toISOString().split('T')[0];
    const lastActivity = progress.lastActivityDate;

    if (lastActivity === today) {
      // Already updated today
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = progress.currentStreak;
    if (lastActivity === yesterdayStr) {
      // Continue streak
      newStreak++;
    } else if (lastActivity !== today) {
      // Streak broken, reset to 1
      newStreak = 1;
    }

    const updatedProgress: UserProgress = {
      ...progress,
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, progress.longestStreak),
      lastActivityDate: today,
    };

    await db.userProgress.put({ ...updatedProgress, id: 'default' });
    set({ progress: updatedProgress });
  },

  updateProgress: async (updates: Partial<UserProgress>) => {
    const { progress } = get();
    if (!progress) return;

    const updatedProgress: UserProgress = { ...progress, ...updates };
    await db.userProgress.put({ ...updatedProgress, id: 'default' });
    set({ progress: updatedProgress });
  },

  updateSettings: async (newSettings: Partial<UserSettings>) => {
    const { settings } = get();
    if (!settings) return;

    const updatedSettings: UserSettings = { ...settings, ...newSettings };
    await db.userSettings.put({ ...updatedSettings, id: 'default' });
    set({ settings: updatedSettings });
  },

  getXPToNextLevel: () => {
    const { progress } = get();
    if (!progress) return 0;
    return xpRequiredForLevel(progress.level) - progress.currentXP;
  },

  getXPProgress: () => {
    const { progress } = get();
    if (!progress) return { current: 0, required: 100, percentage: 0 };

    const required = xpRequiredForLevel(progress.level);
    const current = progress.currentXP;
    const percentage = Math.min((current / required) * 100, 100);

    return { current, required, percentage };
  },

  updateScenarioMastery: async (
    scenarioType: ScenarioType,
    difficulty: DifficultyLevel,
    completedWithoutAssist: boolean
  ) => {
    const { progress } = get();
    if (!progress) return;

    const now = new Date().toISOString();
    const currentMastery = progress.scenarioMastery || {};
    const scenarioData = currentMastery[scenarioType] || {
      highestMastered: null,
      masteredAt: null,
      attempts: {},
    };

    // Update attempt data for this difficulty
    const currentAttempt = scenarioData.attempts[difficulty] || {
      totalAttempts: 0,
      masteredCount: 0,
      lastAttempt: now,
    };

    const updatedAttempt = {
      totalAttempts: currentAttempt.totalAttempts + 1,
      masteredCount: completedWithoutAssist
        ? currentAttempt.masteredCount + 1
        : currentAttempt.masteredCount,
      lastAttempt: now,
    };

    // Check if this is a new highest mastery
    const newHighestMastered =
      completedWithoutAssist && isHigherDifficulty(difficulty, scenarioData.highestMastered)
        ? difficulty
        : scenarioData.highestMastered;

    const updatedScenarioData: ScenarioMasteryData = {
      highestMastered: newHighestMastered,
      masteredAt: newHighestMastered !== scenarioData.highestMastered ? now : scenarioData.masteredAt,
      attempts: {
        ...scenarioData.attempts,
        [difficulty]: updatedAttempt,
      },
    };

    const updatedMastery = {
      ...currentMastery,
      [scenarioType]: updatedScenarioData,
    };

    const updatedProgress: UserProgress = {
      ...progress,
      scenarioMastery: updatedMastery,
    };

    await db.userProgress.put({ ...updatedProgress, id: 'default' });
    set({ progress: updatedProgress });
  },

  getScenarioMastery: (scenarioType: ScenarioType) => {
    const { progress } = get();
    if (!progress?.scenarioMastery) return null;
    return progress.scenarioMastery[scenarioType] || null;
  },

  getScenarioMasteryTier: (scenarioType: ScenarioType) => {
    const { progress } = get();
    if (!progress?.scenarioMastery) return 'none';
    const mastery = progress.scenarioMastery[scenarioType];
    if (!mastery?.highestMastered) return 'none';
    return DIFFICULTY_TO_MASTERY_TIER[mastery.highestMastered];
  },
}));

// Export utility functions
export { xpRequiredForLevel, calculateTotalXPForLevel };
