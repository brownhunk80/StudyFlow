import React, { useState } from 'react';
import {
  Zap,
  BookOpen,
  Folder,
  Calendar,
  Award,
  User,
  ShieldCheck,
  Edit2,
  RotateCcw,
  Check,
  X,
  Plus,
} from 'lucide-react';
import { UserProfile, Exam, SubjectItem } from '../types';

interface ProfileScreenProps {
  user: UserProfile;
  exams: Exam[];
  subjects: SubjectItem[];
  onOpenExamPrep: (examId: string) => void;
  onEditProfile?: () => void;
  onUpdateUser?: (updated: Partial<UserProfile>) => void;
  onResetData?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  exams,
  subjects,
  onOpenExamPrep,
  onUpdateUser,
  onResetData,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editGrade, setEditGrade] = useState(user.grade);
  const [editEmail, setEditEmail] = useState(user.email);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Dynamic Level Calculation based on XP (250 XP per level)
  const currentLevelNum = Math.floor((user.xp || 0) / 250) + 1;
  const xpInCurrentLevel = (user.xp || 0) % 250;
  const xpNeededForNext = 250;
  const progressPercent = Math.min(
    100,
    Math.round((xpInCurrentLevel / xpNeededForNext) * 100)
  );

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    if (onUpdateUser) {
      onUpdateUser({
        name: editName.trim(),
        grade: editGrade.trim() || 'Grade 10',
        email: editEmail.trim() || 'student@school.edu',
        avatarLetter: editName.trim().charAt(0).toUpperCase(),
      });
    }
    setIsEditing(false);
  };

  return (
    <div className="space-y-4 pb-12 max-w-2xl mx-auto pt-2">
      {/* Student Profile Identity Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-4">
          {/* Avatar Circle */}
          <div className="w-14 h-14 rounded-full bg-indigo-600 dark:bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none shrink-0">
            {user.avatarLetter || user.name.charAt(0).toUpperCase() || 'S'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                {user.name}
              </h2>
              <button
                onClick={() => {
                  setEditName(user.name);
                  setEditGrade(user.grade);
                  setEditEmail(user.email);
                  setIsEditing(true);
                }}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </button>
            </div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
              {user.grade} · Level {currentLevelNum} Scholar
            </p>

            <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1.5">
              <Zap className="w-3.5 h-3.5 fill-indigo-600 dark:fill-indigo-400" />
              <span>
                {user.xp.toLocaleString()} XP ·{' '}
                {xpNeededForNext - xpInCurrentLevel} to Level {currentLevelNum + 1}
              </span>
            </div>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-1.5">
            <span>Level {currentLevelNum} Scholar</span>
            <span>
              Level {currentLevelNum + 1} ({progressPercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming Exams Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Upcoming Exams
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {exams.length} {exams.length === 1 ? 'Exam' : 'Exams'}
          </span>
        </div>

        {exams.length === 0 ? (
          <div className="py-6 text-center space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              No exams scheduled yet.
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Head to the Plan section to add an exam and generate your study plan.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => {
              const chapters = exam.chapters || [];
              const mastered = chapters.filter((c) => c.status === 'mastered').length;
              const total = chapters.length;
              const percent = total > 0 ? Math.round((mastered / total) * 100) : 0;

              return (
                <div
                  key={exam.id}
                  onClick={() => onOpenExamPrep(exam.id)}
                  className="cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 transition">
                      {exam.name}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        exam.daysLeft === 0
                          ? 'text-rose-500'
                          : 'text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {exam.daysLeft === 0
                        ? 'Today'
                        : exam.daysLeft === 1
                        ? '1 day left'
                        : `${exam.daysLeft} days left`}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-semibold">
                    {percent}% ready · {chapters.length} chapters
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Subjects & Projects Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3">
          My Subjects & Projects
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {subjects.map((sub) => (
            <div key={sub.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: sub.color }}
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {sub.name}
                </span>
              </div>

              {sub.type === 'study' ? (
                <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  <span>Study</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1">
                  <Folder className="w-3 h-3" />
                  <span>Project</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Data Reset / New Student Clean Slate Option */}
      {onResetData && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-center space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Testing StudyFlow? You can reset your session to a brand-new student slate at any time.
          </p>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 text-slate-700 dark:text-slate-200 text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Fresh Student State</span>
          </button>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Edit Student Profile
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Maya Patel"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Grade / Class
                </label>
                <input
                  type="text"
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                  placeholder="e.g. Grade 10"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="student@school.edu"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Reset to Fresh Student?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This will clear all exams, study plans, tasks, and flashcards so you can test inputting fresh data from the beginning.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  if (onResetData) onResetData();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
