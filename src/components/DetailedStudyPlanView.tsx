import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
  Edit3,
  BookOpen,
  RotateCw,
  Play,
  Check,
  Plus,
  Trash2,
  X,
  ChevronDown,
} from 'lucide-react';
import { Exam, TaskItem, Chapter } from '../types';
import { fetchSpacedRevisionPlan } from '../utils/aiClient';

export interface DetailedStudyPlanViewProps {
  exam: Exam | null;
  allExams: Exam[];
  tasks: TaskItem[];
  onBack: () => void;
  onToggleTask: (taskId: string) => void;
  onStartTask?: (task: TaskItem) => void;
  onUpdateExam?: (exam: Exam) => void;
  onScheduleTasks?: (newTasks: Array<Omit<TaskItem, 'id' | 'completed'>>) => void;
  onSelectExam?: (exam: Exam) => void;
}

export const DetailedStudyPlanView: React.FC<DetailedStudyPlanViewProps> = ({
  exam: initialExam,
  allExams = [],
  tasks = [],
  onBack,
  onToggleTask,
  onStartTask,
  onUpdateExam,
  onScheduleTasks,
  onSelectExam,
}) => {
  // Current active exam (fallback to first exam if none selected)
  const [activeExamId, setActiveExamId] = useState<string>(
    initialExam?.id || allExams[0]?.id || ''
  );

  const activeExam = useMemo(() => {
    return allExams.find((e) => e.id === activeExamId) || initialExam || allExams[0] || null;
  }, [allExams, activeExamId, initialExam]);

  // Modals & action states
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit Plan form state
  const [editDate, setEditDate] = useState(activeExam?.examDate || '');
  const [editMinutes, setEditMinutes] = useState<number>(45);

  // Format exam date: "21 September"
  const formattedExamDate = useMemo(() => {
    if (!activeExam?.examDate) return '';
    try {
      const parts = activeExam.examDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
      }
      return activeExam.examDate;
    } catch {
      return activeExam.examDate;
    }
  }, [activeExam]);

  // Filter tasks belonging to the active exam (or all if no specific exam)
  const examTasks = useMemo(() => {
    if (!activeExam) return tasks;
    const nameMatch = activeExam.name.toLowerCase();
    return tasks.filter((t) => {
      const subj = t.subject.toLowerCase();
      return (
        subj === nameMatch ||
        (nameMatch.includes('sci') && subj.includes('sci')) ||
        (nameMatch.includes('math') && subj.includes('math')) ||
        (nameMatch.includes('eng') && subj.includes('eng')) ||
        (nameMatch.includes('soc') && subj.includes('soc')) ||
        (nameMatch.includes('hin') && subj.includes('hin'))
      );
    });
  }, [tasks, activeExam]);

  // Group tasks into TODAY, TOMORROW, and UPCOMING
  const { todayList, tomorrowList, upcomingList } = useMemo(() => {
    const today: TaskItem[] = [];
    const tomorrow: TaskItem[] = [];
    const upcoming: TaskItem[] = [];

    // All tasks with dateCategory === 'today' belong to TODAY
    const directToday = examTasks.filter((t) => t.dateCategory === 'today');
    const remainingTasks = examTasks.filter((t) => t.dateCategory !== 'today');

    today.push(...directToday);

    // From remaining upcoming tasks, take the first 2-3 sessions for TOMORROW
    // and subsequent ones for UPCOMING
    remainingTasks.forEach((t, idx) => {
      if (idx < 2) {
        tomorrow.push(t);
      } else {
        upcoming.push(t);
      }
    });

    // If there were no today tasks, populate a sensible breakdown
    if (today.length === 0 && remainingTasks.length > 0) {
      today.push(remainingTasks[0]);
      if (remainingTasks[1]) tomorrow.push(remainingTasks[1]);
      upcoming.push(...remainingTasks.slice(2));
    }

    return { todayList: today, tomorrowList: tomorrow, upcomingList: upcoming };
  }, [examTasks]);

  // Helper to determine session presentation: 📚 Study vs 🔄 Recall vs ✍️ Practice
  const getSessionPresentation = (task: TaskItem) => {
    const isToday = task.dateCategory === 'today';
    const isRecall =
      task.activityType === 'RECALL' ||
      task.type === 'Recall' ||
      task.title.toLowerCase().includes('recall') ||
      task.title.toLowerCase().includes('quiz');

    const isPractice =
      task.activityType === 'PRACTICE' ||
      task.type === 'Practice' ||
      task.type === 'Test' ||
      task.title.toLowerCase().includes('practice');

    if (isRecall) {
      return {
        badge: isToday ? "🔄 Today's Recall" : '🔄 Recall',
        badgeColor: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60',
        icon: <RotateCw className="w-3.5 h-3.5" />,
      };
    }

    if (isPractice) {
      return {
        badge: '✍️ Practice',
        badgeColor: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60',
        icon: <Edit3 className="w-3.5 h-3.5" />,
      };
    }

    return {
      badge: isToday ? "📚 Today's Study" : '📚 Study Plan',
      badgeColor: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60',
      icon: <BookOpen className="w-3.5 h-3.5" />,
    };
  };

  // Helper to get clean chapter/topic name without repetitive prefixes
  const getCleanChapterName = (task: TaskItem) => {
    if (task.chapter && task.chapter.trim()) {
      return task.chapter;
    }
    // Remove "Study: ", "Recall: ", "Learn: " prefixes from title if present
    return task.title.replace(/^(Study|Learn|Recall|Active Recall|Practice|Revise):\s*/i, '');
  };

  // REGENERATE PLAN using existing scheduling engine
  const handleRegeneratePlan = async () => {
    if (!activeExam) return;
    setIsRegenerating(true);
    setSuccessMessage(null);

    try {
      const chaptersToPlan = (activeExam.chapters || []).map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        lastTestScore: c.lastTestScore || c.masteryPercentage || 60,
      }));

      const aiResponse = await fetchSpacedRevisionPlan(
        activeExam.name,
        activeExam.examDate,
        activeExam.daysLeft || 14,
        chaptersToPlan
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
            subject: activeExam.name,
            chapter: slot.chapterName,
            chapterId: activeExam.chapters?.find((c) => c.name === slot.chapterName)?.id,
            durationMin: slot.estimatedMinutes || (isRecall ? 10 : 25),
            dateCategory: isToday ? 'today' : 'upcoming',
            activityType: isRecall ? 'RECALL' : isPractice ? 'PRACTICE' : 'LEARN',
            type: isRecall ? 'Recall' : isPractice ? 'Practice' : 'Learn',
            priority: 'High Priority',
            examCountdown: `${activeExam.daysLeft}d to exam`,
            whyRationale: slot.keyFocusAreas?.[0] || 'Scheduled study plan session',
          });
        });
      } else {
        // Simple fallback
        (activeExam.chapters || []).forEach((chap, idx) => {
          newTasks.push({
            title: `Study: ${chap.name}`,
            subject: activeExam.name,
            chapter: chap.name,
            chapterId: chap.id,
            durationMin: 25,
            dateCategory: idx === 0 ? 'today' : 'upcoming',
            activityType: 'LEARN',
            type: 'Learn',
            priority: 'High Priority',
            examCountdown: `${activeExam.daysLeft}d to exam`,
            whyRationale: 'Exam preparation schedule',
          });
          newTasks.push({
            title: `Recall: ${chap.name}`,
            subject: activeExam.name,
            chapter: chap.name,
            chapterId: chap.id,
            durationMin: 10,
            dateCategory: 'upcoming',
            activityType: 'RECALL',
            type: 'Recall',
            priority: 'High Priority',
            examCountdown: `${activeExam.daysLeft}d to exam`,
            whyRationale: 'Active retrieval practice',
          });
        });
      }

      if (onScheduleTasks) {
        onScheduleTasks(newTasks);
      }

      setSuccessMessage('Study plan refreshed and updated!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      console.warn('Regenerate plan error:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  // SAVE EDIT PLAN
  const handleSavePlanEdits = () => {
    if (!activeExam || !onUpdateExam) return;

    const targetDate = new Date(editDate).getTime();
    const diff = Math.max(0, Math.ceil((targetDate - Date.now()) / (1000 * 60 * 60 * 24)));

    const updatedExam: Exam = {
      ...activeExam,
      examDate: editDate,
      daysLeft: diff,
    };

    onUpdateExam(updatedExam);
    setIsEditPlanOpen(false);
    setSuccessMessage('Plan settings updated.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Render a task item card in the timeline
  const renderTaskCard = (task: TaskItem) => {
    const { badge, badgeColor } = getSessionPresentation(task);
    const chapterName = getCleanChapterName(task);

    return (
      <div
        key={task.id}
        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-2xs flex items-center justify-between gap-3 group"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Checkbox */}
          <button
            onClick={() => onToggleTask(task.id)}
            className={`w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer shrink-0 ${
              task.completed
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500'
            }`}
          >
            {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>

          <div className="min-w-0 space-y-1">
            {/* Session Type Badge: 📚 Study or 🔄 Recall */}
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${badgeColor}`}
              >
                {badge}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {task.durationMin} min
              </span>
            </div>

            {/* Chapter / Topic Name */}
            <h4
              className={`text-sm font-bold truncate ${
                task.completed
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {chapterName}
            </h4>
          </div>
        </div>

        {/* Start button */}
        {onStartTask && !task.completed && (
          <button
            onClick={() => onStartTask(task)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-300 hover:text-white dark:hover:text-white text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1 opacity-80 group-hover:opacity-100"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Start</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 pt-4 px-4 transition-colors">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer p-1 -ml-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Plan</span>
          </button>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeExam) {
                  setEditDate(activeExam.examDate);
                }
                setIsEditPlanOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>EDIT PLAN</span>
            </button>

            <button
              disabled={isRegenerating}
              onClick={handleRegeneratePlan}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
              <span>{isRegenerating ? 'UPDATING...' : 'REGENERATE PLAN'}</span>
            </button>
          </div>
        </div>

        {/* Exam Title & Date Header */}
        <div className="space-y-1">
          {activeExam ? (
            <>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                {activeExam.name} Exam
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {formattedExamDate}
                {activeExam.daysLeft !== undefined && (
                  <span>
                    {' '}·{' '}
                    {activeExam.daysLeft === 0
                      ? 'Today'
                      : activeExam.daysLeft === 1
                      ? '1 day left'
                      : `${activeExam.daysLeft} days left`}
                  </span>
                )}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Study Plan
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Timeline of scheduled study and recall sessions
              </p>
            </>
          )}
        </div>

        {/* If multiple exams exist, provide a clean switcher */}
        {allExams.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {allExams.map((e) => {
              const isSelected = e.id === activeExam?.id;
              return (
                <button
                  key={e.id}
                  onClick={() => {
                    setActiveExamId(e.id);
                    if (onSelectExam) onSelectExam(e);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {e.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TIMELINE SECTION: TODAY */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Today
            </h2>
            <span className="text-[11px] font-medium text-slate-400">
              {todayList.filter((t) => t.completed).length} of {todayList.length} completed
            </span>
          </div>

          {todayList.length === 0 ? (
            <div className="p-5 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400">
              No sessions scheduled for today.
            </div>
          ) : (
            <div className="space-y-2.5">{todayList.map(renderTaskCard)}</div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* TIMELINE SECTION: TOMORROW */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tomorrow
          </h2>

          {tomorrowList.length === 0 ? (
            <div className="p-5 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400">
              No sessions scheduled for tomorrow.
            </div>
          ) : (
            <div className="space-y-2.5">{tomorrowList.map(renderTaskCard)}</div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* TIMELINE SECTION: UPCOMING */}
        {/* ========================================================================= */}
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Upcoming
          </h2>

          {upcomingList.length === 0 ? (
            <div className="p-5 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-400">
              No further sessions scheduled before exam day.
            </div>
          ) : (
            <div className="space-y-2.5">{upcomingList.map(renderTaskCard)}</div>
          )}
        </section>

        {/* Primary Bottom Actions */}
        <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center gap-2">
          <button
            onClick={() => {
              if (activeExam) setEditDate(activeExam.examDate);
              setIsEditPlanOpen(true);
            }}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Edit3 className="w-4 h-4 text-slate-500" />
            <span>EDIT PLAN</span>
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
      </div>

      {/* ========================================================================= */}
      {/* EDIT PLAN MODAL */}
      {/* ========================================================================= */}
      {isEditPlanOpen && activeExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Edit {activeExam.name} Plan
              </h3>
              <button
                onClick={() => setIsEditPlanOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Exam Date
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Daily Study Goal
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setEditMinutes(mins)}
                      className={`py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        editMinutes === mins
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-1 text-[11px] text-slate-500">
                Saving updates will adjust your study plan for the remaining days before your {activeExam.name} exam.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsEditPlanOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlanEdits}
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
