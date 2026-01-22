import type { Pet, PetType } from '../../../../types';
import { PETS, getAllPets, getNextPetToUnlock, getLevelsUntilNextPet } from '../../data/pets';

interface PetManagerProps {
  unlockedPets: PetType[];
  activePet: PetType | null;
  currentLevel: number;
  onSetActivePet: (petId: PetType | null) => void;
}

/**
 * Pet management UI for selecting and viewing pets
 */
export function PetManager({
  unlockedPets,
  activePet,
  currentLevel,
  onSetActivePet,
}: PetManagerProps) {
  const allPets = getAllPets();
  const nextPet = getNextPetToUnlock(currentLevel);
  const levelsUntilNext = getLevelsUntilNextPet(currentLevel);

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Your Pets</h3>
        <p className="text-sm text-slate-400">
          Select a pet to accompany you on your adventures
        </p>
      </div>

      {/* Pet grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {allPets.map((pet) => {
          const isUnlocked = unlockedPets.includes(pet.id);
          const isActive = activePet === pet.id;

          return (
            <PetCard
              key={pet.id}
              pet={pet}
              isUnlocked={isUnlocked}
              isActive={isActive}
              currentLevel={currentLevel}
              onSelect={() => {
                if (isUnlocked) {
                  onSetActivePet(isActive ? null : pet.id);
                }
              }}
            />
          );
        })}
      </div>

      {/* Next pet teaser */}
      {nextPet && levelsUntilNext !== null && (
        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="text-3xl opacity-50">{nextPet.emoji}</div>
            <div>
              <p className="text-sm text-slate-300">
                <span className="font-medium">{nextPet.name}</span> unlocks at Level {nextPet.unlockLevel}
              </p>
              <p className="text-xs text-slate-500">
                {levelsUntilNext} {levelsUntilNext === 1 ? 'level' : 'levels'} to go!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No pets message */}
      {unlockedPets.length === 0 && (
        <div className="text-center py-6 text-slate-500">
          <p className="text-2xl mb-2">🐾</p>
          <p>No pets unlocked yet!</p>
          <p className="text-sm mt-1">Reach Level 5 to unlock your first pet.</p>
        </div>
      )}
    </div>
  );
}

interface PetCardProps {
  pet: Pet;
  isUnlocked: boolean;
  isActive: boolean;
  currentLevel: number;
  onSelect: () => void;
}

function PetCard({ pet, isUnlocked, isActive, currentLevel, onSelect }: PetCardProps) {
  const levelsToUnlock = pet.unlockLevel - currentLevel;

  return (
    <button
      onClick={onSelect}
      disabled={!isUnlocked}
      className={`
        relative p-4 rounded-xl border-2 text-left transition-all
        ${isActive
          ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/30'
          : isUnlocked
            ? 'bg-slate-800/50 border-slate-600 hover:bg-slate-700/50 hover:border-slate-500'
            : 'bg-slate-900/50 border-slate-700 opacity-60 cursor-not-allowed'
        }
      `}
    >
      {/* Active badge */}
      {isActive && (
        <div className="absolute top-2 right-2 text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
          Active
        </div>
      )}

      {/* Locked overlay */}
      {!isUnlocked && (
        <div className="absolute top-2 right-2 text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
          Lvl {pet.unlockLevel}
        </div>
      )}

      {/* Pet icon */}
      <div className={`text-4xl mb-2 ${isActive ? 'animate-bob' : ''}`}>
        {isUnlocked ? pet.emoji : '🔒'}
      </div>

      {/* Pet name */}
      <h4 className={`font-semibold ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
        {pet.name}
      </h4>

      {/* Pet description */}
      <p className={`text-sm mt-1 ${isUnlocked ? 'text-slate-400' : 'text-slate-600'}`}>
        {pet.description}
      </p>

      {/* Ability */}
      <div
        className={`
          mt-3 text-xs px-2 py-1 rounded-md
          ${isUnlocked
            ? 'bg-indigo-500/20 text-indigo-300'
            : 'bg-slate-800 text-slate-500'
          }
        `}
      >
        <span className="font-medium">Ability:</span> {pet.ability.description}
      </div>

      {/* Unlock progress (if locked) */}
      {!isUnlocked && levelsToUnlock > 0 && (
        <div className="mt-2 text-xs text-slate-500">
          {levelsToUnlock} more {levelsToUnlock === 1 ? 'level' : 'levels'} to unlock
        </div>
      )}
    </button>
  );
}

/**
 * Compact pet selector for quick switching
 */
export function PetSelector({
  unlockedPets,
  activePet,
  onSetActivePet,
}: {
  unlockedPets: PetType[];
  activePet: PetType | null;
  onSetActivePet: (petId: PetType | null) => void;
}) {
  if (unlockedPets.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {unlockedPets.map((petId) => {
        const pet = PETS[petId];
        const isActive = activePet === petId;

        return (
          <button
            key={petId}
            onClick={() => onSetActivePet(isActive ? null : petId)}
            className={`
              p-1.5 rounded-lg transition-all
              ${isActive
                ? 'bg-emerald-500/30 ring-2 ring-emerald-500'
                : 'bg-slate-700/50 hover:bg-slate-600/50'
              }
            `}
            title={`${pet.name}: ${pet.ability.description}`}
          >
            <span className={`text-xl ${isActive ? 'animate-bob' : ''}`}>{pet.emoji}</span>
          </button>
        );
      })}
    </div>
  );
}
