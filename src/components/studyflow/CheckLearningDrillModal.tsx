import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Clock,
  Sparkles,
  Brain,
  SkipForward,
  Check,
  RotateCcw,
  Zap,
  Sliders,
  AlertTriangle,
  HelpCircle,
  Keyboard,
  Mic,
  MicOff,
  Camera,
  Upload,
  Image as ImageIcon,
  FileText,
  RefreshCw,
  Loader2,
  Trash2,
  Square,
  BookOpen,
  ListFilter,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Section, QuizMode, QuizQuestion } from '../../types';
import {
  CheckLearningConfigModal,
  DrillConfig,
  DrillFormat,
  CognitiveDepth,
} from './CheckLearningConfigModal';
import { ConceptDeconstructionDrawer } from './ConceptDeconstructionDrawer';
import { PerformanceDiagnosticView } from './PerformanceDiagnosticView';
import { fetchEvaluateAnswer, MultimodalEvaluationResult } from '../../utils/aiClient';

export interface EnrichedQuizQuestion extends QuizQuestion {
  type: 'multiple_choice' | 'free_response';
  correctAnalysis: string; // "Why the Correct Answer Works"
  distractorAnalyses: Record<number, string>; // "Trap Analysis: Why Other Choices Are Incorrect"
  modelAnswer?: string; // For open response questions
}

interface CheckLearningDrillModalProps {
  section: Section;
  chapterName: string;
  subjectName?: string;
  isOpen: boolean;
  initialMode?: 'study' | 'test'; // study = Practice Mode, test = Exam Mode
  onClose: () => void;
  onDrillComplete?: (sectionId: string, score: number, timeTakenSec: number) => void;
  onOpenSummaryForMissed?: (section: Section, missedTopics: string[]) => void;
}

export const CheckLearningDrillModal: React.FC<CheckLearningDrillModalProps> = ({
  section,
  chapterName,
  subjectName = 'Science',
  isOpen,
  initialMode = 'study',
  onClose,
  onDrillComplete,
  onOpenSummaryForMissed,
}) => {
  // Step state: 'config' | 'runner' | 'diagnostic'
  const [step, setStep] = useState<'config' | 'runner' | 'diagnostic'>('config');

  // Drill Configuration
  const [drillConfig, setDrillConfig] = useState<DrillConfig>({
    format: 'multiple_choice',
    cognitiveDepth: 'applied_reasoning',
    questionCount: 4,
  });

  // Active Challenge Runner states
  const [drillMode, setDrillMode] = useState<'practice' | 'exam'>(
    initialMode === 'test' ? 'exam' : 'practice'
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [freeResponses, setFreeResponses] = useState<Record<number, string>>({});
  const [freeResponseEvaluated, setFreeResponseEvaluated] = useState<Record<number, boolean>>({});
  const [skippedQuestions, setSkippedQuestions] = useState<Record<number, boolean>>({});
  const [elapsedSec, setElapsedSec] = useState(0);

  // Multimodal Derivation Workspace States
  const [inputModes, setInputModes] = useState<Record<number, 'type' | 'speak' | 'paper'>>({});
  const [solveViaDerivation, setSolveViaDerivation] = useState<Record<number, boolean>>({});
  const [uploadedImages, setUploadedImages] = useState<
    Record<number, { dataUrl: string; name: string; size: string; type: string }>
  >({});
  const [evaluations, setEvaluations] = useState<Record<number, MultimodalEvaluationResult>>({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Speech Recognition (Voice Input) States
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Concept Deconstruction Drawer states
  const [isDeconstructionOpen, setIsDeconstructionOpen] = useState(false);
  const [inspectQuestionIndex, setInspectQuestionIndex] = useState<number | null>(null);

  // Results state
  const [finalScore, setFinalScore] = useState(0);
  const [finalTimeSec, setFinalTimeSec] = useState(0);

  // Dynamic Question Generator adapting to Section, Format, and Cognitive Depth
  const questions: EnrichedQuizQuestion[] = useMemo(() => {
    const title = section.title;
    const topics = section.keyTopics && section.keyTopics.length > 0 ? section.keyTopics : [title];
    const generated: EnrichedQuizQuestion[] = [];

    const isDirectRecall = drillConfig.cognitiveDepth === 'direct_recall';
    const isOpenResponse = drillConfig.format === 'open_response';

    if (isDirectRecall) {
      // 1. Direct Recall Q1: Governing law & definitions
      generated.push({
        id: `chk-${section.id}-rec-1`,
        quizId: `chk-${section.id}`,
        type: isOpenResponse ? 'free_response' : 'multiple_choice',
        questionText: `What is the fundamental law and mathematical relationship for "${topics[0] || title}"?`,
        choices: [
          `The focal length (f) of a spherical mirror equals half its radius of curvature (f = R / 2).`,
          `The focal length equals twice the radius of curvature (f = 2R).`,
          `The radius of curvature is completely independent of the focal length for all mirror apertures.`,
          `The focal length is always positive regardless of whether the mirror is concave or convex.`,
        ],
        correctIndex: 0,
        explanation: `For spherical mirrors of small aperture, the principal focus lies halfway between the pole and center of curvature (f = R / 2).`,
        topicTag: topics[0] || title,
        difficulty: 'Recall',
        correctAnalysis: `For paraxial rays close to the principal axis, the geometry of reflection forces rays to converge or appear to diverge through the focal point situated at R / 2. This satisfies the law of reflection (i = r).`,
        distractorAnalyses: {
          1: `Inverts the mathematical relation: f = 2R mistakenly doubles the radius instead of halving it.`,
          2: `Incorrect: R and f are strictly tied by spherical geometry (R = 2f).`,
          3: `Violates the Cartesian sign convention: Concave mirrors have negative focal length, convex have positive.`,
        },
        modelAnswer: `For spherical mirrors of small aperture, the focal length (f) is exactly half the radius of curvature (f = R / 2).`,
      });

      // 2. Direct Recall Q2: Cartesian Sign Convention
      generated.push({
        id: `chk-${section.id}-rec-2`,
        quizId: `chk-${section.id}`,
        type: isOpenResponse ? 'free_response' : 'multiple_choice',
        questionText: `Under the New Cartesian Sign Convention, why is object distance (u) always assigned a negative sign?`,
        choices: [
          `Because the object is stationed to the left of the mirror, opposite to incident ray direction.`,
          `Because physical objects inherently have negative mass and height in geometrical optics.`,
          `Because specular reflection always inverts the sign of coordinate coordinates along the principal axis.`,
          `Because focal length is negative for all optical systems without exception.`,
        ],
        correctIndex: 0,
        explanation: `Distances measured opposite to the direction of incident light (conventionally left of the pole) are taken as negative.`,
        topicTag: topics[1] || 'Cartesian Sign Convention',
        difficulty: 'Recall',
        correctAnalysis: `The origin is set at the pole (P). Incident light travels left-to-right. Since the object is placed to the left, the vector from pole to object points opposite to incoming light, defining a negative coordinate (-u).`,
        distractorAnalyses: {
          1: `False premise: Object mass and material dimensions do not affect Cartesian coordinates.`,
          2: `Specular reflection changes light trajectories, not coordinate axes definitions.`,
          3: `Erroneous rule: Convex mirrors and converging lenses have positive focal lengths.`,
        },
        modelAnswer: `Distances measured against the direction of incident light (to the left of the pole) are conventionally negative.`,
      });

      // 3. Direct Recall Q3: Image Characteristics
      generated.push({
        id: `chk-${section.id}-rec-3`,
        quizId: `chk-${section.id}`,
        type: isOpenResponse ? 'free_response' : 'multiple_choice',
        questionText: `A concave mirror produces an erect, magnified, and virtual image only when the object is placed at which position?`,
        choices: [
          `Between the pole (P) and the principal focus (F).`,
          `At the center of curvature (C).`,
          `Beyond the center of curvature (C).`,
          `At infinity.`,
        ],
        correctIndex: 0,
        explanation: `When an object is placed between P and F, reflected rays diverge; their backward extensions form an erect, magnified virtual image behind the mirror.`,
        topicTag: topics[2] || 'Image Formation Rules',
        difficulty: 'Recall',
        correctAnalysis: `Between P and F is the unique boundary case where reflected rays diverge in front of the mirror, necessitating backward projection behind the mirror plane.`,
        distractorAnalyses: {
          1: `At C, the image is real, inverted, and equal in size to the object.`,
          2: `Beyond C, the image is real, inverted, and diminished between C and F.`,
          3: `At infinity, the image is formed at focus F as a highly diminished point size.`,
        },
        modelAnswer: `The object must be placed between the pole (P) and principal focus (F) so diverging reflected rays form a virtual, upright, magnified image behind the mirror.`,
      });

      // 4. Direct Recall Q4: Formula Distinction
      generated.push({
        id: `chk-${section.id}-rec-4`,
        quizId: `chk-${section.id}`,
        type: isOpenResponse ? 'free_response' : 'multiple_choice',
        questionText: `What is the standard Mirror Formula relating focal length (f), image distance (v), and object distance (u)?`,
        choices: [
          `1 / f = 1 / v + 1 / u`,
          `1 / f = 1 / v - 1 / u`,
          `f = v + u`,
          `1 / f = (v * u) / (v + u)`,
        ],
        correctIndex: 0,
        explanation: `The mirror formula is 1/f = 1/v + 1/u. Note that 1/f = 1/v - 1/u is the lens formula.`,
        topicTag: 'Mirror Formula vs Lens Formula',
        difficulty: 'Recall',
        correctAnalysis: `The mirror formula features an addition between 1/v and 1/u. It relates reciprocal distances measured from the mirror pole.`,
        distractorAnalyses: {
          1: `Common Trap: 1/f = 1/v - 1/u is the LENS formula (refraction), not the mirror formula!`,
          2: `Linear distance addition is mathematically invalid for reciprocal focal relations.`,
          3: `Inverts the reciprocal equation (this would equal f, not 1/f).`,
        },
        modelAnswer: `1 / f = 1 / v + 1 / u relates focal length, image distance, and object distance for spherical mirrors.`,
      });
    } else {
      // APPLIED REASONING
      // 1. Applied Q1: Numerical mirror calculation
      generated.push({
        id: `chk-${section.id}-app-1`,
        quizId: `chk-${section.id}`,
        type: isOpenResponse ? 'free_response' : 'multiple_choice',
        questionText: `An object is placed 15 cm in front of a concave mirror of focal length 10 cm. What is the image distance (v) and its nature?`,
        choices: [
          `v = -30 cm; Real, inverted, and magnified (m = -2).`,
          `v = +30 cm; Virtual, erect, and magnified (m = +2).`,
          `v = -6 cm; Real, diminished, and inverted (m = -0.4).`,
          `v = -15 cm; Real and identical size (m = -1).`,
        ],
        correctIndex: 0,
        explanation: `Using 1/v = 1/f - 1/u = 1/(-10) - 1/(-15) = -1/10 + 1/15 = -1/30 ⇒ v = -30 cm. Since v is negative, image is real & inverted. m = -v/u = -(-30)/(-15) = -2.`,
        topicTag: 'Mirror Equation Calculations',
        difficulty: 'Application',
        correctAnalysis: `Step 1: Assign signs: u = -15 cm, f = -10 cm (concave mirror).\nStep 2: 1/v = 1/f - 1/u = (-3 + 2)/30 = -1/30 ⇒ v = -30 cm.\nStep 3: Magnification m = -v/u = -(-30)/(-15) = -2 (real, inverted, 2x magnification).`,
        distractorAnalyses: {
          1: `Sign Trap: Treated concave mirror focal length as positive (+10 cm), mistakenly concluding the image is virtual.`,
          2: `Formula Confusion: Used lens formula 1/f = 1/v - 1/u instead of mirror formula 1/f = 1/v + 1/u.`,
          3: `Boundary Trap: Assumed object is positioned at the center of curvature (C = 20 cm, not 15 cm).`,
        },
        modelAnswer: `v = -30 cm. The image is real, inverted, and magnified with magnification m = -2.`,
      });

      // 2. Applied Q2: Convex automotive mirror
      generated.push({
        id: `chk-${section.id}-app-2`,
        quizId: `chk-${section.id}`,
        type: isOpenResponse ? 'free_response' : 'multiple_choice',
        questionText: `A rear-view convex mirror on an automobile has a radius of curvature of 3.00 m. If a bus is located 5.00 m from this mirror, where is the image formed?`,
        choices: [
          `+1.15 m behind the mirror; Virtual, erect, and diminished.`,
          `-1.15 m in front of the mirror; Real and inverted.`,
          `+0.85 m behind the mirror; Virtual and magnified.`,
          `+1.50 m at the focal plane; Point sized.`,
        ],
        correctIndex: 0,
        explanation: `R = +3.00 m ⇒ f = +1.50 m. u = -5.00 m. 1/v = 1/f - 1/u = 1/1.5 - 1/(-5) = 1/1.5 + 1/5 = 6.5/7.5 ⇒ v = +1.15 m behind mirror.`,
        topicTag: 'Convex Mirror Ray Tracing',
        difficulty: 'Application',
        correctAnalysis: `Convex mirrors always produce virtual, erect, diminished images behind the mirror (v > 0). With f = +1.50 m and u = -5.00 m: 1/v = 1/1.5 + 1/5 = 13/15 ⇒ v = +1.15 m.`,
        distractorAnalyses: {
          1: `Physical Impossibility: Convex mirrors cannot produce real inverted images in front of the reflecting surface.`,
          2: `Arithmetic Trap: Arithmetic inversion error during LCD calculation for 1/1.5 + 1/5.`,
          3: `Infinity Misconception: Images form at the focal plane only when the bus is infinitely far away.`,
        },
        modelAnswer: `Image distance v = +1.15 m behind the mirror, forming a virtual, upright, diminished image.`,
      });

      // 3. Applied Q3: Practical design case
      generated.push({
        id: `chk-${section.id}-app-3`,
        quizId: `chk-${section.id}`,
        type: isOpenResponse ? 'free_response' : 'multiple_choice',
        questionText: `Why does a dentist rely specifically on a concave mirror rather than a convex mirror during oral examinations?`,
        choices: [
          `When held within its focal length (u < f), it generates an upright, magnified virtual image.`,
          `Because concave mirrors inherently provide a wider field of view covering all oral cavity quadrants simultaneously.`,
          `Because concave mirrors project real, inverted images directly onto oral cameras.`,
          `Because convex mirrors absorb ambient light and cast heavy shadows inside the teeth.`,
        ],
        correctIndex: 0,
        explanation: `Within focal distance (u < f), a concave mirror produces a magnified, upright virtual image, allowing precise inspection of cavities.`,
        topicTag: 'Practical Applications of Optics',
        difficulty: 'Application',
        correctAnalysis: `When u < f, reflected rays diverge in front and form an enlarged upright virtual image behind the reflective surface, giving the dentist an enlarged view of microscopic enamel lesions.`,
        distractorAnalyses: {
          1: `Inverted Role: Wider field of view is a key trait of CONVEX mirrors (rear-view mirrors), not concave.`,
          2: `Operational Trap: An inverted image would disorient surgical hand-eye coordination.`,
          3: `Nonsense Distractor: Mirror surfaces reflect light rather than absorb illumination.`,
        },
        modelAnswer: `Held within its focal length (u < f), a concave mirror produces an erect, magnified virtual image, enabling clear cavity inspection.`,
      });

      // 4. Applied Q4: Ray distribution & boundary
      generated.push({
        id: `chk-${section.id}-app-4`,
        quizId: `chk-${section.id}`,
        type: isOpenResponse ? 'free_response' : 'multiple_choice',
        questionText: `If the lower half of a concave mirror's reflecting surface is completely covered with an opaque black sheet, what happens to the resulting image?`,
        choices: [
          `The complete image is still formed, but its brightness (intensity) is reduced by half.`,
          `Only the upper half of the object's image is rendered.`,
          `The lower half of the image disappears completely from the focal plane.`,
          `The image gets magnified by twice its original height.`,
        ],
        correctIndex: 0,
        explanation: `Every small portion of the mirror forms a complete image. Covering half the mirror only halves the number of reflecting rays, reducing intensity without truncating the image.`,
        topicTag: 'Wavefront & Ray Distribution',
        difficulty: 'Application',
        correctAnalysis: `Rays from every single coordinate of the object strike all zones of the mirror. The unblocked upper half still gathers light from the complete object, focusing it into an intact image with 50% luminosity.`,
        distractorAnalyses: {
          1: `Classic Exam Trap: Mistakenly assuming geometric clipping occurs (it doesn't; luminosity drops instead).`,
          2: `Identical Fallacy: Covering half the mirror aperture does not delete half the image.`,
          3: `Geometrical Invariance: Covering mirror zones has zero effect on curvature radius R or focal length f.`,
        },
        modelAnswer: `A complete image is still formed, but its brightness/intensity is halved because fewer reflected rays contribute to the focus.`,
      });
    }

    return generated.slice(0, drillConfig.questionCount);
  }, [section, drillConfig]);

  // Current question helpers
  const currentQ = questions[currentIndex] || questions[0];
  const userChoice = selectedAnswers[currentIndex];
  const isAnswered = userChoice !== undefined;
  const isCorrect = isAnswered && userChoice === currentQ?.correctIndex;

  // Real-time live session timer
  useEffect(() => {
    if (!isOpen || step !== 'runner') return;
    const interval = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, step]);

  // Voice recording timer
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Cleanup speech recognition on question navigation or modal close
  useEffect(() => {
    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsRecording(false);
    }
  }, [currentIndex, isOpen]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Toggle Speech Recognition
  const handleToggleSpeak = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsRecording(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechError('Speech recognition is not supported in this browser. Please type or snap a photo.');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
        const cleaned = fullTranscript.trim();
        if (cleaned) {
          setFreeResponses((prev) => ({
            ...prev,
            [currentIndex]: cleaned,
          }));
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('Speech recognition notice:', event.error);
          setSpeechError(`Microphone notice: ${event.error}. You can still edit the transcript directly.`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Speech start error:', err);
      setSpeechError('Could not start microphone. Please check microphone permissions.');
      setIsRecording(false);
    }
  };

  // Handle Paper Derivation File selection
  const handleFileChange = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const sizeKb = Math.round(file.size / 1024);
      setUploadedImages((prev) => ({
        ...prev,
        [currentIndex]: {
          dataUrl,
          name: file.name,
          size: `${sizeKb} KB`,
          type: file.type || 'image/jpeg',
        },
      }));
      setEvalError(null);
    };
    reader.readAsDataURL(file);
  };

  // Launch drill from config
  const handleLaunchCheck = (config: DrillConfig) => {
    setDrillConfig(config);
    setCurrentIndex(0);
    setSelectedAnswers({});
    setFreeResponses({});
    setFreeResponseEvaluated({});
    setSkippedQuestions({});
    setInputModes({});
    setSolveViaDerivation({});
    setUploadedImages({});
    setEvaluations({});
    setIsEvaluating(false);
    setEvalError(null);
    setElapsedSec(0);
    setIsDeconstructionOpen(false);
    setInspectQuestionIndex(null);
    setStep('runner');
  };

  // Selection handler
  const handleSelectChoice = (choiceIdx: number) => {
    if (drillMode === 'practice' && isAnswered) return; // In practice mode, locked after first evaluation
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: choiceIdx }));
  };

  // Multimodal Derivation Evaluation submission
  const handleSubmitEvaluation = async () => {
    const mode = inputModes[currentIndex] || 'type';
    const currentText = (freeResponses[currentIndex] || '').trim();
    const currentImage = uploadedImages[currentIndex];

    if (mode === 'paper' && !currentImage) {
      setEvalError('Please snap a photo or upload your paper derivation first.');
      return;
    }
    if ((mode === 'type' || mode === 'speak') && !currentText) {
      setEvalError('Please provide your derivation or physical explanation before evaluating.');
      return;
    }

    setEvalError(null);
    setIsEvaluating(true);

    try {
      const result = await fetchEvaluateAnswer({
        questionText: currentQ.questionText,
        modelAnswer: currentQ.modelAnswer || currentQ.explanation,
        topicTag: currentQ.topicTag,
        typedText: mode === 'type' ? currentText : undefined,
        spokenTranscript: mode === 'speak' ? currentText : undefined,
        imageBase64: mode === 'paper' ? currentImage.dataUrl : undefined,
        imageMimeType: mode === 'paper' ? currentImage.type : undefined,
      });

      setEvaluations((prev) => ({ ...prev, [currentIndex]: result }));
      setFreeResponseEvaluated((prev) => ({ ...prev, [currentIndex]: true }));
    } catch (err: any) {
      console.error('Derivation evaluation failed:', err);
      setEvalError(err?.message || 'Failed to evaluate answer. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Free response submission (fallback)
  const handleSubmitFreeResponse = () => {
    handleSubmitEvaluation();
  };

  // Skip Concept
  const handleSkipConcept = () => {
    setSkippedQuestions((prev) => ({ ...prev, [currentIndex]: true }));
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinishCheck();
    }
  };

  // Next Question
  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinishCheck();
    }
  };

  // Finish Check
  const handleFinishCheck = useCallback(() => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (q.type === 'multiple_choice') {
        if (selectedAnswers[idx] === q.correctIndex && !skippedQuestions[idx]) {
          correctCount++;
        }
      } else {
        if (freeResponseEvaluated[idx] && !skippedQuestions[idx]) {
          correctCount++;
        }
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    setFinalScore(score);
    setFinalTimeSec(elapsedSec);
    setStep('diagnostic');

    onDrillComplete?.(section.id, score, elapsedSec);

    if (score >= 75) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    }
  }, [questions, selectedAnswers, freeResponseEvaluated, skippedQuestions, elapsedSec, onDrillComplete, section.id]);

  // Open "Analyze Breakdown"
  const handleOpenBreakdown = (qIdx?: number) => {
    const targetIdx = qIdx !== undefined ? qIdx : currentIndex;
    setInspectQuestionIndex(targetIdx);
    setIsDeconstructionOpen(true);
  };

  // Action: Target Weak Points (2 min Drill)
  const handleTargetWeakPoints = () => {
    // Configure a snappy 2-question applied drill targeting missed areas
    setDrillConfig({
      format: 'multiple_choice',
      cognitiveDepth: 'applied_reasoning',
      questionCount: 3,
    });
    setCurrentIndex(0);
    setSelectedAnswers({});
    setFreeResponses({});
    setFreeResponseEvaluated({});
    setSkippedQuestions({});
    setElapsedSec(0);
    setIsDeconstructionOpen(false);
    setStep('runner');
  };

  // Action: Retake Full Check
  const handleRetakeFullCheck = () => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setFreeResponses({});
    setFreeResponseEvaluated({});
    setSkippedQuestions({});
    setElapsedSec(0);
    setIsDeconstructionOpen(false);
    setStep('runner');
  };

  if (!isOpen) return null;

  const inspectQuestion = inspectQuestionIndex !== null ? questions[inspectQuestionIndex] : currentQ;
  const inspectSelectedAnswer =
    inspectQuestionIndex !== null ? selectedAnswers[inspectQuestionIndex] : userChoice;

  return (
    <div
      id="check-learning-drill-container"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* ================================================================= */}
        {/* 1. CONFIGURATION MODAL */}
        {/* ================================================================= */}
        {step === 'config' && (
          <CheckLearningConfigModal
            section={section}
            chapterName={chapterName}
            isOpen={true}
            initialConfig={drillConfig}
            onClose={onClose}
            onLaunch={handleLaunchCheck}
          />
        )}

        {/* ================================================================= */}
        {/* 2. ACTIVE CHALLENGE RUNNER */}
        {/* ================================================================= */}
        {step === 'runner' && (
          <div id="active-challenge-runner" className="flex flex-col h-full max-h-[92vh]">
            {/* ------------------------------------------------------------- */}
            {/* Header: Live session timer, "Question X of Y", toggle [Practice Mode] vs [Exam Mode] */}
            {/* ------------------------------------------------------------- */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Left: Mode Toggle */}
              <div
                id="mode-toggle-group"
                className="flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-xs font-bold"
              >
                <button
                  id="toggle-practice-mode-btn"
                  type="button"
                  onClick={() => setDrillMode('practice')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    drillMode === 'practice'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Practice Mode</span>
                </button>

                <button
                  id="toggle-exam-mode-btn"
                  type="button"
                  onClick={() => setDrillMode('exam')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    drillMode === 'exam'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Exam Mode</span>
                </button>
              </div>

              {/* Right: Live Session Timer, "Question X of Y", and Close */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* Live session timer */}
                <div
                  id="live-session-timer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 shadow-2xs"
                  title="Live Session Timer"
                >
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{formatTimer(elapsedSec)}</span>
                </div>

                {/* "Question X of Y" */}
                <span
                  id="question-progress-chip"
                  className="text-xs font-black text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800"
                >
                  Question {currentIndex + 1} of {questions.length}
                </span>

                {/* Close to Roadmap */}
                <button
                  id="runner-close-btn"
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Close to Roadmap"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Hairline Progress Bar */}
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%` }}
              />
            </div>

            {/* ------------------------------------------------------------- */}
            {/* Question Container with Stacked Selectable Option Cards */}
            {/* ------------------------------------------------------------- */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
              {/* Question metadata badge */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {currentQ.topicTag}
                </span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">
                  {drillConfig.cognitiveDepth === 'direct_recall' ? 'Direct Recall' : 'Applied Reasoning'}
                </span>
              </div>

              {/* Question text */}
              <div className="text-base sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                {currentQ.questionText}
              </div>

              {/* Derivation or MCQ Toggle Header for Multiple Choice questions */}
              {currentQ.type === 'multiple_choice' && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
                  <span className="text-xs font-bold text-slate-500">
                    {solveViaDerivation[currentIndex]
                      ? 'Derivation & Step-by-Step Reasoning Mode:'
                      : 'Select the best option, or work out on paper / voice first:'}
                  </span>
                  <button
                    id="toggle-derivation-mcq-btn"
                    type="button"
                    onClick={() =>
                      setSolveViaDerivation((prev) => ({
                        ...prev,
                        [currentIndex]: !prev[currentIndex],
                      }))
                    }
                    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {solveViaDerivation[currentIndex] ? (
                      <>
                        <ListFilter className="w-3.5 h-3.5" />
                        <span>Switch to Multiple Choice Cards</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        <span>Work Out on Paper / Voice First</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Stacked selectable options or open response / derivation workspace */}
              {currentQ.type === 'free_response' || solveViaDerivation[currentIndex] ? (
                <div className="space-y-4">
                  {/* ------------------------------------------------------------- */}
                  {/* 1. Side-by-Side Input Mode Selector Bar */}
                  {/* Positioned directly between question prompt & answer container */}
                  {/* ------------------------------------------------------------- */}
                  <div
                    id="input-mode-selector-bar"
                    className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 w-fit"
                  >
                    {/* Mode 1: [Type Answer] */}
                    <button
                      id="mode-type-btn"
                      type="button"
                      onClick={() => setInputModes((prev) => ({ ...prev, [currentIndex]: 'type' }))}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        (inputModes[currentIndex] || 'type') === 'type'
                          ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200/80 dark:border-slate-700 font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Keyboard className="w-4 h-4 text-emerald-500" />
                      <span>Type Answer</span>
                    </button>

                    {/* Mode 2: [Speak Answer] */}
                    <button
                      id="mode-speak-btn"
                      type="button"
                      onClick={() => setInputModes((prev) => ({ ...prev, [currentIndex]: 'speak' }))}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        (inputModes[currentIndex] || 'type') === 'speak'
                          ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200/80 dark:border-slate-700 font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Mic className="w-4 h-4 text-emerald-500" />
                      <span>Speak Answer</span>
                    </button>

                    {/* Mode 3: [Write on Paper] */}
                    <button
                      id="mode-paper-btn"
                      type="button"
                      onClick={() => setInputModes((prev) => ({ ...prev, [currentIndex]: 'paper' }))}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                        (inputModes[currentIndex] || 'type') === 'paper'
                          ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-slate-200/80 dark:border-slate-700 font-black'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Camera className="w-4 h-4 text-emerald-500" />
                      <span>Write on Paper</span>
                    </button>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* 2. Interactive Modes Answer Container */}
                  {/* ------------------------------------------------------------- */}
                  {(inputModes[currentIndex] || 'type') === 'type' && (
                    /* Mode 1: [Type Answer] */
                    <div id="answer-mode-type" className="space-y-2">
                      <textarea
                        id="typed-answer-textarea"
                        rows={5}
                        value={freeResponses[currentIndex] || ''}
                        onChange={(e) =>
                          setFreeResponses((prev) => ({ ...prev, [currentIndex]: e.target.value }))
                        }
                        placeholder="Type your derivation or physical explanation..."
                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none transition"
                      />
                      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                        <span>Include governing formulas, sign conventions, and final values.</span>
                        <span className="font-mono">{(freeResponses[currentIndex] || '').length} chars</span>
                      </div>
                    </div>
                  )}

                  {(inputModes[currentIndex] || 'type') === 'speak' && (
                    /* Mode 2: [Speak Answer] */
                    <div id="answer-mode-speak" className="space-y-4">
                      <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-5">
                        {/* Circular "Tap to Speak" Button */}
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          <button
                            id="tap-to-speak-btn"
                            type="button"
                            onClick={handleToggleSpeak}
                            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                              isRecording
                                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-4 ring-rose-500/30'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105 ring-4 ring-emerald-500/20'
                            }`}
                            title={isRecording ? 'Tap to Stop Recording' : 'Tap to Speak'}
                          >
                            {isRecording ? (
                              <Square className="w-6 h-6 fill-current" />
                            ) : (
                              <Mic className="w-7 h-7" />
                            )}
                          </button>
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            {isRecording ? 'Tap to Stop' : 'Tap to Speak'}
                          </span>
                        </div>

                        {/* Live Real-Time Transcription Box */}
                        <div className="flex-1 w-full space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isRecording ? (
                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-mono font-bold animate-pulse">
                                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                                  <span>REC {formatTimer(recordSeconds)}</span>
                                  {/* Pulsing soundwave bars */}
                                  <div className="flex items-center gap-0.5 ml-1">
                                    <span
                                      className="w-1 h-3 bg-rose-500 rounded-full animate-bounce"
                                      style={{ animationDelay: '0ms' }}
                                    />
                                    <span
                                      className="w-1 h-4 bg-rose-500 rounded-full animate-bounce"
                                      style={{ animationDelay: '150ms' }}
                                    />
                                    <span
                                      className="w-1 h-2 bg-rose-500 rounded-full animate-bounce"
                                      style={{ animationDelay: '300ms' }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                  Live Real-Time Transcription
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">Editable at any time</span>
                          </div>

                          <textarea
                            id="spoken-transcript-textarea"
                            rows={4}
                            value={freeResponses[currentIndex] || ''}
                            onChange={(e) =>
                              setFreeResponses((prev) => ({
                                ...prev,
                                [currentIndex]: e.target.value,
                              }))
                            }
                            placeholder={
                              isRecording
                                ? 'Listening... Speak your derivation, steps, and formula clearly into the microphone.'
                                : 'Spoken words populate here in real time. Tap the microphone button to begin speaking.'
                            }
                            className="w-full p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 resize-none font-sans"
                          />
                        </div>
                      </div>

                      {speechError && (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{speechError}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {(inputModes[currentIndex] || 'type') === 'paper' && (
                    /* Mode 3: [Write on Paper] */
                    <div id="answer-mode-paper" className="space-y-4">
                      {/* Hidden file inputs for Camera and File Picker */}
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handleFileChange(e.target.files?.[0])}
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                        className="hidden"
                        onChange={(e) => handleFileChange(e.target.files?.[0])}
                      />

                      {!uploadedImages[currentIndex] ? (
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleFileChange(e.dataTransfer.files?.[0]);
                          }}
                          className="p-6 sm:p-8 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition flex flex-col items-center justify-center text-center gap-4"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                            <Camera className="w-6 h-6" />
                          </div>

                          <div className="space-y-1 max-w-sm">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                              Write on Paper & Snap Photo
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                              Work out equations, ray diagrams, or derivations on notebook paper. Gemini 2.5 Flash will transcribe and evaluate your work.
                            </p>
                          </div>

                          {/* Side-by-side action buttons */}
                          <div className="flex flex-wrap items-center justify-center gap-3">
                            <button
                              id="snap-photo-action-btn"
                              type="button"
                              onClick={() => cameraInputRef.current?.click()}
                              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-2 shadow-xs"
                            >
                              <Camera className="w-4 h-4" />
                              <span>Snap Photo</span>
                            </button>

                            <button
                              id="upload-file-action-btn"
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-xs transition cursor-pointer flex items-center gap-2 shadow-xs"
                            >
                              <Upload className="w-4 h-4" />
                              <span>Upload File (.png, .jpg, .pdf)</span>
                            </button>
                          </div>

                          <span className="text-[11px] text-slate-400">
                            or drag and drop your derivation image here
                          </span>
                        </div>
                      ) : (
                        /* Instant image preview card */
                        <div
                          id="paper-preview-card"
                          className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
                                Paper Derivation Ready
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                {uploadedImages[currentIndex].name} • {uploadedImages[currentIndex].size}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => cameraInputRef.current?.click()}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Retake</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadedImages((prev) => {
                                    const next = { ...prev };
                                    delete next[currentIndex];
                                    return next;
                                  });
                                }}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                title="Remove Photo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center max-h-64 p-2">
                            {uploadedImages[currentIndex].dataUrl.startsWith('data:image/') ? (
                              <img
                                src={uploadedImages[currentIndex].dataUrl}
                                alt="Handwritten Derivation"
                                className="max-h-60 max-w-full object-contain rounded-lg"
                              />
                            ) : (
                              <div className="py-8 flex flex-col items-center gap-2 text-slate-500">
                                <FileText className="w-10 h-10 text-emerald-500" />
                                <span className="text-xs font-mono">
                                  {uploadedImages[currentIndex].name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ------------------------------------------------------------- */}
                  {/* 3. Primary Button & Evaluation Feedback */}
                  {/* ------------------------------------------------------------- */}
                  {!freeResponseEvaluated[currentIndex] ? (
                    <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <button
                        id="self-evaluate-btn"
                        type="button"
                        disabled={isEvaluating}
                        onClick={handleSubmitEvaluation}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 shadow-xs ${
                          isEvaluating
                            ? 'bg-emerald-600/70 text-white cursor-wait'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {isEvaluating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Analyzing derivation...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Self-Evaluate with Model Answer</span>
                          </>
                        )}
                      </button>

                      {isEvaluating && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 animate-pulse">
                          Gemini 2.5 Flash is inspecting steps and cross-checking physical formulas...
                        </span>
                      )}

                      {evalError && (
                        <span className="text-xs text-rose-500 dark:text-rose-400 font-medium">
                          {evalError}
                        </span>
                      )}
                    </div>
                  ) : (
                    /* Step-by-Step AI Evaluation Feedback & Model Answer Card */
                    <div id="evaluation-feedback-card" className="space-y-4 pt-2">
                      {evaluations[currentIndex] && (
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                          {/* Score & Verdict Banner */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm ${
                                  evaluations[currentIndex].isCorrect
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                {evaluations[currentIndex].score}%
                              </div>
                              <div>
                                <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                                  AI Multimodal Evaluation
                                </div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">
                                  {evaluations[currentIndex].isCorrect
                                    ? 'Derivation Conceptually Sound'
                                    : 'Partial Derivation • Review Steps'}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setFreeResponseEvaluated((prev) => ({
                                  ...prev,
                                  [currentIndex]: false,
                                }));
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Revise Solution</span>
                            </button>
                          </div>

                          {/* Handwritten Transcription (if image was uploaded) */}
                          {evaluations[currentIndex].transcription && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                                Transcribed Handwritten Working
                              </span>
                              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 font-mono text-xs text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 whitespace-pre-wrap leading-relaxed">
                                {evaluations[currentIndex].transcription}
                              </div>
                            </div>
                          )}

                          {/* Step-by-Step Breakdown */}
                          {evaluations[currentIndex].stepFeedback?.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                Step-by-Step Breakdown
                              </span>
                              <div className="space-y-1.5">
                                {evaluations[currentIndex].stepFeedback.map((stepMsg, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{stepMsg}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Missing Points & Traps */}
                          {evaluations[currentIndex].missingPoints?.length > 0 && (
                            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Missing Points & Boundary Traps</span>
                              </div>
                              <ul className="space-y-1 pl-5 list-disc text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed">
                                {evaluations[currentIndex].missingPoints.map((mp, mIdx) => (
                                  <li key={mIdx}>{mp}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Official Reference Model Answer */}
                      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2">
                        <div className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                          <span>Reference Model Answer</span>
                          <span className="text-[10px] text-emerald-600/80 font-normal">
                            Official Syllabus Standard
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                          {currentQ.modelAnswer || currentQ.explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Stacked Selectable Option Cards with Immediate Feedback in Practice Mode */
                <div id="stacked-option-cards" className="grid grid-cols-1 gap-3">
                  {currentQ.choices.map((choiceText, cIdx) => {
                    const optionLetter = String.fromCharCode(65 + cIdx);
                    const isSelected = userChoice === cIdx;
                    const isRightOption = cIdx === currentQ.correctIndex;

                    // Styling logic
                    let cardStyle =
                      'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700 text-slate-800 dark:text-slate-200';
                    let letterBadgeStyle =
                      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                    if (drillMode === 'practice' && isAnswered) {
                      if (isRightOption) {
                        // Correct choice: Highlights with emerald outline and check icon
                        cardStyle =
                          'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 font-bold shadow-xs ring-2 ring-emerald-500/20';
                        letterBadgeStyle = 'bg-emerald-600 text-white border-emerald-600';
                      } else if (isSelected && !isRightOption) {
                        // Selected wrong answer: Glows soft red
                        cardStyle =
                          'border-rose-400 bg-rose-50 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200 font-bold shadow-xs ring-2 ring-rose-400/20';
                        letterBadgeStyle = 'bg-rose-600 text-white border-rose-600';
                      }
                    } else if (drillMode === 'exam' && isSelected) {
                      cardStyle =
                        'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200 font-bold shadow-xs ring-1 ring-indigo-500/30';
                      letterBadgeStyle = 'bg-indigo-600 text-white border-indigo-600';
                    }

                    return (
                      <button
                        key={cIdx}
                        id={`option-card-${cIdx}`}
                        type="button"
                        onClick={() => handleSelectChoice(cIdx)}
                        className={`w-full p-4 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between gap-4 text-left ${cardStyle}`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 border ${letterBadgeStyle}`}
                          >
                            {optionLetter}
                          </span>
                          <span className="text-xs sm:text-sm leading-relaxed">{choiceText}</span>
                        </div>

                        {/* Immediate Feedback Icons in Practice Mode */}
                        {drillMode === 'practice' && isAnswered && (
                          <div className="shrink-0">
                            {isRightOption ? (
                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                            ) : isSelected ? (
                              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                                <XCircle className="w-5 h-5" />
                              </div>
                            ) : null}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Immediate Feedback Helper Banner in Practice Mode */}
              {drillMode === 'practice' && isAnswered && (
                <div
                  className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed space-y-1.5 animate-in fade-in duration-150 ${
                    isCorrect
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                      : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                  }`}
                >
                  <div className="font-black flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      {isCorrect ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>Correct! Principle verified.</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          <span>Misconception Detected. Review distractor trap analysis below.</span>
                        </>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenBreakdown()}
                      className="text-xs font-black underline hover:opacity-80 cursor-pointer"
                    >
                      Analyze Breakdown →
                    </button>
                  </div>
                  <p className="text-xs opacity-90">{currentQ.explanation}</p>
                </div>
              )}
            </div>

            {/* ------------------------------------------------------------- */}
            {/* Bottom Control Bar: "Skip Concept", "Analyze Breakdown", "Finish Check", "Next Question" */}
            {/* ------------------------------------------------------------- */}
            <div
              id="bottom-control-bar"
              className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0"
            >
              {/* Left Group: "Skip Concept" & "Analyze Breakdown" */}
              <div className="flex items-center gap-2">
                {/* 1. Skip Concept */}
                <button
                  id="btn-skip-concept"
                  type="button"
                  onClick={handleSkipConcept}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <SkipForward className="w-3.5 h-3.5 text-slate-400" />
                  <span>Skip Concept</span>
                </button>

                {/* 2. Analyze Breakdown (replaces AI Tutor) */}
                <button
                  id="btn-analyze-breakdown"
                  type="button"
                  onClick={() => handleOpenBreakdown()}
                  className="px-3.5 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Brain className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Analyze Breakdown</span>
                </button>
              </div>

              {/* Right Group: "Finish Check" & "Next Question" */}
              <div className="flex items-center gap-2">
                {/* 3. Finish Check */}
                <button
                  id="btn-finish-check"
                  type="button"
                  onClick={handleFinishCheck}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  Finish Check
                </button>

                {/* 4. Next Question */}
                <button
                  id="btn-next-question"
                  type="button"
                  onClick={handleNextQuestion}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'View Diagnostic'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 4. PERFORMANCE DIAGNOSTIC VIEW */}
        {/* ================================================================= */}
        {step === 'diagnostic' && (
          <PerformanceDiagnosticView
            section={section}
            chapterName={chapterName}
            questions={questions}
            selectedAnswers={selectedAnswers}
            freeResponseEvaluated={freeResponseEvaluated}
            skippedQuestions={skippedQuestions}
            score={finalScore}
            timeTakenSec={finalTimeSec}
            onTargetWeakPoints={handleTargetWeakPoints}
            onRetakeFullCheck={handleRetakeFullCheck}
            onReturnToRoadmap={onClose}
            onReviewConcept={(_topic, qIdx) => {
              handleOpenBreakdown(qIdx);
            }}
          />
        )}

        {/* ================================================================= */}
        {/* 3. "ANALYZE BREAKDOWN" SLIDE-OVER DRAWER (Concept Deconstruction) */}
        {/* ================================================================= */}
        <ConceptDeconstructionDrawer
          isOpen={isDeconstructionOpen}
          question={inspectQuestion}
          selectedAnswerIndex={inspectSelectedAnswer}
          onClose={() => setIsDeconstructionOpen(false)}
        />
      </div>
    </div>
  );
};
