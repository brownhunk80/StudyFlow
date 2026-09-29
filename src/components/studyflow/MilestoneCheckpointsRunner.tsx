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
  Calculator,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import ReactMarkdown from 'react-markdown';
import { Section, KnowledgeQuestion, WorkedExampleFadingPayload, WorkedExampleStep } from '../../types';
import { extractSectionCheckpoints, SectionCheckpoint, isStaleBoilerplateText } from '../../utils/sectionCheckpointExtractor';
import { SectionBlurtingEvaluator } from './SectionBlurtingEvaluator';
import { isHindiSubject } from '../../utils/hindiDetection';
import { isScienceOrMathSubject } from '../../api/checkpoints/generate';

import { WorkedExampleFadingView } from './WorkedExampleFadingView';

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
  sourceCitation?: string;
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
  const isHindi = isHindiSubject(subjectName, chapterName, section.title);
  const isScienceOrMath = isScienceOrMathSubject(subjectName, chapterName, section.title);
  const resolvedSubject = isHindi ? 'Hindi' : (subjectName && subjectName !== 'Science' ? subjectName : 'General');

  // Worked Example Fading State for Science & Math
  const [workedExampleFading, setWorkedExampleFading] = useState<WorkedExampleFadingPayload | null>(() => {
    try {
      const savedFading = localStorage.getItem(`milestone_worked_example_fading_${section.id}`);
      if (savedFading) {
        return JSON.parse(savedFading);
      }
    } catch {}
    return null;
  });

  const [activeEngineMode, setActiveEngineMode] = useState<'worked_example_fading' | 'standard_checkpoints'>(
    'standard_checkpoints'
  );

  const resolvedFadingData: WorkedExampleFadingPayload = useMemo(() => {
    if (workedExampleFading) return workedExampleFading;
    return {
      mode: 'worked_example_fading',
      topicTag: section.title,
      subjectType: isScienceOrMath ? 'Science' : 'Maths',
      workedExample: {
        problemStatement: `Derive the fundamental physical formula and solve for standard parameters in "${section.title}" (${chapterName}).`,
        givenData: [
          { symbol: 'u', value: '-30 cm', meaning: 'Object Distance (in front of mirror/lens)' },
          { symbol: 'f', value: '-20 cm', meaning: 'Focal length (Cartesian convention)' },
        ],
        governingFormulaOrLaw: 'Mirror Formula: 1/f = 1/v + 1/u and Magnification: m = -v/u',
        steps: [
          {
            stepNumber: 1,
            label: 'Cartesian Convention Setup',
            expressionOrAction: 'u = -30 cm, f = -20 cm',
            rationale: 'All distances opposite incident light are negative in New Cartesian Sign Convention.',
          },
          {
            stepNumber: 2,
            label: 'Formula Substitution & Algebraic Transposition',
            expressionOrAction: '1/v = 1/f - 1/u = 1/(-20) - 1/(-30) = -1/20 + 1/30 = -1/60 ⇒ v = -60 cm',
            rationale: 'Isolate 1/v, calculate common denominator (60), and take reciprocal.',
          },
          {
            stepNumber: 3,
            label: 'Magnification & Image Nature',
            expressionOrAction: 'm = -v/u = -(-60)/(-30) = -2 (Real & Inverted, 2x Magnified)',
            rationale: 'Negative magnification confirms real and inverted image.',
          },
        ],
        finalAnswer: 'Image distance v = -60 cm, Nature: Real & Inverted, Magnification m = -2',
        teacherKeyTip: 'Always verify Cartesian sign conventions. Distances in front of mirror are negative. Do not drop minus signs when subtracting negatives.',
      },
      fadedScaffold: {
        problemStatement: `An isomorphic problem: An object is placed at distance u = -15 cm with focal length f = -10 cm. Complete the intermediate calculation to determine image distance v.`,
        givenData: [
          { symbol: 'u', value: '-15 cm', meaning: 'Object distance' },
          { symbol: 'f', value: '-10 cm', meaning: 'Focal length' },
        ],
        governingFormulaOrLaw: '1/v = 1/f - 1/u',
        steps: [
          {
            stepNumber: 1,
            label: 'Cartesian Coordinate Setup',
            expressionOrAction: 'u = -15 cm, f = -10 cm',
            rationale: 'Assign known Cartesian coordinate values.',
          },
          {
            stepNumber: 2,
            label: 'Intermediate Derivation Step',
            expressionOrAction: '1/v = 1/(-10) - 1/(-15) = -1/10 + 1/15 = -1/30 ⇒ v = [BLANK]',
            rationale: 'Take reciprocal of common denominator fraction.',
            isFaded: true,
            fadedPlaceholder: 'e.g., -30 cm or v = -30',
            fadedExpectedAnswer: '-30',
            fadedAlternativeAnswers: ['-30 cm', 'v = -30', '-30', 'v = -30 cm', '-30cm'],
          },
          {
            stepNumber: 3,
            label: 'Magnification State',
            expressionOrAction: 'm = -v/u = -(-30)/(-15) = -2 (Real & Inverted)',
            rationale: 'Interpret image characteristics from calculated values.',
          },
        ],
        finalAnswer: 'v = -30 cm (Real, Inverted, Magnified)',
        fadedStepHint: 'Hint: 1/(-10) - 1/(-15) = -1/10 + 1/15 = (-3 + 2)/30 = -1/30. Take reciprocal to get v.',
      },
      independentProblem: {
        id: `ind-${section.id}`,
        prompt: `A concave mirror produces a real image of size 3 times that of an object placed at 20 cm in front of it. Calculate the focal length of the mirror with full Cartesian sign conventions.`,
        benchmarkAnswer: `**1. Given Data & Sign Conventions:**\nu = -20 cm. Since image is real, m = -3 (m = -v/u ⇒ -3 = -v/(-20) ⇒ v = -60 cm).\n\n**2. Mirror Formula Derivation:**\n1/f = 1/v + 1/u = 1/(-60) + 1/(-20) = (-1 - 3)/60 = -4/60 = -1/15.\nTaking reciprocal: f = -15 cm.\n\n**3. Conclusion:**\nThe focal length of the concave mirror is 15 cm (f = -15 cm, negative sign confirms concave nature).`,
        keyPointsToVerify: [
          'Sets magnification m = -3 for a real inverted image',
          'Computes image distance v = -60 cm correctly',
          'Calculates focal length f = -15 cm with negative sign and SI unit',
        ],
        trapAnalysis: 'Common Pitfall: Taking magnification as +3 instead of -3. Remember: Real images always have negative magnification in mirror optics.',
      },
    };
  }, [workedExampleFading, isScienceOrMath, section.id, section.title, chapterName]);

  // Generate initial checkpoints based strictly on that section's content
  const initialCheckpoints: MilestoneCheckpointItem[] = useMemo(() => {
    // 1. If saved checkpoints in localStorage, verify they are not the old generic boilerplate template
    try {
      const saved = localStorage.getItem(`milestone_checkpoints_${section.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check for stale generic pseudo-physics boilerplate text
          const isStaleBoilerplate = parsed.some((cp: any) => {
            const combined = `${cp.prompt || ''} ${cp.benchmarkAnswer || ''} ${JSON.stringify(cp.keyScoringPoints || [])}`;
            return isStaleBoilerplateText(combined);
          });

          if (!isStaleBoilerplate) {
            return parsed;
          }
          console.log(`[ConceptCheck] Discarded stale generic boilerplate for section "${section.title}", re-extracting section-grounded checkpoints.`);
        }
      }
    } catch (err) {
      console.warn('Error reading cached checkpoints:', err);
    }

    // 2. Extract section-grounded checkpoints strictly for this section
    const extracted = extractSectionCheckpoints(section, chapterName, resolvedSubject);
    return extracted.map((cp) => ({
      id: cp.id,
      prompt: cp.prompt,
      subtopicTag: cp.subtopicTag,
      benchmarkAnswer: cp.benchmarkAnswer,
      keyScoringPoints: cp.keyScoringPoints,
      trapAnalysis: cp.trapAnalysis,
      userResponse: cp.userResponse,
      inputMode: cp.inputMode,
      isRevealed: cp.isRevealed,
      selfAssessment: cp.selfAssessment,
      sourceCitation: cp.sourceCitation,
    }));
  }, [section, chapterName, resolvedSubject]);

  const [checkpoints, setCheckpoints] = useState<MilestoneCheckpointItem[]>(initialCheckpoints);
  const [activeIndex, setActiveIndex] = useState(0);

  // Synchronize when section changes
  useEffect(() => {
    setCheckpoints(initialCheckpoints);
    setActiveIndex(0);
    try {
      const savedFading = localStorage.getItem(`milestone_worked_example_fading_${section.id}`);
      if (savedFading) {
        setWorkedExampleFading(JSON.parse(savedFading));
      }
    } catch {}
    setActiveEngineMode('standard_checkpoints');
  }, [initialCheckpoints, isScienceOrMath, section.id]);

  // Background enhancement: Fetch authentic board-examiner checkpoints & worked example fading from /api/checkpoints/generate if not yet user-answered
  useEffect(() => {
    let isCancelled = false;
    const enhanceCheckpoints = async () => {
      try {
        const saved = localStorage.getItem(`milestone_checkpoints_${section.id}`);
        let parsed: any[] | null = null;
        if (saved) {
          try {
            parsed = JSON.parse(saved);
          } catch {}
        }

        const summaryText = typeof section.summary === 'string'
          ? section.summary
          : (section.summary as any)?.detailed || '';
        const excerpt = [
          section.sectionTextExcerpt,
          summaryText,
          Array.isArray(section.summaries) ? section.summaries.map((s) => s.contentMarkdown).join('\n\n') : '',
        ]
          .filter(Boolean)
          .join('\n\n');

        if (excerpt && excerpt.length > 50) {
          const res = await fetch('/api/checkpoints/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chapterTitle: chapterName,
              milestoneTitle: section.title,
              subjectName: resolvedSubject,
              topicTags: section.keyTopics || [section.title],
              sectionTextExcerpt: excerpt.slice(0, 18000),
            }),
          });

          if (res.ok && !isCancelled) {
            const data = await res.json();
            if (data.workedExampleFading) {
              setWorkedExampleFading(data.workedExampleFading);
              try {
                localStorage.setItem(`milestone_worked_example_fading_${section.id}`, JSON.stringify(data.workedExampleFading));
              } catch {}
            }

            // If student has already engaged with standard checkpoints, do not overwrite their responses
            const hasUserProgress = parsed && parsed.some((c: any) => c.userResponse || c.selfAssessment !== null);
            if (!hasUserProgress && Array.isArray(data.checkpoints) && data.checkpoints.length > 0) {
              const mapped: MilestoneCheckpointItem[] = data.checkpoints.map((cp: any, idx: number) => ({
                id: cp.id || `cp-${section.id}-${idx + 1}`,
                prompt: cp.prompt,
                subtopicTag: cp.topicTag || section.title,
                benchmarkAnswer: cp.benchmarkAnswer,
                keyScoringPoints: cp.keyPointsToVerify || [],
                trapAnalysis: cp.trapAnalysis || `Common Pitfall: Giving everyday impressions instead of textbook definitions and rules.`,
                userResponse: '',
                inputMode: 'type' as const,
                isRevealed: false,
                selfAssessment: null,
                sourceCitation: cp.sourceCitation,
              }));

              setCheckpoints(mapped);
              try {
                localStorage.setItem(`milestone_checkpoints_${section.id}`, JSON.stringify(mapped));
                window.dispatchEvent(new CustomEvent('studyflow_cards_updated'));
                window.dispatchEvent(new Event('storage'));
              } catch {}
            }
          }
        }
      } catch (err) {
        console.warn('[MilestoneCheckpointsRunner] AI examiner enhancement error:', err);
      }
    };

    if (isOpen) {
      enhanceCheckpoints();
    }

    return () => {
      isCancelled = true;
    };
  }, [section.id, isOpen, chapterName, subjectName, resolvedSubject]);


  const [stepIndex, setStepIndex] = useState<number>(0); // 0 = Step 0: Warm-up Blurt, 1..N = Checkpoints 1..N
  const [hasBlurtSaved, setHasBlurtSaved] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`milestone_blurt_${section.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        setHasBlurtSaved(Boolean(parsed.evaluation));
      } else {
        setHasBlurtSaved(false);
      }
    } catch {
      setHasBlurtSaved(false);
    }
  }, [section.id, stepIndex, isOpen]);

  const [activeInputMode, setActiveInputMode] = useState<'type' | 'speak' | 'paper'>('type');
  const [isCompleted, setIsCompleted] = useState(false);

  const [isRefreshingChecks, setIsRefreshingChecks] = useState(false);

  // Allow resetting checkpoints directly to clean section-extracted version
  const handleResetToCleanSectionCheckpoints = async () => {
    setIsRefreshingChecks(true);
    try {
      localStorage.removeItem(`milestone_checkpoints_${section.id}`);
    } catch {}

    const fresh = extractSectionCheckpoints(section, chapterName, subjectName);
    let mapped = fresh.map((cp) => ({
      id: cp.id,
      prompt: cp.prompt,
      subtopicTag: cp.subtopicTag,
      benchmarkAnswer: cp.benchmarkAnswer,
      keyScoringPoints: cp.keyScoringPoints,
      trapAnalysis: cp.trapAnalysis,
      userResponse: '',
      inputMode: 'type' as const,
      isRevealed: false,
      selfAssessment: null,
      sourceCitation: cp.sourceCitation,
    }));

    setCheckpoints(mapped);
    setActiveIndex(0);
    try {
      const summaryText = typeof section.summary === 'string'
        ? section.summary
        : (section.summary as any)?.detailed || '';
      const excerpt = [
        section.sectionTextExcerpt,
        summaryText,
        Array.isArray(section.summaries) ? section.summaries.map((s) => s.contentMarkdown).join('\n\n') : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      if (excerpt && excerpt.length > 60) {
        const res = await fetch('/api/checkpoints/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chapterTitle: chapterName,
            milestoneTitle: section.title,
            subjectName: resolvedSubject,
            topicTags: section.keyTopics || [section.title],
            sectionTextExcerpt: excerpt.slice(0, 18000),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.checkpoints) && data.checkpoints.length > 0) {
            mapped = data.checkpoints.map((cp: any, idx: number) => ({
              id: cp.id || `cp-${section.id}-${idx + 1}`,
              prompt: cp.prompt,
              subtopicTag: cp.topicTag || section.title,
              benchmarkAnswer: cp.benchmarkAnswer,
              keyScoringPoints: cp.keyPointsToVerify || [],
              trapAnalysis: cp.trapAnalysis || `Common Pitfall: Giving everyday impressions instead of textbook definitions and rules.`,
              userResponse: '',
              inputMode: 'type' as const,
              isRevealed: false,
              selfAssessment: null,
              sourceCitation: cp.sourceCitation,
            }));
            setCheckpoints(mapped);
          }
        }
      }
    } catch (err) {
      console.warn('[MilestoneCheckpointsRunner] AI examiner query error:', err);
    } finally {
      setIsRefreshingChecks(false);
    }

    try {
      localStorage.setItem(`milestone_checkpoints_${section.id}`, JSON.stringify(mapped));
      window.dispatchEvent(new CustomEvent('studyflow_cards_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch {}
    onSaveCheckpoints?.(section.id, mapped, 0);
  };

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
      window.dispatchEvent(new CustomEvent('studyflow_cards_updated'));
      window.dispatchEvent(new Event('storage'));
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
        const sampleDictation = `Regarding ${currentCP.subtopicTag || section.title}, the primary principle established in this section centers on the defined criteria and mechanisms explained in the syllabus.`;
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
        {/* TOP HEADER: CONCEPT CHECK & PROGRESS */}
        {/* ================================================================= */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                🎯 Concept Check
              </span>

              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {section.title}
              </h2>

              <span className="text-[11px] font-medium text-slate-400 hidden md:inline truncate">
                ({chapterName})
              </span>

              <span className="px-2 py-0.5 rounded-md text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 shrink-0">
                {stats.understoodCount} of {stats.total} Understood ({stats.scorePct}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isScienceOrMath && (
              <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-xl mr-1">
                <button
                  type="button"
                  onClick={() => setActiveEngineMode('worked_example_fading')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeEngineMode === 'worked_example_fading'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Worked Example Fading</span>
                  <span className="sm:hidden">Fading</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEngineMode('standard_checkpoints')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeEngineMode === 'standard_checkpoints'
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Rubric Checkpoints</span>
                  <span className="sm:hidden">Rubric</span>
                </button>
              </div>
            )}

            <span className="text-xs font-extrabold text-slate-400 hidden sm:inline">
              {stepIndex === 0
                ? 'Step 0: Warm-up Blurt'
                : activeEngineMode === 'worked_example_fading'
                ? 'Worked Example Fading'
                : `Checkpoint ${stepIndex} of ${checkpoints.length}`}
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

        {/* ================================================================= */}
        {/* STEPPER BAR: STEP 0 (RECALL BLURT) FOLLOWED BY CHECKPOINTS 1..N */}
        {/* ================================================================= */}
        {activeEngineMode !== 'worked_example_fading' && (
          <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between gap-3 shrink-0 overflow-x-auto">
            <div className="flex items-center gap-2 py-0.5 shrink-0">
              {/* Step 0: Warm-up Active Recall Blurt */}
              <button
                type="button"
                onClick={() => {
                  setStepIndex(0);
                  setIsCompleted(false);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                  stepIndex === 0
                    ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                    : hasBlurtSaved
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${stepIndex === 0 ? 'text-white' : 'text-amber-500'}`} />
                <span>Step 0: Recall Blurt</span>
                {hasBlurtSaved && (
                  <CheckCircle2 className={`w-3.5 h-3.5 ${stepIndex === 0 ? 'text-white' : 'text-emerald-500'}`} />
                )}
              </button>

              {/* Checkpoints 1..N */}
              {checkpoints.map((cp, idx) => {
                const isCurrent = stepIndex === idx + 1;
                const isUnderstood = cp.selfAssessment === 'understood';
                const isNeedsWork = cp.selfAssessment === 'needs_work';

                return (
                  <button
                    key={cp.id}
                    type="button"
                    onClick={() => {
                      setStepIndex(idx + 1);
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

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-xs font-bold text-slate-500">
                Contributes <span className="text-emerald-600 font-extrabold">{stats.milestoneContribution}%</span> of 40%
              </div>
              <button
                type="button"
                disabled={isRefreshingChecks}
                onClick={handleResetToCleanSectionCheckpoints}
                title="Refresh and reload clean questions strictly for this section"
                className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer transition border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 disabled:opacity-50"
              >
                {isRefreshingChecks ? (
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                ) : (
                  <RotateCcw className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">{isRefreshingChecks ? 'Regenerating...' : 'Reload Section Checks'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* RENDER ACTIVE STEP */}
        {/* ================================================================= */}
        {activeEngineMode === 'worked_example_fading' ? (
          <WorkedExampleFadingView
            section={section}
            chapterName={chapterName}
            subjectName={subjectName}
            fadingData={resolvedFadingData}
            onProceedToRecallDeck={onProceedToRecallDeck}
            onClose={onClose}
            onSaveProgress={(fading) => {
              try {
                localStorage.setItem(`milestone_worked_example_fading_${section.id}`, JSON.stringify(fading));
                window.dispatchEvent(new CustomEvent('studyflow_cards_updated'));
              } catch {}
            }}
          />
        ) : stepIndex === 0 ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <SectionBlurtingEvaluator
              section={section}
              chapterName={chapterName}
              subjectName={subjectName}
              onClose={onClose}
              onProceedToCheckpoint={() => {
                setStepIndex(1);
                setActiveIndex(0);
              }}
              onProceedToRecallDeck={onProceedToRecallDeck}
            />
          </div>
        ) : (
          <>
            {/* MAIN BODY: PROMPT + MULTIMODAL INPUT + BENCHMARK REVEAL */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* A. If session completed screen */}
          {isCompleted ? (
            <div className="max-w-2xl mx-auto py-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
                <Award className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Concept Check Complete
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {stats.understoodCount === stats.total
                    ? 'Flawless Concept Comprehension!'
                    : 'Concept Check Recorded'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  You scored <span className="font-bold text-emerald-600">{stats.scorePct}%</span> on concept checks. This secures <span className="font-bold text-indigo-600">{stats.milestoneContribution}%</span> towards your section retention index.
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
                    <span>Proceed to Active Recall Deck</span>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Checkpoint #{activeIndex + 1}
                    </span>
                    {currentCP.subtopicTag && (
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                        {currentCP.subtopicTag}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      • Section: {section.title}
                    </span>
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

                <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed prose prose-base dark:prose-invert max-w-none">
                  <ReactMarkdown>{currentCP.prompt}</ReactMarkdown>
                </div>
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
                      placeholder="Articulate your conceptual explanation, core reasoning, key definitions, or arguments here in your own words..."
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
                      Compare your explanation against the benchmark model answer and grading criteria.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in-50 duration-200">
                    {/* Benchmark Model Answer */}
                    <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                            Benchmark Model Answer
                          </span>
                        </div>
                        {currentCP.sourceCitation && (
                          <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-medium italic hidden sm:inline truncate max-w-sm">
                            Grounded in section text
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{currentCP.benchmarkAnswer}</ReactMarkdown>
                      </div>
                    </div>

                    {/* Rubric Points & Trap Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Rubric Checklist */}
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                        <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Key Verification Criteria (Section Check)</span>
                        </span>
                        <ul className="space-y-2">
                          {currentCP.keyScoringPoints.map((pt, pIdx) => (
                            <li key={pIdx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                              <div className="flex-1 leading-snug prose prose-xs dark:prose-invert">
                                <ReactMarkdown>{pt}</ReactMarkdown>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Trap Analysis */}
                      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 space-y-2.5">
                        <span className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Section Misconception / Trap</span>
                        </span>
                        <div className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed prose prose-xs dark:prose-invert">
                          <ReactMarkdown>{currentCP.trapAnalysis}</ReactMarkdown>
                        </div>
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
                if (stepIndex === 1) {
                  setStepIndex(0);
                } else if (stepIndex > 1) {
                  setStepIndex(stepIndex - 1);
                  setActiveIndex((prev) => Math.max(0, prev - 1));
                }
              }}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{stepIndex === 1 ? 'Step 0: Recall Blurt' : 'Previous'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (activeIndex < checkpoints.length - 1) {
                  setStepIndex(stepIndex + 1);
                  setActiveIndex((prev) => prev + 1);
                } else {
                  setIsCompleted(true);
                }
              }}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <span>{activeIndex === checkpoints.length - 1 ? 'Finish Concept Check' : 'Next'}</span>
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
                <span>Proceed to Active Recall Deck</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </>
    )}
  </div>
</div>
  );
};

export default MilestoneCheckpointsRunner;
