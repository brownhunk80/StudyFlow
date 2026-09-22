import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  Layers,
  CheckCircle2,
  Calendar,
  Mic,
  Camera,
  ArrowRight,
  Brain,
  HelpCircle,
  GraduationCap,
  FileText,
  Clock,
  Target,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StudentMasteryGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSampleAndOpenHub?: () => void;
  onNavigateToTab?: (tab: 'home' | 'focus' | 'recall' | 'plan' | 'progress' | 'profile') => void;
}

export const StudentMasteryGuideModal: React.FC<StudentMasteryGuideModalProps> = ({
  isOpen,
  onClose,
  onLoadSampleAndOpenHub,
  onNavigateToTab,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeTab, setActiveTab] = useState<'walkthrough' | 'tips' | 'faq'>('walkthrough');

  // 4 Core Simplified Steps for 8th to 12th graders (Learn -> Recall -> Notes/Gaps -> Recall Deck)
  const steps = [
    {
      id: 'step-1',
      stepNumber: 1,
      tag: 'STEP 1: SIMPLE LEARN',
      title: 'Pomodoro Focus, Provided Notes & Topic Videos',
      summary:
        'Start with zero stress. Use the built-in Pomodoro timer, read bite-sized curated notes, and watch 8-10 min video lessons for each chapter topic.',
      icon: BookOpen,
      color: 'from-blue-600 to-indigo-600',
      badgeBg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
      description:
        'No blank page anxiety! Every chapter comes pre-loaded with topic summaries, key formulas, common exam traps, and curated YouTube video lessons (Khan Academy, CrashCourse, Organic Chemistry Tutor). Study with the 25-minute Pomodoro timer right inside the view.',
      studentTip:
        '💡 8th-12th Grade Tip: Watch the short 8-min video before reading the formulas to build an intuitive mental model.',
      visualPreview: {
        headline: 'Simple Learn + Pomodoro',
        sub: 'Light - Reflection & Refraction',
        snippet:
          '• Pomodoro: 25:00 Focus Active\n• Topic: Laws of Reflection & Spherical Mirrors\n• Formula: f = R / 2 | Mirror formula: 1/f = 1/v + 1/u\n• Video: CrashCourse Physics (10 min) • Khan Academy (8 min)',
        typeBadge: 'Notes + Videos + Pomodoro',
      },
    },
    {
      id: 'step-2',
      stepNumber: 2,
      tag: 'STEP 2: ACTIVE RECALL',
      title: 'Blurting: Voice Notes, Upload Notes or Quick Type',
      summary:
        'Close your notes! Tell or show what you remember using voice notes, paper photo, or a brain dump.',
      icon: Mic,
      color: 'from-indigo-600 to-purple-600',
      badgeBg: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300',
      description:
        'Put your notes away and test your recall! Choose Voice Note to speak aloud in your own words (Feynman Technique), upload a snap of your handwritten notebook diagram, or type bullet points. Active recall creates 3x stronger memory pathways than passive reading.',
      studentTip:
        '💡 Feynman Rule: If you can explain it in your own words without looking, you truly understand it.',
      visualPreview: {
        headline: 'Active Recall in Action',
        sub: 'Speech-to-Text & Photo Blurting',
        snippet:
          'Spoken Recall: "In concave mirrors, light converges at focus. The mirror formula is 1/f = 1/v + 1/u, and magnification is minus v over u..."\nStatus: Ready for AI Gap Analysis',
        typeBadge: 'Voice / Photo / Quick Dump',
      },
    },
    {
      id: 'step-3',
      stepNumber: 3,
      tag: 'STEP 3: CHECK GAPS & UPDATE NOTES',
      title: "Spot What's Missing & 1-Click Update Notes",
      summary:
        'See what you mastered vs what you missed. 1-click automatically enriches your chapter notes with the missing info.',
      icon: Sparkles,
      color: 'from-purple-600 to-rose-600',
      badgeBg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300',
      description:
        'The system compares your recall against the curriculum: green shows what you mastered, and amber tags what was missing or misunderstood. Click "1-Click Update Notes" to instantly inject the missing concepts into your chapter notes so your notes are 100% complete.',
      studentTip:
        '💡 Gap-Filling Hack: Focus 80% of your energy on the amber gap cards—that is where your exam score increases.',
      visualPreview: {
        headline: 'Recall Gap Diagnosis',
        sub: 'Mastered vs Missing Comparison',
        snippet:
          '✓ Mastered: Mirror formula, Snell law, Cartesian signs\n⚠️ Missing: Forgot lens power unit (Diopters = 1/f in meters)\nAction: 1-Click Update Notes executed successfully!',
        typeBadge: 'Gap Check & Note Update',
      },
    },
    {
      id: 'step-4',
      stepNumber: 4,
      tag: 'STEP 4: RECALL DECK',
      title: 'Automated Flashcards & Exam Date Pacing',
      summary:
        'StudyFlow flashcards generated from your gaps, with spaced repetition calibrated to your exam countdown.',
      icon: Brain,
      color: 'from-emerald-600 to-teal-600',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
      description:
        'Automated concept cards and Cloze deletions (e.g. "Lens power unit is {{Diopters}}"). Features dual-mode spaced repetition: Regular Spaced Review (1d, 3d, 7d, 14d) or Exam Countdown Mode (cards repeat 2-3x before your exam date so nothing slips through).',
      studentTip:
        '💡 Spaced Repetition: Rate cards Again, Hard, Good, or Easy. The algorithm schedules the next review automatically.',
      visualPreview: {
        headline: 'StudyFlow Spaced Repetition',
        sub: 'Exam in 14 Days • Calibrated Pacing',
        snippet:
          'Card: "What is the formula for Lens Power? [P = 1/f in meters]"\nRatings: Again (1d) | Hard (3d) | Good (7d) | Easy (13d [Before Exam])\nSync: Added to Daily Recall Tab',
        typeBadge: 'Recall Cards & Exam Mode',
      },
    },
  ];

  // Auto-play walkthrough presentation
  useEffect(() => {
    if (!isPlaying || !isOpen || activeTab !== 'walkthrough') return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [isPlaying, isOpen, activeTab, steps.length]);

  if (!isOpen) return null;

  const activeStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Grades 9–12 Guide
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  The Complete 4-Step Flow
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                How StudyFlow Works: From Textbook to Daily Plan
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-6 py-2 border-b border-slate-200 dark:border-slate-700/60 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('walkthrough')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'walkthrough'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Interactive 4-Step Video Walkthrough</span>
          </button>
          <button
            onClick={() => setActiveTab('tips')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tips'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>High School Study Hacks</span>
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'faq'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3 h-3" />
            <span>Common Questions</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {activeTab === 'walkthrough' && (
            <div className="space-y-6">
              {/* Animated Walkthrough Stage */}
              <div className="bg-slate-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden border border-slate-800">
                {/* Visual Background Glow */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Scrubber & Step Indicators */}
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <div className="flex items-center gap-1.5">
                    {steps.map((s, idx) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setCurrentStep(idx);
                          setIsPlaying(false);
                        }}
                        className={`h-2 rounded-full transition-all cursor-pointer ${
                          idx === currentStep
                            ? 'w-10 bg-indigo-400'
                            : 'w-3 bg-slate-700 hover:bg-slate-600'
                        }`}
                        title={`Go to Step ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3 h-3 fill-current" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          <span>Auto Play</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Active Step Content */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center relative z-10">
                  {/* Left Column: Explanation */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-900/80 text-indigo-300 border border-indigo-700/50">
                        {activeStepData.tag}
                      </span>
                      <span className="text-xs text-slate-400">
                        Step {activeStepData.stepNumber} of 4
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                      <span>{activeStepData.title}</span>
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {activeStepData.description}
                    </p>

                    {/* Tip pill */}
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-indigo-900/40 text-xs text-indigo-200 font-medium">
                      {activeStepData.studentTip}
                    </div>
                  </div>

                  {/* Right Column: Simulated Visual Interface */}
                  <div className="md:col-span-5">
                    <div className="bg-slate-900 rounded-2xl p-4 border border-slate-700 shadow-inner space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {activeStepData.visualPreview.typeBadge}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-indigo-300">
                          {activeStepData.visualPreview.headline}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {activeStepData.visualPreview.sub}
                        </div>
                      </div>

                      <pre className="text-[11px] font-mono bg-slate-950 p-2.5 rounded-xl text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-800/80">
                        {activeStepData.visualPreview.snippet}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Step Navigation Controls */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800 text-xs font-bold relative z-10">
                  <button
                    onClick={() => {
                      setCurrentStep((prev) => (prev > 0 ? prev - 1 : steps.length - 1));
                      setIsPlaying(false);
                    }}
                    className="flex items-center gap-1 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous Step</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentStep((prev) => (prev + 1) % steps.length);
                      setIsPlaying(false);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition cursor-pointer shadow-md"
                  >
                    <span>{currentStep === steps.length - 1 ? 'Start Over' : 'Next Step'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* The 4-Step Diagram / Flowchart */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    THE COMPLETE FLOW AT A GLANCE
                  </h4>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                    100% Connected Architecture
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {steps.map((s, idx) => {
                    const IconComp = s.icon;
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setCurrentStep(idx);
                          setIsPlaying(false);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                          idx === currentStep
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500/80 shadow-md ring-2 ring-indigo-500/20'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">
                            0{idx + 1}
                          </span>
                          <IconComp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </div>
                        <h5 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                          {s.title}
                        </h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {s.summary}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Action Simulator / Launchers */}
              <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 dark:from-slate-800/80 dark:via-indigo-950/30 dark:to-slate-800/80 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ready to see it in action?</span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    Try the 1-Click Interactive Demo
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md">
                    We will load a sample high-school biology chapter (*Photosynthesis & Light Reactions*) with pre-loaded textbook materials, Cornell notes, and flashcards so you can test the entire flow right away!
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onLoadSampleAndOpenHub && (
                    <button
                      onClick={() => {
                        onLoadSampleAndOpenHub();
                        onClose();
                        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
                      }}
                      className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-lg shadow-indigo-300 dark:shadow-none transition flex items-center gap-2 active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Load Sample & Open Hub</span>
                    </button>
                  )}
                  {onNavigateToTab && (
                    <button
                      onClick={() => {
                        onNavigateToTab('plan');
                        onClose();
                      }}
                      className="px-3.5 py-3 rounded-2xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-600 transition cursor-pointer"
                    >
                      <span>View Daily Plan</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tips' && (
            <div className="space-y-4">
              <div className="bg-indigo-600 text-white rounded-3xl p-5 shadow-lg space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200">
                  EVIDENCE-BASED COGNITIVE SCIENCE
                </span>
                <h3 className="text-xl font-black">
                  The 3 Golden Rules for 9th to 12th Grade Students
                </h3>
                <p className="text-xs text-indigo-100 leading-relaxed">
                  Most high schoolers waste 80% of their study time re-reading textbooks or copying pretty notes in colored pens. Cognitive neuroscience shows that passive review creates the "Illusion of Competence." Here is what actually works:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black text-xs">
                    #1
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Ditch Passive Highlighting
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Highlighting gives your brain a false dopamine hit without creating retention. Use StudyFlow's **Cornell Notes Generator** to extract only high-yield definitions and exam pitfalls.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs">
                    #2
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Practice Active Retrieval Daily
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Always test before you feel ready. Use the **Check & Verify Gaps** tab—speak your explanation into the mic or write formulas on paper. The mental effort of retrieving strengthens memories.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs">
                    #3
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Trust the Spaced Plan
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Reviewing for 20 minutes across 4 spaced intervals (Day 1, 3, 7, 14) beats a 6-hour all-nighter before finals every single time. Let the **Plan** screen tell you what is due today.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="space-y-3">
              {[
                {
                  q: 'How does uploading textbook material turn into my daily plan?',
                  a: 'When you upload your textbook/notes in the Chapter Study Hub (Tab 1), the AI extracts concepts (Tab 2) and builds flashcards & quizzes (Tabs 3 & 4). Once you test your recall, the AI identifies what concepts need work and automatically schedules revision tasks onto your Plan screen using the scientific forgetting curve intervals.',
                },
                {
                  q: 'What if I have handwritten math or science notes?',
                  a: 'In the "Check & Verify Gaps" tab, you can take a photo of your handwritten paper scratchpad or diagram. StudyFlow’s multimodal AI reads your handwritten equations and checks if you solved the problem correctly or missed crucial intermediate steps.',
                },
                {
                  q: 'Can I use this for non-STEM subjects like History, English, or Economics?',
                  a: 'Yes! The Feynman voice assistant and active recall verification excel with essay topics, historical timelines, cause-and-effect questions, and literary themes.',
                },
                {
                  q: 'Where do my flashcards go?',
                  a: 'When you click "Add Selected Flashcards", they are placed into your Decks on the Active Recall screen (accessible via the top navigation or bottom tab). Each card moves across Leitner Boxes 1 to 5 as you master it.',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-1.5"
                >
                  <h5 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] flex items-center justify-center font-bold">
                      Q
                    </span>
                    <span>{item.q}</span>
                  </h5>
                  <p className="text-xs text-slate-600 dark:text-slate-400 pl-6 leading-relaxed">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              StudyFlow • Designed for 9th–12th Grade Exam Success
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold transition cursor-pointer"
          >
            Got it, Let's Study!
          </button>
        </div>
      </div>
    </div>
  );
};
