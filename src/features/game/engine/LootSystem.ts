import type { SM2Response, LocationType, RarityTier, LootResult } from '../../../types';
import {
  LOOT_TABLES,
  RESPONSE_RARITY_TABLES,
  RESOURCES,
} from '../data/resources';

/**
 * Loot System Engine
 *
 * Calculates loot drops based on flashcard response quality.
 * Better responses = better loot chances
 */

/**
 * Calculate loot for a flashcard response at a given location
 */
export function calculateLoot(
  response: SM2Response,
  location: LocationType
): LootResult {
  // Step 1: Determine rarity tier based on response
  const rarityTier = rollRarityTier(response);

  if (rarityTier === null) {
    // No loot this time
    return {
      resourceId: null,
      quantity: 0,
      rarity: null,
    };
  }

  // Step 2: Roll for specific item within the rarity tier
  const resourceId = rollResourceFromTier(location, rarityTier);

  if (!resourceId) {
    return {
      resourceId: null,
      quantity: 0,
      rarity: null,
    };
  }

  // Step 3: Calculate quantity
  const quantity = calculateQuantity(rarityTier, response);

  return {
    resourceId,
    quantity,
    rarity: rarityTier,
  };
}

/**
 * Roll for rarity tier based on response quality
 */
function rollRarityTier(response: SM2Response): RarityTier | null {
  const probabilities = RESPONSE_RARITY_TABLES[response];
  const roll = Math.random() * 100;

  let cumulative = 0;

  // Check legendary first
  cumulative += probabilities.legendary;
  if (roll < cumulative) return 'legendary';

  // Very rare
  cumulative += probabilities.veryRare;
  if (roll < cumulative) return 'veryRare';

  // Rare
  cumulative += probabilities.rare;
  if (roll < cumulative) return 'rare';

  // Common
  cumulative += probabilities.common;
  if (roll < cumulative) return 'common';

  // Nothing
  return null;
}

/**
 * Roll for a specific resource from a rarity tier at a location
 */
function rollResourceFromTier(
  location: LocationType,
  rarity: RarityTier
): string | null {
  const lootTable = LOOT_TABLES[location];
  const entries = lootTable[rarity];

  if (!entries || entries.length === 0) {
    return null;
  }

  // Calculate total weight
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);

  // Roll within total weight
  const roll = Math.random() * totalWeight;

  let cumulative = 0;
  for (const entry of entries) {
    cumulative += entry.weight;
    if (roll < cumulative) {
      return entry.resourceId;
    }
  }

  // Fallback to first entry
  return entries[0].resourceId;
}

/**
 * Calculate quantity based on rarity and response
 */
function calculateQuantity(rarity: RarityTier, response: SM2Response): number {
  const baseQuantity: Record<RarityTier, { min: number; max: number }> = {
    common: { min: 1, max: 3 },
    rare: { min: 1, max: 2 },
    veryRare: { min: 1, max: 1 },
    legendary: { min: 1, max: 1 },
  };

  const range = baseQuantity[rarity];

  // Bonus for good responses
  const bonus = response === 'easy' ? 1 : response === 'good' ? 0.5 : 0;

  const quantity = Math.floor(
    Math.random() * (range.max - range.min + 1) + range.min + bonus
  );

  return Math.max(1, quantity);
}

/**
 * Get available locations based on player level
 */
export function getUnlockedLocations(level: number): LocationType[] {
  const locations: LocationType[] = [];

  if (level >= 1) locations.push('tree');
  if (level >= 2) locations.push('bush');
  if (level >= 3) locations.push('beach');
  if (level >= 4) locations.push('sea');

  return locations;
}

/**
 * Pick a random unlocked location
 */
export function pickRandomLocation(level: number): LocationType {
  const unlocked = getUnlockedLocations(level);
  return unlocked[Math.floor(Math.random() * unlocked.length)];
}

/**
 * Get the rarity color class for a given tier
 */
export function getRarityColor(rarity: RarityTier): string {
  switch (rarity) {
    case 'common':
      return 'text-gray-400';
    case 'rare':
      return 'text-blue-400';
    case 'veryRare':
      return 'text-purple-400';
    case 'legendary':
      return 'text-amber-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get the rarity glow class for animations
 */
export function getRarityGlow(rarity: RarityTier): string {
  switch (rarity) {
    case 'common':
      return 'shadow-gray-400/50';
    case 'rare':
      return 'shadow-blue-400/50';
    case 'veryRare':
      return 'shadow-purple-400/50';
    case 'legendary':
      return 'shadow-amber-400/50 animate-pulse';
    default:
      return '';
  }
}

/**
 * Get display info for a loot result
 */
export function getLootDisplayInfo(result: LootResult): {
  name: string;
  emoji: string;
  rarity: string;
  colorClass: string;
} | null {
  if (!result.resourceId || !result.rarity) {
    return null;
  }

  const resource = RESOURCES[result.resourceId];
  if (!resource) {
    return null;
  }

  return {
    name: resource.name,
    emoji: resource.emoji,
    rarity: result.rarity,
    colorClass: getRarityColor(result.rarity),
  };
}
