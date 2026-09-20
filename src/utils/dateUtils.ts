import { Exam, TaskItem } from '../types';

/**
 * Calculates remaining calendar days until exam date without timezone drift issues.
 * Uses current calendar day as baseline.
 */
export function calculateDaysRemaining(dateStr: string): number {
  if (!dateStr) return 0;
  try {
    const parts = dateStr.split('-');
    let target: Date;
    if (parts.length === 3) {
      target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      target = new Date(dateStr);
    }
    if (isNaN(target.getTime())) return 0;

    const today = new Date();
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffMs = target.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

/**
 * Formats an exam date as "21 Sep" or "2 Oct" consistently.
 */
export function formatExamDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    let target: Date;
    if (parts.length === 3) {
      target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      target = new Date(dateStr);
    }
    if (isNaN(target.getTime())) return dateStr;
    return target.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

/**
 * Formats full exam date as "21 September 2026".
 */
export function formatFullExamDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    let target: Date;
    if (parts.length === 3) {
      target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      target = new Date(dateStr);
    }
    if (isNaN(target.getTime())) return dateStr;
    return target.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
  } catch {
    return dateStr;
  }
}

/**
 * Formats readable days remaining label:
 * 0 -> "Today"
 * 1 -> "1 day left"
 * N -> "N days left"
 */
export function formatDaysRemainingLabel(days: number): string {
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

/**
 * Sorts exams chronologically with earlier exams prioritized at the top.
 */
export function sortExamsByUrgency(exams: Exam[]): Exam[] {
  return [...exams].sort((a, b) => {
    const daysA = a.examDate ? calculateDaysRemaining(a.examDate) : (a.daysLeft ?? 999);
    const daysB = b.examDate ? calculateDaysRemaining(b.examDate) : (b.daysLeft ?? 999);
    return daysA - daysB;
  });
}

/**
 * Sorts tasks so that:
 * 1. Uncompleted tasks come first
 * 2. 'today' tasks come before 'upcoming'
 * 3. Tasks for earlier exams (fewer days left) receive higher priority
 * 4. 'High Priority' tasks come before normal priority
 */
export function sortTasksByExamPriority(tasks: TaskItem[], exams: Exam[]): TaskItem[] {
  // Build lookup of normalized subject -> daysLeft
  const examDaysMap = new Map<string, number>();
  exams.forEach((e) => {
    const days = e.examDate ? calculateDaysRemaining(e.examDate) : (typeof e.daysLeft === 'number' ? e.daysLeft : 999);
    const key = e.name.trim().toLowerCase();
    examDaysMap.set(key, days);
  });

  const getTaskDays = (t: TaskItem): number => {
    const subj = (t.subject || '').trim().toLowerCase();
    if (examDaysMap.has(subj)) {
      return examDaysMap.get(subj)!;
    }
    for (const [name, days] of examDaysMap.entries()) {
      if (subj.includes(name) || name.includes(subj)) {
        return days;
      }
    }
    return 999;
  };

  return [...tasks].sort((a, b) => {
    // 1. Incomplete before completed
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    // 2. 'today' before 'upcoming'
    const aIsToday = a.dateCategory === 'today';
    const bIsToday = b.dateCategory === 'today';
    if (aIsToday !== bIsToday) {
      return aIsToday ? -1 : 1;
    }

    // 3. Exam urgency: earlier exam first!
    const daysA = getTaskDays(a);
    const daysB = getTaskDays(b);
    if (daysA !== daysB) {
      return daysA - daysB;
    }

    // 4. Priority
    const aHigh = a.priority === 'High Priority';
    const bHigh = b.priority === 'High Priority';
    if (aHigh !== bHigh) {
      return aHigh ? -1 : 1;
    }

    return 0;
  });
}
