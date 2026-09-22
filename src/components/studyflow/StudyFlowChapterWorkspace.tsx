import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Trash2,
  TrendingUp,
  Compass,
} from 'lucide-react';
import { Chapter, ChapterTopicItem, Exam, Subject, Section, DocumentFlashcard, ChapterStatus } from '../../types';
import { migrateChapterToLearnDocument } from '../../utils/learnDocumentMigration';
import { RoadmapMilestoneCard } from './RoadmapMilestoneCard';
import { SummaryReaderModal } from './SummaryReaderModal';
import { CheckLearningDrillModal } from './CheckLearningDrillModal';
import { FlashcardsPracticeModal } from './FlashcardsPracticeModal';
import { FullScreenFlashcardStudy } from './FullScreenFlashcardStudy';
import { DocumentReaderModal } from './DocumentReaderModal';
import { DualPaneSummaryReader } from './DualPaneSummaryReader';

interface StudyFlowChapterWorkspaceProps {
  chapter: Chapter;
  subject?: Subject | null;
  exam?: Exam | null;
  onBack: () => void;
  onUpdateChapterStatus?: (chapterId: string, status: ChapterStatus, score?: number, examId?: string) => void;
  onUpdateChapterTopics?: (chapterId: string, topics: ChapterTopicItem[], examId?: string) => void;
  onDeleteChapter?: (chapterId: string, chapterName: string, examId?: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const StudyFlowChapterWorkspace: React.FC<StudyFlowChapterWorkspaceProps> = ({
  chapter,
  subject,
  exam,
  onBack,
  onUpdateChapterStatus,
  onUpdateChapterTopics,
  onDeleteChapter,
  onNavigateToTab,
}) => {
  // Convert chapter into modular StudyFlow LearnDocument sections
  const { document: initialDoc } = useMemo(() => {
    return migrateChapterToLearnDocument(chapter);
  }, [chapter]);

  // Local reactive sections state
  const [sections, setSections] = useState<Section[]>(initialDoc.sections);

  // Accordion state: which section accordion is currently expanded
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(
    initialDoc.sections[0]?.id || null
  );

  // Modals state
  const [readingSection, setReadingSection] = useState<Section | null>(null);
  const [summaryModalSection, setSummaryModalSection] = useState<Section | null>(null);
  const [quizModalSection, setQuizModalSection] = useState<{ section: Section; mode: 'study' | 'test' } | null>(null);
  const [flashcardsModalSection, setFlashcardsModalSection] = useState<{ section: Section; mode: 'practice' | 'edit' } | null>(null);
  const [isDocumentReaderOpen, setIsDocumentReaderOpen] = useState(false);

  // Handle section expansion toggle
  const handleToggleExpand = (sectionId: string) => {
    setExpandedSectionId((prev) => (prev === sectionId ? null : sectionId));
  };

  // Card & Sub-action handlers
  const handleOpenFlashcards = (section: Section, mode: 'practice' | 'edit') => {
    setFlashcardsModalSection({ section, mode });
  };

  const handleOpenQuiz = (section: Section, mode: 'study' | 'test') => {
    setQuizModalSection({ section, mode });
  };

  const handleRead = (section: Section) => {
    setReadingSection(section);
  };

  const handleReadSummary = (section: Section) => {
    setReadingSection(section);
  };

  const handleReadDocument = (_section: Section) => {
    setIsDocumentReaderOpen(true);
  };

  // Handle concept skip toggle
  const handleToggleConceptSkip = (sectionId: string, conceptId: string, isSkipped: boolean) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id === sectionId) {
          return {
            ...sec,
            completionRate: isSkipped ? Math.max(0, sec.completionRate - 10) : Math.min(100, sec.completionRate + 10),
          };
        }
        return sec;
      })
    );
  };

  // Handle concept status toggle
  const handleToggleConceptStatus = (
    sectionId: string,
    conceptId: string,
    newStatus: 'not_started' | 'learning' | 'mastered'
  ) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id === sectionId) {
          const newCompletion = newStatus === 'mastered' ? Math.min(100, sec.completionRate + 25) : Math.max(20, sec.completionRate - 20);
          return { ...sec, completionRate: newCompletion };
        }
        return sec;
      })
    );
  };

  // When a quiz is completed
  const handleQuizComplete = (sectionId: string, score: number, timeTakenSec: number) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id === sectionId) {
          const updatedQuizzes = [
            ...(sec.quizzes || []),
            {
              id: `quiz-${Date.now()}`,
              sectionId,
              mode: 'test' as const,
              score,
              timeTakenSeconds: timeTakenSec,
              completedAt: new Date().toISOString(),
              questions: sec.quizzes?.[0]?.questions || [],
            },
          ];
          const newRate = Math.min(100, Math.max(sec.completionRate, score));
          return {
            ...sec,
            completionRate: newRate,
            quizzes: updatedQuizzes,
          };
        }
        return sec;
      })
    );

    // Update global chapter status if score is high
    if (onUpdateChapterStatus) {
      const overallMastery = Math.min(100, Math.max(chapter.masteryPercentage || 0, score));
      onUpdateChapterStatus(
        chapter.id,
        score >= 80 ? 'mastered' : score >= 60 ? 'ready' : 'needs_practice',
        overallMastery,
        exam?.id
      );
    }
  };

  // When cards are updated
  const handleUpdateCards = (sectionId: string, updatedCards: DocumentFlashcard[]) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === sectionId ? { ...sec, flashcards: updatedCards } : sec))
    );
  };

  // Overall progress
  const overallProgress = useMemo(() => {
    if (sections.length === 0) return 0;
    return Math.round(sections.reduce((acc, s) => acc + s.completionRate, 0) / sections.length);
  }, [sections]);

  // When active reading screen is engaged, show the Dual-Pane Summary & Active Recall screen
  if (readingSection) {
    return (
      <>
        <DualPaneSummaryReader
          documentName={chapter.name}
          subjectName={subject?.name || 'Physics'}
          section={readingSection}
          onBack={() => setReadingSection(null)}
          onUpdateCompletion={(secId, newRate) => {
            setSections((prev) =>
              prev.map((s) => (s.id === secId ? { ...s, completionRate: newRate } : s))
            );
          }}
          onOpenPDF={() => setIsDocumentReaderOpen(true)}
        />

        {/* Global Document / Textbook Reader Modal */}
        <DocumentReaderModal
          chapter={chapter}
          isOpen={isDocumentReaderOpen}
          onClose={() => setIsDocumentReaderOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32 pt-3 px-4 transition-colors">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* =================================================================== */}
        {/* TOP BAR & BREADCRUMB */}
        {/* =================================================================== */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer p-1 -ml-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{subject?.name || 'Subject'} Chapters</span>
          </button>

          <div className="flex items-center gap-2">
            {exam && (
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {exam.daysLeft === 0 ? 'Exam Today' : `${exam.daysLeft}d to Exam`}
              </span>
            )}

            {onDeleteChapter && (
              <button
                type="button"
                onClick={() => onDeleteChapter(chapter.id, chapter.name, exam?.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                title="Delete this chapter"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* CHAPTER TITLE & META CARD */}
        {/* =================================================================== */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {subject?.name || 'Subject'}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs font-bold text-slate-500">
                {sections.length} Modular Sections
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {chapter.name}
            </h1>
          </div>

          {/* Quick Progress Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[11px] font-bold text-slate-400">Mastery Index</div>
              <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                {overallProgress}%
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* ROADMAP VIEW (LOCKED) */}
        {/* Render sections as vertical milestone cards with connected nodes */}
        {/* =================================================================== */}
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          {/* Header info bar */}
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-500" />
                <span>Curriculum Milestones & Knowledge Nodes</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Work through each vertical milestone to check your learning and reinforce spaced recall.
              </p>
            </div>

            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200/80 dark:border-indigo-800">
              {sections.filter((s) => s.completionRate >= 80).length} of {sections.length} Mastered
            </span>
          </div>

          {/* List of vertical milestone cards with connected nodes */}
          <div className="pt-2">
            {sections.map((section, idx) => (
              <RoadmapMilestoneCard
                key={section.id}
                section={section}
                chapterName={chapter.name}
                index={idx}
                totalSections={sections.length}
                isExpanded={expandedSectionId === section.id}
                onToggleExpand={() => handleToggleExpand(section.id)}
                onOpenFlashcards={handleOpenFlashcards}
                onOpenQuiz={handleOpenQuiz}
                onRead={handleRead}
                onReadSummary={handleReadSummary}
                onReadDocument={handleReadDocument}
                onToggleConceptSkip={handleToggleConceptSkip}
                onToggleConceptStatus={handleToggleConceptStatus}
              />
            ))}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* INTERACTIVE MODALS */}
      {/* =================================================================== */}
      {summaryModalSection && (
        <SummaryReaderModal
          section={summaryModalSection}
          chapterName={chapter.name}
          isOpen={true}
          onClose={() => setSummaryModalSection(null)}
          onMarkRead={(secId) => {
            setSections((prev) =>
              prev.map((s) =>
                s.id === secId ? { ...s, completionRate: Math.min(100, s.completionRate + 15) } : s
              )
            );
          }}
        />
      )}

      {quizModalSection && (
        <CheckLearningDrillModal
          section={quizModalSection.section}
          chapterName={chapter.name}
          subjectName={subject?.name || 'Science'}
          isOpen={true}
          initialMode={quizModalSection.mode}
          onClose={() => setQuizModalSection(null)}
          onDrillComplete={handleQuizComplete}
          onOpenSummaryForMissed={(sec) => {
            setQuizModalSection(null);
            setReadingSection(sec);
          }}
        />
      )}

      {flashcardsModalSection && (
        <FullScreenFlashcardStudy
          section={flashcardsModalSection.section}
          chapterName={chapter.name}
          subjectName={subject?.name || 'Science'}
          isOpen={true}
          initialMode={flashcardsModalSection.mode}
          onClose={() => setFlashcardsModalSection(null)}
          onUpdateCards={handleUpdateCards}
        />
      )}

      {isDocumentReaderOpen && (
        <DocumentReaderModal
          chapter={chapter}
          isOpen={true}
          onClose={() => setIsDocumentReaderOpen(false)}
          onMarkComplete={() => {
            setSections((prev) =>
              prev.map((s) => ({ ...s, completionRate: Math.min(100, s.completionRate + 10) }))
            );
          }}
        />
      )}
    </div>
  );
};
