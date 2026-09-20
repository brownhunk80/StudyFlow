import React, { useState } from 'react';
import { BookOpen, Flame, Zap, Trophy, ArrowRight, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthScreenProps {
  user: UserProfile;
  onLogin: (email: string) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ user, onLogin }) => {
  const [email, setEmail] = useState(user.email || 'alex@school.edu');
  const [password, setPassword] = useState('password123');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Top indicator bar */}
      <div className="absolute top-3 text-xs text-slate-400 dark:text-slate-500 font-medium">
        Student Dashboard Screens ▾
      </div>

      <div className="w-full max-w-sm flex flex-col items-center my-auto">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 dark:bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none mb-4">
          <BookOpen className="w-8 h-8" />
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1 text-center">
          StudyFlow
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 text-center font-normal">
          Your connected study system
        </p>

        {/* Login Card */}
        <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
            Welcome back
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Sign in to continue your streak
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                EMAIL
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@school.edu"
                className="w-full px-4 py-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                PASSWORD
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-indigo-200 dark:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-5">
            Demo: use any email & password
          </p>
        </div>

        {/* Bottom preview stats */}
        <div className="w-full grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl py-2.5 px-2 flex flex-col items-center justify-center text-center shadow-xs">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500 mb-0.5" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
              {user.streakDays}-day streak
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl py-2.5 px-2 flex flex-col items-center justify-center text-center shadow-xs">
            <Zap className="w-4 h-4 text-indigo-500 fill-indigo-500 mb-0.5" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
              {user.xp.toLocaleString()} XP
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl py-2.5 px-2 flex flex-col items-center justify-center text-center shadow-xs">
            <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400 mb-0.5" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
              Top {user.percentile}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
