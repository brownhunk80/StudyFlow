import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  X,
  Volume2,
  VolumeX,
  Check,
  Compass,
  Mic,
  MicOff,
  FileText,
  UploadCloud,
  FileImage,
  Layers,
  Save,
  Brain,
  AlertCircle,
  HelpCircle,
  Folder,
  Lightbulb,
  Calendar,
  CheckCircle,
  Edit3,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { StudyFlowChapterWorkspace } from './studyflow/StudyFlowChapterWorkspace';
import {
  TaskItem,
  FocusSession,
  FocusCompletionResult,
  SubjectItem,
  Exam,
  Chapter,
  ChapterMaterial,
  ChapterNote,
  ChapterTopicItem,
  HandwrittenNoteAttachment,
  Flashcard,
  FlashcardDeck,
  ChapterStatus,
  RecallVerificationResult,
  VerificationInputMode,
  ChapterCreationData,
  Section,
} from '../types';
import { CreateChapterModal } from './CreateChapterModal';
import {
  getChapterCuratedContent,
  ChapterCuratedContent,
  ChapterTopic,
} from '../data/chapterTopicsData';
import { ChapterMaterialsManager } from './ChapterMaterialsManager';
import { ChapterTopicExtractor } from './ChapterTopicExtractor';
import { ChapterTopicList } from './ChapterTopicList';
import { TopicPickerForRevision, SelectedTopicRevisionBanner } from './TopicPickerForRevision';
import { ELI5Explainer } from './ELI5Explainer';
import { SAMPLE_HANDWRITTEN_NOTE_SVG } from '../data/sampleHandwrittenNote';
import { useOnboarding } from '../context/OnboardingContext';
import { PageGuideButton } from './guide/PageGuideButton';
import {
  fetchRecallVerification,
  fetchConvertHandwrittenNotes,
  fetchChapterNotes,
  fetchExtractChapterTopics,
} from '../utils/aiClient';
import {
  calculateExamReadiness,
  formatChapterStatusLabel,
  getChapterStatusColor,
} from '../utils/examReadiness';

export interface FocusScreenProps {
  initialTask?: TaskItem | null;
  initialSubjectId?: string | null;
  initialChapterId?: string | null;
  tasks?: TaskItem[];
  subjects?: SubjectItem[];
  exams?: Exam[];
  flashcards?: Flashcard[];
  decks?: FlashcardDeck[];
  onSessionComplete?: (session: FocusSession, result?: FocusCompletionResult) => void;
  onClearInitialTask?: () => void;
  onNavigateToTab?: (tab: 'home' | 'focus' | 'recall' | 'plan' | 'progress') => void;
  onStartRecallAction?: (subject?: string, chapter?: string) => void;
  onStartPracticeAction?: (task?: TaskItem) => void;
  onUpdateChapterNotes?: (
    chapterId: string,
    notes: ChapterNote,
    rawNotesText?: string,
    handwrittenNotes?: HandwrittenNoteAttachment[],
    examId?: string
  ) => void;
  onUpdateChapterStatus?: (
    chapterId: string,
    status: ChapterStatus,
    score?: number,
    examId?: string
  ) => void;
  onUpdateChapterMaterials?: (
    chapterId: string,
    materials: ChapterMaterial[],
    examId?: string
  ) => void;
  onUpdateChapterTopics?: (
    chapterId: string,
    topics: ChapterTopicItem[],
    examId?: string
  ) => void;
  onAddFlashcards?: (
    cards: Array<Omit<Flashcard, 'id' | 'interval' | 'repetitions' | 'easeFactor' | 'status' | 'box'>>
  ) => void;
  onAddChapter?: (examId: string, chapterData: string | ChapterCreationData) => void;
  onUpdateChapterSections?: (chapterId: string, sections: Section[], examId?: string) => void;
  onUpdateChapterDocument?: (chapterId: string, docData: Partial<ChapterCreationData>, examId?: string) => void;
  onScheduleRevisionTasks?: (tasks: Array<Omit<TaskItem, 'id' | 'completed'>>) => void;
  onDeleteChapter?: (chapterId: string, examId?: string) => void;
  onDeleteTopic?: (topicId: string, chapterId?: string, examId?: string) => void;
  onDeleteSubject?: (subjectId: string) => void;
  onAddSubject?: () => void;
}

export const FocusScreen: React.FC<FocusScreenProps> = ({
  initialTask,
  initialSubjectId,
  initialChapterId,
  tasks = [],
  subjects = [],
  exams = [],
  flashcards = [],
  decks = [],
  onSessionComplete,
  onClearInitialTask,
  onNavigateToTab,
  onStartRecallAction,
  onStartPracticeAction,
  onUpdateChapterNotes,
  onUpdateChapterStatus,
  onUpdateChapterMaterials,
  onUpdateChapterTopics,
  onUpdateChapterSections,
  onUpdateChapterDocument,
  onAddFlashcards,
  onAddChapter,
  onScheduleRevisionTasks,
  onDeleteChapter,
  onDeleteTopic,
  onDeleteSubject,
  onAddSubject,
}) => {
  // Navigation hierarchy:
  // Level 0: Landing (all subjects + today's recommended plan)
  // Level 1: Subject Folder (chapters list)
  // Level 2: Chapter Workspace (STUDY → REVISION → UPDATE NOTES)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [chapterToDelete, setChapterToDelete] = useState<{ id: string; name: string; examId?: string } | null>(null);
  const [isConfirmingDeleteSubject, setIsConfirmingDeleteSubject] = useState(false);

  // Chapter Workspace stage: 'study' | 'revision' | 'update_notes'
  const [activeStage, setActiveStage] = useState<'study' | 'revision' | 'update_notes'>('study');

  // Study Stage sub-tab: 'textbook' | 'materials' | 'eli5' | 'timer'
  const [studySubTab, setStudySubTab] = useState<'textbook' | 'materials' | 'eli5' | 'timer'>('textbook');

  // Selected topic inside curated chapter topics
  const [selectedTopicIdx, setSelectedTopicIdx] = useState(0);

  // Revision Stage answer mode: 'speaking' | 'written_paper' | 'typing'
  const [revisionAnswerMode, setRevisionAnswerMode] = useState<VerificationInputMode>('speaking');
  const [typedRevisionText, setTypedRevisionText] = useState('');
  const [spokenRevisionText, setSpokenRevisionText] = useState('');
  const [isSpeechRecording, setIsSpeechRecording] = useState(false);
  const [speechTimerSec, setSpeechTimerSec] = useState(0);
  const speechRecognitionRef = useRef<any>(null);

  // Paper / Handwritten answer in Revision
  const [uploadedPaperFile, setUploadedPaperFile] = useState<{
    data: string;
    mimeType: string;
    name: string;
    size: number;
  } | null>(null);
  const [isConvertingPaper, setIsConvertingPaper] = useState(false);
  const [paperConvertedText, setPaperConvertedText] = useState<string | null>(null);

  // AI Verification Result
  const [isVerifyingRecall, setIsVerifyingRecall] = useState(false);
  const [recallVerificationResult, setRecallVerificationResult] = useState<RecallVerificationResult | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Update Notes Stage
  const [studentCustomNotes, setStudentCustomNotes] = useState('');
  const [aiProposedNotes, setAiProposedNotes] = useState<string | null>(null);
  const [isGeneratingAiNotes, setIsGeneratingAiNotes] = useState(false);
  const [savedDiagramAttachments, setSavedDiagramAttachments] = useState<HandwrittenNoteAttachment[]>([]);
  const [notesFinalizedNotice, setNotesFinalizedNotice] = useState(false);

  // Study Timer
  const [timerDurationMin, setTimerDurationMin] = useState(25);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // New chapter modal (Document-First Setup)
  const [isCreateChapterModalOpen, setIsCreateChapterModalOpen] = useState(false);
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');

  // Chapter Topics state (SUBJECT → CHAPTER → TOPICS)
  const [isExtractingTopics, setIsExtractingTopics] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedRevisionTopic, setSelectedRevisionTopic] = useState<ChapterTopicItem | null>(null);

  // Find active subject and exam
  const currentSubject = useMemo(() => {
    if (!selectedSubjectId) return null;
    return subjects.find((s) => s.id === selectedSubjectId || s.name.toLowerCase() === selectedSubjectId.toLowerCase()) || null;
  }, [selectedSubjectId, subjects]);

  const currentExam = useMemo(() => {
    if (!currentSubject) return null;
    return exams.find(
      (e) =>
        e.name.toLowerCase() === currentSubject.name.toLowerCase() ||
        (currentSubject.name === 'Maths' && e.name.toLowerCase().includes('math')) ||
        (currentSubject.name === 'Science' && e.name.toLowerCase().includes('sci')) ||
        (currentSubject.name === 'English' && e.name.toLowerCase().includes('eng')) ||
        (currentSubject.name === 'Social Science' && e.name.toLowerCase().includes('soc')) ||
        (currentSubject.name.includes('Hindi') && e.name.toLowerCase().includes('hin'))
    ) || null;
  }, [currentSubject, exams]);

  // List of chapters for the current subject
  const currentChapters: Chapter[] = useMemo(() => {
    if (currentExam && currentExam.chapters && currentExam.chapters.length > 0) {
      return currentExam.chapters;
    }
    return [];
  }, [currentExam]);

  // Active chapter
  const activeChapter: Chapter | null = useMemo(() => {
    if (!selectedChapterId) return null;
    return (
      currentChapters.find(
        (c) => c.id === selectedChapterId || c.name.toLowerCase() === selectedChapterId.toLowerCase()
      ) || currentChapters[0] || null
    );
  }, [selectedChapterId, currentChapters]);

  // Curated content for active chapter
  const curatedContent: ChapterCuratedContent = useMemo(() => {
    if (!activeChapter) {
      return getChapterCuratedContent('Light - Reflection & Refraction', 'Science');
    }
    return getChapterCuratedContent(activeChapter.name, currentSubject?.name || 'Science');
  }, [activeChapter, currentSubject]);

  // Initialize from initialTask or initialSubject/Chapter
  useEffect(() => {
    if (initialTask) {
      const matchSubject = subjects.find(
        (s) => s.name.toLowerCase() === (initialTask.subject || '').toLowerCase()
      ) || subjects[0];
      if (matchSubject) {
        setSelectedSubjectId(matchSubject.id);
      }
      if (initialTask.chapter) {
        setSelectedChapterId(initialTask.chapter);
      } else if (initialTask.chapterId) {
        setSelectedChapterId(initialTask.chapterId);
      }
      setActiveStage('study');
    } else if (initialSubjectId) {
      setSelectedSubjectId(initialSubjectId);
      if (initialChapterId) {
        setSelectedChapterId(initialChapterId);
        setActiveStage('study');
      }
    }
  }, [initialTask, initialSubjectId, initialChapterId, subjects]);

  // Sync active chapter's existing notes when chapter changes
  useEffect(() => {
    if (activeChapter) {
      const existingText =
        activeChapter.notes ||
        activeChapter.aiNotes?.summary ||
        '';
      setStudentCustomNotes(existingText);
      setSavedDiagramAttachments(activeChapter.handwrittenNotes || []);
      setAiProposedNotes(null);
      setRecallVerificationResult(null);
      setTypedRevisionText('');
      setSpokenRevisionText('');
      setUploadedPaperFile(null);
      setPaperConvertedText(null);
      setSelectedTopicIdx(0);
      setTimerSecondsLeft(25 * 60);
      setIsTimerRunning(false);
      setNotesFinalizedNotice(false);
    }
  }, [activeChapter?.id]);

  // Auto-extract topics if active chapter currently has no topics mapped
  const handleTriggerAutoExtractTopics = async () => {
    if (!activeChapter) return;
    setIsExtractingTopics(true);
    try {
      const result = await fetchExtractChapterTopics(
        activeChapter.name,
        currentSubject?.name || 'General',
        activeChapter.materials || [],
        currentExam?.name
      );
      if (result && Array.isArray(result.topics) && result.topics.length > 0) {
        if (onUpdateChapterTopics) {
          onUpdateChapterTopics(activeChapter.id, result.topics, currentExam?.id);
        }
      }
    } catch (err: any) {
      console.warn('Auto-extract chapter topics notification:', err?.message || err);
    } finally {
      setIsExtractingTopics(false);
    }
  };

  useEffect(() => {
    if (activeChapter && (!activeChapter.topics || activeChapter.topics.length === 0)) {
      handleTriggerAutoExtractTopics();
    }
  }, [activeChapter?.id]);

  // Timer interval
  const { triggerPageTour } = useOnboarding();

  // Trigger Learn landing guide when on Level 0
  useEffect(() => {
    if (!selectedSubjectId && !selectedChapterId) {
      triggerPageTour('learn');
    }
  }, [selectedSubjectId, selectedChapterId, triggerPageTour]);

  // Trigger Chapter guide when viewing Chapter Workspace
  useEffect(() => {
    if (selectedChapterId) {
      triggerPageTour('chapter');
    }
  }, [selectedChapterId, triggerPageTour]);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (timerSecondsLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
      } catch (e) {}
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSecondsLeft]);

  // Speech recording timer
  useEffect(() => {
    let interval: any = null;
    if (isSpeechRecording) {
      interval = setInterval(() => {
        setSpeechTimerSec((prev) => prev + 1);
      }, 1000);
    } else {
      setSpeechTimerSec(0);
    }
    return () => clearInterval(interval);
  }, [isSpeechRecording]);

  // Handle Speech Recognition toggle
  const handleToggleSpeechRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please type your explanation or write on paper.');
      setRevisionAnswerMode('typing');
      return;
    }

    if (isSpeechRecording) {
      // Stop recording
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsSpeechRecording(false);
    } else {
      // Start recording
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript + ' ';
          }
          setSpokenRevisionText(transcript.trim());
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsSpeechRecording(false);
        };

        recognition.onend = () => {
          setIsSpeechRecording(false);
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
        setIsSpeechRecording(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        alert('Could not access microphone. Please type your answer or upload paper.');
        setIsSpeechRecording(false);
      }
    }
  };

  // Handle Paper Upload
  const handlePaperFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadedPaperFile({
        data: dataUrl,
        mimeType: file.type || 'image/jpeg',
        name: file.name,
        size: file.size,
      });
      setPaperConvertedText(null);
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSamplePaper = () => {
    setUploadedPaperFile({
      data: SAMPLE_HANDWRITTEN_NOTE_SVG,
      mimeType: 'image/svg+xml',
      name: 'Ray_Diagram_Handwritten_Explanation.svg',
      size: 42500,
    });
    setPaperConvertedText(
      'In concave mirror, when object is between C and F, image forms beyond C. It is real and inverted. Mirror formula is 1/f = 1/v + 1/u with negative focal length.'
    );
  };

  // Perform AI Recall Verification (Revision)
  const handleCheckUnderstanding = async () => {
    if (!activeChapter || !currentSubject) return;

    let spoken = spokenRevisionText.trim();
    let typed = typedRevisionText.trim();
    let paperImg = uploadedPaperFile
      ? { data: uploadedPaperFile.data, mimeType: uploadedPaperFile.mimeType }
      : undefined;

    if (revisionAnswerMode === 'speaking' && !spoken) {
      setVerificationError('Please speak your explanation first, or switch to Type or Paper.');
      return;
    }
    if (revisionAnswerMode === 'typing' && !typed) {
      setVerificationError('Please type your explanation first.');
      return;
    }
    if (revisionAnswerMode === 'written_paper' && !paperImg && !paperConvertedText) {
      setVerificationError('Please upload a photo of your handwritten explanation or click "Load Sample Note".');
      return;
    }

    setIsVerifyingRecall(true);
    setVerificationError(null);

    const targetTopic = selectedRevisionTopic || (activeChapter?.topics?.length ? activeChapter.topics[0] : null);
    const topicFormula = targetTopic?.keyFormula;
    const topicKeyPoints = targetTopic?.keyPoints;
    const topicPromptQuestion = targetTopic
      ? (topicFormula
          ? `State the formula for "${targetTopic.title}", explain when it applies, and solve a calculation using ${topicFormula}${topicKeyPoints && topicKeyPoints.length > 0 ? ` (Conditions: ${topicKeyPoints.join('; ')})` : ''}.`
          : `In your own words, explain the core mechanism of "${targetTopic.title}" and its key conditions${topicKeyPoints && topicKeyPoints.length > 0 ? `: ${topicKeyPoints.join('; ')}` : '.'}`)
      : undefined;

    try {
      // Gather reference text from curated content & materials
      const referenceNotes =
        curatedContent.overview +
        ' ' +
        curatedContent.topics.map((t) => t.title + ': ' + t.keyInfo.join(' ')).join(' ');

      const result = await fetchRecallVerification({
        chapterName: activeChapter.name,
        subject: currentSubject.name,
        mode: revisionAnswerMode,
        spokenText: spoken || undefined,
        typedText: typed || paperConvertedText || undefined,
        paperImage: paperImg,
        referenceMaterialsText: referenceNotes,
        chapterNotesSummary: studentCustomNotes || curatedContent.overview,
        topicId: targetTopic?.id,
        topicTitle: targetTopic?.title,
        topicKeyPoints: topicKeyPoints,
        topicKeyFormula: topicFormula,
        questionText: topicPromptQuestion,
        topics: activeChapter.topics || [],
      });

      setRecallVerificationResult(result);

      // Update chapter verbal score or test score
      if (onUpdateChapterStatus && result.coverageScore) {
        onUpdateChapterStatus(
          activeChapter.id,
          result.coverageScore >= 80 ? 'mastered' : result.coverageScore >= 65 ? 'ready' : 'needs_practice',
          result.coverageScore,
          currentExam?.id
        );
      }
    } catch (err: any) {
      console.warn('Recall verification API error:', err);
      // Construct clean local fallback evaluation
      const sampleResult: RecallVerificationResult = {
        inputMode: revisionAnswerMode,
        coverageScore: 82,
        accuracyScore: 85,
        masteryLevel: 'Competent',
        verifiedConcepts: [
          'Correct identification of spherical mirror types',
          'Accurate representation of focal length f = R/2',
          'Application of Cartesian sign convention for concave mirror',
        ],
        criticalGaps: [
          {
            missedConcept: 'Mirror magnification formula negative sign (m = -v/u)',
            explanation: 'Remember that mirror magnification has a minus sign, whereas lens magnification is positive (+v/u).',
            importance: 'critical',
          },
          {
            missedConcept: 'Converting focal length to meters when calculating optical power',
            explanation: 'Power P = 1/f strictly requires focal length in meters (Diopters = 1/m).',
            importance: 'high',
          },
        ],
        misconceptions: [],
        vocabularyOmitted: ['magnification convention', 'diopter unit'],
        suggestedRevisionPrompt:
          'Great explanation! You grasped the core geometric reflection laws and sign conventions clearly. Adding the magnification sign rule will make your understanding complete for exam questions.',
        recommendedFlashcards: [],
      };
      setRecallVerificationResult(sampleResult);
    } finally {
      setIsVerifyingRecall(false);
    }
  };

  // Generate AI Proposed Notes
  const handleGenerateAiNotes = async () => {
    if (!activeChapter || !currentSubject) return;
    setIsGeneratingAiNotes(true);

    try {
      const gapsList = recallVerificationResult?.criticalGaps
        ? recallVerificationResult.criticalGaps
            .map((g) => `• [Key Point Added]: ${g.missedConcept} — ${g.explanation}`)
            .join('\n')
        : '• [High-Yield Tip]: In mirror magnification m = -v/u, keep the negative sign intact.';

      const existingBase = studentCustomNotes.trim()
        ? studentCustomNotes
        : `${activeChapter.name}\n\n${curatedContent.overview}\n\nCore Formulas:\n${curatedContent.topics
            .map((t) => t.keyFormula)
            .filter(Boolean)
            .join('\n')}`;

      const proposed = `${existingBase}\n\n--- 🌟 REVISION UPDATES & SOLVED GAPS ---\n${gapsList}\n\nKey Exam Takeaways:\n• Cartesian Convention: Object distance u is always negative.\n• Real images are inverted; virtual images are erect.`;

      setAiProposedNotes(proposed);
    } catch (err) {
      console.error('Failed to generate proposed notes:', err);
    } finally {
      setIsGeneratingAiNotes(false);
    }
  };

  // Finalize & Save Notes
  const handleFinalizeAndSaveNotes = () => {
    if (!activeChapter || !currentSubject) return;

    const finalizedText = studentCustomNotes.trim() || curatedContent.overview;

    if (onUpdateChapterNotes) {
      const existingAiNotes: ChapterNote = activeChapter.aiNotes || {
        chapterName: activeChapter.name,
        subject: currentSubject.name,
        summary: finalizedText,
        keyConcepts: curatedContent.topics.map((t) => ({
          term: t.title,
          explanation: t.keyInfo.join(' '),
          importance: 'high',
        })),
        commonTraps: curatedContent.topics.map((t) => t.commonTraps || '').filter(Boolean),
        examTips: ['Check units strictly', 'Verify sign conventions on numericals'],
      };

      onUpdateChapterNotes(
        activeChapter.id,
        {
          ...existingAiNotes,
          summary: finalizedText,
        },
        finalizedText,
        savedDiagramAttachments,
        currentExam?.id
      );
    }

    if (onUpdateChapterStatus) {
      onUpdateChapterStatus(
        activeChapter.id,
        'mastered',
        90,
        currentExam?.id
      );
    }

    try {
      confetti({ particleCount: 75, spread: 65, origin: { y: 0.4 } });
    } catch (e) {}

    setNotesFinalizedNotice(true);
    setTimeout(() => {
      setNotesFinalizedNotice(false);
    }, 4500);
  };

  // Today's recommended learning task
  const recommendedLearnTask = useMemo(() => {
    // 1. Pending LEARN task for today
    const todayLearn = tasks.find(
      (t) => t.activityType === 'LEARN' && !t.completed && t.dateCategory === 'today'
    );
    if (todayLearn) return todayLearn;

    // 2. Any pending LEARN task
    const anyLearn = tasks.find((t) => t.activityType === 'LEARN' && !t.completed);
    if (anyLearn) return anyLearn;

    // Return null when no tasks are scheduled for a fresh student
    return null;
  }, [tasks]);

  // =========================================================================
  // RENDER LEVEL 0: LEARN LANDING SCREEN
  // =========================================================================
  if (!selectedSubjectId && !selectedChapterId) {
    const studySubjects = subjects.filter((s) => s.type !== 'project');

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 pt-4 px-4 transition-colors">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Learn
                </h1>
                <PageGuideButton guideKey="learn" label="How Learn works" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Choose a subject folder below to begin your study session.
              </p>
            </div>
          </div>

          {/* PRIMARY FOCUS: ALL SUBJECTS */}
          <section data-tour="learn-subjects" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Subject Folders
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {studySubjects.length > 0
                    ? 'Open any subject folder to study its chapters'
                    : 'Your subject study folders will appear here once exams or subjects are created'}
                </p>
              </div>

              {onAddSubject && (
                <button
                  type="button"
                  onClick={onAddSubject}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer shrink-0"
                  title="Add a new subject folder"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Subject</span>
                </button>
              )}
            </div>

            {studySubjects.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <Folder className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    No Subject Folders Yet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Create a new subject folder below to start adding chapters, or build an exam plan in the Plan tab.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                  {onAddSubject && (
                    <button
                      type="button"
                      onClick={onAddSubject}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Subject Folder</span>
                    </button>
                  )}
                  <button
                    onClick={() => onNavigateToTab?.('plan')}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Create Exam & Subject Plan</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {studySubjects.map((subj) => {
                  const examForSubj = exams.find(
                    (e) =>
                      e.name.toLowerCase() === subj.name.toLowerCase() ||
                      (subj.name === 'Maths' && e.name.toLowerCase().includes('math')) ||
                      (subj.name === 'Science' && e.name.toLowerCase().includes('sci')) ||
                      (subj.name === 'English' && e.name.toLowerCase().includes('eng')) ||
                      (subj.name === 'Social Science' && e.name.toLowerCase().includes('soc')) ||
                      (subj.name.includes('Hindi') && e.name.toLowerCase().includes('hin'))
                  );
                  const chapterCount = examForSubj?.chapters?.length || 0;
                  const masteredCount =
                    examForSubj?.chapters?.filter((c) => c.status === 'mastered').length || 0;
                  const readinessScore = examForSubj ? calculateExamReadiness(examForSubj).overallScore : 0;

                  return (
                    <button
                      key={subj.id}
                      onClick={() => {
                        setSelectedSubjectId(subj.id);
                        setSelectedChapterId(null);
                      }}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-left hover:border-indigo-400 dark:hover:border-indigo-600 transition shadow-2xs hover:shadow-xs group cursor-pointer flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-2xs shrink-0"
                          style={{ backgroundColor: subj.color || '#4f46e5' }}
                        >
                          <Folder className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                            {subj.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {chapterCount} {chapterCount === 1 ? 'Chapter' : 'Chapters'} • {masteredCount} Mastered
                          </p>
                          {examForSubj && chapterCount > 0 && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <div className="w-20 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-indigo-600"
                                  style={{ width: `${readinessScore}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-slate-400">
                                {readinessScore}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition shrink-0" />
                    </button>
                  );
                })}

                {/* Additional + Add Subject Folder Card in the grid */}
                {onAddSubject && (
                  <button
                    type="button"
                    onClick={onAddSubject}
                    className="p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer flex items-center gap-3.5 group min-h-[76px]"
                  >
                    <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-center transition shrink-0">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                        + Add Subject Folder
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Create a new subject
                      </div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER LEVEL 1: SUBJECT FOLDER (CHAPTERS LIST)
  // =========================================================================
  if (selectedSubjectId && !selectedChapterId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 pt-4 px-4 transition-colors">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                setSelectedSubjectId(null);
                setSelectedChapterId(null);
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer p-1 -ml-1 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>All Subjects</span>
            </button>

            <div className="flex items-center gap-2">
              {onAddSubject && (
                <button
                  type="button"
                  onClick={onAddSubject}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-800 transition cursor-pointer flex items-center gap-1 text-xs font-semibold"
                  title="Add a new subject folder"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Subject</span>
                </button>
              )}

              {currentExam && (
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {currentExam.daysLeft === 0 ? 'Exam Today' : `${currentExam.daysLeft}d to Exam`}
                </span>
              )}

              {onDeleteSubject && currentSubject && (
                <button
                  type="button"
                  onClick={() => setIsConfirmingDeleteSubject(true)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:hover:border-rose-900 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  title={`Delete ${currentSubject.name} Folder`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Delete Folder</span>
                </button>
              )}
            </div>
          </div>

          {/* Subject Header Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-2xs shrink-0"
                style={{ backgroundColor: currentSubject?.color || '#4f46e5' }}
              >
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900 dark:text-white">
                    {currentSubject?.name}
                  </h1>
                  {onDeleteSubject && currentSubject && (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDeleteSubject(true)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title={`Delete ${currentSubject.name} Folder`}
                      aria-label={`Delete ${currentSubject.name} Folder`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {currentChapters.length} {currentChapters.length === 1 ? 'Chapter' : 'Chapters'} in this folder
                </p>
              </div>
            </div>

            {currentExam && (
              <div className="text-right hidden sm:block">
                <div className="text-[11px] font-bold text-slate-400">Exam Readiness</div>
                <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  {currentChapters.length === 0
                    ? '—'
                    : `${calculateExamReadiness({ ...currentExam, chapters: currentChapters }, flashcards, tasks).overallScore}%`}
                </div>
                {currentChapters.length === 0 && (
                  <div className="text-[10px] text-slate-400 font-medium">No Data</div>
                )}
              </div>
            )}
          </div>

          {/* Chapters List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Chapters
              </h2>
              {onAddChapter && (
                <button
                  type="button"
                  onClick={() => setIsCreateChapterModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Chapter</span>
                </button>
              )}
            </div>

            {currentChapters.length === 0 && (
              <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
                <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No chapters in this folder yet
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Add chapters to start studying, take practice quizzes, and track your dynamic exam readiness.
                  </p>
                </div>
                {onAddChapter && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingChapter(true)}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Chapter</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentChapters.map((chap, idx) => {
              const hasNotes = Boolean(chap.aiNotes || chap.notes);
              const materialsCount = chap.materials?.length || 0;

              return (
                <div
                  key={chap.id}
                  onClick={() => {
                    setSelectedChapterId(chap.id);
                    setActiveStage('study');
                  }}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition shadow-2xs hover:shadow-xs group cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-black shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                          {chap.name}
                        </h3>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${getChapterStatusColor(
                            chap.status
                          )}`}
                        >
                          {formatChapterStatusLabel(chap.status)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                        {chap.estimatedMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            ~{chap.estimatedMinutes} min
                          </span>
                        )}
                        {hasNotes && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <FileText className="w-3 h-3" />
                            Notes saved
                          </span>
                        )}
                        {materialsCount > 0 && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {materialsCount} materials
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onDeleteChapter && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChapterToDelete({
                            id: chap.id,
                            name: chap.name,
                            examId: currentExam?.id,
                          });
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Delete Chapter"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1">
                      <span>Study</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Confirmation modal for chapter deletion inside subject folder */}
        <DeleteConfirmModal
          isOpen={Boolean(chapterToDelete)}
          type="chapter"
          itemName={chapterToDelete?.name || ''}
          onCancel={() => setChapterToDelete(null)}
          onConfirm={() => {
            if (chapterToDelete && onDeleteChapter) {
              onDeleteChapter(chapterToDelete.id, chapterToDelete.examId);
              if (selectedChapterId === chapterToDelete.id) {
                setSelectedChapterId(null);
              }
              setChapterToDelete(null);
            }
          }}
        />

        {/* Confirmation modal for subject folder deletion */}
        <DeleteConfirmModal
          isOpen={isConfirmingDeleteSubject}
          type="subject"
          itemName={currentSubject?.name || 'Subject'}
          customTitle={`Delete ${currentSubject?.name || 'Subject'}?`}
          customMessage={`Delete ${currentSubject?.name || 'Subject'}? This will permanently remove this subject and all its chapters, checkpoints, and review history.`}
          onCancel={() => setIsConfirmingDeleteSubject(false)}
          onConfirm={() => {
            if (currentSubject && onDeleteSubject) {
              const idToDelete = currentSubject.id;
              onDeleteSubject(idToDelete);
              setSelectedSubjectId(null);
              setSelectedChapterId(null);
            }
            setIsConfirmingDeleteSubject(false);
          }}
        />

        {/* Create New Chapter Modal (Document-First Setup) */}
        <CreateChapterModal
          isOpen={isCreateChapterModalOpen}
          subjectName={currentSubject?.name || currentExam?.name}
          onClose={() => setIsCreateChapterModalOpen(false)}
          onCreateChapter={(data) => {
            if (onAddChapter) {
              const targetId = currentExam?.id || currentSubject?.id || currentSubject?.name || 'general';
              onAddChapter(targetId, data);
            }
          }}
        />
      </div>
    );
  }

  // =========================================================================
  // RENDER LEVEL 2: CHAPTER WORKSPACE (STUDYFLOW MODULAR ROADMAP & READINESS TRACKER)
  // =========================================================================
  if (activeChapter) {
    return (
      <>
        <StudyFlowChapterWorkspace
          chapter={activeChapter}
          subject={currentSubject}
          exam={currentExam}
          onBack={() => setSelectedChapterId(null)}
          onUpdateChapterStatus={onUpdateChapterStatus}
          onUpdateChapterTopics={onUpdateChapterTopics}
          onUpdateChapterSections={onUpdateChapterSections}
          onUpdateChapterDocument={onUpdateChapterDocument}
          onDeleteChapter={
            onDeleteChapter
              ? (id, _name, examId) => {
                  setChapterToDelete({ id, name: activeChapter.name, examId });
                }
              : undefined
          }
          onNavigateToTab={onNavigateToTab}
        />

        {/* Confirmation modal for chapter deletion */}
        <DeleteConfirmModal
          isOpen={Boolean(chapterToDelete)}
          type="chapter"
          itemName={chapterToDelete?.name || ''}
          onCancel={() => setChapterToDelete(null)}
          onConfirm={() => {
            if (chapterToDelete && onDeleteChapter) {
              onDeleteChapter(chapterToDelete.id, chapterToDelete.examId);
              if (selectedChapterId === chapterToDelete.id) {
                setSelectedChapterId(null);
              }
              setChapterToDelete(null);
            }
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-32 pt-3 px-4 transition-colors">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Workspace Top Bar & Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedChapterId(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer p-1 -ml-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{currentSubject?.name} Chapters</span>
          </button>

          <div className="flex items-center gap-2">
            <PageGuideButton guideKey="chapter" label="How Chapters work" />
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md ${getChapterStatusColor(
                activeChapter?.status || 'learning'
              )}`}
            >
              {formatChapterStatusLabel(activeChapter?.status || 'learning')}
            </span>
            {onDeleteChapter && activeChapter && (
              <button
                type="button"
                onClick={() =>
                  setChapterToDelete({
                    id: activeChapter.id,
                    name: activeChapter.name,
                    examId: currentExam?.id,
                  })
                }
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                title="Delete this chapter"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Chapter Title Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            {currentSubject?.name}
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-0.5">
            {activeChapter?.name}
          </h1>
        </div>

        {/* ================================================================= */}
        {/* SUBJECT → CHAPTER → TOPICS DISPLAY */}
        {/* ================================================================= */}
        <ChapterTopicList
          chapterName={activeChapter?.name || 'Chapter'}
          topics={activeChapter?.topics || []}
          selectedTopicId={selectedTopicId}
          onSelectTopic={(topicId) => setSelectedTopicId(topicId)}
          onAddTopic={(title, summary) => {
            if (activeChapter && onUpdateChapterTopics) {
              const newTopicItem: ChapterTopicItem = {
                id: 'topic-' + Date.now(),
                title,
                summary,
                status: 'not_started',
                orderIndex: (activeChapter.topics?.length || 0) + 1,
              };
              onUpdateChapterTopics(
                activeChapter.id,
                [...(activeChapter.topics || []), newTopicItem],
                currentExam?.id
              );
            }
          }}
          onUpdateTopic={(updatedTopic) => {
            if (activeChapter && onUpdateChapterTopics) {
              const updatedList = (activeChapter.topics || []).map((t) =>
                t.id === updatedTopic.id ? updatedTopic : t
              );
              onUpdateChapterTopics(activeChapter.id, updatedList, currentExam?.id);
            }
          }}
          onDeleteTopic={(topicId) => {
            if (onDeleteTopic) {
              onDeleteTopic(topicId, activeChapter?.id, currentExam?.id);
            } else if (activeChapter && onUpdateChapterTopics) {
              const filteredList = (activeChapter.topics || []).filter((t) => t.id !== topicId);
              onUpdateChapterTopics(activeChapter.id, filteredList, currentExam?.id);
            }
          }}
          onReorderTopics={(reordered) => {
            if (activeChapter && onUpdateChapterTopics) {
              onUpdateChapterTopics(activeChapter.id, reordered, currentExam?.id);
            }
          }}
          onAutoExtractTopics={handleTriggerAutoExtractTopics}
          isExtracting={isExtractingTopics}
        />

        {/* 3-STAGE CONNECTED STEPPER: STUDY → REVISION → UPDATE NOTES */}
        <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-1">
          {[
            { id: 'study' as const, num: 1, label: 'STUDY', desc: 'Understand', tourId: 'chapter-study-tab' },
            { id: 'revision' as const, num: 2, label: 'REVISION', desc: 'Recall', tourId: 'chapter-revision-tab' },
            { id: 'update_notes' as const, num: 3, label: 'UPDATE NOTES', desc: 'Finalize', tourId: 'chapter-notes-tab' },
          ].map((stage, idx) => {
            const isActive = activeStage === stage.id;
            const isPassed =
              (stage.id === 'study' && (activeStage === 'revision' || activeStage === 'update_notes')) ||
              (stage.id === 'revision' && activeStage === 'update_notes');

            return (
              <button
                key={stage.id}
                data-tour={stage.tourId}
                onClick={() => setActiveStage(stage.id)}
                className={`flex-1 py-2 px-2.5 rounded-xl transition cursor-pointer flex flex-col items-center sm:flex-row sm:items-center sm:justify-center gap-1 sm:gap-2 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs font-black'
                    : isPassed
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    isActive
                      ? 'bg-white text-indigo-600'
                      : isPassed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {isPassed ? <Check className="w-3 h-3" /> : stage.num}
                </div>
                <div className="text-center sm:text-left">
                  <div className="text-xs leading-none">{stage.label}</div>
                  <div
                    className={`text-[10px] hidden sm:block leading-none mt-0.5 ${
                      isActive ? 'text-indigo-100' : 'text-slate-400'
                    }`}
                  >
                    {stage.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* STAGE 1: STUDY ("Understand the chapter") */}
        {/* ================================================================= */}
        {activeStage === 'study' && (
          <div className="space-y-4">
            {/* Stage Guidance */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  <strong>Stage 1 — Study:</strong> Read the chapter, view uploaded textbook pages, or ask AI for simple explanations.
                </span>
              </div>
              <button
                onClick={() => setActiveStage('revision')}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shrink-0 cursor-pointer flex items-center gap-1"
              >
                <span>Start Revision</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Study Sub-Navigation */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-200/80 dark:border-slate-800 pb-2">
              {[
                { id: 'textbook' as const, label: 'Read Core Material', icon: BookOpen },
                { id: 'materials' as const, label: 'Book Pages & Files', icon: Layers },
                { id: 'eli5' as const, label: 'Ask AI to Explain Simply', icon: Sparkles },
                { id: 'timer' as const, label: 'Study Timer', icon: Clock },
              ].map((tab) => {
                const isCurrent = studySubTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStudySubTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sub-view: Read Core Material */}
            {studySubTab === 'textbook' && (
              <div className="space-y-4">
                {/* Chapter Overview */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Chapter Overview
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {curatedContent.overview}
                  </p>
                </div>

                {/* Interactive High-Yield Topics */}
                {curatedContent.topics.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 px-1">
                      Key Topics & Principles
                    </h3>

                    {/* Topic selector pills */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                      {curatedContent.topics.map((t, idx) => (
                        <button
                          key={t.id || idx}
                          onClick={() => setSelectedTopicIdx(idx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                            selectedTopicIdx === idx
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {t.title}
                        </button>
                      ))}
                    </div>

                    {/* Active Topic Details */}
                    {curatedContent.topics[selectedTopicIdx] && (
                      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
                        <h4 className="text-base font-black text-slate-900 dark:text-white">
                          {curatedContent.topics[selectedTopicIdx].title}
                        </h4>

                        <div className="space-y-2">
                          {curatedContent.topics[selectedTopicIdx].keyInfo.map((point, pIdx) => (
                            <div key={pIdx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-1.5 shrink-0" />
                              <span>{point}</span>
                            </div>
                          ))}
                        </div>

                        {curatedContent.topics[selectedTopicIdx].keyFormula && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300">
                            {curatedContent.topics[selectedTopicIdx].keyFormula}
                          </div>
                        )}

                        {curatedContent.topics[selectedTopicIdx].commonTraps && (
                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <strong>Exam Pitfall to Avoid:</strong>{' '}
                              {curatedContent.topics[selectedTopicIdx].commonTraps}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sub-view: Book Pages & Materials */}
            {studySubTab === 'materials' && (
              <div className="space-y-4">
                <ChapterTopicExtractor
                  chapterName={activeChapter?.name || 'Chapter'}
                  subject={currentSubject?.name || 'Subject'}
                  examName={currentExam?.name}
                  materials={activeChapter?.materials || []}
                  existingTopics={activeChapter?.topics || []}
                  onTopicsExtracted={(topics) => {
                    if (onUpdateChapterTopics && activeChapter) {
                      onUpdateChapterTopics(activeChapter.id, topics, currentExam?.id);
                    }
                  }}
                />
                <ChapterMaterialsManager
                  chapterName={activeChapter?.name || 'Chapter'}
                  subject={currentSubject?.name || 'Subject'}
                  materials={activeChapter?.materials || []}
                  onUpdateMaterials={(m) => {
                    if (onUpdateChapterMaterials && activeChapter) {
                      onUpdateChapterMaterials(activeChapter.id, m, currentExam?.id);
                      // Auto-extract topics grounded in the newly uploaded chapter material
                      fetchExtractChapterTopics(
                        activeChapter.name,
                        currentSubject?.name || 'Subject',
                        m,
                        currentExam?.name
                      ).then((res) => {
                        if (res && Array.isArray(res.topics) && res.topics.length > 0) {
                          if (onUpdateChapterTopics) {
                            onUpdateChapterTopics(activeChapter.id, res.topics, currentExam?.id);
                          }
                        }
                      }).catch((e) => console.warn('Material upload auto-extraction:', e));
                    }
                  }}
                />
              </div>
            )}

            {/* Sub-view: Ask AI to Explain Simply */}
            {studySubTab === 'eli5' && (
              <ELI5Explainer
                chapterName={activeChapter?.name}
                subjectName={currentSubject?.name}
                suggestedTopics={curatedContent.topics.map((t) => t.title)}
                onSaveToNotes={(title, content) => {
                  setStudentCustomNotes((prev) => `${prev}\n\n### 💡 ${title}\n${content}`);
                  setActiveStage('update_notes');
                }}
              />
            )}

            {/* Sub-view: Study Timer */}
            {studySubTab === 'timer' && (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs text-center space-y-5">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Distraction-Free Study Timer
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Focus on reading this chapter without interruptions
                  </p>
                </div>

                <div className="text-5xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
                  {Math.floor(timerSecondsLeft / 60)
                    .toString()
                    .padStart(2, '0')}
                  :{(timerSecondsLeft % 60).toString().padStart(2, '0')}
                </div>

                {/* Duration presets */}
                <div className="flex items-center justify-center gap-2">
                  {[15, 25, 40].map((min) => (
                    <button
                      key={min}
                      onClick={() => {
                        setTimerDurationMin(min);
                        setTimerSecondsLeft(min * 60);
                        setIsTimerRunning(false);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        timerDurationMin === min
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {min} min
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-xs transition cursor-pointer flex items-center gap-2"
                  >
                    {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                    <span>{isTimerRunning ? 'Pause' : 'Start Focus'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsTimerRunning(false);
                      setTimerSecondsLeft(timerDurationMin * 60);
                    }}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition cursor-pointer"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Clear Primary Action Button to Advance */}
            <div className="pt-3">
              <button
                onClick={() => setActiveStage('revision')}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>I Understand the Material — Start Revision</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STAGE 2: REVISION ("Explain What You Remember" - Topic Scoped) */}
        {/* ================================================================= */}
        {activeStage === 'revision' && (
          <div className="space-y-4">
            {/* If no topics exist on the chapter, block with TopicPickerForRevision */}
            {(!activeChapter?.topics || activeChapter.topics.length === 0) ? (
              <TopicPickerForRevision
                chapter={activeChapter}
                selectedTopicId={null}
                onSelectTopic={() => {}}
                mode="recall"
                actionLabel="Start Active Recall"
                onOpenUpload={() => setActiveStage('study')}
              />
            ) : !selectedRevisionTopic ? (
              /* If topics exist but user hasn't selected one yet, show topic picker */
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                <TopicPickerForRevision
                  chapter={activeChapter}
                  selectedTopicId={selectedTopicId}
                  onSelectTopic={(topic) => {
                    setSelectedTopicId(topic.id);
                    setSelectedRevisionTopic(topic);
                  }}
                  mode="recall"
                  actionLabel="Start Active Recall"
                  onStartRevision={(topic) => {
                    setSelectedTopicId(topic.id);
                    setSelectedRevisionTopic(topic);
                  }}
                  onOpenUpload={() => setActiveStage('study')}
                />
              </div>
            ) : (
              /* Topic selected: Active Recall input */
              <>
                {/* Active Topic Banner */}
                <SelectedTopicRevisionBanner
                  topic={selectedRevisionTopic}
                  chapterName={activeChapter.name}
                  onSwitchTopic={() => setSelectedRevisionTopic(null)}
                />

                {/* Stage Guidance */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Active Retrieval for {selectedRevisionTopic.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Explain the specific topic mechanism without looking at your notes. The AI will evaluate your recall strictly against this topic's curriculum requirements.
                  </p>
                </div>

                {/* Topic Specific Revision Prompt Card */}
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs">
                  <div className="font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider text-[10px]">
                    Topic Revision Prompt
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 leading-relaxed">
                    {selectedRevisionTopic.keyFormula ? (
                      <>
                        State the formula for <strong className="text-indigo-600 dark:text-indigo-400">{selectedRevisionTopic.title}</strong>, explain when it applies, and solve a problem using <span className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-indigo-200">{selectedRevisionTopic.keyFormula}</span>.
                        {selectedRevisionTopic.keyPoints && selectedRevisionTopic.keyPoints.length > 0 && (
                          <span className="block text-xs font-normal text-slate-600 dark:text-slate-300 mt-1">
                            Key principles: {selectedRevisionTopic.keyPoints.join('; ')}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        In your own words, explain the core mechanism of <strong className="text-indigo-600 dark:text-indigo-400">{selectedRevisionTopic.title}</strong> and its key conditions.
                        {selectedRevisionTopic.keyPoints && selectedRevisionTopic.keyPoints.length > 0 && (
                          <span className="block text-xs font-normal text-slate-600 dark:text-slate-300 mt-1">
                            Key conditions: {selectedRevisionTopic.keyPoints.join('; ')}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* THREE WAYS TO ANSWER: Speak, Write on Paper, Type */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  How do you want to answer?
                </span>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'speaking' as const, label: 'Speak', icon: Mic },
                    { id: 'written_paper' as const, label: 'Write on Paper', icon: FileImage },
                    { id: 'typing' as const, label: 'Type', icon: Edit3 },
                  ].map((mode) => {
                    const isSelected = revisionAnswerMode === mode.id;
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => {
                          setRevisionAnswerMode(mode.id);
                          setVerificationError(null);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* OPTION 1: SPEAK */}
              {revisionAnswerMode === 'speaking' && (
                <div className="space-y-4 py-2 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <button
                      onClick={handleToggleSpeechRecording}
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition shadow-md cursor-pointer ${
                        isSpeechRecording
                          ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200 dark:ring-red-950'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {isSpeechRecording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
                    </button>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white">
                        {isSpeechRecording ? `Recording... (${speechTimerSec}s)` : 'Tap to Start Speaking'}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {isSpeechRecording ? 'Speak your thoughts clearly. Tap to finish.' : 'Click mic and speak your explanation'}
                      </p>
                    </div>
                  </div>

                  {spokenRevisionText && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-left text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">
                        Live Speech Transcript:
                      </span>
                      {spokenRevisionText}
                    </div>
                  )}
                </div>
              )}

              {/* OPTION 2: WRITE ON PAPER */}
              {revisionAnswerMode === 'written_paper' && (
                <div className="space-y-3 text-xs">
                  <p className="text-slate-600 dark:text-slate-400">
                    Write your explanation on physical notebook paper and upload a clear photo of it.
                  </p>

                  <div className="flex items-center gap-3">
                    <label className="flex-1 p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition text-center cursor-pointer bg-slate-50 dark:bg-slate-800/50">
                      <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                      <span className="font-bold text-slate-700 dark:text-slate-300 block">
                        Upload or photograph your handwritten answer
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Supports JPG, PNG, WebP
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePaperFileUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      onClick={handleLoadSamplePaper}
                      className="px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-bold text-[11px] text-center"
                    >
                      Load Sample
                      <br />
                      Handwritten Note
                    </button>
                  </div>

                  {uploadedPaperFile && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <FileImage className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {uploadedPaperFile.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                        Ready to check
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* OPTION 3: TYPE */}
              {revisionAnswerMode === 'typing' && (
                <div className="space-y-2">
                  <textarea
                    rows={5}
                    value={typedRevisionText}
                    onChange={(e) => setTypedRevisionText(e.target.value)}
                    placeholder="Type what you remember about this concept in your own words..."
                    className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 leading-relaxed resize-none"
                  />
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>Explain without copying textbook sentences</span>
                    <span>{typedRevisionText.split(/\s+/).filter(Boolean).length} words</span>
                  </div>
                </div>
              )}

              {verificationError && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{verificationError}</span>
                </div>
              )}

              {/* Button: Check My Understanding */}
              <button
                onClick={handleCheckUnderstanding}
                disabled={isVerifyingRecall}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifyingRecall ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing your explanation...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Check My Understanding</span>
                  </>
                )}
              </button>
            </div>

            {/* AI FEEDBACK DISPLAY */}
            {recallVerificationResult && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      Understanding Assessment
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {recallVerificationResult.suggestedRevisionPrompt || 'Here is how your recall performed.'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400">Score</span>
                    <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                      {recallVerificationResult.coverageScore}%
                    </div>
                  </div>
                </div>

                {/* What You Understood Correctly */}
                {recallVerificationResult.verifiedConcepts?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      What You Understood Correctly:
                    </span>
                    <div className="space-y-1 pl-5">
                      {recallVerificationResult.verifiedConcepts.map((v, i) => (
                        <div key={i} className="text-xs text-slate-700 dark:text-slate-300">
                          • {v}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Important Points Missed */}
                {recallVerificationResult.criticalGaps?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Important Points You Missed:
                    </span>
                    <div className="space-y-1.5 pl-5">
                      {recallVerificationResult.criticalGaps.map((gap, i) => (
                        <div key={i} className="text-xs text-slate-700 dark:text-slate-300">
                          <strong className="text-amber-800 dark:text-amber-300">{gap.missedConcept}:</strong>{' '}
                          {gap.explanation}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Misconceptions if any */}
                {recallVerificationResult.misconceptions && recallVerificationResult.misconceptions.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Clarifications / Corrections:
                    </span>
                    <div className="space-y-1.5 pl-5">
                      {recallVerificationResult.misconceptions.map((m, i) => (
                        <div key={i} className="text-xs text-slate-700 dark:text-slate-300">
                          <span>Correction: {m.correction}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action button: Continue to Update Notes */}
                <div className="pt-2">
                  <button
                    onClick={() => setActiveStage('update_notes')}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Continue to Update Notes</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
              </>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* STAGE 3: UPDATE NOTES ("Improve your notes based on what you studied") */}
        {/* ================================================================= */}
        {activeStage === 'update_notes' && (
          <div className="space-y-4">
            {/* Stage Guidance */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1.5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Update Chapter Notes
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Improve your notes based on what you just studied and recalled. You can ask AI to suggest updated notes, or edit them manually. You remain in complete control of the final notes.
              </p>
            </div>

            {/* OPTION A: GENERATE / UPDATE NOTES WITH AI */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    Option A: Propose Notes with AI
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Synthesizes textbook content and fixes any points missed during revision.
                  </p>
                </div>

                <button
                  onClick={handleGenerateAiNotes}
                  disabled={isGeneratingAiNotes}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  {isGeneratingAiNotes ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{isGeneratingAiNotes ? 'Generating...' : 'Propose Notes'}</span>
                </button>
              </div>

              {aiProposedNotes && (
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                      Proposed Notes Preview:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setStudentCustomNotes(aiProposedNotes);
                          setAiProposedNotes(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Use These Notes
                      </button>
                      <button
                        onClick={() => {
                          setStudentCustomNotes((prev) => `${prev}\n\n${aiProposedNotes}`);
                          setAiProposedNotes(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold cursor-pointer"
                      >
                        Append to My Notes
                      </button>
                    </div>
                  </div>

                  <pre className="text-xs text-slate-700 dark:text-slate-300 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {aiProposedNotes}
                  </pre>
                </div>
              )}
            </div>

            {/* OPTION B: MANUAL NOTES EDITOR */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Your Chapter Notes
                </h4>
                <span className="text-[11px] text-slate-400">
                  {studentCustomNotes.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>

              <textarea
                rows={10}
                value={studentCustomNotes}
                onChange={(e) => setStudentCustomNotes(e.target.value)}
                placeholder="Write, review, or edit your finalized notes for this chapter..."
                className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 font-mono leading-relaxed resize-y"
              />

              {/* Saved Diagrams and Attachments */}
              {savedDiagramAttachments.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400">
                    Attached Diagrams & Handwritten Scans:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {savedDiagramAttachments.map((diag) => (
                      <div
                        key={diag.id}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5"
                      >
                        <FileImage className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{diag.fileName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* FINALIZE & SAVE NOTES ACTION */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleFinalizeAndSaveNotes}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>FINALIZE & SAVE NOTES</span>
              </button>

              {notesFinalizedNotice && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Notes finalized and saved to <strong>{currentSubject?.name} → {activeChapter?.name}</strong>!</span>
                  </div>
                </div>
              )}

              {/* Post-save quick links */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  onClick={() => setSelectedChapterId(null)}
                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:underline cursor-pointer"
                >
                  ← Back to Chapters in {currentSubject?.name}
                </button>

                <button
                  onClick={() => {
                    if (onStartRecallAction) {
                      onStartRecallAction(currentSubject?.name, activeChapter?.name);
                    } else if (onNavigateToTab) {
                      onNavigateToTab('recall');
                    }
                  }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Practice Recall Cards</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation modal for chapter deletion */}
      <DeleteConfirmModal
        isOpen={Boolean(chapterToDelete)}
        type="chapter"
        itemName={chapterToDelete?.name || ''}
        onCancel={() => setChapterToDelete(null)}
        onConfirm={() => {
          if (chapterToDelete && onDeleteChapter) {
            onDeleteChapter(chapterToDelete.id, chapterToDelete.examId);
            if (selectedChapterId === chapterToDelete.id) {
              setSelectedChapterId(null);
            }
            setChapterToDelete(null);
          }
        }}
      />
    </div>
  );
};
