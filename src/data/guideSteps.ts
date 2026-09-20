import { TourStep, GuideKey } from '../types';

export const GUIDE_STEPS: Record<GuideKey, TourStep[]> = {
  main: [], // Handled by FirstTimeWelcomeModal
  home: [
    {
      targetSelector: '[data-tour="today-study"]',
      title: "Today's Study",
      description: 'This is what StudyFlow recommends you do today.',
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="home-recall"]',
      title: 'Recall',
      description: 'Start here if you have something due for revision.',
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="home-learn"]',
      title: 'Learn',
      description: "Continue today's planned lesson or start learning something else.",
      position: 'top',
    },
    {
      targetSelector: '[data-tour="home-up-next"]',
      title: 'Up Next',
      description: 'See what is coming after today’s work.',
      position: 'top',
    },
  ],
  learn: [
    {
      targetSelector: '[data-tour="learn-today"]',
      title: "Today's Learning",
      description: 'Start here to continue what is planned for today.',
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="learn-subjects"]',
      title: 'Subject Folders',
      description: 'Browse your subjects and open any folder to study its chapters.',
      position: 'top',
    },
  ],
  chapter: [
    {
      targetSelector: '[data-tour="chapter-study-tab"]',
      title: 'Study',
      description: 'Read your material, book pages, or notes and understand the topic.',
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="chapter-revision-tab"]',
      title: 'Revision',
      description: 'Now explain what you remember in your own words with AI feedback.',
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="chapter-notes-tab"]',
      title: 'Update Notes',
      description: 'Update and finalize your notes using your learning and revision.',
      position: 'bottom',
    },
  ],
  recall: [
    {
      targetSelector: '[data-tour="recall-due-cards"]',
      title: "Today's Recall",
      description: 'Review cards and items scheduled for today to lock them into long-term memory.',
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="recall-start-btn"]',
      title: 'Start Recall',
      description: 'Tap here to begin your session. StudyFlow tests you and spaces future reviews.',
      position: 'top',
    },
  ],
  plan: [
    {
      targetSelector: '[data-tour="plan-add-exam-btn"]',
      title: 'Add Your Exam',
      description: 'Start by adding the exam you are preparing for and picking its chapters.',
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="plan-exam-list"]',
      title: 'Your Exams',
      description: 'Your scheduled exams and their chapter progress appear right here.',
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="plan-create-btn"]',
      title: 'Study Plan Status',
      description: "StudyFlow automatically schedules your daily study and recall lessons. Once created, today's work appears directly on Home!",
      position: 'top',
    },
  ],
  progress: [
    {
      targetSelector: '[data-tour="progress-readiness"]',
      title: 'Exam Readiness',
      description: 'See your real readiness scores across scheduled exams based on chapter mastery and recall retention.',
      position: 'bottom',
    },
    {
      targetSelector: '[data-tour="progress-metrics"]',
      title: 'Learning Metrics',
      description: 'Track your focus minutes, completed tasks, spaced repetition retention, and active knowledge gaps.',
      position: 'top',
    },
    {
      targetSelector: '[data-tour="progress-streak"]',
      title: 'Study Habit & Streak',
      description: 'Build consistency day by day. Consistent daily study beats stressful last-minute cramming.',
      position: 'top',
    },
  ],
};
