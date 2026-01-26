import type { LocationType, CharacterPosition } from '../../../../types';

interface LocationButtonProps {
  location: LocationType;
  position: CharacterPosition;
  isUnlocked: boolean;
  isActive: boolean;
  isMobile?: boolean;
}

const LOCATION_CONFIG: Record<LocationType, { emoji: string; label: string }> = {
  tree: { emoji: '🌳', label: 'Forest' },
  bush: { emoji: '🌿', label: 'Bushes' },
  beach: { emoji: '🏖️', label: 'Beach' },
  sea: { emoji: '🌊', label: 'Sea' },
};

/**
 * Interactive location marker on the island
 */
export function LocationButton({
  location,
  position,
  isUnlocked,
  isActive,
  isMobile = false,
}: LocationButtonProps) {
  const config = LOCATION_CONFIG[location];

  return (
    <div
      className="absolute z-10 flex flex-col items-center"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Location icon */}
      <div
        className={`
          location-marker
          ${isMobile ? 'text-lg p-1.5' : 'text-2xl p-2'} rounded-full
          transition-all duration-300
          ${isUnlocked
            ? isActive
              ? 'bg-emerald-500/40 ring-2 ring-emerald-400 scale-110'
              : 'bg-black/30 hover:bg-black/50 cursor-pointer'
            : 'bg-black/50 opacity-50'
          }
        `}
      >
        {isUnlocked ? config.emoji : '🔒'}
      </div>

      {/* Label - hidden on mobile to reduce clutter */}
      <span
        className={`
          mt-0.5 sm:mt-1 text-[9px] sm:text-xs font-medium px-1 sm:px-1.5 py-0.5 rounded
          ${isMobile ? 'hidden' : 'block'}
          sm:block
          ${isUnlocked
            ? 'text-white bg-black/40'
            : 'text-gray-400 bg-black/30'
          }
        `}
      >
        {config.label}
      </span>

      {/* Active indicator pulse */}
      {isActive && (
        <div className={`absolute ${isMobile ? 'inset-[-2px]' : 'inset-0'} rounded-full bg-emerald-400/30 animate-ping`} />
      )}
    </div>
  );
}
