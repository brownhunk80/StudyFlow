import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Brain,
  Layers,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Check,
  EyeOff,
  Eye,
  BookOpen,
  ChevronRight,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Keyboard,
  Sliders,
  Mic,
  MicOff,
  Loader2,
  Calculator,
  Lightbulb,
  CheckCircle,
  Compass,
  Scale,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Section, DocumentFlashcard } from '../../types';
import { RecallSessionD3Distribution, CardSessionReviewItem } from './RecallSessionD3Distribution';
import { isHindiSubject } from '../../utils/hindiDetection';
import { validateMathAnswer, MathValidationResult } from '../../utils/mathEquivalence';
import { MathVerificationBadge } from './MathVerificationBadge';
import {
  generateConversionLogEntry,
  DimensionCategory,
  UnitConversionLogEntry,
} from '../../utils/mathUnitConversion';
import { UnitConversionLogCard } from './UnitConversionLogCard';
import { UnitConversionReferenceDrawer } from './UnitConversionReferenceDrawer';

export interface DerivationStepItem {
  stepNumber: number;
  stepAction: string;
  expression: string;
  reasonWhy?: string;
}

export interface RemNoteCardItem {
  id: string;
  sectionId?: string;
  breadcrumb: string;
  parentBullet: string;
  front: string;
  back: string;
  explanation?: string;
  sourceExcerpt?: string;
  // Math & Quantitative Problem Solving Fields
  cardType?: 'single' | 'list' | 'math_problem';
  problemStatement?: string;
  expectedAnswer?: string;
  acceptableAnswers?: string[];
  formulaUsed?: string;
  givenData?: string[];
  hint?: string;
  stepByStepDerivation?: DerivationStepItem[];
  // SM-2 parameters
  interval: number; // in days
  repetition: number;
  easinessFactor: number;
  status: 'active' | 'disabled' | 'learning' | 'mastered';
  lastRating?: 'disable' | 'relearn' | 'understood';
  dueDate?: string;
}

export interface MilestoneRecallDeckRunnerProps {
  section: Section;
  chapterName: string;
  subjectName?: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCards?: (sectionId: string, updatedCards: RemNoteCardItem[], recallDeckScore: number) => void;
  checkpointsScore?: number;
}

function isMathSubjectOrTopic(subjectName?: string, chapterTitle: string = '', sectionTitle: string = ''): boolean {
  const combined = `${subjectName || ''} ${chapterTitle} ${sectionTitle}`.toLowerCase();
  return (
    combined.includes('math') ||
    combined.includes('algebra') ||
    combined.includes('geometry') ||
    combined.includes('calculus') ||
    combined.includes('trigonometry') ||
    combined.includes('arithmetic') ||
    combined.includes('quadratic') ||
    combined.includes('polynomial') ||
    combined.includes('probability') ||
    combined.includes('statistics') ||
    combined.includes('surface area') ||
    combined.includes('coordinate geometry') ||
    combined.includes('triangles') ||
    combined.includes('circles') ||
    combined.includes('linear equation')
  );
}

export const normalizeRemNoteCard = (
  c: any,
  idx: number,
  sectionId: string,
  sectionTitle: string,
  chapterName: string,
  keyTopics?: string[],
  sourceRef?: string,
  subjectName?: string
): RemNoteCardItem => {
  const topics = keyTopics && keyTopics.length > 0 ? keyTopics : [sectionTitle];
  const subtopic = topics[idx % topics.length] || sectionTitle;

  const isHindi = isHindiSubject(subjectName, chapterName, `${sectionTitle} ${subtopic}`);
  const isMath = isMathSubjectOrTopic(subjectName, chapterName, sectionTitle) || c.cardType === 'math_problem';

  const fallbackFront = isHindi
    ? `पाठ '${chapterName}' के संदर्भ में '${subtopic}' का मुख्य भाव अथवा अर्थ क्या है?`
    : isMath
    ? `In ${subtopic}, solve the mathematical problem with step-by-step calculation.`
    : `State the primary governing principle and key relationship for ${subtopic}.`;

  const fallbackBack = isHindi
    ? `${subtopic} का मूल उद्देश्य पाठ के केंद्रीय संदेश को अभिव्यक्त करना और नैतिक/साहित्यिक बोध कराना है।`
    : isMath
    ? `Calculated numerical solution for ${subtopic}.`
    : `Underlying core formulation and invariant relation for ${subtopic}.`;

  const front =
    (typeof c.front === 'string' && c.front.trim()) ||
    (typeof c.problemStatement === 'string' && c.problemStatement.trim()) ||
    (typeof c.frontPrompt === 'string' && c.frontPrompt.trim()) ||
    (typeof c.promptQuestion === 'string' && c.promptQuestion.trim()) ||
    (typeof c.prompt === 'string' && c.prompt.trim()) ||
    (typeof c.question === 'string' && c.question.trim()) ||
    fallbackFront;

  const back =
    (typeof c.back === 'string' && c.back.trim()) ||
    (typeof c.expectedAnswer === 'string' && c.expectedAnswer.trim()) ||
    (typeof c.backAnswer === 'string' && c.backAnswer.trim()) ||
    (typeof c.inlineAnswer === 'string' && c.inlineAnswer.trim()) ||
    (typeof c.answer === 'string' && c.answer.trim()) ||
    (typeof c.modelAnswer === 'string' && c.modelAnswer.trim()) ||
    (typeof c.sampleAnswer === 'string' && c.sampleAnswer.trim()) ||
    fallbackBack;

  const parentConcept =
    (typeof c.parentConcept === 'string' && c.parentConcept.trim()) ||
    (typeof c.parentBullet === 'string' && c.parentBullet.trim()) ||
    (typeof c.concept === 'string' && c.concept.trim()) ||
    (typeof c.topicTag === 'string' && c.topicTag.trim()) ||
    subtopic;

  const parentBullet = parentConcept.startsWith('•')
    ? parentConcept
    : isHindi
    ? `• मुख्य बिंदु: ${parentConcept}`
    : isMath
    ? `• Math Problem: ${parentConcept}`
    : `• Core Principle: ${parentConcept}`;

  const breadcrumb =
    (typeof c.breadcrumb === 'string' && c.breadcrumb.trim()) ||
    `${chapterName} › ${sectionTitle} › ${subtopic}`;

  const explanation =
    (typeof c.explanation === 'string' && c.explanation.trim()) ||
    (typeof c.notes === 'string' && c.notes.trim()) ||
    `Under standard conditions in ${sectionTitle}, this relation remains invariant and is tested in both theoretical and numerical contexts.`;

  const sourceExcerpt =
    (typeof c.sourceExcerpt === 'string' && c.sourceExcerpt.trim()) ||
    (typeof c.sourceQuote === 'string' && c.sourceQuote.trim()) ||
    (typeof c.sourceReference === 'string' && c.sourceReference.trim()) ||
    (typeof c.sourceContext === 'string' && c.sourceContext.trim()) ||
    sourceRef ||
    `${chapterName} Reference Notes`;

  const expectedAnswer =
    (typeof c.expectedAnswer === 'string' && c.expectedAnswer.trim()) ||
    (typeof c.inlineAnswer === 'string' && c.inlineAnswer.trim()) ||
    (typeof c.back === 'string' && c.back.trim()) ||
    back;

  const acceptableAnswers = Array.isArray(c.acceptableAnswers) && c.acceptableAnswers.length > 0
    ? c.acceptableAnswers
    : [expectedAnswer];

  const givenData = Array.isArray(c.givenData) ? c.givenData : [];
  const formulaUsed = typeof c.formulaUsed === 'string' ? c.formulaUsed : '';
  const hint = typeof c.hint === 'string' ? c.hint : '';
  const stepByStepDerivation = Array.isArray(c.stepByStepDerivation) ? c.stepByStepDerivation : [];

  return {
    id: c.id || `card-${sectionId}-${idx + 1}`,
    sectionId,
    breadcrumb,
    parentBullet,
    front,
    back,
    explanation,
    sourceExcerpt,
    cardType: c.cardType === 'math_problem' || isMath ? 'math_problem' : c.cardType === 'list' ? 'list' : 'single',
    problemStatement: c.problemStatement || front,
    expectedAnswer,
    acceptableAnswers,
    formulaUsed,
    givenData,
    hint,
    stepByStepDerivation,
    interval: typeof c.interval === 'number' && c.interval > 0 ? c.interval : 1,
    repetition: typeof c.repetition === 'number' ? c.repetition : 0,
    easinessFactor: typeof c.easinessFactor === 'number' ? c.easinessFactor : 2.5,
    status: c.status === 'disabled' ? 'disabled' : c.status === 'mastered' ? 'mastered' : 'active',
    lastRating: c.lastRating,
    dueDate: c.dueDate || new Date().toISOString(),
  };
};

export const MilestoneRecallDeckRunner: React.FC<MilestoneRecallDeckRunnerProps> = ({
  section,
  chapterName,
  subjectName = 'Science',
  isOpen,
  onClose,
  onUpdateCards,
  checkpointsScore = 75,
}) => {
  const isHindi = isHindiSubject(subjectName, chapterName, section.title);
  const isMath = isMathSubjectOrTopic(subjectName, chapterName, section.title);
  const resolvedSubject = isHindi ? 'Hindi' : isMath ? 'Mathematics' : (subjectName && subjectName !== 'Science' ? subjectName : 'General');

  // Generate initial RemNote-style cards from section flashcards / recallDeck or tailored synthesis
  const initialCards: RemNoteCardItem[] = useMemo(() => {
    let savedList: any[] | null = null;
    try {
      const saved1 = localStorage.getItem(`milestone_recall_deck_${section.id}`);
      if (saved1) {
        const parsed = JSON.parse(saved1);
        if (Array.isArray(parsed) && parsed.length > 0) savedList = parsed;
      }
      if (!savedList) {
        const saved2 = localStorage.getItem(`recall_deck_${section.id}`);
        if (saved2) {
          const parsed = JSON.parse(saved2);
          if (Array.isArray(parsed) && parsed.length > 0) savedList = parsed;
        }
      }
    } catch {}

    if (savedList && savedList.length > 0) {
      return savedList.map((c, idx) =>
        normalizeRemNoteCard(
          c,
          idx,
          section.id,
          section.title,
          chapterName,
          section.keyTopics,
          section.sourceReference,
          subjectName
        )
      );
    }

    const rawList: any[] =
      (Array.isArray(section.flashcards) && section.flashcards.length > 0 && section.flashcards) ||
      (Array.isArray(section.recallDeck) && section.recallDeck.length > 0 && section.recallDeck) ||
      [];

    if (rawList.length > 0) {
      return rawList.map((c, idx) =>
        normalizeRemNoteCard(
          c,
          idx,
          section.id,
          section.title,
          chapterName,
          section.keyTopics,
          section.sourceReference,
          subjectName
        )
      );
    }

    const topics = section.keyTopics && section.keyTopics.length > 0 ? section.keyTopics : [section.title];
    const t0 = topics[0] || section.title;
    const t1 = topics[1] || t0;

    if (isMath) {
      return [
        {
          id: `card-${section.id}-1`,
          sectionId: section.id,
          breadcrumb: `${chapterName} › ${section.title} › Numerical Problem 1`,
          parentBullet: `• Numerical Calculation: ${t0}`,
          front: `Solve for x in ${section.title}: Given the equation 2x² - 7x + 3 = 0, find both roots using the quadratic formula.`,
          back: `x = 3, 1/2`,
          expectedAnswer: `3, 1/2`,
          acceptableAnswers: ['3, 1/2', '1/2, 3', '3, 0.5', '0.5, 3', 'x = 3, x = 1/2', 'x = 3 or 1/2'],
          formulaUsed: 'x = (-b ± √(b² - 4ac)) / (2a)',
          givenData: ['a = 2', 'b = -7', 'c = 3'],
          hint: 'Calculate the discriminant D = b² - 4ac first: (-7)² - 4(2)(3) = 49 - 24 = 25.',
          stepByStepDerivation: [
            { stepNumber: 1, stepAction: 'Identify coefficients & compute discriminant D', expression: 'D = (-7)² - 4(2)(3) = 49 - 24 = 25', reasonWhy: 'D > 0 indicates two distinct real roots.' },
            { stepNumber: 2, stepAction: 'Apply quadratic formula', expression: 'x = (-(-7) ± √25) / (2 × 2) = (7 ± 5) / 4', reasonWhy: 'Standard root calculation formula.' },
            { stepNumber: 3, stepAction: 'Simplify roots', expression: 'x₁ = (7+5)/4 = 12/4 = 3 ; x₂ = (7-5)/4 = 2/4 = 1/2', reasonWhy: 'Final simplified numerical roots.' },
          ],
          cardType: 'math_problem',
          explanation: 'Discriminant D = 25 > 0 yields real rational roots. The roots are x = 3 and x = 1/2.',
          sourceExcerpt: `NCERT Mathematics: ${section.title} Formulations`,
          interval: 1,
          repetition: 0,
          easinessFactor: 2.5,
          status: 'active',
        },
        {
          id: `card-${section.id}-2`,
          sectionId: section.id,
          breadcrumb: `${chapterName} › ${section.title} › Numerical Problem 2`,
          parentBullet: `• Arithmetic Calculation: ${t1}`,
          front: `Find the 10th term (a₁₀) of the sequence in ${section.title}: 2, 7, 12, 17...`,
          back: `a₁₀ = 47`,
          expectedAnswer: `47`,
          acceptableAnswers: ['47', 'a10 = 47', 'an = 47'],
          formulaUsed: 'an = a + (n - 1)d',
          givenData: ['First term a = 2', 'Common difference d = 7 - 2 = 5', 'n = 10'],
          hint: 'Substitute into an = a + (n - 1)d with a = 2, d = 5, n = 10.',
          stepByStepDerivation: [
            { stepNumber: 1, stepAction: 'Find common difference d', expression: 'd = 7 - 2 = 5', reasonWhy: 'Difference between consecutive terms.' },
            { stepNumber: 2, stepAction: 'Apply nth term formula', expression: 'a₁₀ = 2 + (10 - 1) × 5 = 2 + 9 × 5', reasonWhy: 'General progression formula.' },
            { stepNumber: 3, stepAction: 'Compute final result', expression: 'a₁₀ = 2 + 45 = 47', reasonWhy: 'Final numerical value.' },
          ],
          cardType: 'math_problem',
          explanation: 'The 10th term of the AP is calculated as a + (10 - 1)d = 2 + 45 = 47.',
          sourceExcerpt: `Textbook Section: ${section.title} Arithmetic Formulas`,
          interval: 1,
          repetition: 0,
          easinessFactor: 2.5,
          status: 'active',
        },
      ];
    }

    if (isHindi) {
      return [
        {
          id: `card-${section.id}-1`,
          sectionId: section.id,
          breadcrumb: `${chapterName} › ${section.title} › ${t0}`,
          parentBullet: `• मुख्य भाव एवं प्रतिपाद्य`,
          front: `पाठ '${chapterName}' के आधार पर '${t0}' का मूल भाव और लेखक/कवि का मुख्य संदेश क्या है?`,
          back: `'${t0}' के माध्यम से मानवीय संवेदना, कर्तव्यनिष्ठा, नैतिक मूल्यों और सामाजिक यथार्थ का सजीव चित्रण किया गया है।`,
          explanation: `बोर्ड परीक्षा में भावार्थ लिखते समय प्रसंग, सरल अर्थ तथा उससे मिलने वाली मानवीय सीख का स्पष्ट उल्लेख करें।`,
          sourceExcerpt: `एनसीईआरटी पाठ्यपुस्तक: '${chapterName}' संदर्भ`,
          interval: 1,
          repetition: 0,
          easinessFactor: 2.5,
          status: 'active',
        },
        {
          id: `card-${section.id}-2`,
          sectionId: section.id,
          breadcrumb: `${chapterName} › ${section.title} › ${t1}`,
          parentBullet: `• महत्वपूर्ण प्रसंग एवं पात्र-विश्लेषण`,
          front: `'${t1}' से संबंधित प्रसंग का पाठ में क्या महत्व है? यह घटना किस मूल विचार को स्पष्ट करती है?`,
          back: `यह प्रसंग पात्रों के आंतरिक भावों, त्याग, आत्मसम्मान अथवा मानवीय संवेदनाओं की गहराई को उजागर करता है।`,
          explanation: `गद्यांश या काव्यांश पर आधारित प्रश्नों में संदर्भ को समझकर सटीक उत्तर लिखना अनिवार्य होता है।`,
          sourceExcerpt: `पाठ्यपुस्तक खंड: '${section.title}'`,
          interval: 1,
          repetition: 0,
          easinessFactor: 2.5,
          status: 'active',
        },
      ];
    }

    return [
      {
        id: `card-${section.id}-1`,
        sectionId: section.id,
        breadcrumb: `${chapterName} › ${section.title} › ${t0}`,
        parentBullet: `• Foundational Definition & Operational Mechanism`,
        front: `State the operational definition of ${t0} and its fundamental SI unit.`,
        back: `${t0} defines the rate of quantity transfer per unit dimension across defined equilibrium boundaries. Its standard SI measure is expressed in base units.`,
        explanation: `Pay close attention to dimensional homogeneity: verify that both left-hand and right-hand sides simplify to matching base dimensions.`,
        sourceExcerpt: `Textbook Section ${section.sectionNumber}: Principles of ${section.title}`,
        interval: 1,
        repetition: 0,
        easinessFactor: 2.5,
        status: 'active',
      },
      {
        id: `card-${section.id}-2`,
        sectionId: section.id,
        breadcrumb: `${chapterName} › ${section.title} › Invariant Laws`,
        parentBullet: `• Mathematical Invariance & Conservation`,
        front: `What quantity remains invariant during transformations in ${section.title}?`,
        back: `Total system energy and momentum remain strictly conserved when no external non-conservative forces act upon the closed boundary.`,
        explanation: `In exam scenarios, always specify whether the boundary permits energy or matter exchange before invoking conservation theorems.`,
        sourceExcerpt: `Textbook Section ${section.sectionNumber}: Conservation Criteria`,
        interval: 1,
        repetition: 0,
        easinessFactor: 2.5,
        status: 'active',
      },
    ];
  }, [section, chapterName, subjectName, isMath, isHindi]);

  const [cards, setCards] = useState<RemNoteCardItem[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionReviews, setSessionReviews] = useState<CardSessionReviewItem[]>([]);

  // Math Interactive Input & Live Equivalence Validation State
  const [mathInput, setMathInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showFormula, setShowFormula] = useState(false);
  const mathInputRef = useRef<HTMLInputElement>(null);

  // Voice Answering & SpeechRecognition State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isEvaluatingVoice, setIsEvaluatingVoice] = useState(false);
  const [voiceEvaluation, setVoiceEvaluation] = useState<any | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Check SpeechRecognition support on mount
  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSpeechSupported(Boolean(SpeechRecognitionAPI));
  }, []);

  // Stop recording helper
  const stopVoiceRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsVoiceActive(false);
    setInterimTranscript('');
  }, []);

  // Sync cards state when section or initialCards change
  useEffect(() => {
    if (isOpen) {
      setCards(initialCards);
      setCurrentIndex(0);
      setIsRevealed(false);
      setIsExplanationOpen(false);
      setIsCompleted(false);
      setSessionReviews([]);
      setSpokenTranscript('');
      setInterimTranscript('');
      setVoiceEvaluation(null);
      setVoiceError(null);
      setIsVoiceActive(false);
      setMathInput('');
      setShowHint(false);
      setShowFormula(false);
    }
  }, [section.id, initialCards, isOpen]);

  useEffect(() => {
    return () => {
      stopVoiceRecording();
    };
  }, [stopVoiceRecording]);

  // Active non-disabled cards queue
  const activeQueue = useMemo(() => {
    return cards.filter((c) => c.status !== 'disabled');
  }, [cards]);

  const currentCard = activeQueue[currentIndex] || activeQueue[0];
  const isCurrentCardMath = Boolean(
    currentCard?.cardType === 'math_problem' ||
    (Array.isArray(currentCard?.stepByStepDerivation) && currentCard.stepByStepDerivation.length > 0) ||
    (isMath && (
      (Array.isArray(currentCard?.givenData) && currentCard.givenData.length > 0) ||
      Boolean(currentCard?.formulaUsed) ||
      /(?:calculate|compute|solve for|find both roots|find the value of)\b/i.test(currentCard?.front || '')
    ))
  );

  // Real-time Instant Math Validation for Current Card
  const mathValidation: MathValidationResult = useMemo(() => {
    if (!currentCard || !isCurrentCardMath) {
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
        feedback: '',
        normalizedInput: '',
        normalizedExpected: '',
      };
    }

    const expected = currentCard.expectedAnswer || currentCard.back || '';
    const acceptable = currentCard.acceptableAnswers || [];
    const derivation = currentCard.stepByStepDerivation || [];

    return validateMathAnswer(mathInput, expected, acceptable, derivation);
  }, [currentCard, isCurrentCardMath, mathInput]);

  // Unit Conversion Log Entry for Current Card
  const activeConversionLog = useMemo(() => {
    if (!mathValidation.isUnitConverted) return null;
    return generateConversionLogEntry(
      mathValidation.receivedMagnitude,
      mathValidation.unitReceived,
      mathValidation.expectedMagnitude,
      mathValidation.unitExpected
    );
  }, [mathValidation]);

  // Reference Cheat Sheet Drawer State
  const [isReferenceDrawerOpen, setIsReferenceDrawerOpen] = useState(false);
  const [selectedReferenceDimension, setSelectedReferenceDimension] = useState<DimensionCategory | null>(null);

  const handleOpenReference = (dim?: DimensionCategory) => {
    setSelectedReferenceDimension(dim || null);
    setIsReferenceDrawerOpen(true);
  };

  // Quick Math Symbol Insertion Helper
  const handleInsertSymbol = (symbol: string) => {
    setMathInput((prev) => {
      const inputEl = mathInputRef.current;
      if (inputEl) {
        const start = inputEl.selectionStart || prev.length;
        const end = inputEl.selectionEnd || prev.length;
        const updated = prev.slice(0, start) + symbol + prev.slice(end);
        setTimeout(() => {
          inputEl.focus();
          inputEl.setSelectionRange(start + symbol.length, start + symbol.length);
        }, 10);
        return updated;
      }
      return prev + symbol;
    });
  };

  // Calculate SM-2 Spaced Repetition metrics
  const stats = useMemo(() => {
    const totalCards = cards.length;
    const activeCards = activeQueue.length;
    const disabledCount = cards.filter((c) => c.status === 'disabled').length;
    const understoodCount = cards.filter((c) => c.lastRating === 'understood' || c.status === 'mastered').length;
    const relearnCount = cards.filter((c) => c.lastRating === 'relearn').length;

    const matureCount = cards.filter(
      (c) => c.status !== 'disabled' && (c.interval >= 3 || c.repetition >= 2 || c.status === 'mastered')
    ).length;

    const recallDeckScore =
      activeCards > 0 ? Math.min(100, Math.round(((matureCount + understoodCount * 0.5) / activeCards) * 100)) : 0;

    const recallContribution = Math.round(recallDeckScore * 0.6);
    const finalMasteryIndex = Math.min(
      100,
      Math.round(checkpointsScore * 0.4 + recallDeckScore * 0.6)
    );

    return {
      totalCards,
      activeCards,
      disabledCount,
      understoodCount,
      relearnCount,
      matureCount,
      recallDeckScore,
      recallContribution,
      finalMasteryIndex,
    };
  }, [cards, activeQueue, checkpointsScore]);

  // Persist cards state
  const persistCards = useCallback((updated: RemNoteCardItem[]) => {
    setCards(updated);
    try {
      localStorage.setItem(`milestone_recall_deck_${section.id}`, JSON.stringify(updated));
      localStorage.setItem(`recall_deck_${section.id}`, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('studyflow_cards_updated'));
    } catch {}

    const active = updated.filter((c) => c.status !== 'disabled');
    const mature = active.filter((c) => c.interval >= 3 || c.repetition >= 2 || c.status === 'mastered').length;
    const understood = active.filter((c) => c.lastRating === 'understood').length;
    const score = active.length > 0 ? Math.min(100, Math.round(((mature + understood * 0.5) / active.length) * 100)) : 0;

    onUpdateCards?.(section.id, updated, score);
  }, [section.id, onUpdateCards]);

  // Handle 3-Tier Rating: 'disable' | 'relearn' | 'understood'
  const handleRate = useCallback(
    (rating: 'disable' | 'relearn' | 'understood') => {
      if (!currentCard) return;

      const updated = cards.map((c) => {
        if (c.id === currentCard.id) {
          if (rating === 'disable') {
            return {
              ...c,
              status: 'disabled' as const,
              lastRating: 'disable' as const,
            };
          }

          if (rating === 'relearn') {
            return {
              ...c,
              interval: 1,
              repetition: 0,
              easinessFactor: Math.max(1.3, c.easinessFactor - 0.2),
              status: 'learning' as const,
              lastRating: 'relearn' as const,
              dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            };
          }

          // Understood: SM-2 Growth
          let nextRep = c.repetition + 1;
          let nextInterval = 1;
          if (nextRep === 1) nextInterval = 1;
          else if (nextRep === 2) nextInterval = 3;
          else nextInterval = Math.min(60, Math.round(c.interval * c.easinessFactor));

          return {
            ...c,
            interval: nextInterval,
            repetition: nextRep,
            easinessFactor: Math.min(2.8, c.easinessFactor + 0.1),
            status: nextInterval >= 3 ? ('mastered' as const) : ('learning' as const),
            lastRating: 'understood' as const,
            dueDate: new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000).toISOString(),
          };
        }
        return c;
      });

      // Append to session reviews for D3 chart distribution
      setSessionReviews((prev) => [
        ...prev.filter((r) => r.id !== currentCard.id),
        {
          id: currentCard.id,
          front: currentCard.front,
          back: currentCard.back,
          parentConcept: currentCard.parentBullet,
          rating,
          voiceAccuracy: isCurrentCardMath && mathValidation.isMatch ? 100 : voiceEvaluation?.accuracyScore,
          spokenTranscript: mathInput ? `[Math Input]: ${mathInput}` : voiceEvaluation?.spokenTranscript || (spokenTranscript ? spokenTranscript : undefined),
          unitConversionLog: activeConversionLog,
        },
      ]);

      persistCards(updated);

      if (rating === 'understood' || (isCurrentCardMath && mathValidation.isMatch)) {
        confetti({
          particleCount: 25,
          spread: 40,
          origin: { y: 0.8 },
        });
      }

      setIsRevealed(false);
      setIsExplanationOpen(false);
      setVoiceEvaluation(null);
      setSpokenTranscript('');
      setInterimTranscript('');
      setMathInput('');
      setShowHint(false);
      setShowFormula(false);

      if (currentIndex < activeQueue.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setIsCompleted(true);
      }
    },
    [currentCard, cards, persistCards, currentIndex, activeQueue.length, voiceEvaluation, spokenTranscript, isCurrentCardMath, mathValidation, mathInput, activeConversionLog]
  );

  // Instant Check Answer for Maths
  const handleCheckMathAnswer = () => {
    if (!mathInput.trim()) return;

    if (mathValidation.isMatch) {
      confetti({
        particleCount: 35,
        spread: 45,
        origin: { y: 0.6 },
      });
      setIsRevealed(true);
    } else {
      setIsRevealed(true);
    }
  };

  // Evaluate voice answer with AI
  const evaluateSpokenResponse = async (transcriptText: string) => {
    if (!currentCard || !transcriptText.trim()) return;

    setIsEvaluatingVoice(true);
    setVoiceError(null);

    try {
      const response = await fetch('/api/recall/evaluate-voice-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: currentCard.id,
          front: currentCard.front,
          back: currentCard.back,
          notes: currentCard.explanation || '',
          explanation: currentCard.explanation || '',
          subject: resolvedSubject,
          chapter: chapterName,
          spokenTranscript: transcriptText.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Evaluation failed (HTTP ${response.status})`);
      }

      const evalData = await response.json();
      setVoiceEvaluation(evalData);
      setIsRevealed(true);

      if (evalData.accuracyScore >= 80) {
        confetti({
          particleCount: 35,
          spread: 45,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      console.warn('[MilestoneRecall] Evaluation error:', err);
      setVoiceError('Could not connect to AI evaluator. Review the model answer below.');
      setIsRevealed(true);
    } finally {
      setIsEvaluatingVoice(false);
    }
  };

  const startVoiceRecording = () => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setVoiceError('Speech recognition is not supported in this browser. You can type your answer instead.');
      return;
    }

    setSpokenTranscript('');
    setInterimTranscript('');
    setVoiceEvaluation(null);
    setVoiceError(null);
    setRecordingSeconds(0);

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTrans += item[0].transcript + ' ';
          } else {
            interimTrans += item[0].transcript;
          }
        }
        if (finalTrans) {
          setSpokenTranscript((prev) => (finalTrans.trim() ? finalTrans.trim() : prev));
        }
        setInterimTranscript(interimTrans);
      };

      recognition.onerror = (event: any) => {
        console.warn('[SpeechRecognition] Error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setVoiceError('Microphone permission was denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'no-speech') {
          // No speech
        } else {
          setVoiceError(`Microphone notice: ${event.error}`);
        }
        stopVoiceRecording();
      };

      recognition.onend = () => {
        setIsVoiceActive(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsVoiceActive(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('[SpeechRecognition] Start failed:', err);
      setVoiceError('Could not start microphone. Please check permissions.');
      stopVoiceRecording();
    }
  };

  const handleToggleVoice = () => {
    if (isVoiceActive) {
      const textToEval = (spokenTranscript + ' ' + interimTranscript).trim();
      stopVoiceRecording();
      if (textToEval.length > 0) {
        setSpokenTranscript(textToEval);
        evaluateSpokenResponse(textToEval);
      } else {
        setVoiceError('No speech was detected. Please try speaking clearly into your microphone.');
      }
    } else {
      startVoiceRecording();
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen || isCompleted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in math input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        if (e.key === 'Enter' && !isRevealed && isCurrentCardMath) {
          e.preventDefault();
          handleCheckMathAnswer();
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isVoiceActive) {
          handleToggleVoice();
        } else {
          setIsRevealed((prev) => !prev);
        }
      } else if (e.key.toLowerCase() === 'v' && !isRevealed) {
        e.preventDefault();
        handleToggleVoice();
      } else if (isRevealed) {
        if (e.key === '1') handleRate('disable');
        else if (e.key === '2') handleRate('relearn');
        else if (e.key === '3') handleRate('understood');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCompleted, isRevealed, isVoiceActive, isCurrentCardMath, spokenTranscript, interimTranscript, handleRate, mathInput]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* ================================================================= */}
        {/* TOP HEADER: ACTIVE RECALL DECK */}
        {/* ================================================================= */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              isCurrentCardMath
                ? 'bg-blue-500/10 dark:bg-blue-400/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
                : 'bg-purple-500/10 dark:bg-purple-400/10 border-purple-500/20 text-purple-600 dark:text-purple-400'
            }`}>
              {isCurrentCardMath ? <Calculator className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
            </div>

            <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border shrink-0 ${
                isCurrentCardMath
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                  : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
              }`}>
                {isCurrentCardMath ? '📐 Maths Active Recall Problem' : '🧠 Active Recall Deck'}
              </span>

              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {section.title}
              </h2>

              <span className="text-[11px] font-medium text-slate-400 hidden md:inline truncate">
                ({chapterName})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-extrabold px-2.5 py-1 rounded-xl border ${
              isCurrentCardMath
                ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800'
                : 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800'
            }`}>
              {currentIndex + 1} / {activeQueue.length} Cards
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

        {/* Progress track */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1">
          <div
            className={`h-1 transition-all duration-300 rounded-r-full ${isCurrentCardMath ? 'bg-blue-600' : 'bg-purple-600'}`}
            style={{
              width: `${activeQueue.length > 0 ? ((currentIndex + 1) / activeQueue.length) * 100 : 0}%`,
            }}
          />
        </div>

        {/* ================================================================= */}
        {/* MAIN BODY: ACTIVE CARD / MATH SOLVER OR SESSION SUMMARY */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col justify-center">
          {isCompleted ? (
            /* A. Completed Session Summary with Interactive D3 Confidence Distribution */
            <div className="max-w-2xl mx-auto py-2">
              <RecallSessionD3Distribution
                sessionReviews={
                  sessionReviews.length > 0
                    ? sessionReviews
                    : cards.map((c) => ({
                        id: c.id,
                        front: c.front,
                        back: c.back,
                        parentConcept: c.parentBullet,
                        rating: (c.lastRating || (c.status === 'mastered' ? 'understood' : 'good')) as any,
                      }))
                }
                totalCards={activeQueue.length}
                chapterTitle={chapterName}
                milestoneTitle={section.title}
                onStudyAgain={() => {
                  setIsCompleted(false);
                  setCurrentIndex(0);
                  setIsRevealed(false);
                  setSessionReviews([]);
                  setMathInput('');
                }}
                onClose={onClose}
                onOpenReference={(dim) => handleOpenReference(dim)}
              />
            </div>
          ) : currentCard ? (
            /* B. Active Card (Math Problem Solving or Declarative Flashcard) */
            <div className="max-w-2xl mx-auto w-full space-y-4">
              {/* RemNote Breadcrumb & Parent Bullet */}
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-slate-400 truncate">
                  {currentCard.breadcrumb}
                </div>
                <div className={`text-xs font-black flex items-center gap-1.5 ${
                  isCurrentCardMath ? 'text-blue-700 dark:text-blue-300' : 'text-purple-700 dark:text-purple-300'
                }`}>
                  {isCurrentCardMath ? <Compass className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                  <span>{currentCard.parentBullet}</span>
                </div>
              </div>

              {/* Main Card Surface */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-md space-y-5">
                {/* Prompt Question / Problem Statement */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {isCurrentCardMath ? '📐 Problem Statement to Solve' : 'Prompt Question'}
                    </span>
                    {isCurrentCardMath && currentCard.formulaUsed && (
                      <button
                        type="button"
                        onClick={() => setShowFormula((prev) => !prev)}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Calculator className="w-3 h-3" />
                        <span>{showFormula ? 'Hide Formula' : 'Show Formula'}</span>
                      </button>
                    )}
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                    {currentCard.front}
                  </h3>

                  {/* Formula preview if toggled */}
                  {showFormula && currentCard.formulaUsed && (
                    <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs font-mono font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2 animate-in fade-in-50">
                      <span className="text-[10px] font-sans uppercase font-black text-blue-600 dark:text-blue-400">Formula:</span>
                      <span>{currentCard.formulaUsed}</span>
                    </div>
                  )}

                  {/* Given Data Parameters (Math) */}
                  {isCurrentCardMath && Array.isArray(currentCard.givenData) && currentCard.givenData.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 mr-1">Given:</span>
                      {currentCard.givenData.map((param, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                        >
                          {param}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ========================================================= */}
                {/* MATH INTERACTIVE INPUT LAYER WITH REAL-TIME VERIFICATION */}
                {/* ========================================================= */}
                {isCurrentCardMath && !isRevealed && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Keyboard className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>Type Your Calculated Value:</span>
                        </label>
                        {currentCard.hint && (
                          <button
                            type="button"
                            onClick={() => setShowHint((prev) => !prev)}
                            className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Lightbulb className="w-3 h-3 text-amber-500" />
                            <span>{showHint ? 'Hide Hint' : 'Need a Hint?'}</span>
                          </button>
                        )}
                      </div>

                      {/* Math Input Field */}
                      <div className="relative">
                        <input
                          ref={mathInputRef}
                          type="text"
                          value={mathInput}
                          onChange={(e) => setMathInput(e.target.value)}
                          placeholder="e.g. 3/4, 1.5e-4, 9.8 m/s², or 3, 1/2"
                          className={`w-full px-4 py-3 text-sm sm:text-base font-mono font-bold rounded-2xl border transition outline-none shadow-inner bg-slate-50 dark:bg-slate-900 ${
                            mathValidation.isMatch
                              ? 'border-emerald-500 text-emerald-900 dark:text-emerald-100 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                              : mathValidation.signError
                              ? 'border-amber-500 text-amber-900 dark:text-amber-100 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
                              : mathValidation.unitError
                              ? 'border-indigo-500 text-indigo-900 dark:text-indigo-100 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20'
                              : mathValidation.isClose
                              ? 'border-sky-400 text-sky-900 dark:text-sky-100 bg-sky-50/40 dark:bg-sky-950/20 ring-2 ring-sky-400/20'
                              : mathInput.trim()
                              ? 'border-blue-400 dark:border-blue-600 text-slate-900 dark:text-white'
                              : 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-500'
                          }`}
                        />
                        {mathValidation.isMatch && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-5 h-5 animate-in zoom-in-50" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Math Toolbar */}
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      <span className="text-[10px] font-bold text-slate-400 mr-1">Insert:</span>
                      {['+', '-', '×', '÷', '±', '√', '²', '³', 'π', 'θ', '10^', '1/2', '1/4', 'm', 'km', 'cm', 'm/s', 'km/h', 'm/s²', 'kg', 'g', 's', 'min', 'h', 'J', 'kJ', 'W', 'kW', 'Pa', 'atm', 'V', 'A', 'Ω', 'x', 'y', '/', '='].map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => handleInsertSymbol(sym)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer hover:text-blue-600"
                        >
                          {sym}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleOpenReference(activeConversionLog?.dimension)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition cursor-pointer flex items-center gap-1"
                        title="Open Quick Conversion Reference Sheet"
                      >
                        <Scale className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span>Unit Sheet</span>
                      </button>
                    </div>

                    {/* Live Real-time Math Feedback Diagnostic Badge */}
                    {mathInput.trim() && (
                      <MathVerificationBadge validation={mathValidation} />
                    )}

                    {/* Progressive Hint Reveal */}
                    {showHint && currentCard.hint && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-100 space-y-1 animate-in zoom-in-95">
                        <span className="font-black uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          <Lightbulb className="w-3.5 h-3.5" /> Progressive Calculation Hint:
                        </span>
                        <p>{currentCard.hint}</p>
                      </div>
                    )}

                    {/* Action buttons for Math problem */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={handleCheckMathAnswer}
                        disabled={!mathInput.trim()}
                        className="py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] text-white font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-blue-600/25"
                      >
                        <CheckCircle2 className="w-4 h-4 text-blue-100" />
                        <span>Verify Calculation (Enter)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsRevealed(true)}
                        className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4 text-slate-500" />
                        <span>Reveal Derivation (Space)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* STANDARD REVEAL / VOICE CONTROLS (NON-MATH OR VOICE FLOW) */}
                {/* ========================================================= */}
                {!isRevealed && !isCurrentCardMath && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    {/* Live Voice Recording Box if active */}
                    {isVoiceActive && (
                      <div className="p-5 rounded-3xl bg-purple-50/90 dark:bg-purple-950/70 border-2 border-purple-400 dark:border-purple-600 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 h-5 px-1">
                              <span className="w-1 bg-purple-600 dark:bg-purple-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3"></span>
                              <span className="w-1 bg-purple-600 dark:bg-purple-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.15s] h-5"></span>
                              <span className="w-1 bg-purple-600 dark:bg-purple-400 rounded-full animate-[pulse_0.7s_ease-in-out_infinite_0.3s] h-4"></span>
                              <span className="w-1 bg-purple-600 dark:bg-purple-400 rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.45s] h-6"></span>
                              <span className="w-1 bg-purple-600 dark:bg-purple-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite_0.2s] h-3"></span>
                            </div>

                            <div>
                              <span className="text-xs font-black text-purple-950 dark:text-purple-100 flex items-center gap-1.5">
                                <span>Listening to your spoken explanation...</span>
                              </span>
                              <span className="text-[10px] text-purple-700 dark:text-purple-300 font-medium">
                                Explain the core relationship in your own words
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-black bg-purple-200/80 dark:bg-purple-900/80 text-purple-900 dark:text-purple-100 border border-purple-300 dark:border-purple-700">
                              {recordingSeconds}s
                            </span>
                          </div>
                        </div>

                        {/* Live Transcript Streaming Box */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-purple-200 dark:border-purple-800/80 min-h-[60px] text-xs text-slate-800 dark:text-slate-100 leading-relaxed shadow-inner">
                          {spokenTranscript || interimTranscript ? (
                            <p>
                              <span>{spokenTranscript} </span>
                              {interimTranscript && (
                                <span className="text-purple-600 dark:text-purple-300 italic opacity-80 animate-pulse">
                                  {interimTranscript}
                                </span>
                              )}
                            </p>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 italic">
                              <Mic className="w-4 h-4 animate-bounce text-purple-500" />
                              <span>Start speaking now... your speech is transcribed in real-time</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleToggleVoice}
                            disabled={isEvaluatingVoice}
                            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-md hover:shadow-purple-600/30"
                          >
                            {isEvaluatingVoice ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                <span>Evaluating Answer with AI...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 text-purple-200" />
                                <span>Done Speaking & Check Accuracy with AI</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={stopVoiceRecording}
                            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {voiceError && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                        <div className="space-y-1">
                          <p>{voiceError}</p>
                          <p className="text-[11px] text-rose-600 dark:text-rose-300">
                            Tip: You can also click "Reveal Answer" or type in your response.
                          </p>
                        </div>
                      </div>
                    )}

                    {!isVoiceActive && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={handleToggleVoice}
                          className="py-4 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2.5 shadow-md hover:shadow-purple-600/25 group"
                        >
                          <Mic className="w-4 h-4 text-purple-200 group-hover:scale-110 transition-transform" />
                          <span>Speak Your Answer (V)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsRevealed(true)}
                          className="py-4 px-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 group shadow-2xs active:scale-[0.99]"
                        >
                          <Eye className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
                          <span>Reveal Answer (Space)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ========================================================= */}
                {/* REVEALED DERIVATION & SOLUTION BREAKDOWN */}
                {/* ========================================================= */}
                {isRevealed && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in-50 duration-200">
                    {/* Math Verification Banner if student typed an answer */}
                    {isCurrentCardMath && mathInput.trim() && (
                      <div className={`p-4 rounded-2xl border ${
                        mathValidation.isMatch
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-700'
                          : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700'
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {mathValidation.isMatch ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-amber-600" />
                            )}
                            <div>
                              <span className="text-xs font-black block text-slate-900 dark:text-white">
                                {mathValidation.isMatch ? 'Calculated Answer Verified ✓' : 'Comparison with Expert Solution:'}
                              </span>
                              <span className="text-[11px] text-slate-600 dark:text-slate-300">
                                Your input: <strong className="font-mono">{mathInput}</strong> • Expected: <strong className="font-mono">{currentCard.expectedAnswer || currentCard.back}</strong>
                              </span>
                            </div>
                          </div>
                          <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                            mathValidation.isMatch ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                          }`}>
                            {mathValidation.isMatch ? '100% Match' : 'Review Steps'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Unit Conversion Log Card if conversion was applied */}
                    {activeConversionLog && (
                      <UnitConversionLogCard
                        logEntry={activeConversionLog}
                        onOpenReference={handleOpenReference}
                      />
                    )}

                    {/* Step-by-Step Mathematical Derivation List */}
                    {isCurrentCardMath && Array.isArray(currentCard.stepByStepDerivation) && currentCard.stepByStepDerivation.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                          <Calculator className="w-3.5 h-3.5" /> Step-by-Step Calculation Derivation
                        </span>
                        <div className="space-y-2">
                          {currentCard.stepByStepDerivation.map((step, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3 text-xs"
                            >
                              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                                {step.stepNumber || sIdx + 1}
                              </div>
                              <div className="space-y-1 flex-1">
                                <div className="font-bold text-slate-800 dark:text-slate-200">
                                  {step.stepAction}
                                </div>
                                <div className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/60 text-xs">
                                  {step.expression}
                                </div>
                                {step.reasonWhy && (
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                    💡 {step.reasonWhy}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Voice Feedback Card (if voice was evaluated) */}
                    {voiceEvaluation && (
                      <div className="p-5 rounded-3xl bg-purple-50/90 dark:bg-purple-950/60 border-2 border-purple-300/80 dark:border-purple-700/80 space-y-4 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-purple-200/80 dark:border-purple-800/80">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-black text-purple-950 dark:text-purple-100 block">
                                AI Voice Accuracy Evaluation
                              </span>
                              <span className="text-[10px] text-purple-700 dark:text-purple-300">
                                Powered by Gemini Active Recall Assessment
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-black border shadow-2xs flex items-center gap-1.5 ${
                                voiceEvaluation.accuracyScore >= 85
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                  : voiceEvaluation.accuracyScore >= 65
                                  ? 'bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-700'
                                  : voiceEvaluation.accuracyScore >= 45
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                              }`}
                            >
                              <span>{voiceEvaluation.accuracyScore}% Accuracy</span>
                              <span>•</span>
                              <span>{voiceEvaluation.verdictLabel}</span>
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-slate-900/90 p-3.5 rounded-2xl border border-purple-100 dark:border-purple-900/40 space-y-1">
                          <span className="font-black text-slate-500 dark:text-slate-400 block text-[10px] uppercase tracking-wider">
                            Your Spoken Explanation:
                          </span>
                          <p className="italic font-medium text-slate-900 dark:text-slate-100">
                            "{voiceEvaluation.spokenTranscript}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Final Answer Badge */}
                    <div className="space-y-1.5">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                        isCurrentCardMath ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {isCurrentCardMath ? 'Target Calculated Result' : 'Synthesized Target Answer'}
                      </span>
                      <div className={`text-sm sm:text-base font-medium leading-relaxed p-4 rounded-2xl border ${
                        isCurrentCardMath
                          ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/40 font-mono font-bold text-blue-900 dark:text-blue-100'
                          : 'text-slate-800 dark:text-slate-200 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40'
                      }`}>
                        {currentCard.back}
                      </div>
                    </div>

                    {/* Deep Explanation Accordion */}
                    {currentCard.explanation && (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setIsExplanationOpen((prev) => !prev)}
                          className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-purple-600 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                          <span>{isExplanationOpen ? 'Hide Deep Explanation' : 'View Deep Explanation & Nuance'}</span>
                          <ChevronRight
                            className={`w-3.5 h-3.5 transition-transform ${isExplanationOpen ? 'rotate-90' : ''}`}
                          />
                        </button>

                        {isExplanationOpen && (
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                            {currentCard.explanation}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Source Anchor Quote */}
                    {currentCard.sourceExcerpt && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span className="font-semibold text-slate-500">Source Anchor:</span>
                        <span className="italic truncate">{currentCard.sourceExcerpt}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 space-y-4 my-auto">
              <Brain className="w-12 h-12 text-purple-400 mx-auto" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                No active cards in this deck
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {cards.length > 0
                  ? 'All cards in this deck have been muted or completed.'
                  : 'No recall cards found for this milestone.'}
              </p>
              {cards.some((c) => c.status === 'disabled') && (
                <button
                  type="button"
                  onClick={() => {
                    const reactivated = cards.map((c) => ({ ...c, status: 'active' as const }));
                    setCards(reactivated);
                    setCurrentIndex(0);
                    setIsRevealed(false);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Re-enable All Muted Cards
                </button>
              )}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* FOOTER: 3-TIER RATING BUTTONS (DISABLE, RELEARN, UNDERSTOOD) */}
        {/* ================================================================= */}
        {!isCompleted && currentCard && isRevealed && (
          <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 shrink-0 animate-in slide-in-from-bottom-2 duration-150">
            <div className="max-w-2xl mx-auto space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Evaluate your recall quality:</span>
                <span className="hidden sm:inline">Shortcuts: [1] Disable • [2] Relearn • [3] Understood</span>
              </div>

              {/* 3-Tier Action Bar */}
              <div className="grid grid-cols-3 gap-3">
                {/* 1. Disable */}
                <button
                  type="button"
                  onClick={() => handleRate('disable')}
                  className="px-3 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs transition cursor-pointer flex flex-col items-center justify-center gap-1 shadow-2xs group"
                  title="Suspend or mute this card from the spaced repetition queue [Shortcut: 1]"
                >
                  <div className="flex items-center gap-1.5">
                    <EyeOff className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                    <span>Disable</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-400">Mute from queue</span>
                </button>

                {/* 2. Relearn */}
                <button
                  type="button"
                  onClick={() => handleRate('relearn')}
                  className="px-3 py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold text-xs transition cursor-pointer flex flex-col items-center justify-center gap-1 shadow-2xs"
                  title="Reset interval to 1 day and schedule immediate practice [Shortcut: 2]"
                >
                  <div className="flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-amber-600" />
                    <span>Relearn</span>
                  </div>
                  <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">
                    Interval reset (1d)
                  </span>
                </button>

                {/* 3. Understood */}
                <button
                  type="button"
                  onClick={() => handleRate('understood')}
                  className={`px-3 py-3 rounded-2xl border text-white font-black text-xs transition cursor-pointer flex flex-col items-center justify-center gap-1 shadow-md ${
                    isCurrentCardMath
                      ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 hover:shadow-blue-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600 hover:shadow-emerald-600/20'
                  }`}
                  title="Boost SM-2 spaced repetition interval [Shortcut: 3]"
                >
                  <div className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-white" />
                    <span>Understood</span>
                  </div>
                  <span className="text-[10px] font-normal text-white/80">
                    +3d interval boost
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Unit Conversion Reference Sheet Drawer */}
      <UnitConversionReferenceDrawer
        isOpen={isReferenceDrawerOpen}
        onClose={() => setIsReferenceDrawerOpen(false)}
        selectedDimension={selectedReferenceDimension}
        onInsertSymbol={handleInsertSymbol}
      />
    </div>
  );
};

export default MilestoneRecallDeckRunner;
