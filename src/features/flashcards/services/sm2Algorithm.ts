import type { SM2Response, SM2Result, CardStatus, Flashcard } from '../../../types';

/**
 * SM-2 Spaced Repetition Algorithm Implementation
 *
 * Based on the SuperMemo SM-2 algorithm with modifications for 4-button responses:
 * - Again (quality 0): Complete failure, reset learning
 * - Hard (quality 2): Correct but difficult
 * - Good (quality 3): Correct with normal effort
 * - Easy (quality 5): Perfect, effortless recall
 */

// Map our 4 buttons to SM-2 quality scores (0-5)
const RESPONSE_QUALITY: Record<SM2Response, number> = {
  again: 0,
  hard: 2,
  good: 3,
  easy: 5,
};

// XP rewards per response type
export const XP_PER_RESPONSE: Record<SM2Response, number> = {
  again: 0,
  hard: 5,
  good: 10,
  easy: 15,
};

// Default ease factor for new cards
const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;

/**
 * Calculate the next review state based on SM-2 algorithm
 */
export function calculateSM2(
  card: Pick<Flashcard, 'repetitions' | 'easeFactor' | 'interval' | 'status'>,
  response: SM2Response
): SM2Result {
  const quality = RESPONSE_QUALITY[response];
  let { repetitions, easeFactor, interval, status } = card;

  // Calculate new ease factor
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const newEaseFactor = Math.max(
    MIN_EASE_FACTOR,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  let newInterval: number;
  let newRepetitions: number;
  let newStatus: CardStatus;

  if (quality < 3) {
    // Failed - reset to learning
    newRepetitions = 0;
    newInterval = 1; // Review again in 1 day
    newStatus = status === 'new' ? 'learning' : 'relearning';
  } else {
    // Successful recall
    newRepetitions = repetitions + 1;

    if (repetitions === 0) {
      // First successful review
      newInterval = 1;
    } else if (repetitions === 1) {
      // Second successful review
      newInterval = 6;
    } else {
      // Subsequent reviews
      newInterval = Math.round(interval * newEaseFactor);
    }

    // Bonus for easy responses
    if (response === 'easy') {
      newInterval = Math.round(newInterval * 1.3);
    }

    newStatus = 'review';
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
    interval: newInterval,
    nextReviewDate,
    status: newStatus,
  };
}

/**
 * Get preview of intervals for all response buttons
 * Used to show "< 1 min", "10 min", "1 day", etc. on buttons
 */
export function getIntervalPreviews(
  card: Pick<Flashcard, 'repetitions' | 'easeFactor' | 'interval' | 'status'>
): Record<SM2Response, string> {
  const responses: SM2Response[] = ['again', 'hard', 'good', 'easy'];
  const previews: Record<SM2Response, string> = {} as Record<SM2Response, string>;

  for (const response of responses) {
    const result = calculateSM2(card, response);
    previews[response] = formatInterval(result.interval);
  }

  return previews;
}

/**
 * Format interval in days to human-readable string
 */
function formatInterval(days: number): string {
  if (days < 1) {
    return '< 1 day';
  } else if (days === 1) {
    return '1 day';
  } else if (days < 7) {
    return `${days} days`;
  } else if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  } else if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? '1 month' : `${months} months`;
  } else {
    const years = Math.round(days / 365);
    return years === 1 ? '1 year' : `${years} years`;
  }
}

/**
 * Get cards due for review (nextReviewDate <= now)
 */
export function getDueCards(cards: Flashcard[], limit?: number): Flashcard[] {
  const now = new Date();
  const dueCards = cards
    .filter((card) => new Date(card.nextReviewDate) <= now)
    .sort((a, b) => {
      // Prioritize: overdue cards first, then by status (learning > relearning > review > new)
      const statusPriority: Record<CardStatus, number> = {
        learning: 0,
        relearning: 1,
        review: 2,
        new: 3,
      };

      const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by how overdue they are
      return new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime();
    });

  return limit ? dueCards.slice(0, limit) : dueCards;
}

/**
 * Get count of cards by status
 */
export function getCardCounts(cards: Flashcard[]): {
  new: number;
  learning: number;
  review: number;
  due: number;
} {
  const now = new Date();

  return {
    new: cards.filter((c) => c.status === 'new').length,
    learning: cards.filter((c) => c.status === 'learning' || c.status === 'relearning').length,
    review: cards.filter((c) => c.status === 'review').length,
    due: cards.filter((c) => new Date(c.nextReviewDate) <= now).length,
  };
}

/**
 * Create a new flashcard with default SM-2 values
 */
export function createNewFlashcard(
  front: string,
  back: string,
  options?: Partial<Omit<Flashcard, 'id' | 'front' | 'back'>>
): Omit<Flashcard, 'id'> {
  return {
    front,
    back,
    pronunciation: options?.pronunciation,
    audioUrl: options?.audioUrl,
    exampleSentence: options?.exampleSentence,
    exampleTranslation: options?.exampleTranslation,
    category: options?.category,
    tags: options?.tags || [],
    sourceScenarioId: options?.sourceScenarioId,
    createdAt: new Date(),
    repetitions: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    interval: 0,
    nextReviewDate: new Date(), // Due immediately
    status: 'new',
  };
}
