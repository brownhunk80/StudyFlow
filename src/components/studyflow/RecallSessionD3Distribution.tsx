import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Brain,
  CheckCircle2,
  RotateCcw,
  EyeOff,
  Sparkles,
  BarChart3,
  PieChart,
  Zap,
  TrendingUp,
  Award,
  Mic,
  ArrowRight,
  Info,
} from 'lucide-react';

export interface CardSessionReviewItem {
  id: string;
  front: string;
  back: string;
  parentConcept?: string;
  rating: 'understood' | 'relearn' | 'disable' | 'good' | 'hard' | 'again';
  voiceAccuracy?: number;
  spokenTranscript?: string;
  intervalDays?: number;
  timeSpentSeconds?: number;
}

export interface RecallSessionD3DistributionProps {
  sessionReviews: CardSessionReviewItem[];
  totalCards: number;
  chapterTitle?: string;
  milestoneTitle?: string;
  onStudyAgain?: () => void;
  onClose?: () => void;
}

export const RecallSessionD3Distribution: React.FC<RecallSessionD3DistributionProps> = ({
  sessionReviews,
  totalCards,
  chapterTitle = 'Chapter',
  milestoneTitle = 'Milestone',
  onStudyAgain,
  onClose,
}) => {
  const [chartView, setChartView] = useState<'donut' | 'bar'>('donut');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const svgDonutRef = useRef<SVGSVGElement | null>(null);
  const svgBarRef = useRef<SVGSVGElement | null>(null);

  // Group reviews into standardized confidence tiers
  const dataDistribution = useMemo(() => {
    let understoodCount = 0;
    let goodCount = 0;
    let relearnCount = 0;
    let disableCount = 0;

    sessionReviews.forEach((item) => {
      if (item.rating === 'understood' || item.rating === 'good') {
        understoodCount += 1;
      } else if (item.rating === 'hard') {
        goodCount += 1;
      } else if (item.rating === 'relearn' || item.rating === 'again') {
        relearnCount += 1;
      } else if (item.rating === 'disable') {
        disableCount += 1;
      } else {
        understoodCount += 1;
      }
    });

    const total = Math.max(1, sessionReviews.length);

    return [
      {
        id: 'understood',
        label: 'Understood / Mastered',
        shortLabel: 'Understood',
        count: understoodCount,
        percentage: Math.round((understoodCount / total) * 100),
        color: '#10b981', // emerald-500
        gradientFrom: '#10b981',
        gradientTo: '#059669',
        icon: CheckCircle2,
        description: 'Retained with high confidence. SM-2 interval boosted by +3-6 days.',
        badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      },
      {
        id: 'good',
        label: 'Partially Recalled / Moderate',
        shortLabel: 'Moderate',
        count: goodCount,
        percentage: Math.round((goodCount / total) * 100),
        color: '#3b82f6', // blue-500
        gradientFrom: '#60a5fa',
        gradientTo: '#2563eb',
        icon: Sparkles,
        description: 'Recalled core principle but minor nuance missed.',
        badgeBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      },
      {
        id: 'relearn',
        label: 'Needs Relearning / Low',
        shortLabel: 'Relearn',
        count: relearnCount,
        percentage: Math.round((relearnCount / total) * 100),
        color: '#f59e0b', // amber-500
        gradientFrom: '#fbbf24',
        gradientTo: '#d97706',
        icon: RotateCcw,
        description: 'Failed recall or low confidence. Queued for 24-hour priority review.',
        badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      },
      {
        id: 'disable',
        label: 'Disabled / Suspended',
        shortLabel: 'Disabled',
        count: disableCount,
        percentage: Math.round((disableCount / total) * 100),
        color: '#64748b', // slate-500
        gradientFrom: '#94a3b8',
        gradientTo: '#475569',
        icon: EyeOff,
        description: 'Muted from active spaced-repetition queue.',
        badgeBg: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
      },
    ].filter((d) => d.count > 0 || sessionReviews.length === 0);
  }, [sessionReviews]);

  // Overall session metrics
  const sessionMetrics = useMemo(() => {
    const total = sessionReviews.length;
    const understoodCount = sessionReviews.filter(
      (r) => r.rating === 'understood' || r.rating === 'good'
    ).length;
    const masteryRate = total > 0 ? Math.round((understoodCount / total) * 100) : 100;

    const voiceScores = sessionReviews
      .filter((r) => typeof r.voiceAccuracy === 'number')
      .map((r) => r.voiceAccuracy as number);
    const avgVoiceScore =
      voiceScores.length > 0
        ? Math.round(voiceScores.reduce((a, b) => a + b, 0) / voiceScores.length)
        : null;

    const relearnCards = sessionReviews.filter((r) => r.rating === 'relearn' || r.rating === 'again');

    return {
      total,
      masteryRate,
      avgVoiceScore,
      relearnCards,
    };
  }, [sessionReviews]);

  // -------------------------------------------------------------
  // D3 DONUT / PIE CHART RENDERING
  // -------------------------------------------------------------
  useEffect(() => {
    if (chartView !== 'donut' || !svgDonutRef.current) return;

    const svg = d3.select(svgDonutRef.current);
    svg.selectAll('*').remove();

    const width = 280;
    const height = 280;
    const radius = Math.min(width, height) / 2;
    const innerRadius = radius * 0.62;
    const outerRadius = radius * 0.92;

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Define linear gradients for slices
    const defs = svg.append('defs');
    dataDistribution.forEach((d) => {
      const grad = defs
        .append('linearGradient')
        .attr('id', `grad-${d.id}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '100%');
      grad.append('stop').attr('offset', '0%').attr('stop-color', d.gradientFrom);
      grad.append('stop').attr('offset', '100%').attr('stop-color', d.gradientTo);
    });

    // Drop shadow filter for glow effect
    const filter = defs.append('filter').attr('id', 'glow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
    filter.append('feComposite').attr('in', 'SourceGraphic').attr('in2', 'blur').attr('operator', 'over');

    const pie = d3
      .pie<any>()
      .value((d) => d.count)
      .sort(null)
      .padAngle(0.04);

    const arc = d3
      .arc<any>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(8);

    const arcHover = d3
      .arc<any>()
      .innerRadius(innerRadius - 4)
      .outerRadius(outerRadius + 8)
      .cornerRadius(10);

    const pieData = pie(dataDistribution);

    // Render Slices with smooth animated tween
    const pathGroup = g.selectAll('.arc').data(pieData).enter().append('g').attr('class', 'arc');

    const paths = pathGroup
      .append('path')
      .attr('fill', (d) => `url(#grad-${d.data.id})`)
      .attr('stroke', 'rgba(15, 23, 42, 0.6)')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.25s ease')
      .on('mouseenter', function (_event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arcHover)
          .style('filter', 'url(#glow)');
        setActiveCategory(d.data.id);
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc)
          .style('filter', 'none');
        setActiveCategory(null);
      });

    // Animate arc entry
    paths
      .transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .attrTween('d', function (d: any) {
        const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function (t: number) {
          return arc(interpolate(t)) || '';
        };
      });

    // Center Text Info
    const centerG = g.append('g').attr('class', 'center-label').attr('text-anchor', 'middle');

    centerG
      .append('text')
      .attr('dy', '-0.3em')
      .attr('class', 'text-2xl font-black fill-slate-900 dark:fill-white')
      .style('font-size', '28px')
      .style('font-weight', '900')
      .style('font-family', 'inherit')
      .text(`${sessionMetrics.masteryRate}%`);

    centerG
      .append('text')
      .attr('dy', '1.3em')
      .attr('class', 'text-xs font-bold fill-slate-500 dark:fill-slate-400')
      .style('font-size', '11px')
      .style('font-weight', '700')
      .style('letter-spacing', '0.05em')
      .style('text-transform', 'uppercase')
      .text('Mastery Index');
  }, [chartView, dataDistribution, sessionMetrics.masteryRate]);

  // -------------------------------------------------------------
  // D3 BAR / DISTRIBUTION HISTOGRAM RENDERING
  // -------------------------------------------------------------
  useEffect(() => {
    if (chartView !== 'bar' || !svgBarRef.current) return;

    const svg = d3.select(svgBarRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 25, right: 30, bottom: 45, left: 45 };
    const width = 380 - margin.left - margin.right;
    const height = 240 - margin.top - margin.bottom;

    const g = svg
      .attr('viewBox', `0 0 380 240`)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // X scale
    const x = d3
      .scaleBand()
      .range([0, width])
      .domain(dataDistribution.map((d) => d.shortLabel))
      .padding(0.35);

    // Y scale
    const maxVal = d3.max(dataDistribution, (d) => d.count) || 1;
    const y = d3.scaleLinear().domain([0, Math.max(5, maxVal + 1)]).range([height, 0]);

    // X Axis
    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(x).tickSize(0))
      .selectAll('text')
      .attr('dy', '1.2em')
      .attr('class', 'text-[11px] font-bold fill-slate-600 dark:fill-slate-300')
      .style('font-family', 'inherit');

    g.selectAll('.domain').attr('stroke', 'rgba(100, 116, 139, 0.3)');

    // Y Axis (Gridlines)
    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickSize(-width)
          .tickFormat(d3.format('d'))
      )
      .selectAll('.tick line')
      .attr('stroke', 'rgba(100, 116, 139, 0.15)')
      .attr('stroke-dasharray', '2,2');

    g.selectAll('.tick text')
      .attr('class', 'text-[10px] font-mono fill-slate-400')
      .style('font-family', 'inherit');

    g.selectAll('.domain').remove();

    // Bars
    g.selectAll('.bar')
      .data(dataDistribution)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => x(d.shortLabel) || 0)
      .attr('width', x.bandwidth())
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', (d) => d.color)
      .attr('y', height)
      .attr('height', 0)
      .style('cursor', 'pointer')
      .on('mouseenter', function (_event, d) {
        d3.select(this).attr('opacity', 0.85);
        setActiveCategory(d.id);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('opacity', 1);
        setActiveCategory(null);
      })
      .transition()
      .duration(700)
      .ease(d3.easeCubicOut)
      .attr('y', (d) => y(d.count))
      .attr('height', (d) => height - y(d.count));

    // Value Labels on Top of Bars
    g.selectAll('.label')
      .data(dataDistribution)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', (d) => (x(d.shortLabel) || 0) + x.bandwidth() / 2)
      .attr('y', height)
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.5em')
      .attr('class', 'text-xs font-black fill-slate-900 dark:fill-white')
      .style('font-family', 'inherit')
      .style('font-size', '12px')
      .text((d) => d.count)
      .transition()
      .duration(700)
      .ease(d3.easeCubicOut)
      .attr('y', (d) => y(d.count));
  }, [chartView, dataDistribution]);

  return (
    <div className="w-full space-y-6 animate-in zoom-in-95 duration-200">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & METRIC SUMMARY */}
      {/* ------------------------------------------------------------- */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-xs font-black tracking-wide uppercase">
          <Award className="w-3.5 h-3.5" />
          <span>Active Recall Session Complete</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          Confidence & Retention Distribution
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Detailed D3 distribution of your confidence ratings and SM-2 retention metrics for{' '}
          <span className="font-bold text-purple-600 dark:text-purple-400">{milestoneTitle}</span>.
        </p>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. STATS KPI TILES */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
            Cards Tested
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            {sessionMetrics.total}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Mastery Rate
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {sessionMetrics.masteryRate}%
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 text-center space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
            SM-2 Growth
          </span>
          <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400">
            +3.2 Days
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-center space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
            Voice Accuracy
          </span>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {sessionMetrics.avgVoiceScore !== null ? `${sessionMetrics.avgVoiceScore}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. D3 CHART CANVAS & BREAKDOWN */}
      {/* ------------------------------------------------------------- */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xl space-y-5">
        {/* Toggle between Radial Donut and Histogram Bar */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/80">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-black text-slate-900 dark:text-white">
              D3 Confidence Breakdown
            </span>
          </div>

          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setChartView('donut')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                chartView === 'donut'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Radial</span>
            </button>
            <button
              type="button"
              onClick={() => setChartView('bar')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                chartView === 'bar'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Bars</span>
            </button>
          </div>
        </div>

        {/* Visual Chart Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Chart SVG Container */}
          <div className="flex items-center justify-center p-2 relative min-h-[260px]">
            {chartView === 'donut' ? (
              <svg ref={svgDonutRef} className="w-full max-w-[260px] h-auto drop-shadow-sm" />
            ) : (
              <svg ref={svgBarRef} className="w-full max-w-[340px] h-auto drop-shadow-sm" />
            )}
          </div>

          {/* Interactive Legend & Tier Cards */}
          <div className="space-y-2.5">
            {dataDistribution.map((item) => {
              const Icon = item.icon;
              const isSelected = activeCategory === item.id;

              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setActiveCategory(item.id)}
                  onMouseLeave={() => setActiveCategory(null)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-50/90 dark:bg-purple-950/60 border-purple-400 dark:border-purple-600 shadow-md scale-[1.02]'
                      : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {item.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {item.count} cards
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        ({item.percentage}%)
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 pl-5.5 leading-normal">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* 4. RELEARN QUEUE RECOMMENDATIONS */}
        {/* ------------------------------------------------------------- */}
        {sessionMetrics.relearnCards.length > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-black text-slate-900 dark:text-white">
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <RotateCcw className="w-3.5 h-3.5" />
                Cards Flagged for Priority Practice ({sessionMetrics.relearnCards.length})
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                Next interval: 24h
              </span>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {sessionMetrics.relearnCards.map((rc, idx) => (
                <div
                  key={rc.id || idx}
                  className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {rc.front}
                    </p>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 italic truncate">
                      Target: {rc.back}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 shrink-0">
                    Relearn (1d)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. ACTION BUTTONS */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        {onStudyAgain && (
          <button
            type="button"
            onClick={onStudyAgain}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Review Deck Again</span>
          </button>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25"
          >
            <span>Return to Roadmap</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default RecallSessionD3Distribution;
