import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Brain,
  Layers,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Exam, SpacedRevisionPlan, SpacedRevisionSlot, TaskItem } from '../types';
import { fetchSpacedRevisionPlan } from '../utils/aiClient';

interface SpacedRevisionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam;
  onApplyPlanToTasks: (newTasks: Array<Omit<TaskItem, 'id' | 'completed'>>) => void;
}

export const SpacedRevisionPlanModal: React.FC<SpacedRevisionPlanModalProps> = ({
  isOpen,
  onClose,
  exam,
  onApplyPlanToTasks,
}) => {
  const [plan, setPlan] = useState<SpacedRevisionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const chapters = exam.chapters || [];
  const masteredCount = chapters.filter((c) => c.status === 'mastered').length;
  const needWorkCount = chapters.filter((c) => c.status === 'need_work').length;

  const handleGeneratePlan = async () => {
    setIsLoading(true);
    setAppliedMessage(null);
    try {
      const generated = await fetchSpacedRevisionPlan(
        exam.name,
        exam.examDate,
        exam.daysLeft,
        chapters.map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          lastTestScore: c.lastTestScore,
        }))
      );
      setPlan(generated);
      confetti({ particleCount: 50, spread: 60 });
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Could not generate revision plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyToTasks = () => {
    if (!plan) return;

    const newTasks: Array<Omit<TaskItem, 'id' | 'completed'>> = plan.slots.map((slot, idx) => {
      const isFirst = idx === 0;
      return {
        title: `${slot.revisionType}: ${slot.chapterName}`,
        subject: exam.name,
        durationMin: slot.estimatedMinutes,
        priority: slot.intervalStage === '1-day' ? 'High Priority' : 'Medium',
        type: 'Revise',
        dateCategory: isFirst ? 'today' : 'upcoming',
        scheduledDate: slot.scheduledDate,
        whyRationale: `Revision Plan: ${slot.keyFocusAreas.join('; ')}`,
        examCountdown: `${exam.daysLeft}d to exam`,
      };
    });

    onApplyPlanToTasks(newTasks);
    confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
    setAppliedMessage(`Successfully added ${newTasks.length} spaced revision task(s) to your Plan screen!`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                EBBINGHAUS FORGETTING CURVE
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                AI Spaced Revision Plan · {exam.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono-digits">
              {exam.daysLeft}d left
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Exam Context Banner */}
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                {exam.name} Status: {masteredCount}/{chapters.length} chapters mastered
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {needWorkCount > 0
                  ? `${needWorkCount} chapters flagged as needing work will be prioritized first.`
                  : 'All chapters included in the optimal forgetting-curve intervals.'}
              </p>
            </div>

            <button
              onClick={handleGeneratePlan}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Calculating...' : plan ? 'Regenerate Plan' : 'Generate Plan'}</span>
            </button>
          </div>

          {appliedMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{appliedMessage}</span>
            </div>
          )}

          {isLoading && (
            <div className="py-14 text-center space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Computing optimal interval milestones for {chapters.length} chapters...
              </p>
            </div>
          )}

          {!isLoading && !plan && (
            <div className="py-12 px-6 text-center space-y-3 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700">
              <Calendar className="w-10 h-10 text-indigo-500 mx-auto opacity-80" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Generate your spaced revision schedule
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                AI structures your study sessions into 1-day, 3-day, 7-day, and 14-day intervals to reinforce neural pathways before {exam.name}.
              </p>
              <button
                onClick={handleGeneratePlan}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition"
              >
                Generate Spaced Revision Plan
              </button>
            </div>
          )}

          {!isLoading && plan && (
            <div className="space-y-4">
              {/* Rationale explanation */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  LEARNING SCIENCE RATIONALE
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1 leading-relaxed">
                  {plan.rationale}
                </p>
              </div>

              {/* Revision Slots Timeline */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Scheduled Spaced Sessions ({plan.slots.length})
                  </span>
                  <button
                    onClick={handleApplyToTasks}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Apply Plan to My Tasks</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {plan.slots.map((slot, idx) => (
                    <div
                      key={slot.id || idx}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-100 dark:border-slate-800 shadow-xs flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {slot.intervalStage}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {slot.scheduledDate}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {slot.estimatedMinutes} mins
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {slot.revisionType}: {slot.chapterName}
                        </h4>

                        <div className="pt-1">
                          <ul className="space-y-0.5">
                            {slot.keyFocusAreas.map((f, i) => (
                              <li key={i} className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <span className="text-indigo-500">•</span>
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="shrink-0 pt-1">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          Session #{idx + 1}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
