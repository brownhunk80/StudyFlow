import { Exam, Flashcard, FlashcardDeck, Section, RecallRating } from '../types';
import { isCardDue } from './spacedRepetition';

export interface LearnSyncResult {
  learnDecks: FlashcardDeck[];
  learnCards: Flashcard[];
}

// Helper to safely parse JSON from localStorage
const safeGetLocalStorage = (key: string) => {
  try {
    const val = localStorage.getItem(key);
    if (val) return JSON.parse(val);
  } catch {}
  return null;
};

/**
 * Builds high-yield default RemNote-style active recall cards for a section
 * when explicit custom cards have not yet been generated or saved in localStorage.
 */
function generateDefaultCuratedCardsForSection(
  section: Section,
  chapterName: string,
  subjectName: string,
  deckId: string
): Flashcard[] {
  const topics = section.keyTopics && section.keyTopics.length > 0 ? section.keyTopics : [section.title];
  const t0 = topics[0] || section.title;
  const t1 = topics[1] || t0;
  const t2 = topics[2] || topics[0] || section.title;
  const secTitle = section.title || `Section ${section.sectionNumber || 1}`;

  const defaultTemplates = [
    {
      id: `card-learn-${section.id}-1`,
      front: `State the foundational definition and primary significance of ${t0}.`,
      back: `${t0} represents the core mechanism in ${secTitle}. It defines how fundamental quantities interact under boundary conditions and governs invariant system behaviors.`,
    },
    {
      id: `card-learn-${section.id}-2`,
      front: `What governing law or invariant principle applies to transformations in ${secTitle}?`,
      back: `Conservation principles and equilibrium laws require that total energy and momentum remain invariant across closed reference boundaries in ${secTitle}.`,
    },
    {
      id: `card-learn-${section.id}-3`,
      front: `What is the most frequent exam misconception or calculation trap regarding ${t1}?`,
      back: `A common error is omitting directional sign conventions or applying equilibrium formulas outside their validity assumptions in ${secTitle}.`,
    },
    {
      id: `card-learn-${section.id}-4`,
      front: `Describe the standard analytical problem-solving sequence for evaluating ${t2}.`,
      back: `1. Identify boundary parameters and unknowns.\n2. Select the governing constitutive equation.\n3. Verify dimensional consistency and substitute known values.`,
    },
    {
      id: `card-learn-${section.id}-5`,
      front: `How does understanding ${secTitle} synthesize with broader concepts in ${chapterName}?`,
      back: `${secTitle} provides the foundational bridge connecting microscopic interactions with observed macroscopic phenomena throughout ${chapterName}.`,
    },
  ];

  return defaultTemplates.map((tmpl, idx) => ({
    id: tmpl.id,
    deckId,
    front: tmpl.front,
    back: tmpl.back,
    subject: subjectName,
    chapter: chapterName,
    interval: 1,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: new Date().toISOString(),
    box: 1,
    status: 'learning' as const,
  }));
}

/**
 * Automatically extracts and synchronizes all active recall decks and cards
 * from the Learn Tab (Exams -> Chapters -> Sections) into unified Flashcard and FlashcardDeck items.
 */
export function extractLearnTabDecksAndCards(exams: Exam[] = []): LearnSyncResult {
  const learnDecks: FlashcardDeck[] = [];
  const learnCards: Flashcard[] = [];
  const seenCardIds = new Set<string>();
  const seenDeckIds = new Set<string>();

  // Ensure we check exams passed in plus any stored in localStorage
  let combinedExamsList: Exam[] = Array.isArray(exams) ? [...exams] : [];
  if (combinedExamsList.length === 0) {
    const storedExams = safeGetLocalStorage('studyflow_exams');
    if (Array.isArray(storedExams) && storedExams.length > 0) {
      combinedExamsList = storedExams;
    }
  }

  // Scan through all exams and chapters
  combinedExamsList.forEach((exam) => {
    const subjectName = exam.name || 'Science';
    const examColor = exam.color || '#4f46e5';

    (exam.chapters || []).forEach((chapter) => {
      // Check chapter.sections, chapter.milestones, plus localStorage cache
      const cachedSections = safeGetLocalStorage(`chapter_milestones_${chapter.id}`);
      const rawSections: Section[] =
        (Array.isArray(cachedSections) && cachedSections.length > 0 && cachedSections) ||
        (Array.isArray(chapter.sections) && chapter.sections.length > 0 && chapter.sections) ||
        (Array.isArray(chapter.milestones) && chapter.milestones.length > 0 && chapter.milestones) ||
        [];

      rawSections.forEach((section, sIdx) => {
        if (!section || !section.id) return;

        const deckId = `deck-learn-${chapter.id}-${section.id || sIdx + 1}`;
        const sectionTitle = section.title || `Section ${section.sectionNumber || sIdx + 1}`;
        const deckTitle = `${chapter.name}: ${sectionTitle}`;

        // Retrieve cards from section or dedicated localStorage keys
        const cachedRecallDeck = safeGetLocalStorage(`recall_deck_${section.id}`);
        const cachedMilestoneDeck = safeGetLocalStorage(`milestone_recall_deck_${section.id}`);

        let rawCards: any[] =
          (Array.isArray(cachedMilestoneDeck) && cachedMilestoneDeck.length > 0 && cachedMilestoneDeck) ||
          (Array.isArray(cachedRecallDeck) && cachedRecallDeck.length > 0 && cachedRecallDeck) ||
          (Array.isArray(section.flashcards) && section.flashcards.length > 0 && section.flashcards) ||
          (Array.isArray(section.recallDeck) && section.recallDeck.length > 0 && section.recallDeck) ||
          [];

        // If no custom cards saved yet, provide the curated RemNote recall cards so every section has an active recall deck
        if (rawCards.length === 0) {
          const generatedDefaults = generateDefaultCuratedCardsForSection(
            section,
            chapter.name,
            subjectName,
            deckId
          );
          rawCards = generatedDefaults;
        }

        const convertedSectionCards: Flashcard[] = [];

        rawCards.forEach((rc, cIdx) => {
          if (!rc || rc.status === 'disabled') return;

          const frontText = rc.frontPrompt || rc.front || rc.promptQuestion || '';
          const backText = rc.backAnswer || rc.back || rc.answer || '';
          if (!frontText && !backText) return;

          const cardId = rc.id || `card-learn-${section.id}-${cIdx + 1}`;
          if (seenCardIds.has(cardId)) return;
          seenCardIds.add(cardId);

          const interval = typeof rc.interval === 'number' && rc.interval > 0 ? rc.interval : 1;
          const repetitions = typeof rc.repetition === 'number' ? rc.repetition : rc.repetitions || 0;
          const easeFactor = typeof rc.easinessFactor === 'number' ? rc.easinessFactor : rc.easeFactor || 2.5;
          const box = Math.min(5, Math.max(1, Math.floor(interval / 3) + 1));
          const dueDate = rc.dueDate || new Date().toISOString();
          const status = interval >= 3 || repetitions >= 2 ? 'mastered' : 'learning';

          const flashcard: Flashcard = {
            id: cardId,
            deckId,
            front: frontText,
            back: backText,
            interval,
            repetitions,
            easeFactor,
            box,
            dueDate,
            status,
            subject: subjectName,
            chapter: chapter.name,
          };

          convertedSectionCards.push(flashcard);
          learnCards.push(flashcard);
        });

        if (convertedSectionCards.length > 0 && !seenDeckIds.has(deckId)) {
          seenDeckIds.add(deckId);
          const dueCount = convertedSectionCards.filter(isCardDue).length;
          const masteredCount = convertedSectionCards.filter((c) => c.status === 'mastered').length;

          learnDecks.push({
            id: deckId,
            title: deckTitle,
            subject: subjectName,
            color: examColor,
            description: `Active Recall Deck for ${sectionTitle}`,
            totalCards: convertedSectionCards.length,
            dueCardsCount: dueCount,
            masteredCount,
            chapterId: chapter.id,
            sectionId: section.id,
            lastStudied: new Date().toISOString(),
          });
        }
      });
    });
  });

  // Also check for any standalone milestone decks stored in localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith('milestone_recall_deck_') || key.startsWith('recall_deck_')) {
        const sectionId = key.replace('milestone_recall_deck_', '').replace('recall_deck_', '');
        const deckId = `deck-learn-cached-${sectionId}`;
        if (seenDeckIds.has(deckId)) continue;

        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const cardsList = JSON.parse(raw);
        if (!Array.isArray(cardsList) || cardsList.length === 0) continue;

        const converted: Flashcard[] = [];
        cardsList.forEach((rc, cIdx) => {
          if (!rc || rc.status === 'disabled') return;
          const frontText = rc.frontPrompt || rc.front || rc.promptQuestion || '';
          const backText = rc.backAnswer || rc.back || rc.answer || '';
          if (!frontText && !backText) return;

          const cardId = rc.id || `card-learn-${sectionId}-${cIdx + 1}`;
          if (seenCardIds.has(cardId)) return;
          seenCardIds.add(cardId);

          const interval = typeof rc.interval === 'number' && rc.interval > 0 ? rc.interval : 1;
          const repetitions = typeof rc.repetition === 'number' ? rc.repetition : rc.repetitions || 0;
          const easeFactor = typeof rc.easinessFactor === 'number' ? rc.easinessFactor : rc.easeFactor || 2.5;
          const box = Math.min(5, Math.max(1, Math.floor(interval / 3) + 1));
          const dueDate = rc.dueDate || new Date().toISOString();
          const status = interval >= 3 || repetitions >= 2 ? 'mastered' : 'learning';

          const flashcard: Flashcard = {
            id: cardId,
            deckId,
            front: frontText,
            back: backText,
            interval,
            repetitions,
            easeFactor,
            box,
            dueDate,
            status,
            subject: 'Science',
            chapter: 'Curriculum',
          };
          converted.push(flashcard);
          learnCards.push(flashcard);
        });

        if (converted.length > 0 && !seenDeckIds.has(deckId)) {
          seenDeckIds.add(deckId);
          const dueCount = converted.filter(isCardDue).length;
          const masteredCount = converted.filter((c) => c.status === 'mastered').length;

          learnDecks.push({
            id: deckId,
            title: `Learn Section Recall Deck`,
            subject: 'Science',
            color: '#4f46e5',
            description: `Active Recall Deck from Learn Section`,
            totalCards: converted.length,
            dueCardsCount: dueCount,
            masteredCount,
            sectionId,
            lastStudied: new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.warn('[learnDeckSync] Error checking standalone localStorage decks:', err);
  }

  return { learnDecks, learnCards };
}

/**
 * Bidirectional Sync: When a student reviews/rates a card on the Recall Screen or Home Screen,
 * this function updates the card's interval, repetition, and status in the Learn tab's localStorage
 * and chapter sections state so Module 3 reflects the review progress.
 */
export function syncReviewedCardToLearnStorage(
  cardId: string,
  updatedFields: Partial<Flashcard>,
  rating?: RecallRating
): void {
  try {
    let matched = false;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith('recall_deck_') || key.startsWith('milestone_recall_deck_')) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const cards = JSON.parse(raw);
        if (Array.isArray(cards) && cards.some((c: any) => c.id === cardId)) {
          matched = true;
          const nextCards = cards.map((c: any) => {
            if (c.id === cardId) {
              return {
                ...c,
                interval: updatedFields.interval !== undefined ? updatedFields.interval : c.interval,
                repetition:
                  updatedFields.repetitions !== undefined
                    ? updatedFields.repetitions
                    : c.repetition !== undefined
                    ? c.repetition + 1
                    : 1,
                easinessFactor:
                  updatedFields.easeFactor !== undefined ? updatedFields.easeFactor : c.easinessFactor,
                status:
                  (updatedFields.interval || c.interval || 1) >= 3
                    ? 'mastered'
                    : 'learning',
                dueDate: updatedFields.dueDate || c.dueDate,
                lastRating: rating === 'again' ? 'relearn' : rating === 'easy' || rating === 'good' ? 'understood' : 'relearn',
              };
            }
            return c;
          });
          localStorage.setItem(key, JSON.stringify(nextCards));
        }
      }
    }

    // Dispatch global event so components re-sync immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studyflow_cards_updated', { detail: { cardId, updatedFields } }));
    }
  } catch (err) {
    console.warn('[learnDeckSync] Failed to sync reviewed card back to Learn storage:', err);
  }
}
