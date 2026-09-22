import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  FileText,
  Layers,
  Award,
  Clock,
  Edit3,
  Check,
  RotateCcw,
  Compass,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { ChapterMaterial, PracticeAnswerEvaluation, PracticeMode, PracticeQuestion } from '../types';
import { fetchEvaluatePracticeAnswer, fetchPracticeSession, fetchSimilarQuestion } from '../utils/aiClient';
import { getCuratedTextbookPractice, getQuestionPatternMap } from '../data/textbookQuestionPatterns';

interface TextbookPracticeEngineProps {
  chapterId: string;
  chapterName: string;
  subject: string;
  materials?: ChapterMaterial[];
  examName?: string;
  curriculumContext?: {
    board?: string;
    classLevel?: string;
    textbookName?: string;
  };
  onCompleteSession?: (result: {
    score: number;
    total: number;
    weakConcepts: string[];
    mode: PracticeMode;
  }) => void;
  onClose?: () => void;
}

export const TextbookPracticeEngine: React.FC<TextbookPracticeEngineProps> = ({
  chapterId,
  chapterName,
  subject,
  materials = [],
  examName,
  curriculumContext,
  onCompleteSession,
  onClose,
}) => {
  const [selectedMode, setSelectedMode] = useState<PracticeMode>('practice');
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [workingNotes, setWorkingNotes] = useState('');
  const [showWorkingPad, setShowWorkingPad] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGeneratingSimilar, setIsGeneratingSimilar] = useState(false);
  const [evaluation, setEvaluation] = useState<PracticeAnswerEvaluation | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [userAnswersHistory, setUserAnswersHistory] = useState<
    Array<{
      question: PracticeQuestion;
      studentAnswer: string;
      evaluation: PracticeAnswerEvaluation;
    }>
  >([]);
  const [sourceLabel, setSourceLabel] = useState(`Textbook-style practice • Based on Chapter: ${chapterName}`);
  const [showPatternMap, setShowPatternMap] = useState(false);

  const patternMap = getQuestionPatternMap(chapterName, subject);

  // Determine smart recommended practice mode
  const getRecommendedMode = (): { mode: PracticeMode; reason: string } => {
    if (examName && examName.toLowerCase().includes('board')) {
      return { mode: 'exam_practice', reason: 'Recommended: Board Exam Approaching' };
    }
    const normSub = subject.toLowerCase();
    if (normSub.includes('math') || normSub.includes('physics')) {
      return { mode: 'practice', reason: 'Recommended: Core Problem Solving' };
    }
    return { mode: 'practice', reason: 'Recommended: Textbook Curriculum Exercises' };
  };

  const recommendation = getRecommendedMode();

  // Load questions for the selected mode
  const loadPracticeSession = async (mode: PracticeMode) => {
    setIsLoading(true);
    setEvaluation(null);
    setStudentAnswer('');
    setWorkingNotes('');
    setShowHint(false);
    setCurrentIndex(0);
    setSessionCompleted(false);
    setUserAnswersHistory([]);

    try {
      const data = await fetchPracticeSession({
        chapterName,
        subject,
        mode,
        materials,
      });

      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
        if (data.sourceLabel) setSourceLabel(data.sourceLabel);
      } else {
        const fallback = getCuratedTextbookPractice(chapterName, subject, mode);
        setQuestions(fallback);
      }
    } catch (err) {
      console.warn('Practice session API error, using curated patterns:', err);
      const fallback = getCuratedTextbookPractice(chapterName, subject, mode);
      setQuestions(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPracticeSession(selectedMode);
  }, [chapterName, subject, selectedMode]);

  const currentQuestion: PracticeQuestion | undefined = questions[currentIndex];

  // Submit and evaluate answer
  const handleAnswerSubmit = async () => {
    if (!currentQuestion || !studentAnswer.trim()) return;

    setIsEvaluating(true);
    try {
      const evalResult = await fetchEvaluatePracticeAnswer({
        question: currentQuestion,
        studentAnswer: studentAnswer.trim(),
        workingNotes: workingNotes.trim() || undefined,
      });
      setEvaluation(evalResult);
      setUserAnswersHistory((prev) => [
        ...prev,
        {
          question: currentQuestion,
          studentAnswer: studentAnswer.trim(),
          evaluation: evalResult,
        },
      ]);
    } catch (err) {
      console.warn('Evaluation API error, calculating fallback:', err);
      // Fallback evaluation
      const cleanStudent = studentAnswer.trim().toLowerCase();
      const cleanCorrect = currentQuestion.correctAnswer.trim().toLowerCase();
      const isCorrect = cleanStudent === cleanCorrect || cleanStudent.includes(cleanCorrect);

      const fallbackEval: PracticeAnswerEvaluation = {
        isCorrect,
        score: isCorrect ? 100 : 0,
        feedback: isCorrect
          ? `Well done! Your solution matches the target answer (${currentQuestion.correctAnswer}).`
          : `Not quite. The correct answer is ${currentQuestion.correctAnswer}. Check the step-by-step working below.`,
        stepByStepSolution: currentQuestion.stepByStepSolution,
        identifiedMistake: isCorrect ? null : currentQuestion.commonMistake,
        conceptTested: currentQuestion.conceptTested,
        recommendation: isCorrect ? 'Great work! Proceed to the next problem.' : `Review ${currentQuestion.conceptTested}.`,
        canTrySimilar: true,
      };
      setEvaluation(fallbackEval);
      setUserAnswersHistory((prev) => [
        ...prev,
        {
          question: currentQuestion,
          studentAnswer: studentAnswer.trim(),
          evaluation: fallbackEval,
        },
      ]);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Generate similar question for mastery retry
  const handleTrySimilar = async () => {
    if (!currentQuestion) return;
    setIsGeneratingSimilar(true);
    try {
      const similarQ = await fetchSimilarQuestion({
        question: currentQuestion,
        identifiedMistake: evaluation?.identifiedMistake,
      });

      // Replace current question in place or insert right after
      const updatedQuestions = [...questions];
      updatedQuestions[currentIndex] = similarQ;
      setQuestions(updatedQuestions);
      setEvaluation(null);
      setStudentAnswer('');
      setWorkingNotes('');
      setShowHint(false);
    } catch (err) {
      console.warn('Similar question API error:', err);
    } finally {
      setIsGeneratingSimilar(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setEvaluation(null);
      setStudentAnswer('');
      setWorkingNotes('');
      setShowHint(false);
    } else {
      setSessionCompleted(true);
      const totalScore = userAnswersHistory.reduce((acc, curr) => acc + (curr.evaluation.isCorrect ? 1 : 0), 0);
      const weakConcepts = userAnswersHistory
        .filter((h) => !h.evaluation.isCorrect)
        .map((h) => h.question.conceptTested);

      if (onCompleteSession) {
        onCompleteSession({
          score: totalScore,
          total: questions.length,
          weakConcepts: Array.from(new Set(weakConcepts)),
          mode: selectedMode,
        });
      }
    }
  };

  const calculateFinalStats = () => {
    const total = userAnswersHistory.length;
    const correctCount = userAnswersHistory.filter((h) => h.evaluation.isCorrect).length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const mistakes: string[] = [];
    userAnswersHistory.forEach((h) => {
      if (!h.evaluation.isCorrect && h.evaluation.identifiedMistake) {
        mistakes.push(h.evaluation.identifiedMistake);
      }
    });

    return { total, correctCount, percentage, mistakes };
  };

  const stats = calculateFinalStats();

  const getQuestionTypeBadge = (type: string) => {
    switch (type) {
      case 'problem_solving':
        return { label: 'Problem Solving', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'direct_practice':
        return { label: 'Direct Practice', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'worked_example_variation':
        return { label: 'Example Variation', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'word_problem':
        return { label: 'Word Problem', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'error_analysis':
        return { label: 'Error Analysis', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'diagram_based':
        return { label: 'Diagram / Ray Path', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'experiment_activity':
        return { label: 'Lab Activity', color: 'bg-teal-50 text-teal-700 border-teal-200' };
      default:
        return { label: 'Textbook Practice', color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto p-4 sm:p-6 text-slate-800">
      {/* Header Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>{curriculumContext?.board || 'Standard Curriculum'}</span>
            <span>•</span>
            <span className="text-indigo-600">{subject}</span>
            <span>•</span>
            <span className="text-slate-700 truncate max-w-xs">{chapterName}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-6 h-6 text-indigo-600" />
              Textbook Practice & Problem Solving
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
              {sourceLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            id="toggle-patterns-btn"
            onClick={() => setShowPatternMap(!showPatternMap)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Compass className="w-3.5 h-3.5 text-slate-500" />
            {showPatternMap ? 'Hide Pattern Map' : 'View Question Patterns'}
          </button>
          {onClose && (
            <button
              id="close-practice-engine-btn"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Exit
            </button>
          )}
        </div>
      </div>

      {/* Pattern Map Accordion */}
      {showPatternMap && (
        <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Layers className="w-4 h-4 text-indigo-600" />
              Chapter Question Pattern Distribution ({patternMap.subject})
            </h4>
            <span className="text-xs text-slate-500">60-70% Problem Solving • 15-20% Applied • 10-15% Recall</span>
          </div>
          <p className="text-xs text-slate-600 mb-3">
            Questions are constructed strictly from textbook learning objectives. You will solve, calculate, and audit solutions rather than just reading theory.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {patternMap.corePatterns.map((pat) => (
              <div key={pat.id} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-800">{pat.name}</span>
                  <span className="capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
                    Action: {pat.expectedAction}
                  </span>
                </div>
                <p className="text-slate-500 line-clamp-2">{pat.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {[
          {
            id: 'quick_recall' as PracticeMode,
            title: 'Quick Recall',
            count: '5 questions',
            desc: 'Fast formula & rapid calculation checks',
            icon: Clock,
          },
          {
            id: 'practice' as PracticeMode,
            title: 'Practice',
            count: '10 questions',
            desc: 'Textbook-style exercises & solving',
            icon: Edit3,
          },
          {
            id: 'challenge' as PracticeMode,
            title: 'Challenge',
            count: '5 questions',
            desc: 'Multi-step higher-order applications',
            icon: Flame,
          },
          {
            id: 'exam_practice' as PracticeMode,
            title: 'Exam Practice',
            count: '10 questions',
            desc: 'Mixed exam-board style questions',
            icon: Award,
          },
        ].map((m) => {
          const Icon = m.icon;
          const isSelected = selectedMode === m.id;
          const isRecommended = recommendation.mode === m.id;

          return (
            <button
              key={m.id}
              id={`practice-mode-btn-${m.id}`}
              onClick={() => setSelectedMode(m.id)}
              className={`relative flex flex-col text-left p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-indigo-50/70 border-indigo-600 shadow-sm ring-1 ring-indigo-600'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {isRecommended && (
                <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
                  Recommended
                </span>
              )}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-semibold ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`}>
                  {m.title}
                </span>
                <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
              </div>
              <span className="text-[11px] font-medium text-slate-500 mb-0.5">{m.count}</span>
              <span className="text-[11px] text-slate-500 line-clamp-1">{m.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-slate-200 rounded-2xl shadow-sm text-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <h3 className="text-base font-semibold text-slate-800">Generating Textbook-Aligned Practice...</h3>
          <p className="text-xs text-slate-500 max-w-md mt-1">
            Aligning problem structures, learning objectives, and numerical parameter variations for {chapterName}.
          </p>
        </div>
      ) : sessionCompleted ? (
        /* Completed Summary View */
        <div className="p-6 sm:p-8 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="text-center max-w-md mx-auto mb-8">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Practice Session Completed!</h3>
            <p className="text-sm text-slate-600 mt-1">
              You practiced textbook-style problems for <span className="font-semibold text-slate-800">{chapterName}</span>.
            </p>
            <div className="mt-4 inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-left">
                <div className="text-xs text-slate-500">Score</div>
                <div className="text-xl font-bold text-slate-900">
                  {stats.correctCount} / {stats.total}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="text-left">
                <div className="text-xs text-slate-500">Accuracy</div>
                <div className="text-xl font-bold text-indigo-600">{stats.percentage}%</div>
              </div>
            </div>
          </div>

          {/* Error Diagnostics & Mistake Identification */}
          {stats.mistakes.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6">
              <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Diagnosed Frequent Pitfalls:
              </div>
              <ul className="space-y-1 text-xs text-amber-900 list-disc list-inside">
                {Array.from(new Set(stats.mistakes)).map((m, idx) => (
                  <li key={idx} className="font-medium">
                    {m}
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-700 mt-2">
                StudyFlow will schedule targeted practice for these specific calculation patterns.
              </p>
            </div>
          )}

          {/* Review Question List */}
          <div className="space-y-3 mb-6">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Solution Audit</h4>
            {userAnswersHistory.map((item, idx) => (
              <div
                key={item.question.id || idx}
                className={`p-3.5 rounded-xl border text-sm ${
                  item.evaluation.isCorrect ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-slate-900 flex-1">
                    <span className="text-xs font-bold text-slate-500 mr-1.5">Q{idx + 1}:</span>
                    {item.question.question}
                  </div>
                  {item.evaluation.isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded">
                      <XCircle className="w-3.5 h-3.5" /> Needs Review
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-700">Your Answer:</span> {item.studentAnswer}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Correct Answer:</span> {item.question.correctAnswer}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <button
              id="retry-practice-btn"
              onClick={() => loadPracticeSession(selectedMode)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Practice Again
            </button>
            {onClose && (
              <button
                id="done-practice-btn"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
              >
                Done with Practice
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : currentQuestion ? (
        /* Active Question Card */
        <div className="flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-7">
          {/* Progress & Metadata */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500">
                Question {currentIndex + 1} of {questions.length}
              </span>
              {(() => {
                const badge = getQuestionTypeBadge(currentQuestion.type);
                return (
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${badge.color}`}>
                    {badge.label}
                  </span>
                );
              })()}
              <span className="text-[11px] font-medium text-slate-500 capitalize px-2 py-0.5 bg-slate-100 rounded">
                {currentQuestion.difficulty.replace('_', ' ')}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">Concept:</span>
              <span className="text-xs font-semibold text-slate-700 truncate max-w-[160px]">
                {currentQuestion.conceptTested}
              </span>
            </div>
          </div>

          {/* Context / Pattern Note */}
          {currentQuestion.context && (
            <div className="mb-3 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>{currentQuestion.context}</span>
            </div>
          )}

          {/* Question Text */}
          <div className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed mb-5 whitespace-pre-line">
            {currentQuestion.question}
          </div>

          {/* Hint Trigger */}
          {currentQuestion.hint && !evaluation && (
            <div className="mb-4">
              <button
                id="practice-hint-btn"
                onClick={() => setShowHint(!showHint)}
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                {showHint ? 'Hide Hint' : 'Need a hint?'}
              </button>
              {showHint && (
                <div className="mt-1.5 p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-900 animate-fadeIn">
                  💡 {currentQuestion.hint}
                </div>
              )}
            </div>
          )}

          {/* Multiple Choice Options (if present) OR Text Input */}
          {!evaluation ? (
            <div className="space-y-4">
              {currentQuestion.options && currentQuestion.options.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {currentQuestion.options.map((opt, idx) => {
                    const isChosen = studentAnswer === opt;
                    return (
                      <button
                        key={idx}
                        id={`option-choice-btn-${idx}`}
                        onClick={() => setStudentAnswer(opt)}
                        className={`text-left p-3 rounded-xl border text-sm font-medium transition-all ${
                          isChosen
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-950 ring-1 ring-indigo-600'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <span className="inline-block w-5 font-bold text-slate-400 mr-2">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <label htmlFor="student-answer-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Your Answer (Enter numerical value, expression, or concise answer):
                  </label>
                  <input
                    id="student-answer-input"
                    type="text"
                    value={studentAnswer}
                    onChange={(e) => setStudentAnswer(e.target.value)}
                    placeholder="e.g. 7 or -60 or real, inverted..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && studentAnswer.trim()) {
                        handleAnswerSubmit();
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm"
                  />
                </div>
              )}

              {/* Show Working Toggle (Scratchpad for Maths/Physics) */}
              <div>
                <button
                  id="toggle-working-scratchpad-btn"
                  onClick={() => setShowWorkingPad(!showWorkingPad)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                  {showWorkingPad ? 'Hide Working Scratchpad' : 'Show Working (Optional steps)'}
                </button>
                {showWorkingPad && (
                  <div className="mt-2">
                    <textarea
                      id="working-notes-textarea"
                      rows={3}
                      value={workingNotes}
                      onChange={(e) => setWorkingNotes(e.target.value)}
                      placeholder="Write your intermediate formulas or step-by-step arithmetic here (e.g. 5x = 27 + 8 -> 5x = 35)..."
                      className="w-full p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs font-mono text-slate-800 bg-slate-50/50"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end">
                <button
                  id="submit-practice-answer-btn"
                  onClick={handleAnswerSubmit}
                  disabled={!studentAnswer.trim() || isEvaluating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {isEvaluating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Evaluating Method...
                    </>
                  ) : (
                    <>
                      Submit Answer
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Post-Submission Result Card */
            <div className="space-y-4 animate-fadeIn">
              {/* Correct / Incorrect Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  evaluation.isCorrect
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}
              >
                {evaluation.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 text-sm">
                  <div className="font-bold mb-0.5">
                    {evaluation.isCorrect ? 'Correct Solution!' : 'Incorrect / Needs Review'}
                  </div>
                  <p className="text-xs opacity-90">{evaluation.feedback}</p>
                </div>
              </div>

              {/* Answers Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div>
                  <span className="font-bold text-slate-500 block mb-1">Your Submission</span>
                  <div className="font-semibold text-slate-900 bg-white p-2 rounded border border-slate-200">
                    {studentAnswer}
                  </div>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-1">Target Answer</span>
                  <div className="font-semibold text-emerald-700 bg-white p-2 rounded border border-emerald-200">
                    {currentQuestion.correctAnswer}
                  </div>
                </div>
              </div>

              {/* Step-by-Step Complete Working */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Step-by-Step Textbook Method
                </div>
                <ol className="space-y-1.5 text-xs text-slate-800 list-none">
                  {currentQuestion.stepByStepSolution.map((step, idx) => (
                    <li key={idx} className="p-1.5 rounded bg-slate-50 border border-slate-100 font-mono text-[11px]">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Known Common Mistake Warning */}
              {currentQuestion.commonMistake && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                  <span className="font-bold flex items-center gap-1.5 text-amber-800 mb-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Common Pitfall to Watch For:
                  </span>
                  <p>{currentQuestion.commonMistake}</p>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                <button
                  id="try-similar-question-btn"
                  onClick={handleTrySimilar}
                  disabled={isGeneratingSimilar}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  {isGeneratingSimilar ? 'Generating New Variation...' : 'Try a Similar Question (Master Method)'}
                </button>

                <button
                  id="next-practice-question-btn"
                  onClick={handleNextQuestion}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm ml-auto"
                >
                  {currentIndex < questions.length - 1 ? 'Next Question' : 'View Session Results'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
