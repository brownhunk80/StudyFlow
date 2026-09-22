import React, { useState } from 'react';
import { BookOpen, Flame, Moon, Sun, LogOut, ChevronDown, GraduationCap, Compass } from 'lucide-react';
import { TabType } from '../types';
import { useOnboarding } from '../context/OnboardingContext';

interface HeaderProps {
  streakDays: number;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenExamPrep: (examId?: string) => void;
  onOpenGuide?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  streakDays,
  isDarkMode,
  onToggleTheme,
  onLogout,
  activeTab,
  onSelectTab,
  onOpenExamPrep,
  onOpenGuide,
}) => {
  const [showScreenDropdown, setShowScreenDropdown] = useState(false);
  const { replayGuide, resetAllGuides } = useOnboarding();

  const screenOptions = [
    { label: 'Home (Dashboard)', tab: 'home' as TabType },
    { label: 'Learn (Today\'s Plan & Choose Topic)', tab: 'focus' as TabType },
    { label: 'Recall (Active Recall & Spaced Repetition)', tab: 'recall' as TabType },
    { label: 'Plan (Schedule & Exams)', tab: 'plan' as TabType },
    { label: 'Progress & Stats', tab: 'progress' as TabType },
    { label: 'Student Profile', tab: 'profile' as TabType },
    { label: '🧪 Dev Test Suite (/debug-test-suite)', tab: 'debug_test_suite' as TabType },
    { label: '✨ Replay Welcome Tour', action: () => replayGuide('main') },
    { label: '🔄 Reset All Tours & Guides', action: () => resetAllGuides() },
    { label: '🎓 How It Works (Student Guide)', action: () => onOpenGuide && onOpenGuide() },
  ];

  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-colors">
      {/* Figma Top Screen Switcher Banner */}
      <div className="w-full bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/80 py-1 px-4 flex justify-center items-center text-xs text-slate-500 dark:text-slate-400">
        <div className="relative">
          <button
            onClick={() => setShowScreenDropdown(!showScreenDropdown)}
            className="flex items-center gap-1.5 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-0.5 px-2 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
          >
            <span>Student Dashboard Screens</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showScreenDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showScreenDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowScreenDropdown(false)}
              />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 py-1.5 z-50 text-left">
                <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Jump to Figma Screen
                </div>
                {screenOptions.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (opt.tab) onSelectTab(opt.tab);
                      if (opt.action) opt.action();
                      setShowScreenDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-xs text-left hover:bg-indigo-50 dark:hover:bg-slate-700/70 transition-colors flex items-center justify-between ${
                      opt.tab === activeTab
                        ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50/50 dark:bg-slate-700/40'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.tab === activeTab && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main App Bar */}
      <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200 dark:shadow-none group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
            StudyFlow
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Streak pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-semibold shadow-xs">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{streakDays} day streak</span>
          </div>

          {/* Student Flow Guide button */}
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              aria-label="Open Student Flow Guide"
              title="How to use StudyFlow (9th-12th Grade Guide)"
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">How It Works</span>
            </button>
          )}

          {/* Dark / Light Toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Logout / Switch */}
          <button
            onClick={onLogout}
            aria-label="Log out"
            title="Sign out"
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
