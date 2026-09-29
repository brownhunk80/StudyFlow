import React, { useState, useMemo, useEffect } from 'react';
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
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Check,
} from 'lucide-react';
import { TaskItem, Exam, UserProfile, Flashcard, FlashcardDeck, SubjectItem, Chapter } from '../types';
import { isCardDue } from '../utils/spacedRepetition';
import { isInvalidSubject } from '../utils/learnDeckSync';
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
  onStartRecallSession?: (
    deckId?: string,
    subject?: string,
    forceAll?: boolean,
    singleCardId?: string
  ) => void;
  onNavigateToRecall?: () => void;
  onNavigateToPlan?: () => void;
  onOpenGuide?: () => void;
  onOpenChapterHub?: (chapter: Chapter, subjectName: string, exam?: Exam) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  user,
  subjects = [],
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

  // Helper to map and sanitize any card/deck subject to its true subject name
  const resolveCardSubject = (rawSubject?: string, cardChapter?: string): string => {
    if (rawSubject) {
      const trimmed = rawSubject.trim();
      const lower = trimmed.toLowerCase();
      if (
        lower !== 'course' &&
        lower !== 'curriculum' &&
        lower !== 'curriculam' &&
        lower !== 'general course' &&
        lower !== 'curriculum chapter' &&
        lower !== 'undefined' &&
        lower !== 'null' &&
        lower !== ''
      ) {
        return trimmed;
      }
    }

    // Attempt to match chapter across exams
    if (cardChapter) {
      for (const ex of exams || []) {
        const found = ex.chapters?.find(
          (c) => c.name.toLowerCase() === cardChapter.toLowerCase()
        );
        if (found) {
          if (found.subject && !isInvalidSubject(found.subject)) return found.subject.trim();
          if (ex.name && !isInvalidSubject(ex.name)) return ex.name.trim();
        }
      }
    }

    // Fallback to top user subject or exam
    const topSubj = subjects?.find((s) => !isInvalidSubject(s?.name))?.name;
    if (topSubj) return topSubj.trim();

    const topExam = exams?.find((e) => !isInvalidSubject(e?.name))?.name;
    if (topExam) return topExam.trim();

    return 'Science';
  };

  // 1. Gather all unique legitimate subject names (never Course or Curriculum)
  // Ensure ALL subjects from subjects array are unconditionally included and visible
  const allSubjectNames = useMemo(() => {
    const set = new Set<string>();

    // 1. Unconditionally add all study subjects so all subjects are visible
    (subjects || []).forEach((s) => {
      if (s?.name && !isInvalidSubject(s.name)) {
        set.add(s.name.trim());
      }
    });

    // 2. Add valid subjects from exams and chapters
    (exams || []).forEach((e) => {
      if (e?.name && !isInvalidSubject(e.name)) {
        set.add(e.name.trim());
      }
      (e.chapters || []).forEach((c) => {
        if (c?.subject && !isInvalidSubject(c.subject)) {
          set.add(c.subject.trim());
        }
      });
    });

    // 3. Add valid resolved subjects from flashcards and decks
    (flashcards || []).forEach((c) => {
      const s = resolveCardSubject(c.subject, c.chapter);
      if (s && !isInvalidSubject(s)) {
        set.add(s);
      }
    });

    (decks || []).forEach((d) => {
      const s = resolveCardSubject(d.subject);
      if (s && !isInvalidSubject(s)) {
        set.add(s);
      }
    });

    // If still empty, provide clean default academic subjects
    if (set.size === 0) {
      set.add('Science');
      set.add('Mathematics');
    }

    return Array.from(set).sort();
  }, [flashcards, decks, subjects, exams]);

  // Subject statistics: Total cards and Due cards per subject
  const subjectStats = useMemo(() => {
    const stats: Record<string, { total: number; due: number }> = {};
    allSubjectNames.forEach((s) => {
      stats[s] = { total: 0, due: 0 };
    });

    (flashcards || []).forEach((c) => {
      const s = resolveCardSubject(c.subject, c.chapter);
      if (!stats[s]) stats[s] = { total: 0, due: 0 };
      stats[s].total += 1;
      if (isCardDue(c)) {
        stats[s].due += 1;
      }
    });

    return stats;
  }, [flashcards, allSubjectNames]);

  // Selected subject filter: 'all' or specific subject name
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [isCardsListExpanded, setIsCardsListExpanded] = useState<boolean>(false);
  const [filterDueOnly, setFilterDueOnly] = useState<boolean>(dueCards.length > 0);
  const [searchCardQuery, setSearchCardQuery] = useState<string>('');
  const [revealedCardAnswers, setRevealedCardAnswers] = useState<Record<string, boolean>>({});

  // When subject changes, expand the cards preview if a specific subject is picked
  const handleSelectSubjectTab = (subj: string) => {
    setSelectedSubject(subj);
    if (subj !== 'all') {
      setIsCardsListExpanded(true);
    }
  };

  // Filtered flashcards list based on selectedSubject, filterDueOnly, and searchCardQuery
  const currentFilteredCards = useMemo(() => {
    return (flashcards || []).filter((c) => {
      const cardSubj = resolveCardSubject(c.subject, c.chapter);
      const matchesSubject =
        selectedSubject === 'all' ||
        cardSubj.toLowerCase().trim() === selectedSubject.toLowerCase().trim();
      if (!matchesSubject) return false;

      if (filterDueOnly && !isCardDue(c)) return false;

      if (searchCardQuery.trim()) {
        const q = searchCardQuery.toLowerCase().trim();
        const frontMatch = (c.front || '').toLowerCase().includes(q);
        const backMatch = (c.back || '').toLowerCase().includes(q);
        const chapMatch = (c.chapter || '').toLowerCase().includes(q);
        if (!frontMatch && !backMatch && !chapMatch) return false;
      }

      return true;
    });
  }, [flashcards, selectedSubject, filterDueOnly, searchCardQuery]);

  // Current scope metrics
  const activeScopeDueCount = useMemo(() => {
    if (selectedSubject === 'all') {
      return dueCards.length;
    }
    return subjectStats[selectedSubject]?.due || 0;
  }, [selectedSubject, dueCards.length, subjectStats]);

  const activeScopeTotalCount = useMemo(() => {
    if (selectedSubject === 'all') {
      return flashcards.length;
    }
    return subjectStats[selectedSubject]?.total || 0;
  }, [selectedSubject, flashcards.length, subjectStats]);

  const estimatedRecallTimeMin = Math.max(
    1,
    Math.ceil((filterDueOnly ? activeScopeDueCount : activeScopeTotalCount) * 0.5)
  );

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
      (session.type && session.type.toLowerCase().includes('recall'));

    if (isRecall) {
      return {
        badgeText: 'RECALL',
        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
        iconBg: 'bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800',
        buttonClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
        icon: <Brain className="w-4 h-4" />,
      };
    }

    return {
      badgeText: 'LEARN',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
      iconBg: 'bg-indigo-100 text-indigo-600 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800',
      buttonClass: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20',
      icon: <BookOpen className="w-4 h-4" />,
    };
  };

  const toggleRevealAnswer = (cardId: string) => {
    setRevealedCardAnswers((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ======================================================================= */}
      {/* 1. WELCOME HEADER                                                       */}
      {/* ======================================================================= */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ready to continue your study flow today?
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick streak pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 text-xs font-bold shadow-2xs">
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>{user.streakDays || 1} Day Streak</span>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* 2. TODAY'S STUDY FLOW: INTEGRATED PRIORITY 1 & 2                        */}
      {/* ======================================================================= */}
      <div className="space-y-4">
        {/* --------------------------------------------------------------------- */}
        {/* PRIORITY 1: TODAY'S STUDY SESSIONS (From Spaced Revision Plan)        */}
        {/* --------------------------------------------------------------------- */}
        <div data-tour="home-learn" className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  1. TODAY'S STUDY PLAN
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {todaySessions.length > 0
                    ? `${todaySessions.length} Study Session${todaySessions.length > 1 ? 's' : ''} Scheduled`
                    : 'No Sessions Scheduled for Today'}
                </h3>
              </div>
            </div>

            {todaySessions.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60">
                <Clock className="w-3 h-3" />
                <span>
                  ~{todaySessions.reduce((acc, s) => acc + (s.durationMin || 25), 0)} min
                </span>
              </span>
            )}
          </div>

          {/* List of Today's Scheduled Sessions */}
          {todaySessions.length > 0 ? (
            <div className="space-y-2.5">
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
        {/* PRIORITY 2: RECALL DECK WITH "ALL" & PER-SUBJECT TABS + EXPANDABLE LIST */}
        {/* --------------------------------------------------------------------- */}
        <div data-tour="home-recall" className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  2. ACTIVE RECALL DECK
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {activeScopeDueCount > 0
                    ? `${activeScopeDueCount} Cards Due ${selectedSubject !== 'all' ? `in ${selectedSubject}` : 'Today'}`
                    : activeScopeTotalCount === 0
                    ? `No Cards in ${selectedSubject !== 'all' ? selectedSubject : 'Vault'}`
                    : `All Caught Up in ${selectedSubject !== 'all' ? selectedSubject : 'All Subjects'}!`}
                </h3>
              </div>
            </div>

            {activeScopeDueCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
                <Clock className="w-3 h-3" />
                <span>~{estimatedRecallTimeMin} min</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
                <CheckCircle2 className="w-3 h-3" />
                <span>{activeScopeTotalCount === 0 ? 'Ready' : 'Protected'}</span>
              </span>
            )}
          </div>

          {/* Subject Selector Tabs & "All" Tab */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-0.5">
              <span>Select Subject to Review:</span>
              <span className="text-slate-500 font-semibold normal-case">
                {selectedSubject === 'all'
                  ? `Showing all ${flashcards.length} cards`
                  : `Filtered to ${selectedSubject} (${subjectStats[selectedSubject]?.total || 0} cards)`}
              </span>
            </div>

            {/* Segmented Filter Control with 'All' Tab + Each Subject (Wrapped so all subjects are visible) */}
            <div className="flex flex-wrap items-center gap-2 py-1">
              {/* 1. All Subjects Tab */}
              <button
                type="button"
                onClick={() => handleSelectSubjectTab('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                  selectedSubject === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>All Subjects</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                    selectedSubject === 'all'
                      ? 'bg-white/20 text-white'
                      : dueCards.length > 0
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {dueCards.length > 0 ? `${dueCards.length} due` : `${flashcards.length}`}
                </span>
              </button>

              {/* 2. Individual Subject Tabs */}
              {allSubjectNames.map((subj) => {
                const isSelected = selectedSubject.toLowerCase() === subj.toLowerCase();
                const dueCount = subjectStats[subj]?.due || 0;
                const totalCount = subjectStats[subj]?.total || 0;

                return (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => handleSelectSubjectTab(subj)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{subj}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : dueCount > 0
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {dueCount > 0 ? `${dueCount} due` : `${totalCount}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Context & Expandable Flashcards Section */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-3">
            {/* Header with Expand Toggle & Due/All filter */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCardsListExpanded((prev) => !prev)}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                >
                  <span>
                    {selectedSubject === 'all'
                      ? 'Flashcards in All Subjects'
                      : `Flashcards in ${selectedSubject}`}
                  </span>
                  <span className="text-slate-400 font-semibold tabular-nums">
                    ({currentFilteredCards.length})
                  </span>
                  {isCardsListExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Due Only vs All Cards Toggle */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-700/80 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-600">
                <button
                  type="button"
                  onClick={() => setFilterDueOnly(true)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black transition cursor-pointer ${
                    filterDueOnly
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
                  }`}
                >
                  Due Only ({activeScopeDueCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterDueOnly(false)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-black transition cursor-pointer ${
                    !filterDueOnly
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-300'
                  }`}
                >
                  All Cards ({activeScopeTotalCount})
                </button>
              </div>
            </div>

            {/* Expandable Flashcards List */}
            {isCardsListExpanded && (
              <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 animate-in fade-in duration-200">
                {/* Search Bar for Quick Card Filtering */}
                {currentFilteredCards.length > 3 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchCardQuery}
                      onChange={(e) => setSearchCardQuery(e.target.value)}
                      placeholder={`Search cards in ${selectedSubject === 'all' ? 'all subjects' : selectedSubject}...`}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {/* Cards List Items */}
                {currentFilteredCards.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {currentFilteredCards.map((card) => {
                      const isDue = isCardDue(card);
                      const isRevealed = Boolean(revealedCardAnswers[card.id]);

                      return (
                        <div
                          key={card.id}
                          className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 space-y-2 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                                  {resolveCardSubject(card.subject, card.chapter)}
                                </span>
                                {card.chapter && (
                                  <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                    {card.chapter}
                                  </span>
                                )}
                                <span
                                  className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                                    isDue
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                  }`}
                                >
                                  {isDue ? 'Due for Recall' : `Box ${card.box || 1}`}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                                {card.front}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => toggleRevealAnswer(card.id)}
                                title={isRevealed ? 'Hide answer' : 'Reveal answer preview'}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                              >
                                {isRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onStartRecallSession?.(
                                    card.deckId,
                                    resolveCardSubject(card.subject, card.chapter),
                                    true,
                                    card.id
                                  )
                                }
                                title="Practice this specific card drill"
                                className="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 text-[10px] font-black flex items-center gap-1 transition cursor-pointer border border-indigo-200/60 dark:border-indigo-800"
                              >
                                <Play className="w-2.5 h-2.5 fill-indigo-600 dark:fill-indigo-300" />
                                <span>Drill</span>
                              </button>
                            </div>
                          </div>

                          {/* Revealed Answer Box */}
                          {isRevealed && (
                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed animate-in fade-in duration-150">
                              <strong className="text-indigo-600 dark:text-indigo-400 block mb-0.5">
                                Benchmark Answer:
                              </strong>
                              {card.back}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2 text-center">
                    {filterDueOnly
                      ? `No cards currently due in ${selectedSubject === 'all' ? 'any subject' : selectedSubject}. Switch to "All Cards" to review ahead.`
                      : `No cards found for "${searchCardQuery}".`}
                  </p>
                )}
              </div>
            )}

            {/* Subject Decks Quick Link */}
            {decks.length > 0 && (() => {
              const learnDecksList = decks.filter((d) => {
                const isLearnDeck = d.id.startsWith('deck-learn-');
                if (!isLearnDeck) return false;
                const deckSubj = resolveCardSubject(d.subject);
                if (selectedSubject === 'all') return true;
                return deckSubj.toLowerCase().trim() === selectedSubject.toLowerCase().trim();
              });

              if (learnDecksList.length === 0) return null;

              return (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-indigo-500" />
                      <span>
                        {selectedSubject === 'all'
                          ? `Subject Recall Decks (${learnDecksList.length})`
                          : `${selectedSubject} Recall Decks (${learnDecksList.length})`}
                      </span>
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {learnDecksList.slice(0, 2).map((d) => {
                      const resolvedDeckSubject = resolveCardSubject(d.subject);
                      return (
                        <div
                          key={d.id}
                          onClick={() => onStartRecallSession?.(d.id, resolvedDeckSubject)}
                          className="p-2 rounded-xl bg-white dark:bg-slate-700/60 border border-slate-200/80 dark:border-slate-600/80 flex items-center justify-between gap-2 hover:border-indigo-300 dark:hover:border-indigo-600 transition cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {(d as any).name || d.title}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {d.totalCards || (d as any).cardCount || 0} cards • {resolvedDeckSubject}
                            </p>
                          </div>
                          <Play className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Primary Action Button: Start Recall for Selected Subject or All */}
          {activeScopeDueCount > 0 ? (
            <button
              onClick={() =>
                onStartRecallSession?.(
                  undefined,
                  selectedSubject === 'all' ? undefined : selectedSubject,
                  false
                )
              }
              className="w-full py-3.5 px-6 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>
                {selectedSubject === 'all'
                  ? `START RECALL (ALL SUBJECTS • ${dueCards.length} DUE)`
                  : `START RECALL FOR ${selectedSubject.toUpperCase()} (${activeScopeDueCount} DUE)`}
              </span>
            </button>
          ) : activeScopeTotalCount > 0 ? (
            <button
              onClick={() =>
                onStartRecallSession?.(
                  undefined,
                  selectedSubject === 'all' ? undefined : selectedSubject,
                  true
                )
              }
              className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {selectedSubject === 'all'
                  ? `PRACTICE ALL ${flashcards.length} CARDS`
                  : `PRACTICE ALL ${activeScopeTotalCount} CARDS IN ${selectedSubject.toUpperCase()}`}
              </span>
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
