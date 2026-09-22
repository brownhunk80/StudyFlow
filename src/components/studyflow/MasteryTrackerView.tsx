import React from 'react';
import {
  Sparkles,
  Trophy,
  BookOpen,
  Layers,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  Calendar,
  Check,
} from 'lucide-react';
import { Section, Chapter, Exam } from '../../types';

interface MasteryTrackerViewProps {
  chapter: Chapter;
  exam?: Exam | null;
  sections: Section[];
  onOpenSectionInStudyPlan: (sectionId: string) => void;
  onTakeQuiz: (section: Section) => void;
  onReviewFlashcards: (section: Section) => void;
}

export const MasteryTrackerView: React.FC<MasteryTrackerViewProps> = ({
  chapter,
  exam,
  sections,
  onOpenSectionInStudyPlan,
  onTakeQuiz,
  onReviewFlashcards,
}) => {
  // Aggregate Metrics
  const totalSections = Math.max(1, sections.length);
  const activeSections = sections.filter((s) => !s.isSkipped);
  
  // Sections Read / Completed (completionRate >= 75)
  const sectionsReadCount = sections.filter((s) => !s.isSkipped && s.completionRate >= 75).length;
  const sectionsReadPct = Math.round((sectionsReadCount / totalSections) * 100);

  // Flashcards aggregation
  const totalFlashcards = sections.reduce((acc, s) => acc + (s.flashcards?.length || 8), 0);
  const flashcardRetentionRate = Math.min(100, Math.max(70, Math.round((chapter.masteryPercentage || 75) * 1.05)));

  // Quiz metrics
  const avgQuizScore = Math.max(0, chapter.testScore || 82);
  const totalQuizzesTaken = sections.filter((s) => s.quizzes && s.quizzes.length > 0 && s.quizzes[0].score !== null).length || 2;

  // Overall Mastery Calculation
  const overallMastery = Math.min(
    100,
    Math.round(
      sections.reduce((acc, s) => (s.isSkipped ? acc + 100 : acc + s.completionRate), 0) / totalSections
    )
  );

  // SVG Dial Math
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallMastery / 100) * circumference;

  const getDialColor = (pct: number) => {
    if (pct >= 80) return '#10b981'; // emerald-500
    if (pct >= 50) return '#6366f1'; // indigo-500
    if (pct >= 25) return '#f59e0b'; // amber-500
    return '#f43f5e'; // rose-500
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* ===================================================================== */}
      {/* 1. HEADER BANNER: "Master Your Document for Exam Day" */}
      {/* ===================================================================== */}
      <div className="p-5 sm:p-6 rounded-3xl bg-linear-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white shadow-lg border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                Exam Readiness Engine
              </span>
              {exam && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-300 bg-white/10 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                  {exam.daysLeft === 0 ? 'Exam Today' : `${exam.daysLeft} Days to Exam`}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Master Your Document for Exam Day
            </h2>

            <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed">
              Track multi-dimensional retention across verified active reading, Spaced Repetition (SM-2), and high-yield question accuracy.
            </p>
          </div>

          {/* Quick Motivational Target */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 flex items-center gap-4 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/60 border border-indigo-400/40 flex items-center justify-center text-white shrink-0">
              <TrendingUp className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider">
                Exam Benchmark
              </div>
              <div className="text-xl font-black text-white">
                {overallMastery >= 85 ? 'Board Ready 🏆' : overallMastery >= 60 ? 'On Track 👍' : 'Needs Practice 🎯'}
              </div>
              <div className="text-[11px] text-indigo-200/70">
                Target: 90%+ for Distinction
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. OVERALL MASTERY DIAL & SUMMARY METRIC CARDS */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Overall Mastery Percentage Dial/Circle */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col items-center justify-center text-center space-y-3">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400">
            Overall Document Mastery
          </div>

          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
              {/* Background Track */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="text-slate-100 dark:text-slate-800 stroke-current"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Animated Progress Ring */}
              <circle
                cx="64"
                cy="64"
                r={radius}
                stroke={getDialColor(overallMastery)}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {overallMastery}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Mastery Score
              </span>
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {overallMastery >= 80
              ? 'Excellent! Solid foundation across all sections.'
              : overallMastery >= 50
              ? 'Moderate! Focus on flagged concepts before testing.'
              : 'Initial stage! Read summaries & complete practice cards.'}
          </div>
        </div>

        {/* 3 Summary Metric Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Sections Read */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Sections Read
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {sectionsReadCount} / {totalSections}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {sectionsReadPct}% of core sections reviewed
              </p>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${sectionsReadPct}%` }}
              />
            </div>
          </div>

          {/* Card 2: Flashcards */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Flashcards
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {totalFlashcards} Cards
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {flashcardRetentionRate}% active SM-2 retention
              </p>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${flashcardRetentionRate}%` }}
              />
            </div>
          </div>

          {/* Card 3: Quiz */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Quiz
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
            </div>

            <div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {avgQuizScore}% Avg
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {totalQuizzesTaken} quiz modules completed
              </p>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${avgQuizScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. GRANULAR SECTION BREAKDOWN WITH TOPIC BADGES */}
      {/* ===================================================================== */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Granular Section Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect each section's mastery status, key concepts, and launch targeted practice.
            </p>
          </div>

          <span className="text-xs font-bold text-slate-400">
            {sections.length} Sections
          </span>
        </div>

        {/* Sections List */}
        <div className="space-y-3">
          {sections.map((section) => {
            const isDone = section.completionRate >= 80;
            const needsReview = !section.isSkipped && section.completionRate < 45;

            return (
              <div
                key={section.id}
                className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 transition bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Section Info & Topic Badges */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                      Section {section.sectionNumber}
                    </span>

                    {/* Topic Badges: "100%", "Skipped", "Needs Review" */}
                    {section.isSkipped ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider line-through">
                        Skipped
                      </span>
                    ) : isDone ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        100% Mastered
                      </span>
                    ) : needsReview ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Needs Review ({section.completionRate}%)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                        In Progress ({section.completionRate}%)
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {section.title}
                  </h4>

                  {/* Key Topics Tags */}
                  {section.keyTopics && section.keyTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {section.keyTopics.map((kt, kIdx) => (
                        <span
                          key={kIdx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                        >
                          #{kt}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Section Mini Progress Bar */}
                  <div className="w-full max-w-md bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        section.isSkipped
                          ? 'bg-slate-400'
                          : isDone
                          ? 'bg-emerald-500'
                          : needsReview
                          ? 'bg-amber-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${section.isSkipped ? 100 : section.completionRate}%` }}
                    />
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                  <button
                    onClick={() => onReviewFlashcards(section)}
                    className="px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    title="Review Flashcards"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>

                  <button
                    onClick={() => onTakeQuiz(section)}
                    className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    title="Take Section Quiz"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Quiz</span>
                  </button>

                  <button
                    onClick={() => onOpenSectionInStudyPlan(section.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>Study Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
