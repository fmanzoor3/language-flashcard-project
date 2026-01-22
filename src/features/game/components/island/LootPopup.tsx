import { useEffect, useState } from 'react';
import type { RarityTier } from '../../../../types';
import { RESOURCES } from '../../data/resources';

interface LootPopupProps {
  resourceId: string;
  quantity: number;
  rarity: RarityTier;
  bonuses?: string[];
  onComplete?: () => void;
}

/**
 * Animated popup showing loot found
 */
export function LootPopup({ resourceId, quantity, rarity, bonuses, onComplete }: LootPopupProps) {
  const [isVisible, setIsVisible] = useState(true);
  const resource = RESOURCES[resourceId];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!resource || !isVisible) return null;

  // Get rarity styling
  const getRarityStyles = () => {
    switch (rarity) {
      case 'common':
        return {
          textClass: 'text-gray-300',
          glowClass: 'glow-common',
          bgClass: 'bg-gray-800/90',
          borderClass: 'border-gray-600',
        };
      case 'rare':
        return {
          textClass: 'text-blue-400',
          glowClass: 'glow-rare',
          bgClass: 'bg-blue-900/90',
          borderClass: 'border-blue-500',
        };
      case 'veryRare':
        return {
          textClass: 'text-purple-400',
          glowClass: 'glow-veryRare',
          bgClass: 'bg-purple-900/90',
          borderClass: 'border-purple-500',
        };
      case 'legendary':
        return {
          textClass: 'text-amber-400',
          glowClass: 'glow-legendary',
          bgClass: 'bg-amber-900/90',
          borderClass: 'border-amber-500',
        };
    }
  };

  const styles = getRarityStyles();

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
      <div
        className={`
          animate-pop-in
          ${styles.bgClass} ${styles.borderClass} ${styles.glowClass}
          border-2 rounded-xl px-4 py-3
          flex flex-col items-center
          backdrop-blur-sm
        `}
      >
        {/* Loot emoji with animation */}
        <div className={`text-4xl mb-1 ${rarity === 'legendary' ? 'animate-celebrate' : 'animate-jump'}`}>
          {resource.emoji}
        </div>

        {/* Loot name and quantity */}
        <div className={`text-lg font-bold ${styles.textClass}`}>
          {resource.name} x{quantity}
        </div>

        {/* Rarity label */}
        <div className={`text-xs uppercase tracking-wide ${styles.textClass} opacity-80`}>
          {rarity === 'veryRare' ? 'Very Rare' : rarity}
        </div>

        {/* Applied bonuses */}
        {bonuses && bonuses.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {bonuses.map((bonus, index) => (
              <div
                key={index}
                className="text-xs text-emerald-400 animate-bonus-slide"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {bonus}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Failed search popup
 */
export function FailedSearchPopup({ onComplete }: { onComplete?: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
      <div className="animate-shake bg-slate-800/90 border border-slate-600 rounded-lg px-4 py-2">
        <div className="text-2xl mb-1 text-center">😕</div>
        <div className="text-sm text-slate-400">Nothing found...</div>
      </div>
    </div>
  );
}
