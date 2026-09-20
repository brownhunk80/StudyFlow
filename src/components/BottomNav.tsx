import React from 'react';
import { Home, BookOpen, Brain, CheckSquare, TrendingUp, User } from 'lucide-react';
import { TabType } from '../types';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  dueRecallCount?: number;
  dueCardsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  dueRecallCount,
  dueCardsCount,
}) => {
  const badgeCount = dueCardsCount !== undefined ? dueCardsCount : (dueRecallCount || 0);
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'focus' as TabType, label: 'Learn', icon: BookOpen },
    { id: 'recall' as TabType, label: 'Recall', icon: Brain, badge: badgeCount },
    { id: 'plan' as TabType, label: 'Plan', icon: CheckSquare },
    { id: 'progress' as TabType, label: 'Progress', icon: TrendingUp },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 pb-safe">
      <div className="max-w-lg mx-auto px-2 sm:px-4 h-16 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full pt-1 transition-all cursor-pointer relative ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white dark:border-slate-900">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] mt-1 tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

