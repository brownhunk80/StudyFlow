import React, { useState, useEffect } from 'react';
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  BookOpen,
  Layers,
} from 'lucide-react';
import { TaskItem, Exam, SubjectItem, Chapter, ChapterStatus } from '../types';
import { AddExamModal } from './AddExamModal';
import { TaskModal } from './TaskModal';
import { ExamDetailsView } from './ExamDetailsView';
import { DetailedStudyPlanView } from './DetailedStudyPlanView';
import { useOnboarding } from '../context/OnboardingContext';
import { PageGuideButton } from './guide/PageGuideButton';

export interface PlanScreenProps {
  tasks: TaskItem[];
  exams: Exam[];
  todayTasks?: TaskItem[];
  upcomingTasks?: TaskItem[];
  completedTasks?: TaskItem[];
  subjects?: SubjectItem[];
  onToggleTask?: (taskId: string) => void;
  onStartTask?: (task: TaskItem) => void;
  onAddTask?: (task: Omit<TaskItem, 'id' | 'completed'>) => void;
  onAddExam?: (exam: Omit<Exam, 'id' | 'chapters'>) => void;
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
  onScheduleSpacedPlan?: (tasks: Array<Omit<TaskItem, 'id' | 'completed'>>) => void;
  onToggleChapterStatus?: (examId: string, chapterId: string, status?: ChapterStatus) => void;
  onAddChapter?: (examId: string, chapterName: string) => void;
  onUpdateExam?: (updatedExam: Exam) => void;
  onDeleteChapter?: (examId: string, chapterId: string) => void;
}

export const PlanScreen: React.FC<PlanScreenProps> = ({
  tasks = [],
  exams = [],
  todayTasks = [],
  upcomingTasks = [],
  subjects = [],
  onToggleTask = (_taskId: string) => {},
  onStartTask,
  onAddTask,
  onAddExam,
  onAddExamWithChapters,
  onGenerateRecallCards,
  onScheduleSpacedPlan,
  onToggleChapterStatus,
  onUpdateExam,
  onDeleteChapter,
}) => {
  // Navigation view: 'landing' | 'exam_details' | 'study_plan_details'
  const [currentView, setCurrentView] = useState<'landing' | 'exam_details' | 'study_plan_details'>('landing');
  const [selectedExamForDetails, setSelectedExamForDetails] = useState<Exam | null>(null);

  // Modals
  const [isAddExamModalOpen, setIsAddExamModalOpen] = useState(false);
  const [isTaskModalOpenExplicit, setIsTaskModalOpenExplicit] = useState(false);

  // Derived tasks
  const derivedTodayTasks = todayTasks.length > 0 ? todayTasks : tasks.filter((t) => t.dateCategory === 'today');
  const derivedUpcomingTasks = upcomingTasks.length > 0 ? upcomingTasks : tasks.filter((t) => t.dateCategory === 'upcoming');

  // Check if study plan has been generated
  const hasStudyPlan = (derivedTodayTasks.length + derivedUpcomingTasks.length) > 0;

  // Unique subjects included in current exams or plan
  const plannedSubjectNames = Array.from(
    new Set(
      exams.length > 0
        ? exams.map((e) => e.name)
        : tasks.map((t) => t.subject).filter(Boolean)
    )
  );

  // Format date helper: "21 Sep"
  const formatExamDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {
      return dateString;
    }
  };

  // Find active selected exam data (keeping reactive to props changes)
  const activeSelectedExam = selectedExamForDetails
    ? exams.find((e) => e.id === selectedExamForDetails.id) || selectedExamForDetails
    : null;

  const { triggerPageTour } = useOnboarding();

  useEffect(() => {
    if (currentView === 'landing') {
      triggerPageTour('plan');
    }
  }, [currentView, triggerPageTour]);

  // =========================================================================
  // VIEW: EXAM DETAILS SCREEN
  // =========================================================================
  if (currentView === 'exam_details' && activeSelectedExam) {
    return (
      <ExamDetailsView
        exam={activeSelectedExam}
        tasks={tasks}
        onBack={() => {
          setSelectedExamForDetails(null);
          setCurrentView('landing');
        }}
        onViewPlan={() => {
          setSelectedExamForDetails(activeSelectedExam);
          setCurrentView('study_plan_details');
        }}
        onViewRevision={() => {
          setSelectedExamForDetails(activeSelectedExam);
          setCurrentView('study_plan_details');
        }}
        onToggleChapterStatus={(examId, chapterId, newStatus) => {
          if (onToggleChapterStatus) {
            onToggleChapterStatus(examId, chapterId, newStatus);
          }
        }}
        onUpdateExam={(updated) => {
          if (onUpdateExam) {
            onUpdateExam(updated);
          }
          setSelectedExamForDetails(updated);
        }}
        onDeleteChapter={(examId, chapterId) => {
          if (onDeleteChapter) {
            onDeleteChapter(examId, chapterId);
          }
          if (activeSelectedExam) {
            setSelectedExamForDetails({
              ...activeSelectedExam,
              chapters: activeSelectedExam.chapters.filter((c) => c.id !== chapterId),
            });
          }
        }}
        onScheduleTasks={(newTasks) => {
          if (onScheduleSpacedPlan) {
            onScheduleSpacedPlan(newTasks);
          }
        }}
        onStartTask={onStartTask}
      />
    );
  }

  // =========================================================================
  // VIEW: DETAILED STUDY PLAN VIEW (Timeline / Calendar / List)
  // "What do I need to do before this exam?"
  // TODAY -> TOMORROW -> UPCOMING
  // =========================================================================
  if (currentView === 'study_plan_details') {
    return (
      <DetailedStudyPlanView
        exam={activeSelectedExam || exams[0] || null}
        allExams={exams}
        tasks={tasks}
        onBack={() => {
          if (selectedExamForDetails) {
            setCurrentView('exam_details');
          } else {
            setCurrentView('landing');
          }
        }}
        onToggleTask={onToggleTask}
        onStartTask={onStartTask}
        onUpdateExam={onUpdateExam}
        onScheduleTasks={onScheduleSpacedPlan}
        onSelectExam={(exam) => setSelectedExamForDetails(exam)}
      />
    );
  }

  // =========================================================================
  // VIEW: PRIMARY PLAN LANDING SCREEN
  // "What am I preparing for, and is my study plan ready?"
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 pt-4 px-4 transition-colors">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Main Title */}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Plan</h1>
            <PageGuideButton guideKey="plan" label="How Plan works" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your upcoming exams and active study plan.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: MY EXAMS */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              My Exams
            </h2>
            <button
              data-tour="plan-add-exam-btn"
              onClick={() => setIsAddExamModalOpen(true)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Exam</span>
            </button>
          </div>

          {exams.length === 0 ? (
            <div data-tour="plan-exam-list" className="p-6 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-600 dark:text-slate-400">
                No exams added yet. Add an exam to automatically schedule your study plan.
              </p>
              <button
                onClick={() => setIsAddExamModalOpen(true)}
                className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Exam</span>
              </button>
            </div>
          ) : (
            <div data-tour="plan-exam-list" className="space-y-2">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  onClick={() => {
                    setSelectedExamForDetails(exam);
                    setCurrentView('exam_details');
                  }}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition shadow-2xs hover:shadow-xs group cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-2xs shrink-0"
                      style={{ backgroundColor: exam.color || '#4f46e5' }}
                    >
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        {exam.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatExamDateDisplay(exam.examDate)} ·{' '}
                        {exam.daysLeft === 0
                          ? 'Today'
                          : exam.daysLeft === 1
                          ? '1 day left'
                          : `${exam.daysLeft} days left`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    <span className="text-[11px] font-medium hidden sm:inline">
                      {exam.chapters?.length || 0} chapters
                    </span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Primary Action Button: + ADD EXAM */}
          <button
            onClick={() => setIsAddExamModalOpen(true)}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ADD EXAM</span>
          </button>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: MY STUDY PLAN */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            My Study Plan
          </h2>

          {hasStudyPlan ? (
            /* If a plan exists */
            <div data-tour="plan-create-btn" className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-950/60 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Your study plan is ready</span>
              </div>

              {plannedSubjectNames.length > 0 && (
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {plannedSubjectNames.join(' · ')}
                </p>
              )}

              <button
                onClick={() => {
                  setSelectedExamForDetails(exams[0] || null);
                  setCurrentView('study_plan_details');
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>VIEW PLAN</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* If no plan exists */
            <div data-tour="plan-create-btn" className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Your study plan hasn't been created yet.
              </p>

              <button
                onClick={() => {
                  if (exams.length > 0) {
                    setSelectedExamForDetails(exams[0]);
                    setCurrentView('study_plan_details');
                  } else {
                    setIsAddExamModalOpen(true);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>CREATE MY STUDY PLAN</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: QUICK ACTIONS */}
        {/* ========================================================================= */}
        <section className="space-y-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Quick Actions
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* 1. Add Exam */}
            <button
              onClick={() => setIsAddExamModalOpen(true)}
              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition text-left cursor-pointer flex items-center gap-2.5 group"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                Add Exam
              </span>
            </button>

            {/* 2. Create Study Plan */}
            <button
              onClick={() => {
                if (exams.length > 0) {
                  setSelectedExamForDetails(exams[0]);
                  setCurrentView('study_plan_details');
                } else {
                  setIsAddExamModalOpen(true);
                }
              }}
              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition text-left cursor-pointer flex items-center gap-2.5 group"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                Create Study Plan
              </span>
            </button>

            {/* 3. View Upcoming */}
            <button
              onClick={() => {
                setSelectedExamForDetails(exams[0] || null);
                setCurrentView('study_plan_details');
              }}
              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition text-left cursor-pointer flex items-center gap-2.5 group"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                View Upcoming
              </span>
            </button>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}
      {isAddExamModalOpen && (
        <AddExamModal
          isOpen={isAddExamModalOpen}
          onClose={() => setIsAddExamModalOpen(false)}
          subjects={subjects}
          exams={exams}
          onGenerateRecallCards={onGenerateRecallCards}
          onAddExamWithChapters={(examData, tasks) => {
            if (onAddExamWithChapters) {
              onAddExamWithChapters(examData, tasks);
            } else if (onAddExam) {
              onAddExam({
                name: examData.name,
                examDate: examData.examDate,
                daysLeft: Math.max(0, Math.ceil((new Date(examData.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
                color: examData.color,
              });
            }
          }}
        />
      )}

      {isTaskModalOpenExplicit && (
        <TaskModal
          isOpen={isTaskModalOpenExplicit}
          onClose={() => setIsTaskModalOpenExplicit(false)}
          onSaveTask={(partialTask) => {
            if (onAddTask) {
              onAddTask({
                title: partialTask.title || 'Untitled Task',
                subject: partialTask.subject || 'General',
                durationMin: partialTask.durationMin || 30,
                priority: partialTask.priority || 'High Priority',
                type: partialTask.type || 'Practice',
                dateCategory: partialTask.dateCategory || 'today',
              });
            }
            setIsTaskModalOpenExplicit(false);
          }}
          subjects={subjects}
        />
      )}
    </div>
  );
};
