import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Smile,
  Zap,
  HelpCircle,
  Lightbulb,
  Share2,
  BookmarkPlus,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ELI5Response } from '../types';

interface ELI5ExplainerProps {
  defaultTopic?: string;
  chapterName?: string;
  subjectName?: string;
  suggestedTopics?: string[];
  onSaveToNotes?: (title: string, content: string) => void;
}

export const ELI5Explainer: React.FC<ELI5ExplainerProps> = ({
  defaultTopic = '',
  chapterName = '',
  subjectName = '',
  suggestedTopics = [],
  onSaveToNotes,
}) => {
  const [topicInput, setTopicInput] = useState(defaultTopic);
  const [isLoading, setIsLoading] = useState(false);
  const [explanation, setExplanation] = useState<ELI5Response | null>(null);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync if defaultTopic changes and no explanation loaded yet
  useEffect(() => {
    if (defaultTopic && !explanation) {
      setTopicInput(defaultTopic);
    }
  }, [defaultTopic, explanation]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleFetchELI5 = async (topicToExplain: string) => {
    const target = topicToExplain.trim();
    if (!target) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSelectedQuizAnswer(null);
    setIsSaved(false);

    // Stop ongoing speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      const res = await fetch('/api/ai/eli5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: target,
          subject: subjectName,
          chapterName: chapterName,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data: ELI5Response = await res.json();
      setExplanation(data);
      try {
        confetti({
          particleCount: 45,
          spread: 50,
          origin: { y: 0.5 },
          colors: ['#6366f1', '#f59e0b', '#10b981', '#ec4899'],
        });
      } catch (e) {}
    } catch (err: any) {
      console.error('ELI5 fetch error:', err);
      setErrorMsg('Could not fetch explanation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!explanation) return;

    const fullSpeechText = `${explanation.headline}. ${explanation.story}. How it works: ${explanation.simpleSteps
      .map((s) => `${s.step}: ${s.title}. ${s.explanation}`)
      .join(' ')}. Real life example: ${explanation.realLifeExample}. Fun secret: ${explanation.funSecret}`;

    const utterance = new SpeechSynthesisUtterance(fullSpeechText);
    utterance.rate = 0.95;
    utterance.pitch = 1.05; // Friendly and lively tone
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleCopy = () => {
    if (!explanation) return;
    const text = `🌟 ELI5: ${explanation.topic}\n\n"${explanation.headline}"\n\n📖 The Story:\n${explanation.story}\n\n🎈 3 Simple Steps:\n${explanation.simpleSteps
      .map((s) => `${s.emoji} Step ${s.step}: ${s.title} - ${s.explanation}`)
      .join('\n')}\n\n🔍 Everyday Example:\n${explanation.realLifeExample}\n\n💡 Fun Secret:\n${explanation.funSecret}`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveToNotes = () => {
    if (!explanation || !onSaveToNotes) return;
    const noteContent = `### ELI5: ${explanation.topic}\n**"${explanation.headline}"**\n\n${explanation.story}\n\n**3 Simple Steps:**\n${explanation.simpleSteps
      .map((s) => `- **${s.emoji} Step ${s.step}: ${s.title}**: ${s.explanation}`)
      .join('\n')}\n\n**Real Life Example:**\n${explanation.realLifeExample}\n\n**Key Secret:**\n${explanation.funSecret}`;

    onSaveToNotes(`ELI5: ${explanation.topic}`, noteContent);
    setIsSaved(true);
    try {
      confetti({ particleCount: 35, spread: 45, origin: { y: 0.6 } });
    } catch (e) {}
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white rounded-3xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-white text-[11px] font-black uppercase tracking-wider">
            <Smile className="w-3.5 h-3.5" />
            <span>Explain It Like I'm 5 (ELI5)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Complex Topics Made Child's Play 🎈
          </h2>
          <p className="text-xs sm:text-sm text-amber-50 leading-relaxed max-w-2xl">
            Type any tricky concept, formula, or law from {chapterName || 'your chapter'}. Our AI will break it down using delightful everyday stories, simple analogies, and zero confusing jargon!
          </p>
        </div>
        <div className="absolute right-3 -bottom-6 text-7xl opacity-20 pointer-events-none select-none">
          🧸
        </div>
      </div>

      {/* Search / Input Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            What topic would you like explained like you're 5?
          </label>
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && topicInput.trim() && !isLoading) {
                    handleFetchELI5(topicInput);
                  }
                }}
                placeholder="e.g., Photosynthesis, Newton's 3rd Law, Inflation, Electric Current, DNA..."
                className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition"
              />
              {topicInput && (
                <button
                  onClick={() => setTopicInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => handleFetchELI5(topicInput)}
              disabled={!topicInput.trim() || isLoading}
              className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md shrink-0 ${
                !topicInput.trim() || isLoading
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-amber-200 dark:shadow-none'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking like a 5-year-old...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Explain Like I'm 5</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Suggested Quick Pick Pills */}
        {suggestedTopics.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Quick Suggestions from {chapterName || 'Chapter'}:
            </span>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {suggestedTopics.map((sug, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setTopicInput(sug);
                    handleFetchELI5(sug);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 text-xs font-bold border border-slate-200/80 dark:border-slate-700 transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>✨</span>
                  <span>{sug}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-xs font-bold">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-xl w-3/4" />
          <div className="space-y-2">
            <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded-lg w-full" />
            <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded-lg w-5/6" />
            <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded-lg w-4/6" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
            <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
            <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
          </div>
        </div>
      )}

      {/* Result Display */}
      {explanation && !isLoading && (
        <div className="space-y-5">
          {/* Main Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
            {/* Header / Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shadow-xs">
                  🎈
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    ELI5 EXPLANATION
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {explanation.topic}
                  </h3>
                </div>
              </div>

              {/* Action Buttons: Speak, Copy, Save */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSpeak}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                    isSpeaking
                      ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950 dark:border-rose-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                  }`}
                  title="Read aloud"
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>Stop Voice</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Read Aloud</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopy}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer border border-slate-200 dark:border-slate-700"
                  title="Copy to clipboard"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>

                {onSaveToNotes && (
                  <button
                    onClick={handleSaveToNotes}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                      isSaved
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
                    }`}
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>{isSaved ? 'Saved to Notes!' : 'Save to Chapter Notes'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Headline Analogy */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/80 dark:border-amber-900/60">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1 block">
                The Big Picture in One Sentence:
              </span>
              <p className="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-100 leading-snug">
                "{explanation.headline}"
              </p>
            </div>

            {/* The Story */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>The Story of How It Works</span>
              </span>
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed space-y-3 whitespace-pre-line">
                {explanation.story}
              </div>
            </div>

            {/* 3 Simple Steps */}
            {explanation.simpleSteps && explanation.simpleSteps.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>How to Remember It in 3 Easy Steps</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {explanation.simpleSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-2 shadow-2xs hover:border-amber-300 dark:hover:border-amber-700 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{step.emoji || '🌟'}</span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Step {step.step || idx + 1}
                        </span>
                      </div>
                      <h5 className="text-xs font-black text-slate-900 dark:text-white">
                        {step.title}
                      </h5>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        {step.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Real Life Example & Fun Secret Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Real Life Example */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-black">
                  <span>🏡</span>
                  <span>Where You See It in Everyday Life</span>
                </div>
                <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                  {explanation.realLifeExample}
                </p>
              </div>

              {/* Fun Secret */}
              <div className="p-4 rounded-2xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/60 space-y-1.5">
                <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 text-xs font-black">
                  <span>💡</span>
                  <span>Fun Kid Secret / Mind-Blower</span>
                </div>
                <p className="text-xs text-purple-950 dark:text-purple-200 leading-relaxed">
                  {explanation.funSecret}
                </p>
              </div>
            </div>

            {/* Interactive Kid Quiz */}
            {explanation.quickQuiz && (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                    <HelpCircle className="w-4 h-4 text-indigo-500" />
                    <span>5-Year-Old Check-In Quiz</span>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">1-Click Test</span>
                </div>

                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  {explanation.quickQuiz.question}
                </p>

                <div className="space-y-2">
                  {explanation.quickQuiz.options.map((option, optIdx) => {
                    const isSelected = selectedQuizAnswer === optIdx;
                    const isCorrect = optIdx === explanation.quickQuiz?.correctIndex;

                    return (
                      <button
                        key={optIdx}
                        onClick={() => {
                          setSelectedQuizAnswer(optIdx);
                          if (isCorrect) {
                            try {
                              confetti({ particleCount: 35, spread: 45, origin: { y: 0.7 } });
                            } catch (e) {}
                          }
                        }}
                        className={`w-full text-left p-3 rounded-xl text-xs font-medium transition cursor-pointer border flex items-center justify-between gap-2 ${
                          isSelected
                            ? isCorrect
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                              : 'bg-rose-500 text-white border-rose-500 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{option}</span>
                        {isSelected && (
                          <span className="font-black text-xs shrink-0">
                            {isCorrect ? '✓ Correct!' : '✕ Try again'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedQuizAnswer !== null && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium leading-relaxed ${
                      selectedQuizAnswer === explanation.quickQuiz.correctIndex
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200/80 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-200/80 dark:border-amber-800'
                    }`}
                  >
                    {explanation.quickQuiz.cheer}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
