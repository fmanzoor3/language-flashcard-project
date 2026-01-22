import type { Pet, PetAnimationState, CharacterPosition } from '../../../../types';

interface PetCompanionProps {
  pet: Pet;
  characterPosition: CharacterPosition;
  animationState?: PetAnimationState;
}

/**
 * Pet companion that follows the character
 */
export function PetCompanion({ pet, characterPosition, animationState }: PetCompanionProps) {
  // Pet follows slightly behind and to the side of character
  const petPosition = {
    x: characterPosition.x + 8,
    y: characterPosition.y + 5,
  };

  // Get animation class based on state
  const getAnimationClass = () => {
    if (!animationState) return 'animate-bob';

    switch (animationState.state) {
      case 'idle':
        return 'animate-bob';
      case 'following':
        return 'animate-pet-follow';
      case 'helping':
        return 'animate-spin-slow';
      case 'celebrating':
        return 'animate-celebrate';
      default:
        return 'animate-bob';
    }
  };

  return (
    <div
      className="character-move absolute z-15 flex flex-col items-center"
      style={{
        left: `${petPosition.x}%`,
        top: `${petPosition.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Pet emoji with animation */}
      <div
        className={`text-xl ${getAnimationClass()}`}
        title={`${pet.name}: ${pet.ability.description}`}
      >
        {pet.emoji}
      </div>

      {/* Pet name tooltip on hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 text-xs bg-black/70 px-2 py-0.5 rounded whitespace-nowrap">
        {pet.name}
      </div>
    </div>
  );
}

/**
 * Mini pet display for compact views
 */
export function PetBadge({ pet, isActive }: { pet: Pet; isActive?: boolean }) {
  return (
    <div
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm
        ${isActive
          ? 'bg-emerald-500/20 border border-emerald-500/50'
          : 'bg-slate-700/50 border border-slate-600/50'
        }
      `}
      title={`${pet.name}: ${pet.ability.description}`}
    >
      <span className={isActive ? 'animate-bob' : ''}>{pet.emoji}</span>
      <span className="text-xs text-slate-300">{pet.name.split(' ')[0]}</span>
    </div>
  );
}
