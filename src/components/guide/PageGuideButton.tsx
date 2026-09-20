import React from 'react';
import { HelpCircle } from 'lucide-react';
import { useOnboarding } from '../../context/OnboardingContext';
import { GuideKey } from '../../types';

interface PageGuideButtonProps {
  guideKey: GuideKey;
  label?: string;
  className?: string;
}

export const PageGuideButton: React.FC<PageGuideButtonProps> = ({
  guideKey,
  label,
  className = '',
}) => {
  const { replayGuide } = useOnboarding();

  const defaultLabel =
    guideKey === 'home'
      ? 'How Home works'
      : guideKey === 'learn'
      ? 'How Learn works'
      : guideKey === 'recall'
      ? 'How Recall works'
      : guideKey === 'plan'
      ? 'How Plan works'
      : guideKey === 'progress'
      ? 'How Progress works'
      : guideKey === 'chapter'
      ? 'How Chapter works'
      : 'How this works';

  return (
    <button
      type="button"
      onClick={() => replayGuide(guideKey)}
      title={label || defaultLabel}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-slate-100/70 hover:bg-indigo-50 dark:bg-slate-800/60 dark:hover:bg-indigo-950/40 border border-slate-200/80 hover:border-indigo-200 dark:border-slate-700/80 dark:hover:border-indigo-800/60 transition cursor-pointer shrink-0 shadow-2xs ${className}`}
    >
      <HelpCircle className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
      <span>{label || defaultLabel}</span>
    </button>
  );
};
