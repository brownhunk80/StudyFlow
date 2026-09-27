import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Loader2,
  BookOpen,
  Volume2,
  VolumeX,
  Plus,
  ArrowRight,
  Clock,
  Send,
  Award,
  Layers,
  Check,
  Flame,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Section, DocumentFlashcard } from '../../types';
import { BlurtEvaluationResult } from '../../api/checkpoints/evaluate-blurt';

interface SectionBlurtingEvaluatorProps {
  section: Section;
  chapterName: string;
  subjectName?: string;
  onClose?: () => void;
  onProceedToCheckpoint?: () => void;
  onProceedToRecallDeck?: () => void;
  onAddFlashcard?: (card: Partial<DocumentFlashcard>) => void;
}

export const SectionBlurtingEvaluator: React.FC<SectionBlurtingEvaluatorProps> = ({
  section,
  chapterName,
  subjectName = 'Science',
  onClose,
  onProceedToCheckpoint,
  onProceedToRecallDeck,
  onAddFlashcard,
}) => {
  // Persistence key for this section's blurt
  const storageKey = `milestone_blurt_${section.id}`;

  const [blurtText, setBlurtText] = useState('');
  const [evaluation, setEvaluation] = useState<BlurtEvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Dictation / Speech Recognition
  const [isListening, setIsListening] = useState(false);
  const [dictationTime, setDictationTime] = useState(0);
  const recognitionRef = useRef<any>(null);
  const dictationTimerRef = useRef<any>(null);

  // Optional Study Sprint Timer (3m, 5m)
  const [timerDuration, setTimerDuration] = useState<number | null>(null); // seconds
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Expanded tabs/accordion in results
  const [activeResultTab, setActiveResultTab] = useState<'all' | 'covered' | 'missed' | 'misconceptions'>('all');
  const [addedCardIds, setAddedCardIds] = useState<Record<string, boolean>>({});

  // Load saved blurt session on mount / section change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.blurtText) setBlurtText(parsed.blurtText);
        if (parsed.evaluation) setEvaluation(parsed.evaluation);
      } else {
        setBlurtText('');
        setEvaluation(null);
      }
    } catch (err) {
      console.warn('Could not read saved blurt:', err);
    }
  }, [section.id]);

  // Handle optional sprint timer countdown
  useEffect(() => {
    let interval: any = null;
    if (isTimerActive && timerRemaining !== null && timerRemaining > 0) {
      interval = setInterval(() => {
        setTimerRemaining((prev) => (prev !== null && prev > 1 ? prev - 1 : 0));
      }, 1000);
    } else if (timerRemaining === 0 && isTimerActive) {
      setIsTimerActive(false);
      // Play gentle ding
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } catch {}
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timerRemaining]);

  // Web Speech API initialization
  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      clearInterval(dictationTimerRef.current);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setEvalError('Speech recognition is not supported in this browser. Please type your blurt.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setDictationTime(0);
        dictationTimerRef.current = setInterval(() => {
          setDictationTime((prev) => prev + 1);
        }, 1000);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript + ' ';
        }
        setBlurtText(currentTranscript.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
          clearInterval(dictationTimerRef.current);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        clearInterval(dictationTimerRef.current);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Speech recognition start failed:', err);
      setIsListening(false);
    }
  };

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      clearInterval(dictationTimerRef.current);
    };
  }, []);

  // Compute text statistics
  const wordCount = blurtText.trim() ? blurtText.trim().split(/\s+/).length : 0;
  const charCount = blurtText.length;

  // Submit Blurt for evaluation
  const handleEvaluateBlurt = async () => {
    if (wordCount < 5) {
      setEvalError('Please write or dictate at least 5 words to evaluate your recall.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setIsEvaluating(true);
    setEvalError(null);

    try {
      const summaryText =
        typeof section.summary === 'string'
          ? section.summary
          : (section.summary as any)?.detailed || '';
      const excerpt = [
        section.sectionTextExcerpt,
        summaryText,
        Array.isArray(section.summaries)
          ? section.summaries.map((s) => s.contentMarkdown).join('\n\n')
          : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const res = await fetch('/api/checkpoints/evaluate-blurt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterTitle: chapterName,
          milestoneTitle: section.title,
          subjectName,
          sectionExcerpt: excerpt.slice(0, 18000),
          studentBlurt: blurtText,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Evaluation request failed');
      }

      const result: BlurtEvaluationResult = await res.json();
      setEvaluation(result);

      // Save to localStorage
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            blurtText,
            evaluation: result,
            timestamp: new Date().toISOString(),
          })
        );
      } catch {}

      // Trigger confetti if high coverage
      if (result.coverageScore >= 80) {
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      console.error('Blurt evaluation error:', err);
      setEvalError(err.message || 'Failed to analyze your blurt. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Convert a missed point to a custom flashcard
  const handleAddAsFlashcard = (concept: string, whyImportant: string, hint: string) => {
    const cardId = `blurt-fc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newCard: DocumentFlashcard = {
      id: cardId,
      sectionId: section.id,
      frontPrompt: `What is the key principle regarding: ${concept}?`,
      backAnswer: `${whyImportant}\n\n*Review Clue:* ${hint}`,
      sourceContext: `Generated from blurting review gap in "${section.title}"`,
      interval: 1,
      repetition: 0,
      easinessFactor: 2.5,
      status: 'active',
      dueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Save into localStorage flashcards
    try {
      const stored = localStorage.getItem(`milestone_flashcards_${section.id}`);
      let cards = stored ? JSON.parse(stored) : [];
      cards.push(newCard);
      localStorage.setItem(`milestone_flashcards_${section.id}`, JSON.stringify(cards));
      window.dispatchEvent(new CustomEvent('studyflow_cards_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('Could not save flashcard:', e);
    }

    if (onAddFlashcard) {
      onAddFlashcard(newCard);
    }

    setAddedCardIds((prev) => ({ ...prev, [concept]: true }));
  };

  const handleResetBlurt = () => {
    setBlurtText('');
    setEvaluation(null);
    setEvalError(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-6 animate-in fade-in duration-200">
      {/* 1. Blurting Context & Header Kicker */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Active Recall Blurt
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Scientific "Brain Dump" Method
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Blurt Out Everything You Know About {section.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Close your notes and write or speak all facts, formulas, principles, and definitions you recall.
            The AI examiner will analyze your coverage against the section text to find exact blind spots.
          </p>
        </div>

        {/* Sprint Timer Controls */}
        <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 rounded-xl shadow-2xs">
          <Clock className="w-4 h-4 text-slate-400 ml-1.5" />
          {timerRemaining !== null ? (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-md ${
                timerRemaining <= 30 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse' : 'text-slate-700 dark:text-slate-200'
              }`}>
                {formatTimer(timerRemaining)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsTimerActive(false);
                  setTimerRemaining(null);
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-0.5"
              >
                Reset
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Sprint:</span>
              <button
                type="button"
                onClick={() => {
                  setTimerDuration(180);
                  setTimerRemaining(180);
                  setIsTimerActive(true);
                }}
                className="px-2 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              >
                3m
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerDuration(300);
                  setTimerRemaining(300);
                  setIsTimerActive(true);
                }}
                className="px-2 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              >
                5m
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Blurting Input Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
        {/* Workspace Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-600 shadow-md animate-pulse'
                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Recording ({formatTimer(dictationTime)})</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Voice Dictation</span>
                </>
              )}
            </button>

            {isListening && (
              <span className="text-[11px] font-medium text-rose-500 animate-pulse hidden sm:inline">
                Listening... Speak freely and your words will appear below.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
            <span>
              <strong className="text-slate-700 dark:text-slate-200 tabular-nums">{wordCount}</strong> words
            </span>
            <span>•</span>
            <span>
              <strong className="text-slate-700 dark:text-slate-200 tabular-nums">{charCount}</strong> chars
            </span>
            {blurtText && (
              <button
                type="button"
                onClick={handleResetBlurt}
                className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-1 transition ml-2 cursor-pointer"
                title="Clear current blurt"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            value={blurtText}
            onChange={(e) => setBlurtText(e.target.value)}
            disabled={isEvaluating}
            placeholder={`Type or speak everything you recall about "${section.title}" from memory... \n\nExample prompts to get started:\n• What are the core definitions, formulas, or rules?\n• How does the main mechanism or process work step-by-step?\n• What are key exceptions, examples, or conditions?`}
            className="w-full h-52 sm:h-64 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-relaxed placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition resize-y font-sans"
          />
        </div>

        {/* Action button */}
        <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {wordCount === 0
              ? '💡 Tip: Unfiltered recall is proven to boost long-term retention by 50% compared to re-reading.'
              : wordCount < 30
              ? 'Keep going! Try to explain why the concepts work.'
              : 'Great active recall volume. Ready for AI check!'}
          </div>

          <div className="flex items-center gap-2">
            {onProceedToCheckpoint && (
              <button
                type="button"
                onClick={onProceedToCheckpoint}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              >
                <span>Skip to Checkpoint 1</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            )}

            <button
              type="button"
              disabled={isEvaluating || wordCount < 5}
              onClick={handleEvaluateBlurt}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-indigo-500/20 transition cursor-pointer"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Comparing with Syllabus...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>{evaluation ? 'Re-Analyze My Blurt' : 'Check Against Section Content'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {evalError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{evalError}</span>
          </div>
        )}
      </div>

      {/* 3. Evaluation Results Breakdown */}
      {evaluation && (
        <div className="space-y-5 animate-in slide-in-from-bottom-3 duration-300">
          {/* Main Score Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div className="flex items-center gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black border shadow-inner ${
                    evaluation.coverageScore >= 80
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : evaluation.coverageScore >= 50
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                  }`}
                >
                  <span className="text-2xl tabular-nums">{evaluation.coverageScore}%</span>
                  <span className="text-[9px] uppercase font-bold tracking-wider">Recall</span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        evaluation.coverageScore >= 80
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : evaluation.coverageScore >= 50
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {evaluation.coverageScore >= 80
                        ? '● High Section Mastery'
                        : evaluation.coverageScore >= 50
                        ? '▲ Moderate Coverage'
                        : '■ Needs Reinforcement'}
                    </span>
                    <span className="text-xs text-slate-400">
                      Evaluated {new Date(evaluation.evaluatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {evaluation.qualitativeSummary}
                  </h4>
                </div>
              </div>

              {/* Metric Tallies */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-center">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {evaluation.pointsCovered.length} Covered
                  </div>
                </div>
                <div className="px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-center">
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {evaluation.missedPoints.length} Missed
                  </div>
                </div>
                {evaluation.misconceptions.length > 0 && (
                  <div className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-center">
                    <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      {evaluation.misconceptions.length} Fixes
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Sub-Tabs */}
            <div className="flex items-center gap-1.5 pt-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveResultTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeResultTab === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Feedback ({evaluation.pointsCovered.length + evaluation.missedPoints.length + evaluation.misconceptions.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveResultTab('covered')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  activeResultTab === 'covered'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Points Covered ({evaluation.pointsCovered.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveResultTab('missed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  activeResultTab === 'missed'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Missed Gaps ({evaluation.missedPoints.length})</span>
              </button>
              {evaluation.misconceptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveResultTab('misconceptions')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    activeResultTab === 'misconceptions'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Misconceptions ({evaluation.misconceptions.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Detailed Cards List */}
          <div className="grid grid-cols-1 gap-4">
            {/* 1. Accurately Recalled Points */}
            {(activeResultTab === 'all' || activeResultTab === 'covered') && evaluation.pointsCovered.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    Concepts Accurately Recalled
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {evaluation.pointsCovered.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <h5 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                          {item.point}
                        </h5>
                      </div>
                      <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 pl-6 leading-relaxed">
                        {item.explanation}
                      </p>
                      {item.studentQuote && (
                        <div className="ml-6 mt-1 p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] text-slate-600 dark:text-slate-400 italic">
                          "{item.studentQuote}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Missed Concepts & Knowledge Gaps */}
            {(activeResultTab === 'all' || activeResultTab === 'missed') && evaluation.missedPoints.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      Omitted Syllabus Gaps & High-Yield Facts
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400">Convert gaps to flashcards for review</span>
                </div>

                <div className="space-y-3">
                  {evaluation.missedPoints.map((gap, idx) => {
                    const isAdded = addedCardIds[gap.concept];
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 max-w-2xl">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                            <h5 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                              {gap.concept}
                            </h5>
                          </div>
                          <p className="text-xs text-amber-800/90 dark:text-amber-300/90 pl-4 leading-relaxed">
                            {gap.whyImportant}
                          </p>
                          <div className="pl-4 text-[11px] text-amber-700/80 dark:text-amber-400/80 font-medium">
                            💡 Clue: {gap.hintForReview}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddAsFlashcard(gap.concept, gap.whyImportant, gap.hintForReview)}
                          disabled={isAdded}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer border ${
                            isAdded
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                              : 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Card Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 text-amber-600" />
                              <span>Make Flashcard</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Misconceptions & Corrections */}
            {(activeResultTab === 'all' || activeResultTab === 'misconceptions') && evaluation.misconceptions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    Misconceptions & Direct Corrections
                  </h4>
                </div>

                <div className="space-y-3">
                  {evaluation.misconceptions.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-rose-200/60 dark:border-rose-800/40 space-y-1">
                          <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">
                            What you stated:
                          </span>
                          <p className="text-xs text-slate-800 dark:text-slate-200 italic font-medium">
                            "{item.studentClaim}"
                          </p>
                        </div>

                        <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40 space-y-1">
                          <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                            Textbook Reality:
                          </span>
                          <p className="text-xs text-emerald-900 dark:text-emerald-200 font-semibold">
                            {item.correction}
                          </p>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                        <strong>Rule:</strong> {item.canonicalRule}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Actionable Next Steps */}
            {evaluation.nextStepsAdvice && evaluation.nextStepsAdvice.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Recommended Next Steps
                </h5>
                <ul className="space-y-1.5">
                  {evaluation.nextStepsAdvice.map((step, idx) => (
                    <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 5. Direct Proceed to Checkpoint 1 CTA */}
            {onProceedToCheckpoint && (
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h5 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                    Step 0 Recall Blurt Complete!
                  </h5>
                  <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80">
                    Now test yourself against official checkpoint questions for this section.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onProceedToCheckpoint}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-md hover:shadow-indigo-600/20 shrink-0 self-start sm:self-center"
                >
                  <span>Continue to Checkpoint 1</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
