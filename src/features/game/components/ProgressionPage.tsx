import { useState } from 'react';
import { useGameStore } from '../../../stores/gameStore';
import { useUserStore } from '../../../stores/userStore';
import { RESOURCES, CRAFTING_RECIPES, getRaftRecipes, getAvailableRecipes } from '../data/resources';
import { getRarityColor } from '../engine/LootSystem';
import type { CraftingRecipe } from '../../../types';

export default function ProgressionPage() {
  const { inventory, craftedItems, raftProgress, craftItem, canCraft, getInventoryCount, getRaftProgressPercentage, hasCompletedGame } = useGameStore();
  const progress = useUserStore((state) => state.progress);
  const [activeTab, setActiveTab] = useState<'inventory' | 'crafting' | 'raft'>('inventory');
  const [craftingMessage, setCraftingMessage] = useState<string | null>(null);

  const level = progress?.level || 1;
  const raftRecipes = getRaftRecipes();
  const availableRecipes = getAvailableRecipes(level);
  const raftProgressPercent = getRaftProgressPercentage();

  const handleCraft = async (recipe: CraftingRecipe) => {
    const success = await craftItem(recipe.id);
    if (success) {
      setCraftingMessage(`Crafted ${recipe.name}!`);
      setTimeout(() => setCraftingMessage(null), 2000);
    }
  };

  // Group inventory by category
  const groupedInventory = inventory.reduce((acc, item) => {
    const resource = RESOURCES[item.resourceId];
    if (!resource) return acc;
    const category = resource.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push({ ...item, resource });
    return acc;
  }, {} as Record<string, Array<{ resourceId: string; quantity: number; resource: typeof RESOURCES[string] }>>);

  const categoryLabels: Record<string, { label: string; emoji: string }> = {
    wood: { label: 'Wood', emoji: '🪵' },
    food: { label: 'Food', emoji: '🍖' },
    material: { label: 'Materials', emoji: '🧱' },
    treasure: { label: 'Treasure', emoji: '💎' },
    special: { label: 'Special', emoji: '✨' },
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Game Completion Check */}
        {hasCompletedGame() && (
          <div className="mb-6 p-6 rounded-xl bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/50">
            <div className="text-center">
              <span className="text-6xl mb-4 block">🎉</span>
              <h2 className="text-2xl font-bold text-amber-400 mb-2">
                Congratulations!
              </h2>
              <p className="text-slate-300">
                You've escaped the island! Your Turkish learning journey continues...
              </p>
            </div>
          </div>
        )}

        {/* Raft Progress Banner */}
        <div className="mb-6 p-4 rounded-xl bg-slate-800 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🛶</span>
              <h2 className="font-bold">Escape Progress</h2>
            </div>
            <span className="text-sm text-slate-400">
              {Math.round(raftProgressPercent)}%
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-500"
              style={{ width: `${raftProgressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-3 text-xs">
            <span className={raftProgress.rope ? 'text-emerald-400' : 'text-slate-500'}>
              🪢 Rope
            </span>
            <span className={raftProgress.sailCloth ? 'text-emerald-400' : 'text-slate-500'}>
              ⛵ Sail
            </span>
            <span className={raftProgress.sturdyHull ? 'text-emerald-400' : 'text-slate-500'}>
              🚣 Hull
            </span>
            <span className={raftProgress.navigationTools ? 'text-emerald-400' : 'text-slate-500'}>
              🧭 Nav
            </span>
            <span className={raftProgress.raft ? 'text-amber-400' : 'text-slate-500'}>
              🛶 Raft
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'inventory'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            📦 Inventory
          </button>
          <button
            onClick={() => setActiveTab('crafting')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'crafting'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🔨 Crafting
          </button>
          <button
            onClick={() => setActiveTab('raft')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'raft'
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🛶 Raft Parts
          </button>
        </div>

        {/* Crafting Message */}
        {craftingMessage && (
          <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-center text-emerald-400 animate-pulse">
            {craftingMessage}
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {inventory.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">📦</span>
                <p className="text-slate-400">Your inventory is empty!</p>
                <p className="text-sm text-slate-500 mt-2">
                  Review flashcards to gather resources
                </p>
              </div>
            ) : (
              Object.entries(groupedInventory).map(([category, items]) => (
                <div key={category}>
                  <h3 className="font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <span>{categoryLabels[category]?.emoji}</span>
                    {categoryLabels[category]?.label || category}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {items.map(({ resourceId, quantity, resource }) => (
                      <div
                        key={resourceId}
                        className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700"
                      >
                        <span className="text-2xl">{resource.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${getRarityColor(resource.rarity)}`}>
                            {resource.name}
                          </p>
                          <p className="text-sm text-slate-500">x{quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Crafting Tab */}
        {activeTab === 'crafting' && (
          <div className="space-y-4">
            {availableRecipes
              .filter((r) => !r.isRaftComponent)
              .map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  canCraft={canCraft(recipe)}
                  getInventoryCount={getInventoryCount}
                  onCraft={() => handleCraft(recipe)}
                  level={level}
                />
              ))}

            {/* Locked Recipes */}
            {CRAFTING_RECIPES.filter(
              (r) => !r.isRaftComponent && r.requiredLevel > level
            ).map((recipe) => (
              <div
                key={recipe.id}
                className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl grayscale">{recipe.emoji}</span>
                    <div>
                      <p className="font-medium text-slate-400">{recipe.name}</p>
                      <p className="text-xs text-slate-500">
                        🔒 Unlocks at Level {recipe.requiredLevel}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Raft Tab */}
        {activeTab === 'raft' && (
          <div className="space-y-4">
            <p className="text-slate-400 mb-4">
              Craft these components to build your escape raft!
            </p>

            {raftRecipes.map((recipe) => {
              const isCrafted =
                (recipe.id === 'rope' && raftProgress.rope) ||
                (recipe.id === 'sailCloth' && raftProgress.sailCloth) ||
                (recipe.id === 'sturdyHull' && raftProgress.sturdyHull) ||
                (recipe.id === 'navigationTools' && raftProgress.navigationTools) ||
                (recipe.id === 'raft' && raftProgress.raft);

              return (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  canCraft={canCraft(recipe) && !isCrafted}
                  getInventoryCount={getInventoryCount}
                  onCraft={() => handleCraft(recipe)}
                  level={level}
                  isCrafted={isCrafted}
                  isRaftPart
                />
              );
            })}
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <h3 className="font-bold mb-4">📊 Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">
                {progress?.totalFlashcardsReviewed || 0}
              </p>
              <p className="text-xs text-slate-400">Cards Reviewed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">
                {inventory.reduce((sum, i) => sum + i.quantity, 0)}
              </p>
              <p className="text-xs text-slate-400">Total Resources</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">
                {craftedItems.length}
              </p>
              <p className="text-xs text-slate-400">Items Crafted</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">
                {progress?.currentStreak || 0}
              </p>
              <p className="text-xs text-slate-400">Day Streak</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RecipeCardProps {
  recipe: CraftingRecipe;
  canCraft: boolean;
  getInventoryCount: (id: string) => number;
  onCraft: () => void;
  level: number;
  isCrafted?: boolean;
  isRaftPart?: boolean;
}

function RecipeCard({
  recipe,
  canCraft,
  getInventoryCount,
  onCraft,
  level,
  isCrafted,
  isRaftPart,
}: RecipeCardProps) {
  const isLocked = recipe.requiredLevel > level;

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        isCrafted
          ? 'bg-emerald-500/10 border-emerald-500/50'
          : isLocked
          ? 'bg-slate-800/50 border-slate-700 opacity-50'
          : 'bg-slate-800 border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-3xl ${isCrafted ? '' : isLocked ? 'grayscale' : ''}`}>
            {recipe.emoji}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold">{recipe.name}</p>
              {isCrafted && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                  ✓ Crafted
                </span>
              )}
              {isRaftPart && !isCrafted && (
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                  Raft Part
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">{recipe.description}</p>
            {recipe.effect && (
              <p className="text-xs text-emerald-400 mt-1">{recipe.effect}</p>
            )}
          </div>
        </div>

        {!isCrafted && !isLocked && (
          <button
            onClick={onCraft}
            disabled={!canCraft}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              canCraft
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            Craft
          </button>
        )}

        {isLocked && (
          <span className="text-sm text-slate-500">
            🔒 Level {recipe.requiredLevel}
          </span>
        )}
      </div>

      {/* Ingredients */}
      {!isCrafted && (
        <div className="mt-3 flex flex-wrap gap-2">
          {recipe.ingredients.map((ing) => {
            const resource = RESOURCES[ing.resourceId];
            const have = getInventoryCount(ing.resourceId);
            const hasEnough = have >= ing.quantity;

            return (
              <div
                key={ing.resourceId}
                className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                  hasEnough
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                <span>{resource?.emoji}</span>
                <span>
                  {have}/{ing.quantity}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
