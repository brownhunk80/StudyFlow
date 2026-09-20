export type TabType = 'home' | 'focus' | 'recall' | 'plan' | 'progress' | 'profile';

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

export interface Chapter {
  id: string;
  name: string;
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
}

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
