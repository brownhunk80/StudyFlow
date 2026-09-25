import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Layers,
  BookOpen,
  FileText,
  CheckCircle2,
  EyeOff,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Check,
  Brain,
  ShieldCheck,
  Target,
  Clock,
  Loader2,
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

export interface RoadmapMilestoneCardProps {
  section: Section;
  chapterName: string;
  chapterRawText?: string;
  index: number;
  totalSections: number;
  isExpanded: boolean;
  isGeneratingDetail?: boolean;
  onToggleExpand: () => void;
  // Card Actions
  onOpenFlashcards: (section: Section, mode: 'practice' | 'edit') => void;
  onOpenQuiz: (section: Section, mode: 'study' | 'test') => void;
  onSaveMilestoneQuestions?: (sectionId: string, questions: any[]) => void;
  onSaveMilestoneCards?: (sectionId: string, cards: any[]) => void;
  // Sub-action Links
  onRead: (section: Section) => void;
  onReadSummary: (section: Section) => void;
  onReadDocument: (section: Section) => void;
  // Direct sequential module handlers (optional)
  onOpenCheckpoints?: (section: Section) => void;
  onLaunchRecallDeck?: (section: Section) => void;
  // Concept toggles
  onToggleConceptSkip?: (sectionId: string, conceptId: string, isSkipped: boolean) => void;
  onToggleConceptStatus?: (
    sectionId: string,
    conceptId: string,
    newStatus: 'not_started' | 'learning' | 'mastered'
  ) => void;
}

export const RoadmapMilestoneCard: React.FC<RoadmapMilestoneCardProps> = ({
  section,
  chapterName,
  chapterRawText,
  index,
  totalSections,
  isExpanded,
  isGeneratingDetail,
  onToggleExpand,
  onOpenFlashcards,
  onOpenQuiz,
  onSaveMilestoneQuestions,
  onSaveMilestoneCards,
  onRead,
  onReadSummary,
  onReadDocument,
  onOpenCheckpoints,
  onLaunchRecallDeck,
  onToggleConceptSkip,
  onToggleConceptStatus,
}) => {
  const [isCoreConceptsOpen, setIsCoreConceptsOpen] = useState(false);
  const [isGeneratingCheck, setIsGeneratingCheck] = useState(false);
  const [isLaunchingDeck, setIsLaunchingDeck] = useState(false);

  // Derive individual concepts list from section keyTopics or topics
  const initialConcepts: ConceptItem[] = useMemo(() => {
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

  // =========================================================================
  // RETENTION & MASTERY INDEX CALCULATION (3 SEQUENTIAL MODULES)
  // Module 1 (Summary): Viewed / Read
  // Module 2 (Checkpoints): 40% based on ratio of checkpoints marked Understood
  // Module 3 (Recall Deck): 60% based on SM-2 card maturity and interval growth
  // Formula: Mastery Index = (CheckpointsScore * 0.4) + (RecallDeckScore * 0.6)
  // =========================================================================

  // 1. Module 1 Read Status
  const isSummaryRead = useMemo(() => {
    try {
      if (localStorage.getItem(`milestone_read_${section.id}`) === 'true') return true;
    } catch {}
    return Boolean((section as any).summaryRead || section.completionRate > 0);
  }, [section]);

  // 2. Module 2 Checkpoints Data & Score
  const checkpointsData = useMemo(() => {
    let savedCPs: any[] | null = null;
    try {
      const raw = localStorage.getItem(`milestone_checkpoints_${section.id}`);
      if (raw) savedCPs = JSON.parse(raw);
    } catch {}

    const list = savedCPs || section.knowledgeQuestions || section.checkLearningQuestions || [];
    const total = Math.max(3, list.length);
    let understoodCount = 0;

    if (savedCPs && savedCPs.length > 0) {
      understoodCount = savedCPs.filter((c: any) => c.selfAssessment === 'understood').length;
    } else if (section.knowledgeQuestions && section.knowledgeQuestions.length > 0) {
      understoodCount = section.knowledgeQuestions.filter((kq) => kq.isCorrect === true).length;
    } else if (section.quizzes && section.quizzes.length > 0) {
      const best = Math.max(...section.quizzes.map((q) => q.score || 0));
      understoodCount = Math.round((best / 100) * total);
    } else if (section.completionRate >= 80) {
      understoodCount = 3;
    } else if (section.completionRate >= 45) {
      understoodCount = 1;
    }

    const scorePct = total > 0 ? Math.round((understoodCount / total) * 100) : 0;
    const isStarted = understoodCount > 0 || (savedCPs && savedCPs.some((c: any) => c.selfAssessment !== null));

    return { total, understoodCount, scorePct, isStarted };
  }, [section]);

  // 3. Module 3 Recall Deck Data & Score
  const recallDeckData = useMemo(() => {
    let savedCards: any[] | null = null;
    try {
      const raw = localStorage.getItem(`milestone_recall_deck_${section.id}`);
      if (raw) savedCards = JSON.parse(raw);
    } catch {}

    const cardsList =
      savedCards ||
      (Array.isArray(section.flashcards) && section.flashcards.length > 0 && section.flashcards) ||
      (Array.isArray(section.recallDeck) && section.recallDeck.length > 0 && section.recallDeck) ||
      [];

    const totalCards = Math.max(4, cardsList.length);
    const activeCards = cardsList.filter((c: any) => c.status !== 'disabled');
    const matureCards = activeCards.filter(
      (c: any) =>
        (typeof c.interval === 'number' && c.interval >= 3) ||
        (typeof c.repetition === 'number' && c.repetition >= 2) ||
        c.status === 'mastered'
    ).length;

    const maxInterval = Math.max(...activeCards.map((c: any) => c.interval || 1), 3);
    const cardsDueCount = activeCards.length;

    // RecallDeckScore (0 - 100) based on mature cards and intervals
    let scorePct = 0;
    if (activeCards.length > 0) {
      scorePct = Math.min(
        100,
        Math.round(((matureCards + (activeCards.length - matureCards) * 0.4) / activeCards.length) * 100)
      );
    } else {
      scorePct = Math.min(100, section.completionRate || 40);
    }

    return { totalCards, activeCardsCount: activeCards.length, matureCards, maxInterval, cardsDueCount, scorePct };
  }, [section]);

  // Overall Retention / Mastery Index: (CheckpointsScore * 0.4) + (RecallDeckScore * 0.6)
  const masteryIndex = useMemo(() => {
    if (section.isSkipped) return 0;
    const computed = Math.round(checkpointsData.scorePct * 0.4 + recallDeckData.scorePct * 0.6);
    return Math.min(100, Math.max(0, computed));
  }, [section.isSkipped, checkpointsData.scorePct, recallDeckData.scorePct]);

  // Styling for mastery badge
  const getMasteryBadgeStyle = () => {
    if (section.isSkipped) {
      return 'bg-slate-100 dark:bg-slate-800 text-slate-500 line-through border border-slate-200 dark:border-slate-700';
    }
    if (masteryIndex >= 80) {
      return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-black';
    }
    if (masteryIndex >= 45) {
      return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold';
    }
    return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold';
  };

  const handleConceptSkipToggle = (conceptId: string) => {
    const current = concepts.find((c) => c.id === conceptId);
    if (!current) return;
    const nextSkipped = !current.isSkipped;
    setConcepts((prev) =>
      prev.map((c) => (c.id === conceptId ? { ...c, isSkipped: nextSkipped } : c))
    );
    onToggleConceptSkip?.(section.id, conceptId, nextSkipped);
  };

  const handleConceptStatusToggle = (conceptId: string) => {
    const current = concepts.find((c) => c.id === conceptId);
    if (!current) return;
    const nextStatus = current.status === 'mastered' ? 'learning' : 'mastered';
    setConcepts((prev) =>
      prev.map((c) => (c.id === conceptId ? { ...c, status: nextStatus } : c))
    );
    onToggleConceptStatus?.(section.id, conceptId, nextStatus);
  };

  // Launch Module 2 (Conceptual Checkpoints)
  const handleStartCheckpoints = () => {
    if (onOpenCheckpoints) {
      onOpenCheckpoints(section);
    } else {
      onOpenQuiz(section, 'study');
    }
  };

  // Launch Module 3 (Active Recall Deck)
  const handleLaunchRecall = () => {
    if (onLaunchRecallDeck) {
      onLaunchRecallDeck(section);
    } else {
      onOpenFlashcards(section, 'practice');
    }
  };

  const isMastered = masteryIndex >= 80;
  const needsRevision = !section.isSkipped && masteryIndex < 50;

  return (
    <div
      className={`rounded-3xl border transition-all duration-200 overflow-hidden mb-4 ${
        section.isSkipped
          ? 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70'
          : isExpanded
          ? 'bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-800/80 shadow-md ring-1 ring-indigo-500/10'
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-indigo-200 dark:hover:border-slate-700'
      }`}
    >
      {/* =================================================================== */}
      {/* MILESTONE CARD HEADER ACCORDION TRIGGER */}
      {/* =================================================================== */}
      <div
        onClick={onToggleExpand}
        className="p-5 sm:p-6 cursor-pointer select-none transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            {/* Header tags & badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Section {section.sectionNumber < 10 ? `0${section.sectionNumber}` : section.sectionNumber}
              </span>

              {/* Retention Mastery Index Badge */}
              <span className={`text-xs px-2.5 py-0.5 rounded-full transition ${getMasteryBadgeStyle()}`}>
                {section.isSkipped ? 'Skipped' : `${masteryIndex}% Retention Index`}
              </span>

              {/* Module 1 Read Indicator Pill */}
              {isSummaryRead && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                  <span>Notes Read</span>
                </span>
              )}

              {/* Alert Badge when topics need revision */}
              {needsRevision && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>Needs Work</span>
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
      </div>

      {/* =================================================================== */}
      {/* INSIDE EXPANDED ACCORDION: 3 DISTINCT, SEQUENTIAL ACTION MODULES */}
      {/* =================================================================== */}
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-slate-800/80 p-5 sm:p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/40 animate-in fade-in-50 duration-200">
          {isGeneratingDetail && (
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              <Sparkles className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Generating custom checkpoint derivations & active recall cards...</span>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* MODULE 1 (READ): CONCEPT NOTES & SUMMARY BANNER */}
          {/* Neat horizontal banner / button */}
          {/* --------------------------------------------------------------- */}
          <div className="w-full p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>📖 Module 1: Read Summary & Notes</span>
                </span>
                {isSummaryRead ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Read Complete
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Not Read
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Compact Overview • Detailed Deep-Dive • Source Document
              </p>
            </div>

            <button
              type="button"
              onClick={() => onRead(section)}
              className="px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-2xs group"
            >
              <span>Read Notes</span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-500 group-hover:translate-x-0.5 transition" />
            </button>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* MODULE 2 (SYNTHESIZE & EXPLAIN): CONCEPTUAL CHECKPOINTS CARD */}
          {/* Full-width card with Understood badge & multimodal CTA */}
          {/* --------------------------------------------------------------- */}
          <div className="w-full p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-emerald-200 dark:border-emerald-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>🎯 Module 2: Conceptual Checkpoints</span>
                </span>

                {/* Badge: "X of Y Understood" or "Not Started" */}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                    checkpointsData.understoodCount > 0
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {checkpointsData.isStarted
                    ? `${checkpointsData.understoodCount} of ${checkpointsData.total} Understood`
                    : 'Not Started'}
                </span>

                <span className="text-[10px] font-bold text-slate-400">
                  • 40% Weight
                </span>
              </div>

              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Open-Ended Derivations & Reasoning Synthesis
              </h4>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Open-ended derivations, reasoning synthesis & benchmark self-evaluations
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleStartCheckpoints}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-emerald-500/20"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                <span>Open Checkpoints</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* MODULE 3 (RETAIN & REVIEW): ACTIVE RECALL DECK CARD */}
          {/* Full-width card with RemNote-style SM-2 Spaced Repetition */}
          {/* --------------------------------------------------------------- */}
          <div className="w-full p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-purple-200 dark:border-purple-800/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>🧠 Module 3: Active Recall Deck</span>
                </span>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  SM-2 Spaced Repetition
                </span>

                <span className="text-[10px] font-bold text-slate-400">
                  • 60% Weight
                </span>
              </div>

              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Spaced Repetition & Breadcrumb Flashcards
              </h4>

              {/* Subtext: "[X] Cards Due for Review • Next interval: [Y] days" */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-bold text-purple-700 dark:text-purple-400">
                  {recallDeckData.totalCards} Cards Due for Review
                </span>
                <span>•</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Next interval: {recallDeckData.maxInterval} days
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleLaunchRecall}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm hover:shadow-purple-500/20"
              >
                <Layers className="w-3.5 h-3.5 text-purple-200" />
                <span>Launch Recall Deck</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* --------------------------------------------------------------- */}
          {/* CARD FOOTER: SOURCE MATERIAL LINK & CORE CONCEPTS DROPDOWN */}
          {/* --------------------------------------------------------------- */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2">
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

          {/* Expandable Core Concepts tags and individual progress tracking */}
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
  );
};

export default RoadmapMilestoneCard;
