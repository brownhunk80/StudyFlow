import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  BookOpen,
  Clock,
  Check,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SubjectItem, Exam, Chapter, TaskItem } from '../types';
import { fetchSpacedRevisionPlan } from '../utils/aiClient';
import { getChapterCuratedContent } from '../data/chapterTopicsData';

export interface AddExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: SubjectItem[];
  exams: Exam[];
  onAddExamWithChapters?: (
    examData: {
      name: string;
      examDate: string;
      color?: string;
      chapters: Chapter[];
      dailyStudyMinutes?: number;
    },
    generatedTasks?: Array<Omit<TaskItem, 'id' | 'completed'>>
  ) => void;
  onGenerateRecallCards?: (
    cards: Array<{ question: string; answer: string; subject: string; chapter: string }>
  ) => void;
}

export const AddExamModal: React.FC<AddExamModalProps> = ({
  isOpen,
  onClose,
  subjects = [],
  exams = [],
  onAddExamWithChapters,
  onGenerateRecallCards,
}) => {
  // Steps: 1: Select Subject -> 2: Exam Date -> 3: Select Chapters -> 4: Study Time -> 5: Summary / Creating -> 6: Plan Created Confirmation
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Form State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [examDate, setExamDate] = useState<string>('');
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [dailyMinutes, setDailyMinutes] = useState<number>(60); // 30, 60, 120, 180
  const [customSubjects, setCustomSubjects] = useState<SubjectItem[]>([]);
  const [newSubjectInput, setNewSubjectInput] = useState<string>('');

  // Plan generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedTaskCount, setGeneratedTaskCount] = useState<number>(0);

  // Filter study subjects including any locally created ones
  const allStudySubjects = useMemo(() => {
    const list = [...subjects.filter((s) => s.type !== 'project')];
    customSubjects.forEach((cs) => {
      if (!list.some((s) => s.id === cs.id || s.name.toLowerCase() === cs.name.toLowerCase())) {
        list.push(cs);
      }
    });
    return list;
  }, [subjects, customSubjects]);

  const selectedSubject = useMemo(() => {
    return allStudySubjects.find((s) => s.id === selectedSubjectId) || null;
  }, [selectedSubjectId, allStudySubjects]);

  // Find existing exam for this subject to retrieve existing chapters if any
  const existingExam = useMemo(() => {
    if (!selectedSubject) return null;
    return (
      exams.find(
        (e) =>
          e.name.toLowerCase() === selectedSubject.name.toLowerCase() ||
          (selectedSubject.name === 'Maths' && e.name.toLowerCase().includes('math')) ||
          (selectedSubject.name === 'Science' && e.name.toLowerCase().includes('sci')) ||
          (selectedSubject.name === 'English' && e.name.toLowerCase().includes('eng')) ||
          (selectedSubject.name === 'Social Science' && e.name.toLowerCase().includes('soc')) ||
          (selectedSubject.name.includes('Hindi') && e.name.toLowerCase().includes('hin'))
      ) || null
    );
  }, [selectedSubject, exams]);

  // Subject's chapters
  const availableChapters: Chapter[] = useMemo(() => {
    if (existingExam && existingExam.chapters && existingExam.chapters.length > 0) {
      return existingExam.chapters;
    }
    if (!selectedSubject) return [];

    // Fallback chapters based on subject name if none exist
    return [
      {
        id: `chap-${selectedSubject.id}-1`,
        name: `${selectedSubject.name} Fundamentals & Overview`,
        status: 'ready',
        masteryPercentage: 70,
        estimatedMinutes: 35,
      },
      {
        id: `chap-${selectedSubject.id}-2`,
        name: `Core Principles & Applications`,
        status: 'learning',
        masteryPercentage: 50,
        estimatedMinutes: 45,
      },
      {
        id: `chap-${selectedSubject.id}-3`,
        name: `High-Yield Concepts & Problem Solving`,
        status: 'needs_practice',
        masteryPercentage: 40,
        estimatedMinutes: 40,
      },
      {
        id: `chap-${selectedSubject.id}-4`,
        name: `Sample Questions & Review`,
        status: 'learning',
        masteryPercentage: 30,
        estimatedMinutes: 35,
      },
    ];
  }, [existingExam, selectedSubject]);

  // When subject changes, pre-select all chapters by default
  const handleSelectSubject = (subjId: string) => {
    setSelectedSubjectId(subjId);
    const subj = allStudySubjects.find((s) => s.id === subjId);
    if (!subj) return;

    // Find chapters and pre-select all
    const matchingExam = exams.find(
      (e) =>
        e.name.toLowerCase() === subj.name.toLowerCase() ||
        (subj.name === 'Maths' && e.name.toLowerCase().includes('math')) ||
        (subj.name === 'Science' && e.name.toLowerCase().includes('sci')) ||
        (subj.name === 'English' && e.name.toLowerCase().includes('eng')) ||
        (subj.name === 'Social Science' && e.name.toLowerCase().includes('soc')) ||
        (subj.name.includes('Hindi') && e.name.toLowerCase().includes('hin'))
    );

    if (matchingExam && matchingExam.chapters?.length > 0) {
      setSelectedChapterIds(matchingExam.chapters.map((c) => c.id));
      if (matchingExam.examDate) {
        setExamDate(matchingExam.examDate);
      }
    } else {
      setSelectedChapterIds([
        `chap-${subj.id}-1`,
        `chap-${subj.id}-2`,
        `chap-${subj.id}-3`,
        `chap-${subj.id}-4`,
      ]);
    }
  };

  const handleCreateOrSelectSubject = (name: string, color?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = allStudySubjects.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      handleSelectSubject(existing.id);
      return;
    }
    const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];
    const chosenColor = color || colors[allStudySubjects.length % colors.length];
    const newSub: SubjectItem = {
      id: 'sub-' + Date.now(),
      name: trimmed,
      color: chosenColor,
      type: 'study',
    };
    setCustomSubjects((prev) => [...prev, newSub]);
    setSelectedSubjectId(newSub.id);
    setSelectedChapterIds([
      `chap-${newSub.id}-1`,
      `chap-${newSub.id}-2`,
      `chap-${newSub.id}-3`,
      `chap-${newSub.id}-4`,
    ]);
  };

  // Chapter selection helpers
  const handleToggleChapter = (chapterId: string) => {
    setSelectedChapterIds((prev) =>
      prev.includes(chapterId) ? prev.filter((id) => id !== chapterId) : [...prev, chapterId]
    );
  };

  const handleSelectAllChapters = () => {
    setSelectedChapterIds(availableChapters.map((c) => c.id));
  };

  const handleDeselectAllChapters = () => {
    setSelectedChapterIds([]);
  };

  // Format date helper: "21 September"
  const formattedDateDisplay = useMemo(() => {
    if (!examDate) return '';
    try {
      const parts = examDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
      }
      return examDate;
    } catch {
      return examDate;
    }
  }, [examDate]);

  // Days left calculation
  const daysLeft = useMemo(() => {
    if (!examDate) return 0;
    const now = new Date();
    const target = new Date(examDate);
    const diff = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [examDate]);

  // Formatted study time label
  const studyTimeLabel = useMemo(() => {
    if (dailyMinutes === 30) return '30 min / day';
    if (dailyMinutes === 60) return '1 hour / day';
    if (dailyMinutes === 120) return '2 hours / day';
    if (dailyMinutes >= 180) return '3+ hours / day';
    return `${dailyMinutes} min / day`;
  }, [dailyMinutes]);

  // Reset state when closing
  const handleClose = () => {
    setStep(1);
    setSelectedSubjectId('');
    setExamDate('');
    setSelectedChapterIds([]);
    setDailyMinutes(60);
    setIsGenerating(false);
    setGenerationError(null);
    onClose();
  };

  // CREATE PLAN (STEP 5 -> AI Engine / Spaced Revision)
  const handleCreatePlan = async () => {
    if (!selectedSubject || !examDate) return;

    setIsGenerating(true);
    setGenerationError(null);

    // Selected chapter objects
    const selectedChapters = availableChapters.filter((c) => selectedChapterIds.includes(c.id));
    const chaptersToPlan = selectedChapters.length > 0 ? selectedChapters : availableChapters;

    try {
      // Use existing AI spaced revision planning engine
      const aiResponse = await fetchSpacedRevisionPlan(
        selectedSubject.name,
        examDate,
        daysLeft || 14,
        chaptersToPlan.map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          lastTestScore: c.lastTestScore || c.masteryPercentage || 50,
        }))
      );

      // Transform slots into TaskItem objects using existing conventions
      const generatedTasks: Array<Omit<TaskItem, 'id' | 'completed'>> = [];

      if (aiResponse && aiResponse.slots && aiResponse.slots.length > 0) {
        aiResponse.slots.forEach((slot, index) => {
          const slotType = (slot.revisionType || '').toUpperCase();
          const isRecall = slotType.includes('RECALL');
          const isPractice = slotType.includes('PRACTICE');
          const activityType = isRecall ? 'RECALL' : isPractice ? 'PRACTICE' : 'LEARN';

          // First 2 sessions belong to Today, remaining belong to Upcoming
          const isToday = index < 2;

          generatedTasks.push({
            title: `${slot.revisionType || 'Study'}: ${slot.chapterName}`,
            subject: selectedSubject.name,
            chapter: slot.chapterName,
            chapterId: chaptersToPlan.find((c) => c.name === slot.chapterName)?.id,
            durationMin: slot.estimatedMinutes || (dailyMinutes >= 60 ? 35 : 25),
            dateCategory: isToday ? 'today' : 'upcoming',
            activityType,
            type: isRecall ? 'Recall' : isPractice ? 'Practice' : 'Learn',
            priority: 'High Priority',
            examCountdown: daysLeft === 0 ? 'Exam Today' : `${daysLeft}d to exam`,
            whyRationale: slot.keyFocusAreas?.[0] || `Study session for ${slot.chapterName}`,
          });
        });
      } else {
        // Safe fallback matching existing engine rules if API returned empty
        chaptersToPlan.forEach((chap, idx) => {
          const isToday = idx === 0;
          generatedTasks.push({
            title: `Study: ${chap.name}`,
            subject: selectedSubject.name,
            chapter: chap.name,
            chapterId: chap.id,
            durationMin: Math.min(dailyMinutes, 35),
            dateCategory: isToday ? 'today' : 'upcoming',
            activityType: 'LEARN',
            type: 'Learn',
            priority: 'High Priority',
            examCountdown: `${daysLeft}d to exam`,
            whyRationale: `Exam preparation scheduled for ${formattedDateDisplay}`,
          });
          generatedTasks.push({
            title: `Active Recall: ${chap.name}`,
            subject: selectedSubject.name,
            chapter: chap.name,
            chapterId: chap.id,
            durationMin: 20,
            dateCategory: 'upcoming',
            activityType: 'RECALL',
            type: 'Recall',
            priority: 'High Priority',
            examCountdown: `${daysLeft}d to exam`,
            whyRationale: 'Active recall practice',
          });
        });
      }

      // Ensure relevant due flashcards exist in Recall deck for these chapters so Recall receives due items
      if (onGenerateRecallCards) {
        const recallItems: Array<{ question: string; answer: string; subject: string; chapter: string }> = [];
        chaptersToPlan.forEach((chap) => {
          const curated = getChapterCuratedContent(chap.name, selectedSubject.name);
          if (curated && curated.topics && curated.topics.length > 0) {
            curated.topics.slice(0, 3).forEach((t) => {
              recallItems.push({
                question: `Explain the key principle of ${t.title} in ${chap.name}`,
                answer: t.keyInfo.slice(0, 2).join('. '),
                subject: selectedSubject.name,
                chapter: chap.name,
              });
            });
          }
        });

        if (recallItems.length > 0) {
          onGenerateRecallCards(recallItems.slice(0, 6));
        }
      }

      setGeneratedTaskCount(generatedTasks.length);

      // Save exam with selected chapters and inject plan tasks into global state
      if (onAddExamWithChapters) {
        onAddExamWithChapters(
          {
            name: selectedSubject.name,
            examDate: examDate,
            color: selectedSubject.color,
            chapters: chaptersToPlan,
            dailyStudyMinutes: dailyMinutes,
          },
          generatedTasks
        );
      }

      // Show confirmation
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.5 } });
      } catch (e) {}

      setStep(6);
    } catch (err: any) {
      console.warn('Plan generation error, using fallback schedule:', err);
      // Construct clean local fallback plan preserving all functionality
      const fallbackTasks: Array<Omit<TaskItem, 'id' | 'completed'>> = chaptersToPlan.map(
        (chap, idx) => ({
          title: `Study: ${chap.name}`,
          subject: selectedSubject.name,
          chapter: chap.name,
          durationMin: Math.min(dailyMinutes, 30),
          dateCategory: idx === 0 ? 'today' : 'upcoming',
          activityType: 'LEARN',
          type: 'Learn',
          priority: 'High Priority',
          examCountdown: `${daysLeft}d to exam`,
          rationale: 'Core exam study schedule',
        })
      );

      setGeneratedTaskCount(fallbackTasks.length);

      if (onAddExamWithChapters) {
        onAddExamWithChapters(
          {
            name: selectedSubject.name,
            examDate: examDate,
            color: selectedSubject.color,
            chapters: chaptersToPlan,
            dailyStudyMinutes: dailyMinutes,
          },
          fallbackTasks
        );
      }

      setStep(6);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 1 && step < 6 && (
              <button
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="p-1 -ml-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="font-black text-slate-900 dark:text-white text-base">
              {step === 6 ? 'Plan Created' : 'Add Exam'}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {step < 6 && (
              <span className="text-[11px] font-bold text-slate-400">
                Step {step} of 5
              </span>
            )}
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* ================================================================= */}
          {/* STEP 1: SELECT SUBJECT */}
          {/* ================================================================= */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Step 1: Select Subject
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Which subject are you preparing for?
                </p>
              </div>

              {allStudySubjects.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    Choose a common subject or type your own:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      'Mathematics',
                      'Science',
                      'English',
                      'History',
                      'Physics',
                      'Chemistry',
                      'Biology',
                      'Social Science',
                    ].map((suggested) => {
                      const isSelected =
                        selectedSubject?.name.toLowerCase() === suggested.toLowerCase();
                      return (
                        <button
                          key={suggested}
                          type="button"
                          onClick={() => handleCreateOrSelectSubject(suggested)}
                          className={`p-3 rounded-xl border text-xs font-bold transition cursor-pointer text-left flex items-center justify-between ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-white'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="truncate">{suggested}</span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      Or type custom subject
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Economics, Psychology..."
                        value={newSubjectInput}
                        onChange={(e) => setNewSubjectInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newSubjectInput.trim()) {
                            e.preventDefault();
                            handleCreateOrSelectSubject(newSubjectInput.trim());
                            setNewSubjectInput('');
                          }
                        }}
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        disabled={!newSubjectInput.trim()}
                        onClick={() => {
                          if (newSubjectInput.trim()) {
                            handleCreateOrSelectSubject(newSubjectInput.trim());
                            setNewSubjectInput('');
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {allStudySubjects.map((subj) => {
                      const isSelected = selectedSubjectId === subj.id;
                      return (
                        <button
                          key={subj.id}
                          onClick={() => handleSelectSubject(subj.id)}
                          className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-white font-bold'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0"
                              style={{ backgroundColor: subj.color || '#4f46e5' }}
                            >
                              <BookOpen className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {subj.name}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="+ Add another subject..."
                        value={newSubjectInput}
                        onChange={(e) => setNewSubjectInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newSubjectInput.trim()) {
                            e.preventDefault();
                            handleCreateOrSelectSubject(newSubjectInput.trim());
                            setNewSubjectInput('');
                          }
                        }}
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        disabled={!newSubjectInput.trim()}
                        onClick={() => {
                          if (newSubjectInput.trim()) {
                            handleCreateOrSelectSubject(newSubjectInput.trim());
                            setNewSubjectInput('');
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-200 disabled:opacity-40 text-xs font-bold transition cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <button
                disabled={!selectedSubjectId}
                onClick={() => setStep(2)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 mt-2"
              >
                <span>Continue to Exam Date</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: EXAM DATE */}
          {/* ================================================================= */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Step 2: Exam Date
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  When is your {selectedSubject?.name} exam?
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-indigo-600 cursor-pointer"
                  />
                </div>

                {examDate && (
                  <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formattedDateDisplay} ({daysLeft === 0 ? 'Today' : `${daysLeft} days from now`})
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Back
                </button>
                <button
                  disabled={!examDate}
                  onClick={() => setStep(3)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Continue to Chapters</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 3: SELECT CHAPTERS */}
          {/* ================================================================= */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Step 3: Select Chapters
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Choose chapters included in this exam
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAllChapters}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    onClick={handleDeselectAllChapters}
                    className="text-[11px] font-bold text-slate-400 hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {availableChapters.map((chap, idx) => {
                  const isChecked = selectedChapterIds.includes(chap.id);
                  return (
                    <div
                      key={chap.id}
                      onClick={() => handleToggleChapter(chap.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center transition shrink-0 ${
                            isChecked
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {idx + 1}. {chap.name}
                        </span>
                      </div>

                      {chap.estimatedMinutes && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ~{chap.estimatedMinutes}m
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>{selectedChapterIds.length} of {availableChapters.length} chapters selected</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Back
                </button>
                <button
                  disabled={selectedChapterIds.length === 0}
                  onClick={() => setStep(4)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Continue to Study Time</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 4: STUDY TIME */}
          {/* ================================================================= */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Step 4: Daily Study Time
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  How much time can you study each day?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { minutes: 30, label: '30 min', desc: 'Light pace' },
                  { minutes: 60, label: '1 hour', desc: 'Recommended' },
                  { minutes: 120, label: '2 hours', desc: 'Intensive' },
                  { minutes: 180, label: '3+ hours', desc: 'Deep prep' },
                ].map((option) => {
                  const isSelected = dailyMinutes === option.minutes;
                  return (
                    <button
                      key={option.minutes}
                      onClick={() => setDailyMinutes(option.minutes)}
                      className={`p-4 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-black'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <Clock className="w-5 h-5 mb-1" />
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {option.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {option.desc}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Review Summary</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 5: CREATE PLAN SUMMARY */}
          {/* ================================================================= */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Step 5: Plan Summary
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Confirm details before generating your study schedule
                </p>
              </div>

              {/* Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
                      style={{ backgroundColor: selectedSubject?.color || '#4f46e5' }}
                    >
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-slate-900 dark:text-white">
                        {selectedSubject?.name} Exam
                      </h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formattedDateDisplay} ({daysLeft === 0 ? 'Today' : `${daysLeft} days left`})
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Chapters</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedChapterIds.length} chapters selected
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Available study time</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {studyTimeLabel}
                    </span>
                  </div>
                </div>
              </div>

              {generationError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{generationError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  disabled={isGenerating}
                  onClick={() => setStep(4)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Back
                </button>
                <button
                  disabled={isGenerating}
                  onClick={handleCreatePlan}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>GENERATING PLAN...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>CREATE MY PLAN</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 6: PLAN CREATED CONFIRMATION */}
          {/* ================================================================= */}
          {step === 6 && (
            <div className="py-6 px-2 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900 dark:text-white">
                  Study Plan Created!
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Your {selectedSubject?.name} exam has been scheduled with {generatedTaskCount || selectedChapterIds.length} study and recall sessions.
                </p>
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-100 dark:border-indigo-900/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Today's Study is on Home · Today's Recall is in Recall</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs text-left space-y-1.5 max-w-xs mx-auto">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Subject:</span>
                  <strong className="text-slate-900 dark:text-white">{selectedSubject?.name}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Target Date:</span>
                  <strong className="text-slate-900 dark:text-white">{formattedDateDisplay}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>Daily Study:</span>
                  <strong className="text-slate-900 dark:text-white">{studyTimeLabel}</strong>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-xs transition cursor-pointer"
              >
                DONE
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
