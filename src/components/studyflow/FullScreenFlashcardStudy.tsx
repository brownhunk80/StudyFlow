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
  ExternalLink,
  ChevronRight,
  Archive,
  VolumeX,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Section, DocumentFlashcard } from '../../types';

interface FullScreenFlashcardStudyProps {
  section: Section;
  chapterName: string;
  subjectName?: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCards?: (sectionId: string, updatedCards: DocumentFlashcard[]) => void;
  initialMode?: 'practice' | 'edit';
}

export const FullScreenFlashcardStudy: React.FC<FullScreenFlashcardStudyProps> = ({
  section,
  chapterName,
  subjectName = 'Science',
  isOpen,
  onClose,
  onUpdateCards,
  initialMode = 'practice',
}) => {
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

  // Editor states
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newSource, setNewSource] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);

  // Initialize or fallback cards with rich cloze formatting & explanations
  const defaultCards: DocumentFlashcard[] = useMemo(() => {
    if (section.flashcards && section.flashcards.length > 0) {
      return section.flashcards.filter((c) => c.status !== 'disabled');
    }

    const topics = section.keyTopics && section.keyTopics.length > 0
      ? section.keyTopics
      : [section.title];

    return [
      {
        id: `fc-${section.id}-1`,
        sectionId: section.id,
        frontPrompt: `In the study of ${section.title}, the governing relation states that {{c1::the incident ray, reflected ray, and the normal}} all lie in the same plane at the point of incidence.`,
        backAnswer: `The incident ray, reflected ray, and the normal at the point of incidence all lie in the exact same geometric plane.`,
        sourceContext: `Chapter: ${chapterName} • Subsection ${section.sectionNumber} (NCERT Standard Page 160)`,
        interval: 1,
        repetition: 0,
        easinessFactor: 2.5,
        status: 'active',
      },
      {
        id: `fc-${section.id}-2`,
        sectionId: section.id,
        frontPrompt: `What is the algebraic relationship between radius of curvature (R) and focal length (f) for spherical mirrors of small aperture? Answer: {{c1::R = 2f}} (or f = R / 2).`,
        backAnswer: `R = 2f  (Focal length equals half the radius of curvature: f = R / 2)`,
        sourceContext: `Ray Optics Mathematical Derivations & Axioms`,
        interval: 2,
        repetition: 1,
        easinessFactor: 2.6,
        status: 'active',
      },
      {
        id: `fc-${section.id}-3`,
        sectionId: section.id,
        frontPrompt: `According to the Cartesian Sign Convention for ${topics[0] || section.title}, object distance (u) is always assigned a {{c1::negative (-) sign}}.`,
        backAnswer: `Negative (-) sign, because the object is placed to the left of the mirror and incident light travels from left to right.`,
        sourceContext: `Standard Sign Convention Guide • Table 10.1`,
        interval: 1,
        repetition: 0,
        easinessFactor: 2.4,
        status: 'active',
      },
      {
        id: `fc-${section.id}-4`,
        sectionId: section.id,
        frontPrompt: `The focal length of a concave mirror is taken as {{c1::negative (-)}}, whereas for a convex mirror it is taken as {{c1::positive (+)}}.`,
        backAnswer: `Concave mirror: Negative (-) focal length. Convex mirror: Positive (+) focal length.`,
        sourceContext: `Board Exam Formula Cheat Sheet • Section ${section.sectionNumber}`,
        interval: 3,
        repetition: 2,
        easinessFactor: 2.7,
        status: 'active',
      },
    ];
  }, [section, chapterName]);

  const [cards, setCards] = useState<DocumentFlashcard[]>(defaultCards);

  // Active cards in current queue
  const activeCards = useMemo(() => {
    return cards.filter((c) => c.status !== 'disabled');
  }, [cards]);

  const currentCard: DocumentFlashcard | undefined = activeCards[currentIndex] || activeCards[0];

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
      if (!currentCard) return;

      let newInterval = currentCard.interval || 1;
      let newRepetition = currentCard.repetition || 0;
      let newEF = currentCard.easinessFactor || 2.5;

      if (action === 'relearn') {
        // SM-2 for failed recall (relearn)
        newRepetition = 0;
        newInterval = 1;
        newEF = Math.max(1.3, Number((newEF - 0.2).toFixed(2)));
        setStudyStats((prev) => ({
          ...prev,
          total: prev.total + 1,
          relearned: prev.relearned + 1,
        }));
      } else {
        // SM-2 for successful recall (understood)
        newRepetition += 1;
        if (newRepetition === 1) {
          newInterval = 1;
        } else if (newRepetition === 2) {
          newInterval = 6;
        } else {
          newInterval = Math.round(newInterval * newEF);
        }
        newEF = Math.min(2.8, Math.max(1.3, Number((newEF + 0.1).toFixed(2))));
        setStudyStats((prev) => ({
          ...prev,
          total: prev.total + 1,
          understood: prev.understood + 1,
        }));
      }

      const nextDueDate = new Date(Date.now() + newInterval * 86400000).toISOString();
      const updatedCard: DocumentFlashcard = {
        ...currentCard,
        interval: newInterval,
        repetition: newRepetition,
        easinessFactor: newEF,
        dueDate: nextDueDate,
        lastReviewed: new Date().toISOString(),
      };

      const updatedAll = cards.map((c) => (c.id === currentCard.id ? updatedCard : c));
      setCards(updatedAll);
      onUpdateCards?.(section.id, updatedAll);

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
    [currentCard, cards, activeCards, currentIndex, onUpdateCards, section.id]
  );

  // Mute / Disable Card handler (Trash/Archive icon)
  const handleDisableCard = useCallback(() => {
    if (!currentCard) return;

    const updatedAll = cards.map((c) =>
      c.id === currentCard.id ? { ...c, status: 'disabled' as const } : c
    );
    setCards(updatedAll);
    onUpdateCards?.(section.id, updatedAll);
    setIsRevealed(false);

    if (activeCards.length <= 1) {
      setSessionCompleted(true);
    } else if (currentIndex >= activeCards.length - 1) {
      setCurrentIndex(0);
    }
  }, [currentCard, cards, activeCards.length, currentIndex, onUpdateCards, section.id]);

  // Keyboard Shortcuts Hook
  useEffect(() => {
    if (!isOpen || sessionCompleted || activeTab !== 'practice') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if focused on text input / textarea
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
  }, [isOpen, sessionCompleted, activeTab, isRevealed, handleEvaluate, onClose]);

  // Handle AI Tutor follow-up query
  const handleSendAITutor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || !currentCard) return;

    const query = userQuery.trim();
    setUserQuery('');

    setAiTutorMessages((prev) => [
      ...prev,
      { sender: 'user', text: query },
      {
        sender: 'ai',
        text: `Here is a deep-dive breakdown of "${currentCard.backAnswer}" in ${section.title}:\n\n` +
          `• **Concept Core**: ${currentCard.sourceContext || 'Curriculum Syllabus Model'}\n` +
          `• **Exam Strategy**: Always verify sign conventions before performing algebraic substitutions. Draw ray diagrams with marked arrows to secure step credit.\n` +
          `• **Memory Anchor**: Link this takeaway directly to the core principle of Section ${section.sectionNumber}.`,
      },
    ]);
  };

  const handleOpenAITutor = () => {
    if (!showAITutor && currentCard) {
      setAiTutorMessages([
        {
          sender: 'ai',
          text: `Hi! I'm your AI Assistant for **${section.title}**. Ask me to explain the derivation, provide a memory hook, or illustrate step-by-step exam strategy for: "${currentCard.backAnswer}".`,
        },
      ]);
    }
    setShowAITutor((prev) => !prev);
  };

  // Add custom card handler
  const handleAddCustomCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    const newCardItem: DocumentFlashcard = {
      id: `fc-custom-${Date.now()}`,
      sectionId: section.id,
      frontPrompt: newFront.trim(),
      backAnswer: newBack.trim(),
      sourceContext: newSource.trim() || `Section ${section.sectionNumber}: ${section.title}`,
      interval: 1,
      repetition: 0,
      easinessFactor: 2.5,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const updated = [...cards, newCardItem];
    setCards(updated);
    onUpdateCards?.(section.id, updated);
    setNewFront('');
    setNewBack('');
    setNewSource('');
    setIsAddingCard(false);
  };

  if (!isOpen) return null;

  // Session progress calculation
  const totalCards = activeCards.length;
  const currentCardNumber = Math.min(currentIndex + 1, totalCards);
  const progressPercent = totalCards > 0 ? Math.round(((currentIndex) / totalCards) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col text-slate-100 overflow-hidden select-none animate-in fade-in duration-200">
      {/* =================================================================== */}
      {/* 1. HEADER BAR */}
      {/* =================================================================== */}
      <header className="h-16 px-4 sm:px-8 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
        {/* Left: Close (X) button returning to [Roadmap] */}
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

          {/* Status chip: "Card X of Y in [Section Title]" */}
          <div className="min-w-0 truncate flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-950/90 text-indigo-300 border border-indigo-700/80 shadow-2xs flex items-center gap-1.5 truncate">
              <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">
                Card {currentCardNumber} of {totalCards} in {section.title}
              </span>
            </span>
          </div>
        </div>

        {/* Right: Mode Switcher (Study vs Manage Deck) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center p-1 rounded-xl bg-slate-800/80 border border-slate-700/70 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('practice')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
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
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'edit'
                  ? 'bg-indigo-600 text-white shadow-2xs font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Cards ({cards.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hairline progress bar indicating session completion */}
      {activeTab === 'practice' && !sessionCompleted && totalCards > 0 && (
        <div className="w-full h-[2px] bg-slate-800 shrink-0 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* =================================================================== */}
      {/* 2 & 3. MAIN CARD CANVAS */}
      {/* =================================================================== */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        {sessionCompleted ? (
          /* ================================================================= */
          /* COMPLETION VIEW */
          /* ================================================================= */
          <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-white">Recall Deck Complete!</h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                All cards in Section {section.sectionNumber} ({section.title}) have been scheduled into SM-2 spaced repetition.
              </p>
            </div>

            {/* Stats Breakdown */}
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-center">
                <div className="text-2xl font-black text-emerald-400">{studyStats.understood}</div>
                <div className="text-[11px] font-bold text-emerald-300/80 uppercase tracking-wider">
                  Understood
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-center">
                <div className="text-2xl font-black text-rose-400">{studyStats.relearned}</div>
                <div className="text-[11px] font-bold text-rose-300/80 uppercase tracking-wider">
                  Relearned
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex(0);
                  setIsRevealed(false);
                  setSessionCompleted(false);
                  setStudyStats({ total: 0, understood: 0, relearned: 0 });
                }}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Practice Again</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Return to Roadmap</span>
              </button>
            </div>
          </div>
        ) : activeTab === 'edit' ? (
          /* ================================================================= */
          /* CARD MANAGER / DECK EDITOR VIEW */
          /* ================================================================= */
          <div className="max-w-2xl w-full space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white">Recall Deck Management</h2>
                <p className="text-xs text-slate-400">Section {section.sectionNumber}: {section.title}</p>
              </div>

              {!isAddingCard && (
                <button
                  type="button"
                  onClick={() => setIsAddingCard(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Card</span>
                </button>
              )}
            </div>

            {/* Add Card Form */}
            {isAddingCard && (
              <form
                onSubmit={handleAddCustomCard}
                className="p-5 rounded-2xl bg-slate-900 border border-indigo-500/40 space-y-3.5 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
                    Add Spaced-Repetition Card
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingCard(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Front Retrieval Prompt (use <code className="text-indigo-400">{'{{c1::answer}}'}</code> for cloze blanks)
                  </label>
                  <textarea
                    rows={2}
                    value={newFront}
                    onChange={(e) => setNewFront(e.target.value)}
                    placeholder="e.g. Concave mirrors form a {{c1::virtual, magnified}} image when object is within focal length."
                    className="w-full text-xs p-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Target Answer
                  </label>
                  <input
                    type="text"
                    value={newBack}
                    onChange={(e) => setNewBack(e.target.value)}
                    placeholder="e.g. Virtual and Magnified"
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Source Citation & Context
                  </label>
                  <input
                    type="text"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    placeholder="e.g. NCERT Page 164 • Ray Diagram Case 6"
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingCard(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
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
                      {card.sourceContext && (
                        <span className="text-[11px] text-slate-500 truncate">
                          {card.sourceContext}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-200">
                      {card.frontPrompt}
                    </p>
                    <p className="text-xs font-bold text-emerald-400">
                      Answer: {card.backAnswer}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = cards.map((c) =>
                        c.id === card.id
                          ? { ...c, status: c.status === 'disabled' ? 'active' : 'disabled' }
                          : c
                      );
                      setCards(updated as DocumentFlashcard[]);
                      onUpdateCards?.(section.id, updated as DocumentFlashcard[]);
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
            {/* Elevated, minimalist central card with smooth transition */}
            <div className="w-full bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-9 shadow-2xl flex flex-col justify-between min-h-[400px] sm:min-h-[460px] relative transition-all duration-300 hover:border-slate-700/80">
              {/* Concept Breadcrumb at top of the card */}
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800/70">
                <nav aria-label="Concept Breadcrumb" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 text-[11px] font-bold tracking-tight">
                  <span className="text-indigo-400 font-black">{subjectName}</span>
                  <ChevronRight className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">{chapterName}</span>
                  <ChevronRight className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span className="text-indigo-200 font-black truncate max-w-[120px] sm:max-w-[180px]">
                    {section.title}
                  </span>
                </nav>

                {/* SM-2 Metadata pill */}
                <div className="text-[10px] font-mono text-slate-400 hidden sm:flex items-center gap-2">
                  <span>Rep: {currentCard?.repetition || 0}</span>
                  <span>•</span>
                  <span>Interval: {currentCard?.interval || 1}d</span>
                  <span>•</span>
                  <span>EF: {currentCard?.easinessFactor || 2.5}</span>
                </div>
              </div>

              {/* CARD BODY: FRONT OR REVEALED BACK FACE */}
              <div className="my-auto py-6 space-y-6">
                {/* Front Face: Retrieval Prompt or Fill-in-the-blank text */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isRevealed ? 'Retrieval Prompt' : 'Active Recall Prompt'}</span>
                    </span>

                    {!isRevealed && (
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 border border-slate-700 rounded text-slate-300">
                          Space
                        </kbd>
                        <span>to check recall</span>
                      </span>
                    )}
                  </div>

                  <div className="text-base sm:text-lg font-medium leading-relaxed">
                    {currentCard && renderPromptContent(currentCard.frontPrompt, isRevealed)}
                  </div>
                </div>

                {/* ========================================================= */}
                {/* 3. REVEALED STATE (BACK FACE) */}
                {/* ========================================================= */}
                {isRevealed && currentCard && (
                  <div className="pt-5 border-t border-slate-800/80 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Model Explanation with Source Citation */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/40 border border-emerald-800/80 space-y-2 shadow-inner">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Model Explanation</span>
                        </div>

                        {/* Source citation */}
                        {currentCard.sourceContext && (
                          <div className="text-[10px] font-mono text-emerald-300/80 flex items-center gap-1 truncate max-w-[240px]">
                            <BookOpen className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">{currentCard.sourceContext}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-base sm:text-lg font-black text-white leading-snug">
                        {currentCard.backAnswer}
                      </div>
                    </div>

                    {/* Dedicated "Why It Matters" Takeaway Box */}
                    <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/70 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-indigo-400 text-[10px] font-black uppercase tracking-wider">
                        <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Why It Matters</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                        Examiners test this specific principle to differentiate rote learners from students who grasp foundational mechanics. Remembering sign conventions and ray orientation prevents costly point deductions in multi-step questions.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* CARD BOTTOM ACTION CONTROLS */}
              <div className="pt-5 border-t border-slate-800/70 flex flex-col gap-3">
                {!isRevealed ? (
                  /* FRONT FACE ACTION: "Check Your Recall" (Hotkey: Space / Enter) */
                  <button
                    type="button"
                    onClick={() => setIsRevealed(true)}
                    className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm sm:text-base transition cursor-pointer flex items-center justify-center gap-3 shadow-xl hover:shadow-indigo-500/20 active:scale-[0.99]"
                  >
                    <Eye className="w-5 h-5 text-indigo-200" />
                    <span>Check Your Recall</span>
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
                  /* REVEALED HORIZONTAL ACTION BAR */
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      {/* a) Left utility button: "Mute / Disable Card" (Trash/Archive icon) */}
                      <button
                        type="button"
                        onClick={handleDisableCard}
                        className="p-3.5 rounded-2xl border border-slate-700/80 bg-slate-800/60 hover:bg-rose-950/40 hover:border-rose-800 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                        title="Mute / Disable Card (Removes from future review queue)"
                      >
                        <VolumeX className="w-4 h-4" />
                      </button>

                      {/* b) Action button 1: "Relearn" (soft rose/red with subtle ring, Hotkey: '1' or 'J') */}
                      <button
                        type="button"
                        onClick={() => handleEvaluate('relearn')}
                        className="flex-1 py-3.5 px-4 rounded-2xl border border-rose-500/50 ring-2 ring-rose-500/20 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 font-black text-xs sm:text-sm transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 shadow-md active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-1.5">
                          <RotateCcw className="w-4 h-4 text-rose-400" />
                          <span>Relearn</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-rose-300/80 font-normal">
                          <span>(1 or J)</span>
                          <span>•</span>
                          <span>1d</span>
                        </div>
                      </button>

                      {/* c) Action button 2: "Understood" (clean emerald green, Hotkey: '2' or 'K') */}
                      <button
                        type="button"
                        onClick={() => handleEvaluate('understood')}
                        className="flex-1 py-3.5 px-4 rounded-2xl border border-emerald-500/50 ring-2 ring-emerald-500/20 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 font-black text-xs sm:text-sm transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 shadow-md active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                          <span>Understood</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-300/80 font-normal">
                          <span>(2 or K)</span>
                          <span>•</span>
                          <span>+interval</span>
                        </div>
                      </button>

                      {/* d) Right utility button: "Deep Dive with AI Assistant" */}
                      <button
                        type="button"
                        onClick={handleOpenAITutor}
                        className="p-3.5 rounded-2xl border border-indigo-700/70 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 hover:text-white transition cursor-pointer"
                        title="Deep Dive with AI Assistant"
                      >
                        <Brain className="w-4 h-4 text-indigo-400" />
                      </button>
                    </div>

                    {/* Bottom AI Deep Dive pill bar */}
                    <button
                      type="button"
                      onClick={handleOpenAITutor}
                      className="w-full py-2.5 px-4 rounded-xl border border-indigo-700/60 bg-indigo-950/30 hover:bg-indigo-950/60 text-indigo-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Brain className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Deep Dive with AI Assistant</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* 4. AI ASSISTANT DEEP DIVE SLIDE-OVER DRAWER */}
      {/* =================================================================== */}
      {showAITutor && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-900/50 border border-indigo-700/60 text-indigo-400 flex items-center justify-center">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white">AI Assistant Deep Dive</h3>
                <p className="text-[10px] text-slate-400">Contextual flashcard explanations & mnemonics</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAITutor(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conversation history */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs leading-relaxed">
            {aiTutorMessages.map((msg, i) => (
              <div
                key={i}
                className={`p-3.5 rounded-2xl max-w-[90%] whitespace-pre-line ${
                  msg.sender === 'user'
                    ? 'ml-auto bg-indigo-600 text-white font-medium'
                    : 'mr-auto bg-slate-800 border border-slate-700 text-slate-200'
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {/* Prompt quick suggestions */}
          <div className="p-2 border-t border-slate-800 bg-slate-950/60 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setUserQuery('Can you give me an easy mnemonic or memory hook for this?');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-indigo-300 cursor-pointer"
            >
              💡 Memory hook
            </button>
            <button
              type="button"
              onClick={() => {
                setUserQuery('Why is this formula derived this way?');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-indigo-300 cursor-pointer"
            >
              📐 Step-by-step derivation
            </button>
            <button
              type="button"
              onClick={() => {
                setUserQuery('What common mistakes do students make on exam day for this?');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-indigo-300 cursor-pointer"
            >
              ⚠️ Exam traps
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendAITutor} className="p-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Ask a question about this card..."
              className="flex-1 text-xs p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
