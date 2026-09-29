import React from 'react';
import { Scale, ArrowRight, BookOpen, CheckCircle2, Sparkles } from 'lucide-react';
import { DimensionCategory, UnitConversionLogEntry } from '../../utils/mathUnitConversion';

interface UnitConversionLogCardProps {
  logEntry: UnitConversionLogEntry;
  onOpenReference?: (dimension: DimensionCategory) => void;
  className?: string;
  compact?: boolean;
}

export const UnitConversionLogCard: React.FC<UnitConversionLogCardProps> = ({
  logEntry,
  onOpenReference,
  className = '',
  compact = false,
}) => {
  const {
    studentDisplay,
    expectedDisplay,
    dimension,
    dimensionTitle,
    scaleEquation,
    scaleFactorRatioText,
    baseEquivalenceText,
  } = logEntry;

  if (compact) {
    return (
      <div className={`p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs flex items-center justify-between gap-2 ${className}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div className="truncate">
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{scaleEquation}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5 font-medium">({dimensionTitle})</span>
          </div>
        </div>

        {onOpenReference && (
          <button
            type="button"
            onClick={() => onOpenReference(dimension)}
            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 flex items-center gap-0.5 cursor-pointer"
          >
            <span>Reference</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`p-3.5 sm:p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-br from-indigo-50/70 via-slate-50/50 to-emerald-50/40 dark:from-indigo-950/40 dark:via-slate-900/40 dark:to-emerald-950/20 text-xs space-y-3 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <span className="font-extrabold uppercase tracking-wider text-[11px] text-indigo-950 dark:text-indigo-200">
            Unit Conversion Log
          </span>
        </div>

        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {dimensionTitle}
        </span>
      </div>

      {/* Input vs Target Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
            Your Provided Input
          </span>
          <p className="font-mono font-bold text-slate-900 dark:text-white text-sm">
            {studentDisplay}
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-emerald-200/80 dark:border-emerald-900/60 space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Target Benchmark
          </span>
          <p className="font-mono font-bold text-emerald-700 dark:text-emerald-300 text-sm">
            {expectedDisplay}
          </p>
        </div>
      </div>

      {/* Scale Equation & Multiplier Note */}
      <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 text-[11px] space-y-1">
        <div className="flex items-center justify-between gap-2 flex-wrap font-mono">
          <span className="font-bold text-indigo-950 dark:text-indigo-200">
            {scaleEquation}
          </span>
          <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold">
            {scaleFactorRatioText}
          </span>
        </div>
        {baseEquivalenceText && (
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            {baseEquivalenceText}
          </p>
        )}
      </div>

      {/* Action to open reference cards */}
      {onOpenReference && (
        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            onClick={() => onOpenReference(dimension)}
            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline inline-flex items-center gap-1 cursor-pointer transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>View Quick Conversion Reference Sheet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
