import React, { useState } from 'react';
import {
  Sparkles,
  Calculator,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  Brain,
  HelpCircle,
  Layers,
  AlertTriangle,
  Flame,
  Check,
  Zap,
} from 'lucide-react';
import { ChapterTopicItem, TestQuestion } from '../types';
import { fetchChapterTest } from '../utils/aiClient';

interface TopicPracticeTestViewProps {
  chapterName: string;
  subject: string;
  topics: ChapterTopicItem[];
  selectedTopicId: string;
  onSelectTopic: (topicId: string) => void;
  onCompleteScore?: (score: number, total: number) => void;
}

export const TopicPracticeTestView: React.FC<TopicPracticeTestViewProps> = ({
  chapterName,
  subject,
  topics,
  selectedTopicId,
  onSelectTopic,
  onCompleteScore,
}) => {
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loadingFollowUpForId, setLoadingFollowUpForId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableTopics = topics || [];
  const selectedTopic = availableTopics.find((t) => t.id === selectedTopicId) || availableTopics[0];
  const targetTopicTitle = selectedTopic?.title || 'Selected Topic';

  const normSub = (subject || '').toLowerCase();
  const normChap = (chapterName || '').toLowerCase();
  const isMath =
    normSub.includes('math') ||
    normSub.includes('algebra') ||
    normSub.includes('geom') ||
    normSub.includes('calc') ||
    normChap.includes('circle') ||
    normChap.includes('polynomial') ||
    normChap.includes('equation') ||
    normChap.includes('triangle');

  // If no topics exist, show blocking card
  if (availableTopics.length === 0) {
    return (
      <div id="test-view-blocking-empty" className="p-8 text-center bg-amber-50/70 border border-amber-200 rounded-2xl shadow-sm space-y-3">
        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Topics Not Yet Extracted</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
          Topics not yet extracted. Upload chapter materials to extract topics before revising. Practice tests require granular topic scoping to test specific formulas and numerical calculations.
        </p>
      </div>
    );
  }

  const handleGenerateQuestions = async () => {
    if (!selectedTopic) return;
    setIsLoading(true);
    setError(null);
    setSelectedAnswers({});
    setIsSubmitted(false);
    setCurrentIndex(0);

    try {
      const result = await fetchChapterTest(
        chapterName,
        subject,
        5,
        {
          topicId: selectedTopic.id,
          topicTitle: selectedTopic.title,
          topicKeyPoints: selectedTopic.keyPoints,
          topicKeyFormula: selectedTopic.keyFormula,
          topics: availableTopics,
        }
      );

      if (result && result.questions && result.questions.length > 0) {
        setQuestions(result.questions);
      } else {
        setError('Could not generate questions for this topic. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to generate practice test:', err);
      setError(err?.message || 'Failed to generate topic practice questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, option: string) => {
    if (selectedAnswers[questionId]) return; // already locked
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const currentQ = questions[currentIndex];
  const isCurrentAnswered = currentQ && !!selectedAnswers[currentQ.id];
  const isCurrentCorrect = isCurrentAnswered && selectedAnswers[currentQ.id] === currentQ.correctAnswer;

  const handleGenerateFollowUp = async (failedQuestion: TestQuestion) => {
    const studentAnswer = selectedAnswers[failedQuestion.id] || 'None';
    setLoadingFollowUpForId(failedQuestion.id);

    const targetTopicId = failedQuestion.topicId || selectedTopic.id;
    const targetTopicObj = availableTopics.find((t) => t.id === targetTopicId) || selectedTopic;
    const targetTopicName = failedQuestion.topicTitle || targetTopicObj?.title || targetTopicTitle;

    try {
      const followUpTest = await fetchChapterTest(
        chapterName,
        subject,
        1,
        {
          topicId: targetTopicId,
          topicTitle: targetTopicName,
          topicKeyPoints: targetTopicObj?.keyPoints,
          topicKeyFormula: targetTopicObj?.keyFormula,
          topics: availableTopics,
          followUpFor: {
            questionId: failedQuestion.id,
            originalQuestion: failedQuestion.question,
            studentAnswer,
            skill: failedQuestion.skill,
            concept: failedQuestion.skill || targetTopicName || 'numerical solving step',
            topicId: targetTopicId,
            topicTitle: targetTopicName,
          },
        }
      );

      if (followUpTest && followUpTest.questions && followUpTest.questions.length > 0) {
        const rawFollowUp = followUpTest.questions[0];
        const followUpQ: TestQuestion = {
          ...rawFollowUp,
          topicId: targetTopicId,
          topicTitle: targetTopicName,
        };
        // Insert right after the current question
        setQuestions((prev) => {
          const nextQuestions = [...prev];
          nextQuestions.splice(currentIndex + 1, 0, followUpQ);
          return nextQuestions;
        });
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (err: any) {
      console.error('Failed to generate follow-up question:', err);
    } finally {
      setLoadingFollowUpForId(null);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswer) correct += 1;
    });
    return { correct, total: questions.length };
  };

  return (
    <div className="space-y-5">
      {/* Topic Scope Selector Bar */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Topic Scope Filter
              </span>
              {isMath && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 flex items-center gap-1">
                  <Calculator className="w-3 h-3" />
                  <span>Numerical Solving Mode</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Practice questions are strictly anchored to the topic you choose — no generic chapter overviews!
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateQuestions}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 shadow-sm"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating {isMath ? 'Problems' : 'Questions'}...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate {targetTopicTitle} Practice</span>
              </>
            )}
          </button>
        </div>

        {/* Topic Pills */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1.5 scrollbar-none">
          <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Topic:</span>
          {availableTopics.map((t) => {
            const isSelected = selectedTopic?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTopic(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-indigo-400'
                }`}
              >
                <span>{t.title}</span>
                {t.confidence !== undefined && (
                  <span className="text-[10px] opacity-75 font-mono">{t.confidence}%</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Question Solving View */}
      {questions.length > 0 && currentQ && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                Question {currentIndex + 1} of {questions.length}
              </span>

              {/* Question Type Badge */}
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                  currentQ.questionType === 'numerical'
                    ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                    : currentQ.questionType === 'application'
                      ? 'bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300'
                      : currentQ.questionType === 'reasoning'
                        ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {currentQ.questionType === 'numerical' ? (
                  <>
                    <Calculator className="w-3 h-3" />
                    <span>Numerical Calculation</span>
                  </>
                ) : (
                  <span>{currentQ.questionType?.toUpperCase() || 'PRACTICE'}</span>
                )}
              </span>

              {currentQ.skill && (
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                  Skill: {currentQ.skill}
                </span>
              )}
            </div>

            {currentQ.topicTitle && (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                <span>{currentQ.topicTitle}</span>
              </span>
            )}
          </div>

          {/* Question Text */}
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
            {currentQ.question}
          </div>

          {/* Options Grid */}
          <div className="space-y-2.5">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedAnswers[currentQ.id] === option;
              const isCorrectAnswer = isCurrentAnswered && option === currentQ.correctAnswer;
              const isWrongSelection = isSelected && !isCurrentCorrect;

              let optionStyle =
                'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-600';

              if (isCorrectAnswer) {
                optionStyle =
                  'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold';
              } else if (isWrongSelection) {
                optionStyle =
                  'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-200 font-bold';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectOption(currentQ.id, option)}
                  disabled={isCurrentAnswered}
                  className={`w-full p-3.5 rounded-2xl border text-left text-xs sm:text-sm transition flex items-center justify-between gap-3 cursor-pointer ${optionStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{option}</span>
                  </div>

                  {isCorrectAnswer && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                  {isWrongSelection && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Feedback & Remediation Follow-up Trigger */}
          {isCurrentAnswered && (
            <div
              className={`p-4 rounded-2xl border space-y-3 ${
                isCurrentCorrect
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-100'
                  : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-100'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 font-black text-xs sm:text-sm">
                  {isCurrentCorrect ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Correct Solution!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>Not quite right. Let's master the calculation:</span>
                    </>
                  )}
                </div>

                {!isCurrentCorrect && (
                  <button
                    type="button"
                    onClick={() => handleGenerateFollowUp(currentQ)}
                    disabled={loadingFollowUpForId === currentQ.id}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
                  >
                    {loadingFollowUpForId === currentQ.id ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generating Follow-up...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3" />
                        <span>⚡ Try a similar question</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="text-xs leading-relaxed space-y-1">
                <div>
                  <span className="font-bold">Correct Answer: </span>
                  <span>{currentQ.correctAnswer}</span>
                </div>
                <div>
                  <span className="font-bold">Worked Solution: </span>
                  <span>{currentQ.explanation}</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation between questions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {questions.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`w-2.5 h-2.5 rounded-full transition ${
                    currentIndex === i
                      ? 'bg-indigo-600 scale-125'
                      : selectedAnswers[questions[i]?.id]
                        ? selectedAnswers[questions[i]?.id] === questions[i]?.correctAnswer
                          ? 'bg-emerald-400'
                          : 'bg-rose-400'
                        : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <span>Next Question</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const scoreObj = calculateScore();
                  if (onCompleteScore) {
                    onCompleteScore(scoreObj.correct, scoreObj.total);
                  }
                  setIsSubmitted(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Finish Practice</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Completion Score Card */}
      {isSubmitted && (
        <div className="p-5 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shrink-0">
              {Math.round((calculateScore().correct / calculateScore().total) * 100)}%
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                {targetTopicTitle} Practice Complete!
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                You scored {calculateScore().correct} / {calculateScore().total} questions correct on this topic.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateQuestions}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Practice Another Set</span>
          </button>
        </div>
      )}
    </div>
  );
};
