import React from 'react';
import { X, Sparkles, Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { TaskItem } from '../types';

interface WhyThisTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskItem | null;
  onStartFocus: (task: TaskItem) => void;
}

export const WhyThisTaskModal: React.FC<WhyThisTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onStartFocus,
}) => {
  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 my-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Why this task?
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {task.subject}
            </span>
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">
              {task.title}
            </h4>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-900 dark:text-white">Upcoming Exam:</strong>{' '}
                Scheduled {task.examCountdown || 'soon'}. Starting review 2 weeks prior improves retention by 40%.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-900 dark:text-white">Time Allocation:</strong>{' '}
                {task.durationMin} minutes is the recommended deep-focus revision window before taking a break.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <p>
                <strong className="text-slate-900 dark:text-white">High Priority:</strong>{' '}
                Covers foundational concepts required for upcoming practice tests.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              onStartFocus(task);
            }}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 dark:shadow-none transition cursor-pointer mt-4"
          >
            Start This Focus Session
          </button>
        </div>
      </div>
    </div>
  );
};
