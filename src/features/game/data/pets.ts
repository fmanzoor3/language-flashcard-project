import type { Pet, PetType } from '../../../types';

/**
 * Pet definitions for the Island Survival Game
 * Pets are unlocked at specific levels and provide passive abilities
 */
export const PETS: Record<PetType, Pet> = {
  crab: {
    id: 'crab',
    name: 'Sandy the Crab',
    emoji: '🦀',
    unlockLevel: 5,
    description: 'A friendly crab that auto-gathers shells while you study',
    ability: {
      type: 'auto_gather',
      description: 'Auto-gathers 1 shell every 5 flashcard reviews',
      value: 5, // Every 5 reviews
      affectedCategories: ['material'],
    },
  },
  parrot: {
    id: 'parrot',
    name: 'Polly the Parrot',
    emoji: '🦜',
    unlockLevel: 9,
    description: 'A colorful parrot that helps you find rare items',
    ability: {
      type: 'rare_drop_bonus',
      description: '+5% chance for rare drops',
      value: 5, // 5% bonus
    },
  },
  monkey: {
    id: 'monkey',
    name: 'Coco the Monkey',
    emoji: '🐵',
    unlockLevel: 12,
    description: 'A clever monkey that helps with crafting',
    ability: {
      type: 'crafting_helper',
      description: '10% chance to not consume crafting materials',
      value: 10, // 10% chance
    },
  },
  dolphin: {
    id: 'dolphin',
    name: 'Splash the Dolphin',
    emoji: '🐬',
    unlockLevel: 15,
    description: 'A playful dolphin that doubles your fishing rewards',
    ability: {
      type: 'fishing_bonus',
      description: '2x fish from sea location',
      value: 100, // 100% bonus = 2x
      affectedLocations: ['sea'],
      affectedCategories: ['food'],
    },
  },
};

/**
 * Get a pet by its ID
 */
export function getPet(petId: PetType): Pet {
  return PETS[petId];
}

/**
 * Get all pets as an array, sorted by unlock level
 */
export function getAllPets(): Pet[] {
  return Object.values(PETS).sort((a, b) => a.unlockLevel - b.unlockLevel);
}

/**
 * Get pets that can be unlocked at a given level
 */
export function getPetsUnlockableAtLevel(level: number): Pet[] {
  return getAllPets().filter(pet => pet.unlockLevel <= level);
}

/**
 * Check which pets are newly unlocked given current level and already unlocked pets
 */
export function getNewlyUnlockedPets(
  currentLevel: number,
  alreadyUnlockedPets: PetType[]
): PetType[] {
  return (Object.keys(PETS) as PetType[]).filter(
    petId =>
      PETS[petId].unlockLevel <= currentLevel &&
      !alreadyUnlockedPets.includes(petId)
  );
}

/**
 * Get the next pet to unlock based on current level
 */
export function getNextPetToUnlock(currentLevel: number): Pet | null {
  const nextPet = getAllPets().find(pet => pet.unlockLevel > currentLevel);
  return nextPet || null;
}

/**
 * Calculate levels until next pet unlock
 */
export function getLevelsUntilNextPet(currentLevel: number): number | null {
  const nextPet = getNextPetToUnlock(currentLevel);
  if (!nextPet) return null;
  return nextPet.unlockLevel - currentLevel;
}
