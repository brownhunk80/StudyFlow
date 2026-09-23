import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Trash2,
  TrendingUp,
  Compass,
  FileText,
  FileUp,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Activity,
} from 'lucide-react';
import {
  Chapter,
  ChapterTopicItem,
  Exam,
  Subject,
  Section,
  DocumentFlashcard,
  ChapterStatus,
  Summary,
  KnowledgeQuestion,
  Quiz,
  QuizQuestion,
  ChapterCreationData,
  DocumentMilestoneItem,
} from '../../types';
import { migrateChapterToLearnDocument } from '../../utils/learnDocumentMigration';
import { RoadmapMilestoneCard } from './RoadmapMilestoneCard';
import { SummaryReaderModal } from './SummaryReaderModal';
import { CheckLearningDrillModal } from './CheckLearningDrillModal';
import { FullScreenFlashcardStudy } from './FullScreenFlashcardStudy';
import { DocumentReaderModal } from './DocumentReaderModal';
import { DualPaneSummaryReader } from './DualPaneSummaryReader';
import { DocumentSourceModal } from './DocumentSourceModal';
import { AttachDocumentModal } from './AttachDocumentModal';
import { ReviewMilestonesModal } from './ReviewMilestonesModal';
import { DocumentDiagnosticsModal } from './DocumentDiagnosticsModal';

interface StudyFlowChapterWorkspaceProps {
  chapter: Chapter;
  subject?: Subject | null;
  exam?: Exam | null;
  onBack: () => void;
  onUpdateChapterStatus?: (chapterId: string, status: ChapterStatus, score?: number, examId?: string) => void;
  onUpdateChapterTopics?: (chapterId: string, topics: ChapterTopicItem[], examId?: string) => void;
  onUpdateChapterSections?: (chapterId: string, sections: Section[], examId?: string) => void;
  onUpdateChapterDocument?: (chapterId: string, docData: Partial<ChapterCreationData>, examId?: string) => void;
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
  onUpdateChapterSections,
  onUpdateChapterDocument,
  onDeleteChapter,
}) => {
  // Enforce Chapter-Specific Dynamic State Binding:
  // Milestones are read strictly by chapter ID from chapter.milestones (or chapter.sections).
  // If no milestones exist for this specific chapter, default strictly to [] (empty array).
  const currentMilestones: Section[] = useMemo(() => {
    if (Array.isArray(chapter?.milestones) && chapter.milestones.length > 0) {
      return chapter.milestones;
    }
    if (Array.isArray(chapter?.sections) && chapter.sections.length > 0) {
      return chapter.sections;
    }
    return [];
  }, [chapter?.id, chapter?.milestones, chapter?.sections]);

  // Local reactive sections state bound strictly to current chapter ID
  const [sections, setSections] = useState<Section[]>(currentMilestones);

  // Sync sections whenever chapter.id or currentMilestones updates
  useEffect(() => {
    setSections(currentMilestones);
    setExpandedSectionId(currentMilestones[0]?.id || null);
  }, [chapter?.id, currentMilestones]);

  // Accordion state: which section accordion is currently expanded
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(
    sections[0]?.id || null
  );

  // Modals state
  const [readingSection, setReadingSection] = useState<Section | null>(null);
  const [summaryModalSection, setSummaryModalSection] = useState<Section | null>(null);
  const [quizModalSection, setQuizModalSection] = useState<{ section: Section; mode: 'study' | 'test' } | null>(null);
  const [flashcardsModalSection, setFlashcardsModalSection] = useState<{ section: Section; mode: 'practice' | 'edit' } | null>(null);
  const [isDocumentReaderOpen, setIsDocumentReaderOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [extractedMilestonesForReview, setExtractedMilestonesForReview] = useState<DocumentMilestoneItem[]>([]);

  // Milestone AI Pipeline extraction state & animated stepper
  const [isExtractingMilestones, setIsExtractingMilestones] = useState(false);
  const [extractionStep, setExtractionStep] = useState<number>(1);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isGeneratingDetailId, setIsGeneratingDetailId] = useState<string | null>(null);

  // Check whether material is attached
  const hasDocument = Boolean(chapter.documentName || chapter.documentUrl || chapter.rawText);

  // On-demand Detail Generator (Phase B): generates Check Learning, Recall Deck & Dual Summary per milestone
  const ensureSectionContent = async (sec: Section): Promise<Section> => {
    const hasQuestions = (sec.quizzes?.[0]?.questions?.length || 0) > 0;
    const hasFlashcards = (sec.flashcards?.length || 0) > 0;
    if (hasQuestions && hasFlashcards) {
      return sec;
    }

    setIsGeneratingDetailId(sec.id);
    try {
      let excerpt = '';
      const raw = (chapter.rawText || '').trim();
      if (raw) {
        const textLower = raw.toLowerCase();
        const titleLower = sec.title.toLowerCase();
        const foundIdx = textLower.indexOf(titleLower);
        if (foundIdx !== -1) {
          excerpt = raw.slice(Math.max(0, foundIdx - 150), Math.min(raw.length, foundIdx + 3500));
        } else {
          excerpt = raw.slice(0, 3500);
        }
      }

      const res = await fetch('/api/chapters/generate-milestone-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneTitle: sec.title,
          coreTopics: sec.keyTopics && sec.keyTopics.length > 0 ? sec.keyTopics : [sec.title],
          sectionTextExcerpt: excerpt,
          chapterTitle: chapter.name,
        }),
      });

      if (res.ok) {
        const detail = await res.json();

        const newFlashcards: DocumentFlashcard[] = (detail.recallDeck || []).map((rc: any, cIdx: number) => ({
          id: `dfc-${sec.id}-${cIdx + 1}`,
          sectionId: sec.id,
          frontPrompt: rc.front || `Key prompt for ${sec.title}`,
          backAnswer: rc.explanation
            ? `${rc.back}\n\n💡 *Explanation*: ${rc.explanation}`
            : rc.sourceExcerpt
              ? `${rc.back}\n\n📖 *Source*: ${rc.sourceExcerpt}`
              : rc.back || 'Reference answer',
          sourceContext: `${chapter.name} • ${sec.title}`,
          interval: 1,
          repetition: 0,
          easinessFactor: 2.5,
          status: 'active' as const,
          dueDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        const newQuizQuestions: QuizQuestion[] = (detail.checkLearning || []).map((q: any, qIdx: number) => ({
          id: `qq-${sec.id}-${qIdx + 1}`,
          quizId: `qz-${sec.id}`,
          questionText: q.question,
          choices: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
          explanation: q.explanation || 'Verified textbook reasoning.',
          topicTag: sec.title,
          difficulty: qIdx % 2 === 0 ? 'Recall' : 'Application',
          orderIndex: qIdx,
          createdAt: new Date().toISOString(),
        }));

        const newQuiz: Quiz = {
          id: `qz-${sec.id}`,
          sectionId: sec.id,
          mode: 'study',
          score: sec.quizzes?.[0]?.score || null,
          timeTakenSeconds: null,
          questions: newQuizQuestions,
          createdAt: new Date().toISOString(),
        };

        const updatedSection: Section = {
          ...sec,
          summaries: [
            {
              id: `sum-${sec.id}-compact`,
              sectionId: sec.id,
              mode: 'compact',
              contentMarkdown: detail.summary?.compact || sec.summaries?.[0]?.contentMarkdown || '',
              createdAt: new Date().toISOString(),
            },
            {
              id: `sum-${sec.id}-detailed`,
              sectionId: sec.id,
              mode: 'detailed',
              contentMarkdown: detail.summary?.detailed || sec.summaries?.[1]?.contentMarkdown || '',
              createdAt: new Date().toISOString(),
            },
          ],
          flashcards: newFlashcards.length > 0 ? newFlashcards : sec.flashcards,
          quizzes: [newQuiz],
        };

        setSections((prev) => {
          const next = prev.map((s) => (s.id === sec.id ? updatedSection : s));
          onUpdateChapterSections?.(chapter.id, next, exam?.id);
          try {
            localStorage.setItem(`chapter_milestones_${chapter.id}`, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });

        return updatedSection;
      }
    } catch (genErr) {
      console.warn(`[OnDemandDetail] Generation failed for "${sec.title}":`, genErr);
    } finally {
      setIsGeneratingDetailId(null);
    }
    return sec;
  };

  // Handle section expansion toggle & pre-fetch details in background
  const handleToggleExpand = (sectionId: string) => {
    setExpandedSectionId((prev) => {
      const nextId = prev === sectionId ? null : sectionId;
      if (nextId) {
        const target = sections.find((s) => s.id === nextId);
        if (target) {
          ensureSectionContent(target);
        }
      }
      return nextId;
    });
  };

  // Card & Sub-action handlers with on-demand content resolution
  const handleOpenFlashcards = async (section: Section, mode: 'practice' | 'edit') => {
    const readySection = await ensureSectionContent(section);
    setFlashcardsModalSection({ section: readySection, mode });
  };

  const handleOpenQuiz = async (section: Section, mode: 'study' | 'test') => {
    const readySection = await ensureSectionContent(section);
    setQuizModalSection({ section: readySection, mode });
  };

  const handleRead = async (section: Section) => {
    const readySection = await ensureSectionContent(section);
    setReadingSection(readySection);
  };

  const handleReadSummary = async (section: Section) => {
    const readySection = await ensureSectionContent(section);
    setReadingSection(readySection);
  };

  const handleReadDocument = (_section: Section) => {
    setIsDocumentReaderOpen(true);
  };

  // Handle concept skip toggle
  const handleToggleConceptSkip = (sectionId: string, _conceptId: string, isSkipped: boolean) => {
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
    _conceptId: string,
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
    const updatedSections = sections.map((sec) => {
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
    });

    setSections(updatedSections);
    onUpdateChapterSections?.(chapter.id, updatedSections, exam?.id);

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
    const updated = sections.map((sec) => (sec.id === sectionId ? { ...sec, flashcards: updatedCards } : sec));
    setSections(updated);
    onUpdateChapterSections?.(chapter.id, updated, exam?.id);
  };

  // Overall progress
  const overallProgress = useMemo(() => {
    if (sections.length === 0) return 0;
    return Math.round(sections.reduce((acc, s) => acc + s.completionRate, 0) / sections.length);
  }, [sections]);

  // AI Pipeline: Extract Milestones & Build Roadmap (Phase A: Fast Outline Discovery)
  const handleExtractMilestones = async (_forceOverwrite: boolean = false) => {
    setIsExtractingMilestones(true);
    setExtractionStep(1);
    setExtractionError(null);

    // a) Clear any previous milestones tied to this specific chapterId immediately
    setSections([]);
    onUpdateChapterSections?.(chapter.id, [], exam?.id);

    // Progressive stepper animations
    const step2Timer = setTimeout(() => setExtractionStep(2), 700);
    const step3Timer = setTimeout(() => setExtractionStep(3), 1500);

    const chapterTitle = chapter.name;
    const rawText = (chapter.rawText || '').trim();

    // Payload logging
    console.log("Dispatching text to extraction API. Length:", rawText.length);

    try {
      if (!rawText && !chapter.documentUrl) {
        throw new Error('Chapter text must be at least 100 characters long. Please paste chapter text or attach a readable document.');
      }

      const response = await fetch('/api/chapters/extract-milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterTitle,
          chapterName: chapterTitle,
          rawText,
          inlinePdf: chapter.documentUrl,
          documentName: chapter.documentName,
          subject: subject?.name || 'General',
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      let data: any;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textPayload = await response.text();
        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}: ${textPayload.slice(0, 120)}`);
        }
        try {
          data = JSON.parse(textPayload);
        } catch {
          throw new Error('Server returned an invalid non-JSON response.');
        }
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || `Failed to extract milestones (HTTP ${response.status})`);
      }

      if (!data.milestones || !Array.isArray(data.milestones) || data.milestones.length === 0) {
        throw new Error('No milestones could be extracted from the document.');
      }

      // Convert Phase A outline milestones to DocumentMilestoneItem for review & approval
      const previewMilestones: DocumentMilestoneItem[] = data.milestones.map((m: any, idx: number) => {
        const milestoneNum = typeof m.milestoneNumber === 'number' ? m.milestoneNumber : idx + 1;
        const title = m.title || `Milestone ${idx + 1}`;
        const topics = Array.isArray(m.coreTopics) && m.coreTopics.length > 0 ? m.coreTopics : [title];
        return {
          milestoneNumber: milestoneNum,
          title,
          milestoneTitle: title,
          sourcePageRange: m.pageOrSectionRef || `Section ${idx + 1}`,
          sourceHeading: title,
          coreTopics: topics,
          summary: {
            compact: `Curriculum unit: ${title}. Covers ${topics.join(', ')}.`,
            detailed: `## ${title}\n\nCore curriculum section for ${chapter.name}.\n\n### Core Topics\n${topics.map((t: string) => `- ${t}`).join('\n')}`,
          },
          checkLearning: [],
          recallDeck: [],
        };
      });

      // Review & Confirm Extracted Milestones Preview Step
      setExtractedMilestonesForReview(previewMilestones);
      setIsReviewModalOpen(true);
    } catch (err: any) {
      console.error('Error during milestone extraction:', err);
      const rawMsg = err.message || 'Unknown extraction error';
      const formatted = rawMsg.startsWith('Failed to extract milestones from text')
        ? rawMsg
        : `Failed to extract milestones from text: ${rawMsg}`;
      setExtractionError(formatted);
    } finally {
      clearTimeout(step2Timer);
      clearTimeout(step3Timer);
      setIsExtractingMilestones(false);
    }
  };

  // Commit validated and approved milestones into the chapter state & roadmap
  const handleApproveMilestones = (approvedMilestones: DocumentMilestoneItem[]) => {
    const newSections: Section[] = approvedMilestones.map((m: any, idx: number) => {
      const sectionId = `sec-${chapter.id}-${idx + 1}`;
      const sectionNumber = idx + 1;
      const sectionTitle = m.title || m.milestoneTitle || `Section ${idx + 1}`;

      const compactContent =
        typeof m.summary === 'object' && m.summary?.compact
          ? m.summary.compact
          : typeof m.summary === 'string'
            ? m.summary
            : `### Key Takeaways: ${sectionTitle}\n- Core syllabus concept for ${chapter.name}`;

      const detailedContent =
        typeof m.summary === 'object' && m.summary?.detailed
          ? m.summary.detailed
          : `## ${sectionTitle} — Reference Notes\n\n${compactContent}`;

      const compactSummary: Summary = {
        id: `sum-${sectionId}-compact`,
        sectionId,
        mode: 'compact',
        contentMarkdown: compactContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const detailedSummary: Summary = {
        id: `sum-${sectionId}-detailed`,
        sectionId,
        mode: 'detailed',
        contentMarkdown: detailedContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const rawRecall = m.recallDeck || m.recallCards || [];
      const flashcards: DocumentFlashcard[] = rawRecall.map((rc: any, cIdx: number) => ({
        id: `dfc-${sectionId}-${cIdx + 1}`,
        sectionId,
        frontPrompt: rc.front || `Key question on ${sectionTitle}`,
        backAnswer: rc.explanation
          ? `${rc.back}\n\n💡 *Explanation*: ${rc.explanation}`
          : rc.sourceExcerpt
            ? `${rc.back}\n\n📖 *Source*: ${rc.sourceExcerpt}`
            : rc.back || 'Reference answer',
        sourceContext: `${chapter.name} • ${sectionTitle}`,
        interval: 1,
        repetition: 0,
        easinessFactor: 2.5,
        status: 'active' as const,
        dueDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const rawCheck = m.checkLearning || m.checkLearningQuestions || [];
      const quizQuestions: QuizQuestion[] = rawCheck.map((q: any, qIdx: number) => ({
        id: `qq-${sectionId}-${qIdx + 1}`,
        quizId: `qz-${sectionId}`,
        questionText: q.question,
        choices: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
        explanation: q.misdirectionBreakdown
          ? `${q.explanation}\n\n*Distractor Analysis*: ${q.misdirectionBreakdown}`
          : q.explanation || 'Verified textbook reasoning.',
        topicTag: sectionTitle,
        difficulty: qIdx % 2 === 0 ? 'Recall' : 'Application',
        orderIndex: qIdx,
        createdAt: new Date().toISOString(),
      }));

      const quiz: Quiz = {
        id: `qz-${sectionId}`,
        sectionId,
        mode: 'study',
        score: null,
        timeTakenSeconds: null,
        questions: quizQuestions,
        createdAt: new Date().toISOString(),
      };

      const knowledgeQuestions: KnowledgeQuestion[] = rawRecall.slice(0, 3).map((rc: any, kIdx: number) => ({
        id: `kq-${sectionId}-${kIdx + 1}`,
        sectionId,
        question: rc.front,
        sampleAnswer: rc.back,
        isCorrect: null,
        createdAt: new Date().toISOString(),
      }));

      return {
        id: sectionId,
        documentId: `doc-${chapter.id}`,
        title: sectionTitle,
        sectionNumber,
        completionRate: 0,
        keyTopics: Array.isArray(m.coreTopics) && m.coreTopics.length > 0 ? m.coreTopics : [sectionTitle],
        isSkipped: false,
        orderIndex: idx,
        estimatedMinutes: 15,
        sourceReference: m.sourcePageRange || `Milestone 0${idx + 1}`,
        summaries: [compactSummary, detailedSummary],
        knowledgeQuestions,
        flashcards,
        quizzes: [quiz],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    // Map to ChapterTopicItem[] for legacy compatibility
    const newTopics: ChapterTopicItem[] = newSections.map((sec, idx) => ({
      id: `topic-${chapter.id}-${idx + 1}`,
      title: sec.title,
      summary: sec.summaries?.[0]?.contentMarkdown?.slice(0, 160) || '',
      keyPoints: sec.keyTopics,
      status: 'not_started',
    }));

    // Commit state and notify parent listeners
    setSections(newSections);
    setExpandedSectionId(newSections[0]?.id || null);
    onUpdateChapterSections?.(chapter.id, newSections, exam?.id);
    onUpdateChapterTopics?.(chapter.id, newTopics, exam?.id);

    // Pre-fetch detailed content for the first milestone in the background
    if (newSections.length > 0) {
      ensureSectionContent(newSections[0]);
    }

    try {
      localStorage.setItem(`chapter_milestones_${chapter.id}`, JSON.stringify(newSections));
    } catch {
      // ignore
    }
  };

  // When active reading screen is engaged, show the Dual-Pane Summary & Active Recall screen
  if (readingSection) {
    return (
      <>
        <DualPaneSummaryReader
          documentName={chapter.name}
          subjectName={subject?.name || 'Science'}
          section={readingSection}
          onBack={() => setReadingSection(null)}
          onUpdateCompletion={(secId, newRate) => {
            const updated = sections.map((s) => (s.id === secId ? { ...s, completionRate: newRate } : s));
            setSections(updated);
            onUpdateChapterSections?.(chapter.id, updated, exam?.id);
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
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  {subject?.name || 'Subject'}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs font-bold text-slate-500">
                  {sections.length > 0 ? `${sections.length} Modular Milestones` : 'Unprocessed Roadmap'}
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

          {/* Attached Document Chip, Visual Document Sync Badge & Quick Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Visual Document Sync Badge: "Source: [Attached Document Name] • [X] Milestones Extracted" */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 shadow-2xs">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="font-semibold text-slate-500 dark:text-slate-400">Source:</span>
                <span className="font-bold text-slate-900 dark:text-white max-w-[200px] sm:max-w-xs truncate">
                  {chapter.documentName || (hasDocument ? 'Attached Document' : 'No Document Attached')}
                </span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {sections.length} Milestones Extracted
                </span>
                {chapter.pageCount && (
                  <span className="text-slate-400 font-normal">
                    • {chapter.pageCount} Pages
                  </span>
                )}
                {hasDocument && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5 text-[10px]">
                    <FileCheck className="w-3 h-3" /> Attached
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                {hasDocument && (
                  <>
                    <button
                      onClick={() => setIsSourceModalOpen(true)}
                      className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
                    >
                      View Source
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <button
                      onClick={() => setIsDiagnosticsModalOpen(true)}
                      className="font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
                      title="Run Diagnostic Health Check on Document Text"
                    >
                      <Activity className="w-3 h-3 text-indigo-500" />
                      <span>Diagnose</span>
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                  </>
                )}
                <button
                  onClick={() => setIsAttachModalOpen(true)}
                  className="font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  {hasDocument ? 'Replace Document' : 'Attach Document'}
                </button>
              </div>
            </div>

            {/* Re-extract / Overwrite Milestones Button */}
            <div className="flex items-center gap-2">
              {hasDocument && (
                <button
                  onClick={() => handleExtractMilestones(true)}
                  disabled={isExtractingMilestones}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80 transition cursor-pointer disabled:opacity-50 shadow-2xs"
                  title="Re-run AI extraction and overwrite current milestones with new analysis from the document"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isExtractingMilestones ? 'animate-spin' : ''}`} />
                  <span>{sections.length > 0 ? 'Re-extract / Overwrite Milestones' : 'Extract Milestones'}</span>
                </button>
              )}
              {!hasDocument && (
                <button
                  onClick={() => setIsAttachModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* ROADMAP VIEW: POPULATED vs EMPTY vs PROCESSING STATES */}
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
                {sections.length > 0
                  ? 'Work through each vertical milestone to check your learning and reinforce spaced recall.'
                  : 'Milestones will be generated exclusively from your source document.'}
              </p>
            </div>

            {sections.length > 0 && (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200/80 dark:border-indigo-800">
                {sections.filter((s) => s.completionRate >= 80).length} of {sections.length} Mastered
              </span>
            )}
          </div>

          {/* 1. ANIMATED STEPPER WHILE PROCESSING */}
          {isExtractingMilestones && (
            <div className="p-7 rounded-3xl bg-white dark:bg-slate-900 border-2 border-indigo-500/40 shadow-xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                  <Sparkles className="w-6 h-6 animate-spin" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Deconstructing Chapter Document
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gemini is reading "{chapter.documentName || chapter.name}" to generate your curriculum milestones.
                  </p>
                </div>
              </div>

              {/* 3-Step Animated Stepper */}
              <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                {/* Step 1 */}
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                      extractionStep > 1
                        ? 'bg-emerald-500 text-white'
                        : extractionStep === 1
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {extractionStep > 1 ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-xs font-bold ${
                        extractionStep >= 1
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      1. Parsing document structure & core syllabus themes...
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Extracting headings, governing relations, and sub-sections.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                      extractionStep > 2
                        ? 'bg-emerald-500 text-white'
                        : extractionStep === 2
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {extractionStep > 2 ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : extractionStep === 2 ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      '2'
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-xs font-bold ${
                        extractionStep >= 2
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      2. Generating curriculum milestones & high-yield summaries...
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Structuring compact & detailed notes for each concept cluster.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                      extractionStep === 3
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {extractionStep === 3 ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      '3'
                    )}
                  </div>
                  <div>
                    <p
                      className={`text-xs font-bold ${
                        extractionStep >= 3
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      3. Populating Recall Decks & Check Learning drills...
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Generating atomic flashcards and exam MCQs with misdirection breakdowns.
                    </p>
                  </div>
                </div>
              </div>

              {/* Pulsing skeleton preview */}
              <div className="space-y-3 pt-2">
                <div className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse border border-slate-200/60 dark:border-slate-700/50" />
                <div className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse border border-slate-200/60 dark:border-slate-700/50 opacity-60" />
              </div>
            </div>
          )}

          {/* 2. ERROR STATE (IF PIPELINE FAILED) */}
          {extractionError && (
            <div className="p-5 rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-rose-900 dark:text-rose-200">
                      {extractionError.includes('UNREADABLE_DOCUMENT') || extractionError.includes('no readable text')
                        ? 'Unreadable or Scanned Document'
                        : 'Extraction Pipeline Interrupted'}
                    </h4>
                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed max-w-xl">
                      {extractionError}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleExtractMilestones(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition shrink-0 cursor-pointer shadow-xs"
                >
                  Retry Extraction
                </button>
              </div>

              {/* Quick Troubleshooting Actions */}
              <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={() => setIsDiagnosticsModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Inspect Document & Run Diagnostics</span>
                </button>
                <button
                  onClick={() => setIsAttachModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <FileUp className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Paste Text or Replace File</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. POPULATED ROADMAP LIST */}
          {!isExtractingMilestones && sections.length > 0 && (
            <div className="pt-2">
              {sections.map((section, idx) => (
                <RoadmapMilestoneCard
                  key={section.id}
                  section={section}
                  chapterName={chapter.name}
                  index={idx}
                  totalSections={sections.length}
                  isExpanded={expandedSectionId === section.id}
                  isGeneratingDetail={isGeneratingDetailId === section.id}
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
          )}

          {/* 4. EMPTY ROADMAP STATE (Strictly rendered when currentMilestones.length === 0) */}
          {!isExtractingMilestones && sections.length === 0 && (
            <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs text-center space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center shadow-md">
                <Compass className="w-8 h-8" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  No Milestones Generated Yet
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  No milestones generated yet. Upload a document and click 'Extract Milestones' to build your roadmap for this chapter.
                </p>
              </div>

              {/* Source Document pill if already attached */}
              {hasDocument && (
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                  <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                    {chapter.documentName || 'Document ready'}
                  </span>
                  {chapter.pageCount && (
                    <span className="text-slate-400 font-normal">• ~{chapter.pageCount} Pages</span>
                  )}
                  {chapter.rawText && (
                    <span className="text-slate-400 font-normal">
                      • {chapter.rawText.length.toLocaleString()} chars
                    </span>
                  )}
                </div>
              )}

              {/* Primary CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {hasDocument ? (
                  <>
                    <button
                      onClick={() => handleExtractMilestones(false)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/25 transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Extract Milestones</span>
                    </button>
                    <button
                      onClick={() => setIsAttachModalOpen(true)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
                    >
                      <FileUp className="w-4 h-4" />
                      <span>Upload / Process Document</span>
                    </button>
                    <button
                      onClick={() => setIsSourceModalOpen(true)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold transition cursor-pointer"
                    >
                      <FileText className="w-4 h-4" />
                      <span>View Source</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsAttachModalOpen(true)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/25 transition cursor-pointer"
                  >
                    <FileUp className="w-4 h-4" />
                    <span>Upload / Process Document</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-400">
                Supports PDF, DOCX, TXT, EPUB, or pasted syllabus text.
              </p>
            </div>
          )}
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
            const updated = sections.map((s) =>
              s.id === secId ? { ...s, completionRate: Math.min(100, s.completionRate + 15) } : s
            );
            setSections(updated);
            onUpdateChapterSections?.(chapter.id, updated, exam?.id);
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
            const updated = sections.map((s) => ({ ...s, completionRate: Math.min(100, s.completionRate + 10) }));
            setSections(updated);
            onUpdateChapterSections?.(chapter.id, updated, exam?.id);
          }}
        />
      )}

      {/* Source Viewer Modal */}
      <DocumentSourceModal
        isOpen={isSourceModalOpen}
        chapter={chapter}
        onClose={() => setIsSourceModalOpen(false)}
        onReplaceDocument={() => setIsAttachModalOpen(true)}
      />

      {/* Attach / Replace Document Modal */}
      <AttachDocumentModal
        isOpen={isAttachModalOpen}
        chapterName={chapter.name}
        currentDocumentName={chapter.documentName}
        onClose={() => setIsAttachModalOpen(false)}
        onAttachDocument={(docData) => {
          onUpdateChapterDocument?.(chapter.id, docData, exam?.id);
        }}
      />

      {/* Review & Confirm Extracted Milestones Modal */}
      <ReviewMilestonesModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        chapterName={chapter.name}
        documentName={chapter.documentName}
        initialMilestones={extractedMilestonesForReview}
        onApprove={(approved) => handleApproveMilestones(approved)}
        onReextract={() => {
          setIsReviewModalOpen(false);
          handleExtractMilestones(true);
        }}
      />

      {/* Document Diagnostics Modal */}
      <DocumentDiagnosticsModal
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setIsDiagnosticsModalOpen(false)}
        chapter={chapter}
        onOpenAttachModal={() => setIsAttachModalOpen(true)}
      />
    </div>
  );
};
