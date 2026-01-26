import { useState, useEffect } from 'react';
import type { PendingAction, LocationType, Pet, PetType, CharacterPosition } from '../../../../types';
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

// Mobile-optimized positions (spread in corners for better use of horizontal space)
const MOBILE_LOCATION_POSITIONS: Record<LocationType, CharacterPosition> = {
  tree: { x: 82, y: 18 },   // Top-right
  bush: { x: 18, y: 18 },   // Top-left
  beach: { x: 78, y: 78 },  // Bottom-right
  sea: { x: 22, y: 78 },    // Bottom-left
};

const MOBILE_IDLE_POSITION: CharacterPosition = { x: 50, y: 48 };

// Background image path
const BACKGROUND_IMAGE = '/game/background.png';

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
  // Detect mobile layout based on screen width
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  useEffect(() => {
    const checkLayout = () => {
      setIsMobileLayout(window.innerWidth < 768);
    };

    checkLayout();
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);

  // Choose positions based on layout
  const locationPositions = isMobileLayout ? MOBILE_LOCATION_POSITIONS : LOCATION_POSITIONS;
  const idlePosition = isMobileLayout ? MOBILE_IDLE_POSITION : IDLE_POSITION;

  // Get character position - use mobile positions when on mobile
  const getCharacterPosition = (): CharacterPosition => {
    if (!currentAction) return idlePosition;

    const { animationState, location } = currentAction;

    // When idle, use idle position
    if (animationState === 'idle') return idlePosition;

    // For active states, use the appropriate position for current layout
    if (location && ['walking', 'searching', 'found', 'failed', 'celebrating'].includes(animationState)) {
      return locationPositions[location];
    }

    return idlePosition;
  };

  const characterPosition = getCharacterPosition();
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
        ${isCompact ? 'h-40' : 'h-full min-h-[180px] sm:min-h-[200px]'}
      `}
    >
      {/* Background image with blur */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${BACKGROUND_IMAGE})`,
          filter: 'blur(2px)',
          transform: 'scale(1.05)', // Prevent blur edges from showing
        }}
      />

      {/* Slight overlay to ensure UI elements are readable */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Content layer */}
      <div className="relative h-full">
        {/* Location markers */}
        {(['tree', 'bush', 'beach', 'sea'] as LocationType[]).map((location) => (
          <LocationButton
            key={location}
            location={location}
            position={locationPositions[location]}
            isUnlocked={unlockedLocations.includes(location)}
            isActive={activeLocation === location}
            isMobile={isMobileLayout}
          />
        ))}

        {/* Character */}
        <Character
          position={characterPosition}
          animationState={animationState}
          isMobile={isMobileLayout}
        />

        {/* Pet companion */}
        {activePetData && (
          <PetCompanion
            pet={activePetData}
            characterPosition={characterPosition}
            animationState={currentAction?.petAnimation}
            isMobile={isMobileLayout}
          />
        )}

        {/* Loot popup */}
        {showLoot && lootResult?.resourceId && lootResult.rarity && (
          <LootPopup
            resourceId={lootResult.resourceId}
            quantity={lootResult.quantity}
            rarity={lootResult.rarity}
            bonuses={lootResult.appliedBonuses}
            isMobile={isMobileLayout}
          />
        )}

        {/* Failed search popup */}
        {showFailed && <FailedSearchPopup isMobile={isMobileLayout} />}

        {/* Active pet indicator (bottom left) */}
        {activePetData && !isCompact && (
          <div className="absolute bottom-1 sm:bottom-2 left-1 sm:left-2 flex items-center gap-1 sm:gap-1.5 bg-black/50 rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 backdrop-blur-sm">
            <span className="animate-bob text-sm sm:text-base">{activePetData.emoji}</span>
            <span className="text-[10px] sm:text-xs text-white/90">{activePetData.name.split(' ')[0]}</span>
          </div>
        )}

        {/* Instructions (when idle and not compact) */}
        {animationState === 'idle' && !isCompact && (
          <div className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 text-[10px] sm:text-xs text-white/80 bg-black/40 backdrop-blur-sm rounded px-1.5 sm:px-2 py-0.5 sm:py-1">
            Review a flashcard to explore!
          </div>
        )}
      </div>
    </div>
  );
}
