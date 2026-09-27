import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  RotateCw,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Zap,
  RotateCcw,
  Keyboard,
  Brain,
  Mic,
  MicOff,
  Volume2,
  Loader2,
  AlertCircle,
  ThumbsUp,
  Check,
  Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Flashcard, RecallRating } from '../types';
import { calculateSM2 } from '../utils/spacedRepetition';
import { VoiceRecallEvaluationResponse } from '../api/recall/evaluate-voice-answer';

interface ActiveRecallSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Flashcard[];
  deckTitle: string;
  onCardReviewed?: (cardId: string, updatedFields: Partial<Flashcard>, rating: RecallRating) => void;
  onRateCard?: (cardId: string, rating: RecallRating, updatedFields?: Partial<Flashcard>) => void;
  onSessionComplete?: (totalReviewed: number, xpEarned: number) => void;
}

export const ActiveRecallSessionModal: React.FC<ActiveRecallSessionModalProps> = ({
  isOpen,
  onClose,
  cards = [],
  deckTitle,
  onCardReviewed,
  onRateCard,
  onSessionComplete,
}) => {
  const safeCards = Array.isArray(cards) ? cards : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  // Voice Answering & SpeechRecognition State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [isEvaluatingVoice, setIsEvaluatingVoice] = useState(false);
  const [voiceEvaluation, setVoiceEvaluation] = useState<VoiceRecallEvaluationResponse | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const recordingTimerRef = useRef<any>(null);

  // Check SpeechRecognition support on mount
  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSpeechSupported(Boolean(SpeechRecognitionAPI));
  }, []);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setReviewedCount(0);
      setSessionCompleted(false);
      setSessionStats({ again: 0, hard: 0, good: 0, easy: 0 });
      setSpokenTranscript('');
      setVoiceEvaluation(null);
      setVoiceError(null);
      setIsVoiceActive(false);
    }
  }, [isOpen, safeCards.length]);

  const currentCard = safeCards[currentIndex] || safeCards[0] || null;

  // Cleanup speech recognition on unmount or card switch
  const stopVoiceRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsVoiceActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopVoiceRecording();
    };
  }, [stopVoiceRecording]);

  // Evaluate spoken answer with AI
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
          front: currentCard.front || (currentCard as any).question || 'Question',
          back: currentCard.back || (currentCard as any).answer || 'Answer',
          notes: currentCard.notes || '',
          explanation: (currentCard as any).explanation || '',
          subject: currentCard.subject || 'General',
          chapter: currentCard.chapter || '',
          spokenTranscript: transcriptText.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Evaluation failed (HTTP ${response.status})`);
      }

      const evalData: VoiceRecallEvaluationResponse = await response.json();
      setVoiceEvaluation(evalData);
      setIsFlipped(true); // Automatically reveal answer with AI feedback

      if (evalData.accuracyScore >= 85) {
        confetti({
          particleCount: 40,
          spread: 50,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      console.error('[VoiceRecall] Evaluation error:', err);
      setVoiceError('Could not connect to AI evaluator. Your transcript is saved below.');
      setIsFlipped(true);
    } finally {
      setIsEvaluatingVoice(false);
    }
  };

  // Start Voice Answering
  const startVoiceRecording = () => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setVoiceError('Speech recognition is not supported in this browser. You can view the answer directly.');
      return;
    }

    setSpokenTranscript('');
    setVoiceEvaluation(null);
    setVoiceError(null);
    setRecordingSeconds(0);

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i]?.[0]?.transcript) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        setSpokenTranscript(transcript.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('[SpeechRecognition] Error:', event.error);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission was denied. Please allow microphone access in your browser.');
        }
        stopVoiceRecording();
      };

      recognition.onend = () => {
        setIsVoiceActive(false);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsVoiceActive(true);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('[SpeechRecognition] Start failed:', err);
      setVoiceError('Could not start microphone. Please check browser permissions.');
      stopVoiceRecording();
    }
  };

  const handleToggleVoice = () => {
    if (isVoiceActive) {
      stopVoiceRecording();
      if (spokenTranscript.trim().length > 0) {
        evaluateSpokenResponse(spokenTranscript);
      }
    } else {
      startVoiceRecording();
    }
  };

  const handleRate = (rating: RecallRating) => {
    if (!currentCard) return;

    stopVoiceRecording();

    // Execute the underlying SM-2 spaced repetition algorithm
    const updated = calculateSM2(currentCard, rating);
    if (typeof onCardReviewed === 'function') {
      onCardReviewed(currentCard.id, updated, rating);
    }
    if (typeof onRateCard === 'function') {
      onRateCard(currentCard.id, rating, updated);
    }

    setSessionStats((prev) => ({
      ...prev,
      [rating]: prev[rating] + 1,
    }));

    const nextCount = reviewedCount + 1;
    setReviewedCount(nextCount);

    if (currentIndex + 1 < safeCards.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
      setSpokenTranscript('');
      setVoiceEvaluation(null);
      setVoiceError(null);
    } else {
      // Session finished
      setSessionCompleted(true);
      const earnedXP = nextCount * 5 + 25;
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.5 },
      });
      if (onSessionComplete) {
        onSessionComplete(nextCount, earnedXP);
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || sessionCompleted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isVoiceActive) {
          handleToggleVoice();
        } else {
          setIsFlipped((prev) => !prev);
        }
      } else if (e.key.toLowerCase() === 'v' && !isFlipped) {
        e.preventDefault();
        handleToggleVoice();
      } else if (isFlipped) {
        if (e.key === '1') handleRate('again');
        if (e.key === '2') handleRate('hard');
        if (e.key === '3') handleRate('good');
        if (e.key === '4') handleRate('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFlipped, sessionCompleted, isVoiceActive, spokenTranscript]);

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setReviewedCount(0);
    setSessionCompleted(false);
    setSessionStats({ again: 0, hard: 0, good: 0, easy: 0 });
    setSpokenTranscript('');
    setVoiceEvaluation(null);
    setVoiceError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-auto flex flex-col transition-all">
        {/* Top Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {deckTitle || 'Recall Session'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!sessionCompleted && safeCards.length > 0 && (
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono-digits bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
                {currentIndex + 1} / {safeCards.length}
              </span>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col justify-between space-y-5">
          {sessionCompleted ? (
            /* ================================================================= */
            /* 1. COMPLETION SUMMARY                                             */
            /* ================================================================= */
            <div className="text-center py-6 space-y-6 my-auto animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Session Complete! 🎉
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  You reviewed {reviewedCount} {reviewedCount === 1 ? 'flashcard' : 'flashcards'} with spaced repetition.
                </p>
              </div>

              {/* Clean breakdown */}
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-center">
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono-digits">
                    {sessionStats.good + sessionStats.easy}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    Mastered & Good
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                  <div className="text-xl font-black text-slate-700 dark:text-slate-300 font-mono-digits">
                    {sessionStats.again + sessionStats.hard}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    To Review Soon
                  </div>
                </div>
              </div>

              {/* XP Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 text-xs font-bold text-amber-800 dark:text-amber-300">
                <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span>+{reviewedCount * 5 + 25} XP Earned</span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 max-w-sm mx-auto">
                <button
                  onClick={onClose}
                  className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-xs sm:text-sm transition cursor-pointer shadow-sm"
                >
                  DONE
                </button>

                <button
                  onClick={handleRestart}
                  className="w-full py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4 text-slate-500" />
                  <span>REVIEW AGAIN</span>
                </button>
              </div>
            </div>
          ) : safeCards.length === 0 || !currentCard ? (
            /* Empty State */
            <div className="text-center py-12 space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                All caught up!
              </h3>
              <p className="text-xs text-slate-400">
                No items are due for review in this selection right now.
              </p>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                DONE
              </button>
            </div>
          ) : (
            /* ================================================================= */
            /* 2. ACTIVE FLASHCARD INTERACTION WITH SPEECH RECOGNITION           */
            /* ================================================================= */
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / safeCards.length) * 100}%` }}
                />
              </div>

              {/* Subject & Chapter tag */}
              <div className="text-xs font-bold text-slate-400 truncate flex items-center justify-between">
                <div>
                  <span>{currentCard.subject || 'General'}</span>
                  {currentCard.chapter && (
                    <>
                      <span className="mx-1.5 text-slate-300 dark:text-slate-600">•</span>
                      <span>{currentCard.chapter}</span>
                    </>
                  )}
                </div>

                {isSpeechSupported && !isFlipped && (
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Mic className="w-3 h-3" /> Voice Answering Ready
                  </span>
                )}
              </div>

              {/* Card Container */}
              <div
                className={`relative min-h-[220px] rounded-3xl p-5 sm:p-6 border-2 transition-all flex flex-col justify-between ${
                  isFlipped
                    ? 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    : 'bg-white dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-800'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Header Label */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      {isFlipped ? 'RECALL VERIFICATION' : 'QUESTION PROMPT'}
                    </span>

                    {!isFlipped && (
                      <span className="text-[11px] font-medium text-slate-400">
                        {isVoiceActive ? 'Listening to your voice...' : 'Recall answer or speak below'}
                      </span>
                    )}
                  </div>

                  {/* Question Prompt */}
                  <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-relaxed whitespace-pre-line">
                    {currentCard.front || (currentCard as any).question}
                  </div>

                  {/* Retrieval Hint */}
                  {!isFlipped && currentCard.clozeHint && (
                    <div>
                      {showHint ? (
                        <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 text-xs font-semibold text-amber-800 dark:text-amber-300">
                          💡 Hint: {currentCard.clozeHint}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowHint(true)}
                          className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Need a hint?</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* ========================================================= */}
                  {/* LIVE VOICE RECORDING & TRANSCRIPTION INTERACTION          */}
                  {/* ========================================================= */}
                  {!isFlipped && isVoiceActive && (
                    <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                          </span>
                          <span className="text-xs font-black text-indigo-900 dark:text-indigo-200">
                            Recording Spoken Explanation...
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {recordingSeconds}s
                        </span>
                      </div>

                      {/* Live Audio Transcript Box */}
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 min-h-[50px] text-xs text-slate-800 dark:text-slate-200 italic leading-relaxed">
                        {spokenTranscript || (
                          <span className="text-slate-400 dark:text-slate-500 not-italic">
                            Start speaking your explanation clearly into your microphone...
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={handleToggleVoice}
                          disabled={isEvaluatingVoice}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                        >
                          {isEvaluatingVoice ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Evaluating with AI...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Done Speaking & Check Answer</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={stopVoiceRecording}
                          className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Voice Error Notification */}
                  {voiceError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{voiceError}</span>
                    </div>
                  )}

                  {/* ========================================================= */}
                  {/* FLIPPED: AI VOICE EVALUATION ACCURACY & FEEDBACK          */}
                  {/* ========================================================= */}
                  {isFlipped && (
                    <div className="space-y-4 pt-2 animate-in fade-in-50 duration-200">
                      {/* AI Voice Evaluation Banner (if voice was used) */}
                      {voiceEvaluation && (
                        <div className="p-4 rounded-2xl bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 space-y-3">
                          {/* Accuracy Score Header */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                              <span className="text-xs font-black text-indigo-950 dark:text-indigo-200">
                                AI Voice Accuracy Feedback
                              </span>
                            </div>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                                voiceEvaluation.accuracyScore >= 85
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                  : voiceEvaluation.accuracyScore >= 65
                                  ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
                                  : voiceEvaluation.accuracyScore >= 45
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                              }`}
                            >
                              {voiceEvaluation.accuracyScore}% · {voiceEvaluation.verdictLabel}
                            </span>
                          </div>

                          {/* Student Spoken Transcript */}
                          <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                            <span className="font-bold text-slate-500 dark:text-slate-400 block text-[10px] uppercase mb-0.5">
                              You Explained:
                            </span>
                            <span className="italic">"{voiceEvaluation.spokenTranscript}"</span>
                          </div>

                          {/* Instant Feedback Text */}
                          <p className="text-xs text-indigo-950 dark:text-indigo-100 font-medium leading-relaxed">
                            💡 {voiceEvaluation.instantFeedback}
                          </p>

                          {/* Key Points Covered vs Missed */}
                          {(voiceEvaluation.keyPointsCovered?.length > 0 || voiceEvaluation.keyPointsMissed?.length > 0) && (
                            <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              {voiceEvaluation.keyPointsCovered?.length > 0 && (
                                <div className="space-y-1">
                                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                    ✓ Captured Concepts:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {voiceEvaluation.keyPointsCovered.map((kp, i) => (
                                      <span key={i} className="px-2 py-0.5 bg-emerald-100/80 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-md font-semibold">
                                        {kp}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {voiceEvaluation.keyPointsMissed?.length > 0 && (
                                <div className="space-y-1">
                                  <span className="font-bold text-amber-700 dark:text-amber-400">
                                    Missing Keywords:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {voiceEvaluation.keyPointsMissed.map((kp, i) => (
                                      <span key={i} className="px-2 py-0.5 bg-amber-100/80 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-md font-semibold">
                                        {kp}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Model Textbook Answer */}
                      <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          Model Reference Answer
                        </span>
                        <div className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed whitespace-pre-line">
                          {currentCard.back || (currentCard as any).answer}
                        </div>
                      </div>

                      {/* Notes / Key takeaway */}
                      {currentCard.notes && (
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300">
                          📖 <strong>Nuance:</strong> {currentCard.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Subtext instruction on front side */}
                {!isFlipped && !isVoiceActive && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                    <span>Press Space to flip, or V to speak</span>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px]">
                      <Keyboard className="w-3 h-3" /> Space / V
                    </span>
                  </div>
                )}
              </div>

              {/* ============================================================= */}
              {/* ACTION CONTROLS                                               */}
              {/* ============================================================= */}
              {!isFlipped ? (
                /* Step 3: Speak Answer OR Show Answer */
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Voice Answer Button with Mic */}
                    {isSpeechSupported && (
                      <button
                        type="button"
                        onClick={handleToggleVoice}
                        className={`py-3.5 px-4 rounded-2xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                          isVoiceActive
                            ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none'
                        }`}
                      >
                        {isVoiceActive ? (
                          <>
                            <MicOff className="w-4 h-4" />
                            <span>Stop Speaking ({recordingSeconds}s)</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4" />
                            <span>Speak Your Answer (V)</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Standard Show Answer Button */}
                    <button
                      type="button"
                      onClick={() => setIsFlipped(true)}
                      className={`py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
                        !isSpeechSupported ? 'w-full' : ''
                      }`}
                    >
                      <RotateCw className="w-4 h-4 text-slate-500" />
                      <span>Reveal Answer (Space)</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 4 & 5: RATE/RECALL → NEXT */
                <div className="space-y-3">
                  {/* AI Suggested Rating Quick-Action */}
                  {voiceEvaluation && (
                    <div className="flex items-center justify-between p-2.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/60">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>AI Suggests: <strong>{voiceEvaluation.suggestedRating.toUpperCase()}</strong></span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRate(voiceEvaluation.suggestedRating as RecallRating)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept & Next Card</span>
                      </button>
                    </div>
                  )}

                  <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">
                    RATE YOUR MEMORY RETRIEVAL:
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {/* Again (Forgot) */}
                    <button
                      onClick={() => handleRate('again')}
                      className={`py-3 px-1 rounded-2xl border text-rose-600 dark:text-rose-300 flex flex-col items-center justify-center transition cursor-pointer active:scale-95 ${
                        voiceEvaluation?.suggestedRating === 'again'
                          ? 'bg-rose-100 dark:bg-rose-900/80 border-rose-400 ring-2 ring-rose-400'
                          : 'bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border-rose-200 dark:border-rose-900/60'
                      }`}
                    >
                      <span className="text-xs font-black">Again [1]</span>
                      <span className="text-[10px] opacity-75 font-semibold mt-0.5">Forgot</span>
                    </button>

                    {/* Hard (Struggled) */}
                    <button
                      onClick={() => handleRate('hard')}
                      className={`py-3 px-1 rounded-2xl border text-amber-600 dark:text-amber-300 flex flex-col items-center justify-center transition cursor-pointer active:scale-95 ${
                        voiceEvaluation?.suggestedRating === 'hard'
                          ? 'bg-amber-100 dark:bg-amber-900/80 border-amber-400 ring-2 ring-amber-400'
                          : 'bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border-amber-200 dark:border-amber-900/60'
                      }`}
                    >
                      <span className="text-xs font-black">Hard [2]</span>
                      <span className="text-[10px] opacity-75 font-semibold mt-0.5">Struggled</span>
                    </button>

                    {/* Good (Remembered) */}
                    <button
                      onClick={() => handleRate('good')}
                      className={`py-3 px-1 rounded-2xl border text-indigo-600 dark:text-indigo-300 flex flex-col items-center justify-center transition cursor-pointer active:scale-95 ${
                        voiceEvaluation?.suggestedRating === 'good'
                          ? 'bg-indigo-100 dark:bg-indigo-900/80 border-indigo-400 ring-2 ring-indigo-400'
                          : 'bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border-indigo-200 dark:border-indigo-900/60'
                      }`}
                    >
                      <span className="text-xs font-black">Good [3]</span>
                      <span className="text-[10px] opacity-75 font-semibold mt-0.5">Remembered</span>
                    </button>

                    {/* Easy (Effortless) */}
                    <button
                      onClick={() => handleRate('easy')}
                      className={`py-3 px-1 rounded-2xl border text-emerald-600 dark:text-emerald-300 flex flex-col items-center justify-center transition cursor-pointer active:scale-95 ${
                        voiceEvaluation?.suggestedRating === 'easy'
                          ? 'bg-emerald-100 dark:bg-emerald-900/80 border-emerald-400 ring-2 ring-emerald-400'
                          : 'bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border-emerald-200 dark:border-emerald-900/60'
                      }`}
                    >
                      <span className="text-xs font-black">Easy [4]</span>
                      <span className="text-[10px] opacity-75 font-semibold mt-0.5">Effortless</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
