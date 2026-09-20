import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  HelpCircle,
  Edit2,
  Sparkles,
  BookOpen,
  ArrowRight,
  Layers,
  ChevronRight,
  X,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import { Exam, Chapter, TaskItem, Flashcard, ChapterStatus } from '../types';
import { calculateExamReadiness } from '../utils/examReadiness';
import { fetchSpacedRevisionPlan } from '../utils/aiClient';

export interface ExamDetailsViewProps {
  exam: Exam;
  tasks: TaskItem[];
  flashcards?: Flashcard[];
  onBack: () => void;
  onViewPlan: () => void;
  onViewRevision: () => void;
  onToggleChapterStatus?: (examId: string, chapterId: string, newStatus: ChapterStatus) => void;
  onUpdateExam?: (updatedExam: Exam) => void;
  onScheduleTasks?: (tasks: Array<Omit<TaskItem, 'id' | 'completed'>>) => void;
  onStartTask?: (task: TaskItem) => void;
}

export const ExamDetailsView: React.FC<ExamDetailsViewProps> = ({
  exam,
  tasks = [],
  flashcards = [],
  onBack,
  onViewPlan,
  onViewRevision,
  onToggleChapterStatus,
  onUpdateExam,
  onScheduleTasks,
  onStartTask,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateSuccess, setRegenerateSuccess] = useState(false);

  // Edit exam state
  const [editName, setEditName] = useState(exam.name);
  const [editDate, setEditDate] = useState(exam.examDate);
  const [newChapterName, setNewChapterName] = useState('');

  // Format date helper: "21 September"
  const formattedDate = (() => {
    if (!exam.examDate) return '';
    try {
      const parts = exam.examDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
      }
      return exam.examDate;
    } catch {
      return exam.examDate;
    }
  })();

  // Tasks associated with this exam
  const examTasks = tasks.filter(
    (t) =>
      t.subject.toLowerCase() === exam.name.toLowerCase() ||
      (exam.name.toLowerCase().includes('sci') && t.subject.toLowerCase().includes('sci')) ||
      (exam.name.toLowerCase().includes('math') && t.subject.toLowerCase().includes('math')) ||
      (exam.name.toLowerCase().includes('eng') && t.subject.toLowerCase().includes('eng')) ||
      (exam.name.toLowerCase().includes('soc') && t.subject.toLowerCase().includes('soc')) ||
      (exam.name.toLowerCase().includes('hin') && t.subject.toLowerCase().includes('hin'))
  );

  const studyTasks = examTasks.filter((t) => t.activityType !== 'RECALL');
  const revisionTasks = examTasks.filter((t) => t.activityType === 'RECALL');

  // Secondary readiness calculation (intact using existing multi-signal logic)
  const readiness = calculateExamReadiness(exam, flashcards, tasks);

  // Helper for chapter status cycling
  const cycleChapterStatus = (chap: Chapter) => {
    if (!onToggleChapterStatus) return;
    let nextStatus: ChapterStatus = 'learning';
    if (chap.status === 'not_started') nextStatus = 'learning';
    else if (chap.status === 'learning' || chap.status === 'needs_practice') nextStatus = 'ready';
    else if (chap.status === 'ready') nextStatus = 'mastered';
    else if (chap.status === 'mastered') nextStatus = 'not_started';

    onToggleChapterStatus(exam.id, chap.id, nextStatus);
  };

  // REGENERATE PLAN using existing planning / AI engine
  const handleRegeneratePlan = async () => {
    setIsRegenerating(true);
    setRegenerateSuccess(false);

    try {
      const aiResponse = await fetchSpacedRevisionPlan(
        exam.name,
        exam.examDate,
        exam.daysLeft || 14,
        (exam.chapters || []).map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          lastTestScore: c.lastTestScore || c.masteryPercentage || 60,
        }))
      );

      const newTasks: Array<Omit<TaskItem, 'id' | 'completed'>> = [];

      if (aiResponse && aiResponse.slots && aiResponse.slots.length > 0) {
        aiResponse.slots.forEach((slot, index) => {
          const isToday = index < 2;
          const slotType = (slot.revisionType || '').toUpperCase();
          const isRecall = slotType.includes('RECALL');
          const isPractice = slotType.includes('PRACTICE');

          newTasks.push({
            title: `${slot.revisionType || 'Study'}: ${slot.chapterName}`,
            subject: exam.name,
            chapter: slot.chapterName,
            chapterId: exam.chapters.find((c) => c.name === slot.chapterName)?.id,
            durationMin: slot.estimatedMinutes || 30,
            dateCategory: isToday ? 'today' : 'upcoming',
            activityType: isRecall ? 'RECALL' : isPractice ? 'PRACTICE' : 'LEARN',
            type: isRecall ? 'Recall' : isPractice ? 'Practice' : 'Learn',
            priority: 'High Priority',
            examCountdown: `${exam.daysLeft}d to exam`,
            whyRationale: slot.keyFocusAreas?.[0] || 'Targeted revision session',
          });
        });
      } else {
        // Fallback generator
        exam.chapters.forEach((chap, idx) => {
          newTasks.push({
            title: `Study: ${chap.name}`,
            subject: exam.name,
            chapter: chap.name,
            chapterId: chap.id,
            durationMin: 30,
            dateCategory: idx === 0 ? 'today' : 'upcoming',
            activityType: 'LEARN',
            type: 'Learn',
            priority: 'High Priority',
            examCountdown: `${exam.daysLeft}d to exam`,
            whyRationale: 'Core exam schedule',
          });
        });
      }

      if (onScheduleTasks) {
        onScheduleTasks(newTasks);
      }

      setRegenerateSuccess(true);
      setTimeout(() => setRegenerateSuccess(false), 3000);
    } catch (err) {
      console.warn('Regenerate plan error:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Save edits
  const handleSaveExamEdits = () => {
    if (!editName.trim() || !onUpdateExam) return;

    const targetDate = new Date(editDate).getTime();
    const diff = Math.max(0, Math.ceil((targetDate - Date.now()) / (1000 * 60 * 60 * 24)));

    onUpdateExam({
      ...exam,
      name: editName.trim(),
      examDate: editDate,
      daysLeft: diff,
    });

    setIsEditModalOpen(false);
  };

  // Add chapter to existing exam
  const handleAddChapterToExam = () => {
    if (!newChapterName.trim() || !onUpdateExam) return;
    const newChap: Chapter = {
      id: 'chap-' + Date.now(),
      name: newChapterName.trim(),
      status: 'not_started',
      masteryPercentage: 0,
    };
    onUpdateExam({
      ...exam,
      chapters: [...exam.chapters, newChap],
    });
    setNewChapterName('');
  };

  // Remove chapter from existing exam
  const handleRemoveChapter = (chapterId: string) => {
    if (!onUpdateExam) return;
    onUpdateExam({
      ...exam,
      chapters: exam.chapters.filter((c) => c.id !== chapterId),
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 pt-4 px-4 transition-colors">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer p-1 -ml-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Plan</span>
          </button>

          <button
            onClick={() => {
              setEditName(exam.name);
              setEditDate(exam.examDate);
              setIsEditModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit Exam</span>
          </button>
        </div>

        {/* Exam Title & Date Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            {exam.name} Exam
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {formattedDate} ·{' '}
            {exam.daysLeft === 0
              ? 'Today'
              : exam.daysLeft === 1
              ? '1 day left'
              : `${exam.daysLeft} days left`}
          </p>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: CHAPTERS LIST */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Chapters ({exam.chapters?.length || 0})
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">
              Tap to update status
            </span>
          </div>

          <div className="space-y-2">
            {(exam.chapters || []).map((chap, idx) => {
              const isMastered = chap.status === 'mastered' || chap.status === 'ready';
              const isLearning =
                chap.status === 'learning' ||
                chap.status === 'needs_practice' ||
                chap.status === 'need_work';

              return (
                <div
                  key={chap.id}
                  onClick={() => cycleChapterStatus(chap)}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-2xs flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status indicator: ✓, ◐, or ○ */}
                    <div className="shrink-0">
                      {isMastered ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : isLearning ? (
                        <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs">
                          ◐
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 text-xs">
                          ○
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        {chap.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 capitalize mt-0.5">
                        {chap.status === 'mastered'
                          ? 'Mastered'
                          : chap.status === 'ready'
                          ? 'Ready'
                          : chap.status === 'needs_practice' || chap.status === 'need_work'
                          ? 'Needs Practice'
                          : chap.status === 'learning'
                          ? 'In Progress'
                          : 'Not Started'}
                        {chap.masteryPercentage !== undefined && ` · ${chap.masteryPercentage}% mastery`}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition shrink-0">
                    Cycle status
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: STUDY PLAN & REVISION PLAN SHORTCUTS */}
        {/* ========================================================================= */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Study Plan */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <BookOpen className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Study Plan
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {studyTasks.length > 0
                  ? `${studyTasks.length} study sessions scheduled for this exam.`
                  : 'Study schedule is integrated into your plan.'}
              </p>
            </div>

            <button
              onClick={onViewPlan}
              className="w-full py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 hover:text-white dark:hover:text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>VIEW PLAN</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Revision Plan */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Layers className="w-4 h-4" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Revision Plan
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {revisionTasks.length > 0
                  ? `${revisionTasks.length} recall sessions scheduled.`
                  : 'Recall sessions scheduled for this exam.'}
              </p>
            </div>

            <button
              onClick={onViewRevision}
              className="w-full py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white dark:hover:text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>VIEW REVISION</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: READINESS SUMMARY (SECONDARY, NOT DOMINANT) */}
        {/* ========================================================================= */}
        <section className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Exam Readiness
            </span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
              {readiness.overallScore}% Ready
            </span>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${readiness.overallScore}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>{readiness.chaptersReady} of {readiness.totalChapters} chapters ready</span>
            <span>{readiness.strongAreas.length} strong chapters</span>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: ACTIONS (EDIT EXAM, REGENERATE PLAN) */}
        {/* ========================================================================= */}
        <section className="space-y-2 pt-2">
          {regenerateSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Study plan updated and refreshed for {exam.name}!</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditName(exam.name);
                setEditDate(exam.examDate);
                setIsEditModalOpen(true);
              }}
              className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Edit2 className="w-4 h-4 text-slate-500" />
              <span>EDIT EXAM</span>
            </button>

            <button
              disabled={isRegenerating}
              onClick={handleRegeneratePlan}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>{isRegenerating ? 'REGENERATING...' : 'REGENERATE PLAN'}</span>
            </button>
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* EDIT EXAM MODAL (In-place, does NOT duplicate records) */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Edit {exam.name} Exam
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Exam Subject
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Exam Date
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                />
              </div>

              {/* Chapters list in edit modal */}
              <div className="pt-2">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chapters
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {exam.chapters.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      <span className="truncate pr-2">{c.name}</span>
                      <button
                        onClick={() => handleRemoveChapter(c.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add chapter input */}
                <div className="flex items-center gap-1.5 mt-2">
                  <input
                    type="text"
                    placeholder="New chapter name"
                    value={newChapterName}
                    onChange={(e) => setNewChapterName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChapterToExam();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddChapterToExam}
                    disabled={!newChapterName.trim()}
                    className="px-3 py-2 rounded-xl bg-indigo-600 disabled:opacity-40 text-white font-bold text-xs cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveExamEdits}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
