import { Exam, Flashcard, FlashcardDeck, Section, RecallRating, SubjectItem } from '../types';
import { isCardDue } from './spacedRepetition';

export interface LearnSyncResult {
  learnDecks: FlashcardDeck[];
  learnCards: Flashcard[];
}

// Helper to check if a subject string is a meaningless placeholder
export const isInvalidSubject = (name?: string): boolean => {
  if (!name) return true;
  const l = name.toLowerCase().trim();
  return (
    l === 'course' ||
    l === 'curriculum' ||
    l === 'curriculam' ||
    l === 'general course' ||
    l === 'curriculum chapter' ||
    l === 'undefined' ||
    l === 'null' ||
    l === ''
  );
};

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
      back: `${t0} represents the core concept in ${secTitle}. It defines key principles and establishes foundational criteria for understanding the material.`,
    },
    {
      id: `card-learn-${section.id}-2`,
      front: `What core principle or operational rule applies to ${secTitle}?`,
      back: `It establishes the essential framework and relationship that governs outcomes and practical applications within ${secTitle}.`,
    },
    {
      id: `card-learn-${section.id}-3`,
      front: `What is the most frequent examination misconception regarding ${t1}?`,
      back: `A common error is confusing ${t1} with adjacent terms or providing vague generalizations without addressing the specific criteria taught in ${secTitle}.`,
    },
    {
      id: `card-learn-${section.id}-4`,
      front: `Describe the standard analytical framework for evaluating ${t2}.`,
      back: `1. Define primary criteria and objectives.\n2. Apply the specific rules and contextual distinctions established in ${secTitle}.\n3. Verify against edge cases or common limitations.`,
    },
    {
      id: `card-learn-${section.id}-5`,
      front: `How does understanding ${secTitle} connect with broader concepts in ${chapterName}?`,
      back: `${secTitle} provides the essential conceptual foundation that supports advanced analysis and thematic connections throughout ${chapterName}.`,
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
export function extractLearnTabDecksAndCards(
  exams: Exam[] = [],
  subjects: SubjectItem[] = []
): LearnSyncResult {
  const learnDecks: FlashcardDeck[] = [];
  const learnCards: Flashcard[] = [];
  const seenCardIds = new Set<string>();
  const seenDeckIds = new Set<string>();
  const seenSectionIds = new Set<string>();

  // Collect subjects from props plus any stored in localStorage
  const subjectList: SubjectItem[] = Array.isArray(subjects) ? [...subjects] : [];
  const storedSubjects = safeGetLocalStorage('studyflow_subjects');
  if (Array.isArray(storedSubjects)) {
    storedSubjects.forEach((s) => {
      if (s?.name && !subjectList.some((item) => item.name.toLowerCase() === s.name.toLowerCase())) {
        subjectList.push(s);
      }
    });
  }

  // Determine top fallback subject (never 'Course' or 'Curriculum')
  const defaultFallbackSubject =
    subjectList.find((s) => !isInvalidSubject(s.name))?.name || 'Science';

  // Collect exams from props plus any stored in localStorage
  const examMap = new Map<string, Exam>();
  if (Array.isArray(exams)) {
    exams.forEach((e) => {
      if (e?.id) examMap.set(e.id, e);
    });
  }
  const storedExams = safeGetLocalStorage('studyflow_exams');
  if (Array.isArray(storedExams)) {
    storedExams.forEach((e) => {
      if (e?.id) {
        if (!examMap.has(e.id)) {
          examMap.set(e.id, e);
        } else {
          // Merge chapters
          const existing = examMap.get(e.id)!;
          const mergedChaps = [...(existing.chapters || [])];
          (e.chapters || []).forEach((c: any) => {
            if (!mergedChaps.some((mc) => mc.id === c.id)) {
              mergedChaps.push(c);
            }
          });
          examMap.set(e.id, { ...existing, chapters: mergedChaps });
        }
      }
    });
  }

  const combinedExamsList: Exam[] = Array.from(examMap.values());

  // Map each chapter ID to its known chapter name, subject name, and accent color
  const chapterInfoMap = new Map<
    string,
    { chapterName: string; subjectName: string; color: string }
  >();

  combinedExamsList.forEach((exam) => {
    // Resolve subject name for the exam
    let examSubject = defaultFallbackSubject;
    const matchedSubject = subjectList.find(
      (s) =>
        s.id === (exam as any).subjectId ||
        s.name.toLowerCase() === exam.name.toLowerCase() ||
        (s.name === 'Maths' && exam.name.toLowerCase().includes('math')) ||
        (s.name === 'Science' && exam.name.toLowerCase().includes('sci')) ||
        (s.name === 'English' && exam.name.toLowerCase().includes('eng')) ||
        (s.name === 'Social Science' && exam.name.toLowerCase().includes('soc')) ||
        (s.name.includes('Hindi') && exam.name.toLowerCase().includes('hin'))
    );

    if (matchedSubject?.name && !isInvalidSubject(matchedSubject.name)) {
      examSubject = matchedSubject.name;
    } else if (exam.name && !isInvalidSubject(exam.name)) {
      examSubject = exam.name;
    }

    const examColor = exam.color || '#4f46e5';

    (exam.chapters || []).forEach((chap) => {
      if (!chap?.id) return;
      const chapSubject =
        chap.subject && !isInvalidSubject(chap.subject) ? chap.subject : examSubject;
      chapterInfoMap.set(chap.id, {
        chapterName: chap.name || 'Chapter',
        subjectName: chapSubject,
        color: examColor,
      });
    });
  });

  // Build section to chapter/subject metadata lookup from all cached milestones
  const sectionMetaMap = new Map<
    string,
    { sectionTitle: string; chapterName: string; subjectName: string; color?: string }
  >();

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('chapter_milestones_')) {
        const chapId = key.replace('chapter_milestones_', '');
        const chapInfo = chapterInfoMap.get(chapId);
        const raw = localStorage.getItem(key);
        if (raw) {
          const milestones = JSON.parse(raw);
          if (Array.isArray(milestones)) {
            milestones.forEach((m: any) => {
              if (m?.id) {
                const sectionTitle = m.title || `Milestone ${m.milestoneNumber || 1}`;
                const resolvedChapter =
                  m.chapterName && !isInvalidSubject(m.chapterName)
                    ? m.chapterName
                    : chapInfo?.chapterName || 'Chapter';
                const resolvedSubj =
                  m.subjectName && !isInvalidSubject(m.subjectName)
                    ? m.subjectName
                    : chapInfo?.subjectName || defaultFallbackSubject;

                sectionMetaMap.set(m.id, {
                  sectionTitle,
                  chapterName: resolvedChapter,
                  subjectName: resolvedSubj,
                  color: chapInfo?.color,
                });
              }
            });
          }
        }
      }
    }
  } catch {}

  // Scan through all exams and chapters
  combinedExamsList.forEach((exam) => {
    const examColor = exam.color || '#4f46e5';

    (exam.chapters || []).forEach((chapter) => {
      const chapInfo = chapterInfoMap.get(chapter.id);
      const chapterSubject =
        chapInfo?.subjectName ||
        (chapter.subject && !isInvalidSubject(chapter.subject)
          ? chapter.subject
          : !isInvalidSubject(exam.name)
          ? exam.name
          : defaultFallbackSubject);
      const chapterTitle = chapter.name || 'Chapter';

      // Check chapter.sections, chapter.milestones, plus localStorage cache
      const cachedSections = safeGetLocalStorage(`chapter_milestones_${chapter.id}`);
      const rawSections: Section[] =
        (Array.isArray(cachedSections) && cachedSections.length > 0 && cachedSections) ||
        (Array.isArray(chapter.sections) && chapter.sections.length > 0 && chapter.sections) ||
        (Array.isArray(chapter.milestones) && chapter.milestones.length > 0 && chapter.milestones) ||
        [];

      rawSections.forEach((section, sIdx) => {
        if (!section || !section.id) return;
        seenSectionIds.add(section.id);

        const deckId = `deck-learn-${chapter.id}-${section.id}`;
        const sectionTitle = section.title || `Section ${section.sectionNumber || sIdx + 1}`;
        const deckTitle = `${chapterTitle}: ${sectionTitle}`;

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
            chapterTitle,
            chapterSubject,
            deckId
          );
          rawCards = generatedDefaults;
        }

        const convertedSectionCards: Flashcard[] = [];

        rawCards.forEach((rc, cIdx) => {
          if (!rc || rc.status === 'disabled') return;

          const rawFront =
            (typeof rc.front === 'string' && rc.front.trim()) ||
            (typeof rc.frontPrompt === 'string' && rc.frontPrompt.trim()) ||
            (typeof rc.promptQuestion === 'string' && rc.promptQuestion.trim()) ||
            (typeof rc.problemStatement === 'string' && rc.problemStatement.trim()) ||
            (typeof rc.question === 'string' && rc.question.trim()) ||
            (typeof rc.prompt === 'string' && rc.prompt.trim()) ||
            (typeof rc.questionText === 'string' && rc.questionText.trim()) ||
            '';

          const rawBack =
            (typeof rc.back === 'string' && rc.back.trim()) ||
            (typeof rc.backAnswer === 'string' && rc.backAnswer.trim()) ||
            (typeof rc.answer === 'string' && rc.answer.trim()) ||
            (typeof rc.expectedAnswer === 'string' && rc.expectedAnswer.trim()) ||
            (typeof rc.inlineAnswer === 'string' && rc.inlineAnswer.trim()) ||
            (typeof rc.modelAnswer === 'string' && rc.modelAnswer.trim()) ||
            (typeof rc.sampleAnswer === 'string' && rc.sampleAnswer.trim()) ||
            '';

          if (!rawFront && !rawBack) return;

          const frontText =
            rawFront ||
            `State the foundational definition and primary significance of ${rc.parentConcept || rc.parentBullet || sectionTitle}.`;
          const backText =
            rawBack ||
            `Essential concept and operational relationship in ${sectionTitle}.`;

          const cardId = rc.id || `card-learn-${section.id}-${cIdx + 1}`;
          if (seenCardIds.has(cardId)) return;
          seenCardIds.add(cardId);

          const interval = typeof rc.interval === 'number' && rc.interval > 0 ? rc.interval : 1;
          const repetitions = typeof rc.repetition === 'number' ? rc.repetition : rc.repetitions || 0;
          const easeFactor = typeof rc.easinessFactor === 'number' ? rc.easinessFactor : rc.easeFactor || 2.5;
          const box = Math.min(5, Math.max(1, Math.floor(interval / 3) + 1));
          const dueDate = rc.dueDate || new Date().toISOString();
          const status = interval >= 3 || repetitions >= 2 ? 'mastered' : 'learning';

          const cardSubject =
            rc.subject && !isInvalidSubject(rc.subject) ? rc.subject : chapterSubject;
          const cardChapter =
            rc.chapter && !isInvalidSubject(rc.chapter) ? rc.chapter : chapterTitle;

          const flashcard: Flashcard = {
            id: cardId,
            deckId,
            front: frontText,
            back: backText,
            notes: rc.notes || rc.explanation,
            interval,
            repetitions,
            easeFactor,
            box,
            dueDate,
            status,
            subject: cardSubject,
            chapter: cardChapter,
            cardType: rc.cardType,
            problemStatement: rc.problemStatement,
            expectedAnswer: rc.expectedAnswer,
            acceptableAnswers: rc.acceptableAnswers,
            formulaUsed: rc.formulaUsed,
            givenData: rc.givenData,
            stepByStepDerivation: rc.stepByStepDerivation,
            isMathProblem: rc.cardType === 'math_problem' || rc.isMathProblem === true,
            parentConcept: rc.parentConcept || rc.parentBullet || sectionTitle,
            milestoneTitle: sectionTitle,
            sectionId: section.id,
            chapterId: chapter.id,
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
            subject: chapterSubject,
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

  // Also check for any standalone milestone decks stored in localStorage not already captured
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith('milestone_recall_deck_') || key.startsWith('recall_deck_')) {
        const sectionId = key.replace('milestone_recall_deck_', '').replace('recall_deck_', '');
        if (seenSectionIds.has(sectionId)) continue;
        seenSectionIds.add(sectionId);

        const deckId = `deck-learn-cached-${sectionId}`;
        if (seenDeckIds.has(deckId)) continue;

        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const cardsList = JSON.parse(raw);
        if (!Array.isArray(cardsList) || cardsList.length === 0) continue;

        const meta = sectionMetaMap.get(sectionId);
        const resolvedChapter =
          meta?.chapterName && !isInvalidSubject(meta.chapterName)
            ? meta.chapterName
            : 'Chapter';
        const resolvedSubj =
          meta?.subjectName && !isInvalidSubject(meta.subjectName)
            ? meta.subjectName
            : defaultFallbackSubject;
        const resolvedTitle = meta?.sectionTitle
          ? `${resolvedChapter}: ${meta.sectionTitle}`
          : `Learn Recall Deck (${sectionId.slice(-6)})`;

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

          const cardSubject =
            rc.subject && !isInvalidSubject(rc.subject) ? rc.subject : resolvedSubj;
          const cardChapter =
            rc.chapter && !isInvalidSubject(rc.chapter) ? rc.chapter : resolvedChapter;

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
            subject: cardSubject,
            chapter: cardChapter,
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
            title: resolvedTitle,
            subject: resolvedSubj,
            color: meta?.color || '#6366f1',
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

  // Final sanitization pass: guarantee no card or deck ever carries a placeholder subject
  learnCards.forEach((c) => {
    if (isInvalidSubject(c.subject)) {
      c.subject = defaultFallbackSubject;
    }
    if (isInvalidSubject(c.chapter)) {
      c.chapter = 'Chapter';
    }
  });

  learnDecks.forEach((d) => {
    if (isInvalidSubject(d.subject)) {
      d.subject = defaultFallbackSubject;
    }
  });

  return { learnDecks, learnCards };
}

/**
 * Bidirectional Sync: When a student reviews/rates a card on the Recall Screen or Home Screen,
 * this function updates the card's interval, repetition, and status in the Learn tab's localStorage,
 * standalone milestone decks, and chapter sections state so Module 3 reflects the review progress.
 */
export function syncReviewedCardToLearnStorage(
  cardId: string,
  updatedFields: Partial<Flashcard>,
  rating?: RecallRating,
  context?: { chapterId?: string; milestoneId?: string; sectionId?: string }
): void {
  try {
    let matched = false;

    // 1. Direct sectionId lookup if provided or extractable from cardId
    let targetSectionId = context?.sectionId || context?.milestoneId;
    if (!targetSectionId && cardId.startsWith('card-learn-')) {
      const parts = cardId.replace('card-learn-', '').split('-');
      if (parts.length >= 1) {
        targetSectionId = parts.slice(0, parts.length - 1).join('-');
      }
    }

    // Helper to update a cards array cleanly
    const updateCardsArray = (cards: any[]) => {
      if (!Array.isArray(cards)) return cards;
      return cards.map((c: any) => {
        if (c.id === cardId || (targetSectionId && c.sectionId === targetSectionId && c.front === updatedFields.front)) {
          matched = true;
          const nextInterval = updatedFields.interval !== undefined ? updatedFields.interval : c.interval || 1;
          const nextRepetition =
            updatedFields.repetitions !== undefined
              ? updatedFields.repetitions
              : typeof c.repetition === 'number'
              ? c.repetition + 1
              : typeof c.repetitions === 'number'
              ? c.repetitions + 1
              : 1;
          const nextEase =
            updatedFields.easeFactor !== undefined
              ? updatedFields.easeFactor
              : typeof c.easinessFactor === 'number'
              ? c.easinessFactor
              : c.easeFactor || 2.5;

          const nextStatus = nextInterval >= 3 || nextRepetition >= 2 ? 'mastered' : 'learning';

          return {
            ...c,
            interval: nextInterval,
            repetition: nextRepetition,
            repetitions: nextRepetition,
            easinessFactor: nextEase,
            easeFactor: nextEase,
            status: nextStatus,
            dueDate: updatedFields.dueDate || c.dueDate || new Date().toISOString(),
            lastReviewed: updatedFields.lastReviewed || new Date().toISOString(),
            lastRating:
              rating === 'again'
                ? 'relearn'
                : rating === 'easy' || rating === 'good'
                ? 'understood'
                : 'relearn',
          };
        }
        return c;
      });
    };

    // 2. Scan all localStorage keys for milestone recall decks
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith('recall_deck_') || key.startsWith('milestone_recall_deck_') || (targetSectionId && key.includes(targetSectionId))) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const cards = JSON.parse(raw);
          if (Array.isArray(cards)) {
            const hasMatch = cards.some((c: any) => c.id === cardId || (c.front && c.front === updatedFields.front));
            if (hasMatch) {
              const nextCards = updateCardsArray(cards);
              localStorage.setItem(key, JSON.stringify(nextCards));
            }
          }
        } catch {}
      }
    }

    // 3. Update in studyflow_exams if present inside chapter sections
    const rawExams = localStorage.getItem('studyflow_exams');
    if (rawExams) {
      try {
        const exams = JSON.parse(rawExams);
        if (Array.isArray(exams)) {
          let examsModified = false;
          const updatedExams = exams.map((exam: any) => {
            const chapters = Array.isArray(exam.chapters)
              ? exam.chapters.map((chap: any) => {
                  const sections = Array.isArray(chap.sections)
                    ? chap.sections.map((sec: any) => {
                        let secModified = false;
                        let newRecallDeck = sec.recallDeck;
                        let newFlashcards = sec.flashcards;

                        if (Array.isArray(sec.recallDeck) && sec.recallDeck.some((c: any) => c.id === cardId || c.front === updatedFields.front)) {
                          newRecallDeck = updateCardsArray(sec.recallDeck);
                          secModified = true;
                        }
                        if (Array.isArray(sec.flashcards) && sec.flashcards.some((c: any) => c.id === cardId || c.front === updatedFields.front)) {
                          newFlashcards = updateCardsArray(sec.flashcards);
                          secModified = true;
                        }

                        if (secModified) {
                          examsModified = true;
                          return { ...sec, recallDeck: newRecallDeck, flashcards: newFlashcards };
                        }
                        return sec;
                      })
                    : chap.sections;
                  return { ...chap, sections };
                })
              : exam.chapters;
            return { ...exam, chapters };
          });

          if (examsModified) {
            localStorage.setItem('studyflow_exams', JSON.stringify(updatedExams));
          }
        }
      } catch (e) {
        console.warn('[learnDeckSync] Error updating studyflow_exams:', e);
      }
    }

    // 4. Update in studyflow_flashcards if present in general vault
    const rawVault = localStorage.getItem('studyflow_flashcards');
    if (rawVault) {
      try {
        const vault = JSON.parse(rawVault);
        if (Array.isArray(vault) && vault.some((c: any) => c.id === cardId)) {
          const nextVault = vault.map((c: any) => {
            if (c.id === cardId) {
              return {
                ...c,
                ...updatedFields,
                lastRating: rating,
              };
            }
            return c;
          });
          localStorage.setItem('studyflow_flashcards', JSON.stringify(nextVault));
        }
      } catch {}
    }

    // Dispatch global event so components re-sync immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('studyflow_cards_updated', {
          detail: { cardId, updatedFields, rating, context },
        })
      );
    }
  } catch (err) {
    console.warn('[learnDeckSync] Failed to sync reviewed card back to Learn storage:', err);
  }
}
