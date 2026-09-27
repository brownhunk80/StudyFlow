import { useState, useEffect, useCallback } from 'react';
import { TaskItem, Flashcard } from '../types';
import { isCardDue } from '../utils/spacedRepetition';

export interface StudySession {
  id: string;
  title: string;
  subject: string;
  chapter?: string;
  chapterId?: string;
  durationMin: number;
  activityType?: 'LEARN' | 'RECALL' | 'PRACTICE' | 'TEST' | string;
  type?: 'Learn' | 'Recall' | 'Practice' | 'Revise' | 'Test' | string;
  dateCategory?: 'today' | 'upcoming';
  scheduledDate?: string;
  completed?: boolean;
  priority?: 'High Priority' | 'Medium' | 'Normal' | string;
  whyRationale?: string;
  examCountdown?: string;
  [key: string]: any;
}

export interface StudyPlan {
  id?: string;
  examId?: string;
  examName?: string;
  generatedAt?: string;
  todaySessions: StudySession[];
  upcomingSessions?: StudySession[];
  slots?: any[];
  tasks?: TaskItem[];
  [key: string]: any;
}

const STORAGE_KEY = 'study_plan';
const TASKS_KEY = 'studyflow_tasks';

/**
 * Format a session into a clean chip label:
 * e.g., "Today's Study • 40 min • SST CH-1" or "Today's Recall • 20 min • SST CH-1"
 */
export function formatSessionChipLabel(session: StudySession): string {
  const isRecall =
    session.activityType === 'RECALL' ||
    session.type === 'Recall' ||
    session.title.toLowerCase().includes('recall');

  const isPractice =
    session.activityType === 'PRACTICE' ||
    session.type === 'Practice' ||
    session.title.toLowerCase().includes('practice');

  const typePrefix = isRecall
    ? "Today's Recall"
    : isPractice
    ? "Today's Practice"
    : "Today's Study";

  const durationStr = `${session.durationMin || 25} min`;
  const contextStr =
    session.chapter ||
    session.subject ||
    session.title.replace(/^(Study|Learn|Recall|Active Recall|Practice|Revise):\s*/i, '');

  return `${typePrefix} • ${durationStr} • ${contextStr}`;
}

/**
 * Helper to safely parse JSON from localStorage
 */
function readStoragePlan(): StudyPlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as StudyPlan;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fallback to extract today's tasks from studyflow_tasks if study_plan key isn't populated yet
 */
function readFallbackTodayTasks(): StudySession[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((t: TaskItem) => t.dateCategory === 'today' && !t.completed)
        .map((t: TaskItem) => ({
          id: t.id,
          title: t.title,
          subject: t.subject,
          chapter: t.chapter,
          chapterId: t.chapterId,
          durationMin: t.durationMin || 25,
          activityType: t.activityType || (t.type === 'Recall' ? 'RECALL' : 'LEARN'),
          type: t.type,
          dateCategory: 'today',
          completed: t.completed,
          priority: t.priority,
          whyRationale: t.whyRationale,
        }));
    }
    return [];
  } catch {
    return [];
  }
}

export function useStudyPlan() {
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(() => readStoragePlan());

  // Load and synchronize plan state from localStorage and events
  const syncPlanFromStorage = useCallback(() => {
    const plan = readStoragePlan();
    setStudyPlan(plan);
  }, []);

  useEffect(() => {
    // Initial sync
    syncPlanFromStorage();

    // Listen to cross-tab storage changes and custom application events
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === STORAGE_KEY || e.key === TASKS_KEY) {
        syncPlanFromStorage();
      }
    };

    const handlePlanUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail === 'object') {
        setStudyPlan(customEvent.detail);
      } else {
        syncPlanFromStorage();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('studyflow_plan_updated', handlePlanUpdated);
    window.addEventListener('studyflow_cards_updated', syncPlanFromStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('studyflow_plan_updated', handlePlanUpdated);
      window.removeEventListener('studyflow_cards_updated', syncPlanFromStorage);
    };
  }, [syncPlanFromStorage]);

  // Derived todaySessions:
  // 1. From studyPlan.todaySessions (if defined and non-empty)
  // 2. Or from studyPlan.slots / tasks where dateCategory is today
  // 3. Or defensive fallback to active tasks in storage
  const todaySessions: StudySession[] = (() => {
    if (studyPlan && Array.isArray(studyPlan.todaySessions) && studyPlan.todaySessions.length > 0) {
      return studyPlan.todaySessions.filter((s) => !s.completed);
    }
    if (studyPlan && Array.isArray(studyPlan.tasks)) {
      const filtered = studyPlan.tasks.filter(
        (t: any) => t.dateCategory === 'today' && !t.completed
      );
      if (filtered.length > 0) return filtered;
    }
    // Fallback to studyflow_tasks in localStorage
    return readFallbackTodayTasks();
  })();

  const upcomingSessions: StudySession[] = (() => {
    if (studyPlan && Array.isArray(studyPlan.upcomingSessions)) {
      return studyPlan.upcomingSessions;
    }
    if (studyPlan && Array.isArray(studyPlan.tasks)) {
      return studyPlan.tasks.filter((t: any) => t.dateCategory !== 'today');
    }
    return [];
  })();

  // Method to programmatically save or update study_plan
  const savePlan = useCallback((newPlan: StudyPlan) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPlan));
    } catch (e) {
      console.warn('[useStudyPlan] Failed to save study_plan:', e);
    }
    setStudyPlan(newPlan);
    window.dispatchEvent(new CustomEvent('studyflow_plan_updated', { detail: newPlan }));
    window.dispatchEvent(new Event('storage'));
  }, []);

  // Method to mark a session as completed
  const markSessionCompleted = useCallback(
    (sessionId: string) => {
      if (studyPlan) {
        const updatedToday = (studyPlan.todaySessions || []).map((s) =>
          s.id === sessionId ? { ...s, completed: true } : s
        );
        const updatedPlan: StudyPlan = {
          ...studyPlan,
          todaySessions: updatedToday,
        };
        savePlan(updatedPlan);
      }
    },
    [studyPlan, savePlan]
  );

  return {
    studyPlan,
    todaySessions,
    upcomingSessions,
    hasPlan: todaySessions.length > 0 || (studyPlan !== null && (studyPlan.todaySessions?.length ?? 0) > 0),
    savePlan,
    markSessionCompleted,
    refreshPlan: syncPlanFromStorage,
  };
}

// ============================================================================
// REGRESSION & DIAGNOSTIC TEST HARNESS (Requirement 3)
// Attached to window.__TEST_STUDYFLOW__.triggerPlanSyncTest()
// ============================================================================
if (typeof window !== 'undefined') {
  const globalObj = window as any;
  globalObj.__TEST_STUDYFLOW__ = globalObj.__TEST_STUDYFLOW__ || {};

  globalObj.__TEST_STUDYFLOW__.triggerPlanSyncTest = () => {
    const testPlan: StudyPlan = {
      id: `plan-sync-test-${Date.now()}`,
      examName: 'SST Board Exam',
      generatedAt: new Date().toISOString(),
      todaySessions: [
        {
          id: `sess-${Date.now()}-1`,
          title: "Today's Study • 40 min • SST CH-1",
          subject: 'Social Science',
          chapter: 'SST CH-1',
          durationMin: 40,
          activityType: 'LEARN',
          type: 'Learn',
          dateCategory: 'today',
          completed: false,
          whyRationale: 'Foundational concepts and chapter notes',
          priority: 'High Priority',
        },
        {
          id: `sess-${Date.now()}-2`,
          title: "Today's Recall • 20 min • SST CH-1",
          subject: 'Social Science',
          chapter: 'SST CH-1',
          durationMin: 20,
          activityType: 'RECALL',
          type: 'Recall',
          dateCategory: 'today',
          completed: false,
          whyRationale: 'Active retrieval practice and memory reinforcement',
          priority: 'High Priority',
        },
      ],
      upcomingSessions: [
        {
          id: `sess-${Date.now()}-3`,
          title: "Tomorrow's Practice • 30 min • SST CH-2",
          subject: 'Social Science',
          chapter: 'SST CH-2',
          durationMin: 30,
          activityType: 'PRACTICE',
          type: 'Practice',
          dateCategory: 'upcoming',
          completed: false,
          priority: 'Medium',
        },
      ],
    };

    try {
      localStorage.setItem('study_plan', JSON.stringify(testPlan));
    } catch (e) {
      console.warn('[triggerPlanSyncTest] Error saving to localStorage:', e);
    }

    // Broadcast across windows and components
    window.dispatchEvent(new CustomEvent('studyflow_plan_updated', { detail: testPlan }));
    window.dispatchEvent(new Event('storage'));

    console.log(
      '✅ [StudyFlow Sync Test] Plan regenerated and synchronized to localStorage("study_plan"):',
      testPlan
    );
    return testPlan;
  };

  // Requirement 3: Safety Assertion Test for Recall Metrics
  globalObj.__TEST_STUDYFLOW__.verifyRecallMetrics = () => {
    let allCards: Flashcard[] = [];
    try {
      const raw =
        localStorage.getItem('studyflow_cards') ||
        localStorage.getItem('studyflow_flashcards');
      if (raw) {
        allCards = JSON.parse(raw);
      }
    } catch {}

    if (!Array.isArray(allCards) || allCards.length === 0) {
      const now = new Date();
      const past = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const future = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();

      allCards = [
        {
          id: 'test-card-1',
          front: 'What is SM-2?',
          frontPrompt: 'What is SM-2?',
          back: 'Spaced repetition',
          backAnswer: 'Spaced repetition',
          subject: 'Science',
          interval: 1,
          repetition: 1,
          repetitions: 1,
          easeFactor: 2.5,
          status: 'learning',
          dueDate: past,
          box: 1,
        } as any,
        {
          id: 'test-card-2',
          front: 'Active Recall',
          frontPrompt: 'Active Recall',
          back: 'Testing memory',
          backAnswer: 'Testing memory',
          subject: 'Science',
          interval: 3,
          repetition: 2,
          repetitions: 2,
          easeFactor: 2.6,
          status: 'review',
          dueDate: past,
          box: 2,
        } as any,
        {
          id: 'test-card-3',
          front: 'Future Concept',
          frontPrompt: 'Future Concept',
          back: 'Later review',
          backAnswer: 'Later review',
          subject: 'Math',
          interval: 10,
          repetition: 4,
          repetitions: 4,
          easeFactor: 2.5,
          status: 'mastered',
          dueDate: future,
          box: 4,
        } as any,
      ];
    }

    // 1. Snapshot intervals and card state before launching
    const snapshots = allCards.map((c) => ({
      id: c.id,
      interval: c.interval,
      repetitions: c.repetitions,
      easeFactor: c.easeFactor,
      dueDate: c.dueDate,
    }));

    // 2. Identify due cards
    const dueCards = allCards.filter(isCardDue);
    const expectedMinutes = Math.max(1, Math.round(dueCards.length * 0.5));

    // 3. Verify no premature mutation on read / filter
    let isUnmutated = true;
    snapshots.forEach((snap) => {
      const card = allCards.find((c) => c.id === snap.id);
      if (
        !card ||
        card.interval !== snap.interval ||
        card.repetitions !== snap.repetitions ||
        card.easeFactor !== snap.easeFactor ||
        card.dueDate !== snap.dueDate
      ) {
        isUnmutated = false;
      }
    });

    const report = {
      success: isUnmutated,
      dueCardsCount: dueCards.length,
      estimatedMinutes: expectedMinutes,
      unmutatedPrematurely: isUnmutated,
      dueCards: dueCards.map((c) => ({ id: c.id, interval: c.interval, dueDate: c.dueDate })),
      message: isUnmutated
        ? `✅ [Recall Metrics Assertion Passed] START RECALL receives ${dueCards.length} due cards (~${expectedMinutes} mins). Intervals remain intact and unmutated before review.`
        : '❌ [Recall Metrics Assertion Failed] Card intervals were mutated prematurely prior to review rating.',
    };

    console.log(report.message, report);
    return report;
  };
}
