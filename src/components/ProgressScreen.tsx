import React, { useState } from 'react';
import {
  Flame,
  Target,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Brain,
  Play,
  Sparkles,
  BookOpen,
  Clock,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { Exam, Achievement, Flashcard, TaskItem } from '../types';
import { calculateExamReadiness } from '../utils/examReadiness';
import { getMemoryRetention } from '../utils/spacedRepetition';

interface ProgressScreenProps {
  exams: Exam[];
  streakDays: number;
  achievements: Achievement[];
  flashcards?: Flashcard[];
  tasks?: TaskItem[];
  onOpenExamPrep: (examId: string) => void;
  onStartRecall?: () => void;
  onStartFocusTask?: (task?: TaskItem) => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  exams,
  streakDays,
  achievements,
  flashcards = [],
  tasks = [],
  onOpenExamPrep,
  onStartRecall,
  onStartFocusTask,
}) => {
  const [selectedExamId, setSelectedExamId] = useState<string>(
    exams.find((e) => e.name.toLowerCase() === 'science')?.id || exams[0]?.id || ''
  );

  const selectedExam = exams.find((e) => e.id === selectedExamId) || exams[0];
  const detailedReadiness = selectedExam
    ? calculateExamReadiness(selectedExam, flashcards, tasks)
    : null;

  // Streak dots (14 days)
  const streakDots = Array.from({ length: 14 }, (_, i) => i + 1);

  // Total knowledge gaps across all chapters
  const totalGapsCount = exams.reduce((total, exam) => {
    return (
      total +
      (exam.chapters || []).reduce((gapSum, chap) => {
        return gapSum + (chap.knowledgeGaps ? chap.knowledgeGaps.filter((g) => g.status !== 'strong').length : 0);
      }, 0)
    );
  }, 0);

  const dueCardsCount = flashcards.filter(
    (c) => !c.dueDate || new Date(c.dueDate) <= new Date()
  ).length;

  const tasksCompleted = tasks.filter((t) => t.completed).length;
  const tasksTotal = tasks.length;
  const tasksRemaining = tasks.filter((t) => !t.completed).length;

  const avgRetention =
    flashcards.length > 0
      ? Math.round(
          flashcards.reduce((sum, c) => sum + getMemoryRetention(c), 0) / flashcards.length
        )
      : 85;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Your Progress
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Focusing on conceptual mastery, retention & real exam readiness
        </p>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: EXAM READINESS COMPARISON                                      */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Exam Readiness</span>
          </h2>
          <span className="text-[11px] text-slate-400">Multi-signal calculation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {exams.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 text-center">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                No exams scheduled yet. Head to the Plan tab to add an exam and track readiness.
              </p>
            </div>
          ) : (
            exams.map((exam) => {
              const readiness = calculateExamReadiness(exam, flashcards, tasks);
              const isSelected = selectedExam?.id === exam.id;

              return (
                <div
                  key={exam.id}
                  onClick={() => setSelectedExamId(exam.id)}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border transition-all cursor-pointer space-y-2.5 ${
                    isSelected
                      ? 'border-indigo-600 dark:border-indigo-500 shadow-md shadow-indigo-50 dark:shadow-none ring-2 ring-indigo-500/20'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {exam.name}
                    </span>
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono-digits">
                      {readiness.overallScore}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${readiness.overallScore}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{readiness.chaptersReady} / {readiness.totalChapters} chapters ready</span>
                    <span className="font-semibold text-rose-500">{exam.daysLeft}d left</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: DEEP EXAM READINESS SPOTLIGHT (Section 23)                      */}
      {/* ========================================================================= */}
      {detailedReadiness && (
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-5 sm:p-6 text-white border border-indigo-700/50 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-[10px] font-black uppercase text-indigo-200">
                  DIAGNOSTIC READINESS REPORT
                </span>
                <span className="text-xs text-indigo-300">• Exam in {detailedReadiness.daysLeft} days</span>
              </div>
              <h3 className="text-2xl font-black text-white mt-1">
                {detailedReadiness.examName} Exam Readiness: {detailedReadiness.overallScore}%
              </h3>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                "If my exam were tomorrow, how prepared am I?" — {detailedReadiness.chaptersReady} of {detailedReadiness.totalChapters} chapters ready
              </p>
            </div>

            <button
              onClick={() => onOpenExamPrep(detailedReadiness.examId)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer border border-white/20 self-start sm:self-auto"
            >
              Full Chapter Matrix
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Strong Areas */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                <span>Strong Areas</span>
              </div>
              <div className="space-y-1">
                {detailedReadiness.strongAreas.map((area, i) => (
                  <div key={i} className="text-white/90 font-medium">
                    ✓ {area}
                  </div>
                ))}
              </div>
            </div>

            {/* Needs Work */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                <span>Needs Work</span>
              </div>
              <div className="space-y-1">
                {detailedReadiness.needsWorkAreas.map((area, i) => (
                  <div key={i} className="text-white/90 font-medium">
                    ⚠ {area}
                  </div>
                ))}
              </div>
            </div>

            {/* Cards to Review */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                <Brain className="w-4 h-4" />
                <span>Cards to Review</span>
              </div>
              <div className="text-lg font-black text-white">
                {dueCardsCount > 0 ? `${dueCardsCount} cards to review` : 'All caught up!'}
              </div>
              <p className="text-[11px] text-indigo-200/70 leading-relaxed">
                Spaced repetition algorithm flagged these to prevent retention decay.
              </p>
              {onStartRecall && (
                <button
                  onClick={onStartRecall}
                  className="mt-1 text-[11px] font-bold text-indigo-300 hover:text-white underline cursor-pointer"
                >
                  Start Recall Review →
                </button>
              )}
            </div>
          </div>

          {/* Recommended Next Step Box */}
          <div className="bg-indigo-600/40 rounded-2xl p-4 border border-indigo-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>RECOMMENDED NEXT STEP</span>
              </div>
              <div className="text-sm font-bold text-white">
                {detailedReadiness.recommendedNextStep.title} — {detailedReadiness.recommendedNextStep.durationMin} min
              </div>
              <p className="text-xs text-indigo-200/90">
                "{detailedReadiness.recommendedNextStep.reason}"
              </p>
            </div>

            <button
              onClick={() => {
                if (onStartFocusTask) {
                  const targetTask =
                    tasks.find(
                      (t) =>
                        t.subject?.toLowerCase() === detailedReadiness.examName.toLowerCase() &&
                        !t.completed
                    ) || tasks.find((t) => !t.completed) || tasks[0];
                  onStartFocusTask(targetTask);
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-indigo-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer self-start sm:self-auto"
            >
              <Play className="w-3.5 h-3.5 fill-indigo-950" />
              <span>START FOCUS</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: LEARNING METRICS GRID                                          */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
          Learning Metrics
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Focus Time */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="text-xs font-semibold text-slate-400 mb-1">Focus Habit</div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono-digits">
              {streakDays * 25 + 60} <span className="text-xs font-medium text-slate-400">min logged</span>
            </div>
            <div className="text-[10px] text-emerald-600 font-bold mt-1">🔥 {streakDays} day streak</div>
          </div>

          {/* Tasks Completed */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="text-xs font-semibold text-slate-400 mb-1">Tasks Completed</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono-digits">
              {tasksCompleted} <span className="text-xs font-medium text-slate-400">/ {tasksTotal}</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{tasksRemaining} remaining</div>
          </div>

          {/* Recall Retention */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="text-xs font-semibold text-slate-400 mb-1">Recall Retention</div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono-digits">
              {avgRetention}%
            </div>
            <div className="text-[10px] text-indigo-600 font-bold mt-1">SM-2 Spaced Repetition</div>
          </div>

          {/* Knowledge Gaps */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="text-xs font-semibold text-slate-400 mb-1">Knowledge Gaps</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono-digits">
              {totalGapsCount} <span className="text-xs font-medium text-slate-400">active</span>
            </div>
            <div className="text-[10px] text-amber-600 font-bold mt-1">Targeted practice ready</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: CHAPTER PROGRESS SUMMARY                                       */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
          Chapter Progress
        </h3>

        <div className="space-y-3">
          {exams.map((exam) => {
            const readiness = calculateExamReadiness(exam, flashcards, tasks);
            const percent = Math.round((readiness.chaptersReady / readiness.totalChapters) * 100);

            return (
              <div key={exam.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {exam.name}: {readiness.chaptersReady} / {readiness.totalChapters} chapters ready
                  </span>
                  <span className="font-mono-digits font-bold text-slate-500">
                    {percent}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: exam.color || '#4f46e5',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 5: STUDY STREAK (Subtle & Non-Intrusive)                          */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-500">🔥</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {streakDays} Day Study Habit
            </h3>
          </div>
          <span className="text-xs text-slate-400">Consistency beats cramming</span>
        </div>

        <div className="flex items-center justify-between gap-1.5 overflow-x-auto py-1">
          {streakDots.map((dot) => (
            <div
              key={dot}
              className="flex-1 min-w-[18px] h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold text-amber-600 dark:text-amber-400"
            >
              ✓
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
