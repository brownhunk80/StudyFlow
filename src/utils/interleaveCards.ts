import { Flashcard, Exam, SubjectItem } from '../types';

export interface DueCardWithContext extends Flashcard {
  subjectId?: string;
  chapterId?: string;
  chapterTitle?: string;
  milestoneTitle?: string;
  parentConcept?: string;
  sectionId?: string;
}

/**
 * Enriches standard flashcards with curriculum context (subjectId, chapterId, chapterTitle, milestoneTitle)
 * from exams and subject metadata if missing.
 */
export function enrichCardsWithContext(
  cards: Flashcard[],
  exams: Exam[] = [],
  subjects: SubjectItem[] = []
): DueCardWithContext[] {
  if (!Array.isArray(cards) || cards.length === 0) return [];

  // Build lookup index for sections & chapters
  const sectionMetaMap = new Map<
    string,
    { subjectId?: string; chapterId?: string; chapterTitle: string; milestoneTitle: string }
  >();

  exams.forEach((exam) => {
    (exam.chapters || []).forEach((chap) => {
      // Index by chapter topics/sections
      (chap.sections || []).forEach((sec) => {
        sectionMetaMap.set(sec.id, {
          subjectId: exam.id,
          chapterId: chap.id,
          chapterTitle: chap.name,
          milestoneTitle: sec.title || `Milestone ${sec.sectionNumber || 1}`,
        });
      });

      (chap.topics || []).forEach((top) => {
        sectionMetaMap.set(top.id, {
          subjectId: exam.id,
          chapterId: chap.id,
          chapterTitle: chap.name,
          milestoneTitle: top.title,
        });
      });
    });
  });

  return cards.map((card) => {
    const existing = card as DueCardWithContext;
    let sectionId = existing.sectionId;
    let chapterTitle = existing.chapterTitle || card.chapter || 'Chapter';
    let milestoneTitle = existing.milestoneTitle;
    let subjectId = existing.subjectId;
    let chapterId = existing.chapterId;

    // Derive sectionId from card ID if it follows pattern `card-learn-${sectionId}-${idx}`
    if (!sectionId && card.id.startsWith('card-learn-')) {
      const parts = card.id.replace('card-learn-', '').split('-');
      if (parts.length >= 1) {
        sectionId = parts.slice(0, parts.length - 1).join('-');
      }
    }

    if (sectionId && sectionMetaMap.has(sectionId)) {
      const meta = sectionMetaMap.get(sectionId)!;
      chapterTitle = meta.chapterTitle || chapterTitle;
      milestoneTitle = milestoneTitle || meta.milestoneTitle;
      subjectId = subjectId || meta.subjectId;
      chapterId = chapterId || meta.chapterId;
    }

    // If milestoneTitle still missing, try inferring from deck title or card topic
    if (!milestoneTitle) {
      if ((card as any).topicTag) {
        milestoneTitle = (card as any).topicTag;
      } else if (card.clozeHint) {
        milestoneTitle = card.clozeHint;
      } else {
        milestoneTitle = chapterTitle;
      }
    }

    return {
      ...card,
      subjectId: subjectId || card.subject || 'General',
      chapterId: chapterId || chapterTitle,
      chapterTitle,
      milestoneTitle,
      parentConcept: (card as any).parentConcept || (card as any).parentBullet || milestoneTitle,
      sectionId,
    };
  });
}

/**
 * Intelligent Interleaving Shuffle Algorithm
 *
 * Cognitive learning science rationale:
 * - Blocked study (studying all cards of Milestone 1, then Milestone 2) induces
 *   an illusion of competence because cue patterns are predictable.
 * - Interleaving forces the student to practice discriminative retrieval—identifying
 *   the distinct domain, principles, and concepts before accessing memory.
 *
 * Algorithm Guarantees:
 * 1. Never presents two cards from the same milestone or same parent concept back-to-back
 *    if cards from alternative milestones/subjects are available.
 * 2. Maintains balanced rotation across subjects (e.g. Science -> SST -> Hindi -> Science)
 *    and chapters within each subject.
 * 3. Uses a maximum-dispersion priority heuristic to distribute cards from large chapters
 *    evenly throughout the entire queue rather than letting them bunch up at the end.
 * 4. Strictly preserves all original Flashcard properties (id, interval, repetitions, easeFactor,
 *    dueDate, deckId, status) so SM-2 ratings persist safely without data loss.
 */
export function interleaveCards<T extends Flashcard = DueCardWithContext>(
  cards: T[]
): T[] {
  if (!Array.isArray(cards) || cards.length <= 1) {
    return cards ? [...cards] : [];
  }

  // Clone array to prevent mutating input
  const remaining = [...cards];
  const result: T[] = [];

  // Helper getters for card classification
  const getSubject = (c: T): string =>
    ((c as any).subjectId || c.subject || 'General').toLowerCase().trim();

  const getChapter = (c: T): string =>
    ((c as any).chapterTitle || (c as any).chapterId || c.chapter || 'Chapter').toLowerCase().trim();

  const getMilestone = (c: T): string =>
    ((c as any).milestoneTitle || (c as any).sectionId || (c as any).parentConcept || getChapter(c)).toLowerCase().trim();

  const getConcept = (c: T): string =>
    ((c as any).parentConcept || (c as any).concept || getMilestone(c)).toLowerCase().trim();

  // Helper to calculate how many cards remain in a group
  const countRemainingInSubject = (subj: string) =>
    remaining.filter((c) => getSubject(c) === subj).length;

  const countRemainingInChapter = (chap: string) =>
    remaining.filter((c) => getChapter(c) === chap).length;

  const countRemainingInMilestone = (ms: string) =>
    remaining.filter((c) => getMilestone(c) === ms).length;

  // Track recent history to prevent clustering
  let lastCard: T | null = null;
  let secondLastCard: T | null = null;

  while (remaining.length > 0) {
    let chosenIndex = -1;

    if (!lastCard) {
      // Pick first card from the subject/chapter with the most cards to balance early
      let maxCount = -1;
      remaining.forEach((card, idx) => {
        const count = countRemainingInSubject(getSubject(card));
        if (count > maxCount) {
          maxCount = count;
          chosenIndex = idx;
        }
      });
    } else {
      const lastSubj = getSubject(lastCard);
      const lastChap = getChapter(lastCard);
      const lastMs = getMilestone(lastCard);
      const lastConcept = getConcept(lastCard);

      const secondLastSubj = secondLastCard ? getSubject(secondLastCard) : null;
      const secondLastChap = secondLastCard ? getChapter(secondLastCard) : null;

      // Tier 1: Different subject AND different chapter AND different milestone/concept
      const tier1: number[] = [];
      // Tier 2: Different chapter AND different milestone/concept (same or different subject)
      const tier2: number[] = [];
      // Tier 3: Same chapter, but strictly different milestone/concept
      const tier3: number[] = [];
      // Tier 4: Different card ID (different card even if same milestone)
      const tier4: number[] = [];

      remaining.forEach((card, idx) => {
        const subj = getSubject(card);
        const chap = getChapter(card);
        const ms = getMilestone(card);
        const concept = getConcept(card);

        const isDiffSubj = subj !== lastSubj;
        const isDiffChap = chap !== lastChap;
        const isDiffMs = ms !== lastMs && concept !== lastConcept;

        if (isDiffSubj && isDiffChap && isDiffMs) {
          tier1.push(idx);
        } else if (isDiffChap && isDiffMs) {
          tier2.push(idx);
        } else if (isDiffMs) {
          tier3.push(idx);
        } else {
          tier4.push(idx);
        }
      });

      // Select from the highest available tier
      const candidateIndices =
        tier1.length > 0
          ? tier1
          : tier2.length > 0
          ? tier2
          : tier3.length > 0
          ? tier3
          : tier4;

      // Among candidates, prioritize cards that:
      // 1. Avoid repeating the second-last subject/chapter if possible (enforces 3-way rotation)
      // 2. Belong to the category with the most remaining cards (longest remaining queue)
      let bestScore = -Infinity;
      candidateIndices.forEach((idx) => {
        const card = remaining[idx];
        const subj = getSubject(card);
        const chap = getChapter(card);
        const ms = getMilestone(card);

        let score = 0;

        // Longest queue heuristic (prevents late-session card bunching)
        score += countRemainingInSubject(subj) * 10;
        score += countRemainingInChapter(chap) * 5;
        score += countRemainingInMilestone(ms) * 2;

        // Rotation bonus: prefer not matching secondLast
        if (secondLastSubj && subj !== secondLastSubj) {
          score += 8;
        }
        if (secondLastChap && chap !== secondLastChap) {
          score += 4;
        }

        if (score > bestScore) {
          bestScore = score;
          chosenIndex = idx;
        }
      });
    }

    if (chosenIndex === -1) {
      chosenIndex = 0;
    }

    const [selectedCard] = remaining.splice(chosenIndex, 1);
    result.push(selectedCard);

    secondLastCard = lastCard;
    lastCard = selectedCard;
  }

  return result;
}

export default interleaveCards;
