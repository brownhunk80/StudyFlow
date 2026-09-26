export type TabType = 'home' | 'focus' | 'recall' | 'plan' | 'progress' | 'profile' | 'debug_test_suite';

export type PlanSubTab = 'today' | 'upcoming' | 'exams';

export type ChapterStatus =
  | 'not_started'
  | 'learning'
  | 'needs_practice'
  | 'ready'
  | 'mastered'
  | 'need_work'; // backwards-compatible alias for needs_practice

export type ActivityType =
  | 'LEARN'
  | 'RECALL'
  | 'PRACTICE'
  | 'FLASHCARDS'
  | 'TEST'
  | 'REVIEW';

export interface KnowledgeGapItem {
  id: string;
  concept: string;
  status: 'strong' | 'almost' | 'needs_work';
  whyItNeedsWork?: string;
  importance?: 'critical' | 'high' | 'medium';
  lastTested?: string;
  topicId?: string;
}

export type RecallRating = 'again' | 'hard' | 'good' | 'easy';

export interface Flashcard {
  id: string;
  deckId: string;
  front: string; // Question / Concept prompt
  back: string; // Answer / Explanation
  notes?: string;
  clozeHint?: string;
  subject: string;
  chapter?: string;
  // SM-2 Spaced Repetition Metadata
  interval: number; // in days
  repetitions: number;
  easeFactor: number; // default 2.5
  dueDate: string; // ISO date string
  lastReviewed?: string;
  box: number; // Leitner box 1-5
  status: 'new' | 'learning' | 'review' | 'mastered';
}

export interface FlashcardDeck {
  id: string;
  title: string;
  subject: string;
  color: string;
  description: string;
  totalCards: number;
  dueCardsCount: number;
  masteredCount: number;
  lastStudied?: string;
  chapterId?: string;
  sectionId?: string;
}

export interface ChapterMaterial {
  id: string;
  type: 'textbook' | 'notes' | 'pdf' | 'diagram' | 'pasted_text';
  title: string;
  content?: string; // Text excerpts, notes, or OCR text
  fileName?: string;
  fileData?: string; // Base64 data (for image / diagram / pdf previews)
  mimeType?: string;
  size?: number; // bytes
  uploadedAt: string;
}

export interface NoteSpacedReview {
  interval: number; // in days (e.g. 1, 3, 7, 14, 30)
  repetitions: number;
  easeFactor: number;
  box: number; // Leitner box 1-5
  dueDate: string; // ISO date string
  lastReviewed?: string;
  lastRating?: RecallRating;
  status: 'new' | 'learning' | 'review' | 'mastered';
}

export interface ChapterNote {
  chapterId?: string;
  chapterName: string;
  subject?: string;
  summary: string;
  keyConcepts: Array<{
    term: string;
    explanation: string;
    importance: 'critical' | 'high' | 'medium';
  }>;
  formulasOrLaws?: Array<{
    name: string;
    formula: string;
    notes: string;
  }>;
  diagramAnalyses?: Array<{
    diagramTitle: string;
    observations: string;
    keyTakeaway: string;
  }>;
  commonTraps: string[];
  examTips: string[];
  mnemonics?: string[];
  generatedAt?: string;
  sourceMaterialIds?: string[];
}

export interface TestQuestion {
  id: string;
  type: 'mcq' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  conceptTested: string;
  topicId: string;
  topicTitle?: string;
  skill?: string;
  questionType: 'recall' | 'numerical' | 'application' | 'reasoning' | 'diagram';
  sourcePattern?: string;
}

export type PracticeMode = 'quick_recall' | 'practice' | 'challenge' | 'exam_practice';

export type PracticeQuestionType =
  | 'problem_solving'
  | 'direct_practice'
  | 'worked_example_variation'
  | 'word_problem'
  | 'application'
  | 'error_analysis'
  | 'diagram_based'
  | 'experiment_activity'
  | 'data_graph'
  | 'concept_recall';

export interface PracticeQuestion {
  id: string;
  type: PracticeQuestionType;
  question: string;
  context?: string;
  diagramSvg?: string;
  tableData?: Array<Record<string, string | number>>;
  options?: string[];
  correctAnswer: string;
  stepByStepSolution: string[];
  conceptTested: string;
  learningObjective?: string;
  commonMistake: string;
  difficulty: 'textbook_fundamentals' | 'standard_practice' | 'exam_level' | 'challenge';
  sourceLabel: string;
  subject: string;
  practiceMode: PracticeMode;
  hint?: string;
}

export interface PracticeAnswerEvaluation {
  isCorrect: boolean;
  score: number; // 0 - 100
  feedback: string;
  stepByStepSolution: string[];
  identifiedMistake?: string | null;
  conceptTested: string;
  recommendation: string;
  canTrySimilar: boolean;
}

export interface QuestionPatternMap {
  chapterName: string;
  subject: string;
  corePatterns: Array<{
    id: string;
    name: string;
    description: string;
    expectedAction: 'solve' | 'calculate' | 'derive' | 'explain' | 'diagram' | 'experiment' | 'interpret';
  }>;
  textbookActivityTypes: string[];
}

export interface ChapterTest {
  id: string;
  chapterId: string;
  chapterName: string;
  subject: string;
  questions: TestQuestion[];
}

export interface ChapterTestReview {
  score: number;
  totalQuestions: number;
  percentage: number;
  overallDiagnosis: string;
  strengths: string[];
  conceptsToRevise: Array<{
    concept: string;
    whyItNeedsWork: string;
    recommendedAction: string;
    suggestedIntervalDays: number;
  }>;
  detailedAnswers: Array<{
    questionId: string;
    question: string;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    feedback: string;
  }>;
}

export interface SpacedRevisionSlot {
  id: string;
  chapterId: string;
  chapterName: string;
  intervalStage: '1-day' | '3-day' | '7-day' | '14-day' | '30-day';
  scheduledDate: string;
  revisionType: 'Active Recall' | 'Diagnostic Quiz' | 'Weakness Deep-Dive' | 'Exam Simulation';
  estimatedMinutes: number;
  keyFocusAreas: string[];
  completed?: boolean;
}

export interface SpacedRevisionPlan {
  examId?: string;
  examName: string;
  generatedAt: string;
  rationale: string;
  slots: SpacedRevisionSlot[];
}

export interface SpeechRecallGapAnalysis {
  topic: string;
  subject: string;
  spokenText?: string;
  coverageScore: number;
  accuracyScore: number;
  masteryLevel: 'Novice' | 'Developing' | 'Competent' | 'Mastered';
  keyConceptsCovered: string[];
  criticalGaps: Array<{
    missedConcept: string;
    importance: 'critical' | 'high' | 'medium';
    explanation: string;
  }>;
  misconceptions: Array<{
    stated: string;
    correction: string;
  }>;
  vocabularyOmitted: string[];
  suggestedRevisionPrompt: string;
  recommendedFlashcards: Array<{
    front: string;
    back: string;
  }>;
}

export type TopicStatus = 'not_started' | 'learning' | 'studied' | 'revised' | 'recall_due';

export interface ChapterTopicItem {
  id: string;
  title: string;
  summary?: string;
  sourceReference?: string; // e.g. "Section 10.1", "Pages 160-165", or "Whole Document"
  sourceMaterialIds?: string[];
  keyPoints?: string[];
  keyFormula?: string;
  status?: TopicStatus;
  confidence?: number;
  notes?: string;
  aiNotes?: ChapterNote;
  lastStudied?: string;
  lastRevised?: string;
  nextRecallDate?: string;
  orderIndex?: number;
  estimatedMinutes?: number;
}

export interface Chapter {
  id: string;
  name: string;
  documentText?: string;
  subjectId?: string;
  subject?: string;
  examId?: string;
  estimatedMinutes?: number;
  status: ChapterStatus;
  masteryPercentage?: number; // 0 - 100
  confidence?: number; // 1 - 5
  knowledgeGaps?: KnowledgeGapItem[];
  flashcardCount?: number;
  dueFlashcardCount?: number;
  practiceScore?: number;
  testScore?: number;
  lastStudied?: string;
  nextReview?: string;
  notes?: string;
  aiNotes?: ChapterNote;
  materials?: ChapterMaterial[]; // textbooks, notes, pdfs, diagrams
  noteSpacedReview?: NoteSpacedReview; // Spaced repetition for chapter notes
  lastTestScore?: number;
  lastTestDate?: string;
  lastTestedAt?: string;
  verbalRecallScore?: number;
  lastVerifiedDate?: string;
  lastVerifiedScore?: number;
  handwrittenNotes?: HandwrittenNoteAttachment[];
  topics?: ChapterTopicItem[]; // The granular topic level inside every chapter
  sections?: Section[];
  milestones?: Section[]; // Dynamic curriculum learning milestones bound strictly by chapter ID

  // Document Upload & Attachment Fields
  documentUrl?: string;
  documentName?: string;
  rawText?: string;
  pageCount?: number;
  sourceType?: 'pdf' | 'docx' | 'txt' | 'epub' | 'pasted_text';
}

export interface ChapterCreationData {
  name: string;
  documentName?: string;
  documentUrl?: string;
  rawText?: string;
  pageCount?: number;
  sourceType?: 'pdf' | 'docx' | 'txt' | 'epub' | 'pasted_text';
  milestones?: Section[];
}

export interface DocumentMilestoneItem {
  milestoneNumber: number;
  title: string;
  sourcePageRange: string;
  sourceHeading: string;
  summary: {
    compact: string;
    detailed: string;
  };
  coreTopics: string[];
  checkLearning: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    misdirectionBreakdown?: string;
    correctAnswer?: string;
  }>;
  recallDeck: Array<{
    front: string;
    back: string;
    sourceExcerpt?: string;
    explanation?: string;
  }>;
  // Compatibility aliases
  milestoneTitle?: string;
  recallCards?: Array<{
    front: string;
    back: string;
    explanation?: string;
  }>;
  checkLearningQuestions?: Array<{
    question: string;
    options: string[];
    correctAnswer?: string;
    correctIndex: number;
    explanation: string;
    misdirectionBreakdown?: string;
  }>;
}

export interface DocumentCurriculumExtraction {
  chapterTitle: string;
  totalSectionsDetected: number;
  milestones: DocumentMilestoneItem[];
  source?: 'gemini' | 'structured_fallback';
  generatedAt?: string;
  documentName?: string;
}

export interface ExtractedMilestone {
  milestoneTitle: string;
  coreTopics: string[];
  summary: {
    compact: string;
    detailed: string;
  };
  recallCards: Array<{
    front: string;
    back: string;
    explanation?: string;
  }>;
  checkLearningQuestions: Array<{
    question: string;
    options: string[];
    correctAnswer: string;
    correctIndex: number;
    explanation: string;
    misdirectionBreakdown?: string;
  }>;
}

export interface HandwrittenDiagramInfo {
  title: string;
  description: string;
  labelsFound?: string[];
  keyTakeaway?: string;
}

export interface HandwrittenConversionResult {
  convertedText: string;
  hasDiagrams: boolean;
  diagrams: HandwrittenDiagramInfo[];
  summary?: string;
  keyFormulas?: string[];
}

export interface HandwrittenNoteAttachment {
  id: string;
  fileName: string;
  fileData: string; // base64 data url
  mimeType: string;
  convertedText?: string;
  hasDiagrams?: boolean;
  diagrams?: HandwrittenDiagramInfo[];
  uploadedAt: string;
}

export type VerificationInputMode = 'speaking' | 'written_paper' | 'typing';

export interface RecallVerificationResult {
  topicId?: string;
  inputMode: VerificationInputMode;
  extractedOrTranscribedText?: string;
  coverageScore: number; // 0 - 100
  accuracyScore: number; // 0 - 100
  masteryLevel: 'Novice' | 'Developing' | 'Competent' | 'Mastered';
  verifiedConcepts: string[];
  criticalGaps: Array<{
    missedConcept: string;
    importance: 'critical' | 'high' | 'medium';
    explanation: string;
  }>;
  misconceptions: Array<{
    stated: string;
    correction: string;
  }>;
  writtenPaperFeedback?: {
    diagramEvaluation?: string;
    stepOmissions?: string[];
    notationFeedback?: string;
  };
  vocabularyOmitted: string[];
  suggestedRevisionPrompt: string;
  recommendedFlashcards: Array<{
    front: string;
    back: string;
  }>;
}

export interface FeynmanRecordResult {
  mode: 'notes' | 'flashcards';
  spokenTranscription: string;
  simplifiedExplanation: string;
  coreTakeaways: string[];
  generatedNotes?: ChapterNote;
  generatedFlashcards?: Array<{
    front: string;
    back: string;
  }>;
}

export interface Exam {
  id: string;
  name: string;
  examDate: string; // e.g. '2026-08-22'
  daysLeft: number;
  chapters: Chapter[];
  color?: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  color: string;
  type: 'study' | 'project';
  chapters?: Chapter[];
}

export type Subject = SubjectItem;

export interface TaskItem {
  id: string;
  title: string;
  subject: string;
  chapter?: string;
  chapterId?: string;
  description?: string;
  activityType?: ActivityType;
  durationMin: number;
  priority: 'High Priority' | 'Medium' | 'Normal';
  type: 'Revise' | 'Practice' | 'Exam Prep' | 'Homework' | 'Learn' | 'Recall' | 'Test';
  dateCategory: 'today' | 'upcoming';
  scheduledDate?: string; // 'SEP 8' or formatted
  completed: boolean;
  whyRationale?: string;
  examCountdown?: string;
  examId?: string;
  dueDate?: string;
  confidence?: number; // 1 - 5
  mastery?: number;
  knowledgeGaps?: KnowledgeGapItem[];
  lastStudied?: string;
  nextReview?: string;
  completedAt?: string;
  focusSessions?: number;
  recallScore?: number;
  testScore?: number;
}

export interface ExamReadinessBreakdown {
  examId: string;
  examName: string;
  overallScore: number;
  daysLeft: number;
  examDate: string;
  chaptersReady: number;
  totalChapters: number;
  strongAreas: string[];
  needsWorkAreas: string[];
  reviewDueCards: number;
  recommendedNextStep: {
    title: string;
    taskTitle: string;
    chapterName: string;
    durationMin: number;
    activityType: ActivityType;
    reason: string;
  };
  metrics: {
    chapterMastery: number; // 35%
    practiceTest: number; // 25%
    recallPerformance: number; // 20%
    confidence: number; // 10%
    spacedRepetition: number; // 10%
  };
}

export type FocusAccomplishment = 'learned' | 'practiced' | 'reviewed' | 'tested';

export interface FocusCompletionResult {
  session: FocusSession;
  accomplishments: FocusAccomplishment[];
  confidence: number; // 1 - 5
  recommendedNextAction: {
    type: ActivityType;
    label: string;
    explanation: string;
    taskTitle?: string;
    chapterName?: string;
    subject?: string;
  };
}

export interface FocusSession {
  id: string;
  title: string;
  subject?: string;
  durationMin: number;
  completedAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  icon: string;
  earned: boolean;
  progressText?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  grade: string;
  scholarLevel: string;
  xp: number;
  nextLevelXp: number;
  streakDays: number;
  percentile: number;
  avatarLetter: string;
}

export interface ELI5Response {
  topic: string;
  headline: string;
  story: string;
  simpleSteps: Array<{
    step: number;
    title: string;
    explanation: string;
    emoji: string;
  }>;
  realLifeExample: string;
  funSecret: string;
  quickQuiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    cheer: string;
  };
}

export interface OnboardingState {
  mainCompleted: boolean;
  homeGuideCompleted: boolean;
  learnGuideCompleted: boolean;
  chapterGuideCompleted: boolean;
  recallGuideCompleted: boolean;
  planGuideCompleted: boolean;
  progressGuideCompleted: boolean;
}

export type GuideKey = 'main' | 'home' | 'learn' | 'chapter' | 'recall' | 'plan' | 'progress';

export interface TourStep {
  targetSelector: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

// ============================================================================
// MODULAR "LEARN DOCUMENT" ARCHITECTURE (StudyFlow)
// ============================================================================

export type SummaryMode = 'compact' | 'detailed';

export type FlashcardStatus = 'active' | 'disabled';

export type QuizMode = 'study' | 'test';

export type QuestionDifficulty = 'Recall' | 'Application';

/**
 * Section within a Learn Document.
 * Supports granular progress tracking, topic mapping, and skip states.
 */
export interface Section {
  id: string;
  documentId: string;
  title: string;
  sectionNumber: number;
  completionRate: number; // 0 - 100
  keyTopics: string[]; // array of strings
  isSkipped: boolean;
  orderIndex?: number;
  estimatedMinutes?: number;
  sourceReference?: string;
  legacyTopicId?: string; // Tracks migration from ChapterTopicItem.id
  summary?: string;
  summaries?: Summary[];
  sectionTextExcerpt?: string;
  checkLearningQuestions?: any[];
  recallDeck?: Array<{
    front: string;
    back: string;
    sourceExcerpt?: string;
    explanation?: string;
  }>;
  knowledgeQuestions?: KnowledgeQuestion[];
  flashcards?: DocumentFlashcard[];
  quizzes?: Quiz[];
  summaryRead?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Top-level Learn Document (previously Chapter).
 */
export interface LearnDocument {
  id: string;
  title: string;
  subjectId?: string;
  subjectName?: string;
  examId?: string;
  sourceMaterial?: string;
  status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'REVISING' | 'MASTERED';
  overallProgress: number; // 0 - 100
  legacyChapterId?: string; // Tracks migration from Chapter.id
  sections: Section[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Dual-Tier Summaries:
 * - 'compact': bulleted, high-yield takeaways & formulas
 * - 'detailed': deep dive explanations, conceptual nuance, and worked examples
 */
export interface Summary {
  id: string;
  sectionId: string;
  mode: SummaryMode; // 'compact' | 'detailed'
  contentMarkdown: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Active Recall / Knowledge Check Questions per Section.
 */
export interface KnowledgeQuestion {
  id: string;
  sectionId: string;
  question: string;
  sampleAnswer: string;
  userResponse?: string;
  isCorrect?: boolean | null;
  feedback?: string;
  evaluatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  subtopicTag?: string;
  benchmarkAnswer?: string;
  keyScoringPoints?: string[];
  trapAnalysis?: string;
  sourceCitation?: string;
}

/**
 * Section-level Spaced-Repetition Flashcard using SuperMemo SM-2 parameters.
 */
export interface DocumentFlashcard {
  id: string;
  sectionId: string;
  frontPrompt: string;
  backAnswer: string;
  sourceContext?: string;
  // SM-2 parameters
  interval: number; // in days
  repetition: number; // successful repetitions counter
  easinessFactor: number; // default 2.5, minimum 1.3
  status: FlashcardStatus; // 'active' | 'disabled'
  dueDate?: string; // ISO string
  lastReviewed?: string; // ISO string
  legacyCardId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Comprehensive Quiz session per Section.
 * - 'study': instant feedback, remediation, no strict timer
 * - 'test': exam simulation conditions, timed, cumulative scoring
 */
export interface Quiz {
  id: string;
  sectionId: string;
  mode: QuizMode; // 'study' | 'test'
  score?: number | null; // 0 - 100
  timeTakenSeconds?: number | null;
  completedAt?: string;
  questions: QuizQuestion[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Individual Quiz Question with multi-part rationale and difficulty tiering.
 */
export interface QuizQuestion {
  id: string;
  quizId: string;
  questionText: string;
  choices: string[]; // JSON string array of choices
  correctIndex: number;
  explanation: string; // why the right answer is correct & why wrong choices are incorrect
  topicTag: string;
  difficulty: QuestionDifficulty; // 'Recall' | 'Application'
  orderIndex?: number;
  userResponses?: UserResponse[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * User's submission for a Quiz Question.
 */
export interface UserResponse {
  id: string;
  quizQuestionId: string;
  selectedIndex: number; // 0-based option index
  isCorrect: boolean;
  timeSpentSec?: number;
  createdAt?: string;
}
