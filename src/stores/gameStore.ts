import { create } from 'zustand';
import { db } from '../services/storage/db';
import { calculateLoot, pickRandomLocation } from '../features/game/engine/LootSystem';
import { RESOURCES, CRAFTING_RECIPES, LOCATION_UNLOCKS } from '../features/game/data/resources';
import { PETS, getNewlyUnlockedPets } from '../features/game/data/pets';
import { calculateToolBonuses } from '../features/game/data/toolEffects';
import { useUserStore } from './userStore';
import type {
  GameState,
  InventoryItem,
  SM2Response,
  GameAction,
  LocationType,
  PendingAction,
  CraftingRecipe,
  PetType,
  PetState,
  Pet,
  ToolType,
  LootResult,
} from '../types';
import { LOCATION_POSITIONS, IDLE_POSITION } from '../types';

// Extended loot result with bonus info
interface EnhancedLootResult extends LootResult {
  appliedBonuses?: string[];
  wasRarityUpgraded?: boolean;
}

interface GameStore extends GameState {
  isLoading: boolean;

  // Actions
  loadGameState: () => Promise<void>;
  performAction: (response: SM2Response) => Promise<GameAction>;
  addToInventory: (resourceId: string, quantity: number) => Promise<void>;
  removeFromInventory: (resourceId: string, quantity: number) => Promise<boolean>;
  craftItem: (recipeId: string) => Promise<{ success: boolean; savedMaterials?: boolean }>;
  setCurrentAction: (action: PendingAction | null) => void;
  saveState: () => Promise<void>;

  // Pet actions
  unlockPet: (petId: PetType) => Promise<void>;
  setActivePet: (petId: PetType | null) => Promise<void>;
  processCrabAutoGather: () => Promise<boolean>;
  checkPetUnlocks: (level: number) => Promise<PetType[]>;
  clearAutoGatherQueue: () => void;

  // Getters
  getInventoryCount: (resourceId: string) => number;
  canCraft: (recipe: CraftingRecipe) => boolean;
  getUnlockedLocations: () => LocationType[];
  getRaftProgressPercentage: () => number;
  hasCompletedGame: () => boolean;
  hasTool: (toolId: ToolType) => boolean;
  getCraftedTools: () => ToolType[];
  getActivePet: () => Pet | null;
  getUnlockedPetsList: () => Pet[];
}

export const useGameStore = create<GameStore>((set, get) => ({
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
  isLoading: true,

  loadGameState: async () => {
    set({ isLoading: true });
    const state = await db.gameState.get('default');
    if (state) {
      set({
        inventory: state.inventory,
        craftedItems: state.craftedItems,
        craftedTools: state.craftedTools || [],
        unlockedLocations: state.unlockedLocations,
        unlockedPets: state.unlockedPets as PetType[],
        activePet: state.activePet as PetType | null,
        petStates: state.petStates || {},
        raftProgress: state.raftProgress,
        autoGatherQueue: state.autoGatherQueue || [],
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
    const { craftedTools, activePet } = get();

    // Pick a random location from unlocked ones
    const location = pickRandomLocation(level);

    // Set walking animation with position
    set({
      currentAction: {
        location,
        animationState: 'walking',
        result: null,
        characterPosition: LOCATION_POSITIONS[location],
        petAnimation: activePet ? { petId: activePet, state: 'following' } : undefined,
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
        characterPosition: LOCATION_POSITIONS[location],
        petAnimation: activePet ? { petId: activePet, state: 'helping' } : undefined,
      },
    });

    // Simulate searching time
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Calculate base loot
    let lootResult: EnhancedLootResult = calculateLoot(response, location);

    // Apply parrot bonus (rare drop bonus) BEFORE calculating loot
    // This is already factored into calculateLoot via the response probabilities
    // But parrot adds an extra 5% chance for rare/veryRare/legendary
    if (activePet === 'parrot' && lootResult.resourceId && lootResult.rarity === 'common') {
      // Roll for parrot bonus to upgrade to rare
      if (Math.random() < 0.05) {
        lootResult = { ...lootResult, rarity: 'rare' };
      }
    }

    // Apply dolphin bonus (2x fish from sea)
    if (activePet === 'dolphin' && location === 'sea' && lootResult.resourceId) {
      const resource = RESOURCES[lootResult.resourceId];
      if (resource && resource.category === 'food') {
        lootResult = {
          ...lootResult,
          quantity: lootResult.quantity * 2,
          appliedBonuses: [...(lootResult.appliedBonuses || []), '🐬 Dolphin: 2x fish!'],
        };
      }
    }

    // Apply tool bonuses
    if (lootResult.resourceId && lootResult.rarity) {
      const resource = RESOURCES[lootResult.resourceId];
      if (resource) {
        const toolBonus = calculateToolBonuses(
          craftedTools,
          location,
          resource.category,
          lootResult.quantity,
          lootResult.rarity
        );

        lootResult = {
          ...lootResult,
          quantity: toolBonus.finalQuantity,
          rarity: toolBonus.finalRarity,
          appliedBonuses: [
            ...(lootResult.appliedBonuses || []),
            ...toolBonus.appliedBonuses,
          ],
          wasRarityUpgraded: toolBonus.wasRarityUpgraded,
        };
      }
    }

    // Process crab auto-gather
    if (activePet === 'crab') {
      await get().processCrabAutoGather();
    }

    // Determine animation state based on result
    const isLegendary = lootResult.rarity === 'legendary';
    const animState = lootResult.resourceId
      ? (isLegendary ? 'celebrating' : 'found')
      : 'failed';

    // Set result animation
    set({
      currentAction: {
        location,
        animationState: animState,
        result: lootResult,
        characterPosition: LOCATION_POSITIONS[location],
        petAnimation: activePet
          ? { petId: activePet, state: animState === 'found' || animState === 'celebrating' ? 'celebrating' : 'idle' }
          : undefined,
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

    // Clear action after delay and return to idle position
    setTimeout(() => {
      set({
        currentAction: {
          location,
          animationState: 'idle',
          result: null,
          characterPosition: IDLE_POSITION,
          petAnimation: activePet ? { petId: activePet, state: 'idle' } : undefined,
        },
      });
    }, 2000);

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

  craftItem: async (recipeId: string): Promise<{ success: boolean; savedMaterials?: boolean }> => {
    const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return { success: false };

    const userStore = useUserStore.getState();
    const level = userStore.progress?.level || 1;

    // Check level requirement
    if (level < recipe.requiredLevel) return { success: false };

    // Check if we have all ingredients
    if (!get().canCraft(recipe)) return { success: false };

    // Check for monkey crafting helper (10% chance to not consume materials)
    const { activePet } = get();
    const monkeySaveRoll = activePet === 'monkey' && Math.random() < 0.10;

    // Remove ingredients (unless monkey saved them)
    if (!monkeySaveRoll) {
      for (const ingredient of recipe.ingredients) {
        const success = await get().removeFromInventory(
          ingredient.resourceId,
          ingredient.quantity
        );
        if (!success) return { success: false };
      }
    }

    // Add result to inventory
    await get().addToInventory(recipe.result.resourceId, recipe.result.quantity);

    // Track crafted items
    const { craftedItems, craftedTools, raftProgress } = get();
    if (!craftedItems.includes(recipeId)) {
      set({ craftedItems: [...craftedItems, recipeId] });
    }

    // Track crafted tools
    const toolIds: ToolType[] = ['stoneAxe', 'fishingRod', 'basket'];
    if (toolIds.includes(recipeId as ToolType) && !craftedTools.includes(recipeId as ToolType)) {
      set({ craftedTools: [...craftedTools, recipeId as ToolType] });
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
    return { success: true, savedMaterials: monkeySaveRoll };
  },

  setCurrentAction: (action: PendingAction | null) => {
    set({ currentAction: action });
  },

  // Pet actions
  unlockPet: async (petId: PetType) => {
    const { unlockedPets, petStates, activePet } = get();
    if (unlockedPets.includes(petId)) return;

    const newPetState: PetState = {
      petId,
      unlockedAt: new Date(),
      autoGatherAccumulated: 0,
    };

    set({
      unlockedPets: [...unlockedPets, petId],
      petStates: { ...petStates, [petId]: newPetState },
      // Auto-equip first pet
      activePet: activePet || petId,
    });

    await get().saveState();
  },

  setActivePet: async (petId: PetType | null) => {
    set({ activePet: petId });
    await get().saveState();
  },

  processCrabAutoGather: async (): Promise<boolean> => {
    const { activePet, petStates } = get();
    if (activePet !== 'crab') return false;

    const crabState = petStates.crab;
    const accumulated = (crabState?.autoGatherAccumulated || 0) + 1;

    if (accumulated >= 5) {
      // Auto-gather a shell
      await get().addToInventory('shell', 1);

      // Add to auto-gather queue for notification
      const { autoGatherQueue } = get();
      set({
        petStates: {
          ...petStates,
          crab: {
            ...crabState,
            petId: 'crab',
            unlockedAt: crabState?.unlockedAt || new Date(),
            autoGatherAccumulated: 0,
            lastAutoGather: new Date(),
          },
        },
        autoGatherQueue: [...autoGatherQueue, { resourceId: 'shell', quantity: 1 }],
      });

      await get().saveState();
      return true;
    } else {
      set({
        petStates: {
          ...petStates,
          crab: {
            ...crabState,
            petId: 'crab',
            unlockedAt: crabState?.unlockedAt || new Date(),
            autoGatherAccumulated: accumulated,
          },
        },
      });
      await get().saveState();
      return false;
    }
  },

  checkPetUnlocks: async (level: number): Promise<PetType[]> => {
    const { unlockedPets } = get();
    const newPets = getNewlyUnlockedPets(level, unlockedPets);

    for (const petId of newPets) {
      await get().unlockPet(petId);
    }

    return newPets;
  },

  clearAutoGatherQueue: () => {
    set({ autoGatherQueue: [] });
  },

  // Getters
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

  hasTool: (toolId: ToolType): boolean => {
    return get().craftedTools.includes(toolId);
  },

  getCraftedTools: (): ToolType[] => {
    return get().craftedTools;
  },

  getActivePet: (): Pet | null => {
    const { activePet } = get();
    if (!activePet) return null;
    return PETS[activePet] || null;
  },

  getUnlockedPetsList: (): Pet[] => {
    const { unlockedPets } = get();
    return unlockedPets.map(petId => PETS[petId]).filter(Boolean);
  },

  // Internal: Save state to IndexedDB
  saveState: async () => {
    const {
      inventory,
      craftedItems,
      craftedTools,
      unlockedLocations,
      unlockedPets,
      activePet,
      petStates,
      raftProgress,
      autoGatherQueue,
    } = get();

    await db.gameState.put({
      id: 'default',
      inventory,
      craftedItems,
      craftedTools,
      unlockedLocations,
      unlockedPets,
      activePet,
      petStates,
      raftProgress,
      currentAction: null,
      autoGatherQueue,
    });
  },
}));
