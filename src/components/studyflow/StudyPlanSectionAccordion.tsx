import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Layers,
  HelpCircle,
  BookOpen,
  FileText,
  FileCheck,
  CheckCircle2,
  Circle,
  EyeOff,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Section, ChapterTopicItem, DocumentFlashcard } from '../../types';

export interface ConceptItem {
  id: string;
  title: string;
  summary?: string;
  isSkipped: boolean;
  status: 'not_started' | 'learning' | 'revised' | 'mastered';
  keyFormula?: string;
}

interface StudyPlanSectionAccordionProps {
  section: Section;
  chapterName: string;
  isExpanded: boolean;
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

export const StudyPlanSectionAccordion: React.FC<StudyPlanSectionAccordionProps> = ({
  section,
  chapterName,
  isExpanded,
  onToggleExpand,
  onOpenFlashcards,
  onOpenQuiz,
  onRead,
  onReadSummary,
  onReadDocument,
  onToggleConceptSkip,
  onToggleConceptStatus,
}) => {
  const [isKeyTopicsOpen, setIsKeyTopicsOpen] = useState(true);

  // Derive individual concepts list from section keyTopics or topics
  const initialConcepts: ConceptItem[] = React.useMemo(() => {
    if (section.keyTopics && section.keyTopics.length > 0) {
      return section.keyTopics.map((kt, idx) => ({
        id: `concept-${section.id}-${idx}`,
        title: kt,
        summary: `Key principle and testable mechanics of ${kt}.`,
        isSkipped: section.isSkipped || false,
        status: section.completionRate >= 80 ? 'mastered' : section.completionRate >= 40 ? 'revised' : 'learning',
      }));
    }
    return [
      {
        id: `concept-${section.id}-default`,
        title: section.title,
        summary: `Core principles and practical problem solving for ${section.title}.`,
        isSkipped: section.isSkipped || false,
        status: section.completionRate >= 80 ? 'mastered' : 'learning',
      },
    ];
  }, [section]);

  const [concepts, setConcepts] = useState<ConceptItem[]>(initialConcepts);

  const totalCards = section.flashcards?.length || 8;
  const masteredTopicsCount = concepts.filter((c) => !c.isSkipped && (c.status === 'mastered' || c.status === 'revised')).length;
  const totalConceptsCount = concepts.length;

  // Determine if this section requires an alert banner
  const needsAttention = !section.isSkipped && (section.completionRate < 45 || section.completionRate === 0);
  const isMastered = section.completionRate >= 85;

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

  // Badge Color Style
  const getBadgeStyle = () => {
    if (section.isSkipped) {
      return 'bg-slate-100 dark:bg-slate-800 text-slate-500 line-through';
    }
    if (section.completionRate >= 80) {
      return 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
    }
    if (section.completionRate >= 40) {
      return 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
    }
    return 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900';
  };

  return (
    <div
      className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
        isExpanded
          ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/60 shadow-md ring-1 ring-indigo-500/10'
          : 'bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs'
      }`}
    >
      {/* ===================================================================== */}
      {/* ACCORDION HEADER */}
      {/* ===================================================================== */}
      <div
        onClick={onToggleExpand}
        className="p-4 sm:p-5 flex flex-col gap-3 cursor-pointer select-none transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Expand / Collapse Chevron indicator */}
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 mt-0.5 ${
                isExpanded
                  ? 'bg-indigo-600 text-white shadow-xs rotate-180'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Section {section.sectionNumber}
                </span>

                {/* Progress Percentage Badge */}
                <span
                  className={`text-[11px] font-black px-2.5 py-0.5 rounded-full transition ${getBadgeStyle()}`}
                >
                  {section.isSkipped ? 'Skipped' : `${section.completionRate}%`}
                </span>

                {isMastered && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Mastered
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1 leading-snug">
                {section.title}
              </h3>
            </div>
          </div>
        </div>

        {/* Alert Banner if topics need attention */}
        {needsAttention && (
          <div className="ml-10 p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-semibold">
                Needs attention: Mastery is below 50%. Practice Recall Deck or review summary.
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 shrink-0 hidden sm:inline-block">
              Priority Review
            </span>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* INSIDE OPEN ACCORDION */}
      {/* ===================================================================== */}
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-800/80 p-5 space-y-5 bg-slate-50/40 dark:bg-slate-900/40 animate-in fade-in-50 duration-200">
          {/* Action Cards Stack: Check Learning (TOP) & Recall Deck (BOTTOM) */}
          <div className="flex flex-col gap-4">
            {/* ------------------------------------------------------------- */}
            {/* a) TOP CARD: CHECK LEARNING (replaces Section Quiz) */}
            {/* ------------------------------------------------------------- */}
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col justify-between gap-4 shadow-2xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Knowledge Assessment
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                    Check Learning Drill
                  </span>
                </div>

                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Check Learning
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Topics Validated: <strong className="text-emerald-700 dark:text-emerald-300">{masteredTopicsCount} / {totalConceptsCount}</strong> ({Math.round((masteredTopicsCount / Math.max(1, totalConceptsCount)) * 100)}%)
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenQuiz(section, section.completionRate > 0 ? 'study' : 'test');
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>{section.completionRate > 0 ? 'Resume Check' : 'Start Check'}</span>
                </button>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* b) BOTTOM CARD: RECALL DECK (replaces Flashcards) */}
            {/* ------------------------------------------------------------- */}
            <div className="p-4 sm:p-5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 flex flex-col justify-between gap-4 shadow-2xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Spaced Repetition
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
                    SM-2 Engine
                  </span>
                </div>

                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  Recall Deck
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {totalCards} cards ready for memory reinforcement and active recall.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFlashcards(section, 'practice');
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Practice Recall Deck</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFlashcards(section, 'edit');
                  }}
                  className="py-2.5 px-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 hover:bg-purple-100/50 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-xs transition cursor-pointer"
                >
                  Edit Deck
                </button>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* c) SUB-ACTION LINKS ("Read", "Read Summary", "Read Document") */}
          {/* ----------------------------------------------------------------- */}
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
              Reading Resources:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onRead(section)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>Read</span>
              </button>

              <button
                onClick={() => onReadSummary(section)}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Read Summary</span>
              </button>

              <button
                onClick={() => onReadDocument(section)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <FileCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Read Document</span>
              </button>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* d) COLLAPSIBLE "KEY TOPICS" SUBSECTION */}
          {/* ----------------------------------------------------------------- */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div
              onClick={() => setIsKeyTopicsOpen(!isKeyTopicsOpen)}
              className="p-3.5 px-4 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between cursor-pointer select-none border-b border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Key Topics & Concept Tracking
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {concepts.length} Concepts
                </span>
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
                <span>{isKeyTopicsOpen ? 'Hide' : 'Show'}</span>
                {isKeyTopicsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {isKeyTopicsOpen && (
              <div className="p-3 sm:p-4 space-y-2 divide-y divide-slate-100 dark:divide-slate-800/60">
                {concepts.map((concept) => {
                  const isDone = concept.status === 'mastered';
                  return (
                    <div
                      key={concept.id}
                      className={`pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition ${
                        concept.isSkipped ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-slate-900 dark:text-white ${
                              concept.isSkipped ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            {concept.title}
                          </span>
                          {concept.isSkipped && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                              Skipped
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {concept.summary}
                        </p>
                      </div>

                      {/* Controls: Skip Toggle + Mark as Mastered */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Skip Toggle */}
                        <button
                          onClick={() => handleConceptSkipToggle(concept.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                            concept.isSkipped
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title="Skip or unskip this concept"
                        >
                          <EyeOff className="w-3 h-3" />
                          <span>{concept.isSkipped ? 'Unskip' : 'Skip'}</span>
                        </button>

                        {/* Progress Status Toggle */}
                        <button
                          onClick={() => handleConceptStatusToggle(concept.id)}
                          disabled={concept.isSkipped}
                          className={`px-3 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer flex items-center gap-1.5 ${
                            isDone
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          {isDone ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Mastered</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-3.5 h-3.5 text-slate-400" />
                              <span>Mark Done</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
