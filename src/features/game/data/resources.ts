import type { Resource, LocationType, CraftingRecipe } from '../../../types';

// ============ RESOURCES ============

export const RESOURCES: Record<string, Resource> = {
  // Wood category
  stick: {
    id: 'stick',
    name: 'Stick',
    emoji: '🪵',
    category: 'wood',
    rarity: 'common',
    maxStack: 99,
  },
  woodLog: {
    id: 'woodLog',
    name: 'Wood Log',
    emoji: '🪓',
    category: 'wood',
    rarity: 'common',
    maxStack: 50,
  },
  driftwood: {
    id: 'driftwood',
    name: 'Driftwood',
    emoji: '🌊',
    category: 'wood',
    rarity: 'common',
    maxStack: 50,
  },
  twigs: {
    id: 'twigs',
    name: 'Twigs',
    emoji: '🌿',
    category: 'wood',
    rarity: 'common',
    maxStack: 99,
  },

  // Food category
  coconut: {
    id: 'coconut',
    name: 'Coconut',
    emoji: '🥥',
    category: 'food',
    rarity: 'common',
    maxStack: 30,
  },
  berries: {
    id: 'berries',
    name: 'Berries',
    emoji: '🫐',
    category: 'food',
    rarity: 'common',
    maxStack: 50,
  },
  smallFish: {
    id: 'smallFish',
    name: 'Small Fish',
    emoji: '🐟',
    category: 'food',
    rarity: 'common',
    maxStack: 30,
  },
  mediumFish: {
    id: 'mediumFish',
    name: 'Medium Fish',
    emoji: '🐠',
    category: 'food',
    rarity: 'common',
    maxStack: 20,
  },
  largeFish: {
    id: 'largeFish',
    name: 'Large Fish',
    emoji: '🦈',
    category: 'food',
    rarity: 'rare',
    maxStack: 10,
  },
  crab: {
    id: 'crab',
    name: 'Crab',
    emoji: '🦀',
    category: 'food',
    rarity: 'rare',
    maxStack: 15,
  },
  honey: {
    id: 'honey',
    name: 'Honey',
    emoji: '🍯',
    category: 'food',
    rarity: 'rare',
    maxStack: 20,
  },
  birdEgg: {
    id: 'birdEgg',
    name: 'Bird Egg',
    emoji: '🥚',
    category: 'food',
    rarity: 'veryRare',
    maxStack: 10,
  },
  rabbit: {
    id: 'rabbit',
    name: 'Rabbit',
    emoji: '🐰',
    category: 'food',
    rarity: 'veryRare',
    maxStack: 5,
  },

  // Material category
  flint: {
    id: 'flint',
    name: 'Flint',
    emoji: '🪨',
    category: 'material',
    rarity: 'rare',
    maxStack: 30,
  },
  shell: {
    id: 'shell',
    name: 'Shell',
    emoji: '🐚',
    category: 'material',
    rarity: 'common',
    maxStack: 50,
  },
  birdFeather: {
    id: 'birdFeather',
    name: 'Bird Feather',
    emoji: '🪶',
    category: 'material',
    rarity: 'rare',
    maxStack: 30,
  },
  leaves: {
    id: 'leaves',
    name: 'Leaves',
    emoji: '🍃',
    category: 'material',
    rarity: 'common',
    maxStack: 99,
  },
  glassBottle: {
    id: 'glassBottle',
    name: 'Glass Bottle',
    emoji: '🍾',
    category: 'material',
    rarity: 'rare',
    maxStack: 15,
  },
  kelp: {
    id: 'kelp',
    name: 'Kelp',
    emoji: '🌱',
    category: 'material',
    rarity: 'common',
    maxStack: 40,
  },
  medicinalHerb: {
    id: 'medicinalHerb',
    name: 'Medicinal Herb',
    emoji: '🌿',
    category: 'material',
    rarity: 'rare',
    maxStack: 25,
  },

  // Treasure category
  pearl: {
    id: 'pearl',
    name: 'Pearl',
    emoji: '🔮',
    category: 'treasure',
    rarity: 'veryRare',
    maxStack: 50,
  },
  ancientCoin: {
    id: 'ancientCoin',
    name: 'Ancient Coin',
    emoji: '🪙',
    category: 'treasure',
    rarity: 'legendary',
    maxStack: 99,
  },
  treasureMap: {
    id: 'treasureMap',
    name: 'Treasure Map',
    emoji: '🗺️',
    category: 'treasure',
    rarity: 'legendary',
    maxStack: 5,
  },
  messageInBottle: {
    id: 'messageInBottle',
    name: 'Message in Bottle',
    emoji: '📜',
    category: 'treasure',
    rarity: 'veryRare',
    maxStack: 10,
  },

  // Special/Legendary
  goldenFruit: {
    id: 'goldenFruit',
    name: 'Golden Fruit',
    emoji: '🍊',
    category: 'special',
    rarity: 'legendary',
    maxStack: 10,
  },
  goldenFish: {
    id: 'goldenFish',
    name: 'Golden Fish',
    emoji: '✨',
    category: 'special',
    rarity: 'legendary',
    maxStack: 5,
  },
  oyster: {
    id: 'oyster',
    name: 'Oyster',
    emoji: '🦪',
    category: 'food',
    rarity: 'rare',
    maxStack: 15,
  },

  // Crafted materials (for raft)
  rope: {
    id: 'rope',
    name: 'Rope',
    emoji: '🪢',
    category: 'material',
    rarity: 'common',
    maxStack: 30,
  },
  sailCloth: {
    id: 'sailCloth',
    name: 'Sail Cloth',
    emoji: '⛵',
    category: 'material',
    rarity: 'rare',
    maxStack: 5,
  },
  sturdyHull: {
    id: 'sturdyHull',
    name: 'Sturdy Hull',
    emoji: '🚣',
    category: 'material',
    rarity: 'veryRare',
    maxStack: 1,
  },
  navigationTools: {
    id: 'navigationTools',
    name: 'Navigation Tools',
    emoji: '🧭',
    category: 'material',
    rarity: 'veryRare',
    maxStack: 1,
  },
  raft: {
    id: 'raft',
    name: 'Raft',
    emoji: '🛶',
    category: 'special',
    rarity: 'legendary',
    maxStack: 1,
  },
};

// ============ LOOT TABLES ============

interface LootEntry {
  resourceId: string;
  weight: number; // Relative weight within rarity tier
}

interface LocationLootTable {
  common: LootEntry[];
  rare: LootEntry[];
  veryRare: LootEntry[];
  legendary: LootEntry[];
}

export const LOOT_TABLES: Record<LocationType, LocationLootTable> = {
  tree: {
    common: [
      { resourceId: 'stick', weight: 40 },
      { resourceId: 'woodLog', weight: 30 },
      { resourceId: 'coconut', weight: 20 },
      { resourceId: 'leaves', weight: 10 },
    ],
    rare: [
      { resourceId: 'birdFeather', weight: 50 },
      { resourceId: 'honey', weight: 50 },
    ],
    veryRare: [{ resourceId: 'birdEgg', weight: 100 }],
    legendary: [{ resourceId: 'goldenFruit', weight: 100 }],
  },
  bush: {
    common: [
      { resourceId: 'berries', weight: 45 },
      { resourceId: 'twigs', weight: 30 },
      { resourceId: 'leaves', weight: 25 },
    ],
    rare: [
      { resourceId: 'flint', weight: 60 },
      { resourceId: 'medicinalHerb', weight: 40 },
    ],
    veryRare: [{ resourceId: 'rabbit', weight: 100 }],
    legendary: [{ resourceId: 'ancientCoin', weight: 100 }],
  },
  beach: {
    common: [
      { resourceId: 'shell', weight: 40 },
      { resourceId: 'driftwood', weight: 35 },
      { resourceId: 'kelp', weight: 25 },
    ],
    rare: [
      { resourceId: 'crab', weight: 55 },
      { resourceId: 'glassBottle', weight: 45 },
    ],
    veryRare: [{ resourceId: 'messageInBottle', weight: 100 }],
    legendary: [{ resourceId: 'treasureMap', weight: 100 }],
  },
  sea: {
    common: [
      { resourceId: 'smallFish', weight: 45 },
      { resourceId: 'mediumFish', weight: 35 },
      { resourceId: 'kelp', weight: 20 },
    ],
    rare: [
      { resourceId: 'largeFish', weight: 50 },
      { resourceId: 'oyster', weight: 50 },
    ],
    veryRare: [{ resourceId: 'pearl', weight: 100 }],
    legendary: [{ resourceId: 'goldenFish', weight: 100 }],
  },
};

// ============ RARITY PROBABILITIES BY RESPONSE ============

export interface RarityProbabilities {
  common: number;
  rare: number;
  veryRare: number;
  legendary: number;
  nothing: number;
}

export const RESPONSE_RARITY_TABLES: Record<string, RarityProbabilities> = {
  again: { common: 50, rare: 5, veryRare: 0.5, legendary: 0, nothing: 44.5 },
  hard: { common: 60, rare: 12, veryRare: 2, legendary: 0.1, nothing: 25.9 },
  good: { common: 70, rare: 18, veryRare: 5, legendary: 0.5, nothing: 6.5 },
  easy: { common: 75, rare: 20, veryRare: 8, legendary: 2, nothing: 0 },
};

// ============ CRAFTING RECIPES ============

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // Basic Tools
  {
    id: 'stoneAxe',
    name: 'Stone Axe',
    emoji: '🪓',
    ingredients: [
      { resourceId: 'stick', quantity: 2 },
      { resourceId: 'flint', quantity: 1 },
    ],
    result: { resourceId: 'stoneAxe', quantity: 1 },
    requiredLevel: 1,
    description: 'A basic axe for gathering wood',
    effect: '+50% wood from trees',
  },
  {
    id: 'fishingRod',
    name: 'Fishing Rod',
    emoji: '🎣',
    ingredients: [
      { resourceId: 'stick', quantity: 3 },
      { resourceId: 'twigs', quantity: 2 },
    ],
    result: { resourceId: 'fishingRod', quantity: 1 },
    requiredLevel: 1,
    description: 'A simple rod for catching fish',
    effect: '+30% fish quality',
  },
  {
    id: 'basket',
    name: 'Basket',
    emoji: '🧺',
    ingredients: [
      { resourceId: 'leaves', quantity: 10 },
      { resourceId: 'twigs', quantity: 5 },
    ],
    result: { resourceId: 'basket', quantity: 1 },
    requiredLevel: 1,
    description: 'Carry more items',
    effect: '+1 item per gather',
  },

  // Raft Components
  {
    id: 'rope',
    name: 'Rope',
    emoji: '🪢',
    ingredients: [
      { resourceId: 'twigs', quantity: 10 },
      { resourceId: 'leaves', quantity: 5 },
    ],
    result: { resourceId: 'rope', quantity: 1 },
    requiredLevel: 1,
    description: 'Strong rope woven from plant fibers',
    isRaftComponent: true,
  },
  {
    id: 'sailCloth',
    name: 'Sail Cloth',
    emoji: '⛵',
    ingredients: [
      { resourceId: 'leaves', quantity: 15 },
      { resourceId: 'birdFeather', quantity: 5 },
      { resourceId: 'rope', quantity: 2 },
    ],
    result: { resourceId: 'sailCloth', quantity: 1 },
    requiredLevel: 5,
    description: 'A sturdy cloth to catch the wind',
    isRaftComponent: true,
  },
  {
    id: 'sturdyHull',
    name: 'Sturdy Hull',
    emoji: '🚣',
    ingredients: [
      { resourceId: 'woodLog', quantity: 30 },
      { resourceId: 'driftwood', quantity: 10 },
      { resourceId: 'rope', quantity: 5 },
    ],
    result: { resourceId: 'sturdyHull', quantity: 1 },
    requiredLevel: 8,
    description: 'The main body of your escape vessel',
    isRaftComponent: true,
  },
  {
    id: 'navigationTools',
    name: 'Navigation Tools',
    emoji: '🧭',
    ingredients: [
      { resourceId: 'glassBottle', quantity: 3 },
      { resourceId: 'treasureMap', quantity: 1 },
      { resourceId: 'pearl', quantity: 2 },
    ],
    result: { resourceId: 'navigationTools', quantity: 1 },
    requiredLevel: 10,
    description: 'Tools to navigate the open sea',
    isRaftComponent: true,
  },
  {
    id: 'raft',
    name: 'Raft',
    emoji: '🛶',
    ingredients: [
      { resourceId: 'sturdyHull', quantity: 1 },
      { resourceId: 'sailCloth', quantity: 1 },
      { resourceId: 'navigationTools', quantity: 1 },
      { resourceId: 'rope', quantity: 5 },
    ],
    result: { resourceId: 'raft', quantity: 1 },
    requiredLevel: 12,
    description: 'Your ticket off this island!',
    isRaftComponent: true,
  },
];

// ============ LOCATION UNLOCKS BY LEVEL ============

export const LOCATION_UNLOCKS: Record<LocationType, number> = {
  tree: 1,
  bush: 2,
  beach: 3,
  sea: 4,
};

// ============ HELPER FUNCTIONS ============

export function getResource(id: string): Resource | undefined {
  return RESOURCES[id];
}

export function getRecipeById(id: string): CraftingRecipe | undefined {
  return CRAFTING_RECIPES.find((r) => r.id === id);
}

export function getRaftRecipes(): CraftingRecipe[] {
  return CRAFTING_RECIPES.filter((r) => r.isRaftComponent);
}

export function getAvailableRecipes(level: number): CraftingRecipe[] {
  return CRAFTING_RECIPES.filter((r) => r.requiredLevel <= level);
}
