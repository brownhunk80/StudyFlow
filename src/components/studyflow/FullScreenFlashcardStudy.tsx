import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Section, DocumentFlashcard } from '../../types';

export interface ActiveRecallCard {
  id: string;
  breadcrumb?: string;
  parentConcept?: string;
  promptQuestion?: string;
  answer?: string;
  inlineAnswer?: string;
  cardType?: 'single' | 'list';
  listItems?: string[];
  explanation?: string;
  sourceQuote?: string;
  topicTag?: string;
  sectionId?: string;
  front: string;
  back: string;
  sourceExcerpt?: string;
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

  const [activeTab, setActiveTab] = useState<'practice' | 'edit'>(initialMode);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showAITutor, setShowAITutor] = useState(false);
  const [aiTutorMessages, setAiTutorMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([]);
  const [userQuery, setUserQuery] = useState('');
  const [sessionCompleted, setSessionCompleted] = useState(false);
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

  // Editor states
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newExplanation, setNewExplanation] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);

  // Helper to resolve document text excerpt for milestone
  const resolveTextExcerpt = useCallback((): string => {
    if (!milestone) return '';
    if (milestone.sectionTextExcerpt && milestone.sectionTextExcerpt.trim().length >= 60) {
      return milestone.sectionTextExcerpt.trim();
    }
    if ((milestone as any).textExcerpt && (milestone as any).textExcerpt.trim().length >= 60) {
      return (milestone as any).textExcerpt.trim();
    }
    const rawDoc = activeChapter?.rawText || activeChapter?.documentText || chapterRawText;
    if (rawDoc && rawDoc.trim().length >= 60) {
      const raw = rawDoc.trim();
      const titleIdx = raw.toLowerCase().indexOf(milestone.title.toLowerCase());
      if (titleIdx >= 0) {
        const slice = raw.slice(titleIdx, titleIdx + 2500).trim();
        if (slice.length >= 60) return slice;
      }
      const topics =
        (Array.isArray((milestone as any).coreTopics) && (milestone as any).coreTopics) ||
        (Array.isArray(milestone.keyTopics) && milestone.keyTopics) ||
        [];
      for (const t of topics) {
        const tIdx = raw.toLowerCase().indexOf(t.toLowerCase());
        if (tIdx >= 0) {
          const slice = raw.slice(Math.max(0, tIdx - 150), tIdx + 2500).trim();
          if (slice.length >= 60) return slice;
        }
      }
    }
    let summaryText =
      milestone.summaries?.[1]?.contentMarkdown ||
      milestone.summaries?.[0]?.contentMarkdown ||
      milestone.summary ||
      (milestone as any).contentMarkdown ||
      '';
    if (summaryText.trim().length < 60) {
      const topics =
        (Array.isArray((milestone as any).coreTopics) && (milestone as any).coreTopics) ||
        (Array.isArray(milestone.keyTopics) && milestone.keyTopics) ||
        [milestone.title || 'Core Principles'];
      summaryText = `${milestone.title}. Key foundational topics include: ${topics.join(', ')}. This unit covers core principles, systematic derivations, problem-solving methodologies, and rigorous conceptual applications in ${chapterTitle}.`;
    }
    return summaryText.trim();
  }, [milestone, activeChapter, chapterRawText, chapterTitle]);

  // Normalize raw card array from any legacy or recallDeck format
  const normalizeCards = useCallback(
    (rawList: any[]): ActiveRecallCard[] => {
      return rawList.map((item, idx) => {
        const parentConcept = item.parentConcept || item.topicTag || milestone?.title || 'Core Principle';
        const frontText =
          item.promptQuestion || item.front || item.frontPrompt || item.question || `Core Principle ${idx + 1}`;
        const backText =
          item.answer || item.back || item.backAnswer || item.modelAnswer || 'Underlying principle.';
        const explanationText = item.explanation || item.notes || '';
        const sourceText =
          item.sourceQuote || item.sourceExcerpt || item.sourceContext || item.citation || `${milestone?.title || 'Milestone'} Notes`;
        const cardType: 'single' | 'list' = item.cardType === 'list' ? 'list' : 'single';
        const listItems = Array.isArray(item.listItems) ? item.listItems : [];

        return {
          id: item.id || `recall-${milestone?.id || 'card'}-${idx + 1}`,
          parentConcept,
          promptQuestion: frontText,
          answer: backText,
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
    [milestone?.id, milestone?.title]
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

    // 1. Check if activeMilestone already has recallDeck or flashcards in state/storage
    let existingList: any[] | null = null;
    if (Array.isArray(milestone.recallDeck) && milestone.recallDeck.length > 0) {
      existingList = milestone.recallDeck;
    } else if (Array.isArray((milestone as any).recallCards) && (milestone as any).recallCards.length > 0) {
      existingList = (milestone as any).recallCards;
    } else if (Array.isArray(milestone.flashcards) && milestone.flashcards.length > 0) {
      existingList = milestone.flashcards;
    } else {
      try {
        const cached = localStorage.getItem(`recall_deck_${milestone.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            existingList = parsed;
          }
        }
      } catch {
        // ignore
      }
    }

    if (existingList && existingList.length > 0) {
      setCards(normalizeCards(existingList));
      setIsLoadingCards(false);
      return;
    }

    // 2. Empty state: activeMilestone.recallDeck has 0 cards -> Fetch /api/recall-deck/generate
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
            localStorage.setItem(`recall_deck_${milestone.id}`, JSON.stringify(generatedList));
          } catch {}
          onUpdateCards?.(milestone.id, generatedList);
          setCards(normalizeCards(generatedList));
        } else {
          // Dynamic fallback based on milestone topics
          const fallback = topics.slice(0, 4).map((topic: string, i: number) => ({
            id: `recall-${milestone.id}-${i + 1}`,
            front: `What core principle and governing relationship defines ${topic}?`,
            back: `In ${milestone.title}, ${topic} establishes foundational conceptual axioms and rules governing behavior and analytical reasoning.`,
            explanation: `Understanding ${topic} is critical to securing understanding and full examination marks.`,
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
          front: `What core principle and governing relationship defines ${topic}?`,
          back: `In ${milestone.title}, ${topic} establishes foundational conceptual axioms and rules governing behavior and analytical reasoning.`,
          explanation: `Understanding ${topic} is critical to securing understanding and full examination marks.`,
          sourceExcerpt: excerpt.slice(0, 140) || `${milestone.title} Notes`,
        }));
        milestone.recallDeck = fallback;
        setCards(normalizeCards(fallback));
        setIsLoadingCards(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, milestone?.id, milestone?.title, chapterTitle, resolveTextExcerpt, normalizeCards]);

  // Reset / Re-sync with Notes Recall Deck
  const handleRegenerateDeck = async () => {
    if (!milestone || isRegenerating || isLoadingCards) return;

    // 1. Clear milestone.recallDeck & cache
    milestone.recallDeck = [];
    (milestone as any).flashcards = [];
    delete (milestone as any).recallCards;
    try {
      localStorage.removeItem(`recall_deck_${milestone.id}`);
    } catch {}

    setCards([]);
    setIsRegenerating(true);
    setIsLoadingCards(true);
    setCurrentIndex(0);
    setIsRevealed(false);
    setShowAITutor(false);
    setSessionCompleted(false);
    setStudyStats({ total: 0, understood: 0, relearned: 0 });

    const topics =
      (Array.isArray((milestone as any).coreTopics) && (milestone as any).coreTopics.length > 0 && (milestone as any).coreTopics) ||
      (Array.isArray(milestone.keyTopics) && milestone.keyTopics.length > 0 && milestone.keyTopics) ||
      [milestone.title || 'Core Principles'];

    const excerpt = resolveTextExcerpt();

    try {
      const res = await fetch('/api/recall-deck/generate', {
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
          cardCount: 5,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const generatedList = Array.isArray(data.cards) ? data.cards : Array.isArray(data.recallDeck) ? data.recallDeck : [];

      if (generatedList.length > 0) {
        milestone.recallDeck = generatedList;
        try {
          localStorage.setItem(`recall_deck_${milestone.id}`, JSON.stringify(generatedList));
        } catch {}
        onUpdateCards?.(milestone.id, generatedList);
        setCards(normalizeCards(generatedList));
      }
    } catch (err: any) {
      console.warn('[FullScreenFlashcardStudy] Regenerate failed:', err);
      setLoadError('Failed to refresh deck. Keeping current cards.');
    } finally {
      setIsRegenerating(false);
      setIsLoadingCards(false);
    }
  };

  // Active cards queue (non-disabled cards)
  const activeCards = useMemo(() => {
    return cards.filter((c) => c.status !== 'disabled');
  }, [cards]);

  const currentCard: ActiveRecallCard | undefined = activeCards[currentIndex] || activeCards[0];

  // Helper to parse cloze deletion or highlights
  const renderPromptContent = (prompt: string, isBackFace: boolean) => {
    const clozeRegex = /\{\{(?:c\d+::)?(.*?)\}\}/g;

    if (!clozeRegex.test(prompt)) {
      return (
        <span className="text-slate-900 dark:text-white font-medium leading-relaxed">
          {prompt}
        </span>
      );
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const regex = /\{\{(?:c\d+::)?(.*?)\}\}/g;

    while ((match = regex.exec(prompt)) !== null) {
      if (match.index > lastIndex) {
        parts.push(prompt.substring(lastIndex, match.index));
      }

      const clozeText = match[1];

      if (!isBackFace) {
        // Front Face: Retrieval prompt fill-in-the-blank text
        parts.push(
          <span
            key={match.index}
            className="inline-flex items-center px-3 py-1 mx-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 border-2 border-dashed border-indigo-400 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 font-black text-sm tracking-widest shadow-2xs animate-pulse"
          >
            [ ... ]
          </span>
        );
      } else {
        // Back Face: Highlighted revealed target
        parts.push(
          <span
            key={match.index}
            className="inline-flex items-center px-3 py-1 mx-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 border-2 border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200 font-black text-sm sm:text-base shadow-xs"
          >
            {clozeText}
          </span>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < prompt.length) {
      parts.push(prompt.substring(lastIndex));
    }

    return (
      <span className="text-slate-900 dark:text-white leading-relaxed">
        {parts}
      </span>
    );
  };

  // SM-2 Spaced-Repetition Evaluation Handler
  // Maps "Relearn" (forgot / failed recall) and "Understood" (remembered)
  const handleEvaluate = useCallback(
    (action: 'relearn' | 'understood') => {
      if (!currentCard || !milestone) return;

      const previousInterval = currentCard.interval || 1;
      let newInterval = previousInterval;
      let newRepetition = currentCard.repetition || 0;
      let newEF = currentCard.easinessFactor || 2.5;
      let newStatus: 'due_today' | 'mastered' = 'due_today';
      let nextDueDate: string;

      if (action === 'relearn') {
        // SM-2 for failed recall (relearn):
        // * Set repetition count to 0.
        // * Set next interval to 1 day.
        // * Decrement easiness factor by 0.2 (minimum 1.3).
        // * Mark card as "due today".
        newRepetition = 0;
        newInterval = 1;
        newEF = Math.max(1.3, Number(((currentCard.easinessFactor || 2.5) - 0.2).toFixed(2)));
        newStatus = 'due_today';
        nextDueDate = new Date().toISOString(); // Due today
        setStudyStats((prev) => ({
          ...prev,
          total: prev.total + 1,
          relearned: prev.relearned + 1,
        }));
      } else {
        // SM-2 for successful recall (understood):
        // * Increment repetition count by 1.
        // * If repetition is 1, interval = 1 day; if 2, interval = 6 days; if > 2, interval = Math.round(previousInterval * easinessFactor).
        // * Mark card as "mastered".
        newRepetition = (currentCard.repetition || 0) + 1;
        if (newRepetition === 1) {
          newInterval = 1;
        } else if (newRepetition === 2) {
          newInterval = 6;
        } else {
          newInterval = Math.round(previousInterval * (currentCard.easinessFactor || 2.5));
        }
        newStatus = 'mastered';
        nextDueDate = new Date(Date.now() + newInterval * 86400000).toISOString();
        setStudyStats((prev) => ({
          ...prev,
          total: prev.total + 1,
          understood: prev.understood + 1,
        }));
      }

      const updatedCard: ActiveRecallCard = {
        ...currentCard,
        interval: newInterval,
        repetition: newRepetition,
        easinessFactor: newEF,
        status: newStatus,
        reviewStatus: newStatus,
        isDueToday: newStatus === 'due_today',
        dueDate: nextDueDate,
        lastReviewed: new Date().toISOString(),
      };

      const updatedAll = cards.map((c) => (c.id === currentCard.id ? updatedCard : c));
      setCards(updatedAll);
      milestone.recallDeck = updatedAll;

      // Persist updated card metrics back into localStorage and active chapter state
      try {
        localStorage.setItem(`recall_deck_${milestone.id}`, JSON.stringify(updatedAll));
        if (activeChapter?.id) {
          const stored = localStorage.getItem(`chapter_milestones_${activeChapter.id}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            const updatedMilestones = parsed.map((m: any) =>
              m.id === milestone.id ? { ...m, recallDeck: updatedAll, flashcards: updatedAll } : m
            );
            localStorage.setItem(`chapter_milestones_${activeChapter.id}`, JSON.stringify(updatedMilestones));
          }
        }
      } catch (err) {
        console.warn('[FullScreenFlashcardStudy] Failed to persist SM-2 card updates:', err);
      }

      onUpdateCards?.(milestone.id, updatedAll);

      // Advance to next card or trigger session completion
      setIsRevealed(false);
      setShowAITutor(false);

      if (currentIndex < activeCards.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setSessionCompleted(true);
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
    },
    [currentCard, cards, activeCards.length, currentIndex, onUpdateCards, milestone, activeChapter]
  );

  // Mute / Disable Card handler (Trash/Archive icon)
  const handleDisableCard = useCallback(() => {
    if (!currentCard || !milestone) return;

    const updatedAll = cards.map((c) =>
      c.id === currentCard.id ? { ...c, status: 'disabled' as const } : c
    );
    setCards(updatedAll);
    onUpdateCards?.(milestone.id, updatedAll);
    setIsRevealed(false);

    if (activeCards.length <= 1) {
      setSessionCompleted(true);
    } else if (currentIndex >= activeCards.length - 1) {
      setCurrentIndex(0);
    }
  }, [currentCard, cards, activeCards.length, currentIndex, onUpdateCards, milestone]);

  // Keyboard Shortcuts Hook
  useEffect(() => {
    if (!isOpen || sessionCompleted || activeTab !== 'practice' || isLoadingCards) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Space / Enter -> "Check Your Recall"
      if ((e.code === 'Space' || e.key === 'Enter') && !isRevealed) {
        e.preventDefault();
        setIsRevealed(true);
        return;
      }

      // 1 or J / j -> Relearn
      if (isRevealed && (e.key === '1' || e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        handleEvaluate('relearn');
        return;
      }

      // 2 or K / k -> Understood
      if (isRevealed && (e.key === '2' || e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        handleEvaluate('understood');
        return;
      }

      // Escape -> Close to Roadmap
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, sessionCompleted, activeTab, isRevealed, isLoadingCards, handleEvaluate, onClose]);

  // Handle AI Tutor follow-up query
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
          `• **Exam Application**: Examiners evaluate this principle to verify whether you understand the structural cause rather than shallow keyword memorization.\n` +
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

  // Add custom card handler
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

  // Session progress calculation
  const totalCards = activeCards.length;
  const currentCardNumber = Math.min(currentIndex + 1, Math.max(1, totalCards));
  const progressPercent = totalCards > 0 ? Math.round(((currentIndex) / totalCards) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col text-slate-100 overflow-hidden select-none animate-in fade-in duration-200">
      {/* =================================================================== */}
      {/* 1. HEADER BAR */}
      {/* =================================================================== */}
      <header className="h-16 px-4 sm:px-8 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
        {/* Left: Close (X) button returning to [Roadmap] + Header Titles */}
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

          {/* Header Title: Render activeMilestone.title and activeChapter.title */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-slate-400 truncate max-w-[120px] sm:max-w-[180px]">
              {chapterTitle}
            </span>
            <span className="text-slate-600 text-xs">/</span>
            <span className="text-xs font-black text-white truncate max-w-[140px] sm:max-w-[260px]">
              {milestone.title}
            </span>
          </div>

          {/* Status chip: "Card ${currentIndex + 1} of ${activeCards.length}" */}
          {!isLoadingCards && totalCards > 0 && (
            <div className="hidden md:flex items-center gap-2 min-w-0">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-950/90 text-indigo-300 border border-indigo-700/80 shadow-2xs flex items-center gap-1.5 shrink-0">
                <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Card {currentIndex + 1} of {activeCards.length}</span>
              </span>
            </div>
          )}
        </div>

        {/* Right: Re-sync Button & Mode Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Subtle "Re-sync with Notes" button in modal header */}
          <button
            type="button"
            onClick={handleRegenerateDeck}
            disabled={isRegenerating || isLoadingCards}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            title="Re-sync Cards: Clear cached cards and re-fetch freshly extracted cards from milestone text"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-purple-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Re-sync with Notes</span>
          </button>

          {/* Tab Switcher (Recall Deck vs Manage Deck) */}
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
              <span>Manage ({cards.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
          style={{ width: `${isLoadingCards ? 30 : Math.round(((currentIndex + 1) / Math.max(1, totalCards)) * 100)}%` }}
        />
      </div>

      {/* =================================================================== */}
      {/* 2. BODY CONTENT */}
      {/* =================================================================== */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center justify-center relative">
        {/* Loading Indicator when recallDeck has 0 cards */}
        {isLoadingCards ? (
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 text-center space-y-5 shadow-2xl animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-2xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-400 mx-auto flex items-center justify-center shadow-lg">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-black text-white">
                Extracting active recall cards from milestone notes...
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Analyzing core mechanisms and principles in <span className="font-bold text-indigo-300">{milestone.title}</span> to generate targeted retrieval prompts.
              </p>
            </div>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-300">
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                <span>Chapter: {chapterTitle}</span>
              </span>
            </div>
          </div>
        ) : sessionCompleted ? (
          /* Session Completion View */
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-700/80 text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Recall Session Complete!
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                You tested all cards for <span className="text-white font-bold">{milestone.title}</span>.
              </p>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-950/80 border border-slate-800">
              <div className="p-2 text-center">
                <div className="text-2xl font-black text-white">{studyStats.total}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Reviewed
                </div>
              </div>
              <div className="p-2 text-center border-x border-slate-800">
                <div className="text-2xl font-black text-emerald-400">{studyStats.understood}</div>
                <div className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider">
                  Understood
                </div>
              </div>
              <div className="p-2 text-center">
                <div className="text-2xl font-black text-rose-400">{studyStats.relearned}</div>
                <div className="text-[10px] font-bold text-rose-400/80 uppercase tracking-wider">
                  Relearned
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex(0);
                  setIsRevealed(false);
                  setSessionCompleted(false);
                  setStudyStats({ total: 0, understood: 0, relearned: 0 });
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Study Again</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                <span>Return to Roadmap</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : activeTab === 'edit' ? (
          /* Editor Mode */
          <div className="max-w-2xl w-full space-y-6">
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

            {/* Add Card Form */}
            {isAddingCard && (
              <form
                onSubmit={handleAddCustomCard}
                className="p-5 rounded-2xl bg-slate-900 border border-indigo-700/60 space-y-4 animate-in slide-in-from-top-2 duration-200"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Front Prompt</label>
                  <textarea
                    rows={2}
                    value={newFront}
                    onChange={(e) => setNewFront(e.target.value)}
                    placeholder="Enter active recall prompt or fill-in-the-blank question..."
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
                    placeholder="Enter the model target answer..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Explanation & Context (Optional)</label>
                    <input
                      type="text"
                      value={newExplanation}
                      onChange={(e) => setNewExplanation(e.target.value)}
                      placeholder="Why this principle holds..."
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Source Excerpt (Optional)</label>
                    <input
                      type="text"
                      value={newSource}
                      onChange={(e) => setNewSource(e.target.value)}
                      placeholder="e.g. Page 12, Theorem 3.1"
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
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

            {/* Cards List */}
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
                      {(card.sourceExcerpt || card.sourceContext) && (
                        <span className="text-[11px] text-slate-500 truncate">
                          {card.sourceExcerpt || card.sourceContext}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-200">
                      {card.front || card.frontPrompt}
                    </p>
                    <p className="text-xs font-bold text-emerald-400">
                      Target: {card.back || card.backAnswer}
                    </p>
                    {card.explanation && (
                      <p className="text-[11px] text-slate-400">
                        {card.explanation}
                      </p>
                    )}
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
                    title={card.status === 'disabled' ? 'Re-enable card' : 'Disable card'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* CARD CANVAS: ELEVATED, MINIMALIST CENTRAL CARD WITH REVEAL */
          /* ================================================================= */
          <div className="max-w-2xl w-full flex flex-col items-center">
            {/* Elevated Central Card */}
            <div className="w-full bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-9 shadow-2xl flex flex-col justify-between min-h-[400px] sm:min-h-[460px] relative transition-all duration-300 hover:border-slate-700/80">
              {/* Concept Breadcrumb at top of the card */}
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800/70">
                <nav aria-label="Concept Breadcrumb" className="inline-flex items-center gap-1.5 text-slate-400 text-xs font-medium tracking-tight">
                  <span className="text-slate-500 font-bold">@</span>
                  <span className="text-slate-300 font-semibold">{subjectName || 'SST'}</span>
                  <span className="text-slate-600">{'>'}</span>
                  <span className="truncate max-w-[200px] text-slate-200 font-bold">{chapterTitle}</span>
                </nav>

                {/* Card Counter: Dynamically compute Card ${currentIndex + 1} of ${activeCards.length} */}
                <div className="text-[11px] font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-1 rounded-lg">
                  Card {currentIndex + 1} of {activeCards.length}
                </div>
              </div>

              {/* CARD BODY: REMNOTE PARENT-CHILD BULLET HIERARCHY */}
              <div className="my-auto py-6 space-y-6 text-left w-full">
                {/* 1. Bold Parent Concept Bullet Header */}
                <div className="flex items-start gap-2.5 text-base sm:text-lg font-bold text-white leading-snug">
                  <span className="text-slate-400 font-black text-xl leading-none">•</span>
                  <span>{currentCard?.parentConcept || milestone.title}</span>
                </div>

                {/* 2. Atomic Child Question with Inline Marker or Answer */}
                <div className="pl-5 space-y-2">
                  <div className="flex flex-wrap items-baseline gap-2 text-sm sm:text-base font-normal text-slate-100 leading-relaxed">
                    <span className="text-slate-400 font-bold">•</span>
                    <span className="font-medium text-slate-200">
                      {currentCard?.promptQuestion || currentCard?.front || currentCard?.frontPrompt || ''}
                    </span>
                    <span className="text-slate-400 font-bold select-none">
                      {currentCard?.cardType === 'list' ? '↓' : '→'}
                    </span>
                    {!isRevealed ? (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-400/40 text-xs font-bold shadow-xs animate-pulse">
                        ?
                      </span>
                    ) : (
                      currentCard?.cardType !== 'list' && (
                        <span className="font-semibold text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-800/60 animate-in fade-in duration-150">
                          {currentCard?.inlineAnswer || currentCard?.answer || currentCard?.back || currentCard?.backAnswer}
                        </span>
                      )
                    )}
                  </div>

                  {/* List Type Items when Revealed */}
                  {isRevealed && currentCard?.cardType === 'list' && Array.isArray(currentCard?.listItems) && currentCard.listItems.length > 0 && (
                    <ol className="pl-6 pt-1 list-decimal space-y-1 text-sm text-emerald-300 font-semibold animate-in fade-in duration-200">
                      {currentCard.listItems.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ol>
                  )}
                </div>

                {/* ========================================================= */}
                {/* 3. REVEALED STATE: EXPLANATION & SOURCES CITATION */}
                {/* ========================================================= */}
                {isRevealed && currentCard && (
                  <div className="pt-4 border-t border-slate-800/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Explanation Box */}
                    {currentCard.explanation && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/70 border border-slate-700/80 space-y-1.5 text-left shadow-xs">
                        <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <span>Explanation</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                          {currentCard.explanation}
                        </p>
                      </div>
                    )}

                    {/* Sources Verbatim Citation Box */}
                    {(currentCard.sourceQuote || currentCard.sourceExcerpt || currentCard.sourceContext) && (
                      <div className="p-3.5 sm:p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 text-left space-y-1 shadow-xs">
                        <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                          <span>Sources</span>
                        </div>
                        <p className="text-xs text-slate-300 italic font-serif leading-relaxed">
                          "{currentCard.sourceQuote || currentCard.sourceExcerpt || currentCard.sourceContext}"
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CARD BOTTOM ACTION CONTROLS */}
              <div className="pt-5 border-t border-slate-800/70 flex flex-col gap-3">
                {!isRevealed ? (
                  /* FRONT FACE ACTION: "I Tried to Recall It - Show Answer" (Hotkey: Space / Enter) */
                  <button
                    type="button"
                    onClick={() => setIsRevealed(true)}
                    className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm sm:text-base transition cursor-pointer flex items-center justify-center gap-3 shadow-xl hover:shadow-indigo-500/20 active:scale-[0.99]"
                  >
                    <Eye className="w-5 h-5 text-indigo-200" />
                    <span>I Tried to Recall It - Show Answer</span>
                    <div className="hidden sm:flex items-center gap-1">
                      <kbd className="px-2 py-0.5 text-xs font-mono bg-indigo-700/80 border border-indigo-400/40 rounded-lg text-indigo-100">
                        Space
                      </kbd>
                      <span className="text-indigo-300 text-xs">or</span>
                      <kbd className="px-2 py-0.5 text-xs font-mono bg-indigo-700/80 border border-indigo-400/40 rounded-lg text-indigo-100">
                        Enter
                      </kbd>
                    </div>
                  </button>
                ) : (
                  /* REVEALED HORIZONTAL ACTION BAR: Disable Card, Forgot, Remembered */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      {/* Left utility button: "Disable Card" */}
                      <button
                        type="button"
                        onClick={handleDisableCard}
                        className="py-3 px-4 rounded-xl border border-slate-700/80 bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                        title="Disable Card (Removes from future review queue)"
                      >
                        <VolumeX className="w-4 h-4" />
                        <span className="hidden sm:inline">Disable Card</span>
                      </button>

                      {/* Action button 1: "Forgot" (red icon, Hotkey: '1' or 'J') */}
                      <button
                        type="button"
                        onClick={() => handleEvaluate('relearn')}
                        className="flex-1 py-3 px-4 rounded-xl border border-rose-500/50 ring-2 ring-rose-500/20 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-[0.99]"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-400" />
                        <span>Forgot</span>
                        <span className="text-[10px] font-mono text-rose-300/80 font-normal hidden sm:inline">(1 or J)</span>
                      </button>

                      {/* Action button 2: "Remembered" (golden/green icon, Hotkey: '2' or 'K') */}
                      <button
                        type="button"
                        onClick={() => handleEvaluate('understood')}
                        className="flex-1 py-3 px-4 rounded-xl border border-emerald-500/50 ring-2 ring-emerald-500/20 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-[0.99]"
                      >
                        <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                        <span>Remembered</span>
                        <span className="text-[10px] font-mono text-emerald-300/80 font-normal hidden sm:inline">(2 or K)</span>
                      </button>

                      {/* Right utility button: "Deep Dive with AI Assistant" */}
                      <button
                        type="button"
                        onClick={handleOpenAITutor}
                        className="p-3 rounded-xl border border-indigo-700/70 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 hover:text-white transition cursor-pointer"
                        title="Deep Dive with AI Assistant"
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
              <div className="w-full mt-4 p-5 rounded-3xl bg-slate-900 border border-indigo-700/80 shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-black text-white">AI Conceptual Deconstruction</span>
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
                    placeholder="Ask about this derivation or model takeaway..."
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
    </div>
  );
};
