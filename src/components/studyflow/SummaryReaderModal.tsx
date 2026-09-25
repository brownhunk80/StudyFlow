import React, { useState } from 'react';
import { X, BookOpen, Sparkles, FileText, CheckCircle2, AlertTriangle, ArrowRight, Copy, Check } from 'lucide-react';
import { Section, SummaryMode } from '../../types';

interface SummaryReaderModalProps {
  section: Section;
  chapterName: string;
  isOpen: boolean;
  onClose: () => void;
  onMarkRead?: (sectionId: string) => void;
}

export const SummaryReaderModal: React.FC<SummaryReaderModalProps> = ({
  section,
  chapterName,
  isOpen,
  onClose,
  onMarkRead,
}) => {
  const [activeTier, setActiveTier] = useState<SummaryMode>('compact');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const compactSummary = section.summaries?.find((s) => s.mode === 'compact')?.contentMarkdown ||
    `### Key Takeaways: ${section.title}\n\n- **Core Principle**: Foundational mechanisms and relationships for ${section.title}.\n- **Key Formula**: Standard curriculum equations apply with SI units.\n- **Exam Strategy**: Identify boundary conditions prior to numerical calculations.`;

  const detailedSummary = section.summaries?.find((s) => s.mode === 'detailed')?.contentMarkdown ||
    `## ${section.title} — Comprehensive Study Notes\n\n### Theoretical Background\n${section.title} is a critical component of ${chapterName}. Understanding this section is vital for both direct recall questions and multi-step analytical problem solving.\n\n### Key Concepts & Definitions\n- **Core Mechanism**: How the physical phenomenon behaves under varied conditions.\n- **Governing Laws**: Conservation laws, standard sign conventions, and unit dimensional analysis.\n\n### Common Exam Traps\n- ⚠️ Confusing directional conventions and sign conventions.\n- ⚠️ Forgetting to convert standard units (e.g. cm to meters or minutes to seconds).\n\n### Scoring Guidelines\nAlways write down the general formula first before substituting given values to secure method marks.`;

  const currentContent = activeTier === 'compact' ? compactSummary : detailedSummary;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Section {section.sectionNumber} • {chapterName}
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {section.completionRate}% Mastered
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 line-clamp-1">
                {section.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dual-Tier Switcher Bar */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-700/60 text-xs font-bold">
            <button
              onClick={() => setActiveTier('compact')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeTier === 'compact'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Compact Summary</span>
            </button>
            <button
              onClick={() => setActiveTier('detailed')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                activeTier === 'detailed'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>Detailed Study Notes</span>
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          <div className="bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-3 text-xs flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
            <Sparkles className="w-4 h-4 shrink-0 text-indigo-500" />
            <span>
              {activeTier === 'compact'
                ? 'High-yield key takeaways and equations synthesized for quick active revision.'
                : 'Deep theoretical explanations with common exam traps, nuances, and scoring tips.'}
            </span>
          </div>

          <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm whitespace-pre-line leading-relaxed font-sans">
            {currentContent}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Estimated reading time: ~{section.estimatedMinutes || 10} min
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
            {onMarkRead && (
              <button
                onClick={() => {
                  onMarkRead(section.id);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark as Reviewed (+15%)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
