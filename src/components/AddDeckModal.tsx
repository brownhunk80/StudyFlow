import React, { useState } from 'react';
import { X, Layers, Sparkles } from 'lucide-react';
import { FlashcardDeck, SubjectItem } from '../types';

interface AddDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectItem[];
  onAddDeck: (deck: Omit<FlashcardDeck, 'id' | 'totalCards' | 'dueCardsCount' | 'masteredCount'>) => void;
}

const PRESET_COLORS = ['#4f46e5', '#ef4444', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

export const AddDeckModal: React.FC<AddDeckModalProps> = ({
  isOpen,
  onClose,
  subjects,
  onAddDeck,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(subjects[0]?.name || 'General');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#4f46e5');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddDeck({
      title: title.trim(),
      subject,
      description: description.trim() || `${subject} active recall deck`,
      color,
    });

    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 my-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Create Recall Deck
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
              Deck Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Physics Formulas, Organic Chem"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="Maths">Maths</option>
              <option value="Science">Science</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Core formulas and definitions for upcoming exam"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Deck Theme Color
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-6 h-6 rounded-full transition cursor-pointer ${
                    color === c ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 dark:shadow-none transition cursor-pointer mt-2"
          >
            Create Deck
          </button>
        </form>
      </div>
    </div>
  );
};
