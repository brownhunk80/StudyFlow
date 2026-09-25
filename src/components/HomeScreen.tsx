import React, { useEffect } from 'react';
import {
  Play,
  Brain,
  BookOpen,
  Clock,
  Flame,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Plus,
} from 'lucide-react';
import { TaskItem, Exam, UserProfile, Flashcard, FlashcardDeck, SubjectItem, Chapter } from '../types';
import { isCardDue } from '../utils/spacedRepetition';
import { useOnboarding } from '../context/OnboardingContext';
import { PageGuideButton } from './guide/PageGuideButton';

interface HomeScreenProps {
  user: UserProfile;
  subjects?: SubjectItem[];
  exams?: Exam[];
  tasks?: TaskItem[];
  nextTask: TaskItem | null;
  todayProgress: {
    tasksDone: number;
    tasksTotal: number;
    focusMinutes: number;
    sessionsCount: number;
  };
  nextExam: Exam | null;
  flashcards?: Flashcard[];
  decks?: FlashcardDeck[];
  onOpenSubjectFolder: (subject: SubjectItem, exam?: Exam) => void;
  onAddSubject?: () => void;
  onStartFocusTask: (task?: TaskItem) => void;
  onOpenWhyRationale: (task: TaskItem) => void;
  onOpenExamPrep: (examId?: string) => void;
  onStartRecallSession?: (deckId?: string, subject?: string) => void;
  onNavigateToRecall?: () => void;
  onNavigateToPlan?: () => void;
  onOpenGuide?: () => void;
  onOpenChapterHub?: (chapter: Chapter, subjectName: string, exam?: Exam) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  exams = [],
  tasks = [],
  nextTask,
  nextExam,
  flashcards = [],
  decks = [],
  onAddSubject,
  onStartFocusTask,
  onStartRecallSession,
  onNavigateToRecall,
  onNavigateToPlan,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Student';
  const dueCards = (flashcards || []).filter(isCardDue);

  // Group due cards by subject for clean summary
  const dueSubjectCounts: Record<string, number> = {};
  dueCards.forEach((c) => {
    const subj = c.subject || 'General';
    dueSubjectCounts[subj] = (dueSubjectCounts[subj] || 0) + 1;
  });
  const dueSubjectNames = Object.keys(dueSubjectCounts);
  const estimatedRecallTimeMin = Math.max(2, Math.ceil(dueCards.length * 0.5));

  // Today's primary learning task
  const todayTasks = tasks.filter((t) => t.dateCategory === 'today' && !t.completed);
  const currentLearningTask = nextTask || todayTasks[0] || tasks.find((t) => !t.completed) || null;

  // Up next tasks (remaining uncompleted tasks, excluding current learning task, max 2)
  const upNextTasks = tasks
    .filter((t) => !t.completed && t.id !== currentLearningTask?.id)
    .slice(0, 2);

  // Next upcoming exam (earliest upcoming exam, strictly respecting multi-exam scheduling)
  const upcomingExam = nextExam || exams[0] || null;

  const { triggerPageTour } = useOnboarding();

  useEffect(() => {
    triggerPageTour('home');
  }, [triggerPageTour]);

  return (
    <div className="max-w-2xl mx-auto space-y-7 pb-16 pt-2">
      {/* ======================================================================= */}
      {/* 1. GREETING & PERSONAL ASSISTANT ANCHOR                                  */}
      {/* ======================================================================= */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {getGreeting()}, {firstName}
            </h1>
            <PageGuideButton guideKey="home" label="How Home works" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Here is what you should do today.
          </p>
        </div>

        {/* Streak indicator */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold shadow-2xs shrink-0">
          <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
          <span>{user.streakDays}-Day Streak</span>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 2. TODAY'S STUDY SECTION                                                */}
      {/* ======================================================================= */}
      <div data-tour="today-study" className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Today&apos;s Study
          </h2>
          <div className="flex items-center gap-3">
            {onAddSubject && (
              <button
                type="button"
                onClick={onAddSubject}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition"
                title="Create a new subject folder"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subject</span>
              </button>
            )}
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              2 priorities
            </span>
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* PRIORITY 1: TODAY'S STUDY PLAN (Primary Daily Action Center)          */}
        {/* --------------------------------------------------------------------- */}
        <div data-tour="home-learn" className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  TODAY&apos;S STUDY PLAN
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {currentLearningTask
                    ? currentLearningTask.title
                    : tasks.length === 0
                    ? 'No Study Lessons Scheduled'
                    : 'All Learning Done!'}
                </h3>
              </div>
            </div>

            {currentLearningTask ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60">
                <Clock className="w-3 h-3 text-indigo-500" />
                <span>~{currentLearningTask.durationMin || 25} min</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700">
                <Clock className="w-3 h-3" />
                <span>0 min</span>
              </span>
            )}
          </div>

          {/* Subject & Chapter Context */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-xs">
            {currentLearningTask ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-indigo-600 dark:text-indigo-400">
                    {currentLearningTask.subject}
                  </span>
                  {currentLearningTask.chapter && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {currentLearningTask.chapter}
                      </span>
                    </>
                  )}
                  {currentLearningTask.activityType && (
                    <span className="ml-auto px-2 py-0.5 rounded-md bg-white dark:bg-slate-700/80 border border-slate-200/80 dark:border-slate-600 text-[11px] font-semibold text-slate-500 dark:text-slate-300">
                      {currentLearningTask.activityType}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Study core concepts, verify your understanding, and finalize your chapter notes.
                </p>
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Add an exam in the Plan tab to generate your daily study schedule, or pick a subject folder in the Learn tab.
              </p>
            )}
          </div>

          {/* Action Button: Start Learning vs Go to Plan */}
          {currentLearningTask ? (
            <button
              onClick={() => onStartFocusTask(currentLearningTask)}
              className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>START LESSON</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigateToPlan?.()}
              className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Go to Plan</span>
            </button>
          )}
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* PRIORITY 2: RECALL                                                    */}
        {/* --------------------------------------------------------------------- */}
        <div data-tour="home-recall" className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  2. RECALL DECK
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {dueCards.length > 0
                    ? `${dueCards.length} Cards Due Today`
                    : flashcards.length === 0
                    ? 'No Cards Scheduled'
                    : 'All Caught Up!'}
                </h3>
              </div>
            </div>

            {dueCards.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
                <Clock className="w-3 h-3" />
                <span>~{estimatedRecallTimeMin} min</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
                <CheckCircle2 className="w-3 h-3" />
                <span>{flashcards.length === 0 ? 'Ready' : 'Protected'}</span>
              </span>
            )}
          </div>

          {/* Subject & Chapter Context */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2.5">
            {dueCards.length > 0 ? (
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Subjects to Review:
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {dueSubjectNames.map((subj) => (
                    <span
                      key={subj}
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-700/80 border border-slate-200/80 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                    >
                      {subj} ({dueSubjectCounts[subj]})
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                {flashcards.length === 0
                  ? 'No flashcards created yet. Creating an exam study plan or adding cards will schedule active recall sessions for you.'
                  : 'Your memory retention is fully protected for today. Cards will appear here as spaced repetition intervals mature.'}
              </p>
            )}

            {/* Decks Preview from Learn Curriculum & Vault */}
            {decks.length > 0 && (() => {
              const learnDecksList = decks.filter((d) => d.id.startsWith('deck-learn-'));
              const displayDecks = learnDecksList.length > 0 ? [...learnDecksList, ...decks.filter((d) => !d.id.startsWith('deck-learn-'))] : decks;
              
              return (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Decks ({decks.length})
                      </span>
                      {learnDecksList.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                          {learnDecksList.length} from Learn Tab
                        </span>
                      )}
                    </div>
                    {onNavigateToRecall && (
                      <button
                        type="button"
                        onClick={onNavigateToRecall}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer lowercase font-medium text-[11px]"
                      >
                        view all in recall →
                      </button>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {displayDecks.slice(0, 6).map((deck) => {
                      const deckCards = (flashcards || []).filter((c) => c.deckId === deck.id);
                      const dueCount = deckCards.filter(isCardDue).length;
                      const isLearn = deck.id.startsWith('deck-learn-');
                      return (
                        <div
                          key={deck.id}
                          onClick={() =>
                            onStartRecallSession
                              ? onStartRecallSession(deck.id)
                              : onNavigateToRecall?.()
                          }
                          className={`flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-700/60 border ${
                            isLearn
                              ? 'border-indigo-200/90 dark:border-indigo-800/80 shadow-2xs'
                              : 'border-slate-200/70 dark:border-slate-600/70'
                          } hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition group`}
                        >
                          <div className="truncate mr-2">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate text-xs">
                                {deck.title}
                              </span>
                              {isLearn && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 shrink-0">
                                  Learn
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {deck.subject} • {deckCards.length} cards{' '}
                              {dueCount > 0 ? (
                                <span className="text-rose-500 dark:text-rose-400 font-bold">
                                  • {dueCount} due today
                                </span>
                              ) : (
                                <span className="text-emerald-500 font-semibold">
                                  • ready
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] shrink-0 shadow-2xs transition">
                            {dueCount > 0 ? 'Review' : 'Practice'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Large, Obvious Primary Action */}
          <button
            onClick={() => (onStartRecallSession ? onStartRecallSession() : onNavigateToRecall?.())}
            className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>
              {dueCards.length > 0
                ? 'START RECALL'
                : flashcards.length === 0
                ? 'OPEN RECALL'
                : 'PRACTICE AHEAD'}
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 3. UP NEXT (Small, Calm, Max 2 Items)                                    */}
      {/* ======================================================================= */}
      <div data-tour="home-up-next" className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Up Next
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Later in your plan
          </span>
        </div>

        {upNextTasks.length > 0 ? (
          <div className="space-y-2">
            {upNextTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onStartFocusTask(task)}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition cursor-pointer shadow-2xs group"
              >
                <div className="space-y-0.5 truncate">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                    <span>{task.subject}</span>
                    {task.chapter && (
                      <>
                        <span>•</span>
                        <span className="truncate">{task.chapter}</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {task.title}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.durationMin}m
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/70 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center transition">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400">
            Upcoming sessions in your plan will appear here.
          </div>
        )}
      </div>

      {/* ======================================================================= */}
      {/* 4. CALM UPCOMING EXAM REMINDER (Quiet 1-line note at bottom)             */}
      {/* ======================================================================= */}
      {upcomingExam && (
        <div className="pt-2 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Upcoming: <strong className="text-slate-700 dark:text-slate-300">{upcomingExam.name} Exam</strong> in {upcomingExam.daysLeft} days
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
