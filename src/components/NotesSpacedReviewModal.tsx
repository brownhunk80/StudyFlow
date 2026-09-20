import React, { useState } from 'react';
import {
  BookOpen,
  X,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BrainCircuit,
  Flame,
  Mic,
} from 'lucide-react';
import { Chapter, ChapterNote, NoteSpacedReview, RecallRating } from '../types';
import confetti from 'canvas-confetti';

interface NotesSpacedReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter;
  subject: string;
  onSaveReviewRating: (review: NoteSpacedReview) => void;
  onOpenFeynmanRecorder?: () => void;
}

export const NotesSpacedReviewModal: React.FC<NotesSpacedReviewModalProps> = ({
  isOpen,
  onClose,
  chapter,
  subject,
  onSaveReviewRating,
  onOpenFeynmanRecorder,
}) => {
  const [rated, setRated] = useState(false);
  const [currentRating, setCurrentRating] = useState<RecallRating | null>(null);

  if (!isOpen) return null;

  const notes = chapter.aiNotes;
  const currentReview: NoteSpacedReview = chapter.noteSpacedReview || {
    interval: 1,
    repetitions: 0,
    easeFactor: 2.5,
    box: 1,
    dueDate: new Date().toISOString(),
    status: 'new',
  };

  const handleRate = (rating: RecallRating) => {
    let nextInterval = currentReview.interval;
    let nextRepetitions = currentReview.repetitions + 1;
    let nextBox = currentReview.box;
    let nextEase = currentReview.easeFactor;

    if (rating === 'again') {
      nextInterval = 1;
      nextBox = 1;
      nextEase = Math.max(1.3, nextEase - 0.2);
    } else if (rating === 'hard') {
      nextInterval = Math.max(2, Math.round(nextInterval * 1.2));
      nextBox = Math.min(5, Math.max(1, nextBox));
      nextEase = Math.max(1.3, nextEase - 0.15);
    } else if (rating === 'good') {
      nextInterval = Math.max(3, Math.round(nextInterval * nextEase));
      nextBox = Math.min(5, nextBox + 1);
    } else if (rating === 'easy') {
      nextInterval = Math.max(7, Math.round(nextInterval * nextEase * 1.3));
      nextBox = Math.min(5, nextBox + 2);
      nextEase = Math.min(3.0, nextEase + 0.15);
    }

    const nextDueDate = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000).toISOString();

    const updatedReview: NoteSpacedReview = {
      interval: nextInterval,
      repetitions: nextRepetitions,
      easeFactor: nextEase,
      box: nextBox,
      dueDate: nextDueDate,
      lastReviewed: new Date().toISOString(),
      lastRating: rating,
      status: nextBox >= 4 ? 'mastered' : nextBox >= 2 ? 'review' : 'learning',
    };

    setCurrentRating(rating);
    setRated(true);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    onSaveReviewRating(updatedReview);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Spaced Repetition Note Review
                </h2>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Leitner Box {currentReview.box} / 5
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Active recall on structured notes • Interval: {currentReview.interval} day(s)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Note Content View */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Banner with Feynman Voice Trigger */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                ACTIVE NOTE REVISION
              </span>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">{chapter.name}</h3>
              <p className="text-xs text-slate-500">{subject}</p>
            </div>

            {onOpenFeynmanRecorder && (
              <button
                type="button"
                onClick={onOpenFeynmanRecorder}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition flex items-center gap-2 cursor-pointer self-start sm:self-auto shrink-0"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Voice Explanation</span>
              </button>
            )}
          </div>

          {notes ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5 shadow-xs">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Chapter Core Summary
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                  {notes.summary}
                </p>
              </div>

              {/* Key Concepts */}
              {notes.keyConcepts && notes.keyConcepts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Key Concepts to Recall
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {notes.keyConcepts.map((k, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{k.term}</span>
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                              k.importance === 'critical'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {k.importance}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                          {k.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulas & Governing Equations */}
              {notes.formulasOrLaws && notes.formulasOrLaws.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Governing Laws & Equations
                  </h4>
                  <div className="space-y-2">
                    {notes.formulasOrLaws.map((f, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">{f.name}</span>
                          {f.notes && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{f.notes}</p>
                          )}
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs border border-indigo-200 dark:border-indigo-800">
                          {f.formula}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagram Analyses */}
              {notes.diagramAnalyses && notes.diagramAnalyses.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-400">
                    Diagram & Visual Insights
                  </h4>
                  {notes.diagramAnalyses.map((d, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 text-xs space-y-1"
                    >
                      <span className="font-bold text-purple-900 dark:text-purple-300">{d.diagramTitle}</span>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">{d.observations}</p>
                      <p className="text-purple-800 dark:text-purple-300 font-medium text-[11px]">
                        Takeaway: {d.keyTakeaway}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Common Traps */}
              {notes.commonTraps && notes.commonTraps.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 space-y-1 text-xs">
                  <span className="font-bold text-rose-800 dark:text-rose-300 uppercase text-[10px] tracking-wider">
                    Exam Traps to Avoid
                  </span>
                  <ul className="space-y-1">
                    {notes.commonTraps.map((t, idx) => (
                      <li key={idx} className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              No structured notes available yet. Click "Auto-Create Notes" in the chapter hub.
            </div>
          )}
        </div>

        {/* Spaced Repetition Rating Controls Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shrink-0 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {rated ? 'Rating recorded for this spaced review!' : 'Rate your recall of these chapter notes:'}
            </span>
            <span className="text-[11px] text-slate-400">
              SM-2 / Leitner Algorithm will schedule the next review
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handleRate('again')}
              className={`py-3 px-2 rounded-2xl border text-xs font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                currentRating === 'again'
                  ? 'bg-rose-500 text-white border-rose-600 shadow-md'
                  : 'bg-white dark:bg-slate-800 hover:bg-rose-50 text-rose-600 border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className="text-sm">🔴 Again</span>
              <span className="text-[10px] font-normal opacity-80">Reset (1 day)</span>
            </button>

            <button
              type="button"
              onClick={() => handleRate('hard')}
              className={`py-3 px-2 rounded-2xl border text-xs font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                currentRating === 'hard'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                  : 'bg-white dark:bg-slate-800 hover:bg-amber-50 text-amber-600 border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className="text-sm">🟠 Hard</span>
              <span className="text-[10px] font-normal opacity-80">3 days</span>
            </button>

            <button
              type="button"
              onClick={() => handleRate('good')}
              className={`py-3 px-2 rounded-2xl border text-xs font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                currentRating === 'good'
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-md'
                  : 'bg-white dark:bg-slate-800 hover:bg-emerald-50 text-emerald-600 border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className="text-sm">🟢 Good</span>
              <span className="text-[10px] font-normal opacity-80">7 days</span>
            </button>

            <button
              type="button"
              onClick={() => handleRate('easy')}
              className={`py-3 px-2 rounded-2xl border text-xs font-black transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                currentRating === 'easy'
                  ? 'bg-blue-500 text-white border-blue-600 shadow-md'
                  : 'bg-white dark:bg-slate-800 hover:bg-blue-50 text-blue-600 border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className="text-sm">🔵 Easy</span>
              <span className="text-[10px] font-normal opacity-80">14+ days</span>
            </button>
          </div>

          {rated && (
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Next note review scheduled successfully!</span>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
