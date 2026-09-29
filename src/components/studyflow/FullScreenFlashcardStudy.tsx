import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  X,
  RotateCw,
  Sparkles,
  CheckCircle2,
  Trash2,
  Brain,
  Layers,
  AlertCircle,
  HelpCircle,
  BookOpen,
  ArrowRight,
  MessageSquare,
  Send,
  Zap,
  Check,
  RotateCcw,
  Plus,
  Eye,
  Edit3,
  Lightbulb,
  ChevronRight,
  VolumeX,
  Loader2,
  RefreshCw,
  Mic,
  MicOff,
  Calculator,
  Compass,
  Keyboard,
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

export interface ActiveRecallCard {
  id: string;
  breadcrumb?: string;
  parentConcept?: string;
  promptQuestion?: string;
  answer?: string;
  inlineAnswer?: string;
  cardType?: 'single' | 'list' | 'math_problem';
  listItems?: string[];
  explanation?: string;
  sourceQuote?: string;
  topicTag?: string;
  sectionId?: string;
  front: string;
  back: string;
  sourceExcerpt?: string;
  // Math & Quantitative Problem Solving Fields
  problemStatement?: string;
  expectedAnswer?: string;
  acceptableAnswers?: string[];
  formulaUsed?: string;
  givenData?: string[];
  hint?: string;
  stepByStepDerivation?: DerivationStepItem[];
  // Aliases for compatibility
  frontPrompt?: string;
  backAnswer?: string;
  sourceContext?: string;
  // SM-2 parameters
  interval?: number;
  repetition?: number;
  easinessFactor?: number;
  status?: 'active' | 'disabled' | 'due_today' | 'mastered' | 'learning';
  reviewStatus?: 'due_today' | 'mastered' | 'learning';
  isDueToday?: boolean;
  dueDate?: string;
  lastReviewed?: string;
  createdAt?: string;
}

export interface FullScreenFlashcardStudyProps {
  section?: Section;
  activeMilestone?: Section;
  chapterName?: string;
  activeChapter?: { id?: string; title?: string; name?: string; rawText?: string; documentText?: string };
  chapterRawText?: string;
  subjectName?: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCards?: (sectionId: string, updatedCards: any[]) => void;
  initialMode?: 'practice' | 'edit';
}

function isMathSubjectOrTopic(subjectName?: string, chapterTitle: string = '', milestoneTitle: string = ''): boolean {
  const combined = `${subjectName || ''} ${chapterTitle} ${milestoneTitle}`.toLowerCase();
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

export const FullScreenFlashcardStudy: React.FC<FullScreenFlashcardStudyProps> = ({
  section,
  activeMilestone,
  chapterName = 'Chapter',
  activeChapter,
  chapterRawText,
  subjectName = 'Science',
  isOpen,
  onClose,
  onUpdateCards,
  initialMode = 'practice',
}) => {
  const milestone = activeMilestone || section;
  const chapterTitle = activeChapter?.title || activeChapter?.name || chapterName || 'Chapter';
  const isHindi = isHindiSubject(
    subjectName,
    chapterTitle,
    activeChapter?.rawText || chapterRawText || activeMilestone?.title || section?.title
  );
  const isMath = isMathSubjectOrTopic(subjectName, chapterTitle, milestone?.title || '');
  const resolvedSubject = isHindi ? 'Hindi' : isMath ? 'Mathematics' : (subjectName && subjectName !== 'Science' ? subjectName : 'General');

  const [activeTab, setActiveTab] = useState<'practice' | 'edit'>(initialMode);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showAITutor, setShowAITutor] = useState(false);
  const [aiTutorMessages, setAiTutorMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([]);
  const [userQuery, setUserQuery] = useState('');
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionReviews, setSessionReviews] = useState<CardSessionReviewItem[]>([]);
  const [studyStats, setStudyStats] = useState({
    total: 0,
    understood: 0,
    relearned: 0,
  });

  // Dynamic card state
  const [cards, setCards] = useState<ActiveRecallCard[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Math interactive answer state
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

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

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

  useEffect(() => {
    return () => {
      stopVoiceRecording();
    };
  }, [stopVoiceRecording]);

  // Editor states
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newExplanation, setNewExplanation] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);

  // Helper to resolve document text excerpt for milestone
  const resolveTextExcerpt = useCallback((): string => {
    let summaryText = '';
    if (milestone?.summary) {
      if (typeof milestone.summary === 'string') summaryText = milestone.summary;
      else if (typeof milestone.summary === 'object') {
        summaryText = `${(milestone.summary as any).detailed || ''} ${(milestone.summary as any).compact || ''}`;
      }
    }
    if (!summaryText || summaryText.length < 80) {
      const fullDoc = activeChapter?.rawText || activeChapter?.documentText || chapterRawText || '';
      if (fullDoc && fullDoc.length > 80) {
        summaryText = fullDoc.slice(0, 4000);
      } else {
        summaryText = `${chapterTitle}: ${milestone?.title || 'Milestone'}. Principles, equations, derivations, and calculations.`;
      }
    }
    return summaryText.trim();
  }, [milestone, activeChapter, chapterRawText, chapterTitle]);

  // Normalize raw card array from any legacy or recallDeck format
  const normalizeCards = useCallback(
    (rawList: any[]): ActiveRecallCard[] => {
      return rawList.map((item, idx) => {
        const parentConcept = item.parentConcept || item.topicTag || milestone?.title || 'Core Principle';
        const isCardMath = isMath || item.cardType === 'math_problem' || Boolean(item.expectedAnswer);
        const frontText =
          item.promptQuestion || item.problemStatement || item.front || item.frontPrompt || item.question || `Core Principle ${idx + 1}`;
        const backText =
          item.answer || item.expectedAnswer || item.back || item.backAnswer || item.modelAnswer || 'Underlying principle.';
        const explanationText = item.explanation || item.notes || '';
        const sourceText =
          item.sourceQuote || item.sourceExcerpt || item.sourceContext || item.citation || `${milestone?.title || 'Milestone'} Notes`;
        const cardType: 'single' | 'list' | 'math_problem' =
          item.cardType === 'math_problem' || isCardMath ? 'math_problem' : item.cardType === 'list' ? 'list' : 'single';
        const listItems = Array.isArray(item.listItems) ? item.listItems : [];
        const expectedAnswer = item.expectedAnswer || item.inlineAnswer || backText;
        const acceptableAnswers = Array.isArray(item.acceptableAnswers) && item.acceptableAnswers.length > 0
          ? item.acceptableAnswers
          : [expectedAnswer];
        const givenData = Array.isArray(item.givenData) ? item.givenData : [];
        const formulaUsed = typeof item.formulaUsed === 'string' ? item.formulaUsed : '';
        const hint = typeof item.hint === 'string' ? item.hint : '';
        const stepByStepDerivation = Array.isArray(item.stepByStepDerivation) ? item.stepByStepDerivation : [];

        return {
          id: item.id || `recall-${milestone?.id || 'card'}-${idx + 1}`,
          parentConcept,
          promptQuestion: frontText,
          problemStatement: item.problemStatement || frontText,
          answer: backText,
          inlineAnswer: expectedAnswer,
          expectedAnswer,
          acceptableAnswers,
          formulaUsed,
          givenData,
          hint,
          stepByStepDerivation,
          cardType,
          listItems,
          explanation: explanationText,
          sourceQuote: sourceText,
          topicTag: parentConcept,
          sectionId: milestone?.id,
          front: frontText,
          back: backText,
          sourceExcerpt: sourceText,
          frontPrompt: frontText,
          backAnswer: backText,
          sourceContext: sourceText,
          interval: typeof item.interval === 'number' ? item.interval : 1,
          repetition: typeof item.repetition === 'number' ? item.repetition : 0,
          easinessFactor: typeof item.easinessFactor === 'number' ? item.easinessFactor : 2.5,
          status: item.status === 'disabled' ? 'disabled' : 'active',
          dueDate: item.dueDate,
          lastReviewed: item.lastReviewed,
          createdAt: item.createdAt,
        };
      });
    },
    [milestone?.id, milestone?.title, isMath]
  );

  // Load cards dynamically on open / milestone change
  useEffect(() => {
    if (!isOpen || !milestone) return;

    setCurrentIndex(0);
    setIsRevealed(false);
    setShowAITutor(false);
    setSessionCompleted(false);
    setStudyStats({ total: 0, understood: 0, relearned: 0 });
    setLoadError(null);
    setMathInput('');
    setShowHint(false);
    setShowFormula(false);

    let existingList: any[] | null = null;
    if (Array.isArray(milestone.recallDeck) && milestone.recallDeck.length > 0) {
      existingList = milestone.recallDeck;
    } else if (Array.isArray((milestone as any).recallCards) && (milestone as any).recallCards.length > 0) {
      existingList = (milestone as any).recallCards;
    } else if (Array.isArray(milestone.flashcards) && milestone.flashcards.length > 0) {
      existingList = milestone.flashcards;
    } else {
      try {
        const cached1 = localStorage.getItem(`milestone_recall_deck_${milestone.id}`);
        if (cached1) {
          const parsed = JSON.parse(cached1);
          if (Array.isArray(parsed) && parsed.length > 0) {
            existingList = parsed;
          }
        }
        if (!existingList) {
          const cached2 = localStorage.getItem(`recall_deck_${milestone.id}`);
          if (cached2) {
            const parsed = JSON.parse(cached2);
            if (Array.isArray(parsed) && parsed.length > 0) {
              existingList = parsed;
            }
          }
        }
      } catch {}
    }

    if (existingList && existingList.length > 0) {
      setCards(normalizeCards(existingList));
      setIsLoadingCards(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingCards(true);

    const topics =
      (Array.isArray((milestone as any).coreTopics) && (milestone as any).coreTopics.length > 0 && (milestone as any).coreTopics) ||
      (Array.isArray(milestone.keyTopics) && milestone.keyTopics.length > 0 && milestone.keyTopics) ||
      [milestone.title || 'Core Principles'];

    const excerpt = resolveTextExcerpt();

    fetch('/api/recall-deck/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: milestone.id,
        milestoneId: milestone.id,
        title: milestone.title,
        milestoneTitle: milestone.title,
        topics,
        topicTags: topics,
        coreTopics: topics,
        textExcerpt: excerpt,
        sectionTextExcerpt: excerpt,
        chapterTitle,
        chapterName: chapterTitle,
        subjectName: resolvedSubject,
        subject: resolvedSubject,
        cardCount: 5,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (isCancelled) return;
        const generatedList = Array.isArray(data.cards) ? data.cards : Array.isArray(data.recallDeck) ? data.recallDeck : [];
        if (generatedList.length > 0) {
          milestone.recallDeck = generatedList;
          try {
            localStorage.setItem(`milestone_recall_deck_${milestone.id}`, JSON.stringify(generatedList));
            localStorage.setItem(`recall_deck_${milestone.id}`, JSON.stringify(generatedList));
          } catch {}
          onUpdateCards?.(milestone.id, generatedList);
          setCards(normalizeCards(generatedList));
        } else {
          // Dynamic fallback
          const fallback = topics.slice(0, 4).map((topic: string, i: number) => ({
            id: `recall-${milestone.id}-${i + 1}`,
            front: isMath ? `Solve the calculation problem for ${topic} in ${milestone.title}` : `What core principle defines ${topic}?`,
            back: isMath ? `Calculated result for ${topic}` : `In ${milestone.title}, ${topic} establishes foundational conceptual axioms.`,
            expectedAnswer: isMath ? 'Calculated value' : undefined,
            cardType: isMath ? 'math_problem' : 'single',
            explanation: `Understanding ${topic} is critical to securing full examination marks.`,
            sourceExcerpt: excerpt.slice(0, 140) || `${milestone.title} Notes`,
          }));
          milestone.recallDeck = fallback;
          setCards(normalizeCards(fallback));
        }
        setIsLoadingCards(false);
      })
      .catch((err) => {
        if (isCancelled) return;
        console.warn('[FullScreenFlashcardStudy] Generation failed, creating topic-aligned deck:', err);
        const fallback = topics.slice(0, 4).map((topic: string, i: number) => ({
          id: `recall-${milestone.id}-${i + 1}`,
          front: isMath ? `Solve the calculation problem for ${topic}` : `What core principle defines ${topic}?`,
          back: isMath ? `Calculated value for ${topic}` : `In ${milestone.title}, ${topic} establishes key invariants.`,
          expectedAnswer: isMath ? 'Calculated value' : undefined,
          cardType: isMath ? 'math_problem' : 'single',
          explanation: `Direct textbook application for ${topic}.`,
          sourceExcerpt: excerpt.slice(0, 140) || `${milestone.title} Reference`,
        }));
        milestone.recallDeck = fallback;
        setCards(normalizeCards(fallback));
        setIsLoadingCards(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, milestone, resolveTextExcerpt, normalizeCards, chapterTitle, resolvedSubject, onUpdateCards, isMath]);

  // Re-sync with Notes action
  const handleRegenerateDeck = () => {
    if (!milestone) return;
    setIsRegenerating(true);
    const topics =
      (Array.isArray((milestone as any).coreTopics) && (milestone as any).coreTopics.length > 0 && (milestone as any).coreTopics) ||
      (Array.isArray(milestone.keyTopics) && milestone.keyTopics.length > 0 && milestone.keyTopics) ||
      [milestone.title || 'Core Principles'];
    const excerpt = resolveTextExcerpt();

    fetch('/api/recall-deck/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        milestoneTitle: milestone.title,
        chapterTitle,
        sectionTextExcerpt: excerpt,
        topicTags: topics,
        subjectName: resolvedSubject,
        cardCount: 6,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const generatedList = Array.isArray(data.cards) ? data.cards : Array.isArray(data.recallDeck) ? data.recallDeck : [];
        if (generatedList.length > 0) {
          milestone.recallDeck = generatedList;
          try {
            localStorage.setItem(`milestone_recall_deck_${milestone.id}`, JSON.stringify(generatedList));
            localStorage.setItem(`recall_deck_${milestone.id}`, JSON.stringify(generatedList));
          } catch {}
          onUpdateCards?.(milestone.id, generatedList);
          setCards(normalizeCards(generatedList));
          setCurrentIndex(0);
          setIsRevealed(false);
          setSessionCompleted(false);
          setSessionReviews([]);
        }
      })
      .catch((err) => {
        console.warn('[FullScreenFlashcardStudy] Re-sync error:', err);
      })
      .finally(() => {
        setIsRegenerating(false);
      });
  };

  const activeCards = useMemo(() => {
    return cards.filter((c) => c.status !== 'disabled');
  }, [cards]);

  const currentCard = activeCards[currentIndex] || activeCards[0];
  const isCurrentCardMath = Boolean(
    currentCard?.cardType === 'math_problem' ||
    (Array.isArray(currentCard?.stepByStepDerivation) && currentCard.stepByStepDerivation.length > 0) ||
    (isMath && (
      (Array.isArray(currentCard?.givenData) && currentCard.givenData.length > 0) ||
      Boolean(currentCard?.formulaUsed) ||
      /(?:calculate|compute|solve for|find both roots|find the value of)\b/i.test(currentCard?.front || currentCard?.promptQuestion || '')
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

  const handleEvaluate = useCallback(
    (rating: 'understood' | 'relearn') => {
      if (!currentCard || !milestone) return;

      const isUnderstood = rating === 'understood';
      setStudyStats((prev) => ({
        total: prev.total + 1,
        understood: prev.understood + (isUnderstood ? 1 : 0),
        relearned: prev.relearned + (isUnderstood ? 0 : 1),
      }));

      const updated = cards.map((c) => {
        if (c.id === currentCard.id) {
          if (!isUnderstood) {
            return {
              ...c,
              interval: 1,
              repetition: 0,
              easinessFactor: Math.max(1.3, (c.easinessFactor || 2.5) - 0.2),
              status: 'learning' as const,
              dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            };
          }
          let nextRep = (c.repetition || 0) + 1;
          let nextInterval = 1;
          if (nextRep === 1) nextInterval = 1;
          else if (nextRep === 2) nextInterval = 3;
          else nextInterval = Math.min(60, Math.round((c.interval || 1) * (c.easinessFactor || 2.5)));

          return {
            ...c,
            interval: nextInterval,
            repetition: nextRep,
            easinessFactor: Math.min(2.8, (c.easinessFactor || 2.5) + 0.1),
            status: nextInterval >= 3 ? ('mastered' as const) : ('learning' as const),
            dueDate: new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000).toISOString(),
          };
        }
        return c;
      });

      setSessionReviews((prev) => [
        ...prev.filter((r) => r.id !== currentCard.id),
        {
          id: currentCard.id,
          front: currentCard.front || currentCard.promptQuestion || '',
          back: currentCard.back || currentCard.answer || '',
          parentConcept: currentCard.parentConcept || milestone.title,
          rating,
          voiceAccuracy: isCurrentCardMath && mathValidation.isMatch ? 100 : voiceEvaluation?.accuracyScore,
          spokenTranscript: mathInput ? `[Math Input]: ${mathInput}` : voiceEvaluation?.spokenTranscript || (spokenTranscript ? spokenTranscript : undefined),
          unitConversionLog: activeConversionLog,
        },
      ]);

      setCards(updated);
      milestone.recallDeck = updated;
      try {
        localStorage.setItem(`milestone_recall_deck_${milestone.id}`, JSON.stringify(updated));
        localStorage.setItem(`recall_deck_${milestone.id}`, JSON.stringify(updated));
      } catch {}
      onUpdateCards?.(milestone.id, updated);

      if (isUnderstood || (isCurrentCardMath && mathValidation.isMatch)) {
        confetti({
          particleCount: 25,
          spread: 40,
          origin: { y: 0.8 },
        });
      }

      setIsRevealed(false);
      setShowAITutor(false);
      setVoiceEvaluation(null);
      setSpokenTranscript('');
      setInterimTranscript('');
      setMathInput('');
      setShowHint(false);
      setShowFormula(false);

      if (currentIndex < activeCards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setSessionCompleted(true);
      }
    },
    [currentCard, cards, milestone, onUpdateCards, currentIndex, activeCards.length, voiceEvaluation, spokenTranscript, isCurrentCardMath, mathValidation, mathInput, activeConversionLog]
  );

  const handleDisableCard = () => {
    if (!currentCard || !milestone) return;
    const updated = cards.map((c) =>
      c.id === currentCard.id ? { ...c, status: 'disabled' as const } : c
    );
    setCards(updated);
    milestone.recallDeck = updated;
    try {
      localStorage.setItem(`recall_deck_${milestone.id}`, JSON.stringify(updated));
    } catch {}
    onUpdateCards?.(milestone.id, updated);

    setIsRevealed(false);
    setShowAITutor(false);
    setVoiceEvaluation(null);
    setSpokenTranscript('');
    setInterimTranscript('');
    setMathInput('');

    if (currentIndex < activeCards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setSessionCompleted(true);
    }
  };

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
          front: currentCard.front || currentCard.promptQuestion,
          back: currentCard.back || currentCard.answer,
          notes: currentCard.explanation || '',
          explanation: currentCard.explanation || '',
          subject: resolvedSubject,
          chapter: chapterTitle,
          spokenTranscript: transcriptText.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const evalData = await response.json();
      setVoiceEvaluation(evalData);
      setIsRevealed(true);

      if (evalData.accuracyScore >= 80) {
        confetti({
          particleCount: 30,
          spread: 45,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      console.warn('[FullScreenFlashcardStudy] Voice evaluation failed:', err);
      setVoiceError('Could not connect to AI evaluator. Review the target answer directly.');
      setIsRevealed(true);
    } finally {
      setIsEvaluatingVoice(false);
    }
  };

  const startVoiceRecording = () => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setVoiceError('Speech recognition is not supported in this browser. Please type or click reveal.');
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
          setVoiceError('Microphone permission was denied. Please allow microphone access.');
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
      console.warn('[SpeechRecognition] Start error:', err);
      setVoiceError('Could not start microphone.');
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
        setVoiceError('No speech detected. Please speak clearly into your microphone.');
      }
    } else {
      startVoiceRecording();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || sessionCompleted || activeTab !== 'practice') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        if (e.key === 'Enter' && !isRevealed && isCurrentCardMath) {
          e.preventDefault();
          if (mathInput.trim()) {
            if (mathValidation.isMatch) {
              confetti({ particleCount: 35, spread: 45, origin: { y: 0.6 } });
            }
            setIsRevealed(true);
          }
        }
        return;
      }

      if (e.key.toLowerCase() === 'v' && !isRevealed) {
        e.preventDefault();
        handleToggleVoice();
        return;
      }

      if ((e.code === 'Space' || e.key === 'Enter') && !isRevealed) {
        e.preventDefault();
        if (isVoiceActive) {
          handleToggleVoice();
        } else {
          setIsRevealed(true);
        }
        return;
      }

      if (isRevealed && (e.key === '1' || e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        handleEvaluate('relearn');
        return;
      }

      if (isRevealed && (e.key === '2' || e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        handleEvaluate('understood');
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, sessionCompleted, activeTab, isRevealed, isVoiceActive, isCurrentCardMath, mathInput, mathValidation, spokenTranscript, interimTranscript, handleEvaluate, onClose]);

  const handleSendAITutor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || !currentCard || !milestone) return;

    const query = userQuery.trim();
    setUserQuery('');

    const targetAnswer = currentCard.back || currentCard.backAnswer || '';
    const explanationText = currentCard.explanation || currentCard.sourceExcerpt || 'Foundational syllabus principle';

    setAiTutorMessages((prev) => [
      ...prev,
      { sender: 'user', text: query },
      {
        sender: 'ai',
        text:
          `Here is an analytical breakdown of "${targetAnswer}" in **${milestone.title}**:\n\n` +
          `• **Core Mechanism**: ${explanationText}\n` +
          `• **Exam Application**: Examiners evaluate this principle to verify whether you understand the structural cause.\n` +
          `• **Retrieval Hook**: Link this directly to "${currentCard.front || currentCard.frontPrompt}".`,
      },
    ]);
  };

  const handleOpenAITutor = () => {
    if (!showAITutor && currentCard && milestone) {
      setAiTutorMessages([
        {
          sender: 'ai',
          text: `Hi! I'm your AI Study Assistant for **${milestone.title}**. Ask me to explain the derivation, provide a memory hook, or clarify exam strategies for: "${currentCard.back || currentCard.backAnswer}".`,
        },
      ]);
    }
    setShowAITutor((prev) => !prev);
  };

  const handleAddCustomCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim() || !milestone) return;

    const newCardItem: ActiveRecallCard = {
      id: `recall-custom-${Date.now()}`,
      sectionId: milestone.id,
      front: newFront.trim(),
      back: newBack.trim(),
      explanation: newExplanation.trim() || 'Custom card added by student.',
      sourceExcerpt: newSource.trim() || `${milestone.title} Custom Notes`,
      frontPrompt: newFront.trim(),
      backAnswer: newBack.trim(),
      sourceContext: newSource.trim() || `${milestone.title} Custom Notes`,
      interval: 1,
      repetition: 0,
      easinessFactor: 2.5,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const updated = [...cards, newCardItem];
    setCards(updated);
    milestone.recallDeck = updated;
    try {
      localStorage.setItem(`recall_deck_${milestone.id}`, JSON.stringify(updated));
    } catch {}
    onUpdateCards?.(milestone.id, updated);
    setNewFront('');
    setNewBack('');
    setNewSource('');
    setNewExplanation('');
    setIsAddingCard(false);
  };

  if (!isOpen || !milestone) return null;

  const totalCards = activeCards.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col text-slate-100 overflow-hidden select-none animate-in fade-in duration-200">
      {/* 1. HEADER BAR */}
      <header className="h-16 px-4 sm:px-8 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer flex items-center gap-2 group"
            title="Return to Roadmap (Esc)"
          >
            <X className="w-5 h-5 text-slate-400 group-hover:text-white transition" />
            <span className="text-xs font-bold hidden sm:inline text-slate-300 group-hover:text-white">
              Roadmap
            </span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-slate-400 truncate max-w-[120px] sm:max-w-[180px]">
              {chapterTitle}
            </span>
            <span className="text-slate-600 text-xs">/</span>
            <span className="text-xs font-black text-white truncate max-w-[140px] sm:max-w-[260px]">
              {milestone.title}
            </span>
          </div>

          {!isLoadingCards && totalCards > 0 && (
            <div className="hidden md:flex items-center gap-2 min-w-0">
              <span className={`px-3 py-1 rounded-full text-xs font-black border shadow-2xs flex items-center gap-1.5 shrink-0 ${
                isCurrentCardMath
                  ? 'bg-blue-950/90 text-blue-300 border-blue-700/80'
                  : 'bg-indigo-950/90 text-indigo-300 border-indigo-700/80'
              }`}>
                {isCurrentCardMath ? <Calculator className="w-3.5 h-3.5 text-blue-400" /> : <Layers className="w-3.5 h-3.5 text-indigo-400" />}
                <span>Card {currentIndex + 1} of {activeCards.length}</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={handleRegenerateDeck}
            disabled={isRegenerating || isLoadingCards}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            title="Re-sync Cards"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-purple-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Re-sync with Notes</span>
          </button>

          <div className="flex items-center p-1 rounded-xl bg-slate-800/80 border border-slate-700/70 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('practice')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'practice'
                  ? 'bg-indigo-600 text-white shadow-2xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Recall Deck</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'edit'
                  ? 'bg-indigo-600 text-white shadow-2xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Manage Deck</span>
            </button>
          </div>
        </div>
      </header>

      {/* Progress Track */}
      {activeTab === 'practice' && totalCards > 0 && (
        <div className="h-1 bg-slate-950 w-full overflow-hidden shrink-0">
          <div
            className={`h-full transition-all duration-300 ${isCurrentCardMath ? 'bg-blue-500' : 'bg-indigo-500'}`}
            style={{ width: `${totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0}%` }}
          />
        </div>
      )}

      {/* MAIN CONTENT CANVAS */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-center text-center">
        {isLoadingCards ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">Synthesizing Active Recall Problems...</p>
              <p className="text-xs text-slate-400">Grounding cards strictly in {milestone.title}</p>
            </div>
          </div>
        ) : sessionCompleted ? (
          <div className="max-w-2xl w-full py-2">
            <RecallSessionD3Distribution
              sessionReviews={
                sessionReviews.length > 0
                  ? sessionReviews
                  : cards.map((c) => ({
                      id: c.id,
                      front: c.promptQuestion || c.front || c.frontPrompt || '',
                      back: c.answer || c.back || c.backAnswer || '',
                      parentConcept: c.parentConcept,
                      rating: (c.status === 'mastered' ? 'understood' : 'relearn') as any,
                    }))
              }
              totalCards={activeCards.length}
              chapterTitle={chapterTitle}
              milestoneTitle={milestone.title}
              onStudyAgain={() => {
                setCurrentIndex(0);
                setIsRevealed(false);
                setSessionCompleted(false);
                setSessionReviews([]);
                setStudyStats({ total: 0, understood: 0, relearned: 0 });
                setMathInput('');
              }}
              onClose={onClose}
              onOpenReference={(dim) => handleOpenReference(dim)}
            />
          </div>
        ) : activeTab === 'edit' ? (
          /* Editor Mode */
          <div className="max-w-2xl w-full space-y-6 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Manage Recall Deck</h3>
                <p className="text-xs text-slate-400">
                  {cards.length} cards in {milestone.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingCard(!isAddingCard)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Card</span>
              </button>
            </div>

            {isAddingCard && (
              <form
                onSubmit={handleAddCustomCard}
                className="p-5 rounded-2xl bg-slate-900 border border-indigo-700/60 space-y-4 animate-in slide-in-from-top-2 duration-200"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Front Prompt / Problem</label>
                  <textarea
                    rows={2}
                    value={newFront}
                    onChange={(e) => setNewFront(e.target.value)}
                    placeholder="Enter active recall problem or prompt..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Back Target Answer</label>
                  <textarea
                    rows={2}
                    value={newBack}
                    onChange={(e) => setNewBack(e.target.value)}
                    placeholder="Enter the model target solution..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingCard(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                  >
                    Save Card
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {cards.map((card, idx) => (
                <div
                  key={card.id}
                  className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 ${
                    card.status === 'disabled'
                      ? 'bg-slate-900/40 border-slate-800/40 opacity-50'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800">
                        Card #{idx + 1}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-200">
                      {card.front || card.frontPrompt}
                    </p>
                    <p className="text-xs font-bold text-emerald-400">
                      Target: {card.back || card.backAnswer}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = cards.map((c) =>
                        c.id === card.id
                          ? { ...c, status: (c.status === 'disabled' ? 'active' : 'disabled') as 'active' | 'disabled' }
                          : c
                      );
                      setCards(updated);
                      milestone.recallDeck = updated;
                      try {
                        localStorage.setItem(`recall_deck_${milestone.id}`, JSON.stringify(updated));
                      } catch {}
                      onUpdateCards?.(milestone.id, updated);
                    }}
                    className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* CARD CANVAS: PRACTICE MODE */
          <div className="max-w-2xl w-full flex flex-col items-center">
            <div className="w-full bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-9 shadow-2xl flex flex-col justify-between min-h-[420px] sm:min-h-[480px] relative transition-all duration-300 hover:border-slate-700/80">
              {/* Concept Breadcrumb */}
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800/70">
                <nav aria-label="Concept Breadcrumb" className="inline-flex items-center gap-1.5 text-slate-400 text-xs font-medium tracking-tight">
                  <span className="text-slate-500 font-bold">@</span>
                  <span className="text-slate-300 font-semibold">{resolvedSubject}</span>
                  <span className="text-slate-600">{'>'}</span>
                  <span className="truncate max-w-[200px] text-slate-200 font-bold">{chapterTitle}</span>
                </nav>

                <div className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                  isCurrentCardMath
                    ? 'text-blue-300 bg-blue-950/60 border-blue-800/50'
                    : 'text-indigo-300 bg-indigo-950/60 border-indigo-800/50'
                }`}>
                  Card {currentIndex + 1} of {activeCards.length}
                </div>
              </div>

              {/* CARD BODY */}
              <div className="my-auto py-6 space-y-5 text-left w-full">
                {/* Parent Concept Bullet Header */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 text-base sm:text-lg font-bold text-white leading-snug">
                    <span className="text-slate-400 font-black text-xl leading-none">•</span>
                    <span>{currentCard?.parentConcept || milestone.title}</span>
                  </div>

                  {isCurrentCardMath && currentCard?.formulaUsed && (
                    <button
                      type="button"
                      onClick={() => setShowFormula((prev) => !prev)}
                      className="text-[11px] font-bold text-blue-400 hover:underline flex items-center gap-1 shrink-0"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>{showFormula ? 'Hide Formula' : 'Formula'}</span>
                    </button>
                  )}
                </div>

                {/* Formula Preview Box */}
                {showFormula && currentCard?.formulaUsed && (
                  <div className="p-2.5 rounded-xl bg-blue-950/50 border border-blue-800 text-xs font-mono font-bold text-blue-200 flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black text-blue-400">Formula:</span>
                    <span>{currentCard.formulaUsed}</span>
                  </div>
                )}

                {/* Given Data Parameters (Math) */}
                {isCurrentCardMath && Array.isArray(currentCard?.givenData) && currentCard.givenData.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 mr-1">Given:</span>
                    {currentCard.givenData.map((param, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-200"
                      >
                        {param}
                      </span>
                    ))}
                  </div>
                )}

                {/* Problem Prompt */}
                <div className="pl-4 space-y-2">
                  <div className="text-sm sm:text-base font-medium text-slate-100 leading-relaxed">
                    {currentCard?.promptQuestion || currentCard?.front || currentCard?.frontPrompt || ''}
                  </div>
                </div>

                {/* MATH INTERACTIVE INPUT LAYER */}
                {isCurrentCardMath && !isRevealed && (
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Keyboard className="w-3.5 h-3.5 text-blue-400" />
                          <span>Type Your Calculated Value:</span>
                        </label>
                        {currentCard?.hint && (
                          <button
                            type="button"
                            onClick={() => setShowHint((prev) => !prev)}
                            className="text-[10px] font-bold text-amber-400 hover:underline flex items-center gap-1"
                          >
                            <Lightbulb className="w-3 h-3 text-amber-400" />
                            <span>{showHint ? 'Hide Hint' : 'Need Hint?'}</span>
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          ref={mathInputRef}
                          type="text"
                          value={mathInput}
                          onChange={(e) => setMathInput(e.target.value)}
                          placeholder="e.g. 3/4, 1.5e-4, 9.8 m/s², or 3, 1/2"
                          className={`w-full px-4 py-2.5 text-sm sm:text-base font-mono font-bold rounded-2xl border transition outline-none bg-slate-950 ${
                            mathValidation.isMatch
                              ? 'border-emerald-500 text-emerald-100 bg-emerald-950/30 ring-2 ring-emerald-500/20'
                              : mathValidation.signError
                              ? 'border-amber-500 text-amber-100 bg-amber-950/30 ring-2 ring-amber-500/20'
                              : mathValidation.unitError
                              ? 'border-indigo-500 text-indigo-100 bg-indigo-950/30 ring-2 ring-indigo-500/20'
                              : mathValidation.isClose
                              ? 'border-sky-400 text-sky-100 bg-sky-950/20 ring-2 ring-sky-400/20'
                              : mathInput.trim()
                              ? 'border-blue-500 text-white'
                              : 'border-slate-700 text-white focus:border-blue-500'
                          }`}
                        />
                        {mathValidation.isMatch && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Math Toolbar */}
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      <span className="text-[10px] font-bold text-slate-500 mr-1">Insert:</span>
                      {['+', '-', '×', '÷', '±', '√', '²', '³', 'π', 'θ', '10^', '1/2', '1/4', 'm', 'km', 'cm', 'm/s', 'km/h', 'm/s²', 'kg', 'g', 's', 'min', 'h', 'J', 'kJ', 'W', 'kW', 'Pa', 'atm', 'V', 'A', 'Ω', 'x', 'y', '/', '='].map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => handleInsertSymbol(sym)}
                          className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-bold text-slate-300 hover:text-blue-400 transition"
                        >
                          {sym}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleOpenReference(activeConversionLog?.dimension)}
                        className="px-2.5 py-0.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/80 text-xs font-bold text-indigo-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                        title="Open Quick Conversion Reference Sheet"
                      >
                        <Scale className="w-3 h-3 text-indigo-400" />
                        <span>Unit Sheet</span>
                      </button>
                    </div>

                    {/* Live Equivalence Diagnostic Badge */}
                    {mathInput.trim() && (
                      <MathVerificationBadge validation={mathValidation} />
                    )}

                    {showHint && currentCard?.hint && (
                      <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-800 text-xs text-amber-200 space-y-1">
                        <span className="font-bold text-[10px] uppercase text-amber-400 flex items-center gap-1">
                          <Lightbulb className="w-3.5 h-3.5" /> Hint:
                        </span>
                        <p>{currentCard.hint}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* REVEALED DERIVATION STATE */}
                {isRevealed && currentCard && (
                  <div className="pt-4 border-t border-slate-800/80 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Math Verification Banner if student typed an answer */}
                    {isCurrentCardMath && mathInput.trim() && (
                      <div className={`p-3.5 rounded-2xl border ${
                        mathValidation.isMatch
                          ? 'bg-emerald-950/50 border-emerald-700'
                          : 'bg-amber-950/50 border-amber-700'
                      }`}>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            {mathValidation.isMatch ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-amber-400" />
                            )}
                            <span>
                              Your input: <strong className="font-mono text-white">{mathInput}</strong> • Target: <strong className="font-mono text-emerald-300">{currentCard.expectedAnswer || currentCard.back}</strong>
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            mathValidation.isMatch ? 'bg-emerald-900 text-emerald-200' : 'bg-amber-900 text-amber-200'
                          }`}>
                            {mathValidation.isMatch ? 'Match ✓' : 'Review Steps'}
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

                    {/* Step-by-step mathematical derivation list */}
                    {isCurrentCardMath && Array.isArray(currentCard.stepByStepDerivation) && currentCard.stepByStepDerivation.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1">
                          <Calculator className="w-3.5 h-3.5" /> Derivation Breakdown
                        </span>
                        <div className="space-y-1.5">
                          {currentCard.stepByStepDerivation.map((step, sIdx) => (
                            <div key={sIdx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-xs">
                              <span className="w-5 h-5 rounded-full bg-blue-900/60 text-blue-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                                {step.stepNumber || sIdx + 1}
                              </span>
                              <div className="space-y-0.5 flex-1">
                                <div className="font-semibold text-slate-200">{step.stepAction}</div>
                                <div className="font-mono font-bold text-blue-300">{step.expression}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Target Answer */}
                    <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 space-y-1">
                      <span className="text-[10px] font-black uppercase text-emerald-400">
                        {isCurrentCardMath ? 'Calculated Target Solution' : 'Synthesized Target Answer'}
                      </span>
                      <p className="text-sm font-bold text-emerald-200 font-mono">
                        {currentCard.back || currentCard.answer}
                      </p>
                    </div>

                    {/* Explanation */}
                    {currentCard.explanation && (
                      <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1 text-xs">
                        <span className="font-bold text-slate-400">Explanation & Insights:</span>
                        <p className="text-slate-200 leading-relaxed">{currentCard.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CARD BOTTOM ACTION CONTROLS */}
              <div className="pt-5 border-t border-slate-800/70 flex flex-col gap-3">
                {!isRevealed ? (
                  <div className="space-y-3">
                    {/* Live Speech Recognition Recording State */}
                    {isVoiceActive && (
                      <div className="p-4 rounded-2xl bg-indigo-950/80 border-2 border-indigo-500 shadow-xl space-y-3 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center gap-1 h-4">
                              <span className="w-1 bg-indigo-400 rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-2"></span>
                              <span className="w-1 bg-indigo-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.15s] h-4"></span>
                              <span className="w-1 bg-indigo-400 rounded-full animate-[pulse_0.7s_ease-in-out_infinite_0.3s] h-3"></span>
                            </div>
                            <span className="text-xs font-bold text-indigo-200">
                              Listening to your spoken answer...
                            </span>
                          </div>
                          <span className="text-xs font-mono font-black text-indigo-300">
                            {recordingSeconds}s
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-indigo-800/60 min-h-[45px] text-xs text-slate-200 italic leading-relaxed">
                          {spokenTranscript || interimTranscript ? (
                            <p>
                              <span>{spokenTranscript} </span>
                              {interimTranscript && (
                                <span className="text-indigo-400 opacity-80">{interimTranscript}</span>
                              )}
                            </p>
                          ) : (
                            <span className="text-slate-500 not-italic">
                              Speak out loud into your microphone...
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={handleToggleVoice}
                            disabled={isEvaluatingVoice}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md"
                          >
                            {isEvaluatingVoice ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Evaluating with AI...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Done Speaking & Grade Answer</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={stopVoiceRecording}
                            className="text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {voiceError && (
                      <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>{voiceError}</span>
                      </div>
                    )}

                    {!isVoiceActive && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {isCurrentCardMath ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (mathValidation.isMatch) {
                                confetti({ particleCount: 35, spread: 45, origin: { y: 0.6 } });
                              }
                              setIsRevealed(true);
                            }}
                            className="py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-blue-500/20 active:scale-[0.99]"
                          >
                            <CheckCircle2 className="w-4 h-4 text-blue-200" />
                            <span>Verify Answer (Enter)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleToggleVoice}
                            className="py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-indigo-500/20 active:scale-[0.99]"
                          >
                            <Mic className="w-4 h-4 text-indigo-200" />
                            <span>Speak Your Answer (V)</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setIsRevealed(true)}
                          className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs active:scale-[0.99]"
                        >
                          <Eye className="w-4 h-4 text-slate-400" />
                          <span>Reveal Derivation (Space)</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* REVEALED RATING BAR */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleDisableCard}
                        className="py-3 px-4 rounded-xl border border-slate-700/80 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                        title="Disable Card"
                      >
                        <VolumeX className="w-4 h-4" />
                        <span className="hidden sm:inline">Disable</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEvaluate('relearn')}
                        className="flex-1 py-3 px-4 rounded-xl border border-rose-500/50 ring-2 ring-rose-500/20 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-[0.99]"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-400" />
                        <span>Relearn</span>
                        <span className="text-[10px] font-mono text-rose-300/80 font-normal hidden sm:inline">(1 or J)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEvaluate('understood')}
                        className={`flex-1 py-3 px-4 rounded-xl border font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-[0.99] ${
                          isCurrentCardMath
                            ? 'border-blue-500/50 ring-2 ring-blue-500/20 bg-blue-950/40 hover:bg-blue-900/60 text-blue-200'
                            : 'border-emerald-500/50 ring-2 ring-emerald-500/20 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200'
                        }`}
                      >
                        <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                        <span>Understood</span>
                        <span className="text-[10px] font-mono text-emerald-300/80 font-normal hidden sm:inline">(2 or K)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenAITutor}
                        className="p-3 rounded-xl border border-indigo-700/70 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 hover:text-white transition cursor-pointer"
                        title="AI Conceptual Breakdown"
                      >
                        <Brain className="w-4 h-4 text-indigo-400" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Assistant Drawer Modal */}
            {showAITutor && (
              <div className="w-full mt-4 p-5 rounded-3xl bg-slate-900 border border-indigo-700/80 shadow-2xl animate-in slide-in-from-bottom-2 duration-200 text-left">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-black text-white">AI Mathematical Breakdown</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAITutor(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="py-3 max-h-48 overflow-y-auto space-y-2.5 text-xs">
                  {aiTutorMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl leading-relaxed whitespace-pre-wrap ${
                        msg.sender === 'user'
                          ? 'bg-indigo-950/60 border border-indigo-800/80 text-indigo-200 ml-4'
                          : 'bg-slate-950 border border-slate-800 text-slate-300 mr-4'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendAITutor} className="flex gap-2 pt-2 border-t border-slate-800">
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Ask about this derivation, theorem, or calculation..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </main>

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

export default FullScreenFlashcardStudy;
