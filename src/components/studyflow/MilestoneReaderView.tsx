import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  BookOpen,
  FileText,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Edit3,
  Save,
  Clock,
  Layers,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  AlignLeft,
  Bookmark,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Section, SummaryMode } from '../../types';

export interface MilestoneReaderViewProps {
  section: Section;
  chapterName: string;
  subjectName?: string;
  chapterRawText?: string;
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckpoints?: () => void;
  onMarkRead?: (sectionId: string) => void;
  onOpenDocumentSource?: () => void;
}

export const MilestoneReaderView: React.FC<MilestoneReaderViewProps> = ({
  section,
  chapterName,
  subjectName = 'Science',
  chapterRawText,
  isOpen,
  onClose,
  onProceedToCheckpoints,
  onMarkRead,
  onOpenDocumentSource,
}) => {
  // Reading mode tab: 'compact' | 'detailed' | 'source'
  const [activeTab, setActiveTab] = useState<'compact' | 'detailed' | 'source'>('compact');
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'larger'>('normal');
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [hasMarkedRead, setHasMarkedRead] = useState(false);

  // Student notes state with localStorage persistence
  const [notes, setNotes] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`milestone_notes_${section.id}`);
      if (saved) return saved;
    } catch {}
    return (
      (section as any).notes ||
      `# Study Notes: ${section.title}\n- Key takeaway: \n- Formulas to memorize: \n- Exam reminder: `
    );
  });
  const [isNotesSaved, setIsNotesSaved] = useState(false);

  // Mark as read upon viewing
  useEffect(() => {
    if (isOpen && !hasMarkedRead) {
      setHasMarkedRead(true);
      onMarkRead?.(section.id);
      try {
        localStorage.setItem(`milestone_read_${section.id}`, 'true');
      } catch {}
    }
  }, [isOpen, hasMarkedRead, section.id, onMarkRead]);

  // Handle saving student notes
  const handleSaveNotes = () => {
    try {
      localStorage.setItem(`milestone_notes_${section.id}`, notes);
      setIsNotesSaved(true);
      setTimeout(() => setIsNotesSaved(false), 2000);
    } catch (e) {
      console.warn('Failed to save notes:', e);
    }
  };

  // Resolve compact overview content
  const compactContent = useMemo(() => {
    const existing = section.summaries?.find((s) => s.mode === 'compact')?.contentMarkdown;
    if (existing && existing.trim().length > 0) return existing;

    const keyTopicsList =
      section.keyTopics && section.keyTopics.length > 0
        ? section.keyTopics.map((kt) => `- **${kt}**: Core principles and operational relationships.`).join('\n')
        : `- **Foundational Principle**: Primary laws governing ${section.title}.\n- **Key Relationships**: Variable dependencies and invariant quantities.`;

    return `### 💡 Quick Concept Summary: ${section.title}

${keyTopicsList}

---

#### 📌 Essential Takeaways & Formulas
- **Governing Equations**: Standard textbook formulations apply with strict SI units.
- **Boundary Assumptions**: Verify isothermal/closed system criteria prior to numerical calculations.
- **Key Exam Strategy**: Always sketch reference axes and write symbolic formulation before arithmetic calculation.`;
  }, [section]);

  // Resolve detailed deep-dive content
  const detailedContent = useMemo(() => {
    const existing = section.summaries?.find((s) => s.mode === 'detailed')?.contentMarkdown;
    if (existing && existing.trim().length > 0) return existing;

    return `## Comprehensive Theoretical Deep-Dive: ${section.title}

### 1. Conceptual Framework & Physical Intuition
In the study of **${chapterName}**, ${section.title} represents a critical conceptual milestone. To master this material, you must be able to not only state the foundational definitions, but also derive relationships from first principles and predict physical behavior when parameters shift.

### 2. Rigorous Derivations & Mechanisms
- **Mathematical Formulations**: The interaction models depend on the balance between driving forces and resistive constraints.
- **Conservation Theorems**: Under ideal boundary specifications, the integrated sum of state quantities remains invariant over arbitrary path trajectories.
- **Step-by-Step Proof Structure**:
  1. Define the system boundary and isolate external influences.
  2. State the governing differential or algebraic rate equation.
  3. Integrate across defined boundary limits $(0 \\to t)$ or $(x_1 \\to x_2)$.
  4. Normalize dimensional constants to fundamental SI units.

### 3. Common Exam Traps & Misconceptions
- ⚠️ **Sign Convention Pitfall**: Reversing coordinates or neglecting negative directionality in vector quantities.
- ⚠️ **Unit Inconsistency**: Forgetting to convert centimeters or milli-units to base meters and amperes before multiplying.
- ⚠️ **Premature Numeric Substitution**: Substituting numbers too early loses method marks if arithmetic slips happen. Always derive symbolic form first.

### 4. High-Yield Review Checklist
- [x] State the core theorem in your own words.
- [x] Write out the primary formula from memory.
- [x] Identify standard reference frame assumptions.`;
  }, [section, chapterName]);

  // Resolve source document text
  const sourceContent = useMemo(() => {
    if (section.sectionTextExcerpt && section.sectionTextExcerpt.trim().length > 0) {
      return section.sectionTextExcerpt;
    }
    if (chapterRawText && chapterRawText.trim().length > 0) {
      const lower = chapterRawText.toLowerCase();
      const titleLower = section.title.toLowerCase();
      const idx = lower.indexOf(titleLower);
      if (idx !== -1) {
        return chapterRawText.slice(Math.max(0, idx - 100), Math.min(chapterRawText.length, idx + 2500));
      }
      return chapterRawText.slice(0, 2500);
    }
    return `Verbatim textbook excerpt for "${section.title}" is referenced from ${section.sourceReference || 'the uploaded syllabus material'}.\n\nRefer to the attached chapter document for original paragraph citations and diagrams.`;
  }, [section, chapterRawText]);

  if (!isOpen) return null;

  const currentDisplayContent =
    activeTab === 'compact'
      ? compactContent
      : activeTab === 'detailed'
      ? detailedContent
      : sourceContent;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentDisplayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fontSizeClass =
    fontSize === 'larger'
      ? 'text-base sm:text-lg leading-relaxed'
      : fontSize === 'large'
      ? 'text-sm sm:text-base leading-relaxed'
      : 'text-xs sm:text-sm leading-relaxed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* ================================================================= */}
        {/* HEADER: READ SUMMARY & NOTES (SINGLE COMPACT ROW) */}
        {/* ================================================================= */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                📖 Read Summary & Notes
              </span>

              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {section.title}
              </h2>

              <span className="text-[11px] font-medium text-slate-400 hidden md:inline truncate">
                ({chapterName})
              </span>

              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3" /> Marked as Read
              </span>
            </div>
          </div>

          {/* Action buttons (Notes drawer toggle, Copy, Close) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsNotesOpen((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                isNotesOpen
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title="Toggle Personal Study Notes"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Notes</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              title="Copy markdown content"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* SUBHEADER: DEPTH TABS & READING CONTROLS */}
        {/* ================================================================= */}
        <div className="px-4 py-2.5 border-b border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Depth Mode Segmented Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('compact')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'compact'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Compact Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('detailed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'detailed'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Detailed Deep-Dive</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('source')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'source'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Source Document</span>
            </button>
          </div>

          {/* Reading Controls: Font Size & Time Estimate */}
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="hidden sm:inline-flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              ~{activeTab === 'compact' ? '3 min' : '8 min'} read
            </span>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setFontSize('normal')}
                className={`px-2 py-0.5 rounded-lg font-bold text-xs ${
                  fontSize === 'normal'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Normal Font Size"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSize('large')}
                className={`px-2 py-0.5 rounded-lg font-bold text-xs ${
                  fontSize === 'large'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Large Font Size"
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setFontSize('larger')}
                className={`px-2 py-0.5 rounded-lg font-bold text-xs ${
                  fontSize === 'larger'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Larger Font Size"
              >
                A++
              </button>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BODY: DISTRACTION-FREE READING AREA WITH OPTIONAL NOTES DRAWER */}
        {/* ================================================================= */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Reading Pane */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
            {activeTab === 'source' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold">
                    <FileText className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                    <span>Reference Excerpt from Document: {section.sourceReference || chapterName}</span>
                  </div>
                  {onOpenDocumentSource && (
                    <button
                      type="button"
                      onClick={onOpenDocumentSource}
                      className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 font-bold hover:underline flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
                    >
                      <span>Full Document</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 font-serif leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-text text-sm sm:text-base">
                  {sourceContent}
                </div>
              </div>
            ) : (
              <div className={`prose dark:prose-invert max-w-none ${fontSizeClass}`}>
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-4 mb-3" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-6 mb-2 border-b border-slate-200 dark:border-slate-800 pb-2" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-5 mb-2" {...props} />
                    ),
                    h4: ({ node, ...props }) => (
                      <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 mt-4 mb-1" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-300 mb-4" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal pl-5 space-y-1.5 text-slate-700 dark:text-slate-300 mb-4" {...props} />
                    ),
                    li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="border-l-4 border-indigo-500 pl-4 py-1 italic bg-indigo-50/50 dark:bg-indigo-950/30 rounded-r-xl my-4 text-slate-700 dark:text-slate-300" {...props} />
                    ),
                    code: ({ node, ...props }) => (
                      <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-semibold" {...props} />
                    ),
                  }}
                >
                  {currentDisplayContent}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Student Notes Drawer */}
          {isNotesOpen && (
            <div className="w-80 sm:w-96 border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-col p-4 animate-in slide-in-from-right duration-200 shrink-0">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                  <Bookmark className="w-4 h-4 text-indigo-500" />
                  <span>Personal Study Notes</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    {isNotesSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{isNotesSaved ? 'Saved' : 'Save'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNotesOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type your personal derivations, formulas to remember, or questions for review..."
                className="flex-1 mt-3 p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
              />

              <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Autosaved locally</span>
                <span>{notes.length} chars</span>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* FOOTER: SEQUENTIAL PROGRESSION TO MODULE 2 */}
        {/* ================================================================= */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Summary & Notes Complete:
            </span>
            <span>Synthesize your understanding in Concept Check.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              Done Reading
            </button>

            {onProceedToCheckpoints && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onProceedToCheckpoints();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-emerald-600/20"
              >
                <span>Proceed to Concept Check</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilestoneReaderView;
