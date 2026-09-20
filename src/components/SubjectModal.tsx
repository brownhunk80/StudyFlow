import React, { useState } from 'react';
import { X, BookOpen, Folder } from 'lucide-react';
import { SubjectItem } from '../types';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType: 'study' | 'project';
  onAddSubject: (subject: Omit<SubjectItem, 'id'>) => void;
}

const PRESET_COLORS = [
  '#8b5cf6', // purple
  '#f97316', // orange
  '#3b82f6', // blue
  '#10b981', // emerald
  '#ec4899', // pink
  '#6366f1', // indigo
];

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  defaultType,
  onAddSubject,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'study' | 'project'>(defaultType);
  const [color, setColor] = useState(defaultType === 'study' ? '#8b5cf6' : '#f97316');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddSubject({
      name: name.trim(),
      type,
      color,
    });
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 my-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
            {type === 'study' ? 'Add Study Subject' : 'Add Project'}
          </h3>
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
              Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === 'study' ? 'e.g. Physics, History' : 'e.g. Science Fair, Capstone'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('study');
                  setColor('#8b5cf6');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                  type === 'study'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Study Subject</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('project');
                  setColor('#f97316');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                  type === 'project'
                    ? 'bg-amber-50 border-amber-500 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>Project</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Color Tag
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
            Save Subject
          </button>
        </form>
      </div>
    </div>
  );
};
