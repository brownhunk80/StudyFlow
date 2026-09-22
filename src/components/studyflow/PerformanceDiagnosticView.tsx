import React from 'react';
import {
  Trophy,
  Flame,
  Clock,
  RotateCcw,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Section } from '../../types';
import { EnrichedQuizQuestion } from './SectionQuizModal';

export interface DiagnosticConceptItem {
  topic: string;
  isUnderstood: boolean;
  questionIndex: number;
}

interface PerformanceDiagnosticViewProps {
  section: Section;
  chapterName: string;
  questions: EnrichedQuizQuestion[];
  selectedAnswers: Record<number, number>;
  freeResponseEvaluated?: Record<number, boolean>;
  skippedQuestions: Record<number, boolean>;
  score: number;
  timeTakenSec: number;
  onTargetWeakPoints: () => void;
  onRetakeFullCheck: () => void;
  onReturnToRoadmap: () => void;
  onReviewConcept: (topic: string, questionIndex: number) => void;
}

export const PerformanceDiagnosticView: React.FC<PerformanceDiagnosticViewProps> = ({
  section,
  chapterName,
  questions,
  selectedAnswers,
  freeResponseEvaluated = {},
  skippedQuestions,
  score,
  timeTakenSec,
  onTargetWeakPoints,
  onRetakeFullCheck,
  onReturnToRoadmap,
  onReviewConcept,
}) => {
  // Format completion time
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  // Group concepts into Understood vs Relearn Needed
  const conceptMap = new Map<string, { understood: boolean; questionIndex: number }>();

  questions.forEach((q, idx) => {
    const isMcq = q.type === 'multiple_choice';
    const isCorrect = isMcq
      ? selectedAnswers[idx] === q.correctIndex && !skippedQuestions[idx]
      : Boolean(freeResponseEvaluated[idx]) && !skippedQuestions[idx];

    // If already stored and previously marked false, stay false
    const existing = conceptMap.get(q.topicTag);
    if (!existing) {
      conceptMap.set(q.topicTag, { understood: isCorrect, questionIndex: idx });
    } else if (!isCorrect) {
      conceptMap.set(q.topicTag, { understood: false, questionIndex: idx });
    }
  });

  const understoodConcepts: Array<{ topic: string; questionIndex: number }> = [];
  const relearnNeededConcepts: Array<{ topic: string; questionIndex: number }> = [];

  conceptMap.forEach((val, topic) => {
    if (val.understood) {
      understoodConcepts.push({ topic, questionIndex: val.questionIndex });
    } else {
      relearnNeededConcepts.push({ topic, questionIndex: val.questionIndex });
    }
  });

  // Calculate circular SVG progress
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div
      id="performance-diagnostic-view"
      className="p-6 sm:p-9 flex flex-col max-h-[92vh] overflow-y-auto space-y-7 animate-in fade-in duration-200"
    >
      {/* =================================================================== */}
      {/* 1. CARD TITLED "Performance Diagnostic" WITH SCORE RING */}
      {/* =================================================================== */}
      <div
        id="card-performance-diagnostic"
        className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden"
      >
        <div className="space-y-2 text-center md:text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Diagnostic Assessment Complete</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Performance Diagnostic
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md">
            Section {section.sectionNumber} ({section.title}) in {chapterName}. Review concept retention metrics and target identified comprehension gaps.
          </p>
        </div>

        {/* Circular Score Ring & Metrics */}
        <div className="flex items-center gap-6 sm:gap-8 z-10">
          {/* SVG Score Ring */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r={radius}
                className={`transition-all duration-1000 ease-out ${
                  score >= 75
                    ? 'stroke-emerald-500'
                    : score >= 50
                    ? 'stroke-amber-500'
                    : 'stroke-rose-500'
                }`}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-white tracking-tight">{score}%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Accuracy
              </span>
            </div>
          </div>

          {/* Time & Count Stats */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Completion Time</span>
              </div>
              <div className="text-lg font-black text-white font-mono mt-0.5">
                {formatTime(timeTakenSec)}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Validated Concepts</span>
              </div>
              <div className="text-lg font-black text-emerald-400 mt-0.5">
                {understoodConcepts.length} of {conceptMap.size}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. ACTION ROW */}
      {/* [Target Weak Points (2 min Drill)], [Retake Full Check], [Return to Roadmap] */}
      {/* =================================================================== */}
      <div
        id="diagnostic-action-row"
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full"
      >
        {/* Action 1: Target Weak Points (2 min Drill) */}
        {relearnNeededConcepts.length > 0 && (
          <button
            id="target-weak-points-btn"
            type="button"
            onClick={onTargetWeakPoints}
            className="flex-1 px-5 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 active:scale-[0.99] text-white font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/20"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Target Weak Points (2 min Drill)</span>
          </button>
        )}

        {/* Action 2: Retake Full Check */}
        <button
          id="retake-full-check-btn"
          type="button"
          onClick={onRetakeFullCheck}
          className="flex-1 px-5 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Retake Full Check</span>
        </button>

        {/* Action 3: Return to Roadmap */}
        <button
          id="return-to-roadmap-btn"
          type="button"
          onClick={onReturnToRoadmap}
          className="flex-1 px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/20"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Return to Roadmap</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* 3. CONCEPT MASTERY LIST */}
      {/* "Understood" (green badge) & "Relearn Needed" (amber badge with instant review shortcut) */}
      {/* =================================================================== */}
      <div id="concept-mastery-list-container" className="space-y-4 pt-2">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span>Concept Mastery Diagnostics</span>
          <span className="text-xs font-normal text-slate-400">
            {conceptMap.size} Key Topics Evaluated
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* UNDERSTOOD COLUMN (Green Badge) */}
          <div
            id="understood-concepts-column"
            className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Understood ({understoodConcepts.length})</span>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Validated
              </span>
            </div>

            {understoodConcepts.length > 0 ? (
              <div className="space-y-2">
                {understoodConcepts.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.topic}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Consistent recall & accurate application
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onReviewConcept(item.topic, item.questionIndex)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition cursor-pointer"
                      title="Inspect analysis"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                No concepts mastered on this attempt. Try targeted practice below.
              </div>
            )}
          </div>

          {/* RELEARN NEEDED COLUMN (Amber Badge with instant review shortcut) */}
          <div
            id="relearn-needed-column"
            className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Relearn Needed ({relearnNeededConcepts.length})</span>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Target Action
              </span>
            </div>

            {relearnNeededConcepts.length > 0 ? (
              <div className="space-y-2">
                {relearnNeededConcepts.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-800/80 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.topic}
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        Misconception detected or question skipped
                      </div>
                    </div>

                    {/* Instant Review Shortcut Button */}
                    <button
                      type="button"
                      onClick={() => onReviewConcept(item.topic, item.questionIndex)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black text-[11px] transition cursor-pointer flex items-center gap-1 shrink-0 border border-amber-300 dark:border-amber-700"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Review</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                ✓ Outstanding! No relearn gaps detected in this check.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
