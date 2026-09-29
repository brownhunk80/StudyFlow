import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  Eye,
  Keyboard,
  Mic,
  MicOff,
  PenTool,
  ShieldCheck,
  Award,
  ChevronRight,
  ChevronLeft,
  Calculator,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Target,
  Info,
  CheckCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import ReactMarkdown from 'react-markdown';
import {
  WorkedExampleFadingPayload,
  WorkedExampleStep,
  Section,
  FadedStage1WorkedExample,
  FadedStage2Scaffold,
  FadedStage3Independent,
} from '../../types';
import { validateMathAnswer, MathValidationResult } from '../../utils/mathEquivalence';
import { MathVerificationBadge } from './MathVerificationBadge';

export interface WorkedExampleFadingViewProps {
  section: Section;
  chapterName: string;
  subjectName?: string;
  fadingData: WorkedExampleFadingPayload;
  onSaveProgress?: (fading: WorkedExampleFadingPayload, scorePct: number) => void;
  onProceedToRecallDeck?: () => void;
  onClose: () => void;
}

interface ValidationResult {
  status: 'empty' | 'typing' | 'correct' | 'sign_mismatch' | 'incorrect';
  isValid: boolean | null;
  message: string;
}

export const WorkedExampleFadingView: React.FC<WorkedExampleFadingViewProps> = ({
  section,
  chapterName,
  subjectName = 'Science',
  fadingData,
  onSaveProgress,
  onProceedToRecallDeck,
  onClose,
}) => {
  // Step State: 1 = Worked Example, 2 = Faded Scaffold, 3 = Independent Problem
  const [fadingStep, setFadingStep] = useState<1 | 2 | 3>(1);
  const [isCompleted, setIsCompleted] = useState(false);

  // Stage 1 State
  const [workedExampleUnderstood, setWorkedExampleUnderstood] = useState(false);

  // Stage 2 State (Faded Scaffold)
  const [fadedInputValue, setFadedInputValue] = useState('');
  const [fadedVerified, setFadedVerified] = useState<boolean | null>(null);
  const [fadedFeedback, setFadedFeedback] = useState<string | null>(null);
  const [showScaffoldHint, setShowScaffoldHint] = useState(false);
  const [showFullSolution, setShowFullSolution] = useState(false);

  // Stage 3 State (Independent Problem)
  const [independentResponse, setIndependentResponse] = useState('');
  const [independentRevealed, setIndependentRevealed] = useState(false);
  const [independentAssessment, setIndependentAssessment] = useState<'understood' | 'needs_work' | null>(null);
  const [activeInputMode, setActiveInputMode] = useState<'type' | 'speak' | 'paper'>('type');

  // Input ref for inserting math symbols
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Voice recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Paper scratchpad
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasTool, setCanvasTool] = useState<'pen' | 'eraser'>('pen');

  // Math symbols palette for fast typing
  const mathSymbols = ['−', '+', '×', '÷', '±', '√', '²', '³', 'π', 'θ', 'λ', '∆', 'Ω', 'µ', 'cm', 'm/s', '1/f', '1/v', '1/u', '(', ')'];

  // Normalize stages from either fadedScaffolding array or individual properties
  const stage1Data: FadedStage1WorkedExample = useMemo(() => {
    if (Array.isArray(fadingData.fadedScaffolding) && fadingData.fadedScaffolding[0]) {
      return fadingData.fadedScaffolding[0];
    }
    const we = fadingData.workedExample;
    return {
      stage: 1,
      stageTitle: 'Stage 1: Fully Worked Example',
      problemStatement: we?.problemStatement || 'Fully worked expert derivation',
      fullDerivationSteps: (we?.steps || []).map((s, idx) => ({
        step: s.stepNumber || idx + 1,
        action: `${s.label}: ${s.expressionOrAction}`,
        reasonWhy: s.rationale,
      })),
      keyTakeaway: we?.teacherKeyTip || `Final Result: ${we?.finalAnswer || ''}`,
    };
  }, [fadingData]);

  const stage2Data: FadedStage2Scaffold = useMemo(() => {
    if (Array.isArray(fadingData.fadedScaffolding) && fadingData.fadedScaffolding[1]) {
      return fadingData.fadedScaffolding[1];
    }
    const fs = fadingData.fadedScaffold;
    const fadedStep = fs?.steps?.find((s) => s.isFaded) || fs?.steps?.[1] || fs?.steps?.[0];
    const givenSteps = (fs?.steps || [])
      .filter((s) => !s.isFaded)
      .map((s) => `Step ${s.stepNumber}: ${s.label} → ${s.expressionOrAction}`);

    return {
      stage: 2,
      stageTitle: 'Stage 2: Faded Scaffold (Complete the Missing Step)',
      problemStatement: fs?.problemStatement || 'Complete the missing intermediate derivation step',
      givenSteps: givenSteps.length > 0 ? givenSteps : [`Formula: ${fs?.governingFormulaOrLaw || ''}`],
      fadedMissingStepPrompt: fadedStep
        ? `Step ${fadedStep.stepNumber} (${fadedStep.label}): Calculate the intermediate derivation value for ${fadedStep.expressionOrAction.replace('[BLANK]', '______')}`
        : 'Calculate the intermediate calculation value.',
      benchmarkMissingStep: fadedStep?.fadedExpectedAnswer || fs?.finalAnswer || '',
      solution: fs?.finalAnswer || '',
      fadedStepHint: fs?.fadedStepHint || 'Review Cartesian sign conventions and formula rearrangement.',
      alternativeAcceptableAnswers: fadedStep?.fadedAlternativeAnswers || [],
    };
  }, [fadingData]);

  const stage3Data: FadedStage3Independent = useMemo(() => {
    if (Array.isArray(fadingData.fadedScaffolding) && fadingData.fadedScaffolding[2]) {
      return fadingData.fadedScaffolding[2];
    }
    const ip = fadingData.independentProblem;
    return {
      stage: 3,
      stageTitle: 'Stage 3: Independent Practice',
      problemStatement: ip?.prompt || 'Solve the unassisted problem from memory',
      benchmarkAnswer: ip?.benchmarkAnswer || '',
      scoringCriteria: ip?.keyPointsToVerify || [],
      trapAnalysis: ip?.trapAnalysis,
    };
  }, [fadingData]);

  // Real-time Unified Math Validation Result
  const mathValidation: MathValidationResult = useMemo(() => {
    if (!fadedInputValue.trim()) {
      return {
        isMatch: false,
        isExact: false,
        isEquivalent: false,
        signError: false,
        unitError: false,
        isClose: false,
        confidence: 0,
        errorType: 'empty',
        badgeLabel: '',
        feedback: 'Type your missing intermediate calculation value above...',
        normalizedInput: '',
        normalizedExpected: '',
      };
    }

    const acceptable = stage2Data.alternativeAcceptableAnswers || [];
    return validateMathAnswer(fadedInputValue, stage2Data.benchmarkMissingStep, acceptable);
  }, [fadedInputValue, stage2Data]);

  // Backward-compatible Real-Time Validation Adapter
  const liveValidation: ValidationResult = useMemo(() => {
    const raw = fadedInputValue.trim();
    if (!raw) {
      return {
        status: 'empty',
        isValid: null,
        message: 'Type your missing intermediate calculation value above...',
      };
    }

    if (mathValidation.isMatch) {
      return {
        status: 'correct',
        isValid: true,
        message: mathValidation.feedback,
      };
    }

    if (mathValidation.signError) {
      return {
        status: 'sign_mismatch',
        isValid: false,
        message: mathValidation.feedback,
      };
    }

    if (mathValidation.unitError) {
      return {
        status: 'incorrect',
        isValid: false,
        message: mathValidation.feedback,
      };
    }

    return {
      status: 'incorrect',
      isValid: false,
      message: mathValidation.feedback,
    };
  }, [fadedInputValue, mathValidation]);

  // Load saved state from localStorage if exists
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`worked_example_fading_state_${section.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.workedExampleUnderstood) setWorkedExampleUnderstood(true);
        if (parsed.fadedInputValue) setFadedInputValue(parsed.fadedInputValue);
        if (parsed.fadedVerified !== undefined) setFadedVerified(parsed.fadedVerified);
        if (parsed.independentResponse) setIndependentResponse(parsed.independentResponse);
        if (parsed.independentRevealed) setIndependentRevealed(parsed.independentRevealed);
        if (parsed.independentAssessment) setIndependentAssessment(parsed.independentAssessment);
        if (parsed.fadingStep) setFadingStep(parsed.fadingStep);
      }
    } catch (e) {
      console.warn('Failed to load fading state:', e);
    }
  }, [section.id]);

  // Persist state helper
  const saveCurrentState = (updates: Partial<{
    workedExampleUnderstood: boolean;
    fadedInputValue: string;
    fadedVerified: boolean | null;
    independentResponse: string;
    independentRevealed: boolean;
    independentAssessment: 'understood' | 'needs_work' | null;
    fadingStep: 1 | 2 | 3;
  }>) => {
    try {
      const current = {
        workedExampleUnderstood,
        fadedInputValue,
        fadedVerified,
        independentResponse,
        independentRevealed,
        independentAssessment,
        fadingStep,
        ...updates,
      };
      localStorage.setItem(`worked_example_fading_state_${section.id}`, JSON.stringify(current));

      // Calculate score
      let score = 0;
      if (current.workedExampleUnderstood) score += 30;
      if (current.fadedVerified) score += 30;
      if (current.independentAssessment === 'understood') score += 40;
      else if (current.independentAssessment === 'needs_work') score += 20;

      onSaveProgress?.(fadingData, score);
    } catch {}
  };

  // Insert math symbol into active input
  const handleInsertSymbol = (sym: string) => {
    const input = inputRef.current;
    if (!input) {
      setFadedInputValue((prev) => prev + sym);
      return;
    }
    const start = input.selectionStart || fadedInputValue.length;
    const end = input.selectionEnd || fadedInputValue.length;
    const newVal = fadedInputValue.substring(0, start) + sym + fadedInputValue.substring(end);
    setFadedInputValue(newVal);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + sym.length, start + sym.length);
    }, 10);
  };

  // Stage 1 -> Stage 2 transition
  const handleCompleteWorkedExample = () => {
    setWorkedExampleUnderstood(true);
    saveCurrentState({ workedExampleUnderstood: true, fadingStep: 2 });
    setFadingStep(2);
    confetti({
      particleCount: 20,
      spread: 40,
      origin: { y: 0.7 },
    });
  };

  // Stage 2 Verification
  const handleVerifyFadedStep = () => {
    const isCorrect = liveValidation.isValid === true;
    setFadedVerified(isCorrect);
    setFadedFeedback(liveValidation.message);
    saveCurrentState({ fadedInputValue, fadedVerified: isCorrect });

    if (isCorrect) {
      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.7 },
      });
    }
  };

  // Stage 3 Handlers
  const handleIndependentSelfAssess = (rating: 'understood' | 'needs_work') => {
    setIndependentAssessment(rating);
    saveCurrentState({ independentAssessment: rating, independentRevealed: true });

    if (rating === 'understood') {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
    setIsCompleted(true);
  };

  // Voice Handlers
  const handleToggleVoice = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => setIsListening(true);
      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setIndependentResponse((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
      rec.start();
    } else {
      setIsListening(true);
      setTimeout(() => setIsListening(false), 2000);
    }
  };

  // Canvas Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.strokeStyle = canvasTool === 'eraser' ? '#ffffff' : '#4f46e5';
    ctx.lineWidth = canvasTool === 'eraser' ? 18 : 2.5;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  // Calculate overall score
  const computedScore =
    (workedExampleUnderstood ? 30 : 0) +
    (fadedVerified || liveValidation.isValid === true ? 30 : 0) +
    (independentAssessment === 'understood' ? 40 : independentAssessment === 'needs_work' ? 20 : 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* 3-Stage Progress Stepper */}
      <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => setFadingStep(1)}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            fadingStep === 1
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-cyan-400 shadow-xs'
              : workedExampleUnderstood
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>1. Worked Example</span>
          {workedExampleUnderstood && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
        </button>

        <button
          type="button"
          onClick={() => setFadingStep(2)}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            fadingStep === 2
              ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
              : fadedVerified || liveValidation.isValid === true
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>2. Faded Scaffold</span>
          {(fadedVerified || liveValidation.isValid === true) && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setFadingStep(3)}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            fadingStep === 3
              ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
              : independentAssessment === 'understood'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>3. Independent Problem</span>
          {independentAssessment === 'understood' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
        </button>
      </div>

      {/* Completion Summary Card */}
      {isCompleted && (
        <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-4 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
            <Award className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Worked Example Fading Mastered!
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Cognitive mastery score: <span className="font-bold text-emerald-600">{computedScore}%</span>. You completed expert derivation analysis, intermediate step calculation with real-time validation, and independent synthesis.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsCompleted(false);
                setFadingStep(1);
              }}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Review Steps
            </button>
            {onProceedToRecallDeck && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onProceedToRecallDeck();
                }}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-purple-600/25 cursor-pointer"
              >
                <span>Proceed to Active Recall Deck</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STAGE 1: FULLY WORKED PROBLEM (EXPERT DERIVATION & RATIONALE)     */}
      {/* ================================================================= */}
      {fadingStep === 1 && (
        <div className="space-y-5 max-w-3xl mx-auto animate-in fade-in-50 duration-200">
          {/* Header Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2.5 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800">
                {stage1Data.stageTitle}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Topic: {fadingData.topicTag || section.title}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              {stage1Data.problemStatement}
            </h3>
          </div>

          {/* Derivation Steps List */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-4 shadow-xs">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Expert Step-by-Step Derivation & Rationale</span>
            </h4>
            <div className="space-y-3">
              {stage1Data.fullDerivationSteps.map((step) => (
                <div key={step.step} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-indigo-600 dark:text-cyan-400">
                      Step {step.step}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                    {step.action}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pl-1">
                    Rationale: {step.reasonWhy}
                  </p>
                </div>
              ))}
            </div>

            {/* Key Takeaway Banner */}
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
              <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold uppercase text-[10px] tracking-wider block text-emerald-900 dark:text-emerald-200">
                  Key Takeaway / Teacher Tip:
                </span>
                <span>{stage1Data.keyTakeaway}</span>
              </div>
            </div>
          </div>

          {/* Action to proceed */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleCompleteWorkedExample}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 mx-auto shadow-md transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>I've Understood the Step Derivation → Proceed to Faded Scaffold</span>
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STAGE 2: FADED SCAFFOLD (TEXT INPUT INTERACTION LAYER + REAL-TIME) */}
      {/* ================================================================= */}
      {fadingStep === 2 && (
        <div className="space-y-5 max-w-3xl mx-auto animate-in fade-in-50 duration-200">
          {/* Header Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                {stage2Data.stageTitle}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Type Missing Intermediate Value
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              {stage2Data.problemStatement}
            </h3>
          </div>

          {/* Pre-calculated Given Steps */}
          {stage2Data.givenSteps && stage2Data.givenSteps.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>Given Pre-Calculated Foundations:</span>
              </span>
              <div className="space-y-1.5">
                {stage2Data.givenSteps.map((gs, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span>{gs}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Text Input Layer */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border-2 border-amber-300 dark:border-amber-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Target Missing Step To Calculate
                </span>
              </div>
              {liveValidation.isValid === true && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in zoom-in-90">
                  <CheckCircle2 className="w-4 h-4" /> Live Verified
                </span>
              )}
            </div>

            {/* Prompt */}
            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 text-xs sm:text-sm font-semibold text-amber-950 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
              {stage2Data.fadedMissingStepPrompt}
            </div>

            {/* Live Formula Preview with Embedded Student Input */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white font-mono text-xs sm:text-sm flex items-center gap-2 flex-wrap shadow-inner">
              <span className="text-slate-400 text-xs uppercase font-sans font-bold mr-1">Formula Line:</span>
              <span className="text-cyan-300">Intermediate Step = </span>
              <span className={`px-2 py-0.5 rounded font-bold border transition ${
                liveValidation.status === 'correct'
                  ? 'bg-emerald-900/80 text-emerald-300 border-emerald-500'
                  : liveValidation.status === 'sign_mismatch'
                  ? 'bg-amber-900/80 text-amber-300 border-amber-500'
                  : fadedInputValue.trim()
                  ? 'bg-indigo-900/80 text-cyan-200 border-cyan-400'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {fadedInputValue.trim() || '_______'}
              </span>
            </div>

            {/* Math Symbol Quick Palette */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-bold">Quick Math Symbols:</span>
                <span>Click to insert at cursor position</span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {mathSymbols.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => handleInsertSymbol(sym)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-amber-100 dark:hover:bg-slate-600 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shrink-0 cursor-pointer transition active:scale-95"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Input Layer */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={fadedInputValue}
                    onChange={(e) => setFadedInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleVerifyFadedStep();
                    }}
                    placeholder="Type intermediate calculation value (e.g., -30 cm or v = -30)..."
                    className={`w-full p-3.5 rounded-xl bg-white dark:bg-slate-800 border-2 font-mono text-sm sm:text-base text-slate-900 dark:text-white focus:outline-none transition shadow-2xs ${
                      liveValidation.status === 'correct'
                        ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                        : liveValidation.status === 'sign_mismatch'
                        ? 'border-amber-500 focus:ring-2 focus:ring-amber-500'
                        : 'border-amber-400 dark:border-amber-600 focus:ring-2 focus:ring-amber-500'
                    }`}
                  />
                  {liveValidation.status === 'correct' && (
                    <span className="absolute right-3.5 top-3.5 text-emerald-500">
                      <CheckCircle2 className="w-5 h-5" />
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleVerifyFadedStep}
                  className="px-6 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span>Verify Step</span>
                </button>
              </div>

              {/* Real-time Math Verification Diagnostic Badge */}
              {fadedInputValue.trim() ? (
                <MathVerificationBadge validation={mathValidation} />
              ) : (
                <div className="p-3 rounded-xl text-xs font-bold transition flex items-start gap-2 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-snug">
                    Type your missing intermediate calculation value above...
                  </div>
                </div>
              )}
            </div>

            {/* Hint and Solution Disclosures */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowScaffoldHint(!showScaffoldHint)}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{showScaffoldHint ? 'Hide Hint' : 'Need a Hint?'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFullSolution(!showFullSolution)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showFullSolution ? 'Hide Solution' : 'Inspect Full Solution'}</span>
              </button>
            </div>

            {showScaffoldHint && stage2Data.fadedStepHint && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in-50">
                <span className="font-bold block mb-1">Scaffold Hint:</span>
                <span>{stage2Data.fadedStepHint}</span>
              </div>
            )}

            {showFullSolution && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1.5 animate-in fade-in-50">
                <div className="text-slate-500 font-sans font-bold">Expert Benchmark Solution:</div>
                <div className="text-emerald-700 dark:text-emerald-300 font-bold">{stage2Data.solution}</div>
              </div>
            )}
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFadingStep(1)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
            >
              ← Back to Worked Example
            </button>
            <button
              type="button"
              onClick={() => {
                setFadingStep(3);
                saveCurrentState({ fadingStep: 3 });
              }}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <span>Proceed to Stage 3 (Independent Problem)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STAGE 3: INDEPENDENT PRACTICE (UNSCAFFOLDED EXAM PROOF)           */}
      {/* ================================================================= */}
      {fadingStep === 3 && (
        <div className="space-y-5 max-w-3xl mx-auto animate-in fade-in-50 duration-200">
          {/* Header Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                {stage3Data.stageTitle}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Derive from memory without scaffolding
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              {stage3Data.problemStatement}
            </h3>
          </div>

          {/* Multimodal Input Workspace */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveInputMode('type')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeInputMode === 'type' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-cyan-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Type Derivation</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveInputMode('speak')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeInputMode === 'speak' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-cyan-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Speak Steps</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveInputMode('paper')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeInputMode === 'paper' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-cyan-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Paper Scratchpad</span>
              </button>
            </div>

            {activeInputMode === 'type' && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 overflow-x-auto pb-1">
                  <span className="text-[11px] font-bold text-slate-400 mr-1 shrink-0">Math Symbols:</span>
                  {mathSymbols.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => setIndependentResponse((prev) => prev + sym)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
                    >
                      {sym}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={5}
                  value={independentResponse}
                  onChange={(e) => {
                    setIndependentResponse(e.target.value);
                    saveCurrentState({ independentResponse: e.target.value });
                  }}
                  placeholder="Derive the complete solution, specifying given values, Cartesian signs, formula substitution, and final boxed answer..."
                  className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs resize-y"
                />
              </div>
            )}

            {activeInputMode === 'speak' && (
              <div className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition cursor-pointer shadow-md ${
                      isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-indigo-600 text-white'
                    }`}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {isListening ? 'Listening & Transcribing...' : 'Speak Your Proof Out Loud'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Articulate each mathematical derivation step clearly.
                    </p>
                  </div>
                </div>
                <textarea
                  rows={4}
                  value={independentResponse}
                  onChange={(e) => setIndependentResponse(e.target.value)}
                  placeholder="Transcribed steps will appear here..."
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                />
              </div>
            )}

            {activeInputMode === 'paper' && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCanvasTool('pen')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${canvasTool === 'pen' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}
                    >
                      Pen
                    </button>
                    <button
                      type="button"
                      onClick={() => setCanvasTool('eraser')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${canvasTool === 'eraser' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}
                    >
                      Eraser
                    </button>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-rose-600 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <canvas
                  ref={canvasRef}
                  width={700}
                  height={220}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 cursor-crosshair bg-white border border-slate-200 dark:border-slate-700 rounded-xl touch-none"
                />
              </div>
            )}
          </div>

          {/* Reveal Benchmark & Rubric Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-4">
            {!independentRevealed ? (
              <div className="text-center py-4">
                <button
                  type="button"
                  onClick={() => {
                    setIndependentRevealed(true);
                    saveCurrentState({ independentRevealed: true });
                  }}
                  className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center justify-center gap-2 mx-auto shadow-md transition cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Reveal Model Derivation & Scoring Rubric</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                {/* Benchmark Answer */}
                <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      Benchmark Model Derivation
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-mono leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{stage3Data.benchmarkAnswer}</ReactMarkdown>
                  </div>
                </div>

                {/* Rubrics & Trap */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Key Scoring Criteria</span>
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {stage3Data.scoringCriteria.map((pt, pIdx) => (
                        <li key={pIdx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
                    <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Common Exam Pitfall / Trap</span>
                    </span>
                    <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                      {stage3Data.trapAnalysis || 'Common Pitfall: Confusing positive and negative signs or dropping SI units in calculations.'}
                    </p>
                  </div>
                </div>

                {/* Self Assessment */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Self-Evaluation: Did your derivation match the benchmark solution?
                  </h4>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleIndependentSelfAssess('needs_work')}
                      className={`px-6 py-2.5 rounded-xl border text-xs font-black transition cursor-pointer ${
                        independentAssessment === 'needs_work'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white dark:bg-slate-800 text-amber-700 border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      <RotateCcw className="w-4 h-4 inline mr-1" />
                      <span>Needs Work (Review Later)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleIndependentSelfAssess('understood')}
                      className={`px-8 py-2.5 rounded-xl border text-xs font-black transition cursor-pointer ${
                        independentAssessment === 'understood'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                      }`}
                    >
                      <Check className="w-4 h-4 inline mr-1" />
                      <span>Understood (Benchmark Met)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkedExampleFadingView;
