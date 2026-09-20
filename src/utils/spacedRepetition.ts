import { Flashcard, RecallRating } from '../types';

/**
 * SuperMemo SM-2 Spaced Repetition Algorithm Implementation
 */
export function calculateSM2(card: Flashcard, rating: RecallRating): Partial<Flashcard> {
  let { repetitions, easeFactor, interval, box } = card;

  // Grade numerical mapping:
  // again = 1, hard = 2, good = 3, easy = 4
  const now = new Date();

  switch (rating) {
    case 'again': {
      repetitions = 0;
      interval = 1;
      box = 1;
      easeFactor = Math.max(1.3, easeFactor - 0.2);
      break;
    }
    case 'hard': {
      repetitions += 1;
      interval = repetitions === 1 ? 1 : Math.max(1, Math.round(interval * 1.2));
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      box = Math.max(1, Math.min(5, box));
      break;
    }
    case 'good': {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 3;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
      box = Math.min(5, box + 1);
      break;
    }
    case 'easy': {
      if (repetitions === 0) {
        interval = 4;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor * 1.35);
      }
      repetitions += 1;
      easeFactor = easeFactor + 0.15;
      box = Math.min(5, box + 2);
      break;
    }
  }

  // Calculate next due date
  const nextDue = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

  let status: Flashcard['status'] = 'review';
  if (box >= 4 || interval >= 14) {
    status = 'mastered';
  } else if (repetitions <= 1) {
    status = 'learning';
  }

  return {
    repetitions,
    easeFactor,
    interval,
    box,
    status,
    lastReviewed: now.toISOString(),
    dueDate: nextDue.toISOString(),
  };
}

export const calculateNextReview = calculateSM2;

/**
 * Checks if a card is currently due for review
 */
export function isCardDue(card: Flashcard): boolean {
  if (!card.dueDate) return true;
  const due = new Date(card.dueDate);
  const now = new Date();
  // Due if date is past or today
  return due <= now;
}

/**
 * Calculates current estimated memory retention % based on Ebbinghaus Forgetting Curve
 * R = e^(-t / S)
 */
export function getMemoryRetention(card: Flashcard): number {
  if (!card.lastReviewed) return 60; // default for new/unreviewed cards
  const last = new Date(card.lastReviewed).getTime();
  const now = Date.now();
  const elapsedDays = Math.max(0, (now - last) / (1000 * 60 * 60 * 24));
  
  // Stability factor based on interval and box
  const stability = Math.max(1, card.interval * 1.2 + (card.box - 1) * 2);
  
  // Retention decay
  const retention = Math.exp(-elapsedDays / stability) * 100;
  return Math.min(100, Math.max(20, Math.round(retention)));
}

/**
 * Formats next interval label for UI buttons
 */
export function getIntervalPreview(card: Flashcard, rating: RecallRating): string {
  const result = calculateSM2(card, rating);
  const days = result.interval || 1;
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  const months = Math.round(days / 30);
  return `${months} mo`;
}
