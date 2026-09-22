import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  ArrowRight,
  HelpCircle,
  Trophy,
  RotateCcw,
  Clock,
  Sparkles,
  Brain,
  Layers,
  ChevronRight,
  BookOpen,
  Send,
  AlertTriangle,
  FileText,
  Sliders,
  Play,
  SkipForward,
  Check,
  Flame,
  ThumbsUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Section, QuizMode, QuizQuestion } from '../../types';

export interface EnrichedQuizQuestion extends QuizQuestion {
  type: 'multiple_choice' | 'free_response';
  correctAnalysis: string; // "Why the Correct Answer is Right"
  distractorAnalyses: Record<number, string>; // "Why Each Wrong Answer is Incorrect"
  modelAnswer?: string; // For free response questions
}

interface SectionQuizModalProps {
  section: Section;
  chapterName: string;
  subjectName?: string;
  isOpen: boolean;
  initialMode?: QuizMode;
  onClose: () => void;
  onQuizComplete?: (sectionId: string, score: number, timeTakenSec: number) => void;
  onOpenSummaryForMissed?: (section: Section, missedTopics: string[]) => void;
}

export const SectionQuizModal: React.FC<SectionQuizModalProps> = ({
  section,
  chapterName,
  subjectName = 'Science',
  isOpen,
  initialMode = 'study',
  onClose,
  onQuizComplete,
  onOpenSummaryForMissed,
}) => {
  // Step state: 'config' | 'quiz' | 'results'
  const [step, setStep] = useState<'config' | 'quiz' | 'results'>('config');

  // Configuration options
  const [questionStyles, setQuestionStyles] = useState<{ multipleChoice: boolean; freeResponse: boolean }>({
    multipleChoice: true,
    freeResponse: false,
  });
  const [difficulty, setDifficulty] = useState<'recall' | 'application'>('recall');
  const [questionCount, setQuestionCount] = useState<number>(4);

  // Active Quiz states
  const [activeMode, setActiveMode] = useState<QuizMode>(initialMode);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [freeResponses, setFreeResponses] = useState<Record<number, string>>({});
  const [freeResponseEvaluated, setFreeResponseEvaluated] = useState<Record<number, boolean>>({});
  const [skippedQuestions, setSkippedQuestions] = useState<Record<number, boolean>>({});
  const [elapsedSec, setElapsedSec] = useState(0);

  // AI Tutor slide-over drawer states
  const [isAITutorOpen, setIsAITutorOpen] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([]);
  const [studentQuery, setStudentQuery] = useState('');

  // Results state
  const [finalScore, setFinalScore] = useState(0);
  const [finalTimeSec, setFinalTimeSec] = useState(0);

  // Question generator based on section, topics, difficulty, and question styles
  const questions: EnrichedQuizQuestion[] = useMemo(() => {
    const title = section.title;
    const topics = section.keyTopics && section.keyTopics.length > 0
      ? section.keyTopics
      : [title];

    const generated: EnrichedQuizQuestion[] = [];

    if (difficulty === 'recall') {
      // 1. Foundational Recall Q1
      generated.push({
        id: `q-${section.id}-rec-1`,
        quizId: `qz-${section.id}`,
        type: 'multiple_choice',
        questionText: `What is the fundamental definition and governing relationship for "${topics[0] || title}"?`,
        choices: [
          `The focal length (f) of a spherical mirror equals half its radius of curvature (f = R / 2).`,
          `The focal length equals twice the radius of curvature (f = 2R).`,
          `The radius of curvature is completely independent of the focal length for all apertures.`,
          `The focal length is always positive regardless of whether the mirror is concave or convex.`,
        ],
        correctIndex: 0,
        explanation: `For spherical mirrors of small aperture, the principal focus lies halfway between the pole and center of curvature (f = R / 2).`,
        topicTag: topics[0] || title,
        difficulty: 'Recall',
        correctAnalysis: `For paraxial rays close to the principal axis, the geometry of reflection forces rays to converge or appear to diverge through the focal point situated at R / 2. This satisfies the law of reflection (i = r).`,
        distractorAnalyses: {
          1: `Inverts the mathematical relation: f = 2R mistakenly doubles the radius instead of halving it.`,
          2: `Incorrect: R and f are strictly tied by geometry in spherical optics (R = 2f).`,
          3: `Violates the Cartesian sign convention: Concave mirrors have negative focal length, convex have positive.`,
        },
      });

      // 2. Recall Q2 - Sign convention
      generated.push({
        id: `q-${section.id}-rec-2`,
        quizId: `qz-${section.id}`,
        type: 'multiple_choice',
        questionText: `Under the New Cartesian Sign Convention, why is the object distance (u) conventionally taken with a negative sign?`,
        choices: [
          `Because the object is placed to the left of the mirror/lens, opposite to incident ray direction.`,
          `Because real objects can only have negative mass and height in optics.`,
          `Because reflection always inverts the physical sign of all distances along the x-axis.`,
          `Because the focal length is negative for all optical systems.`,
        ],
        correctIndex: 0,
        explanation: `Distances measured opposite to the direction of incident light (conventionally left of the pole) are taken as negative.`,
        topicTag: topics[1] || 'Cartesian Sign Convention',
        difficulty: 'Recall',
        correctAnalysis: `The origin is set at the pole (P). Light travels left-to-right. Since the object is stationed on the left side, the vector from pole to object runs opposite to the light beam, yielding a negative sign.`,
        distractorAnalyses: {
          1: `Nonsensical physics distractor: Object mass has no bearing on optical Cartesian coordinates.`,
          2: `Reflection only alters the path of light, not the fixed Cartesian coordinate definitions.`,
          3: `False generalization: Convex mirrors and convex lenses have positive focal lengths.`,
        },
      });

      // 3. Recall Q3 - Image characteristics
      generated.push({
        id: `q-${section.id}-rec-3`,
        quizId: `qz-${section.id}`,
        type: questionStyles.freeResponse && !questionStyles.multipleChoice ? 'free_response' : 'multiple_choice',
        questionText: `A concave mirror produces a virtual, erect, and magnified image only when the object is placed at which position?`,
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
        correctAnalysis: `Between P and F is the single position where reflected rays diverge in front of the mirror, necessitating backward projection behind the mirror surface.`,
        distractorAnalyses: {
          1: `At C, the image is real, inverted, and identical in size to the object.`,
          2: `Beyond C, the image is real, inverted, and diminished between C and F.`,
          3: `At infinity, the image is formed at focus F as a highly diminished point size.`,
        },
        modelAnswer: `The object must be located between the pole (P) and the principal focus (F). The resulting rays diverge in front of the mirror, creating a virtual, upright, magnified image behind the mirror surface.`,
      });

      // 4. Recall Q4 - Core Formula
      generated.push({
        id: `q-${section.id}-rec-4`,
        quizId: `qz-${section.id}`,
        type: 'multiple_choice',
        questionText: `What is the correct Mirror Formula relating focal length (f), image distance (v), and object distance (u)?`,
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
        correctAnalysis: `The mirror formula features a positive addition between 1/v and 1/u. It relates distances from the pole regardless of whether the mirror is concave or convex.`,
        distractorAnalyses: {
          1: `Common Trap: 1/f = 1/v - 1/u is the LENS formula (refraction), not the mirror formula!`,
          2: `Linear distance addition is mathematically invalid for reciprocal focal relations.`,
          3: `Inverts the reciprocal equation (this would equal f, not 1/f).`,
        },
      });
    } else {
      // APPLICATION - HARDER
      // 1. Application Numerical Q1
      generated.push({
        id: `q-${section.id}-app-1`,
        quizId: `qz-${section.id}`,
        type: 'multiple_choice',
        questionText: `An object is placed 15 cm in front of a concave mirror of focal length 10 cm. What is the image distance (v) and its nature?`,
        choices: [
          `v = -30 cm; Real, inverted, and magnified (m = -2).`,
          `v = +30 cm; Virtual, erect, and magnified (m = +2).`,
          `v = -6 cm; Real, diminished, and inverted (m = -0.4).`,
          `v = -15 cm; Real and same size (m = -1).`,
        ],
        correctIndex: 0,
        explanation: `Using 1/v = 1/f - 1/u = 1/(-10) - 1/(-15) = -1/10 + 1/15 = -1/30 ⇒ v = -30 cm. Since v is negative, image is real & inverted. m = -v/u = -(-30)/(-15) = -2.`,
        topicTag: 'Mirror Equation Calculations',
        difficulty: 'Application',
        correctAnalysis: `Step 1: Assign signs: u = -15 cm, f = -10 cm (concave mirror).\nStep 2: 1/v = 1/f - 1/u = (-3 + 2)/30 = -1/30 ⇒ v = -30 cm.\nStep 3: Magnification m = -v/u = -(-30)/(-15) = -2 (real, inverted, 2x magnification).`,
        distractorAnalyses: {
          1: `Missed negative sign in 1/f: Forgot that concave mirrors have negative focal length, treating it as positive +10 cm.`,
          2: `Used lens formula 1/f = 1/v - 1/u instead of mirror formula 1/f = 1/v + 1/u.`,
          3: `Assumed object is at center of curvature (C = 20 cm, not 15 cm).`,
        },
      });

      // 2. Application Q2 - Magnification & Multi-step
      generated.push({
        id: `q-${section.id}-app-2`,
        quizId: `qz-${section.id}`,
        type: 'multiple_choice',
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
        correctAnalysis: `Convex mirrors always form virtual, erect, diminished images behind the mirror (v > 0). With f = +1.50 m and u = -5.00 m: 1/v = 1/1.5 + 1/5 = 13/15 ⇒ v = +1.15 m.`,
        distractorAnalyses: {
          1: `Convex mirrors NEVER produce real images of real objects in front of the mirror.`,
          2: `Arithmetic inversion error during LCD calculation for 1/1.5 + 1/5.`,
          3: `Image forms at focal plane only when the bus is infinitely far away, not at 5.00 m.`,
        },
      });

      // 3. Application Q3 - Free Response or Conceptual Application
      generated.push({
        id: `q-${section.id}-app-3`,
        quizId: `qz-${section.id}`,
        type: questionStyles.freeResponse ? 'free_response' : 'multiple_choice',
        questionText: `Why does a dentist use a concave mirror instead of a convex mirror during patient examinations?`,
        choices: [
          `When held close to the teeth (within focal length), it produces an upright and magnified virtual image.`,
          `Because concave mirrors provide a wider field of view covering all teeth simultaneously.`,
          `Because concave mirrors produce real, inverted images that fit inside photographic sensors.`,
          `Because convex mirrors absorb light and cause glare inside the oral cavity.`,
        ],
        correctIndex: 0,
        explanation: `Within focal distance (u < f), a concave mirror produces a magnified, upright virtual image, allowing precise inspection of cavities.`,
        topicTag: 'Practical Applications of Optics',
        difficulty: 'Application',
        correctAnalysis: `When u < f, reflected rays diverge in front and form an enlarged upright virtual image behind the reflective surface, giving the dentist an enlarged view of microscopic enamel lesions.`,
        distractorAnalyses: {
          1: `Wider field of view is the property of CONVEX mirrors (used in vehicle rear-view mirrors), not concave.`,
          2: `An inverted real image would disorient the dentist and cause dental instrument placement errors.`,
          3: `Mirrors reflect light, they do not selectively absorb oral illumination.`,
        },
        modelAnswer: `Dentists hold the concave mirror within its focal length (u < f). In this specific region, reflected rays project backward to form a virtual, upright, and significantly magnified image of the teeth.`,
      });

      // 4. Application Q4 - Boundary condition
      generated.push({
        id: `q-${section.id}-app-4`,
        quizId: `qz-${section.id}`,
        type: 'multiple_choice',
        questionText: `If the lower half of a concave mirror's reflecting surface is covered with an opaque black paper, what happens to the image of an object placed in front of it?`,
        choices: [
          `The complete image is still formed, but its brightness (intensity) is reduced by half.`,
          `Only the upper half of the object's image is visible.`,
          `The lower half of the image disappears completely.`,
          `The image gets magnified by twice its original height.`,
        ],
        correctIndex: 0,
        explanation: `Every small portion of the mirror forms a complete image. Covering half the mirror only halves the number of reflecting rays, reducing intensity without truncating the image.`,
        topicTag: 'Wavefront & Ray Distribution',
        difficulty: 'Application',
        correctAnalysis: `Rays from every single point of the object strike all parts of the mirror. The unblocked upper half still receives rays from all object coordinates, focusing them into a complete image with 50% luminosity.`,
        distractorAnalyses: {
          1: `Classic Board Exam Trap: Mistakenly assuming geometric clipping occurs (it doesn't, intensity drops instead).`,
          2: `The same misconception as option B: Covering half the mirror does not delete half the image.`,
          3: `Covering aperture does not alter curvature radius R or focal length f.`,
        },
      });
    }

    return generated.slice(0, questionCount);
  }, [section, difficulty, questionStyles, questionCount]);

  // Current question helpers
  const currentQ = questions[currentIndex] || questions[0];
  const userChoice = selectedAnswers[currentIndex];
  const isAnswered = userChoice !== undefined;
  const isCorrect = isAnswered && userChoice === currentQ?.correctIndex;

  // Real-time stopwatch timer
  useEffect(() => {
    if (!isOpen || step !== 'quiz') return;
    const interval = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, step]);

  // Format timer helper
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Reset quiz states
  const handleStartQuiz = () => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setFreeResponses({});
    setFreeResponseEvaluated({});
    setSkippedQuestions({});
    setElapsedSec(0);
    setIsAITutorOpen(false);
    setStep('quiz');
  };

  // Handle option selection
  const handleSelectChoice = (choiceIdx: number) => {
    if (activeMode === 'study' && isAnswered) return; // In study mode, once answered it is locked for review
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: choiceIdx }));
  };

  // Handle Free Response submission
  const handleSubmitFreeResponse = () => {
    if (!freeResponses[currentIndex]?.trim()) return;
    setFreeResponseEvaluated((prev) => ({ ...prev, [currentIndex]: true }));
  };

  // Skip This Topic
  const handleSkipQuestion = () => {
    setSkippedQuestions((prev) => ({ ...prev, [currentIndex]: true }));
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinishQuiz();
    }
  };

  // Next Question
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleFinishQuiz();
    }
  };

  // Finish Quiz and calculate scores
  const handleFinishQuiz = useCallback(() => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (q.type === 'multiple_choice') {
        if (selectedAnswers[idx] === q.correctIndex) {
          correctCount++;
        }
      } else {
        // Free response: if evaluated and self-graded correct or submitted
        if (freeResponseEvaluated[idx]) {
          correctCount++;
        }
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    setFinalScore(score);
    setFinalTimeSec(elapsedSec);
    setStep('results');

    onQuizComplete?.(section.id, score, elapsedSec);

    if (score >= 70) {
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    }
  }, [questions, selectedAnswers, freeResponseEvaluated, elapsedSec, onQuizComplete, section.id]);

  // Handle AI Tutor Query submission
  const handleSendAITutor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentQuery.trim()) return;

    const qText = studentQuery.trim();
    setStudentQuery('');

    setAiChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: qText },
      {
        sender: 'ai',
        text: `Regarding "${currentQ.questionText}":\n\n` +
          `• **Key Takeaway**: ${currentQ.correctAnalysis}\n` +
          `• **Exam Strategy**: Always write down the given values with their Cartesian signs before picking the formula!`,
      },
    ]);
  };

  // Categorize topics for Review Results screen
  const masteryIncreasedTopics = useMemo(() => {
    const list: string[] = [];
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex && !skippedQuestions[idx]) {
        list.push(q.topicTag);
      }
    });
    return Array.from(new Set(list));
  }, [questions, selectedAnswers, skippedQuestions]);

  const needsReviewTopics = useMemo(() => {
    const list: string[] = [];
    questions.forEach((q, idx) => {
      if (
        skippedQuestions[idx] ||
        (selectedAnswers[idx] !== undefined && selectedAnswers[idx] !== q.correctIndex) ||
        selectedAnswers[idx] === undefined
      ) {
        list.push(q.topicTag);
      }
    });
    return Array.from(new Set(list));
  }, [questions, selectedAnswers, skippedQuestions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* ================================================================= */}
        {/* VIEW 1: QUIZ CONFIGURATION MODAL */}
        {/* ================================================================= */}
        {step === 'config' && (
          <div className="p-6 sm:p-9 flex flex-col max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                    StudyFlow Check Learning Engine • Section {section.sectionNumber}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                    Configure Practice Quiz
                  </h2>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Config Body */}
            <div className="py-6 space-y-7 flex-1">
              {/* Option 1: Question Style (Checkboxes) */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>Question Style</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Select at least one)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
                      questionStyles.multipleChoice
                        ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={questionStyles.multipleChoice}
                      onChange={(e) => {
                        if (!e.target.checked && !questionStyles.freeResponse) return;
                        setQuestionStyles((p) => ({ ...p, multipleChoice: e.target.checked }));
                      }}
                      className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        Multiple Choice
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        4 distinct options (A, B, C, D) with full diagnostic distractor explanations.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
                      questionStyles.freeResponse
                        ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={questionStyles.freeResponse}
                      onChange={(e) => {
                        if (!e.target.checked && !questionStyles.multipleChoice) return;
                        setQuestionStyles((p) => ({ ...p, freeResponse: e.target.checked }));
                      }}
                      className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        Free Response
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Open input prompts with model reference answers and self-grading rubric.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Option 2: Difficulty (Radio Buttons: Recall - Easier vs Application - Harder) */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => setDifficulty('recall')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
                      difficulty === 'recall'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="difficulty"
                      checked={difficulty === 'recall'}
                      onChange={() => setDifficulty('recall')}
                      className="mt-1 w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Recall — Easier</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Foundational
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Direct definitions, standard formulas, boundary rules, and fundamental terminology.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setDifficulty('application')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3.5 ${
                      difficulty === 'application'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="difficulty"
                      checked={difficulty === 'application'}
                      onChange={() => setDifficulty('application')}
                      className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Application — Harder</span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          Exam Prep
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Multi-step numericals, sign convention edge cases, and real-world synthesis.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Question Count */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Number of Questions
                </label>
                <div className="flex items-center gap-2">
                  {[3, 4, 6].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuestionCount(cnt)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                        questionCount === cnt
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {cnt} Questions
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Button: "Generate Quiz & Practice" */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={handleStartQuiz}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm transition cursor-pointer flex items-center justify-center gap-2.5 shadow-xl hover:shadow-purple-500/25 active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>Generate Quiz & Practice</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 2: QUIZ INTERFACE */}
        {/* ================================================================= */}
        {step === 'quiz' && (
          <div className="flex flex-col h-full max-h-[92vh]">
            {/* Top Bar: "Study Mode" vs "Test Mode" toggle, real-time stopwatch, Question counter */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Left: Mode Toggle */}
              <div className="flex items-center p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveMode('study')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    activeMode === 'study'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-300 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Study Mode (Instant Feedback)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('test')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    activeMode === 'test'
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs font-black'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Test Mode (Exam Simulation)
                </button>
              </div>

              {/* Right: Stopwatch, Question counter & Close */}
              <div className="flex items-center gap-3">
                {/* Stopwatch */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-purple-500" />
                  <span>{formatTimer(elapsedSec)}</span>
                </div>

                {/* Question Counter */}
                <span className="text-xs font-black text-purple-600 dark:text-purple-400 px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800">
                  Question {currentIndex + 1} of {questions.length}
                </span>

                {/* AI Tutor Header Tab */}
                <button
                  type="button"
                  onClick={() => setIsAITutorOpen(true)}
                  className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 transition cursor-pointer flex items-center gap-1.5"
                  title="Open AI Tutor"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">AI Tutor</span>
                </button>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full bg-purple-600 transition-all duration-200"
                style={{ width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%` }}
              />
            </div>

            {/* Main Card */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
              {/* Question metadata badge */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {currentQ.topicTag}
                </span>
                <span>•</span>
                <span className="text-purple-600 dark:text-purple-400">
                  {currentQ.difficulty} Tier
                </span>
              </div>

              {/* Question Stem */}
              <div className="text-base sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                {currentQ.questionText}
              </div>

              {/* Question Choice Engine */}
              {currentQ.type === 'free_response' ? (
                /* Free response view */
                <div className="space-y-4">
                  <textarea
                    rows={4}
                    value={freeResponses[currentIndex] || ''}
                    onChange={(e) =>
                      setFreeResponses((p) => ({ ...p, [currentIndex]: e.target.value }))
                    }
                    placeholder="Type your explanation or derivation here..."
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                  />
                  {!freeResponseEvaluated[currentIndex] ? (
                    <button
                      type="button"
                      onClick={handleSubmitFreeResponse}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition"
                    >
                      Check Model Answer & Compare
                    </button>
                  ) : (
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2">
                      <div className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Reference Model Answer
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                        {currentQ.modelAnswer || currentQ.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* 4 Interactive Choice Buttons (A, B, C, D) */
                <div className="grid grid-cols-1 gap-3">
                  {currentQ.choices.map((choiceText, cIdx) => {
                    const optionLetter = String.fromCharCode(65 + cIdx); // A, B, C, D
                    const isSelected = userChoice === cIdx;
                    const isRightOption = cIdx === currentQ.correctIndex;

                    // Study mode immediate feedback coloring
                    let optionStyle =
                      'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-300 dark:hover:border-purple-700 text-slate-800 dark:text-slate-200';
                    let letterBadgeStyle =
                      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                    if (activeMode === 'study' && isAnswered) {
                      if (isRightOption) {
                        // Correct option turns green with checkmark
                        optionStyle =
                          'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 font-bold shadow-xs';
                        letterBadgeStyle = 'bg-emerald-600 text-white border-emerald-600';
                      } else if (isSelected && !isRightOption) {
                        // Selected option turns red if wrong
                        optionStyle =
                          'border-rose-400 bg-rose-50 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200 font-bold shadow-xs';
                        letterBadgeStyle = 'bg-rose-600 text-white border-rose-600';
                      }
                    } else if (activeMode === 'test' && isSelected) {
                      // Test mode: Clean active selection
                      optionStyle =
                        'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 font-bold shadow-xs';
                      letterBadgeStyle = 'bg-purple-600 text-white border-purple-600';
                    }

                    return (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => handleSelectChoice(cIdx)}
                        className={`w-full p-4 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between gap-4 text-left ${optionStyle}`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 border ${letterBadgeStyle}`}
                          >
                            {optionLetter}
                          </span>
                          <span className="text-xs sm:text-sm leading-relaxed">{choiceText}</span>
                        </div>

                        {/* Status Icon */}
                        {activeMode === 'study' && isAnswered && (
                          <div className="shrink-0">
                            {isRightOption ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            ) : isSelected ? (
                              <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                            ) : null}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Study Mode Immediate Inline Rationale */}
              {activeMode === 'study' && isAnswered && (
                <div
                  className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed space-y-1.5 animate-in fade-in duration-150 ${
                    isCorrect
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                      : 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200'
                  }`}
                >
                  <div className="font-black flex items-center gap-1.5">
                    {isCorrect ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Correct! Mastered this concept.</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Needs Review. Click "Show Explanation" for distractor analysis.</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs opacity-90">{currentQ.explanation}</p>
                </div>
              )}
            </div>

            {/* Bottom Toolbar: "Skip This Topic", "Show Explanation", "Finish Now", "Next Question" */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {/* Skip This Topic */}
                <button
                  type="button"
                  onClick={handleSkipQuestion}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <SkipForward className="w-3.5 h-3.5 text-slate-400" />
                  <span>Skip This Topic</span>
                </button>

                {/* Show Explanation */}
                <button
                  type="button"
                  onClick={() => setIsAITutorOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Brain className="w-3.5 h-3.5 text-purple-500" />
                  <span>Show Explanation</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Finish Now */}
                <button
                  type="button"
                  onClick={handleFinishQuiz}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  Finish Now
                </button>

                {/* Next Question */}
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'View Results'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 3: "REVIEW RESULTS" SCREEN */}
        {/* ================================================================= */}
        {step === 'results' && (
          <div className="p-6 sm:p-9 flex flex-col max-h-[92vh] overflow-y-auto space-y-7 animate-in fade-in duration-200">
            {/* Celebration Badge & Metrics */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center p-3 rounded-3xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 shadow-inner">
                {finalScore >= 75 ? (
                  <Trophy className="w-10 h-10 text-emerald-500" />
                ) : (
                  <Flame className="w-10 h-10 text-amber-500" />
                )}
              </div>

              <div>
                <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800">
                  {finalScore >= 75 ? 'Mastery Achieved!' : 'Keep at it!'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
                  Quiz Completed • Section {section.sectionNumber}
                </h2>
              </div>
            </div>

            {/* Metrics Grid: Accuracy %, Total correct ratio, Time taken */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 max-w-xl mx-auto w-full">
              {/* Accuracy % */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-center">
                <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">
                  {finalScore}%
                </div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                  Accuracy
                </div>
              </div>

              {/* Total correct ratio */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-center">
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {Object.entries(selectedAnswers).filter(
                    ([qIdx, ansIdx]) => questions[Number(qIdx)]?.correctIndex === ansIdx
                  ).length}
                  /{questions.length}
                </div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                  Correct Ratio
                </div>
              </div>

              {/* Time taken */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-center">
                <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {formatTimer(finalTimeSec)}
                </div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                  Time Taken
                </div>
              </div>
            </div>

            {/* Breakdown Lists: "Mastery Increased" (green tags) & "Needs Review" (pink tags) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto w-full">
              {/* Mastery Increased (green tags) */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Mastery Increased ({masteryIncreasedTopics.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {masteryIncreasedTopics.length > 0 ? (
                    masteryIncreasedTopics.map((top, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold border border-emerald-300 dark:border-emerald-700"
                      >
                        ✓ {top}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">No topics mastered this run.</span>
                  )}
                </div>
              </div>

              {/* Needs Review (pink tags) */}
              <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-rose-700 dark:text-rose-300 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Needs Review ({needsReviewTopics.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {needsReviewTopics.length > 0 ? (
                    needsReviewTopics.map((top, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 text-xs font-bold border border-rose-300 dark:border-rose-700"
                      >
                        ⚠️ {top}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-emerald-600 font-bold">100% Retained! All topics sound.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons: "Focused Summary on Missed Quizzes", "Resume Test", "Back to Sections" */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3 max-w-xl mx-auto w-full">
              {needsReviewTopics.length > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenSummaryForMissed?.(section, needsReviewTopics)}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Focused Summary on Missed Quizzes</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleStartQuiz}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Resume Test</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Back to Sections</span>
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* RIGHT SLIDE-OVER "AI TUTOR" DRAWER */}
        {/* ================================================================= */}
        {isAITutorOpen && (
          <div className="absolute inset-y-0 right-0 z-50 w-full sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    AI Tutor Diagnostic
                  </h3>
                  <p className="text-[10px] text-slate-400">Deep answer analysis & distractor breakdown</p>
                </div>
              </div>
              <button
                onClick={() => setIsAITutorOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body: Structured Analysis */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed">
              {/* a) "Why the Correct Answer is Right" */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Why the Correct Answer is Right</span>
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Option {String.fromCharCode(65 + currentQ.correctIndex)}: {currentQ.choices[currentQ.correctIndex]}
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  {currentQ.correctAnalysis}
                </p>
              </div>

              {/* b) "Why Each Wrong Answer is Incorrect" */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Why Each Wrong Answer is Incorrect</span>
                </div>

                <div className="space-y-2 pt-1">
                  {currentQ.choices.map((choiceText, cIdx) => {
                    if (cIdx === currentQ.correctIndex) return null;
                    const letter = String.fromCharCode(65 + cIdx);
                    const reason =
                      currentQ.distractorAnalyses?.[cIdx] ||
                      `Distractor ${letter} does not satisfy the boundary equations or physical definition of ${currentQ.topicTag}.`;

                    return (
                      <div
                        key={cIdx}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1"
                      >
                        <div className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <X className="w-3 h-3" />
                          <span>Option {letter}</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-snug">
                          {reason}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Chat History */}
              {aiChatMessages.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Follow-Up Discussion
                  </div>
                  {aiChatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-2xl whitespace-pre-line text-xs ${
                        msg.sender === 'user'
                          ? 'ml-auto bg-purple-600 text-white font-medium max-w-[85%]'
                          : 'mr-auto bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 max-w-[90%]'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick suggested questions */}
            <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setStudentQuery('Can you explain this with a real-life analogy?')}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 border border-slate-200 dark:border-slate-700"
              >
                💡 Analogy
              </button>
              <button
                type="button"
                onClick={() => setStudentQuery('What is the most common exam mistake on this?')}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 border border-slate-200 dark:border-slate-700"
              >
                ⚠️ Exam Traps
              </button>
              <button
                type="button"
                onClick={() => setStudentQuery('How would I derive the formula if I forgot it?')}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 border border-slate-200 dark:border-slate-700"
              >
                📐 Derivation
              </button>
            </div>

            {/* c) Conversational input box ("Ask anything...") */}
            <form
              onSubmit={handleSendAITutor}
              className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 text-xs p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
