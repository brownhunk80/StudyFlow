import React, { useState } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Calendar,
  BookOpen,
  Brain,
  CheckCircle2,
  Repeat,
} from 'lucide-react';

interface FirstTimeWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const FirstTimeWelcomeModal: React.FC<FirstTimeWelcomeModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      stepNumber: 1,
      badge: 'Welcome to StudyFlow',
      title: 'Your Personal Study Coach',
      description: 'StudyFlow makes exam preparation simple and stress-free. It helps you know:',
      points: [
        'What to learn',
        'What to revise',
        'What to do today',
      ],
      icon: Sparkles,
      color: 'indigo',
    },
    {
      stepNumber: 2,
      badge: 'Step 1 • Plan',
      title: 'Plan Your Studies',
      description:
        'Add your exams and chapters. StudyFlow will automatically organize what you need to study and schedule your daily lessons.',
      points: [
        'Set your exam date and target score',
        'Pick the chapters you need to cover',
        'We build your personalized daily schedule',
      ],
      icon: Calendar,
      color: 'blue',
    },
    {
      stepNumber: 3,
      badge: 'Step 2 • Learn',
      title: 'Learn & Understand',
      description:
        'Study your chapters, read your books or notes, and explain concepts in your own words to make sure you truly understand.',
      points: [
        'Read key chapter materials and topic notes',
        'Explain topics to find what you understood and missed',
        'Save and finalize your chapter notes',
      ],
      icon: BookOpen,
      color: 'emerald',
    },
    {
      stepNumber: 4,
      badge: 'Step 3 • Recall',
      title: 'Recall at the Right Time',
      description:
        'StudyFlow reminds you what you should recall so you remember it for longer and walk into exams fully confident.',
      points: [
        'Practice cards right when your memory needs a boost',
        'Only revise what is due for today',
        'Keep improving until you are exam-ready',
      ],
      icon: Brain,
      color: 'purple',
    },
  ];

  const current = steps[currentStep];
  const Icon = current.icon;
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div
      id="welcome-onboarding-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/30 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-white/98 dark:bg-slate-900/98 backdrop-blur-md rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="px-5 pt-5 pb-1 flex items-center justify-between">
          {/* Step Pill */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? 'w-6 bg-indigo-600 dark:bg-indigo-400'
                    : i < currentStep
                    ? 'w-1.5 bg-indigo-300 dark:bg-indigo-800'
                    : 'w-1.5 bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleSkip}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded-lg transition cursor-pointer"
          >
            Dismiss
          </button>
        </div>

        {/* Content Body */}
        <div className="px-5 py-3.5 space-y-3.5">
          {/* Icon + Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {current.badge}
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {current.title}
              </h2>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {current.description}
          </p>

          {/* Points list */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-2">
            {current.points.map((point, index) => (
              <div key={index} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-200 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{point}</span>
              </div>
            ))}
          </div>

          {/* Simple App Flow ribbon */}
          <div className="py-2 px-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/70 dark:border-indigo-900/30 flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
            <span className={currentStep === 1 ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : ''}>
              PLAN
            </span>
            <span>→</span>
            <span className={currentStep === 2 ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : ''}>
              LEARN
            </span>
            <span>→</span>
            <span className={currentStep === 3 ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : ''}>
              RECALL
            </span>
            <span>→</span>
            <span className="text-slate-400 flex items-center gap-1">
              <Repeat className="w-2.5 h-2.5" /> REPEAT
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-50/70 dark:bg-slate-900/70 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
          {currentStep > 0 ? (
            <button
              onClick={handleBack}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer ml-auto"
          >
            <span>{isLast ? 'Get Started' : 'Next'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
