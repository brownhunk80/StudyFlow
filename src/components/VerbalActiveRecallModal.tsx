import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Award,
  Layers,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Flashcard, FlashcardDeck, SpeechRecallGapAnalysis, SubjectItem } from '../types';
import { fetchVerbalRecallGapAnalysis } from '../utils/aiClient';

interface VerbalActiveRecallModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectItem[];
  decks: FlashcardDeck[];
  onAddFlashcards?: (cards: Array<Omit<Flashcard, 'id' | 'interval' | 'repetitions' | 'easeFactor' | 'status' | 'box'>>) => void;
}

export const VerbalActiveRecallModal: React.FC<VerbalActiveRecallModalProps> = ({
  isOpen,
  onClose,
  subjects,
  decks,
  onAddFlashcards,
}) => {
  const [topic, setTopic] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.name || 'General');
  const [spokenText, setSpokenText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SpeechRecallGapAnalysis | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState(decks[0]?.id || '');

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < (event.results?.length || 0); i++) {
        if (event.results?.[i]?.[0]?.transcript) {
          transcript += event.results[i][0].transcript + ' ';
        }
      }
      setSpokenText(transcript.trim());
    };

    recognition.onerror = () => {
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
        } catch {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleToggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setAnalysis(null);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsRecording(true);
          setRecordingSeconds(0);
          timerRef.current = setInterval(() => {
            setRecordingSeconds((prev) => prev + 1);
          }, 1000);
        } catch (err) {
          console.warn(err);
          setIsRecording(false);
        }
      } else {
        alert('Web Speech recognition is not available in this browser environment. You can type or dictate your explanation in the text area below!');
      }
    }
  };

  const handleAnalyze = async () => {
    if (!topic.trim()) {
      alert('Please enter a topic name first (e.g. Thermodynamics, Mitosis, Supply & Demand)');
      return;
    }
    if (!spokenText.trim()) {
      alert('Please speak or type your explanation first.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const res = await fetchVerbalRecallGapAnalysis(topic, selectedSubject, spokenText);
      setAnalysis(res);
      if (res.coverageScore >= 70) {
        confetti({ particleCount: 50, spread: 70 });
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Could not analyze recall');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddFlashcards = () => {
    if (!analysis?.recommendedFlashcards || !onAddFlashcards) return;
    const targetDeckId = selectedDeckId || decks[0]?.id || 'deck-default';
    const targetDeck = decks.find((d) => d.id === targetDeckId);

    const newCards = analysis.recommendedFlashcards.map((c) => ({
      deckId: targetDeckId,
      front: c.front,
      back: c.back,
      subject: targetDeck ? targetDeck.subject : selectedSubject,
      chapter: topic,
      dueDate: new Date().toISOString(),
    }));

    onAddFlashcards(newCards);
    confetti({ particleCount: 40, spread: 60 });
    alert(`Added ${newCards.length} flashcard(s) to ${targetDeck?.title || 'deck'}!`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                FEYNMAN ACTIVE RECALL
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Verbal Active Recall & Gap Detection
              </h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Topic & Subject inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Topic or Chapter Name:
              </label>
              <input
                type="text"
                placeholder="e.g. Newton's Laws, Photosynthesis, Bayes Theorem"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Subject:
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recording / Feynman Explaining Card */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center space-y-3">
            <div className="relative inline-block">
              {isRecording && (
                <span className="absolute inset-0 rounded-full bg-rose-400/40 animate-ping" />
              )}
              <button
                onClick={handleToggleRecording}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg cursor-pointer ${
                  isRecording
                    ? 'bg-rose-500 text-white shadow-rose-500/40 scale-105'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/30'
                }`}
              >
                {isRecording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              </button>
            </div>

            <div>
              <div className="text-xs font-black text-slate-900 dark:text-white">
                {isRecording ? 'Listening... Explain the topic out loud' : 'Click to start speaking your recall'}
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
                {isRecording ? (
                  <span className="text-rose-500 font-bold font-mono">
                    Recording: {recordingSeconds} seconds
                  </span>
                ) : (
                  'Explain this topic simply as if teaching someone else. AI will pinpoint what you missed.'
                )}
              </p>
            </div>

            {/* Transcript */}
            <div className="text-left pt-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Spoken Explanation Transcript:
              </label>
              <textarea
                rows={4}
                placeholder="Spoken words transcribe here live. You can also paste or type your explanation manually..."
                value={spokenText}
                onChange={(e) => setSpokenText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>{spokenText.trim().split(/\s+/).filter(Boolean).length} words</span>
                {spokenText && (
                  <button
                    onClick={() => setSpokenText('')}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !spokenText.trim() || !topic.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-300 dark:shadow-none transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAnalyzing ? 'Analyzing gaps with AI...' : 'Analyze Knowledge Gaps with AI'}</span>
            </button>
          </div>

          {/* Analysis View */}
          {analysis && (
            <div className="space-y-4 pt-2">
              {/* Scores */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-center">
                  <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                    Topic Coverage
                  </span>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {analysis.coverageScore}%
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl text-center">
                  <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                    Accuracy
                  </span>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {analysis.accuracyScore}%
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-2xl text-center">
                  <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400">
                    Mastery Level
                  </span>
                  <div className="text-xs font-black text-slate-900 dark:text-white mt-1.5">
                    {analysis.masteryLevel}
                  </div>
                </div>
              </div>

              {/* Accurately Covered */}
              <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-4">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-black text-xs uppercase tracking-wider mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Accurately Recalled Concepts</span>
                </div>
                <ul className="space-y-1">
                  {analysis.keyConceptsCovered.map((item, i) => (
                    <li key={i} className="text-xs text-emerald-900 dark:text-emerald-200 font-medium flex items-start gap-2">
                      <span className="text-emerald-600">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Critical Knowledge Gaps */}
              <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-black text-xs uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Critical Gaps (Concepts You Omitted)</span>
                </div>
                <div className="space-y-2">
                  {analysis.criticalGaps.map((gap, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-300">
                        <span>{gap.missedConcept}</span>
                        <span className="text-[10px] uppercase">{gap.importance} priority</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">{gap.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Misconceptions */}
              {analysis.misconceptions && analysis.misconceptions.length > 0 && (
                <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    Misconceptions Corrected
                  </span>
                  <div className="space-y-2">
                    {analysis.misconceptions.map((misc, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900 text-xs space-y-1"
                      >
                        <p className="text-slate-500 dark:text-slate-400">
                          <strong className="text-amber-700 dark:text-amber-400">You implied:</strong> "{misc.stated}"
                        </p>
                        <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                          <strong>Accurate principle:</strong> {misc.correction}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 1-Click Flashcards */}
              {analysis.recommendedFlashcards && analysis.recommendedFlashcards.length > 0 && (
                <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                      Turn Missing Gaps into Flashcards
                    </span>
                    <button
                      onClick={handleAddFlashcards}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Add Gap Cards to Deck</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Target Deck:</span>
                    <select
                      value={selectedDeckId}
                      onChange={(e) => setSelectedDeckId(e.target.value)}
                      className="text-xs font-semibold px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                    >
                      {decks.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} ({d.subject})
                        </option>
                      ))}
                    </select>
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
