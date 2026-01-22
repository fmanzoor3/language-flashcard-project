import type { PendingAction, LocationType, Pet, PetType } from '../../../../types';
import { LOCATION_POSITIONS, IDLE_POSITION } from '../../../../types';
import { Character } from './Character';
import { LocationButton } from './LocationButton';
import { LootPopup, FailedSearchPopup } from './LootPopup';
import { PetCompanion } from './PetCompanion';
import { PETS } from '../../data/pets';

interface IslandViewProps {
  currentAction: PendingAction | null;
  activePet: PetType | null;
  unlockedLocations: LocationType[];
  isCompact?: boolean;
}

/**
 * Main island visualization component
 * Shows the character, locations, pet, and loot animations
 */
export function IslandView({
  currentAction,
  activePet,
  unlockedLocations,
  isCompact = false,
}: IslandViewProps) {
  // Get character position from action or idle position
  const characterPosition = currentAction?.characterPosition || IDLE_POSITION;
  const animationState = currentAction?.animationState || 'idle';
  const activeLocation = currentAction?.location || null;

  // Get active pet data
  const activePetData: Pet | null = activePet ? PETS[activePet] : null;

  // Check if showing loot popup
  const showLoot =
    currentAction?.result?.resourceId &&
    (animationState === 'found' || animationState === 'celebrating');
  const showFailed = animationState === 'failed' && !currentAction?.result?.resourceId;

  // Extended loot result type
  const lootResult = currentAction?.result as {
    resourceId: string | null;
    quantity: number;
    rarity: 'common' | 'rare' | 'veryRare' | 'legendary' | null;
    appliedBonuses?: string[];
  } | null;

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg
        ${isCompact ? 'h-40' : 'h-full min-h-[200px]'}
        island-bg
      `}
    >
      {/* Campfire at center (idle position) */}
      <div
        className="absolute z-5 text-xl"
        style={{
          left: `${IDLE_POSITION.x}%`,
          top: `${IDLE_POSITION.y + 8}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        🔥
      </div>

      {/* Location markers */}
      {(['tree', 'bush', 'beach', 'sea'] as LocationType[]).map((location) => (
        <LocationButton
          key={location}
          location={location}
          position={LOCATION_POSITIONS[location]}
          isUnlocked={unlockedLocations.includes(location)}
          isActive={activeLocation === location}
        />
      ))}

      {/* Character */}
      <Character position={characterPosition} animationState={animationState} />

      {/* Pet companion */}
      {activePetData && (
        <PetCompanion
          pet={activePetData}
          characterPosition={characterPosition}
          animationState={currentAction?.petAnimation}
        />
      )}

      {/* Loot popup */}
      {showLoot && lootResult?.resourceId && lootResult.rarity && (
        <LootPopup
          resourceId={lootResult.resourceId}
          quantity={lootResult.quantity}
          rarity={lootResult.rarity}
          bonuses={lootResult.appliedBonuses}
        />
      )}

      {/* Failed search popup */}
      {showFailed && <FailedSearchPopup />}

      {/* Active pet indicator (bottom left) */}
      {activePetData && !isCompact && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/40 rounded-full px-2 py-1">
          <span className="animate-bob">{activePetData.emoji}</span>
          <span className="text-xs text-white/80">{activePetData.name.split(' ')[0]}</span>
        </div>
      )}

      {/* Instructions (when idle and not compact) */}
      {animationState === 'idle' && !isCompact && (
        <div className="absolute bottom-2 right-2 text-xs text-white/60 bg-black/30 rounded px-2 py-1">
          Review a flashcard to explore!
        </div>
      )}
    </div>
  );
}
