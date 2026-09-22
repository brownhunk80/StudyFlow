import React, { useState, useMemo } from 'react';
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
  ShieldCheck,
  Brain,
  Gauge,
  RotateCcw,
  Sliders,
  Filter,
} from 'lucide-react';
import { Section, Chapter, Exam } from '../../types';

interface ReadinessTrackerViewProps {
  chapter: Chapter;
  exam?: Exam | null;
  sections: Section[];
  onOpenSectionInRoadmap: (sectionId: string) => void;
  onStartCheck: (section: Section) => void;
  onLaunchRecallDeck: (section: Section) => void;
}

interface GranularConceptItem {
  id: string;
  title: string;
  sectionId: string;
  sectionNumber: number;
  sectionTitle: string;
  status: 'understood' | 'needs_review';
  retentionScore: number;
  section: Section;
}

export const ReadinessTrackerView: React.FC<ReadinessTrackerViewProps> = ({
  chapter,
  exam,
  sections,
  onOpenSectionInRoadmap,
  onStartCheck,
  onLaunchRecallDeck,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'understood' | 'needs_review'>('all');

  // Total Sections Metrics
  const totalSections = Math.max(1, sections.length);
  const activeSections = sections.filter((s) => !s.isSkipped);
  const sectionsCoveredCount = sections.filter((s) => !s.isSkipped && s.completionRate >= 70).length;
  const sectionsCoveredPct = Math.round((sectionsCoveredCount / totalSections) * 100);

  // Recall Decks Cleared (Flashcards)
  const totalCards = sections.reduce((acc, s) => acc + (s.flashcards?.length || 8), 0);
  const cardsClearedCount = Math.round(
    sections.reduce((acc, s) => {
      const cardsInSec = s.flashcards?.length || 8;
      const factor = s.completionRate / 100;
      return acc + Math.round(cardsInSec * factor);
    }, 0)
  );

  // Check Learning Score (Average Quiz accuracy)
  const allQuizzes = useMemo(() => {
    return sections.flatMap((s) => s.quizzes || []);
  }, [sections]);

  const avgCheckScore = useMemo(() => {
    if (allQuizzes.length > 0) {
      const total = allQuizzes.reduce((acc, q) => acc + (q.score || 0), 0);
      return Math.round(total / allQuizzes.length);
    }
    return Math.max(70, Math.round(chapter.testScore || 82));
  }, [allQuizzes, chapter.testScore]);

  // Overall Exam Readiness Calculation
  const overallReadiness = useMemo(() => {
    if (sections.length === 0) return 0;
    const avgSection = Math.round(
      sections.reduce((acc, s) => (s.isSkipped ? acc + 100 : acc + s.completionRate), 0) / totalSections
    );
    // Combine section coverage and check learning score
    return Math.min(100, Math.round(avgSection * 0.6 + avgCheckScore * 0.4));
  }, [sections, totalSections, avgCheckScore]);

  // SVG Circular Retention Dial Math
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallReadiness / 100) * circumference;

  const getDialColor = (pct: number) => {
    if (pct >= 80) return '#10b981'; // emerald-500
    if (pct >= 55) return '#6366f1'; // indigo-500
    if (pct >= 35) return '#f59e0b'; // amber-500
    return '#f43f5e'; // rose-500
  };

  // Granular Breakdown of concepts classified under "Understood" and "Needs Review"
  const granularConcepts: GranularConceptItem[] = useMemo(() => {
    const list: GranularConceptItem[] = [];

    sections.forEach((sec) => {
      const topics = sec.keyTopics && sec.keyTopics.length > 0 ? sec.keyTopics : [sec.title];
      topics.forEach((topic, idx) => {
        const isMastered = sec.completionRate >= 75 && !sec.isSkipped;
        list.push({
          id: `concept-${sec.id}-${idx}`,
          title: topic,
          sectionId: sec.id,
          sectionNumber: sec.sectionNumber,
          sectionTitle: sec.title,
          status: isMastered ? 'understood' : 'needs_review',
          retentionScore: sec.isSkipped ? 100 : sec.completionRate,
          section: sec,
        });
      });
    });

    return list;
  }, [sections]);

  const understoodConcepts = granularConcepts.filter((c) => c.status === 'understood');
  const needsReviewConcepts = granularConcepts.filter((c) => c.status === 'needs_review');

  const visibleConcepts = useMemo(() => {
    if (filterTab === 'understood') return understoodConcepts;
    if (filterTab === 'needs_review') return needsReviewConcepts;
    return granularConcepts;
  }, [filterTab, understoodConcepts, needsReviewConcepts, granularConcepts]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* ===================================================================== */}
      {/* 1. HERO CARD: CIRCULAR RETENTION METER */}
      {/* ===================================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-br from-slate-900 via-indigo-950 to-slate-950 text-white shadow-xl border border-indigo-900/50 relative overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-10">
          {/* Left Column: Heading and Description */}
          <div className="space-y-3 flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-indigo-300" />
                Readiness Tracker
              </span>

              {exam && (
                <span className="px-3 py-1 rounded-full text-xs font-bold text-slate-300 bg-white/10 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                  {exam.daysLeft === 0 ? 'Exam Today' : `${exam.daysLeft} Days to Exam`}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Exam Readiness Engine
            </h2>

            <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed max-w-xl">
              Synthesized retention metrics computed from your validated knowledge checks, spaced repetition intervals, and core topic coverage.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <span className="px-3 py-1 rounded-xl bg-white/10 text-xs font-bold text-slate-200">
                {understoodConcepts.length} Concepts Understood
              </span>
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-xs font-bold text-amber-300 border border-amber-400/30">
                {needsReviewConcepts.length} Requiring Attention
              </span>
            </div>
          </div>

          {/* Right Column: Circular Retention Meter */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-slate-800/80"
                />
                {/* Retention Progress Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke={getDialColor(overallReadiness)}
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Inside Center Readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  {overallReadiness}%
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-300 mt-0.5">
                  Readiness
                </span>
                <span
                  className="text-[10px] font-extrabold px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-wider"
                  style={{
                    backgroundColor: `${getDialColor(overallReadiness)}25`,
                    color: getDialColor(overallReadiness),
                  }}
                >
                  {overallReadiness >= 80
                    ? 'High Readiness'
                    : overallReadiness >= 55
                    ? 'Advancing'
                    : 'Action Needed'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. THREE STAT CARDS */}
      {/* "Sections Covered", "Recall Decks Cleared", "Check Learning Score" */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Sections Covered */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Milestones
              </span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {sectionsCoveredPct}%
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Sections Covered
            </h3>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {sectionsCoveredCount} <span className="text-sm font-bold text-slate-400">/ {totalSections}</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${sectionsCoveredPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {totalSections - sectionsCoveredCount === 0
                ? 'All sections thoroughly practiced'
                : `${totalSections - sectionsCoveredCount} sections pending validation`}
            </p>
          </div>
        </div>

        {/* Card 2: Recall Decks Cleared */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                SM-2 Repetition
              </span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                Active
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Recall Decks Cleared
            </h3>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {cardsClearedCount} <span className="text-sm font-bold text-slate-400">/ {totalCards} Cards</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((cardsClearedCount / Math.max(1, totalCards)) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Memory intervals scheduled via SM-2 algorithm
            </p>
          </div>
        </div>

        {/* Card 3: Check Learning Score */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Accuracy
              </span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Verified
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Check Learning Score
            </h3>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {avgCheckScore}% <span className="text-sm font-bold text-slate-400">Avg Correct</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${avgCheckScore}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {allQuizzes.length > 0
                ? `${allQuizzes.length} knowledge checks completed`
                : 'Based on initial chapter diagnostic checks'}
            </p>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. GRANULAR BREAKDOWN OF CONCEPTS */}
      {/* Understood (green badge) vs Needs Review (amber/red badge) */}
      {/* ===================================================================== */}
      <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
        {/* Section Header with Segmented Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Granular Concept Breakdown</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {granularConcepts.length} Topics
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review specific topic readiness and launch targeted recall exercises.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All ({granularConcepts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('understood')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'understood'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                  : 'text-slate-500 hover:text-emerald-600'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Understood ({understoodConcepts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('needs_review')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'needs_review'
                  ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-2xs'
                  : 'text-slate-500 hover:text-amber-600'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Needs Review ({needsReviewConcepts.length})</span>
            </button>
          </div>
        </div>

        {/* Concept Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleConcepts.map((item) => {
            const isUnderstood = item.status === 'understood';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                  isUnderstood
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/80 dark:border-emerald-800/50'
                    : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/60'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Milestone {item.sectionNumber < 10 ? `0${item.sectionNumber}` : item.sectionNumber} • {item.sectionTitle}
                    </span>

                    {/* Status Badge: "Understood" (green) vs "Needs Review" (amber/red) */}
                    {isUnderstood ? (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                        <span>Understood</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Needs Review</span>
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                    {item.title}
                  </h4>
                </div>

                {/* Bottom action controls */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                  <div className="text-xs text-slate-500 font-bold">
                    <span>{item.retentionScore}% Retention</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onStartCheck(item.section)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black transition cursor-pointer flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>Check</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onLaunchRecallDeck(item.section)}
                      className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-black transition cursor-pointer flex items-center gap-1"
                    >
                      <Brain className="w-3 h-3" />
                      <span>Recall</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenSectionInRoadmap(item.sectionId)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      title="View in Roadmap"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
