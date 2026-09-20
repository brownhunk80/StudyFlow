import React, { useState } from 'react';
import { X, Plus, Brain, Sparkles } from 'lucide-react';
import { Flashcard, FlashcardDeck } from '../types';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  decks: FlashcardDeck[];
  defaultDeckId?: string;
  onAddCard: (card: Omit<Flashcard, 'id' | 'interval' | 'repetitions' | 'easeFactor' | 'dueDate' | 'box' | 'status'>) => void;
}

export const AddCardModal: React.FC<AddCardModalProps> = ({
  isOpen,
  onClose,
  decks,
  defaultDeckId,
  onAddCard,
}) => {
  const [deckId, setDeckId] = useState(defaultDeckId || decks[0]?.id || 'deck-maths');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [chapter, setChapter] = useState('');
  const [clozeHint, setClozeHint] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const selectedDeck = decks.find((d) => d.id === deckId) || decks[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;

    onAddCard({
      deckId,
      front: front.trim(),
      back: back.trim(),
      subject: selectedDeck?.subject || 'General',
      chapter: chapter.trim() || undefined,
      clozeHint: clozeHint.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setFront('');
    setBack('');
    setChapter('');
    setClozeHint('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 my-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Add Active Recall Card
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Select Deck
            </label>
            <select
              value={deckId}
              onChange={(e) => setDeckId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
            >
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.subject})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Chapter / Topic (Optional)
            </label>
            <input
              type="text"
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
              placeholder="e.g. Thermodynamics, Coordinate Geometry"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Question / Prompt (Front)
            </label>
            <textarea
              required
              rows={3}
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="e.g. State Newton's Second Law of Motion and its mathematical formula."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Answer / Explanation (Back)
            </label>
            <textarea
              required
              rows={3}
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="e.g. F = m·a (Force equals mass times acceleration)."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Retrieval Hint
              </label>
              <input
                type="text"
                value={clozeHint}
                onChange={(e) => setClozeHint(e.target.value)}
                placeholder="e.g. F = m · ?"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Key Takeaway / Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Units: Newtons"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 dark:shadow-none transition cursor-pointer mt-2"
          >
            Create Flashcard (Spaced Repetition Enabled)
          </button>
        </form>
      </div>
    </div>
  );
};
