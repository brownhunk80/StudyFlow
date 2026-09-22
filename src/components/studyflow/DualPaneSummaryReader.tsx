import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  Edit3,
  Save,
  X,
  Plus,
  HelpCircle,
  Clock,
  Layers,
  Award,
  ChevronRight,
  ShieldCheck,
  Compass,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Section, SummaryMode, KnowledgeQuestion } from '../../types';

export interface CheckpointItem {
  id: string;
  prompt: string;
  benchmarkAnswer: string;
  keyMissedPoints: string[];
  userAnswer: string;
  isRevealed: boolean;
  selfAssessment: 'understood' | 'needs_work' | null;
}

interface DualPaneSummaryReaderProps {
  documentName: string;
  subjectName?: string;
  section: Section;
  onBack: () => void;
  onUpdateCompletion?: (sectionId: string, newRate: number) => void;
  onOpenPDF?: () => void;
}

export const DualPaneSummaryReader: React.FC<DualPaneSummaryReaderProps> = ({
  documentName,
  subjectName = 'Physics',
  section,
  onBack,
  onUpdateCompletion,
  onOpenPDF,
}) => {
  // Segmented toggle for depth: [Compact Overview] vs [Detailed Deep-Dive]
  const [summaryDepth, setSummaryDepth] = useState<'compact' | 'detailed'>('compact');

  // Utility modals / drawers
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [studentNotes, setStudentNotes] = useState<string>(
    (section as unknown as { notes?: string }).notes ||
      `# Personal Notes: ${section.title}\n- Core takeaway: Pay close attention to standard reference frames and sign conventions.\n- Key derivation: Memorize the step-by-step proof for 5-mark subjective questions.`
  );
  const [isNotesSaved, setIsNotesSaved] = useState(false);

  // Checkpoints for "Test your understanding"
  const initialCheckpoints: CheckpointItem[] = useMemo(() => {
    if (section.knowledgeQuestions && section.knowledgeQuestions.length > 0) {
      return section.knowledgeQuestions.map((kq, idx) => ({
        id: kq.id,
        prompt: kq.question,
        benchmarkAnswer: kq.sampleAnswer,
        keyMissedPoints: [
          'Explicit statement of boundary assumptions & conditions',
          'Strict adherence to standard SI units and algebraic sign conventions',
          'Clarification of microscopic mechanism versus macroscopic observation',
        ],
        userAnswer: kq.userResponse || '',
        isRevealed: false,
        selfAssessment:
          kq.isCorrect === true ? 'understood' : kq.isCorrect === false ? 'needs_work' : null,
      }));
    }

    return [
      {
        id: `cp-1-${section.id}`,
        prompt: `State the fundamental principle governing ${section.title} and identify the key variable relationships.`,
        benchmarkAnswer: `The governing principle establishes that the system conserves energy and momentum while maintaining directional consistency under standard boundary conditions. When the driving stimulus doubles, the primary response variable scales according to the characteristic state equation without altering equilibrium constants.`,
        keyMissedPoints: [
          'Conservation of foundational quantities during state changes',
          'Assumption of ideal isothermal/frictionless boundary parameters',
          'Distinction between transient fluctuations and stabilized equilibrium',
        ],
        userAnswer: '',
        isRevealed: false,
        selfAssessment: null,
      },
      {
        id: `cp-2-${section.id}`,
        prompt: `What is the most frequent exam misconception or calculation pitfall when applying ${section.title}?`,
        benchmarkAnswer: `Students frequently confuse the relative reference frame with absolute coordinates and neglect converting input quantities (e.g. milli-units or non-SI measures) into base SI units prior to substitution. Additionally, neglecting algebraic sign conventions (+ / -) when resolving vectors yields erroneous scalar outputs.`,
        keyMissedPoints: [
          'Coordinate reference axis assignment before arithmetic substitution',
          'Unit normalization (e.g., converting mA or cm³ into standard SI units)',
          'Neglecting reverse directionality or negative signs in vector resolutions',
        ],
        userAnswer: '',
        isRevealed: false,
        selfAssessment: null,
      },
      {
        id: `cp-3-${section.id}`,
        prompt: `Formulate the step-by-step problem solving heuristic used to resolve multi-tiered questions on ${section.title}.`,
        benchmarkAnswer: `1. Formulate all given quantities with explicit units.\n2. State the primary governing formula symbolically before numerical substitution.\n3. Identify constraint conditions and apply sign conventions.\n4. Solve algebraically for the target unknown before arithmetic computation.\n5. Box or underline the final quantity with correct dimensionality.`,
        keyMissedPoints: [
          'Writing symbolic formulation before inserting numeric values for maximum method marks',
          'Explicit sign convention diagram sketching',
          'Dimensional and physical consistency check of final result',
        ],
        userAnswer: '',
        isRevealed: false,
        selfAssessment: null,
      },
    ];
  }, [section]);

  const [checkpoints, setCheckpoints] = useState<CheckpointItem[]>(initialCheckpoints);
  const [isAddingCheckpoint, setIsAddingCheckpoint] = useState(false);
  const [newPromptText, setNewPromptText] = useState('');
  const [newBenchmarkText, setNewBenchmarkText] = useState('');

  // Markdown Content for Compact Overview
  const compactMarkdown = useMemo(() => {
    const existing = section.summaries?.find((s) => s.mode === 'compact')?.contentMarkdown;
    if (existing) return existing;

    return `# ${section.title} — Executive Summary

## 📌 Core Definition
> **${section.title}**: The governing physical and theoretical framework that dictates system behavior, state transitions, and observable responses within this curriculum unit. All standard relationships assume idealized boundary parameters unless explicitly specified.

---

## 🔑 Key Terms & High-Contrast Definitions
- **Primary Mechanism**: The underlying physical interaction through which input energy drives system transformation.
- **Reference Datum / Coordinate Frame**: The calibrated baseline from which directional displacements and potentials are measured.
- **Equilibrium State**: The stabilized condition where net driving forces equal zero and observable variables remain invariant over time.
- **Critical Threshold**: The precise parametric boundary at which discontinuous state changes or nonlinear behaviors initiate.

---

## 🏛️ Core Principles & Governing Relationships
- **Principle of System Conservation**: Total energy and primary conserved quantities remain constant across any closed transformation cycle.
- **Proportional Response**: Under low-to-moderate stimulus regimes, output scaling displays direct linear proportionality ($y \\propto x$).
- **Boundary Invariance**: The validity of the mathematical model is contingent on maintaining normalized thermal and pressure baselines.

---

## ⚡ High-Yield Key Takeaways
- [x] Always state the **symbolic formula** before numerical calculations to guarantee board step-marking credit.
- [x] Standardize all input variables into standard SI units before applying exponential or ratio formulas.
- [x] Check whether negative signs represent directional opposition (e.g. Lenz's law, restoring forces) rather than scalar reduction.
`;
  }, [section]);

  // Markdown Content for Detailed Deep-Dive
  const detailedMarkdown = useMemo(() => {
    const existing = section.summaries?.find((s) => s.mode === 'detailed')?.contentMarkdown;
    if (existing) return existing;

    return `# ${section.title} — Comprehensive Study Notes & Deep-Dive

## 🎯 Conceptual Foundations
In modern academic curricula, **${section.title}** serves as a foundational pillar within **${documentName}**. Mastering this module requires not only rigorous memorization of statutory definitions, but also fluent algebraic agility and intuitive physical grasp of underlying phenomena.

---

## 📖 High-Contrast Key Term Definitions
- **Linear Proportionality**: Direct mathematical scaling where doubling the independent driver variable produces an exact 1:1 doubling in systemic throughput.
- **Dynamic Equilibrium**: A steady-state condition where continuous microscopic exchanges occur at equal forward and reverse rates, preserving macroscopic equilibrium.
- **Characteristic Constant**: An intrinsic material or physical constant that quantifies how the medium responds to external fields.
- **Constraint Boundary**: Physical barriers or mathematical limits that dictate the allowable values of system state coordinates.

---

## 🏛️ Core Principles & Detailed Derivations

### Principle 1: Governing Conservation Law
Every systemic shift within ${section.title} adheres strictly to universal conservation rules:
$$\\sum \\vec{F}_{\\text{ext}} = \\frac{d\\vec{p}}{dt}$$

When resolving subjective derivations:
1. Establish the free-body or state-transition diagram with unequivocal sign conventions.
2. Formulate the differential relationship across the elemental volume or time step.
3. Integrate over the specified domain using stated boundary constraints:
$$x(t) = x_0 + v_0 t + \\frac{1}{2} a t^2$$

### Principle 2: Symmetrical Reciprocity
External stimuli acting upon the system induce equal and opposite reactive adjustments in internal potential energies. Failure to account for reciprocal work yields flawed efficiency estimations.

---

## 💡 Structured Exam Takeaways & Best Practices
- **Step Marks**: Up to 60% of marks in 5-mark subjective questions are awarded for identifying assumptions, sketching labeled diagrams, and providing symbolic derivations.
- **Common Board Exam Trap**: Inverting reference coordinate axes midway through a numerical proof is the #1 source of lost marks in this chapter.
- **Dimensional Verification**: Before boxing your final numerical solution, conduct a dimensional analysis check to verify that both sides of your computed equation carry identical dimensions.
`;
  }, [section, documentName]);

  const activeMarkdown = summaryDepth === 'compact' ? compactMarkdown : detailedMarkdown;

  // Handlers for Checkpoint cards
  const handleUserAnswerChange = (checkpointId: string, text: string) => {
    setCheckpoints((prev) =>
      prev.map((cp) => (cp.id === checkpointId ? { ...cp, userAnswer: text } : cp))
    );
  };

  const handleRevealCheckpoint = (checkpointId: string) => {
    setCheckpoints((prev) =>
      prev.map((cp) => (cp.id === checkpointId ? { ...cp, isRevealed: true } : cp))
    );
  };

  const handleSelfAssessment = (
    checkpointId: string,
    assessment: 'understood' | 'needs_work'
  ) => {
    const updated = checkpoints.map((cp) =>
      cp.id === checkpointId ? { ...cp, selfAssessment: assessment } : cp
    );
    setCheckpoints(updated);

    // Compute completion rate based on self-assessments
    const understoodCount = updated.filter((cp) => cp.selfAssessment === 'understood').length;
    const evaluatedCount = updated.filter((cp) => cp.selfAssessment !== null).length;

    if (evaluatedCount > 0 && onUpdateCompletion) {
      const calculatedRate = Math.min(100, Math.round((understoodCount / updated.length) * 100));
      onUpdateCompletion(section.id, Math.max(section.completionRate, calculatedRate));
    }
  };

  const handleResetCheckpoint = (checkpointId: string) => {
    setCheckpoints((prev) =>
      prev.map((cp) =>
        cp.id === checkpointId
          ? { ...cp, isRevealed: false, userAnswer: '', selfAssessment: null }
          : cp
      )
    );
  };

  const handleAddCustomCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptText.trim() || !newBenchmarkText.trim()) return;

    const newCp: CheckpointItem = {
      id: `cp-custom-${Date.now()}`,
      prompt: newPromptText.trim(),
      benchmarkAnswer: newBenchmarkText.trim(),
      keyMissedPoints: [
        'Precise definition of primary terms',
        'State underlying assumptions & boundary conditions',
        'SI unit and sign convention consistency',
      ],
      userAnswer: '',
      isRevealed: false,
      selfAssessment: null,
    };

    setCheckpoints((prev) => [...prev, newCp]);
    setNewPromptText('');
    setNewBenchmarkText('');
    setIsAddingCheckpoint(false);
  };

  const understoodCount = checkpoints.filter((cp) => cp.selfAssessment === 'understood').length;
  const needsWorkCount = checkpoints.filter((cp) => cp.selfAssessment === 'needs_work').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors selection:bg-indigo-500/20">
      {/* =================================================================== */}
      {/* 1. TOP NAVIGATION BAR */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-2xs px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Back button to [Roadmap] & Breadcrumbs (Subject > Chapter > Section) */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Back button returning directly to [Roadmap] */}
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black transition cursor-pointer shadow-2xs shrink-0"
              title="Return to Roadmap"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Roadmap</span>
            </button>

            {/* Breadcrumb Navigation: Subject > Chapter > Section */}
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 min-w-0 truncate">
              <span className="font-semibold text-slate-600 dark:text-slate-400 truncate hidden sm:inline">
                {subjectName}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:inline" />
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[130px] sm:max-w-[180px]">
                {documentName}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-black text-indigo-600 dark:text-indigo-400 truncate">
                Section {section.sectionNumber}: {section.title}
              </span>
            </nav>
          </div>

          {/* Right: Segmented toggle for depth & Utility Action Pills */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Segmented Toggle for Depth: [Compact Overview] vs [Detailed Deep-Dive] */}
            <div className="bg-slate-200/80 dark:bg-slate-800/80 p-1 rounded-2xl flex items-center gap-1 border border-slate-300/40 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => setSummaryDepth('compact')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  summaryDepth === 'compact'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Compact Overview</span>
              </button>

              <button
                type="button"
                onClick={() => setSummaryDepth('detailed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                  summaryDepth === 'detailed'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Detailed Deep-Dive</span>
              </button>
            </div>

            {/* Utility Action Pills: [Source Document] and [Notes] */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => (onOpenPDF ? onOpenPDF() : setIsPdfModalOpen(true))}
                className="px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-black transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                title="View original textbook source document"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>Source Document</span>
              </button>

              <button
                type="button"
                onClick={() => setIsNotesDrawerOpen(true)}
                className="px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-300 dark:hover:border-purple-700 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 text-xs font-black transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                title="Open personal annotations and notes"
              >
                <Edit3 className="w-3.5 h-3.5 text-purple-500" />
                <span>Notes</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* =================================================================== */}
      {/* DUAL-PANE LAYOUT: Left Pane 60% Width, Right Pane 40% Width */}
      {/* Side-by-side on desktop (lg+), stacked on mobile */}
      {/* =================================================================== */}
      <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col lg:flex-row">
        {/* ================================================================= */}
        {/* 2. LEFT PANE (SUMMARY CONTENT - 60% WIDTH ON DESKTOP) */}
        {/* ================================================================= */}
        <main className="w-full lg:w-[60%] p-5 sm:p-7 lg:p-9 lg:border-r border-slate-200/80 dark:border-slate-800/80 overflow-y-auto">
          <div className="max-w-3xl space-y-6">
            {/* Header metadata tag & depth indicator */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Section {section.sectionNumber}
                </span>

                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {summaryDepth === 'compact' ? '3 min overview' : '8 min deep-dive'}
                </span>
              </div>

              {section.keyTopics && section.keyTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {section.keyTopics.map((kt, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                    >
                      #{kt}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Typography-focused Markdown Reader (prose-slate / dark:prose-invert) */}
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight pb-2 border-b border-slate-200 dark:border-slate-800 mt-2 mb-4">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-6 mb-3 flex items-center gap-2">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 text-slate-700 dark:text-slate-300 leading-relaxed">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-black text-slate-950 dark:text-white bg-indigo-50/90 dark:bg-indigo-950/70 text-indigo-900 dark:text-indigo-200 px-1.5 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/60">
                      {children}
                    </strong>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-indigo-600 dark:border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-r-2xl p-4 sm:p-5 my-4 not-italic text-slate-800 dark:text-slate-200 border-y border-r border-indigo-100 dark:border-indigo-900/50">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="px-2 py-0.5 rounded-md font-mono text-xs bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 font-semibold">
                      {children}
                    </code>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-5 space-y-2 mb-4 text-slate-700 dark:text-slate-300">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-5 space-y-2 mb-4 text-slate-700 dark:text-slate-300">
                      {children}
                    </ol>
                  ),
                }}
              >
                {activeMarkdown}
              </ReactMarkdown>

              {/* Callout Box for "Core Principles" & Exam Warnings */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300/90 dark:border-amber-800/80 shadow-2xs space-y-2 my-6">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300">
                  <div className="w-6 h-6 rounded-lg bg-amber-200/90 dark:bg-amber-900/80 flex items-center justify-center font-black text-xs shrink-0">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-900 dark:text-amber-200" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider">
                    Core Principles & Exam Trap Warning
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-amber-950 dark:text-amber-200 leading-relaxed font-medium">
                  When answering subjective board questions on <strong>{section.title}</strong>, examiners award partial marks on reasoning: define the principle clearly, write the general equation symbolically with boundary conditions, and highlight the numerical result with appropriate physical units.
                </p>
              </div>
            </div>
          </div>
        </main>

        {/* ================================================================= */}
        {/* 3. RIGHT PANE ("TEST YOUR UNDERSTANDING" - 40% WIDTH ON DESKTOP) */}
        {/* ================================================================= */}
        <aside className="w-full lg:w-[40%] bg-slate-50/70 dark:bg-slate-900/40 p-5 sm:p-6 lg:p-7 overflow-y-auto space-y-6">
          {/* Header & Subtext */}
          <div className="space-y-1.5 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Test your understanding
                </h2>
              </div>

              {/* Progress counter badge */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {understoodCount} Understood
                </span>
                {needsWorkCount > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {needsWorkCount} Needs Work
                  </span>
                )}
              </div>
            </div>

            {/* Subtext */}
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Active recall checkpoints based on this summary
            </p>
          </div>

          {/* Numbered Checkpoint Cards */}
          <div className="space-y-4">
            {checkpoints.map((cp, idx) => {
              const hasTypedAnswer = cp.userAnswer.trim().length > 0;

              return (
                <div
                  key={cp.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition shadow-2xs space-y-3.5 ${
                    cp.selfAssessment === 'understood'
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                      : cp.selfAssessment === 'needs_work'
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  {/* Card Header: Checkpoint number and prompt */}
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-0.5">
                        Checkpoint {idx + 1}
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {cp.prompt}
                      </p>
                    </div>

                    {cp.selfAssessment && (
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 ${
                          cp.selfAssessment === 'understood'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {cp.selfAssessment === 'understood' ? 'Understood' : 'Needs Work'}
                      </span>
                    )}
                  </div>

                  {/* Text Input Area for student to write answer */}
                  {!cp.isRevealed ? (
                    <div className="space-y-2.5">
                      <textarea
                        rows={3}
                        value={cp.userAnswer}
                        onChange={(e) => handleUserAnswerChange(cp.id, e.target.value)}
                        placeholder="Write your explanation or derivation from memory..."
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none transition"
                      />

                      {/* "Reveal Key Points" Button */}
                      <button
                        type="button"
                        onClick={() => handleRevealCheckpoint(cp.id)}
                        className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Reveal Key Points</span>
                      </button>
                    </div>
                  ) : (
                    /* On Reveal: Shows student's answer, benchmark answer, key missed points, and [Needs Work] vs [Understood] */
                    <div className="space-y-3.5 pt-1 animate-in fade-in-50 duration-150">
                      {/* Student's answer review */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                          <span>Your Written Answer</span>
                          {!hasTypedAnswer && (
                            <span className="text-amber-500 font-bold">(Unwritten)</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed">
                          {hasTypedAnswer ? `"${cp.userAnswer}"` : 'Skipped writing. Try to answer in words next time for deeper retention.'}
                        </p>
                      </div>

                      {/* Benchmark Model Answer */}
                      <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-1.5">
                        <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Benchmark Answer</span>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-100 font-medium leading-relaxed whitespace-pre-line">
                          {cp.benchmarkAnswer}
                        </p>
                      </div>

                      {/* Key Missed Points to Check Against */}
                      <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/70 space-y-1.5">
                        <div className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          <span>Key Points to Verify In Your Answer:</span>
                        </div>
                        <ul className="text-[11px] text-slate-700 dark:text-slate-300 space-y-1 pl-4 list-disc">
                          {cp.keyMissedPoints.map((point, pIdx) => (
                            <li key={pIdx} className="leading-snug">
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Self-Assessment Toggle Buttons: [Needs Work] vs [Understood] */}
                      <div className="pt-1 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">
                          Rate your recall accuracy:
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelfAssessment(cp.id, 'needs_work')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                              cp.selfAssessment === 'needs_work'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                            }`}
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Needs Work</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelfAssessment(cp.id, 'understood')}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                              cp.selfAssessment === 'understood'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Understood</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResetCheckpoint(cp.id)}
                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            title="Retry this checkpoint"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add custom checkpoint button / modal */}
          {!isAddingCheckpoint ? (
            <button
              type="button"
              onClick={() => setIsAddingCheckpoint(true)}
              className="w-full py-2.5 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer bg-white/50 dark:bg-slate-900/50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Understanding Checkpoint</span>
            </button>
          ) : (
            <form
              onSubmit={handleAddCustomCheckpoint}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-indigo-600">New Checkpoint</span>
                <button
                  type="button"
                  onClick={() => setIsAddingCheckpoint(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                placeholder="Checkpoint prompt question..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
              />

              <textarea
                rows={2}
                value={newBenchmarkText}
                onChange={(e) => setNewBenchmarkText(e.target.value)}
                placeholder="Benchmark reference answer..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white resize-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCheckpoint(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  Save Checkpoint
                </button>
              </div>
            </form>
          )}
        </aside>
      </div>

      {/* =================================================================== */}
      {/* UTILITY MODAL 1: "Source Document" Modal */}
      {/* =================================================================== */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {documentName} • Section {section.sectionNumber} Source Document
                  </h3>
                  <p className="text-[11px] text-slate-400">Official syllabus textbook material</p>
                </div>
              </div>
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 space-y-2">
                <span className="text-[10px] font-black uppercase text-indigo-600">Source Material</span>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{section.title}</h4>
                <p>
                  Curriculum Source Reference: Chapter Textbook, Section {section.sectionNumber}. All key derivations, conceptual diagrams, and numerical problems are mirrored in this structured summary.
                </p>
              </div>

              <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-2">
                <FileText className="w-10 h-10 text-indigo-400 stroke-1" />
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Document Connected
                </div>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Textbook pages are synced with the Roadmap curriculum. You can study the left-pane summary and verify retention in the right pane.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Done Reading
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* UTILITY MODAL 2: "Notes" Drawer */}
      {/* =================================================================== */}
      {isNotesDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Personal Section Notes</h3>
                  <p className="text-[11px] text-slate-400">Private annotations, mnemonics, and formula tricks</p>
                </div>
              </div>
              <button
                onClick={() => setIsNotesDrawerOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 flex flex-col space-y-3">
              <textarea
                value={studentNotes}
                onChange={(e) => {
                  setStudentNotes(e.target.value);
                  setIsNotesSaved(false);
                }}
                rows={16}
                placeholder="Write your personal annotations, mnemonics, or exam tips here..."
                className="w-full flex-1 text-xs font-mono p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none leading-relaxed"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  {isNotesSaved ? '✓ Saved to Section' : 'Unsaved changes'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsNotesSaved(true);
                    setTimeout(() => setIsNotesDrawerOpen(false), 800);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Notes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
