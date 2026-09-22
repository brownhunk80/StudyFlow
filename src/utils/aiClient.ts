import {
  ChapterMaterial,
  ChapterNote,
  ChapterTest,
  ChapterTestReview,
  ChapterTopicItem,
  FeynmanRecordResult,
  HandwrittenConversionResult,
  PracticeAnswerEvaluation,
  PracticeMode,
  PracticeQuestion,
  RecallVerificationResult,
  SpacedRevisionPlan,
  SpeechRecallGapAnalysis,
  TestQuestion,
  VerificationInputMode,
} from '../types';

export async function fetchChapterNotes(chapterName: string, subject: string, examName?: string): Promise<ChapterNote> {
  const res = await fetch('/api/ai/chapter-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chapterName, subject, examName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate chapter notes' }));
    throw new Error(err.error || 'Failed to generate notes');
  }
  return res.json();
}

export async function fetchChapterNotesFromContent(
  chapterName: string,
  subject: string,
  materials?: ChapterMaterial[],
  examName?: string
): Promise<ChapterNote> {
  const res = await fetch('/api/ai/chapter-notes-from-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chapterName, subject, examName, materials }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate chapter notes from content' }));
    throw new Error(err.error || 'Failed to generate notes from content');
  }
  return res.json();
}

export async function fetchAIFlashcards(
  chapterName: string,
  subject: string,
  count = 5,
  customTopic?: string
): Promise<{ cards: Array<{ front: string; back: string; clozeHint?: string; chapter?: string }> }> {
  const res = await fetch('/api/ai/generate-flashcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chapterName, subject, count, customTopic }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate flashcards' }));
    throw new Error(err.error || 'Failed to generate flashcards');
  }
  return res.json();
}

export async function fetchAIFlashcardsFromContent(
  chapterName: string,
  subject: string,
  materials?: ChapterMaterial[],
  count = 6
): Promise<{ cards: Array<{ front: string; back: string; clozeHint?: string; chapter?: string }> }> {
  const res = await fetch('/api/ai/flashcards-from-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chapterName, subject, count, materials }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate flashcards from content' }));
    throw new Error(err.error || 'Failed to generate flashcards from content');
  }
  return res.json();
}

export async function fetchFeynmanRecord(
  topic: string,
  subject: string,
  spokenText: string,
  mode: 'notes' | 'flashcards',
  chapterContext?: string
): Promise<FeynmanRecordResult> {
  const res = await fetch('/api/ai/feynman-record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, subject, spokenText, mode, chapterContext }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to process Feynman recording' }));
    throw new Error(err.error || 'Failed to process Feynman recording');
  }
  return res.json();
}

export async function fetchRecallVerification(params: {
  chapterName: string;
  subject: string;
  mode: VerificationInputMode;
  spokenText?: string;
  typedText?: string;
  paperImage?: { data: string; mimeType: string };
  referenceMaterialsText?: string;
  chapterNotesSummary?: string;
  topicId?: string;
  topicTitle?: string;
  topicKeyPoints?: string[];
  topicKeyFormula?: string;
  questionText?: string;
  topics?: ChapterTopicItem[];
}): Promise<RecallVerificationResult> {
  const res = await fetch('/api/ai/verify-recall', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to verify recall' }));
    throw new Error(err.error || 'Failed to verify recall');
  }
  return res.json();
}

export async function fetchChapterTest(
  chapterName: string,
  subject: string,
  questionCount = 4,
  options?: {
    topicId?: string;
    topicTitle?: string;
    topicKeyPoints?: string[];
    topicKeyFormula?: string;
    topics?: ChapterTopicItem[];
    materials?: ChapterMaterial[];
    followUpFor?: {
      questionId?: string;
      originalQuestion?: string;
      concept?: string;
      skill?: string;
      studentAnswer?: string;
      topicId?: string;
      topicTitle?: string;
    };
  }
): Promise<ChapterTest> {
  const res = await fetch('/api/ai/chapter-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chapterName,
      subject,
      questionCount,
      topicId: options?.topicId,
      topicTitle: options?.topicTitle,
      topicKeyPoints: options?.topicKeyPoints,
      topicKeyFormula: options?.topicKeyFormula,
      topics: options?.topics,
      materials: options?.materials,
      followUpFor: options?.followUpFor,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate diagnostic test' }));
    throw new Error(err.error || 'Failed to generate test');
  }
  const data = await res.json();
  return {
    id: 'test-' + Date.now(),
    chapterId: chapterName,
    chapterName,
    subject,
    questions: data.questions || [],
  };
}

export async function fetchTestReview(
  chapterName: string,
  subject: string,
  questions: TestQuestion[],
  studentAnswers: Record<string, string>
): Promise<ChapterTestReview> {
  const res = await fetch('/api/ai/review-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chapterName, subject, questions, studentAnswers }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to review test' }));
    throw new Error(err.error || 'Failed to review test');
  }
  return res.json();
}

export async function fetchSpacedRevisionPlan(
  examName: string,
  examDate: string,
  daysLeft: number,
  chapters: Array<{ id: string; name: string; status: string; lastTestScore?: number }>
): Promise<SpacedRevisionPlan> {
  const res = await fetch('/api/ai/spaced-revision-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ examName, examDate, daysLeft, chapters }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate spaced revision plan' }));
    throw new Error(err.error || 'Failed to generate spaced revision plan');
  }
  return res.json();
}

export async function fetchVerbalRecallGapAnalysis(
  topic: string,
  subject: string,
  spokenText: string,
  chapterNotes?: string
): Promise<SpeechRecallGapAnalysis> {
  const res = await fetch('/api/ai/verbal-recall-gap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, subject, spokenText, chapterNotes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to analyze verbal recall' }));
    throw new Error(err.error || 'Failed to analyze verbal recall');
  }
  return res.json();
}

export async function fetchConvertHandwrittenNotes(params: {
  chapterName: string;
  subject: string;
  imageData: string;
  mimeType?: string;
  fileName?: string;
}): Promise<HandwrittenConversionResult> {
  const res = await fetch('/api/ai/convert-handwritten-notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to convert handwritten notes' }));
    throw new Error(err.error || 'Failed to convert handwritten notes');
  }
  return res.json();
}

export async function fetchExtractChapterTopics(
  chapterName: string,
  subject: string,
  materials?: ChapterMaterial[],
  examName?: string
): Promise<{ topics: ChapterTopicItem[]; sourceSummary?: string }> {
  const res = await fetch('/api/ai/extract-chapter-topics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chapterName, subject, materials, examName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to extract topics' }));
    throw new Error(err.message || err.error || 'Failed to extract chapter topics');
  }
  return res.json();
}

export async function fetchPracticeSession(params: {
  chapterName: string;
  subject?: string;
  mode?: PracticeMode;
  materials?: ChapterMaterial[];
  topic?: string;
  performanceHistory?: { weakConcepts?: string[] };
}): Promise<{
  chapterName: string;
  subject: string;
  mode: PracticeMode;
  sourceLabel: string;
  questions: PracticeQuestion[];
}> {
  const res = await fetch('/api/ai/practice-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate practice session' }));
    throw new Error(err.error || 'Failed to generate practice session');
  }
  return res.json();
}

export async function fetchEvaluatePracticeAnswer(params: {
  question: PracticeQuestion;
  studentAnswer: string;
  workingNotes?: string;
}): Promise<PracticeAnswerEvaluation> {
  const res = await fetch('/api/ai/evaluate-practice-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to evaluate practice answer' }));
    throw new Error(err.error || 'Failed to evaluate practice answer');
  }
  return res.json();
}

export async function fetchSimilarQuestion(params: {
  question: PracticeQuestion;
  identifiedMistake?: string | null;
}): Promise<PracticeQuestion> {
  const res = await fetch('/api/ai/similar-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to generate similar question' }));
    throw new Error(err.error || 'Failed to generate similar question');
  }
  return res.json();
}

export interface MultimodalEvaluationResult {
  isCorrect: boolean;
  score: number;
  transcription?: string;
  stepFeedback: string[];
  missingPoints: string[];
}

export async function fetchEvaluateAnswer(params: {
  questionText: string;
  modelAnswer: string;
  topicTag?: string;
  typedText?: string;
  spokenTranscript?: string;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<MultimodalEvaluationResult> {
  const res = await fetch('/api/evaluate/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to evaluate answer' }));
    throw new Error(err.message || err.error || 'Failed to evaluate answer');
  }
  return res.json();
}



