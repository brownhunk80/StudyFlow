import { Exam, Chapter, Flashcard, ExamReadinessBreakdown, ActivityType, TaskItem } from '../types';
import { isCardDue } from './spacedRepetition';

/**
  * Calculate multi-signal exam readiness based on:
  * - Chapter Mastery (35%)
  * - Practice / Test Performance (25%)
  * - Recall Performance (20%)
  * - Student Confidence (10%)
  * - Spaced Repetition Coverage (10%)
  */
export function calculateExamReadiness(
  exam: Exam,
  allFlashcards: Flashcard[] = [],
  allTasks: TaskItem[] = []
): ExamReadinessBreakdown {
  const chapters = exam.chapters || [];
  const totalChapters = Math.max(chapters.length, 1);

  // 1. Chapter Mastery (35%)
  // Ready or Mastered chapters count as high mastery
  const chaptersReady = chapters.filter(
    (c) => c.status === 'ready' || c.status === 'mastered'
  ).length;
  
  const avgChapterMastery =
    chapters.reduce((acc, c) => {
      if (c.masteryPercentage !== undefined) return acc + c.masteryPercentage;
      if (c.status === 'mastered') return acc + 95;
      if (c.status === 'ready') return acc + 80;
      if (c.status === 'needs_practice' || c.status === 'need_work') return acc + 48;
      if (c.status === 'learning') return acc + 35;
      return acc + 10;
    }, 0) / totalChapters;

  // 2. Practice & Test Performance (25%)
  const avgPracticeTest =
    chapters.reduce((acc, c) => {
      const score = c.testScore ?? c.lastTestScore ?? c.practiceScore;
      if (score !== undefined) return acc + score;
      if (c.status === 'mastered') return acc + 90;
      if (c.status === 'ready') return acc + 75;
      return acc + 50;
    }, 0) / totalChapters;

  // 3. Recall Performance (20%)
  const examCards = allFlashcards.filter(
    (f) => f.subject.toLowerCase() === exam.name.toLowerCase()
  );
  const masteredCards = examCards.filter((f) => f.status === 'mastered').length;
  const recallScore =
    examCards.length > 0
      ? Math.round((masteredCards / examCards.length) * 100)
      : chapters.some((c) => c.verbalRecallScore)
      ? Math.round(
          chapters.reduce((acc, c) => acc + (c.verbalRecallScore || 65), 0) / totalChapters
        )
      : 70;

  // 4. Confidence (10%) - on 1-5 scale mapped to 0-100
  const avgConfidence =
    chapters.reduce((acc, c) => {
      const conf = c.confidence ?? (c.status === 'mastered' ? 5 : c.status === 'ready' ? 4 : 3);
      return acc + (conf / 5) * 100;
    }, 0) / totalChapters;

  // 5. Spaced Repetition Coverage (10%)
  const dueCardsForExam = examCards.filter(isCardDue).length;
  const reviewCoverage =
    examCards.length > 0
      ? Math.max(10, Math.round(((examCards.length - dueCardsForExam) / examCards.length) * 100))
      : 75;

  // Weighted sum
  const calculatedScore = Math.round(
    avgChapterMastery * 0.35 +
      avgPracticeTest * 0.25 +
      recallScore * 0.20 +
      avgConfidence * 0.10 +
      reviewCoverage * 0.10
  );

  // Bound to 0 - 100
  const overallScore = Math.min(Math.max(calculatedScore, 0), 100);

  // Strong vs Needs Work areas
  const strongAreas = chapters
    .filter((c) => c.status === 'mastered' || c.status === 'ready' || (c.masteryPercentage || 0) >= 70)
    .map((c) => c.name.split(' - ')[0].split(':')[0]);

  const needsWorkAreas = chapters
    .filter(
      (c) =>
        c.status === 'needs_practice' ||
        c.status === 'need_work' ||
        c.status === 'learning' ||
        c.status === 'not_started' ||
        (c.masteryPercentage || 0) < 70
    )
    .map((c) => c.name.split(' - ')[0].split(':')[0]);

  // Recommended next step
  const needWorkChapter =
    chapters.find(
      (c) =>
        c.status === 'needs_practice' ||
        c.status === 'need_work' ||
        c.status === 'learning'
    ) || chapters[0];

  const candidateTask = allTasks.find(
    (t) =>
      t.subject.toLowerCase() === exam.name.toLowerCase() &&
      !t.completed &&
      (t.chapter === needWorkChapter?.name || t.chapterId === needWorkChapter?.id)
  );

  const chapterShortName = needWorkChapter ? needWorkChapter.name.split(' - ')[0] : 'Core Concept';

  const recommendedNextStep = candidateTask
    ? {
        title: `Practice ${candidateTask.title}`,
        taskTitle: candidateTask.title,
        chapterName: candidateTask.chapter || chapterShortName,
        durationMin: candidateTask.durationMin,
        activityType: (candidateTask.activityType || 'PRACTICE') as ActivityType,
        reason:
          candidateTask.whyRationale ||
          `High priority because your ${exam.name} exam is coming up and this topic needs practice.`,
      }
    : {
        title: `Practice ${chapterShortName}`,
        taskTitle: `Learn: ${chapterShortName}`,
        chapterName: needWorkChapter?.name || 'Chapter Topics',
        durationMin: 25,
        activityType: 'PRACTICE' as ActivityType,
        reason: `Your ${exam.name} exam is approaching and ${chapterShortName} still needs practice.`,
      };

  return {
    examId: exam.id,
    examName: exam.name,
    overallScore,
    daysLeft: exam.daysLeft,
    examDate: exam.examDate,
    chaptersReady,
    totalChapters: chapters.length,
    strongAreas: strongAreas.length > 0 ? strongAreas : ['Foundations'],
    needsWorkAreas: needsWorkAreas.length > 0 ? needsWorkAreas : ['Next Chapter Review'],
    reviewDueCards: dueCardsForExam,
    recommendedNextStep,
    metrics: {
      chapterMastery: Math.round(avgChapterMastery),
      practiceTest: Math.round(avgPracticeTest),
      recallPerformance: Math.round(recallScore),
      confidence: Math.round(avgConfidence),
      spacedRepetition: Math.round(reviewCoverage),
    },
  };
}

export function formatChapterStatusLabel(status: string): string {
  switch (status) {
    case 'mastered':
      return 'Mastered';
    case 'ready':
      return 'Ready';
    case 'needs_practice':
    case 'need_work':
      return 'Needs Practice';
    case 'learning':
      return 'Learning';
    case 'not_started':
    default:
      return 'Not Started';
  }
}

export function getChapterStatusColor(status: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (status) {
    case 'mastered':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/60',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
      };
    case 'ready':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/60',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        dot: 'bg-blue-500',
      };
    case 'needs_practice':
    case 'need_work':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/60',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
      };
    case 'learning':
      return {
        bg: 'bg-purple-50 dark:bg-purple-950/60',
        text: 'text-purple-700 dark:text-purple-300',
        border: 'border-purple-200 dark:border-purple-800',
        dot: 'bg-purple-500',
      };
    case 'not_started':
    default:
      return {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400',
      };
  }
}
