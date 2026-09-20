import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCw,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Zap,
  RotateCcw,
  Keyboard,
  Brain,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Flashcard, RecallRating } from '../types';
import { calculateSM2 } from '../utils/spacedRepetition';

interface ActiveRecallSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Flashcard[];
  deckTitle: string;
  onCardReviewed?: (cardId: string, updatedFields: Partial<Flashcard>, rating: RecallRating) => void;
  onRateCard?: (cardId: string, rating: RecallRating, updatedFields?: Partial<Flashcard>) => void;
  onSessionComplete?: (totalReviewed: number, xpEarned: number) => void;
}

export const ActiveRecallSessionModal: React.FC<ActiveRecallSessionModalProps> = ({
  isOpen,
  onClose,
  cards = [],
  deckTitle,
  onCardReviewed,
  onRateCard,
  onSessionComplete,
}) => {
  const safeCards = Array.isArray(cards) ? cards : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setReviewedCount(0);
      setSessionCompleted(false);
      setSessionStats({ again: 0, hard: 0, good: 0, easy: 0 });
    }
  }, [isOpen, safeCards.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || sessionCompleted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === '1') handleRate('again');
        if (e.key === '2') handleRate('hard');
        if (e.key === '3') handleRate('good');
        if (e.key === '4') handleRate('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFlipped, sessionCompleted, currentIndex, safeCards.length]);

  if (!isOpen) return null;

  const currentCard = safeCards[currentIndex] || safeCards[0] || null;

  const handleRate = (rating: RecallRating) => {
    if (!currentCard) return;

    // Execute the underlying SM-2 spaced repetition algorithm
    const updated = calculateSM2(currentCard, rating);
    if (typeof onCardReviewed === 'function') {
      onCardReviewed(currentCard.id, updated, rating);
    }
    if (typeof onRateCard === 'function') {
      onRateCard(currentCard.id, rating, updated);
    }

    setSessionStats((prev) => ({
      ...prev,
      [rating]: prev[rating] + 1,
    }));

    const nextCount = reviewedCount + 1;
    setReviewedCount(nextCount);

    if (currentIndex + 1 < safeCards.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    } else {
      // Session finished
      setSessionCompleted(true);
      const earnedXP = nextCount * 5 + 25;
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
      });
      if (onSessionComplete) {
        onSessionComplete(nextCount, earnedXP);
      }
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setReviewedCount(0);
    setSessionCompleted(false);
    setSessionStats({ again: 0, hard: 0, good: 0, easy: 0 });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-auto flex flex-col transition-all">
        {/* Top Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
              {deckTitle || 'Recall Session'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!sessionCompleted && safeCards.length > 0 && (
              <span className="text-xs font-bold text-slate-400 font-mono-digits">
                {currentIndex + 1} of {safeCards.length}
              </span>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col justify-between space-y-6">
          {sessionCompleted ? (
            /* ================================================================= */
            /* 1. SIMPLE COMPLETION SUMMARY (DONE or CONTINUE)                   */
            /* ================================================================= */
            <div className="text-center py-6 space-y-6 my-auto">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Session Complete! 🎉
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  You reviewed {reviewedCount} {reviewedCount === 1 ? 'item' : 'items'}.
                </p>
              </div>

              {/* Clean breakdown */}
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-center">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono-digits">
                    {sessionStats.good + sessionStats.easy}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    Remembered
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-xl font-black text-slate-700 dark:text-slate-300 font-mono-digits">
                    {sessionStats.again + sessionStats.hard}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    To review soon
                  </div>
                </div>
              </div>

              {/* XP Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 text-xs font-bold text-amber-800 dark:text-amber-300">
                <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>+{reviewedCount * 5 + 25} XP Earned</span>
              </div>

              {/* DONE or CONTINUE Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 max-w-sm mx-auto">
                <button
                  onClick={onClose}
                  className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-sm transition cursor-pointer shadow-sm shadow-indigo-200 dark:shadow-none"
                >
                  DONE
                </button>

                <button
                  onClick={handleRestart}
                  className="w-full py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                  <span>CONTINUE</span>
                </button>
              </div>
            </div>
          ) : safeCards.length === 0 || !currentCard ? (
            /* Empty State */
            <div className="text-center py-12 space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                All caught up!
              </h3>
              <p className="text-xs text-slate-400">
                No items are due for review in this selection right now.
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                DONE
              </button>
            </div>
          ) : (
            /* ================================================================= */
            /* 2. DISTRACTION-FREE RECALL SESSION                                */
            /* FLOW: QUESTION → THINK → ANSWER → RATE/RECALL → NEXT              */
            /* ================================================================= */
            <div className="space-y-5 flex-1 flex flex-col justify-between">
              {/* Subtle Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / safeCards.length) * 100}%` }}
                />
              </div>

              {/* Subject & Chapter tag */}
              <div className="text-xs font-bold text-slate-400 truncate">
                <span>{currentCard.subject}</span>
                {currentCard.chapter && (
                  <>
                    <span className="mx-1.5 text-slate-300 dark:text-slate-600">•</span>
                    <span>{currentCard.chapter}</span>
                  </>
                )}
              </div>

              {/* The Distraction-Free Card */}
              <div
                onClick={() => !isFlipped && setIsFlipped(true)}
                className={`relative min-h-[220px] rounded-3xl p-6 sm:p-7 border-2 transition-all flex flex-col justify-between ${
                  !isFlipped ? 'cursor-pointer' : ''
                } ${
                  isFlipped
                    ? 'bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900'
                    : 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700 hover:border-indigo-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {isFlipped ? 'ANSWER' : 'QUESTION'}
                    </span>

                    {!isFlipped && (
                      <span className="text-[11px] font-medium text-slate-400">
                        Think of the answer...
                      </span>
                    )}
                  </div>

                  {/* Main Card Text */}
                  <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-relaxed whitespace-pre-line">
                    {isFlipped ? currentCard.back : currentCard.front}
                  </div>

                  {/* Optional retrieval hint */}
                  {!isFlipped && currentCard.clozeHint && (
                    <div className="mt-4">
                      {showHint ? (
                        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 text-xs font-semibold text-amber-800 dark:text-amber-300">
                          💡 Hint: {currentCard.clozeHint}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowHint(true);
                          }}
                          className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Need a hint?</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Notes / Explanation on Answer side */}
                  {isFlipped && currentCard.notes && (
                    <div className="mt-4 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200">
                      💡 <strong>Key note:</strong> {currentCard.notes}
                    </div>
                  )}
                </div>

                {/* Subtext instruction */}
                {!isFlipped && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                    <span>Tap card or click button below to reveal</span>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px]">
                      <Keyboard className="w-3 h-3" /> Space to flip
                    </span>
                  </div>
                )}
              </div>

              {/* Action Controls: QUESTION side vs ANSWER side */}
              {!isFlipped ? (
                /* Step 3: Reveal Answer */
                <div>
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="w-full py-4 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-black text-sm shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>SHOW ANSWER</span>
                  </button>
                </div>
              ) : (
                /* Step 4 & 5: RATE/RECALL → NEXT */
                <div className="space-y-2.5">
                  <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">
                    HOW WELL DID YOU RECALL THIS?
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {/* Again (Forgot) */}
                    <button
                      onClick={() => handleRate('again')}
                      className="py-3 px-1 rounded-2xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-300 flex flex-col items-center justify-center transition cursor-pointer active:scale-95"
                    >
                      <span className="text-xs font-black">Again</span>
                      <span className="text-[10px] opacity-75 font-semibold mt-0.5">Forgot</span>
                    </button>

                    {/* Hard (Struggled) */}
                    <button
                      onClick={() => handleRate('hard')}
                      className="py-3 px-1 rounded-2xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-300 flex flex-col items-center justify-center transition cursor-pointer active:scale-95"
                    >
                      <span className="text-xs font-black">Hard</span>
                      <span className="text-[10px] opacity-75 font-semibold mt-0.5">Struggled</span>
                    </button>

                    {/* Good (Remembered) */}
                    <button
                      onClick={() => handleRate('good')}
                      className="py-3 px-1 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex flex-col items-center justify-center transition cursor-pointer active:scale-95"
                    >
                      <span className="text-xs font-black">Good</span>
                      <span className="text-[10px] opacity-75 font-semibold mt-0.5">Remembered</span>
                    </button>

                    {/* Easy (Effortless) */}
                    <button
                      onClick={() => handleRate('easy')}
                      className="py-3 px-1 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex flex-col items-center justify-center transition cursor-pointer active:scale-95"
                    >
                      <span className="text-xs font-black">Easy</span>
                      <span className="text-[10px] opacity-75 font-semibold mt-0.5">Effortless</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center">
                    Shortcuts: Press 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
