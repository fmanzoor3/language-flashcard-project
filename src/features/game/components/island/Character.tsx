import type { AnimationState, CharacterPosition } from '../../../../types';

interface CharacterProps {
  position: CharacterPosition;
  animationState: AnimationState;
}

/**
 * Animated character that moves around the island
 */
export function Character({ position, animationState }: CharacterProps) {
  // Get animation class based on state
  const getAnimationClass = () => {
    switch (animationState) {
      case 'idle':
        return 'animate-bob';
      case 'walking':
        return 'animate-walk';
      case 'searching':
        return 'animate-spin-slow';
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

  return (
    <div
      className="character-move absolute z-20 flex flex-col items-center"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Character emoji with animation */}
      <div className={`text-3xl ${getAnimationClass()}`}>
        🧑
      </div>

      {/* Status indicator below character */}
      <div className="mt-1 text-xs text-white/80 bg-black/30 px-1.5 py-0.5 rounded-full">
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
