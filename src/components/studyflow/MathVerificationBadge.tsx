import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Info,
  Scale,
  RefreshCw,
} from 'lucide-react';
import { MathValidationResult } from '../../utils/mathEquivalence';

interface MathVerificationBadgeProps {
  validation: MathValidationResult;
  showFeedbackText?: boolean;
  className?: string;
  compact?: boolean;
}

export const MathVerificationBadge: React.FC<MathVerificationBadgeProps> = ({
  validation,
  showFeedbackText = true,
  className = '',
  compact = false,
}) => {
  const { errorType, badgeLabel, feedback, isMatch, signError, unitError, isClose } = validation;

  if (errorType === 'empty' || !badgeLabel) {
    return null;
  }

  // Determine styling based on error taxonomy
  let badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  let bannerStyle = 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
  let Icon = HelpCircle;
  let iconColor = 'text-slate-500';

  if (validation.isUnitConverted) {
    badgeStyle = 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-sm';
    bannerStyle = 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100';
    Icon = Scale;
    iconColor = 'text-emerald-600 dark:text-emerald-400';
  } else if (errorType === 'exact' || (isMatch && !unitError && !signError)) {
    badgeStyle = 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-sm';
    bannerStyle = 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100';
    Icon = CheckCircle2;
    iconColor = 'text-emerald-600 dark:text-emerald-400';
  } else if (errorType === 'equivalent') {
    badgeStyle = 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-sm';
    bannerStyle = 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100';
    Icon = CheckCircle2;
    iconColor = 'text-emerald-600 dark:text-emerald-400';
  } else if (errorType === 'sign' || signError) {
    badgeStyle = 'bg-amber-50 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-sm';
    bannerStyle = 'bg-amber-50/90 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100';
    Icon = AlertTriangle;
    iconColor = 'text-amber-600 dark:text-amber-400';
  } else if (errorType === 'unit' || unitError) {
    badgeStyle = 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 shadow-sm';
    bannerStyle = 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-950 dark:text-indigo-100';
    Icon = Scale;
    iconColor = 'text-indigo-600 dark:text-indigo-400';
  } else if (errorType === 'precision' || isClose) {
    badgeStyle = 'bg-sky-50 text-sky-900 dark:bg-sky-950/70 dark:text-sky-300 border-sky-300 dark:border-sky-700 shadow-sm';
    bannerStyle = 'bg-sky-50/90 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 text-sky-950 dark:text-sky-100';
    Icon = Sparkles;
    iconColor = 'text-sky-600 dark:text-sky-400';
  } else if (errorType === 'intermediate_step') {
    badgeStyle = 'bg-purple-50 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-700 shadow-sm';
    bannerStyle = 'bg-purple-50/90 dark:bg-purple-950/60 border-purple-300 dark:border-purple-700 text-purple-950 dark:text-purple-100';
    Icon = Info;
    iconColor = 'text-purple-600 dark:text-purple-400';
  } else if (errorType === 'incorrect') {
    badgeStyle = 'bg-rose-50 text-rose-900 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800 shadow-sm';
    bannerStyle = 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100';
    Icon = AlertCircle;
    iconColor = 'text-rose-600 dark:text-rose-400';
  }

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all duration-150 ${badgeStyle} ${className}`}>
        <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
        <span>{badgeLabel}</span>
      </div>
    );
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 transition-all duration-150 ${bannerStyle}`}>
        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
        <div className="flex-1 space-y-0.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-extrabold">{badgeLabel}</span>
            {validation.confidence > 0 && (
              <span className="text-[10px] font-mono opacity-75 font-semibold">
                {validation.confidence}% Match
              </span>
            )}
          </div>
          {showFeedbackText && feedback && (
            <p className="text-[11px] leading-relaxed opacity-90 font-medium">
              {feedback}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
