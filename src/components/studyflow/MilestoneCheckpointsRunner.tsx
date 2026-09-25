import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Target,
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
  FileText,
  Upload,
  Camera,
  Layers,
  Award,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  ShieldCheck,
  HelpCircle,
  Clock,
  Send,
  Loader2,
  Trash2,
  PenTool,
  Eraser,
  Volume2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Section, KnowledgeQuestion } from '../../types';

export interface MilestoneCheckpointItem {
  id: string;
  prompt: string;
  subtopicTag?: string;
  benchmarkAnswer: string;
  keyScoringPoints: string[];
  trapAnalysis: string;
  userResponse: string;
  inputMode: 'type' | 'speak' | 'paper';
  isRevealed: boolean;
  selfAssessment: 'understood' | 'needs_work' | null;
  paperImage?: string | null;
}

export interface MilestoneCheckpointsRunnerProps {
  section: Section;
  chapterName: string;
  subjectName?: string;
  isOpen: boolean;
  onClose: () => void;
  onProceedToRecallDeck?: () => void;
  onSaveCheckpoints?: (sectionId: string, checkpoints: MilestoneCheckpointItem[], scorePct: number) => void;
}

export const MilestoneCheckpointsRunner: React.FC<MilestoneCheckpointsRunnerProps> = ({
  section,
  chapterName,
  subjectName = 'Science',
  isOpen,
  onClose,
  onProceedToRecallDeck,
  onSaveCheckpoints,
}) => {
  // Generate initial checkpoints based on section data or tailored knowledge questions
  const initialCheckpoints: MilestoneCheckpointItem[] = useMemo(() => {
    // If saved checkpoints in localStorage, restore them
    try {
      const saved = localStorage.getItem(`milestone_checkpoints_${section.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    if (section.knowledgeQuestions && section.knowledgeQuestions.length > 0) {
      return section.knowledgeQuestions.map((kq, idx) => ({
        id: kq.id || `cp-${section.id}-${idx + 1}`,
        prompt: kq.question,
        subtopicTag: section.keyTopics?.[idx % (section.keyTopics?.length || 1)] || section.title,
        benchmarkAnswer: kq.sampleAnswer || `Governing relationship for ${section.title}. Under standard boundary constraints, the response variable correlates directly with the stimulus magnitude according to constitutive relations.`,
        keyScoringPoints: [
          'Explicit statement of governing theorems and boundary conditions',
          'Strict dimensional consistency and base SI unit conversions',
          'Clarification of fundamental physical causality and variable interdependence',
        ],
        trapAnalysis: 'Students often substitute values without stating general formulas symbolically or invert coordinate sign conventions.',
        userResponse: kq.userResponse || '',
        inputMode: 'type',
        isRevealed: false,
        selfAssessment: kq.isCorrect === true ? 'understood' : kq.isCorrect === false ? 'needs_work' : null,
      }));
    }

    const topics = section.keyTopics && section.keyTopics.length > 0 ? section.keyTopics : [section.title];
    const t0 = topics[0] || section.title;
    const t1 = topics[1] || t0;
    const t2 = topics[2] || t0;

    return [
      {
        id: `cp-1-${section.id}`,
        prompt: `Derive and explain the fundamental relationship governing ${t0}. What physical assumptions or boundary conditions are strictly required?`,
        subtopicTag: t0,
        benchmarkAnswer: `The governing principle of ${t0} dictates that energy and state continuity are preserved across defined boundary limits. The net response scales proportionally with the applied gradient according to the constitutive transfer equation:\n\n1. System boundary is established as closed and quasi-static.\n2. Potential gradients induce a restorative flux opposed to dissipation.\n3. At steady-state equilibrium, the rate of dissipation equals the input rate.`,
        keyScoringPoints: [
          'Explicit declaration of boundary limits and quasi-static assumptions',
          'Proper identification of driving potential versus resistive impediments',
          'Correct vector orientation and sign conventions (+ / -)',
        ],
        trapAnalysis: 'Neglecting the sign convention in vector quantities or assuming an open boundary when isothermal confinement is required.',
        userResponse: '',
        inputMode: 'type',
        isRevealed: false,
        selfAssessment: null,
      },
      {
        id: `cp-2-${section.id}`,
        prompt: `Identify the most critical calculation pitfall or conceptual trap students encounter when analyzing ${t1}. How should it be avoided?`,
        subtopicTag: t1,
        benchmarkAnswer: `The primary pitfall occurs when students substitute numerical values prior to normalizing units into base SI standards (e.g. keeping milliamperes instead of amperes, or centimeters instead of meters). Additionally, confusing relative reference frames with absolute ground coordinates yields inverted sign terms in velocity and force equations.`,
        keyScoringPoints: [
          'Pre-computation unit verification (converting non-SI to base SI standards)',
          'Clear reference frame selection prior to algebraic decomposition',
          'Dimensional checking: verifying that both sides of final equation match units',
        ],
        trapAnalysis: 'Premature numeric substitution that obscures arithmetic sign cancellations.',
        userResponse: '',
        inputMode: 'type',
        isRevealed: false,
        selfAssessment: null,
      },
      {
        id: `cp-3-${section.id}`,
        prompt: `Formulate the step-by-step problem-solving heuristic used to resolve complex multi-part questions on ${t2}.`,
        subtopicTag: t2,
        benchmarkAnswer: `A robust 5-step heuristic guarantees full method marks:\n1. Diagram & Coordinates: Sketch the system and label given parameters with explicit units.\n2. Symbolic Formulation: State governing equations without numeric values.\n3. Constraint Equations: Relate auxiliary parameters (geometry, conservation).\n4. Algebraic Isolation: Rearrange explicitly for the target unknown variable.\n5. Dimensional & Sanity Check: Confirm sign, magnitude, and unit consistency.`,
        keyScoringPoints: [
          'Writing symbolic formulas first to secure method marks before arithmetic',
          'Identification of auxiliary constraint relationships',
          'Sanity check of final numerical result against physical extremes',
        ],
        trapAnalysis: 'Jumping straight to numerical answers without documenting intermediate algebraic transformations.',
        userResponse: '',
        inputMode: 'type',
        isRevealed: false,
        selfAssessment: null,
      },
    ];
  }, [section]);

  const [checkpoints, setCheckpoints] = useState<MilestoneCheckpointItem[]>(initialCheckpoints);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeInputMode, setActiveInputMode] = useState<'type' | 'speak' | 'paper'>('type');
  const [isCompleted, setIsCompleted] = useState(false);

  // Speech Recognition state
  const [isListening, setIsListening] = useState(false);
  const [listeningTimer, setListeningTimer] = useState(0);
  const recognitionRef = useRef<any>(null);

  // Canvas Scratchpad state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasTool, setCanvasTool] = useState<'pen' | 'eraser'>('pen');
  const [canvasStrokeColor, setCanvasStrokeColor] = useState('#4f46e5');

  // Math symbol quick palette
  const mathSymbols = ['∑', '∫', '∆', '√', 'θ', 'λ', 'π', '≈', '±', '→', 'µ', '∂', '²', '³'];

  const currentCP = checkpoints[activeIndex];

  // Calculate score and statistics
  const stats = useMemo(() => {
    const total = checkpoints.length;
    const understoodCount = checkpoints.filter((c) => c.selfAssessment === 'understood').length;
    const needsWorkCount = checkpoints.filter((c) => c.selfAssessment === 'needs_work').length;
    const answeredCount = checkpoints.filter((c) => c.selfAssessment !== null).length;
    const scorePct = total > 0 ? Math.round((understoodCount / total) * 100) : 0;
    // Contributes 40% to overall milestone mastery
    const milestoneContribution = Math.round(scorePct * 0.4);
    return { total, understoodCount, needsWorkCount, answeredCount, scorePct, milestoneContribution };
  }, [checkpoints]);

  // Persist state changes
  const persistCheckpoints = (updated: MilestoneCheckpointItem[]) => {
    setCheckpoints(updated);
    try {
      localStorage.setItem(`milestone_checkpoints_${section.id}`, JSON.stringify(updated));
    } catch {}
    const understoodCount = updated.filter((c) => c.selfAssessment === 'understood').length;
    const scorePct = updated.length > 0 ? Math.round((understoodCount / updated.length) * 100) : 0;
    onSaveCheckpoints?.(section.id, updated, scorePct);
  };

  // Handle user response text changes
  const handleUpdateResponse = (text: string) => {
    const updated = checkpoints.map((c, i) => (i === activeIndex ? { ...c, userResponse: text } : c));
    persistCheckpoints(updated);
  };

  // Insert symbol
  const handleInsertSymbol = (sym: string) => {
    handleUpdateResponse((currentCP.userResponse || '') + sym);
  };

  // Toggle reveal benchmark
  const handleToggleReveal = () => {
    const updated = checkpoints.map((c, i) => (i === activeIndex ? { ...c, isRevealed: true } : c));
    persistCheckpoints(updated);
  };

  // Self assessment action: 'understood' | 'needs_work'
  const handleSelfAssess = (rating: 'understood' | 'needs_work') => {
    const updated = checkpoints.map((c, i) =>
      i === activeIndex ? { ...c, selfAssessment: rating, isRevealed: true } : c
    );
    persistCheckpoints(updated);

    if (rating === 'understood') {
      confetti({
        particleCount: 25,
        spread: 40,
        origin: { y: 0.8 },
      });
    }

    // Auto-advance if not last
    if (activeIndex < checkpoints.length - 1) {
      setTimeout(() => {
        setActiveIndex((prev) => prev + 1);
      }, 400);
    } else {
      setIsCompleted(true);
    }
  };

  // Voice speech recognition handler
  const handleToggleVoice = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setListeningTimer(0);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          handleUpdateResponse(
            currentCP.userResponse ? `${currentCP.userResponse} ${transcript}` : transcript
          );
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (err) {
        console.warn('Failed to start recognition:', err);
      }
    } else {
      // Fallback simulated dictation
      setIsListening(true);
      setTimeout(() => {
        const sampleDictation = `First, we establish standard boundary conditions. Under ideal equilibrium, the net conserved quantity is invariant, which avoids the common sign error.`;
        handleUpdateResponse(
          currentCP.userResponse ? `${currentCP.userResponse}\n${sampleDictation}` : sampleDictation
        );
        setIsListening(false);
      }, 2500);
    }
  };

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = canvasTool === 'eraser' ? 16 : 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = canvasTool === 'eraser' ? '#ffffff' : canvasStrokeColor;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleCaptureCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const updated = checkpoints.map((c, i) =>
      i === activeIndex
        ? {
            ...c,
            paperImage: dataUrl,
            userResponse: c.userResponse || '[Handwritten derivation & sketch captured on paper canvas]',
          }
        : c
    );
    persistCheckpoints(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* ================================================================= */}
        {/* TOP HEADER: MODULE 2 BANNER & PROGRESS */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  🎯 Module 2 • Conceptual Checkpoints
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  {chapterName} • {section.title}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-0.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                  Open-Ended Synthesis & Derivations
                </h2>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  {stats.understoodCount} of {stats.total} Understood ({stats.scorePct}%)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-extrabold text-slate-400 hidden sm:inline">
              Checkpoint {activeIndex + 1} of {checkpoints.length}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stepper bar across top */}
        <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            {checkpoints.map((cp, idx) => {
              const isCurrent = idx === activeIndex;
              const isUnderstood = cp.selfAssessment === 'understood';
              const isNeedsWork = cp.selfAssessment === 'needs_work';

              return (
                <button
                  key={cp.id}
                  type="button"
                  onClick={() => {
                    setActiveIndex(idx);
                    setIsCompleted(false);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                    isCurrent
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : isUnderstood
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      : isNeedsWork
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {isUnderstood ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : isNeedsWork ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                  <span>Checkpoint {idx + 1}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs font-bold text-slate-500 shrink-0">
            Contributes <span className="text-emerald-600 font-extrabold">{stats.milestoneContribution}%</span> of 40%
          </div>
        </div>

        {/* ================================================================= */}
        {/* MAIN BODY: PROMPT + MULTIMODAL INPUT + BENCHMARK REVEAL */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* A. If session completed screen */}
          {isCompleted ? (
            <div className="max-w-2xl mx-auto py-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
                <Award className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Checkpoints Evaluation Complete
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {stats.understoodCount === stats.total
                    ? 'Flawless Synthesis & Derivations!'
                    : 'Checkpoints Synthesis Recorded'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  You scored <span className="font-bold text-emerald-600">{stats.scorePct}%</span> on open-ended derivations. This secures <span className="font-bold text-indigo-600">{stats.milestoneContribution}%</span> towards your section retention index.
                </p>
              </div>

              {/* Score grid */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-left max-w-lg mx-auto">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-[11px] font-bold text-slate-400">Total</div>
                  <div className="text-lg font-black text-slate-800 dark:text-white">{stats.total} Checks</div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60">
                  <div className="text-[11px] font-bold text-emerald-600">Understood</div>
                  <div className="text-lg font-black text-emerald-600">{stats.understoodCount}</div>
                </div>
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-200/60 dark:border-amber-800/60">
                  <div className="text-[11px] font-bold text-amber-600">Needs Work</div>
                  <div className="text-lg font-black text-amber-600">{stats.needsWorkCount}</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCompleted(false);
                    setActiveIndex(0);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Review Checkpoints</span>
                </button>

                {onProceedToRecallDeck && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onProceedToRecallDeck();
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25"
                  >
                    <span>Proceed to Module 3: Active Recall Deck</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* B. Active Checkpoint Question & Multimodal Workspace */
            <div className="space-y-5">
              {/* Question Header Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Checkpoint #{activeIndex + 1}
                    </span>
                    {currentCP.subtopicTag && (
                      <span className="text-xs font-bold text-slate-500">
                        {currentCP.subtopicTag}
                      </span>
                    )}
                  </div>

                  {currentCP.selfAssessment && (
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                        currentCP.selfAssessment === 'understood'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {currentCP.selfAssessment === 'understood' ? '✓ Understood' : '⚠️ Needs Work'}
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
                  {currentCP.prompt}
                </h3>
              </div>

              {/* Multimodal Input Selector Tabs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setActiveInputMode('type')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        activeInputMode === 'type'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                      <span>Type Synthesis</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveInputMode('speak')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        activeInputMode === 'speak'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>Speak / Dictate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveInputMode('paper')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        activeInputMode === 'paper'
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Write on Paper</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Choose your preferred modality to articulate the proof
                  </span>
                </div>

                {/* Modality 1: Typing Textarea + Symbol Palette */}
                {activeInputMode === 'type' && (
                  <div className="space-y-2">
                    {/* Math symbol toolbar */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                      <span className="text-[11px] font-bold text-slate-400 mr-1 shrink-0">Symbols:</span>
                      {mathSymbols.map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => handleInsertSymbol(sym)}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer"
                        >
                          {sym}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={5}
                      value={currentCP.userResponse || ''}
                      onChange={(e) => handleUpdateResponse(e.target.value)}
                      placeholder="Articulate the core derivation, statement of law, boundary conditions, or reasoning here in your own words..."
                      className="w-full p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs font-sans resize-y"
                    />

                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span>{(currentCP.userResponse || '').trim().split(/\s+/).filter(Boolean).length} words</span>
                      <span>Articulate from memory for highest retention transfer</span>
                    </div>
                  </div>
                )}

                {/* Modality 2: Voice Dictation */}
                {activeInputMode === 'speak' && (
                  <div className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/80 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleToggleVoice}
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition cursor-pointer shadow-md ${
                            isListening
                              ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>

                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            {isListening ? 'Listening & Transcribing...' : 'Click to Speak Your Explanation'}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Speak out loud as if explaining to a peer (Feynman technique).
                          </p>
                        </div>
                      </div>

                      {isListening && (
                        <div className="flex items-center gap-1 h-6">
                          <div className="w-1 bg-indigo-500 animate-bounce h-3 rounded-full" />
                          <div className="w-1 bg-indigo-500 animate-bounce h-6 rounded-full delay-100" />
                          <div className="w-1 bg-indigo-500 animate-bounce h-4 rounded-full delay-200" />
                          <div className="w-1 bg-indigo-500 animate-bounce h-5 rounded-full delay-300" />
                        </div>
                      )}
                    </div>

                    <textarea
                      rows={4}
                      value={currentCP.userResponse || ''}
                      onChange={(e) => handleUpdateResponse(e.target.value)}
                      placeholder="Transcribed voice explanation will appear here. You can also edit it manually..."
                      className="w-full p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {/* Modality 3: Write on Paper / Drawing Scratchpad Canvas */}
                {activeInputMode === 'paper' && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 dark:text-white">
                          Paper Scratchpad:
                        </span>
                        <button
                          type="button"
                          onClick={() => setCanvasTool('pen')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                            canvasTool === 'pen'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          Pen
                        </button>
                        <button
                          type="button"
                          onClick={() => setCanvasTool('eraser')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                            canvasTool === 'eraser'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          Eraser
                        </button>
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-rose-600 transition"
                        >
                          Clear
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleCaptureCanvas}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Paper Work</span>
                      </button>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white touch-none">
                      <canvas
                        ref={canvasRef}
                        width={700}
                        height={260}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-48 sm:h-64 cursor-crosshair bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Benchmark Reveal & Evaluation Section */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
                {!currentCP.isRevealed ? (
                  <div className="text-center py-4">
                    <button
                      type="button"
                      onClick={handleToggleReveal}
                      className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 mx-auto shadow-md hover:shadow-indigo-600/20"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Reveal Benchmark & Rubric Scoring Points</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Compare your explanation against ideal textbook derivations and grading criteria.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in-50 duration-200">
                    {/* Benchmark Model Answer */}
                    <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                          Benchmark Model Answer & Derivation
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line font-serif">
                        {currentCP.benchmarkAnswer}
                      </div>
                    </div>

                    {/* Rubric Points & Trap Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Rubric Checklist */}
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2">
                        <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Must-Include Scoring Points</span>
                        </span>
                        <ul className="space-y-1.5">
                          {currentCP.keyScoringPoints.map((pt, pIdx) => (
                            <li key={pIdx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Trap Analysis */}
                      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 space-y-2">
                        <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Common Pitfall / Distractor Analysis</span>
                        </span>
                        <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                          {currentCP.trapAnalysis}
                        </p>
                      </div>
                    </div>

                    {/* Self-Assessment Buttons */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Self-Evaluation: Did your articulation capture the benchmark reasoning?
                      </h4>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleSelfAssess('needs_work')}
                          className={`w-full sm:w-auto px-6 py-2.5 rounded-xl border text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                            currentCP.selfAssessment === 'needs_work'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                              : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50'
                          }`}
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Needs Work (Review Later)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelfAssess('understood')}
                          className={`w-full sm:w-auto px-8 py-2.5 rounded-xl border text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 shadow-md ${
                            currentCP.selfAssessment === 'understood'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                          }`}
                        >
                          <Check className="w-4 h-4" />
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

        {/* ================================================================= */}
        {/* FOOTER: NAVIGATION & SEQUENTIAL NEXT */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (activeIndex > 0) setActiveIndex((prev) => prev - 1);
              }}
              disabled={activeIndex === 0}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (activeIndex < checkpoints.length - 1) setActiveIndex((prev) => prev + 1);
              }}
              disabled={activeIndex === checkpoints.length - 1}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              Close
            </button>

            {onProceedToRecallDeck && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onProceedToRecallDeck();
                }}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-md hover:shadow-purple-600/20"
              >
                <span>Proceed to Module 3: Recall Deck</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilestoneCheckpointsRunner;
