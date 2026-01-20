import { create } from 'zustand';
import { db } from '../services/storage/db';
import { calculateLoot, pickRandomLocation } from '../features/game/engine/LootSystem';
import { RESOURCES, CRAFTING_RECIPES, LOCATION_UNLOCKS } from '../features/game/data/resources';
import { useUserStore } from './userStore';
import type {
  GameState,
  InventoryItem,
  SM2Response,
  GameAction,
  LocationType,
  PendingAction,
  CraftingRecipe,
} from '../types';

interface GameStore extends GameState {
  isLoading: boolean;

  // Actions
  loadGameState: () => Promise<void>;
  performAction: (response: SM2Response) => Promise<GameAction>;
  addToInventory: (resourceId: string, quantity: number) => Promise<void>;
  removeFromInventory: (resourceId: string, quantity: number) => Promise<boolean>;
  craftItem: (recipeId: string) => Promise<boolean>;
  setCurrentAction: (action: PendingAction | null) => void;
  saveState: () => Promise<void>;

  // Getters
  getInventoryCount: (resourceId: string) => number;
  canCraft: (recipe: CraftingRecipe) => boolean;
  getUnlockedLocations: () => LocationType[];
  getRaftProgressPercentage: () => number;
  hasCompletedGame: () => boolean;
}

export const useGameStore = create<GameStore>((set, get) => ({
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
  isLoading: true,

  loadGameState: async () => {
    set({ isLoading: true });
    const state = await db.gameState.get('default');
    if (state) {
      set({
        inventory: state.inventory,
        craftedItems: state.craftedItems,
        unlockedLocations: state.unlockedLocations,
        unlockedPets: state.unlockedPets,
        activePet: state.activePet,
        raftProgress: state.raftProgress,
        currentAction: null,
        isLoading: false,
      });
    } else {
      set({ isLoading: false });
    }
  },

  performAction: async (response: SM2Response): Promise<GameAction> => {
    const userStore = useUserStore.getState();
    const level = userStore.progress?.level || 1;

    // Pick a random location from unlocked ones
    const location = pickRandomLocation(level);

    // Set walking animation
    set({
      currentAction: {
        location,
        animationState: 'walking',
        result: null,
      },
    });

    // Simulate walking time
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Set searching animation
    set({
      currentAction: {
        location,
        animationState: 'searching',
        result: null,
      },
    });

    // Simulate searching time
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Calculate loot
    const lootResult = calculateLoot(response, location);

    // Set result animation
    set({
      currentAction: {
        location,
        animationState: lootResult.resourceId ? 'found' : 'failed',
        result: lootResult,
      },
    });

    // Add loot to inventory if found
    if (lootResult.resourceId && lootResult.quantity > 0) {
      await get().addToInventory(lootResult.resourceId, lootResult.quantity);
    }

    // Update unlocked locations based on level
    const unlockedLocations = get().getUnlockedLocations();
    if (unlockedLocations.length !== get().unlockedLocations.length) {
      set({ unlockedLocations });
      await get().saveState();
    }

    const gameAction: GameAction = {
      location,
      response,
      lootResult,
      timestamp: new Date(),
    };

    // Clear action after delay
    setTimeout(() => {
      set({ currentAction: null });
    }, 1500);

    return gameAction;
  },

  addToInventory: async (resourceId: string, quantity: number) => {
    const { inventory } = get();
    const resource = RESOURCES[resourceId];
    if (!resource) return;

    const existingIndex = inventory.findIndex((item) => item.resourceId === resourceId);

    let newInventory: InventoryItem[];
    if (existingIndex >= 0) {
      newInventory = [...inventory];
      newInventory[existingIndex] = {
        ...newInventory[existingIndex],
        quantity: Math.min(
          newInventory[existingIndex].quantity + quantity,
          resource.maxStack
        ),
      };
    } else {
      newInventory = [...inventory, { resourceId, quantity: Math.min(quantity, resource.maxStack) }];
    }

    set({ inventory: newInventory });
    await get().saveState();
  },

  removeFromInventory: async (resourceId: string, quantity: number): Promise<boolean> => {
    const { inventory } = get();
    const existingIndex = inventory.findIndex((item) => item.resourceId === resourceId);

    if (existingIndex < 0 || inventory[existingIndex].quantity < quantity) {
      return false;
    }

    let newInventory: InventoryItem[];
    if (inventory[existingIndex].quantity === quantity) {
      newInventory = inventory.filter((_, i) => i !== existingIndex);
    } else {
      newInventory = [...inventory];
      newInventory[existingIndex] = {
        ...newInventory[existingIndex],
        quantity: newInventory[existingIndex].quantity - quantity,
      };
    }

    set({ inventory: newInventory });
    await get().saveState();
    return true;
  },

  craftItem: async (recipeId: string): Promise<boolean> => {
    const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;

    const userStore = useUserStore.getState();
    const level = userStore.progress?.level || 1;

    // Check level requirement
    if (level < recipe.requiredLevel) return false;

    // Check if we have all ingredients
    if (!get().canCraft(recipe)) return false;

    // Remove ingredients
    for (const ingredient of recipe.ingredients) {
      const success = await get().removeFromInventory(
        ingredient.resourceId,
        ingredient.quantity
      );
      if (!success) return false;
    }

    // Add result to inventory
    await get().addToInventory(recipe.result.resourceId, recipe.result.quantity);

    // Track crafted items
    const { craftedItems, raftProgress } = get();
    if (!craftedItems.includes(recipeId)) {
      set({ craftedItems: [...craftedItems, recipeId] });
    }

    // Update raft progress if this is a raft component
    if (recipe.isRaftComponent) {
      const newRaftProgress = { ...raftProgress };
      switch (recipeId) {
        case 'rope':
          newRaftProgress.rope = true;
          break;
        case 'sailCloth':
          newRaftProgress.sailCloth = true;
          break;
        case 'sturdyHull':
          newRaftProgress.sturdyHull = true;
          break;
        case 'navigationTools':
          newRaftProgress.navigationTools = true;
          break;
        case 'raft':
          newRaftProgress.raft = true;
          break;
      }
      set({ raftProgress: newRaftProgress });
    }

    // Award XP for crafting
    await userStore.addXP({
      type: 'crafting',
      amount: 15,
      description: `Crafted ${recipe.name}`,
      timestamp: new Date(),
    });

    await get().saveState();
    return true;
  },

  setCurrentAction: (action: PendingAction | null) => {
    set({ currentAction: action });
  },

  getInventoryCount: (resourceId: string): number => {
    const { inventory } = get();
    const item = inventory.find((i) => i.resourceId === resourceId);
    return item?.quantity || 0;
  },

  canCraft: (recipe: CraftingRecipe): boolean => {
    const userStore = useUserStore.getState();
    const level = userStore.progress?.level || 1;

    if (level < recipe.requiredLevel) return false;

    for (const ingredient of recipe.ingredients) {
      if (get().getInventoryCount(ingredient.resourceId) < ingredient.quantity) {
        return false;
      }
    }
    return true;
  },

  getUnlockedLocations: (): LocationType[] => {
    const userStore = useUserStore.getState();
    const level = userStore.progress?.level || 1;

    const locations: LocationType[] = [];
    for (const [loc, reqLevel] of Object.entries(LOCATION_UNLOCKS)) {
      if (level >= reqLevel) {
        locations.push(loc as LocationType);
      }
    }
    return locations;
  },

  getRaftProgressPercentage: (): number => {
    const { raftProgress } = get();
    const components = [
      raftProgress.rope,
      raftProgress.sailCloth,
      raftProgress.sturdyHull,
      raftProgress.navigationTools,
      raftProgress.raft,
    ];
    const completed = components.filter(Boolean).length;
    return (completed / components.length) * 100;
  },

  hasCompletedGame: (): boolean => {
    return get().raftProgress.raft;
  },

  // Internal: Save state to IndexedDB
  saveState: async () => {
    const { inventory, craftedItems, unlockedLocations, unlockedPets, activePet, raftProgress } = get();
    await db.gameState.put({
      id: 'default',
      inventory,
      craftedItems,
      unlockedLocations,
      unlockedPets,
      activePet,
      raftProgress,
      currentAction: null,
    });
  },
}));
