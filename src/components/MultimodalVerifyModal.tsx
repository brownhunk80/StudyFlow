import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  UploadCloud,
  FileText,
  Keyboard,
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Layers,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { fetchRecallVerification } from '../utils/aiClient';
import { ChapterMaterial, ChapterNote, FlashcardDeck, RecallVerificationResult, VerificationInputMode } from '../types';
import confetti from 'canvas-confetti';

interface MultimodalVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterName: string;
  subject: string;
  materials?: ChapterMaterial[];
  chapterNotes?: ChapterNote;
  decks: FlashcardDeck[];
  onAddFlashcards?: (cards: Array<{ front: string; back: string; deckId: string; subject: string }>) => void;
  onUpdateScore?: (score: number) => void;
}

export const MultimodalVerifyModal: React.FC<MultimodalVerifyModalProps> = ({
  isOpen,
  onClose,
  chapterName,
  subject,
  materials = [],
  chapterNotes,
  decks = [],
  onAddFlashcards,
  onUpdateScore,
}) => {
  const [mode, setMode] = useState<VerificationInputMode>('speaking');
  const [spokenText, setSpokenText] = useState('');
  const [typedText, setTypedText] = useState('');
  const [paperImage, setPaperImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [paperFileName, setPaperFileName] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<RecallVerificationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cardsSavedMessage, setCardsSavedMessage] = useState<string | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<string>(decks[0]?.id || '');

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setSpokenText('');
      setTypedText('');
      setPaperImage(null);
      setPaperFileName(null);
      setAnalysisResult(null);
      setErrorMsg(null);
      setCardsSavedMessage(null);
      if (Array.isArray(decks) && decks.length > 0 && !selectedDeckId) {
        setSelectedDeckId(decks[0]?.id || '');
      }
    }
  }, [isOpen, chapterName]);

  // Speech Recognition hook
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
      console.warn('Recall verify speech error:', event.error);
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
      setAnalysisResult(null);
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
          setErrorMsg('Web Speech API is unavailable in this browser. You can switch to typing.');
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Microphone access denied. You can type your recall summary instead.');
      }
    }
  };

  const handlePaperImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload an image (PNG, JPG) of your handwritten paper or diagrams.');
      return;
    }
    setPaperFileName(file.name);
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPaperImage({
        data: e.target?.result as string,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleVerify = async () => {
    setErrorMsg(null);
    setAnalysisResult(null);

    if (mode === 'speaking' && !spokenText.trim()) {
      setErrorMsg('Please speak or type your verbal recall first.');
      return;
    }
    if (mode === 'typing' && !typedText.trim()) {
      setErrorMsg('Please type what you remember about the chapter.');
      return;
    }
    if (mode === 'written_paper' && !paperImage) {
      setErrorMsg('Please upload a photo or scan of your written paper/handwriting.');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Compile reference ground truth from materials and notes
      let refText = '';
      if (materials.length > 0) {
        materials.forEach((m) => {
          refText += `\n[${m.type.toUpperCase()}: ${m.title}]\n${m.content || ''}\n`;
        });
      }
      const notesSummary = chapterNotes
        ? `Summary: ${chapterNotes.summary}\nKey Concepts: ${chapterNotes.keyConcepts
            ?.map((k) => k.term + ': ' + k.explanation)
            .join('; ')}\nFormulas: ${chapterNotes.formulasOrLaws
            ?.map((f) => f.name + ': ' + f.formula)
            .join('; ')}`
        : undefined;

      const result = await fetchRecallVerification({
        chapterName,
        subject,
        mode,
        spokenText: mode === 'speaking' ? spokenText : undefined,
        typedText: mode === 'typing' ? typedText : undefined,
        paperImage: mode === 'written_paper' && paperImage ? paperImage : undefined,
        referenceMaterialsText: refText || undefined,
        chapterNotesSummary: notesSummary,
      });

      setAnalysisResult(result);
      if (onUpdateScore) {
        onUpdateScore(result.coverageScore);
      }
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    } catch (err: any) {
      console.error('Failed to verify recall:', err);
      setErrorMsg(err.message || 'Failed to analyze knowledge gaps.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveGapFlashcards = () => {
    if (!analysisResult?.recommendedFlashcards || analysisResult.recommendedFlashcards.length === 0)
      return;

    const targetDeckId = selectedDeckId || decks[0]?.id || 'deck-default';
    const targetDeck = decks.find((d) => d.id === targetDeckId);

    const newCards = analysisResult.recommendedFlashcards.map((c) => ({
      front: c.front,
      back: c.back,
      deckId: targetDeckId,
      subject: targetDeck ? targetDeck.subject : subject,
    }));

    if (onAddFlashcards) {
      onAddFlashcards(newCards);
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
      setCardsSavedMessage(
        `Added ${newCards.length} remedial flashcards to "${targetDeck?.title || 'deck'}"!`
      );
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Active Recall Knowledge Verification</span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Speaking • Uploading Written Papers • Typing • AI Gap Detection
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Chapter Banner & Ground Truth Info */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                VERIFYING CHAPTER
              </span>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">{chapterName}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{subject}</p>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 sm:text-right">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Ground Truth References:
              </span>
              <div>
                {materials.length} uploaded material(s){chapterNotes ? ', Chapter Notes' : ''}
              </div>
            </div>
          </div>

          {/* 3 Input Mode Selector Tabs */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Select Your Verification Submission Mode:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('speaking')}
                className={`p-3 rounded-2xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-2 transition cursor-pointer border ${
                  mode === 'speaking'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>1. Speaking</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('written_paper')}
                className={`p-3 rounded-2xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-2 transition cursor-pointer border ${
                  mode === 'written_paper'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>2. Written Paper / Photo</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('typing')}
                className={`p-3 rounded-2xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-2 transition cursor-pointer border ${
                  mode === 'typing'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <Keyboard className="w-4 h-4" />
                <span>3. Typing</span>
              </button>
            </div>
          </div>

          {/* Mode 1: Speaking (Microphone) */}
          {mode === 'speaking' && (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 text-center space-y-4">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500 text-white ring-8 ring-rose-500/25 animate-pulse scale-105'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white ring-4 ring-indigo-500/20'
                  }`}
                >
                  {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </button>
                <div className="mt-3">
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                    {isRecording ? `Listening... (${formatTime(recordingSeconds)})` : 'Click to Speak'}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Speak everything you recall: definitions, equations, conditions, and examples.
                  </p>
                </div>
              </div>

              <div className="text-left space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
                  <span>Speech Transcription:</span>
                  {spokenText && (
                    <span className="text-[10px] text-slate-400 font-mono-digits">
                      {spokenText.split(/\s+/).filter(Boolean).length} words spoken
                    </span>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={spokenText}
                  onChange={(e) => setSpokenText(e.target.value)}
                  placeholder="Spoken words will automatically appear here in real-time..."
                  className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Mode 2: Written Paper / Image Upload */}
          {mode === 'written_paper' && (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Upload Written Paper, Calculations, or Hand-Drawn Diagrams
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Take a photo of your notebook or test paper. Gemini 3.8 Flash will transcribe your handwriting, review steps, and find missing logic.
                </p>
              </div>

              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:bg-white/50 dark:hover:bg-slate-900/50 transition">
                <input
                  type="file"
                  id="paper-upload"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handlePaperImageUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <label htmlFor="paper-upload" className="cursor-pointer block space-y-2">
                  <UploadCloud className="w-10 h-10 mx-auto text-indigo-600 dark:text-indigo-400" />
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {paperFileName ? `Uploaded: ${paperFileName}` : 'Click to upload photo or drag & drop handwritten notes'}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Supports JPG, PNG, screenshot of handwriting, scratch formulas, or diagrams
                  </span>
                </label>
              </div>

              {paperImage && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                  <img
                    src={paperImage.data}
                    alt="Uploaded written paper"
                    className="w-24 h-24 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Written Paper Image Ready</span>
                    </span>
                    <p className="text-slate-500 text-[11px]">
                      Ready for OCR extraction and conceptual gap verification.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mode 3: Typing */}
          {mode === 'typing' && (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Type Everything You Remember (Active Recall):
                </label>
                <span className="text-[10px] text-slate-400 font-mono-digits">
                  {typedText.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <textarea
                rows={6}
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="Type your explanation of this chapter without looking at notes. Cover: core laws, mathematical equations, assumptions, experimental setups, and units..."
                className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
              />
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Trigger Verification Button */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleVerify}
              disabled={isAnalyzing || isRecording}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-300/40 dark:shadow-none transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Checking Knowledge Gaps Against Materials...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Verify Recall & Suggest Gaps</span>
                </>
              )}
            </button>
          </div>

          {/* AI Gap Analysis & Verification Results */}
          {analysisResult && (
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-6">
              {/* Score & Mastery Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex flex-col items-center justify-center font-black font-mono-digits shadow-md">
                    <span className="text-xl leading-none">{analysisResult.coverageScore}%</span>
                    <span className="text-[9px] uppercase tracking-wider opacity-80">Coverage</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        Mastery: {analysisResult.masteryLevel}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          analysisResult.masteryLevel === 'Mastered'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : analysisResult.masteryLevel === 'Competent'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {analysisResult.masteryLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Accuracy: {analysisResult.accuracyScore}% • Evaluated against chapter ground truth
                    </p>
                  </div>
                </div>

                {analysisResult.extractedOrTranscribedText && (
                  <div className="text-[11px] text-slate-500 sm:max-w-xs bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 line-clamp-2 italic">
                    "{analysisResult.extractedOrTranscribedText}"
                  </div>
                )}
              </div>

              {/* Verified Concepts vs Critical Gaps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* What Student Got Right */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Concepts You Mastered</span>
                  </div>
                  <ul className="space-y-1.5">
                    {analysisResult.verifiedConcepts?.map((c, i) => (
                      <li key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Critical Gaps / What Has Been Missed */}
                <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Gaps & What Has Been Missed</span>
                  </div>
                  <div className="space-y-2">
                    {analysisResult.criticalGaps?.map((g, i) => (
                      <div key={i} className="text-xs space-y-0.5">
                        <div className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                          <span>{g.missedConcept}</span>
                          <span className="text-[9px] uppercase font-extrabold px-1 rounded bg-rose-200/70 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                            {g.importance}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                          {g.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Written Paper Specific Feedback (if applicable) */}
              {analysisResult.writtenPaperFeedback && (
                <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 space-y-2">
                  <h4 className="text-xs font-black text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                    Written Paper & Diagram Evaluation
                  </h4>
                  {analysisResult.writtenPaperFeedback.diagramEvaluation && (
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-bold">Diagram Check:</span>{' '}
                      {analysisResult.writtenPaperFeedback.diagramEvaluation}
                    </p>
                  )}
                  {analysisResult.writtenPaperFeedback.notationFeedback && (
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-bold">Mathematical Notation:</span>{' '}
                      {analysisResult.writtenPaperFeedback.notationFeedback}
                    </p>
                  )}
                </div>
              )}

              {/* Misconceptions */}
              {analysisResult.misconceptions && analysisResult.misconceptions.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 space-y-2">
                  <h4 className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                    Misconceptions Stated
                  </h4>
                  {analysisResult.misconceptions.map((m, i) => (
                    <div key={i} className="text-xs space-y-0.5">
                      <div className="text-rose-600 dark:text-rose-400 font-semibold line-through">
                        "{m.stated}"
                      </div>
                      <div className="text-emerald-700 dark:text-emerald-300 font-bold">
                        Correction: {m.correction}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Remedial Flashcards */}
              {analysisResult.recommendedFlashcards &&
                analysisResult.recommendedFlashcards.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-indigo-600" />
                          <span>AI Gap Flashcards (Targeting Your Missed Concepts)</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Review these cards in Spaced Repetition to convert missed concepts into durable memory.
                        </p>
                      </div>

                      {decks.length > 1 && (
                        <select
                          value={selectedDeckId}
                          onChange={(e) => setSelectedDeckId(e.target.value)}
                          className="px-2.5 py-1 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                        >
                          {decks.map((d) => (
                            <option key={d.id} value={d.id}>
                              Deck: {d.title}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {analysisResult.recommendedFlashcards.map((card, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                        >
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[10px] uppercase">
                            Gap Card {i + 1}
                          </span>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            Q: {card.front}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">A: {card.back}</div>
                        </div>
                      ))}
                    </div>

                    {cardsSavedMessage ? (
                      <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold text-center">
                        {cardsSavedMessage}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSaveGapFlashcards}
                        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add {analysisResult.recommendedFlashcards.length} Remedial Flashcards to Deck</span>
                      </button>
                    )}
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
