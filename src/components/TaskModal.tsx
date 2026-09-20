import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, Clock } from 'lucide-react';
import { TaskItem, SubjectItem } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (task: Partial<TaskItem>) => void;
  subjects: SubjectItem[];
  editingTask?: TaskItem | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSaveTask,
  subjects,
  editingTask,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(subjects[0]?.name || 'Maths');
  const [durationMin, setDurationMin] = useState<number>(45);
  const [priority, setPriority] = useState<'High Priority' | 'Medium' | 'Normal'>('High Priority');
  const [type, setType] = useState<'Revise' | 'Practice' | 'Exam Prep' | 'Homework'>('Revise');
  const [dateCategory, setDateCategory] = useState<'today' | 'upcoming'>('today');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setSubject(editingTask.subject);
      setDurationMin(editingTask.durationMin);
      setPriority(editingTask.priority);
      setType(editingTask.type);
      setDateCategory(editingTask.dateCategory);
    } else {
      setTitle('');
      setSubject(subjects[0]?.name || 'Maths');
      setDurationMin(45);
      setPriority('High Priority');
      setType('Revise');
      setDateCategory('today');
    }
  }, [editingTask, isOpen, subjects]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSaveTask({
      id: editingTask ? editingTask.id : 'task-' + Date.now(),
      title: title.trim(),
      subject,
      durationMin,
      priority,
      type,
      dateCategory,
      scheduledDate: dateCategory === 'upcoming' ? 'SEP 8' : 'Today',
      completed: editingTask?.completed || false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 my-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
            {editingTask ? 'Edit Study Task' : 'Add Study Task'}
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
              Task Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4 Formulas & Practice"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
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
                Duration (min)
              </label>
              <input
                type="number"
                min={5}
                max={180}
                value={durationMin}
                onChange={(e) => setDurationMin(parseInt(e.target.value, 10) || 25)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="Revise">Revise</option>
                <option value="Practice">Practice</option>
                <option value="Exam Prep">Exam Prep</option>
                <option value="Homework">Homework</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Schedule
              </label>
              <select
                value={dateCategory}
                onChange={(e) => setDateCategory(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
              >
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 dark:shadow-none transition cursor-pointer mt-2"
          >
            {editingTask ? 'Save Changes' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  );
};
