import {
  UserProfile,
  SubjectItem,
  Exam,
  TaskItem,
  Achievement,
  Flashcard,
  FlashcardDeck,
} from '../types';

export const initialUserProfile: UserProfile = {
  name: 'Student',
  email: 'student@school.edu',
  grade: 'Grade 10',
  scholarLevel: 'Level 1 Scholar',
  xp: 0,
  nextLevelXp: 250,
  streakDays: 0,
  percentile: 0,
  avatarLetter: 'S',
};

export const initialSubjects: SubjectItem[] = [];

export const initialFlashcardDecks: FlashcardDeck[] = [];

export const initialFlashcards: Flashcard[] = [];

export const initialExams: Exam[] = [];

export const initialTasks: TaskItem[] = [];

export const initialAchievements: Achievement[] = [
  {
    id: 'ach-1',
    title: 'First Study Session',
    icon: '🎯',
    earned: false,
    progressText: 'Complete your first focus session',
  },
  {
    id: 'ach-2',
    title: 'First Recall Review',
    icon: '🔄',
    earned: false,
    progressText: 'Review your first flashcard',
  },
  {
    id: 'ach-3',
    title: '3-Day Streak',
    icon: '🔥',
    earned: false,
    progressText: 'Study 3 days in a row',
  },
  {
    id: 'ach-4',
    title: 'First Exam Scheduled',
    icon: '📅',
    earned: false,
    progressText: 'Add an upcoming exam in Plan',
  },
];

export const weeklyFocusMinutes = [
  { day: 'M', label: 'Mon', minutes: 0 },
  { day: 'T', label: 'Tue', minutes: 0 },
  { day: 'W', label: 'Wed', minutes: 0 },
  { day: 'T', label: 'Thu', minutes: 0 },
  { day: 'F', label: 'Fri', minutes: 0, active: true },
  { day: 'S', label: 'Sat', minutes: 0 },
  { day: 'S', label: 'Sun', minutes: 0 },
];
