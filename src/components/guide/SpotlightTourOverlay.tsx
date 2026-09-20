import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, ArrowLeft, X, Sparkles } from 'lucide-react';
import { TourStep } from '../../types';

interface SpotlightTourOverlayProps {
  isOpen: boolean;
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
  tourName?: string;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export const SpotlightTourOverlay: React.FC<SpotlightTourOverlayProps> = ({
  isOpen,
  steps,
  onComplete,
  onSkip,
  tourName,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number; placement: 'top' | 'bottom' }>({
    top: 100,
    left: 20,
    placement: 'bottom',
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStepIndex];

  // Measure target element position
  const updatePosition = useCallback(() => {
    if (!step) return;

    const el = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    const pad = 8;
    const computedRect: TargetRect = {
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
      bottom: rect.bottom + pad,
      right: rect.right + pad,
    };
    setTargetRect(computedRect);

    // Compute tooltip position
    const vpHeight = window.innerHeight;
    const vpWidth = window.innerWidth;
    const tooltipWidth = Math.min(320, vpWidth - 32);
    const tooltipHeight = 140;

    // Check space below vs above
    const spaceBelow = vpHeight - computedRect.bottom;
    const spaceAbove = computedRect.top;

    let placement: 'top' | 'bottom' = 'bottom';
    let topPos = computedRect.bottom + 10;

    if (step.position === 'top' || (spaceBelow < tooltipHeight + 16 && spaceAbove > spaceBelow)) {
      placement = 'top';
      topPos = Math.max(12, computedRect.top - tooltipHeight - 10);
    } else {
      placement = 'bottom';
      topPos = Math.min(vpHeight - tooltipHeight - 12, computedRect.bottom + 10);
    }

    // Horizontal centering relative to target, clamped to screen bounds
    const targetCenterX = computedRect.left + computedRect.width / 2;
    let leftPos = targetCenterX - tooltipWidth / 2;
    leftPos = Math.max(16, Math.min(vpWidth - tooltipWidth - 16, leftPos));

    setTooltipPosition({
      top: Math.max(16, topPos),
      left: Math.max(16, leftPos),
      placement,
    });
  }, [step]);

  // Scroll target into view & update position when step changes
  useEffect(() => {
    if (!isOpen || !step) return;

    const el = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Give a short moment for smooth scroll then measure
    const timer = setTimeout(() => {
      updatePosition();
    }, 150);

    const handleWindowEvents = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleWindowEvents);
    window.addEventListener('scroll', handleWindowEvents, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleWindowEvents);
      window.removeEventListener('scroll', handleWindowEvents, true);
    };
  }, [isOpen, currentStepIndex, step, updatePosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, steps.length]);

  if (!isOpen || !step) return null;

  const isLast = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div
      id="spotlight-tour-overlay"
      className="fixed inset-0 z-50 overflow-hidden pointer-events-auto"
      role="dialog"
      aria-modal="true"
    >
      {/* Subtle Semi-transparent SVG Mask Backdrop (non-blocking, allows underlying content to remain visible) */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none transition-all duration-300">
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="14"
                ry="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.25)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Target Focus Border & Pulse Ring */}
      {targetRect && (
        <div
          className="fixed pointer-events-none transition-all duration-300 ease-out z-50 rounded-2xl border-2 border-indigo-500/70 shadow-[0_0_0_3px_rgba(99,102,241,0.2)]"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      {/* Interactive Tooltip Card - Compact, subtle translucent backdrop */}
      <div
        ref={tooltipRef}
        style={{
          top: targetRect ? tooltipPosition.top : '40%',
          left: targetRect ? tooltipPosition.left : '50%',
          transform: targetRect ? 'none' : 'translate(-50%, -50%)',
          maxWidth: '320px',
          width: 'calc(100vw - 32px)',
        }}
        className="fixed z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-indigo-100/90 dark:border-indigo-900/60 p-3.5 space-y-2.5 transition-all duration-200"
      >
        {/* Step Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Guide • Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>

          <button
            onClick={onSkip}
            className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer flex items-center gap-1"
          >
            <span>Dismiss</span>
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-0.5">
          <h3 className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
            {step.title}
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
            {step.description}
          </p>
        </div>

        {/* Navigation Actions */}
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === currentStepIndex
                    ? 'w-3.5 bg-indigo-600 dark:bg-indigo-400'
                    : 'w-1 bg-slate-200 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {currentStepIndex > 0 && (
              <button
                onClick={handleBack}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
              >
                <ArrowLeft className="w-2.5 h-2.5" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition cursor-pointer"
            >
              <span>{isLast ? 'Got it' : 'Next'}</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
