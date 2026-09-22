import React, { useState } from 'react';
import {
  X,
  Sliders,
  CheckCircle2,
  ListFilter,
  FileText,
  Brain,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Section } from '../../types';

export type DrillFormat = 'multiple_choice' | 'open_response';
export type CognitiveDepth = 'direct_recall' | 'applied_reasoning';

export interface DrillConfig {
  format: DrillFormat;
  cognitiveDepth: CognitiveDepth;
  questionCount: number;
}

interface CheckLearningConfigModalProps {
  section: Section;
  chapterName: string;
  isOpen: boolean;
  initialConfig?: DrillConfig;
  onClose: () => void;
  onLaunch: (config: DrillConfig) => void;
}

export const CheckLearningConfigModal: React.FC<CheckLearningConfigModalProps> = ({
  section,
  chapterName,
  isOpen,
  initialConfig = {
    format: 'multiple_choice',
    cognitiveDepth: 'applied_reasoning',
    questionCount: 4,
  },
  onClose,
  onLaunch,
}) => {
  const [format, setFormat] = useState<DrillFormat>(initialConfig.format);
  const [cognitiveDepth, setCognitiveDepth] = useState<CognitiveDepth>(initialConfig.cognitiveDepth);
  const [questionCount, setQuestionCount] = useState<number>(initialConfig.questionCount);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLaunch({
      format,
      cognitiveDepth,
      questionCount,
    });
  };

  return (
    <div
      id="check-learning-config-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        id="check-learning-config-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Section {section.sectionNumber} • {chapterName}
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
                Customize Check Learning Session
              </h2>
            </div>
          </div>

          <button
            id="close-config-modal-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Format Selection: [Multiple Choice] / [Open Response] */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Drill Format</span>
              <span className="text-[10px] text-slate-400 lowercase font-normal">choose question archetype</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Multiple Choice Card */}
              <button
                id="format-option-mcq"
                type="button"
                onClick={() => setFormat('multiple_choice')}
                className={`p-4 rounded-2xl border-2 transition text-left cursor-pointer flex flex-col justify-between ${
                  format === 'multiple_choice'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-slate-900 dark:text-white ring-1 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-black">Multiple Choice</span>
                  </div>
                  {format === 'multiple_choice' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Stacked option cards with immediate distractor analysis & trap identification.
                </p>
              </button>

              {/* Open Response Card */}
              <button
                id="format-option-open"
                type="button"
                onClick={() => setFormat('open_response')}
                className={`p-4 rounded-2xl border-2 transition text-left cursor-pointer flex flex-col justify-between ${
                  format === 'open_response'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-slate-900 dark:text-white ring-1 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-black">Open Response</span>
                  </div>
                  {format === 'open_response' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Free-form synthesis, derivation typing, and expert rubric self-assessment.
                </p>
              </button>
            </div>
          </div>

          {/* Cognitive Depth Selection: [Direct Recall] / [Applied Reasoning] */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Cognitive Depth</span>
              <span className="text-[10px] text-slate-400 lowercase font-normal">diagnostic complexity</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Direct Recall */}
              <button
                id="depth-option-recall"
                type="button"
                onClick={() => setCognitiveDepth('direct_recall')}
                className={`p-4 rounded-2xl border-2 transition text-left cursor-pointer flex flex-col justify-between ${
                  cognitiveDepth === 'direct_recall'
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-slate-900 dark:text-white ring-1 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-black">Direct Recall</span>
                  </div>
                  {cognitiveDepth === 'direct_recall' && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Fast definitions, axioms, algebraic formulas, and convention boundaries.
                </p>
              </button>

              {/* Applied Reasoning */}
              <button
                id="depth-option-applied"
                type="button"
                onClick={() => setCognitiveDepth('applied_reasoning')}
                className={`p-4 rounded-2xl border-2 transition text-left cursor-pointer flex flex-col justify-between ${
                  cognitiveDepth === 'applied_reasoning'
                    ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-slate-900 dark:text-white ring-1 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-black">Applied Reasoning</span>
                  </div>
                  {cognitiveDepth === 'applied_reasoning' && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Real-world synthesis, numerical ray derivations, and multi-step exam traps.
                </p>
              </button>
            </div>
          </div>

          {/* Question Count Selector */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Drill Length
            </label>
            <div className="flex items-center gap-2">
              {[3, 4, 6].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setQuestionCount(cnt)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                    questionCount === cnt
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cnt} Questions
                </button>
              ))}
            </div>
          </div>

          {/* Primary Action Button: "Launch Check" */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              id="launch-check-btn"
              type="submit"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/25"
            >
              <span>Launch Check</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
