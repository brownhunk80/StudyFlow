import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Flame,
  Target,
  Award,
  Sparkles,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Lock,
  ChevronRight,
  Zap,
  Info,
  Clock,
  Brain,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export interface DailyFocusActivity {
  dayName: string; // 'Mon', 'Tue', etc.
  dateString: string; // '2026-09-21'
  focusMinutes: number;
  recallCards: number;
  completedTasks: number;
  isGoalMet: boolean;
  intensity: number; // 0 to 4
}

export interface MasteryBadge {
  id: string;
  name: string;
  category: 'streak' | 'recall' | 'focus' | 'milestone';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  description: string;
  requirementText: string;
  icon: string;
  currentProgress: number;
  targetRequirement: number;
  unit: string;
  isUnlocked: boolean;
  unlockedDate?: string;
  colorGradient: string;
  borderColor: string;
}

export interface FocusMilestonesProps {
  currentStreakDays: number;
  totalFocusMinutes?: number;
  totalCardsReviewed?: number;
  chaptersCompleted?: number;
  onSelectMilestoneGoal?: (goalDays: number) => void;
}

export const FocusMilestonesD3Consistency: React.FC<FocusMilestonesProps> = ({
  currentStreakDays,
  totalFocusMinutes = 240,
  totalCardsReviewed = 45,
  chaptersCompleted = 3,
  onSelectMilestoneGoal,
}) => {
  const [selectedGoalDays, setSelectedGoalDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('studyflow_target_streak_goal');
      if (saved) return Number(saved);
    } catch {}
    if (currentStreakDays < 3) return 3;
    if (currentStreakDays < 7) return 7;
    if (currentStreakDays < 14) return 14;
    if (currentStreakDays < 21) return 21;
    return 30;
  });

  const [activeTab, setActiveTab] = useState<'weekly' | 'trend'>('weekly');
  const [activeHoverDay, setActiveHoverDay] = useState<DailyFocusActivity | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<MasteryBadge | null>(null);
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const svgWeeklyRef = useRef<SVGSVGElement | null>(null);
  const svgTrendRef = useRef<SVGSVGElement | null>(null);

  // Generate 7-day weekly activity dataset
  const weeklyActivities: DailyFocusActivity[] = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const todayIndex = 6; // Sunday is today in standard mock timeline

    return days.map((dayName, idx) => {
      // Days within current active streak
      const daysAgo = todayIndex - idx;
      const isActiveInStreak = daysAgo >= 0 && daysAgo < currentStreakDays;

      const focusMinutes = isActiveInStreak
        ? Math.min(120, Math.max(30, 35 + (idx * 13) % 45 + (idx === todayIndex ? 25 : 0)))
        : idx < todayIndex - currentStreakDays
        ? (idx % 2 === 0 ? 25 : 0)
        : 0;

      const recallCards = isActiveInStreak
        ? Math.max(6, Math.round(focusMinutes * 0.4 + (idx * 3) % 10))
        : 0;

      const completedTasks = isActiveInStreak ? Math.max(1, (idx % 3) + 1) : 0;
      const isGoalMet = focusMinutes >= 25 || recallCards >= 10;
      const intensity = focusMinutes >= 60 ? 4 : focusMinutes >= 45 ? 3 : focusMinutes >= 25 ? 2 : focusMinutes > 0 ? 1 : 0;

      const d = new Date();
      d.setDate(d.getDate() - (todayIndex - idx));
      const dateString = d.toISOString().split('T')[0];

      return {
        dayName,
        dateString,
        focusMinutes,
        recallCards,
        completedTasks,
        isGoalMet,
        intensity,
      };
    });
  }, [currentStreakDays]);

  // Generate 14-day trendline dataset
  const streakTrendData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const dayOffset = 13 - i;
      const dayNumber = i + 1;
      const isDayActive = dayOffset < currentStreakDays;
      const score = isDayActive ? Math.min(100, Math.round(55 + (i * 3.8) + (i % 3) * 4)) : 0;
      const targetScore = Math.min(100, 50 + (i * 3.5));

      return {
        dayIndex: dayNumber,
        label: `Day ${dayNumber}`,
        score,
        targetScore,
        isActive: isDayActive,
      };
    });
  }, [currentStreakDays]);

  // Milestone Streak Goals
  const milestoneGoals = [
    {
      days: 3,
      name: '3-Day Sprint',
      title: 'Habit Igniter',
      badgeTier: 'bronze',
      rewardBadge: 'Bronze Spark',
      description: 'Ignite momentum with 3 consecutive days of deep study.',
      color: '#f59e0b',
    },
    {
      days: 7,
      name: '7-Day Loop',
      title: 'Weekly Rhythm',
      badgeTier: 'silver',
      rewardBadge: 'Silver Momentum',
      description: 'Complete a full 7-day study loop without missing a beat.',
      color: '#06b6d4',
    },
    {
      days: 14,
      name: '14-Day Lock-In',
      title: 'Spaced Architect',
      badgeTier: 'gold',
      rewardBadge: 'Gold Rhythm',
      description: 'Reinforce memory retention across two full study weeks.',
      color: '#eab308',
    },
    {
      days: 21,
      name: '21-Day Habit',
      title: 'Discipline Master',
      badgeTier: 'platinum',
      rewardBadge: 'Platinum Retention',
      description: 'Form unbreakable automatic recall and focus consistency.',
      color: '#8b5cf6',
    },
    {
      days: 30,
      name: '30-Day Legend',
      title: 'Grandmaster',
      badgeTier: 'diamond',
      rewardBadge: 'Grandmaster Diamond',
      description: 'Peak academic mastery with a flawless 30-day streak.',
      color: '#ec4899',
    },
  ];

  // Mastery Badges
  const masteryBadges: MasteryBadge[] = useMemo(() => {
    return [
      {
        id: 'badge-streak-3',
        name: 'Bronze Spark',
        category: 'streak',
        tier: 'bronze',
        description: 'Completed a 3-day continuous focus streak.',
        requirementText: 'Maintain a 3-day active study streak',
        icon: '🥉',
        currentProgress: Math.min(3, currentStreakDays),
        targetRequirement: 3,
        unit: 'days',
        isUnlocked: currentStreakDays >= 3,
        unlockedDate: currentStreakDays >= 3 ? 'Active Streak' : undefined,
        colorGradient: 'from-amber-600 to-amber-800',
        borderColor: 'border-amber-500/40',
      },
      {
        id: 'badge-streak-7',
        name: 'Silver Momentum',
        category: 'streak',
        tier: 'silver',
        description: 'Achieved 7 consecutive days of active learning.',
        requirementText: 'Sustain a 7-day streak goal',
        icon: '🥈',
        currentProgress: Math.min(7, currentStreakDays),
        targetRequirement: 7,
        unit: 'days',
        isUnlocked: currentStreakDays >= 7,
        unlockedDate: currentStreakDays >= 7 ? 'Active Streak' : undefined,
        colorGradient: 'from-slate-300 to-slate-500',
        borderColor: 'border-slate-400/50',
      },
      {
        id: 'badge-streak-14',
        name: 'Gold Rhythm',
        category: 'streak',
        tier: 'gold',
        description: 'Solidified a 14-day spaced repetition retention habit.',
        requirementText: 'Complete 14 consecutive study days',
        icon: '🥇',
        currentProgress: Math.min(14, currentStreakDays),
        targetRequirement: 14,
        unit: 'days',
        isUnlocked: currentStreakDays >= 14,
        unlockedDate: currentStreakDays >= 14 ? 'Active Streak' : undefined,
        colorGradient: 'from-amber-400 to-yellow-600',
        borderColor: 'border-yellow-400/50',
      },
      {
        id: 'badge-streak-21',
        name: 'Platinum Retention',
        category: 'streak',
        tier: 'platinum',
        description: 'Hardened 21-day cognitive discipline milestone.',
        requirementText: 'Reach 21 days of unbroken focus',
        icon: '💎',
        currentProgress: Math.min(21, currentStreakDays),
        targetRequirement: 21,
        unit: 'days',
        isUnlocked: currentStreakDays >= 21,
        unlockedDate: currentStreakDays >= 21 ? 'Active Streak' : undefined,
        colorGradient: 'from-purple-400 to-indigo-600',
        borderColor: 'border-purple-400/50',
      },
      {
        id: 'badge-streak-30',
        name: 'Grandmaster Diamond',
        category: 'streak',
        tier: 'diamond',
        description: 'Achieved a legendary 30-day streak milestone.',
        requirementText: 'Achieve a full 30-day StudyFlow streak',
        icon: '👑',
        currentProgress: Math.min(30, currentStreakDays),
        targetRequirement: 30,
        unit: 'days',
        isUnlocked: currentStreakDays >= 30,
        unlockedDate: currentStreakDays >= 30 ? 'Active Streak' : undefined,
        colorGradient: 'from-pink-500 via-purple-500 to-indigo-600',
        borderColor: 'border-pink-500/50',
      },
      {
        id: 'badge-recall-ace',
        name: 'Neural Recall Ace',
        category: 'recall',
        tier: 'gold',
        description: 'Successfully recalled 50+ flashcards with high confidence.',
        requirementText: 'Review 50 flashcards in active recall decks',
        icon: '🧠',
        currentProgress: Math.min(50, totalCardsReviewed),
        targetRequirement: 50,
        unit: 'cards',
        isUnlocked: totalCardsReviewed >= 50,
        unlockedDate: totalCardsReviewed >= 50 ? 'Unlocked' : undefined,
        colorGradient: 'from-emerald-400 to-teal-600',
        borderColor: 'border-emerald-400/50',
      },
      {
        id: 'badge-focus-prodigy',
        name: 'Focus Prodigy',
        category: 'focus',
        tier: 'platinum',
        description: 'Logged over 200 minutes of deep distraction-free study.',
        requirementText: 'Log 200+ minutes of deep focus time',
        icon: '⚡',
        currentProgress: Math.min(200, totalFocusMinutes),
        targetRequirement: 200,
        unit: 'min',
        isUnlocked: totalFocusMinutes >= 200,
        unlockedDate: totalFocusMinutes >= 200 ? 'Unlocked' : undefined,
        colorGradient: 'from-blue-500 to-indigo-700',
        borderColor: 'border-blue-400/50',
      },
      {
        id: 'badge-curriculum-champ',
        name: 'Curriculum Champion',
        category: 'milestone',
        tier: 'gold',
        description: 'Mastered 3 or more chapter milestones across subjects.',
        requirementText: 'Complete 3 full chapter milestones',
        icon: '🏆',
        currentProgress: Math.min(3, chaptersCompleted),
        targetRequirement: 3,
        unit: 'milestones',
        isUnlocked: chaptersCompleted >= 3,
        unlockedDate: chaptersCompleted >= 3 ? 'Unlocked' : undefined,
        colorGradient: 'from-amber-500 to-rose-600',
        borderColor: 'border-amber-400/50',
      },
    ];
  }, [currentStreakDays, totalCardsReviewed, totalFocusMinutes, chaptersCompleted]);

  const filteredBadges = useMemo(() => {
    if (badgeFilter === 'unlocked') return masteryBadges.filter((b) => b.isUnlocked);
    if (badgeFilter === 'locked') return masteryBadges.filter((b) => !b.isUnlocked);
    return masteryBadges;
  }, [masteryBadges, badgeFilter]);

  const unlockedCount = masteryBadges.filter((b) => b.isUnlocked).length;

  const handleSelectGoal = (days: number) => {
    setSelectedGoalDays(days);
    try {
      localStorage.setItem('studyflow_target_streak_goal', String(days));
    } catch {}
    onSelectMilestoneGoal?.(days);
    if (currentStreakDays >= days) {
      confetti({ particleCount: 30, spread: 40 });
    }
  };

  // -------------------------------------------------------------
  // D3 WEEKLY CONSISTENCY MATRIX RENDERING
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'weekly' || !svgWeeklyRef.current) return;

    const svg = d3.select(svgWeeklyRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 25, bottom: 40, left: 35 };
    const width = 420 - margin.left - margin.right;
    const height = 180 - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 420 180`)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // X scale
    const x = d3
      .scaleBand()
      .range([0, width])
      .domain(weeklyActivities.map((d) => d.dayName))
      .padding(0.28);

    // Y scale (Focus minutes)
    const maxMinutes = d3.max(weeklyActivities, (d) => d.focusMinutes) || 60;
    const y = d3.scaleLinear().domain([0, Math.max(60, maxMinutes + 15)]).range([height, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(y)
          .ticks(3)
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .selectAll('.tick line')
      .attr('stroke', 'rgba(148, 163, 184, 0.15)')
      .attr('stroke-dasharray', '3,3');

    g.selectAll('.domain').remove();

    // 25 min Daily Habit Benchmark Line
    const benchmarkY = y(25);
    g.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', benchmarkY)
      .attr('y2', benchmarkY)
      .attr('stroke', '#a855f7')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.6);

    g.append('text')
      .attr('x', width - 2)
      .attr('y', benchmarkY - 4)
      .attr('text-anchor', 'end')
      .attr('class', 'text-[9px] font-bold fill-purple-500 dark:fill-purple-400')
      .text('Goal (25m)');

    // Render Bars
    const barGroups = g.selectAll('.bar-group').data(weeklyActivities).enter().append('g').attr('class', 'bar-group');

    // Gradients for bars
    const defs = svg.append('defs');
    weeklyActivities.forEach((d, i) => {
      const grad = defs
        .append('linearGradient')
        .attr('id', `bar-grad-${i}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      if (d.focusMinutes >= 45) {
        grad.append('stop').attr('offset', '0%').attr('stop-color', '#8b5cf6');
        grad.append('stop').attr('offset', '100%').attr('stop-color', '#6366f1');
      } else if (d.focusMinutes >= 25) {
        grad.append('stop').attr('offset', '0%').attr('stop-color', '#06b6d4');
        grad.append('stop').attr('offset', '100%').attr('stop-color', '#3b82f6');
      } else if (d.focusMinutes > 0) {
        grad.append('stop').attr('offset', '0%').attr('stop-color', '#fbbf24');
        grad.append('stop').attr('offset', '100%').attr('stop-color', '#f59e0b');
      } else {
        grad.append('stop').attr('offset', '0%').attr('stop-color', '#475569');
        grad.append('stop').attr('offset', '100%').attr('stop-color', '#334155');
      }
    });

    barGroups
      .append('rect')
      .attr('x', (d) => x(d.dayName) || 0)
      .attr('width', x.bandwidth())
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', (_d, i) => `url(#bar-grad-${i})`)
      .attr('y', height)
      .attr('height', 0)
      .style('cursor', 'pointer')
      .on('mouseenter', (_event, d) => setActiveHoverDay(d))
      .on('mouseleave', () => setActiveHoverDay(null))
      .transition()
      .duration(650)
      .ease(d3.easeCubicOut)
      .attr('y', (d) => (d.focusMinutes > 0 ? y(d.focusMinutes) : height - 4))
      .attr('height', (d) => (d.focusMinutes > 0 ? height - y(d.focusMinutes) : 4));

    // X Axis Labels
    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickSize(0))
      .selectAll('text')
      .attr('dy', '1.3em')
      .attr('class', (d: any) => {
        const item = weeklyActivities.find((w) => w.dayName === d);
        return item && item.focusMinutes >= 25
          ? 'text-[11px] font-black fill-purple-600 dark:fill-purple-400'
          : 'text-[10px] font-semibold fill-slate-500 dark:fill-slate-400';
      });

    // Y Axis Labels
    g.append('g')
      .call(d3.axisLeft(y).ticks(3).tickFormat((d) => `${d}m`))
      .selectAll('text')
      .attr('class', 'text-[10px] font-mono fill-slate-400');
  }, [activeTab, weeklyActivities]);

  // -------------------------------------------------------------
  // D3 STREAK TRENDLINE & AREA CHART RENDERING
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'trend' || !svgTrendRef.current) return;

    const svg = d3.select(svgTrendRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 25, bottom: 35, left: 35 };
    const width = 420 - margin.left - margin.right;
    const height = 180 - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 420 180`)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const x = d3
      .scaleLinear()
      .domain([1, 14])
      .range([0, width]);

    const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

    // Defs gradient for area
    const defs = svg.append('defs');
    const areaGrad = defs
      .append('linearGradient')
      .attr('id', 'streak-area-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    areaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#8b5cf6').attr('stop-opacity', 0.45);
    areaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#6366f1').attr('stop-opacity', 0.0);

    // Area generator
    const area = d3
      .area<any>()
      .x((d) => x(d.dayIndex))
      .y0(height)
      .y1((d) => y(d.score))
      .curve(d3.curveMonotoneX);

    // Line generator
    const line = d3
      .line<any>()
      .x((d) => x(d.dayIndex))
      .y((d) => y(d.score))
      .curve(d3.curveMonotoneX);

    // Target benchmark line
    const targetLine = d3
      .line<any>()
      .x((d) => x(d.dayIndex))
      .y((d) => y(d.targetScore))
      .curve(d3.curveMonotoneX);

    // Draw Target trajectory
    g.append('path')
      .datum(streakTrendData)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(148, 163, 184, 0.35)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,4')
      .attr('d', targetLine);

    // Draw Area Fill
    g.append('path')
      .datum(streakTrendData)
      .attr('fill', 'url(#streak-area-grad)')
      .attr('d', area);

    // Draw Line Stroke
    const path = g
      .append('path')
      .datum(streakTrendData)
      .attr('fill', 'none')
      .attr('stroke', '#8b5cf6')
      .attr('stroke-width', 3)
      .attr('d', line);

    // Animate line stroke
    const totalLength = (path.node() as SVGPathElement)?.getTotalLength() || 600;
    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(900)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // Data Circles
    g.selectAll('.dot')
      .data(streakTrendData)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d) => x(d.dayIndex))
      .attr('cy', (d) => y(d.score))
      .attr('r', (d) => (d.isActive ? 4 : 2))
      .attr('fill', (d) => (d.isActive ? '#ec4899' : '#64748b'))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

    // X Axis
    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(x).ticks(7).tickFormat((d) => `Day ${d}`))
      .selectAll('text')
      .attr('class', 'text-[10px] font-mono fill-slate-400');

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(3).tickFormat((d) => `${d}%`))
      .selectAll('text')
      .attr('class', 'text-[10px] font-mono fill-slate-400');
  }, [activeTab, streakTrendData]);

  // Selected Milestone Goal details
  const activeMilestoneGoal = milestoneGoals.find((g) => g.days === selectedGoalDays) || milestoneGoals[1];
  const goalProgressPercent = Math.min(100, Math.round((currentStreakDays / activeMilestoneGoal.days) * 100));
  const daysLeftToGoal = Math.max(0, activeMilestoneGoal.days - currentStreakDays);

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* SECTION 1: FOCUS MILESTONES & D3 CONSISTENCY SPOTLIGHT                   */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-purple-950/70 via-slate-900 to-indigo-950/80 rounded-3xl p-5 sm:p-7 border border-purple-500/30 shadow-xl space-y-6 text-white relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-800/50 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Focus Milestones & Habits</span>
              </span>
              <span className="text-xs text-purple-300/70">• Spaced Repetition Discipline</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white mt-1.5 flex items-center gap-2">
              <span>Sustained Streak:</span>
              <span className="text-amber-400 flex items-center gap-1">
                <Flame className="w-6 h-6 fill-amber-400" />
                <span>{currentStreakDays} Days</span>
              </span>
            </h3>
            <p className="text-xs text-purple-200/80 mt-0.5 max-w-lg">
              Consistent daily recall prevents the Ebbinghaus forgetting curve and cements permanent knowledge.
            </p>
          </div>

          {/* Goal selection pill list */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-purple-800/60">
            {milestoneGoals.map((goal) => {
              const isSelected = goal.days === selectedGoalDays;
              const isAchieved = currentStreakDays >= goal.days;

              return (
                <button
                  key={goal.days}
                  type="button"
                  onClick={() => handleSelectGoal(goal.days)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-md font-black scale-105'
                      : isAchieved
                      ? 'text-emerald-400 hover:bg-white/10'
                      : 'text-purple-300/70 hover:text-white hover:bg-white/5'
                  }`}
                  title={goal.description}
                >
                  {isAchieved ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Target className="w-3.5 h-3.5" />
                  )}
                  <span>{goal.days}d Goal</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Milestone Goal Progress Bar & Reward Callout */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">{activeMilestoneGoal.days >= 30 ? '👑' : activeMilestoneGoal.days >= 21 ? '💎' : activeMilestoneGoal.days >= 14 ? '🥇' : activeMilestoneGoal.days >= 7 ? '🥈' : '🥉'}</span>
              <div>
                <span className="font-bold text-white block">
                  Target: {activeMilestoneGoal.name} ({activeMilestoneGoal.title})
                </span>
                <span className="text-[11px] text-purple-200/70">
                  {daysLeftToGoal === 0
                    ? '🎉 Goal Reached! Ready for next tier.'
                    : `${daysLeftToGoal} more consecutive day${daysLeftToGoal === 1 ? '' : 's'} to unlock "${activeMilestoneGoal.rewardBadge}"`}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-sm font-black text-amber-300 font-mono">
                {goalProgressPercent}%
              </span>
              <span className="text-[10px] text-purple-300/60 block">
                {currentStreakDays}/{activeMilestoneGoal.days} Days
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden border border-purple-900/50">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-purple-500 to-emerald-400 rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${goalProgressPercent}%` }}
            />
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* D3 VISUALIZATION CANVAS (WEEKLY BARS VS 14-DAY RETENTION TREND) */}
        {/* ------------------------------------------------------------- */}
        <div className="p-4 sm:p-6 rounded-2xl bg-slate-950/80 border border-purple-800/60 space-y-4">
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-purple-900/60">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-black text-white">
                D3 Consistency & Habit Trajectory
              </span>
            </div>

            {/* Toggle View */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-purple-900/60 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('weekly')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'weekly'
                    ? 'bg-purple-600 text-white shadow-xs font-black'
                    : 'text-purple-300/70 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Weekly Log</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('trend')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'trend'
                    ? 'bg-purple-600 text-white shadow-xs font-black'
                    : 'text-purple-300/70 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Habit Trend</span>
              </button>
            </div>
          </div>

          {/* SVG Rendering Container */}
          <div className="w-full flex items-center justify-center min-h-[190px]">
            {activeTab === 'weekly' ? (
              <svg ref={svgWeeklyRef} className="w-full max-w-xl h-auto drop-shadow-md" />
            ) : (
              <svg ref={svgTrendRef} className="w-full max-w-xl h-auto drop-shadow-md" />
            )}
          </div>

          {/* Hover Day Detail Tooltip Bar */}
          {activeHoverDay && (
            <div className="p-3 rounded-xl bg-purple-900/60 border border-purple-500/50 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-xs" />
                <span className="font-black text-white">{activeHoverDay.dayName} Activity:</span>
                <span className="text-purple-200">{activeHoverDay.focusMinutes} min logged</span>
              </div>
              <div className="flex items-center gap-4 text-purple-200">
                <span>🧠 {activeHoverDay.recallCards} cards reviewed</span>
                <span>✓ {activeHoverDay.completedTasks} tasks done</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: STUDYFLOW MASTERY BADGES SHOWCASE                              */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                StudyFlow Mastery Badges
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Awarded for sustained streak consistency, active recall mastery, and deep focus habits.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setBadgeFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                badgeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({masteryBadges.length})
            </button>
            <button
              type="button"
              onClick={() => setBadgeFilter('unlocked')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                badgeFilter === 'unlocked'
                  ? 'bg-emerald-500 text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-emerald-600'
              }`}
            >
              <span>Unlocked ({unlockedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setBadgeFilter('locked')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                badgeFilter === 'locked'
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Locked ({masteryBadges.length - unlockedCount})
            </button>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {filteredBadges.map((badge) => {
            const isUnlocked = badge.isUnlocked;
            const percent = Math.min(100, Math.round((badge.currentProgress / badge.targetRequirement) * 100));

            return (
              <div
                key={badge.id}
                onClick={() => {
                  setSelectedBadge(badge);
                  if (badge.isUnlocked) {
                    confetti({ particleCount: 25, spread: 35 });
                  }
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-3 ${
                  isUnlocked
                    ? 'bg-gradient-to-br from-white via-slate-50 to-purple-50/30 dark:from-slate-800 dark:via-slate-850 dark:to-purple-950/20 border-purple-200 dark:border-purple-800/80 shadow-md hover:scale-[1.02] hover:border-purple-400'
                    : 'bg-slate-50/60 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800/80 opacity-70 hover:opacity-90'
                }`}
              >
                {/* Top Badge Icon & Status Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md border ${
                      isUnlocked
                        ? `bg-gradient-to-br ${badge.colorGradient} ${badge.borderColor} text-white`
                        : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 grayscale'
                    }`}
                  >
                    {badge.icon}
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      isUnlocked
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isUnlocked ? 'Unlocked ✓' : 'In Progress'}
                  </span>
                </div>

                {/* Badge Info */}
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                    {badge.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                    {badge.description}
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">{badge.requirementText}</span>
                    <span className="font-bold font-mono text-purple-600 dark:text-purple-400">
                      {badge.currentProgress}/{badge.targetRequirement} {badge.unit}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isUnlocked
                          ? 'bg-gradient-to-r from-emerald-400 to-purple-500'
                          : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BADGE DETAIL POPUP MODAL                                                 */}
      {/* ========================================================================= */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div
              className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-lg border ${
                selectedBadge.isUnlocked
                  ? `bg-gradient-to-br ${selectedBadge.colorGradient} ${selectedBadge.borderColor}`
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
              }`}
            >
              {selectedBadge.icon}
            </div>

            <div className="space-y-1">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {selectedBadge.tier.toUpperCase()} MASTERY BADGE
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                {selectedBadge.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {selectedBadge.description}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-left space-y-1.5 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Requirement:</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedBadge.requirementText}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Current Progress:</span>
                <span className="text-purple-600 dark:text-purple-400">
                  {selectedBadge.currentProgress} / {selectedBadge.targetRequirement} {selectedBadge.unit}
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Status:</span>
                <span className={selectedBadge.isUnlocked ? 'text-emerald-600 font-black' : 'text-amber-600'}>
                  {selectedBadge.isUnlocked ? 'Unlocked & Active' : 'Locked (In Progress)'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusMilestonesD3Consistency;
