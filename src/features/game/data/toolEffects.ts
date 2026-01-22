import type {
  ToolType,
  ToolEffect,
  LocationType,
  ResourceCategory,
  RarityTier,
} from '../../../types';

/**
 * Tool effect definitions
 * Tools are crafted items that provide passive bonuses to loot gathering
 */
export const TOOL_EFFECTS: Record<ToolType, ToolEffect> = {
  stoneAxe: {
    toolId: 'stoneAxe',
    effectType: 'quantity_bonus',
    value: 50, // +50% quantity
    affectedLocations: ['tree'],
    affectedCategories: ['wood'],
  },
  fishingRod: {
    toolId: 'fishingRod',
    effectType: 'rarity_upgrade',
    value: 30, // +30% chance to upgrade rarity
    affectedLocations: ['sea'],
    affectedCategories: ['food'],
  },
  basket: {
    toolId: 'basket',
    effectType: 'quantity_bonus',
    value: 1, // +1 flat bonus (not percentage, special case)
    // Applies to all locations and categories
  },
};

/**
 * Tool display information for UI
 */
export const TOOL_INFO: Record<ToolType, { name: string; emoji: string; description: string }> = {
  stoneAxe: {
    name: 'Stone Axe',
    emoji: '🪓',
    description: '+50% wood from trees',
  },
  fishingRod: {
    name: 'Fishing Rod',
    emoji: '🎣',
    description: '+30% chance for better fish',
  },
  basket: {
    name: 'Basket',
    emoji: '🧺',
    description: '+1 item per gather',
  },
};

/**
 * Rarity upgrade order
 */
const RARITY_ORDER: RarityTier[] = ['common', 'rare', 'veryRare', 'legendary'];

/**
 * Upgrade rarity to next tier
 */
function upgradeRarity(rarity: RarityTier): RarityTier {
  const currentIndex = RARITY_ORDER.indexOf(rarity);
  if (currentIndex < RARITY_ORDER.length - 1) {
    return RARITY_ORDER[currentIndex + 1];
  }
  return rarity;
}

/**
 * Check if a tool effect applies to the given context
 */
function effectApplies(
  effect: ToolEffect,
  location: LocationType,
  category: ResourceCategory
): boolean {
  // Check location restriction
  if (effect.affectedLocations && !effect.affectedLocations.includes(location)) {
    return false;
  }

  // Check category restriction
  if (effect.affectedCategories && !effect.affectedCategories.includes(category)) {
    return false;
  }

  return true;
}

export interface ToolBonusResult {
  finalQuantity: number;
  finalRarity: RarityTier;
  appliedBonuses: string[];
  wasRarityUpgraded: boolean;
}

/**
 * Calculate tool bonuses for a loot drop
 * @param craftedTools - Array of tools the player has crafted
 * @param location - The location where loot was gathered
 * @param resourceCategory - The category of the resource
 * @param baseQuantity - The original quantity before bonuses
 * @param baseRarity - The original rarity before bonuses
 * @returns Object containing final values and applied bonus descriptions
 */
export function calculateToolBonuses(
  craftedTools: ToolType[],
  location: LocationType,
  resourceCategory: ResourceCategory,
  baseQuantity: number,
  baseRarity: RarityTier
): ToolBonusResult {
  let finalQuantity = baseQuantity;
  let finalRarity = baseRarity;
  const appliedBonuses: string[] = [];
  let wasRarityUpgraded = false;

  for (const toolId of craftedTools) {
    const effect = TOOL_EFFECTS[toolId];
    if (!effect) continue;

    // Check if effect applies to this context
    if (!effectApplies(effect, location, resourceCategory)) {
      continue;
    }

    // Apply effect based on type
    switch (effect.effectType) {
      case 'quantity_bonus':
        if (toolId === 'basket') {
          // Basket gives flat +1 bonus
          finalQuantity += effect.value;
          appliedBonuses.push(`${TOOL_INFO[toolId].emoji} Basket: +${effect.value}`);
        } else {
          // Other tools give percentage bonus
          const bonus = Math.max(1, Math.floor(baseQuantity * (effect.value / 100)));
          finalQuantity += bonus;
          appliedBonuses.push(`${TOOL_INFO[toolId].emoji} ${TOOL_INFO[toolId].name}: +${effect.value}%`);
        }
        break;

      case 'rarity_upgrade':
        // Roll for rarity upgrade
        if (Math.random() * 100 < effect.value) {
          const upgradedRarity = upgradeRarity(baseRarity);
          if (upgradedRarity !== baseRarity) {
            finalRarity = upgradedRarity;
            wasRarityUpgraded = true;
            appliedBonuses.push(`${TOOL_INFO[toolId].emoji} ${TOOL_INFO[toolId].name}: Rarity upgraded!`);
          }
        }
        break;

      case 'category_bonus':
        // Future: category-specific bonuses
        break;
    }
  }

  return {
    finalQuantity,
    finalRarity,
    appliedBonuses,
    wasRarityUpgraded,
  };
}

/**
 * Get active tool bonuses description for a location
 * Used for UI display
 */
export function getActiveToolBonusesForLocation(
  craftedTools: ToolType[],
  location: LocationType
): string[] {
  const bonuses: string[] = [];

  for (const toolId of craftedTools) {
    const effect = TOOL_EFFECTS[toolId];
    const info = TOOL_INFO[toolId];
    if (!effect) continue;

    // Basket applies everywhere
    if (toolId === 'basket') {
      bonuses.push(`${info.emoji} ${info.description}`);
      continue;
    }

    // Check if tool applies to this location
    if (effect.affectedLocations && effect.affectedLocations.includes(location)) {
      bonuses.push(`${info.emoji} ${info.description}`);
    }
  }

  return bonuses;
}
