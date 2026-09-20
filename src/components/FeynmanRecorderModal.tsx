import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, X, Check, ArrowRight, BookOpen, Layers, RefreshCw } from 'lucide-react';
import { fetchFeynmanRecord } from '../utils/aiClient';
import { ChapterNote, Flashcard } from '../types';
import confetti from 'canvas-confetti';

interface FeynmanRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  subject: string;
  defaultMode?: 'notes' | 'flashcards';
  chapterContext?: string;
  onSaveNotes?: (notes: ChapterNote) => void;
  onSaveFlashcards?: (cards: Array<{ front: string; back: string }>) => void;
}

export const FeynmanRecorderModal: React.FC<FeynmanRecorderModalProps> = ({
  isOpen,
  onClose,
  topic,
  subject,
  defaultMode = 'notes',
  chapterContext,
  onSaveNotes,
  onSaveFlashcards,
}) => {
  const [mode, setMode] = useState<'notes' | 'flashcards'>(defaultMode);
  const [isRecording, setIsRecording] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    setMode(defaultMode);
    setSpokenText('');
    setResult(null);
    setErrorMsg(null);
    setRecordingSeconds(0);
  }, [defaultMode, isOpen, topic]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let fullTranscript = '';
      for (let i = 0; i < (event.results?.length || 0); i++) {
        if (event.results?.[i]?.[0]?.transcript) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
      }
      setSpokenText(fullTranscript.trim());
    };

    recognition.onerror = (event: any) => {
      console.warn('Feynman speech error:', event.error);
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setSpokenText('');
      setResult(null);
      setErrorMsg(null);
      setRecordingSeconds(0);
      try {
        if (recognitionRef.current) {
          recognitionRef.current.start();
          setIsRecording(true);
          timerRef.current = setInterval(() => {
            setRecordingSeconds((prev) => prev + 1);
          }, 1000);
        } else {
          setErrorMsg('Web Speech API is not supported in this browser. Please type or paste your explanation below.');
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Microphone permission denied or busy. You can type directly in the field below.');
      }
    }
  };

  const handleProcessFeynman = async () => {
    if (!spokenText.trim()) {
      setErrorMsg('Please speak or type your understanding of the concept first.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await fetchFeynmanRecord(topic, subject, spokenText.trim(), mode, chapterContext);
      setResult(res);
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 } });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Feynman AI failed to process speech.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyNotes = () => {
    if (result?.generatedNotes && onSaveNotes) {
      onSaveNotes(result.generatedNotes);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      onClose();
    }
  };

  const handleApplyFlashcards = () => {
    if (result?.generatedFlashcards && onSaveFlashcards) {
      onSaveFlashcards(result.generatedFlashcards);
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
      onClose();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Voice Explanation Recorder
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Explain concepts simply in your own words • Auto-simplifies & records
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Target Topic Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                TARGET TOPIC
              </span>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">{topic}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{subject}</p>
            </div>

            {/* Mode Switcher */}
            <div className="bg-white dark:bg-slate-800 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setMode('notes')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  mode === 'notes'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Record Notes</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('flashcards')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  mode === 'flashcards'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Record Flashcards</span>
              </button>
            </div>
          </div>

          {/* Voice Recording Control Center */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 text-center space-y-4">
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={toggleRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                  isRecording
                    ? 'bg-rose-500 text-white ring-8 ring-rose-500/25 animate-pulse scale-105'
                    : 'bg-amber-500 hover:bg-amber-600 text-white ring-4 ring-amber-500/20'
                }`}
              >
                {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>

              <div className="mt-3">
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                  {isRecording ? `Recording... (${formatTime(recordingSeconds)})` : 'Click to start speaking'}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Explain the topic as if teaching a 12-year-old. No jargon, just clear intuition.
                </p>
              </div>
            </div>

            {/* Spoken Text Box */}
            <div className="text-left space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                <span>Your Spoken Explanation (Live Transcript or edit below):</span>
                {spokenText && (
                  <span className="text-[10px] text-slate-400 font-mono-digits">
                    {spokenText.split(/\s+/).filter(Boolean).length} words
                  </span>
                )}
              </div>
              <textarea
                value={spokenText}
                onChange={(e) => setSpokenText(e.target.value)}
                placeholder="Start speaking, or type/paste your verbal thoughts here..."
                rows={4}
                className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition leading-relaxed resize-y"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 font-medium">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              {spokenText && !isRecording && (
                <button
                  type="button"
                  onClick={() => setSpokenText('')}
                  className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={handleProcessFeynman}
                disabled={isProcessing || !spokenText.trim() || isRecording}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md shadow-amber-300/40 dark:shadow-none transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Simplifying & Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Simplify Concept ({mode === 'notes' ? 'Notes' : 'Flashcards'})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Synthesized Output Preview */}
          {result && (
            <div className="p-5 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-300">
                    Concept Simplification Ready!
                  </h4>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400">
                  {result.mode === 'notes' ? 'Cornell Notes' : 'Atomic Flashcards'}
                </span>
              </div>

              {/* Intuitive Feynman Analogy */}
              {result.simplifiedExplanation && (
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Intuitive Plain-English Analogy
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed italic">
                    "{result.simplifiedExplanation}"
                  </p>
                </div>
              )}

              {/* Core Takeaways */}
              {Array.isArray(result.coreTakeaways) && result.coreTakeaways.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Key Takeaways Captured:
                  </span>
                  <ul className="space-y-1">
                    {result.coreTakeaways.map((point: string, idx: number) => (
                      <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* If Notes Mode */}
              {result.mode === 'notes' && result.generatedNotes && (
                <div className="space-y-3 pt-2 border-t border-emerald-200/50 dark:border-emerald-900/40">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                    <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Generated Chapter Revision Notes
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {result.generatedNotes.summary}
                    </p>

                    {result.generatedNotes?.formulasOrLaws?.[0] && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                          {result.generatedNotes.formulasOrLaws[0]?.name || 'Formula'}:{' '}
                        </span>
                        <span>{result.generatedNotes.formulasOrLaws[0]?.formula}</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyNotes}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save to Chapter Notes</span>
                  </button>
                </div>
              )}

              {/* If Flashcards Mode */}
              {result.mode === 'flashcards' && Array.isArray(result.generatedFlashcards) && (
                <div className="space-y-3 pt-2 border-t border-emerald-200/50 dark:border-emerald-900/40">
                  <div className="space-y-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      Generated Active Recall Cards ({result.generatedFlashcards.length})
                    </span>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {result.generatedFlashcards.map((c: any, i: number) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                        >
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            Q: {c.front}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            A: {c.back}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyFlashcards}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Add {result.generatedFlashcards.length} Flashcards to Deck</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
