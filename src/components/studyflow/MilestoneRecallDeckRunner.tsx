import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  X,
  Brain,
  Layers,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Check,
  EyeOff,
  Eye,
  BookOpen,
  ChevronRight,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Keyboard,
  Sliders,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Section, DocumentFlashcard } from '../../types';

export interface RemNoteCardItem {
  id: string;
  sectionId?: string;
  breadcrumb: string;
  parentBullet: string;
  front: string;
  back: string;
  explanation?: string;
  sourceExcerpt?: string;
  // SM-2 parameters
  interval: number; // in days
  repetition: number;
  easinessFactor: number;
  status: 'active' | 'disabled' | 'learning' | 'mastered';
  lastRating?: 'disable' | 'relearn' | 'understood';
  dueDate?: string;
}

export interface MilestoneRecallDeckRunnerProps {
  section: Section;
  chapterName: string;
  subjectName?: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCards?: (sectionId: string, updatedCards: RemNoteCardItem[], recallDeckScore: number) => void;
  checkpointsScore?: number;
}

export const MilestoneRecallDeckRunner: React.FC<MilestoneRecallDeckRunnerProps> = ({
  section,
  chapterName,
  subjectName = 'Science',
  isOpen,
  onClose,
  onUpdateCards,
  checkpointsScore = 75,
}) => {
  // Generate initial RemNote-style cards from section flashcards / recallDeck or tailored synthesis
  const initialCards: RemNoteCardItem[] = useMemo(() => {
    try {
      const saved = localStorage.getItem(`milestone_recall_deck_${section.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    const rawList: any[] =
      (Array.isArray(section.flashcards) && section.flashcards.length > 0 && section.flashcards) ||
      (Array.isArray(section.recallDeck) && section.recallDeck.length > 0 && section.recallDeck) ||
      [];

    if (rawList.length > 0) {
      return rawList.map((c, idx) => {
        const subtopic = section.keyTopics?.[idx % (section.keyTopics?.length || 1)] || section.title;
        return {
          id: c.id || `card-${section.id}-${idx + 1}`,
          sectionId: section.id,
          breadcrumb: `${chapterName} › ${section.title} › ${subtopic}`,
          parentBullet: `• Core Principle: ${subtopic}`,
          front: c.frontPrompt || c.front || `Key question on ${subtopic}`,
          back: c.backAnswer || c.back || `Core model answer for ${subtopic}.`,
          explanation:
            c.explanation ||
            `Under standard conditions in ${section.title}, this relationship remains invariant and is tested in both numerical and theoretical contexts.`,
          sourceExcerpt: c.sourceExcerpt || section.sourceReference || `${chapterName} Reference Notes`,
          interval: typeof c.interval === 'number' && c.interval > 0 ? c.interval : 1,
          repetition: typeof c.repetition === 'number' ? c.repetition : 0,
          easinessFactor: typeof c.easinessFactor === 'number' ? c.easinessFactor : 2.5,
          status: c.status || 'active',
          dueDate: c.dueDate || new Date().toISOString(),
        };
      });
    }

    // Default 5 curated cards with rich RemNote structure
    const topics = section.keyTopics && section.keyTopics.length > 0 ? section.keyTopics : [section.title];
    const t0 = topics[0] || section.title;
    const t1 = topics[1] || t0;

    return [
      {
        id: `card-${section.id}-1`,
        sectionId: section.id,
        breadcrumb: `${chapterName} › ${section.title} › ${t0}`,
        parentBullet: `• Foundational Definition & Operational Mechanism`,
        front: `State the operational definition of ${t0} and its fundamental SI unit.`,
        back: `${t0} defines the rate of quantity transfer per unit dimension across defined equilibrium boundaries. Its standard SI measure is expressed in base units (e.g. J, W, or m/s).`,
        explanation: `Pay close attention to dimensional homogeneity: verify that both left-hand and right-hand sides simplify to matching base dimensions.`,
        sourceExcerpt: `Textbook Section ${section.sectionNumber}: Principles of ${section.title}`,
        interval: 1,
        repetition: 0,
        easinessFactor: 2.5,
        status: 'active',
      },
      {
        id: `card-${section.id}-2`,
        sectionId: section.id,
        breadcrumb: `${chapterName} › ${section.title} › Invariant Laws`,
        parentBullet: `• Mathematical Invariance & Conservation`,
        front: `What quantity remains invariant during transformations in ${section.title}?`,
        back: `Total system energy and momentum remain strictly conserved when no external non-conservative forces act upon the closed boundary.`,
        explanation: `In exam scenarios, always specify whether the boundary permits energy or matter exchange before invoking conservation theorems.`,
        sourceExcerpt: `Textbook Section ${section.sectionNumber}: Conservation Criteria`,
        interval: 1,
        repetition: 0,
        easinessFactor: 2.5,
        status: 'active',
      },
      {
        id: `card-${section.id}-3`,
        sectionId: section.id,
        breadcrumb: `${chapterName} › ${section.title} › Exam Traps`,
        parentBullet: `• Common Calculation Misdirection`,
        front: `What is the most frequent sign convention error when solving problems for ${t1}?`,
        back: `Failing to assign an explicit reference coordinate axis prior to resolving directional vector components.`,
        explanation: `Adopting standard Cartesian coordinates (+ right/up, - left/down) consistently avoids inverted arithmetic terms.`,
        sourceExcerpt: `Exam Scoring Guidelines: Common Traps in ${section.title}`,
        interval: 1,
        repetition: 0,
        easinessFactor: 2.5,
        status: 'active',
      },
      {
        id: `card-${section.id}-4`,
        sectionId: section.id,
        breadcrumb: `${chapterName} › ${section.title} › Limiting Cases`,
        parentBullet: `• Boundary & Extreme Conditions`,
        front: `How does the governing system respond when the driving stimulus approaches zero?`,
        back: `The system asymptotically transitions to its ground-state unperturbed equilibrium without oscillatory residue.`,
        explanation: `Extreme case checking (setting variables to 0 or ∞) is a critical sanity check to validate derivations.`,
        sourceExcerpt: `Syllabus Deep-Dive: Asymptotic System Behavior`,
        interval: 1,
        repetition: 0,
        easinessFactor: 2.5,
        status: 'active',
      },
    ];
  }, [section, chapterName]);

  const [cards, setCards] = useState<RemNoteCardItem[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Active non-disabled cards queue
  const activeQueue = useMemo(() => {
    return cards.filter((c) => c.status !== 'disabled');
  }, [cards]);

  const currentCard = activeQueue[currentIndex] || activeQueue[0];

  // Calculate SM-2 Spaced Repetition metrics
  const stats = useMemo(() => {
    const totalCards = cards.length;
    const activeCards = activeQueue.length;
    const disabledCount = cards.filter((c) => c.status === 'disabled').length;
    const understoodCount = cards.filter((c) => c.lastRating === 'understood' || c.status === 'mastered').length;
    const relearnCount = cards.filter((c) => c.lastRating === 'relearn').length;

    // Mature cards have interval >= 3 or repetition >= 2
    const matureCount = cards.filter(
      (c) => c.status !== 'disabled' && (c.interval >= 3 || c.repetition >= 2 || c.status === 'mastered')
    ).length;

    // Recall deck score based on maturity and growth (0 - 100)
    const recallDeckScore =
      activeCards > 0 ? Math.min(100, Math.round(((matureCount + understoodCount * 0.5) / activeCards) * 100)) : 0;

    // Contributes 60% to overall milestone mastery
    const recallContribution = Math.round(recallDeckScore * 0.6);

    // Overall Milestone Mastery Index = (CheckpointsScore * 0.4) + (RecallDeckScore * 0.6)
    const finalMasteryIndex = Math.min(
      100,
      Math.round(checkpointsScore * 0.4 + recallDeckScore * 0.6)
    );

    return {
      totalCards,
      activeCards,
      disabledCount,
      understoodCount,
      relearnCount,
      matureCount,
      recallDeckScore,
      recallContribution,
      finalMasteryIndex,
    };
  }, [cards, activeQueue, checkpointsScore]);

  // Persist cards state
  const persistCards = useCallback((updated: RemNoteCardItem[]) => {
    setCards(updated);
    try {
      localStorage.setItem(`milestone_recall_deck_${section.id}`, JSON.stringify(updated));
      localStorage.setItem(`recall_deck_${section.id}`, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('studyflow_cards_updated'));
    } catch {}

    const active = updated.filter((c) => c.status !== 'disabled');
    const mature = active.filter((c) => c.interval >= 3 || c.repetition >= 2 || c.status === 'mastered').length;
    const understood = active.filter((c) => c.lastRating === 'understood').length;
    const score = active.length > 0 ? Math.min(100, Math.round(((mature + understood * 0.5) / active.length) * 100)) : 0;

    onUpdateCards?.(section.id, updated, score);
  }, [section.id, onUpdateCards]);

  // Handle 3-Tier Rating: 'disable' | 'relearn' | 'understood'
  const handleRate = useCallback(
    (rating: 'disable' | 'relearn' | 'understood') => {
      if (!currentCard) return;

      const updated = cards.map((c) => {
        if (c.id === currentCard.id) {
          if (rating === 'disable') {
            return {
              ...c,
              status: 'disabled' as const,
              lastRating: 'disable' as const,
            };
          }

          if (rating === 'relearn') {
            // SM-2 Reset: interval = 1, repetition = 0, easiness factor decreased slightly
            return {
              ...c,
              interval: 1,
              repetition: 0,
              easinessFactor: Math.max(1.3, c.easinessFactor - 0.2),
              status: 'learning' as const,
              lastRating: 'relearn' as const,
              dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            };
          }

          // Understood: SM-2 Growth:
          // If repetition == 0 => interval = 1
          // If repetition == 1 => interval = 3
          // Else => interval = Math.round(previousInterval * easinessFactor)
          let nextRep = c.repetition + 1;
          let nextInterval = 1;
          if (nextRep === 1) nextInterval = 1;
          else if (nextRep === 2) nextInterval = 3;
          else nextInterval = Math.min(60, Math.round(c.interval * c.easinessFactor));

          return {
            ...c,
            interval: nextInterval,
            repetition: nextRep,
            easinessFactor: Math.min(2.8, c.easinessFactor + 0.1),
            status: nextInterval >= 3 ? ('mastered' as const) : ('learning' as const),
            lastRating: 'understood' as const,
            dueDate: new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000).toISOString(),
          };
        }
        return c;
      });

      persistCards(updated);

      if (rating === 'understood') {
        confetti({
          particleCount: 20,
          spread: 35,
          origin: { y: 0.8 },
        });
      }

      setIsRevealed(false);
      setIsExplanationOpen(false);

      if (currentIndex < activeQueue.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setIsCompleted(true);
      }
    },
    [currentCard, cards, persistCards, currentIndex, activeQueue.length]
  );

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen || isCompleted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsRevealed((prev) => !prev);
      } else if (isRevealed) {
        if (e.key === '1') handleRate('disable');
        else if (e.key === '2') handleRate('relearn');
        else if (e.key === '3') handleRate('understood');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCompleted, isRevealed, handleRate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* ================================================================= */}
        {/* TOP HEADER: ACTIVE RECALL DECK (SINGLE COMPACT ROW) */}
        {/* ================================================================= */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-400/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                🧠 Active Recall Deck
              </span>

              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {section.title}
              </h2>

              <span className="text-[11px] font-medium text-slate-400 hidden md:inline truncate">
                ({chapterName})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-1 rounded-xl border border-purple-200 dark:border-purple-800">
              {currentIndex + 1} / {activeQueue.length} Cards
            </span>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress track */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1">
          <div
            className="bg-purple-600 h-1 transition-all duration-300 rounded-r-full"
            style={{
              width: `${activeQueue.length > 0 ? ((currentIndex + 1) / activeQueue.length) * 100 : 0}%`,
            }}
          />
        </div>

        {/* ================================================================= */}
        {/* MAIN BODY: REMNOTE CARD DISPLAY OR SESSION SUMMARY */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col justify-center">
          {isCompleted ? (
            /* A. Completed Session Summary */
            <div className="max-w-md mx-auto text-center space-y-6 py-6 animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-3xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 mx-auto flex items-center justify-center shadow-lg">
                <Award className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  SM-2 Queue Completed
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Active Recall Session Finished!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Your spaced repetition deck is scheduled for next interval.
                </p>
              </div>

              {/* Spaced repetition maturity breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-left space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-400">Recall Deck Score (60% weight):</span>
                  <span className="text-purple-600 font-black">{stats.recallDeckScore}%</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600 dark:text-slate-400">Checkpoint Synthesis (40% weight):</span>
                  <span className="text-emerald-600 font-black">{checkpointsScore}%</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm font-black">
                  <span className="text-slate-900 dark:text-white">Overall Section Mastery Index:</span>
                  <span className="text-indigo-600 text-base">{stats.finalMasteryIndex}%</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCompleted(false);
                    setCurrentIndex(0);
                    setIsRevealed(false);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Review Deck Again</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition cursor-pointer shadow-md"
                >
                  Back to Roadmap
                </button>
              </div>
            </div>
          ) : currentCard ? (
            /* B. Active RemNote Card */
            <div className="max-w-2xl mx-auto w-full space-y-4">
              {/* RemNote Breadcrumb & Parent Bullet */}
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-slate-400 truncate">
                  {currentCard.breadcrumb}
                </div>
                <div className="text-xs font-black text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{currentCard.parentBullet}</span>
                </div>
              </div>

              {/* Main Card Surface */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-md space-y-6">
                {/* Prompt (Front) */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Prompt Question
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                    {currentCard.front}
                  </h3>
                </div>

                {/* Inline Reveal Divider */}
                {!isRevealed ? (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                    <button
                      type="button"
                      onClick={() => setIsRevealed(true)}
                      className="w-full py-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 group shadow-2xs"
                    >
                      <Eye className="w-4 h-4 text-purple-500 group-hover:scale-110 transition" />
                      <span>Reveal Answer</span>
                      <span className="text-[10px] font-normal text-purple-400 hidden sm:inline">
                        (or Press Spacebar)
                      </span>
                    </button>
                  </div>
                ) : (
                  /* Answer (Back) + Deep Explanations + Source Anchor */
                  <div className="space-y-5 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in-50 duration-200">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Synthesized Answer
                      </span>
                      <div className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 leading-relaxed bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40">
                        {currentCard.back}
                      </div>
                    </div>

                    {/* Deep Explanation Accordion */}
                    {currentCard.explanation && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setIsExplanationOpen((prev) => !prev)}
                          className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                          <span>{isExplanationOpen ? 'Hide Deep Explanation' : 'View Deep Explanation & Nuance'}</span>
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-transform ${isExplanationOpen ? 'rotate-90' : ''}`}
                          />
                        </button>

                        {isExplanationOpen && (
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                            {currentCard.explanation}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Source Anchor Quote */}
                    {currentCard.sourceExcerpt && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span className="font-semibold text-slate-500">Source Anchor:</span>
                        <span className="italic truncate">{currentCard.sourceExcerpt}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* ================================================================= */}
        {/* FOOTER: 3-TIER RATING BUTTONS (DISABLE, RELEARN, UNDERSTOOD) */}
        {/* ================================================================= */}
        {!isCompleted && currentCard && isRevealed && (
          <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 shrink-0 animate-in slide-in-from-bottom-2 duration-150">
            <div className="max-w-2xl mx-auto space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Evaluate your recall quality:</span>
                <span className="hidden sm:inline">Shortcuts: [1] Disable • [2] Relearn • [3] Understood</span>
              </div>

              {/* 3-Tier Action Bar */}
              <div className="grid grid-cols-3 gap-3">
                {/* 1. Disable */}
                <button
                  type="button"
                  onClick={() => handleRate('disable')}
                  className="px-3 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs transition cursor-pointer flex flex-col items-center justify-center gap-1 shadow-2xs group"
                  title="Suspend or mute this card from the spaced repetition queue [Shortcut: 1]"
                >
                  <div className="flex items-center gap-1.5">
                    <EyeOff className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                    <span>Disable</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-400">Mute from queue</span>
                </button>

                {/* 2. Relearn */}
                <button
                  type="button"
                  onClick={() => handleRate('relearn')}
                  className="px-3 py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold text-xs transition cursor-pointer flex flex-col items-center justify-center gap-1 shadow-2xs"
                  title="Reset interval to 1 day and schedule immediate practice [Shortcut: 2]"
                >
                  <div className="flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-amber-600" />
                    <span>Relearn</span>
                  </div>
                  <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">
                    Interval reset (1d)
                  </span>
                </button>

                {/* 3. Understood */}
                <button
                  type="button"
                  onClick={() => handleRate('understood')}
                  className="px-3 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] border border-emerald-600 text-white font-black text-xs transition cursor-pointer flex flex-col items-center justify-center gap-1 shadow-md hover:shadow-emerald-600/20"
                  title="Boost SM-2 spaced repetition interval [Shortcut: 3]"
                >
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-100" />
                    <span>Understood</span>
                  </div>
                  <span className="text-[10px] font-normal text-emerald-100">
                    +3d interval boost
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MilestoneRecallDeckRunner;
