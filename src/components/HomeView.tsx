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
  RotateCw,
  Edit3,
  Layers,
} from 'lucide-react';
import { TaskItem, Exam, UserProfile, Flashcard, FlashcardDeck, SubjectItem, Chapter } from '../types';
import { isCardDue } from '../utils/spacedRepetition';
import { useOnboarding } from '../context/OnboardingContext';
import { PageGuideButton } from './guide/PageGuideButton';
import { useStudyPlan, formatSessionChipLabel, StudySession } from '../hooks/useStudyPlan';

export interface HomeViewProps {
  user: UserProfile;
  subjects?: SubjectItem[];
  exams?: Exam[];
  tasks?: TaskItem[];
  nextTask?: TaskItem | null;
  todayProgress?: {
    tasksDone: number;
    tasksTotal: number;
    focusMinutes: number;
    sessionsCount: number;
  };
  nextExam?: Exam | null;
  flashcards?: Flashcard[];
  decks?: FlashcardDeck[];
  onOpenSubjectFolder?: (subject: SubjectItem, exam?: Exam) => void;
  onAddSubject?: () => void;
  onStartFocusTask: (task?: TaskItem) => void;
  onOpenWhyRationale?: (task: TaskItem) => void;
  onOpenExamPrep?: (examId?: string) => void;
  onStartRecallSession?: (deckId?: string, subject?: string) => void;
  onNavigateToRecall?: () => void;
  onNavigateToPlan?: () => void;
  onOpenGuide?: () => void;
  onOpenChapterHub?: (chapter: Chapter, subjectName: string, exam?: Exam) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
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

  // Access unified study plan state via reactive hook
  const { todaySessions } = useStudyPlan();

  // Up next tasks (remaining uncompleted tasks, excluding current learning tasks, max 2)
  const upNextTasks = tasks
    .filter((t) => !t.completed && !todaySessions.some((s) => s.id === t.id))
    .slice(0, 2);

  // Next upcoming exam
  const upcomingExam = nextExam || exams[0] || null;

  const { triggerPageTour } = useOnboarding();

  useEffect(() => {
    triggerPageTour('home');
  }, [triggerPageTour]);

  // Convert StudySession to a runnable TaskItem
  const convertSessionToTask = (session: StudySession): TaskItem => {
    return {
      id: session.id || `task-session-${Date.now()}`,
      title: session.title,
      subject: session.subject || 'General',
      chapter: session.chapter,
      chapterId: session.chapterId,
      durationMin: session.durationMin || 25,
      dateCategory: 'today',
      activityType: session.activityType as any,
      type: (session.type as any) || (session.activityType === 'RECALL' ? 'Recall' : 'Learn'),
      priority: (session.priority as any) || 'High Priority',
      whyRationale: session.whyRationale || 'Scheduled in daily study plan',
      completed: false,
    };
  };

  // Helper for session activity styles and icons
  const getSessionDisplay = (session: StudySession) => {
    const isRecall =
      session.activityType === 'RECALL' ||
      session.type === 'Recall' ||
      session.title.toLowerCase().includes('recall');

    const isPractice =
      session.activityType === 'PRACTICE' ||
      session.type === 'Practice' ||
      session.title.toLowerCase().includes('practice');

    if (isRecall) {
      return {
        badgeText: "Today's Recall",
        icon: <RotateCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800/60',
        badgeBg: 'bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        buttonClass: 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white',
      };
    }

    if (isPractice) {
      return {
        badgeText: "Today's Practice",
        icon: <Edit3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        iconBg: 'bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800/60',
        badgeBg: 'bg-amber-100/80 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        buttonClass: 'bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white',
      };
    }

    return {
      badgeText: "Today's Study",
      icon: <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800/60',
      badgeBg: 'bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      buttonClass: 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white',
    };
  };

  const totalTodayMinutes = todaySessions.reduce((acc, s) => acc + (s.durationMin || 25), 0);

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
      {/* 2. TODAY'S PRIORITIES (Core Daily Operating System)                      */}
      {/* ======================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Today&apos;s Priorities
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
              {todaySessions.length > 0 ? `${todaySessions.length} lessons` : '2 priorities'}
            </span>
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* PRIORITY 1: TODAY'S STUDY PLAN (Dynamic Sessions or Defensive Fallback)*/}
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
                  {todaySessions.length > 0
                    ? `${todaySessions.length} Scheduled Lesson${todaySessions.length > 1 ? 's' : ''}`
                    : 'No Study Lessons Scheduled'}
                </h3>
              </div>
            </div>

            {todaySessions.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60">
                <Clock className="w-3 h-3 text-indigo-500" />
                <span>~{totalTodayMinutes} min</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700">
                <Clock className="w-3 h-3" />
                <span>0 min</span>
              </span>
            )}
          </div>

          {/* DYNAMIC SESSIONS LIST vs DEFENSIVE FALLBACK EMPTY STATE */}
          {todaySessions.length > 0 ? (
            <div className="space-y-3 pt-1">
              {todaySessions.map((session, sIdx) => {
                const display = getSessionDisplay(session);
                const chipLabel = formatSessionChipLabel(session);

                return (
                  <div
                    key={session.id || sIdx}
                    className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${display.iconBg}`}>
                        {display.icon}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${display.badgeBg}`}>
                            {display.badgeText}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {session.chapter || session.title}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                          {chipLabel}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onStartFocusTask(convertSessionToTask(session))}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs ${display.buttonClass}`}
                    >
                      <Play className="w-3 h-3 fill-white" />
                      <span>Start</span>
                    </button>
                  </div>
                );
              })}

              {onNavigateToPlan && (
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={onNavigateToPlan}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition"
                  >
                    <span>View Full Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-xs">
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                  Add an exam in the Plan tab to generate your daily study schedule, or pick a subject folder in the Learn tab.
                </p>
              </div>

              <button
                onClick={() => onNavigateToPlan?.()}
                className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Go to Plan</span>
              </button>
            </div>
          )}
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* PRIORITY 2: RECALL DECK (Kept Intact Directly Below Priority 1)        */}
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
              if (learnDecksList.length === 0) return null;
              return (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-indigo-500" />
                      <span>Learn Curriculum Decks ({learnDecksList.length})</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {learnDecksList.slice(0, 2).map((d) => (
                      <div
                        key={d.id}
                        onClick={() => onStartRecallSession?.(d.id, d.subject)}
                        className="p-2 rounded-xl bg-white dark:bg-slate-700/60 border border-slate-200/80 dark:border-slate-600/80 flex items-center justify-between gap-2 hover:border-indigo-300 dark:hover:border-indigo-600 transition cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {(d as any).name || d.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {d.totalCards || (d as any).cardCount || 0} cards • {d.subject}
                          </p>
                        </div>
                        <Play className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Action Button: Start Recall vs Go to Recall Vault */}
          {dueCards.length > 0 ? (
            <button
              onClick={() => onStartRecallSession?.()}
              className="w-full py-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>START RECALL ({dueCards.length} DUE)</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigateToRecall?.()}
              className="w-full py-3 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Explore Flashcard Vault</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 3. UPCOMING TASKS (Coming Up Next)                                       */}
      {/* ======================================================================= */}
      {upNextTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Coming Up Next
            </h2>
            <button
              onClick={() => onNavigateToPlan?.()}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {upNextTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onStartFocusTask(task)}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-indigo-200 dark:hover:border-indigo-800/60 transition cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {task.subject} {task.chapter ? `• ${task.chapter}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    ~{task.durationMin || 25} min
                  </span>
                  <Play className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 fill-indigo-600 dark:fill-indigo-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 4. UPCOMING EXAM COUNTDOWN CARD                                          */}
      {/* ======================================================================= */}
      {upcomingExam && (
        <div className="bg-slate-900 dark:bg-slate-900/90 text-white rounded-3xl p-6 shadow-sm border border-slate-800 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
              Upcoming Exam Target
            </span>
            <h3 className="text-lg font-black tracking-tight">{upcomingExam.name}</h3>
            <p className="text-xs text-slate-400">
              Exam Date: {new Date(upcomingExam.examDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div className="text-center shrink-0">
            <div className="text-3xl font-black text-indigo-400">
              {upcomingExam.daysLeft ?? 0}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Days Left
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
