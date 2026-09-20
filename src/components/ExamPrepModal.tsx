import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  BookOpen,
  AlertCircle,
  Brain,
  FileText,
  Layers,
  Mic,
  UploadCloud,
  GraduationCap,
  HelpCircle,
} from 'lucide-react';
import {
  Exam,
  Chapter,
  ChapterStatus,
  ChapterNote,
  ChapterMaterial,
  Flashcard,
  FlashcardDeck,
  NoteSpacedReview,
  TaskItem,
} from '../types';
import { ChapterStudyHubModal } from './ChapterStudyHubModal';
import { SpacedRevisionPlanModal } from './SpacedRevisionPlanModal';
import { calculateExamReadiness, formatChapterStatusLabel, getChapterStatusColor } from '../utils/examReadiness';

interface ExamPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  selectedExamId: string;
  onSelectExam: (id: string) => void;
  onUpdateExamDate: (id: string, newDate: string) => void;
  onDeleteExam: (id: string) => void;
  onAddChapter: (examId: string, chapterName: string) => void;
  onToggleChapterStatus: (examId: string, chapterId: string, status: ChapterStatus) => void;
  onDeleteChapter: (examId: string, chapterId: string) => void;
  onAddExam: () => void;
  onStartFocusChapter?: (chapter: Chapter, examName: string) => void;
  onStartRecallSubject?: (subject: string) => void;
  decks?: FlashcardDeck[];
  flashcards?: Flashcard[];
  tasks?: TaskItem[];
  onAddFlashcards?: (cards: Array<Omit<Flashcard, 'id' | 'interval' | 'repetitions' | 'easeFactor' | 'status' | 'box'>>) => void;
  onScheduleRevisionTasks?: (tasks: Array<Omit<TaskItem, 'id' | 'completed'>>) => void;
  onUpdateChapterNotes?: (examId: string, chapterId: string, notes: ChapterNote) => void;
  onUpdateChapterStatusAndScore?: (examId: string, chapterId: string, status: ChapterStatus, score?: number) => void;
  onUpdateChapterMaterials?: (examId: string, chapterId: string, materials: ChapterMaterial[]) => void;
  onUpdateNoteSpacedReview?: (examId: string, chapterId: string, review: NoteSpacedReview) => void;
  onNavigateToTab?: (tab: 'home' | 'focus' | 'recall' | 'plan' | 'progress' | 'profile') => void;
  onOpenGuide?: () => void;
}

export const ExamPrepModal: React.FC<ExamPrepModalProps> = ({
  isOpen,
  onClose,
  exams,
  selectedExamId,
  onSelectExam,
  onUpdateExamDate,
  onDeleteExam,
  onAddChapter,
  onToggleChapterStatus,
  onDeleteChapter,
  onAddExam,
  onStartFocusChapter,
  onStartRecallSubject,
  decks = [],
  flashcards = [],
  tasks = [],
  onAddFlashcards,
  onScheduleRevisionTasks,
  onUpdateChapterNotes,
  onUpdateChapterStatusAndScore,
  onUpdateChapterMaterials,
  onUpdateNoteSpacedReview,
  onNavigateToTab,
  onOpenGuide,
}) => {
  const [activeSegment, setActiveSegment] = useState<'chapters' | 'study_plan'>('chapters');
  const [newChapterName, setNewChapterName] = useState('');
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [selectedChapterForHub, setSelectedChapterForHub] = useState<{
    chapter: Chapter;
    initialTab?: 'materials' | 'notes' | 'flashcards' | 'verify' | 'test';
  } | null>(null);
  const [isSpacedPlanModalOpen, setIsSpacedPlanModalOpen] = useState(false);

  if (!isOpen) return null;

  const currentExam = exams.find((e) => e.id === selectedExamId) || exams[0];

  if (!currentExam) return null;

  const chapters = currentExam.chapters || [];
  const examReadiness = calculateExamReadiness(currentExam, flashcards, tasks);
  const totalChapters = examReadiness.totalChapters;
  const masteredCount = examReadiness.chaptersReady;
  const needWorkCount = examReadiness.needsWorkAreas.length;
  const readyPercent = examReadiness.overallScore;

  const handleAddChapterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterName.trim()) return;
    onAddChapter(currentExam.id, newChapterName.trim());
    setNewChapterName('');
    setIsAddingChapter(false);
  };

  const formattedExamDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(currentExam.examDate));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Header Bar matching Figma */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Exam Preparation
            </h2>
            {onOpenGuide && (
              <button
                type="button"
                onClick={onOpenGuide}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 text-xs font-bold transition cursor-pointer"
                title="Open Student Flow Guide"
              >
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Guide</span>
              </button>
            )}
          </div>

          {/* Segmented Toggle (Chapters | Study Plan) */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center">
            <button
              onClick={() => setActiveSegment('chapters')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeSegment === 'chapters'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Chapters
            </button>
            <button
              onClick={() => setActiveSegment('study_plan')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeSegment === 'study_plan'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Study Plan
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Exam Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {exams.map((exam) => {
              const isSelected = exam.id === currentExam.id;
              return (
                <button
                  key={exam.id}
                  onClick={() => onSelectExam(exam.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{exam.name}</span>
                  <span className="ml-1 opacity-80 text-[11px]">{exam.daysLeft}d</span>
                </button>
              );
            })}
            <button
              onClick={onAddExam}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-600/80 dark:border-indigo-400/80 hover:bg-indigo-50 dark:hover:bg-slate-800 transition whitespace-nowrap cursor-pointer"
            >
              + Add Exam
            </button>
          </div>

          {/* Next Exam Card */}
          <div className="bg-indigo-50/60 dark:bg-indigo-950/30 rounded-3xl p-5 border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  NEXT EXAM
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
                  {currentExam.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {formattedExamDate}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-rose-500 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {currentExam.daysLeft}
                  </div>
                  <span className="text-[9px] font-black text-slate-500 uppercase mt-0.5 tracking-tight">
                    DAYS LEFT
                  </span>
                </div>

                <button
                  onClick={() => onDeleteExam(currentExam.id)}
                  title="Delete exam"
                  className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-rose-500 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Exam Date Picker Input */}
            <div className="mt-4 flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl px-3 py-2 border border-indigo-100 dark:border-indigo-900/60">
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Exam date
              </span>
              <input
                type="date"
                value={currentExam.examDate}
                onChange={(e) => onUpdateExamDate(currentExam.id, e.target.value)}
                className="ml-auto text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-none cursor-pointer"
              />
            </div>

            {/* Readiness Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-indigo-200/50 dark:bg-indigo-900/50 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 dark:bg-indigo-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${readyPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-bold text-indigo-900 dark:text-indigo-200 mt-1.5">
                <span>
                  {masteredCount}/{totalChapters} chapters covered
                </span>
                <span>{readyPercent}% ready</span>
              </div>
            </div>
          </div>

          {/* 3 Quick Stat Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 text-center shadow-xs">
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono-digits">
                {masteredCount}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Mastered</div>
            </div>

            <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 text-center shadow-xs">
              <div className="text-xl font-black text-rose-500 font-mono-digits">
                {needWorkCount}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Need work</div>
            </div>

            <div className="bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 text-center shadow-xs">
              <div className="text-xl font-black text-rose-500 font-mono-digits">
                {currentExam.daysLeft}
              </div>
              <div className="text-[11px] font-semibold text-slate-400 mt-0.5">Days left</div>
            </div>
          </div>

          {/* Tab Content A: Chapters (Screenshot 6) */}
          {activeSegment === 'chapters' && (
            <div className="space-y-3">
              <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                WHAT DO I NEED TO STUDY? — TAP A CHAPTER TO OPEN DETAILS
              </div>

              {/* Chapters List */}
              <div className="bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xs">
                {totalChapters === 0 ? (
                  <div className="py-8 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                    No chapters yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {currentExam.chapters.map((chap) => (
                      <div
                        key={chap.id}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/80 transition"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <button
                            onClick={() => {
                              const nextStatus =
                                chap.status === 'mastered'
                                  ? 'not_started'
                                  : chap.status === 'need_work'
                                    ? 'mastered'
                                    : 'need_work';
                              onToggleChapterStatus(currentExam.id, chap.id, nextStatus);
                            }}
                            className={`w-5 h-5 shrink-0 rounded-md flex items-center justify-center transition ${
                              chap.status === 'mastered'
                                ? 'bg-emerald-500 text-white'
                                : chap.status === 'need_work'
                                  ? 'bg-amber-500 text-white'
                                  : 'border-2 border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {chap.status === 'mastered' && <CheckCircle className="w-3.5 h-3.5" />}
                            {chap.status === 'need_work' && <AlertCircle className="w-3.5 h-3.5" />}
                          </button>
                          <div
                            onClick={() => setSelectedChapterForHub({ chapter: chap, initialTab: 'notes' })}
                            className="cursor-pointer min-w-0 flex-1"
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition truncate">
                                {chap.name}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${getChapterStatusColor(chap.status)}`}
                              >
                                {formatChapterStatusLabel(chap.status)}
                              </span>
                              {chap.masteryPercentage !== undefined && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                  {chap.masteryPercentage}% Mastery
                                </span>
                              )}
                              {chap.knowledgeGaps && chap.knowledgeGaps.length > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
                                  {chap.knowledgeGaps.filter(g => g.status !== 'strong').length} Gaps
                                </span>
                              )}
                              {chap.materials && chap.materials.length > 0 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {chap.materials.length} Material{chap.materials.length > 1 ? 's' : ''}
                                </span>
                              )}
                              {chap.lastTestScore !== undefined && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                                  Score: {chap.lastTestScore}%
                                </span>
                              )}
                              {chap.aiNotes && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  Notes ✓
                                </span>
                              )}
                              {chap.noteSpacedReview && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                                  Note Box {chap.noteSpacedReview.box}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Quick AI Hub Shortcuts */}
                          <button
                            title="Upload Materials & Content"
                            onClick={() => setSelectedChapterForHub({ chapter: chap, initialTab: 'materials' })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Chapter Study Notes & Spaced Review"
                            onClick={() => setSelectedChapterForHub({ chapter: chap, initialTab: 'notes' })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Active Recall Flashcards"
                            onClick={() => setSelectedChapterForHub({ chapter: chap, initialTab: 'flashcards' })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Check & Verify Recall Gaps"
                            onClick={() => setSelectedChapterForHub({ chapter: chap, initialTab: 'verify' })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Diagnostic Test & Revision"
                            onClick={() => setSelectedChapterForHub({ chapter: chap, initialTab: 'test' })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Brain className="w-3.5 h-3.5" />
                          </button>

                          {onStartFocusChapter && (
                            <button
                              onClick={() => {
                                onStartFocusChapter(chap, currentExam.name);
                                onClose();
                              }}
                              className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-xs font-bold rounded-lg hover:bg-indigo-100 transition"
                            >
                              Focus
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteChapter(currentExam.id, chap.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 dark:text-slate-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Chapter Button or Form */}
                {isAddingChapter ? (
                  <form
                    onSubmit={handleAddChapterSubmit}
                    className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex gap-2"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={newChapterName}
                      onChange={(e) => setNewChapterName(e.target.value)}
                      placeholder="e.g. Chapter 1: Thermodynamics"
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingChapter(false)}
                      className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingChapter(true)}
                    className="w-full py-3 px-4 border-t border-slate-100 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-50/50 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Chapter</span>
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {onStartRecallSubject && (
                  <button
                    type="button"
                    onClick={() => {
                      onStartRecallSubject(currentExam.name);
                      onClose();
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 font-bold text-xs border border-indigo-200/80 dark:border-indigo-800/80 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Brain className="w-4 h-4" />
                    <span>Practice Active Recall</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveSegment('study_plan')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-xs shadow-md shadow-indigo-300 dark:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>VIEW STUDY PLAN</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Tab Content B: Study Plan (Screenshot 7) */}
          {activeSegment === 'study_plan' && (
            <div className="space-y-3">
              {/* When am I going to study it card */}
              <div className="bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>When am I going to study it?</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Generated from your chapter progress · {totalChapters} chapters · {currentExam.daysLeft} days
                </p>
              </div>

              {/* Rationale explanation card matching Figma Screenshot 7 */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1 leading-relaxed">
                  Based on your exam date, chapter progress and available study time
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Complete sessions to automatically update chapter status and exam readiness.
                </p>
              </div>

              {/* Quick chapter revision generator */}
              <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Recommended Spaced Revision Schedule:
                  </h4>
                  <button
                    onClick={() => setIsSpacedPlanModalOpen(true)}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>AI Spaced Plan</span>
                  </button>
                </div>

                {totalChapters === 0 ? (
                  <p className="text-xs text-slate-400">
                    Add chapters to {currentExam.name} to generate an optimal revision timeline.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {currentExam.chapters.map((chap, idx) => (
                      <div
                        key={chap.id}
                        onClick={() => setSelectedChapterForHub({ chapter: chap, initialTab: 'test' })}
                        className="flex items-center justify-between text-xs py-2 px-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                            Day {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {chap.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                            Diagnostic & Recall
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Big CTA for AI Spaced Revision Schedule */}
              <button
                type="button"
                onClick={() => setIsSpacedPlanModalOpen(true)}
                className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-black text-xs shadow-md shadow-indigo-300 dark:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>GENERATE FULL AI SPACED REVISION PLAN</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chapter Study Hub Modal (Notes, Flashcards, Diagnostic Test & Revision, Verbal Recall) */}
      {selectedChapterForHub && (
        <ChapterStudyHubModal
          isOpen={Boolean(selectedChapterForHub)}
          onClose={() => setSelectedChapterForHub(null)}
          chapter={selectedChapterForHub.chapter}
          subject={currentExam.name}
          examName={currentExam.name}
          examId={currentExam.id}
          examDate={currentExam.examDate}
          daysLeft={currentExam.daysLeft}
          decks={decks}
          initialTab={selectedChapterForHub.initialTab || 'notes'}
          onUpdateChapterNotes={(chapId, notes) => {
            if (onUpdateChapterNotes) {
              onUpdateChapterNotes(currentExam.id, chapId, notes);
            }
          }}
          onUpdateChapterStatus={(chapId, status, score) => {
            if (onUpdateChapterStatusAndScore) {
              onUpdateChapterStatusAndScore(currentExam.id, chapId, status, score);
            } else {
              onToggleChapterStatus(currentExam.id, chapId, status);
            }
          }}
          onAddFlashcards={onAddFlashcards}
          onScheduleRevisionTasks={onScheduleRevisionTasks}
          onUpdateChapterMaterials={(chapId, materials) => {
            if (onUpdateChapterMaterials) {
              onUpdateChapterMaterials(currentExam.id, chapId, materials);
            }
          }}
          onUpdateNoteSpacedReview={(chapId, review) => {
            if (onUpdateNoteSpacedReview) {
              onUpdateNoteSpacedReview(currentExam.id, chapId, review);
            }
          }}
          onNavigateToTab={(tab) => {
            setSelectedChapterForHub(null);
            onClose();
            if (onNavigateToTab) {
              onNavigateToTab(tab);
            }
          }}
          onOpenGuide={onOpenGuide}
        />
      )}

      {/* Spaced Revision Plan Modal */}
      {isSpacedPlanModalOpen && (
        <SpacedRevisionPlanModal
          isOpen={isSpacedPlanModalOpen}
          onClose={() => setIsSpacedPlanModalOpen(false)}
          exam={currentExam}
          onApplyPlanToTasks={(newTasks) => {
            if (onScheduleRevisionTasks) {
              onScheduleRevisionTasks(newTasks);
            }
          }}
        />
      )}
    </div>
  );
};
