import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Layers,
  HelpCircle,
  BookOpen,
  FileText,
  CheckCircle2,
  Circle,
  EyeOff,
  Sparkles,
  ArrowRight,
  Sliders,
  RotateCcw,
  Check,
  Brain,
  Clock,
  ShieldCheck,
  Tag,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from 'lucide-react';
import { Section, DocumentFlashcard } from '../../types';

export interface ConceptItem {
  id: string;
  title: string;
  summary?: string;
  isSkipped: boolean;
  status: 'not_started' | 'learning' | 'revised' | 'mastered';
  keyFormula?: string;
}

interface RoadmapMilestoneCardProps {
  section: Section;
  chapterName: string;
  index: number;
  totalSections: number;
  isExpanded: boolean;
  isGeneratingDetail?: boolean;
  onToggleExpand: () => void;
  // Card Actions
  onOpenFlashcards: (section: Section, mode: 'practice' | 'edit') => void;
  onOpenQuiz: (section: Section, mode: 'study' | 'test') => void;
  // Sub-action Links
  onRead: (section: Section) => void;
  onReadSummary: (section: Section) => void;
  onReadDocument: (section: Section) => void;
  // Concept toggles
  onToggleConceptSkip?: (sectionId: string, conceptId: string, isSkipped: boolean) => void;
  onToggleConceptStatus?: (sectionId: string, conceptId: string, newStatus: 'not_started' | 'learning' | 'mastered') => void;
}

export const RoadmapMilestoneCard: React.FC<RoadmapMilestoneCardProps> = ({
  section,
  chapterName,
  index,
  totalSections,
  isExpanded,
  isGeneratingDetail,
  onToggleExpand,
  onOpenFlashcards,
  onOpenQuiz,
  onRead,
  onReadSummary,
  onReadDocument,
  onToggleConceptSkip,
  onToggleConceptStatus,
}) => {
  const [isCoreConceptsOpen, setIsCoreConceptsOpen] = useState(false);

  // Derive individual concepts list from section keyTopics or topics
  const initialConcepts: ConceptItem[] = React.useMemo(() => {
    if (section.keyTopics && section.keyTopics.length > 0) {
      return section.keyTopics.map((kt, idx) => ({
        id: `concept-${section.id}-${idx}`,
        title: kt,
        summary: `Core principles and practical problem solving for ${kt}.`,
        isSkipped: section.isSkipped || false,
        status:
          section.completionRate >= 80
            ? 'mastered'
            : section.completionRate >= 45
            ? 'revised'
            : 'learning',
      }));
    }
    return [
      {
        id: `concept-${section.id}-default`,
        title: section.title,
        summary: `Fundamental theorems, formulas, and application cases for ${section.title}.`,
        isSkipped: section.isSkipped || false,
        status: section.completionRate >= 80 ? 'mastered' : 'learning',
      },
    ];
  }, [section]);

  const [concepts, setConcepts] = useState<ConceptItem[]>(initialConcepts);

  const totalCards = section.flashcards?.length || 8;
  const masteredTopicsCount = concepts.filter(
    (c) => !c.isSkipped && (c.status === 'mastered' || c.status === 'revised')
  ).length;
  const totalConceptsCount = concepts.length;

  // Determine if this section requires an alert badge
  const needsRevision = !section.isSkipped && (section.completionRate < 50 || section.completionRate === 0);
  const isMastered = section.completionRate >= 80;
  const isFirst = index === 0;
  const isLast = index === totalSections - 1;

  const handleConceptSkipToggle = (conceptId: string) => {
    setConcepts((prev) =>
      prev.map((c) => {
        if (c.id === conceptId) {
          const nextSkipped = !c.isSkipped;
          onToggleConceptSkip?.(section.id, conceptId, nextSkipped);
          return { ...c, isSkipped: nextSkipped };
        }
        return c;
      })
    );
  };

  const handleConceptStatusToggle = (conceptId: string) => {
    setConcepts((prev) =>
      prev.map((c) => {
        if (c.id === conceptId) {
          const nextStatus = c.status === 'mastered' ? 'learning' : 'mastered';
          onToggleConceptStatus?.(section.id, conceptId, nextStatus);
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  // Retention score styling
  const getRetentionBadgeStyle = () => {
    if (section.isSkipped) {
      return 'bg-slate-100 dark:bg-slate-800 text-slate-500 line-through border border-slate-200 dark:border-slate-700';
    }
    if (section.completionRate >= 80) {
      return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-black';
    }
    if (section.completionRate >= 45) {
      return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold';
    }
    return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold';
  };

  const hasQuizHistory = section.quizzes && section.quizzes.length > 0;
  const latestQuizScore = hasQuizHistory ? section.quizzes![section.quizzes!.length - 1].score : null;

  return (
    <div className="relative flex items-start gap-4 sm:gap-6 group">
      {/* =================================================================== */}
      {/* CONNECTED NODE AXIS (TIMELINE SPINE) */}
      {/* =================================================================== */}
      <div className="relative flex flex-col items-center self-stretch shrink-0 pt-4">
        {/* Top Connecting Stem Line */}
        {!isFirst && (
          <div className="absolute top-0 w-0.5 h-4 bg-slate-200 dark:bg-slate-800 -translate-y-full" />
        )}

        {/* Milestone Node Circle */}
        <div
          onClick={onToggleExpand}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-black text-xs transition-all duration-200 cursor-pointer shadow-xs z-10 select-none ${
            isMastered
              ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/70'
              : isExpanded
              ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/70'
              : 'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
          }`}
          title={`Milestone ${section.sectionNumber}: ${section.title}`}
        >
          {isMastered ? (
            <Check className="w-4 h-4 stroke-[3]" />
          ) : (
            <span>{section.sectionNumber < 10 ? `0${section.sectionNumber}` : section.sectionNumber}</span>
          )}
        </div>

        {/* Bottom Connecting Stem Line to next node */}
        {!isLast && (
          <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-800 mt-2 min-h-12" />
        )}
      </div>

      {/* =================================================================== */}
      {/* MILESTONE CARD */}
      {/* =================================================================== */}
      <div
        className={`flex-1 rounded-3xl border transition-all duration-200 overflow-hidden mb-6 ${
          isExpanded
            ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/60 shadow-lg ring-1 ring-indigo-500/10'
            : 'bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs'
        }`}
      >
        {/* ================================================================= */}
        {/* MILESTONE HEADER */}
        {/* ================================================================= */}
        <div
          onClick={onToggleExpand}
          className="p-5 sm:p-6 flex flex-col gap-3 cursor-pointer select-none transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              {/* Meta row: Milestone number, retention score badge, alert badge */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Milestone {section.sectionNumber < 10 ? `0${section.sectionNumber}` : section.sectionNumber}
                </span>

                {/* Retention Score Badge */}
                <span className={`text-xs px-2.5 py-0.5 rounded-full transition ${getRetentionBadgeStyle()}`}>
                  {section.isSkipped ? 'Skipped' : `${section.completionRate}% Retention`}
                </span>

                {/* Alert Badge when topics need revision */}
                {needsRevision && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>Needs Revision</span>
                  </span>
                )}

                {isMastered && (
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Validated</span>
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                {section.title}
              </h3>
            </div>

            {/* Expand / Collapse Chevron indicator */}
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 mt-1 ${
                isExpanded
                  ? 'bg-indigo-600 text-white shadow-xs rotate-180'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Key Topics Badges in Header */}
          {section.keyTopics && section.keyTopics.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {section.keyTopics.slice(0, 4).map((topic, tIdx) => (
                <span
                  key={tIdx}
                  className="px-2.5 py-0.5 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                >
                  #{topic}
                </span>
              ))}
              {section.keyTopics.length > 4 && (
                <span className="text-[11px] text-slate-400 font-bold">
                  +{section.keyTopics.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* INSIDE EXPANDED MILESTONE: VERTICAL ACTION CARDS STACKED UP & DOWN */}
        {/* ================================================================= */}
        {isExpanded && (
          <div className="border-t border-slate-100 dark:border-slate-800/80 p-5 sm:p-6 space-y-5 bg-slate-50/50 dark:bg-slate-900/40 animate-in fade-in-50 duration-200">
            {isGeneratingDetail && (
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Generating custom practice questions & spaced recall cards for this milestone...</span>
              </div>
            )}
            {/* ------------------------------------------------------------- */}
            {/* a) TOP CARD: "Check Learning" (Replaces Quiz) */}
            {/* Full-width card with progress counter, difficulty badge, button */}
            {/* ------------------------------------------------------------- */}
            <div className="w-full p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-emerald-200 dark:border-emerald-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Check Learning</span>
                  </span>

                  {/* Current Difficulty Badge */}
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Application Tier
                  </span>

                  {latestQuizScore !== null && (
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      • Best Score: {latestQuizScore}%
                    </span>
                  )}
                </div>

                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Active Knowledge Validation
                </h4>

                {/* Progress counter: e.g. "3 of 5 topics validated" */}
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {masteredTopicsCount} of {totalConceptsCount} topics validated
                  </span>
                  <span>•</span>
                  <span>Multiple Choice & Numerical Verification</span>
                </div>
              </div>

              {/* Primary action button: "Start Check" or "Resume Check" */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenQuiz(section, 'study')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-emerald-500/20"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                  <span>{hasQuizHistory ? 'Resume Check' : 'Start Check'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenQuiz(section, 'test')}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
                  title="Take under timed exam simulation"
                >
                  Exam Test
                </button>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* b) BOTTOM CARD: "Recall Deck" (Replaces Flashcards) */}
            {/* Full-width card placed directly below "Check Learning" */}
            {/* ------------------------------------------------------------- */}
            <div className="w-full p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-purple-200 dark:border-purple-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Recall Deck</span>
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    SM-2 Spaced Repetition
                  </span>
                </div>

                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Active Recall Cards
                </h4>

                {/* Shows total cards due, interval status */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-purple-700 dark:text-purple-400">
                    {totalCards} Cards Due for Review
                  </span>
                  <span>•</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Next interval: In 3 days (SM-2 scheduled)
                  </span>
                </div>
              </div>

              {/* Buttons: "Launch Recall Deck" and "Manage Deck" */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenFlashcards(section, 'practice')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-purple-500/20"
                >
                  <Brain className="w-3.5 h-3.5 text-purple-200" />
                  <span>Launch Recall Deck</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenFlashcards(section, 'edit')}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
                  title="Browse, edit front/back prompts, or toggle cards"
                >
                  Manage Deck
                </button>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* c) SUB-ACTIONS BAR UNDERNEATH CARDS */}
            {/* Pill links for "Summary + Test your understanding" & "Source Material" */}
            {/* ------------------------------------------------------------- */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-200/70 dark:border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onRead(section)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition cursor-pointer flex items-center gap-2 shadow-2xs"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Summary + Test your understanding</span>
                </button>

                <button
                  type="button"
                  onClick={() => onReadDocument(section)}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Source Material</span>
                </button>
              </div>

              {/* Core Concepts Toggle Button */}
              <button
                type="button"
                onClick={() => setIsCoreConceptsOpen((prev) => !prev)}
                className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-1.5 transition cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span>Core Concepts ({concepts.length})</span>
                {isCoreConceptsOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* d) EXPANDABLE "CORE CONCEPTS" LIST */}
            {/* Individual topic progress bars and toggles to include/exclude */}
            {/* ------------------------------------------------------------- */}
            {isCoreConceptsOpen && (
              <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/80 space-y-3 animate-in fade-in-50 duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Individual Concept Tracking
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Toggle inclusion to customize your review queue
                  </span>
                </div>

                <div className="space-y-2">
                  {concepts.map((concept) => {
                    const isConceptMastered = concept.status === 'mastered';
                    const progressPct = concept.isSkipped
                      ? 0
                      : isConceptMastered
                      ? 100
                      : concept.status === 'revised'
                      ? 65
                      : 30;

                    return (
                      <div
                        key={concept.id}
                        className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          concept.isSkipped
                            ? 'bg-slate-100/70 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80'
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold ${
                                concept.isSkipped
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {concept.title}
                            </span>

                            {isConceptMastered && !concept.isSkipped && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                Mastered
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-lg">
                            {concept.summary}
                          </p>

                          {/* Individual Topic Progress Bar */}
                          <div className="flex items-center gap-2 pt-1 max-w-xs">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 rounded-full ${
                                  concept.isSkipped
                                    ? 'bg-slate-400'
                                    : isConceptMastered
                                    ? 'bg-emerald-500'
                                    : 'bg-indigo-500'
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 font-mono">
                              {progressPct}%
                            </span>
                          </div>
                        </div>

                        {/* Toggles: Include/Exclude and Status */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {/* Status toggle */}
                          <button
                            type="button"
                            onClick={() => handleConceptStatusToggle(concept.id)}
                            disabled={concept.isSkipped}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                              isConceptMastered
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {isConceptMastered ? 'Mastered' : 'Mark Mastered'}
                          </button>

                          {/* Include/Exclude Toggle */}
                          <button
                            type="button"
                            onClick={() => handleConceptSkipToggle(concept.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 border ${
                              concept.isSkipped
                                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                                : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                            title={concept.isSkipped ? 'Include in review' : 'Exclude from review'}
                          >
                            {concept.isSkipped ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5 text-rose-500" />
                                <span>Excluded</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span>Included</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
