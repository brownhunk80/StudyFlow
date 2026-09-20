import {
  ChapterMaterial,
  ChapterNote,
  ChapterTest,
  ChapterTestReview,
  FeynmanRecordResult,
  HandwrittenConversionResult,
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

export async function fetchChapterTest(chapterName: string, subject: string, questionCount = 4): Promise<ChapterTest> {
  const res = await fetch('/api/ai/chapter-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chapterName, subject, questionCount }),
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

