import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  Sparkles,
  ChevronRight,
  BookOpen,
  Trash2,
} from 'lucide-react';
import { Flashcard, FlashcardDeck, SubjectItem } from '../types';
import { isCardDue } from '../utils/spacedRepetition';
import confetti from 'canvas-confetti';
import { useOnboarding } from '../context/OnboardingContext';
import { PageGuideButton } from './guide/PageGuideButton';

interface RecallScreenProps {
  decks?: FlashcardDeck[];
  cards?: Flashcard[];
  flashcards?: Flashcard[];
  subjects?: SubjectItem[];
  onStartRecallSession?: (deckId?: string, subject?: string) => void;
  onStartSession?: (deckId?: string) => void;
  onOpenAddCard?: (defaultDeckId?: string) => void;
  onAddCard?: (defaultDeckId?: string) => void;
  onOpenAddDeck?: () => void;
  onAddDeck?: () => void;
  onDeleteDeck?: (deckId: string) => void;
  onDeleteCard?: (cardId: string) => void;
  onGenerateAIFlashcards?: (topic: string, targetDeckId: string) => void;
  onAddFlashcards?: (cards: Array<Omit<Flashcard, 'id' | 'interval' | 'repetitions' | 'easeFactor' | 'status' | 'box'>>) => void;
}

export const RecallScreen: React.FC<RecallScreenProps> = ({
  decks = [],
  cards,
  flashcards = [],
  subjects = [],
  onStartRecallSession,
  onStartSession,
  onOpenAddCard,
  onAddCard,
  onOpenAddDeck,
  onAddDeck,
  onDeleteDeck,
  onDeleteCard,
}) => {
  const allCards = cards || flashcards || [];
  const handleStart = onStartRecallSession || onStartSession || (() => {});
  const handleAddCard = onOpenAddCard || onAddCard || (() => {});
  const handleAddDeck = onOpenAddDeck || onAddDeck || (() => {});

  const [showSubjectBrowser, setShowSubjectBrowser] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Due cards calculation (using the underlying spaced repetition scheduler)
  const dueCards = allCards.filter(isCardDue);
  
  // Approximate duration: ~1 minute per item, rounded gently
  const estimatedMins = Math.max(2, Math.round(dueCards.length * 1));

  // Breakdown by subject
  const subjectBreakdown: Record<string, { count: number; total: number; color?: string }> = {};

  // First seed from existing subjects or decks
  decks.forEach((deck) => {
    const subjName = deck.subject || 'General';
    if (!subjectBreakdown[subjName]) {
      subjectBreakdown[subjName] = { count: 0, total: 0, color: deck.color };
    }
  });

  // Tally due cards per subject
  dueCards.forEach((c) => {
    const subj = c.subject || 'General';
    if (!subjectBreakdown[subj]) {
      subjectBreakdown[subj] = { count: 0, total: 0 };
    }
    subjectBreakdown[subj].count += 1;
  });

  // Tally total cards per subject
  allCards.forEach((c) => {
    const subj = c.subject || 'General';
    if (!subjectBreakdown[subj]) {
      subjectBreakdown[subj] = { count: 0, total: 0 };
    }
    subjectBreakdown[subj].total += 1;
  });

  const subjectEntries = Object.entries(subjectBreakdown).sort((a, b) => b[1].count - a[1].count);

  const { triggerPageTour } = useOnboarding();

  useEffect(() => {
    triggerPageTour('recall');
  }, [triggerPageTour]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 pt-2">
      {/* ======================================================================= */}
      {/* 1. SIMPLE HEADER                                                        */}
      {/* ======================================================================= */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Recall
            </h1>
            <PageGuideButton guideKey="recall" label="How Recall works" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Review items scheduled for today to lock them into memory.
          </p>
        </div>

        <button
          onClick={() => handleAddCard()}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Card</span>
        </button>
      </div>

      {/* ======================================================================= */}
      {/* 2. TODAY'S RECALL (PRIMARY FOCUS)                                       */}
      {/* ======================================================================= */}
      {dueCards.length > 0 ? (
        <div data-tour="recall-due-cards" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-6">
          {/* Due Count & Time */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                TODAY&apos;S RECALL
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-1 font-mono-digits">
                {dueCards.length} items due today
              </h2>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full w-fit">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>~{estimatedMins} minutes</span>
            </div>
          </div>

          {/* Simple Breakdown by Subject */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Breakdown
            </h3>

            <div className="space-y-2">
              {subjectEntries
                .filter(([_, stats]) => stats.count > 0)
                .map(([subj, stats]) => (
                  <div
                    key={subj}
                    onClick={() => handleStart(undefined, subj)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        {subj}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black font-mono-digits text-slate-700 dark:text-slate-300">
                        {stats.count} {stats.count === 1 ? 'item' : 'items'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Large, Obvious Primary Action */}
          <div className="pt-2">
            <button
              data-tour="recall-start-btn"
              onClick={() => handleStart()}
              className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-black text-base flex items-center justify-center gap-2.5 shadow-sm shadow-indigo-200 dark:shadow-none transition cursor-pointer group"
            >
              <Play className="w-5 h-5 fill-white group-hover:scale-110 transition" />
              <span>START RECALL</span>
            </button>
            <p className="text-center text-xs text-slate-400 mt-2.5">
              Review each question, recall the answer, and rate your confidence.
            </p>
          </div>
        </div>
      ) : (
        /* Zero Due / All Caught Up State */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/90 dark:border-slate-800 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-100 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {allCards.length === 0 ? 'No Flashcards Yet' : 'All caught up for today! 🎉'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {allCards.length === 0
                ? 'Create an exam study plan in the Plan tab, or click "+ Add Card" above to build your flashcard deck.'
                : 'You have 0 items due for recall right now. Your memory intervals are up to date.'}
            </p>
          </div>

          <div className="pt-2">
            {allCards.length === 0 ? (
              <button
                onClick={() => handleAddCard()}
                className="py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition cursor-pointer inline-flex items-center gap-2 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create Your First Card</span>
              </button>
            ) : (
              <button
                onClick={() => handleStart(undefined, undefined)}
                className="py-3 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-black transition cursor-pointer inline-flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Practice Ahead ({allCards.length} items in vault)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* 3. OPTIONAL / SECONDARY: BROWSE BY SUBJECT OR DECK                      */}
      {/* ======================================================================= */}
      <div className="pt-2">
        <button
          onClick={() => setShowSubjectBrowser(!showSubjectBrowser)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold transition cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-400" />
            <span>Browse All Subjects & Decks ({decks.length})</span>
          </div>
          <span className="text-slate-400">{showSubjectBrowser ? 'Hide' : 'Show'}</span>
        </button>

        {showSubjectBrowser && (
          <div className="mt-3 space-y-2.5 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500">Decks in your vault</span>
              <button
                onClick={handleAddDeck}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                + New Deck
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {decks.map((deck) => {
                const deckCards = allCards.filter((c) => c.deckId === deck.id);
                const deckDueCount = deckCards.filter(isCardDue).length;

                return (
                  <div
                    key={deck.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {deck.title}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {deck.subject} • {deckCards.length} cards {deckDueCount > 0 && `(${deckDueCount} due)`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStart(deck.id)}
                        disabled={deckCards.length === 0}
                        className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
