import type { AnimationState, CharacterPosition } from '../../../../types';

interface CharacterProps {
  position: CharacterPosition;
  animationState: AnimationState;
  isMobile?: boolean;
}

// Character sprite paths
const CHARACTER_SPRITES: Record<AnimationState, string> = {
  idle: '/game/character.png',
  walking: '/game/character-walking.png',
  searching: '/game/character-walking.png',    // Reuse walking for searching (looking around)
  found: '/game/character-celebrating.png',    // Use celebrating for found
  failed: '/game/character.png',               // Use idle for failed (disappointed)
  celebrating: '/game/character-celebrating.png',
};

/**
 * Animated character that moves around the island
 */
export function Character({ position, animationState, isMobile = false }: CharacterProps) {
  // Get animation class based on state
  const getAnimationClass = () => {
    switch (animationState) {
      case 'idle':
        return 'animate-bob';
      case 'walking':
        return 'animate-walk';
      case 'searching':
        return 'animate-search';
      case 'found':
        return 'animate-jump';
      case 'failed':
        return 'animate-shake';
      case 'celebrating':
        return 'animate-celebrate';
      default:
        return '';
    }
  };

  // Get the sprite for the current animation state
  const sprite = CHARACTER_SPRITES[animationState] || CHARACTER_SPRITES.idle;

  // Base character size based on device
  const baseSize = isMobile ? 64 : 96;

  // Scale up walking/celebrating sprites since they're slightly smaller than idle
  const getSpriteSize = () => {
    switch (animationState) {
      case 'walking':
      case 'searching':
      case 'found':
      case 'celebrating':
        return Math.round(baseSize * 1.15); // 15% larger to match idle sprite
      default:
        return baseSize;
    }
  };

  const size = getSpriteSize();

  return (
    <div
      className="character-move absolute z-20 flex flex-col items-center"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Character sprite with animation */}
      <div className={getAnimationClass()}>
        <img
          src={sprite}
          alt="Character"
          width={size}
          height={size}
          className="object-contain drop-shadow-lg"
          style={{ imageRendering: 'auto' }}
        />
      </div>

      {/* Status indicator below character */}
      <div className={`mt-0.5 sm:mt-1 ${isMobile ? 'text-[9px]' : 'text-xs'} text-white/80 bg-black/40 px-1.5 sm:px-2 py-0.5 rounded-full shadow-sm`}>
        {animationState === 'idle' && '...'}
        {animationState === 'walking' && 'Going...'}
        {animationState === 'searching' && 'Looking...'}
        {animationState === 'found' && 'Found!'}
        {animationState === 'failed' && 'Nothing'}
        {animationState === 'celebrating' && 'WOW!'}
      </div>
    </div>
  );
}
