import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Search,
  BookOpen,
  Scale,
  Ruler,
  Clock,
  Gauge,
  Zap,
  Activity,
  Flame,
  Cpu,
  Layers,
  Radio,
  Compass,
  Thermometer,
  Copy,
  Check,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  DimensionCategory,
  DIMENSIONAL_REFERENCE_CATEGORIES,
  DimensionalReferenceCategory,
} from '../../utils/mathUnitConversion';

interface UnitConversionReferenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDimension?: DimensionCategory | null;
  onInsertSymbol?: (symbol: string) => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Ruler,
  Weight: Scale,
  Clock,
  Gauge,
  Zap,
  Activity,
  Flame,
  Cpu,
  Layers,
  Radio,
  Compass,
  Thermometer,
};

export const UnitConversionReferenceDrawer: React.FC<UnitConversionReferenceDrawerProps> = ({
  isOpen,
  onClose,
  selectedDimension = null,
  onInsertSymbol,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);

  // Sync initial dimension if passed
  useEffect(() => {
    if (selectedDimension) {
      setActiveCategory(selectedDimension);
    } else {
      setActiveCategory('all');
    }
  }, [selectedDimension, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSymbol(text);
    setTimeout(() => setCopiedSymbol(null), 1800);
  };

  const filteredCategories = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return DIMENSIONAL_REFERENCE_CATEGORIES.filter((cat) => {
      if (activeCategory !== 'all' && cat.id !== activeCategory) {
        return false;
      }

      if (!query) return true;

      const titleMatch = cat.title.toLowerCase().includes(query);
      const descMatch = cat.description.toLowerCase().includes(query);
      const baseMatch = cat.baseSI.toLowerCase().includes(query);
      const unitMatch = cat.commonUnits.some((u) => u.toLowerCase().includes(query));
      const convMatch = cat.conversions.some(
        (c) =>
          c.formula.toLowerCase().includes(query) ||
          c.fromSymbol.toLowerCase().includes(query) ||
          c.toSymbol.toLowerCase().includes(query) ||
          c.example.toLowerCase().includes(query)
      );

      return titleMatch || descMatch || baseMatch || unitMatch || convMatch;
    });
  }, [searchQuery, activeCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Content */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl z-10 flex flex-col h-full border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-950/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                Quick Conversion Reference Sheet
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Searchable SI base formulas & dimensional multipliers
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search units (e.g. km/h, kW, J, atm, psi, kg)..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-400 transition"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Carousel */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1 rounded-lg font-bold shrink-0 transition ${
                activeCategory === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Dimensions
            </button>
            {DIMENSIONAL_REFERENCE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 rounded-lg font-bold shrink-0 transition ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.title.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Categories List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {filteredCategories.length === 0 ? (
            <div className="p-8 text-center space-y-2 text-slate-500 dark:text-slate-400">
              <BookOpen className="w-8 h-8 mx-auto opacity-40" />
              <p className="text-sm font-semibold">No conversion formulas match "{searchQuery}"</p>
              <p className="text-xs">Try searching for symbols like 'm/s', 'kW', 'kPa', or 'J'.</p>
            </div>
          ) : (
            filteredCategories.map((cat) => {
              const IconComp = CATEGORY_ICONS[cat.iconName] || Scale;
              const isSelected = selectedDimension === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-blue-50/60 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-sm'
                      : 'bg-slate-50/70 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Category Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {cat.title}
                          </h3>
                          {isSelected && (
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                              (Current Problem)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Base SI: <strong className="text-slate-700 dark:text-slate-200">{cat.baseSI}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Common Units Quick Toolbar */}
                  <div className="mb-3 flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">Quick Units:</span>
                    {cat.commonUnits.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => {
                          if (onInsertSymbol) {
                            onInsertSymbol(u);
                          } else {
                            handleCopy(u);
                          }
                        }}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 hover:bg-blue-100 dark:hover:bg-blue-950 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 transition flex items-center gap-1 cursor-pointer"
                        title="Click to insert or copy"
                      >
                        <span>{u}</span>
                        {copiedSymbol === u ? (
                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                        ) : null}
                      </button>
                    ))}
                  </div>

                  {/* Conversion Multipliers Table */}
                  <div className="space-y-1.5">
                    {cat.conversions.map((conv, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              {conv.formula}
                            </span>
                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 font-mono">
                              ({conv.factorText})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            e.g. <span className="font-mono text-slate-600 dark:text-slate-300">{conv.example}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(conv.formula)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Copy formula"
                          >
                            {copiedSymbol === conv.formula ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Note */}
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Active recall engine accepts any equivalent SI units automatically.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
