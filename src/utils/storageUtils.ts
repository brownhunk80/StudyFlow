import { Exam, Section } from '../types';

/**
 * Sanitizes exams data before writing to localStorage to prevent QuotaExceededError.
 * Strips heavy base64 strings, full raw PDF dumps, and nested card queues that are already
 * persisted in dedicated milestone storage keys.
 */
export function sanitizeExamsForStorage(exams: Exam[]): Exam[] {
  if (!Array.isArray(exams)) return [];

  return exams.map((exam) => ({
    id: exam.id,
    name: exam.name,
    examDate: exam.examDate,
    daysLeft: exam.daysLeft,
    color: exam.color,
    icon: (exam as any).icon,
    subjectId: (exam as any).subjectId,
    chapters: Array.isArray(exam.chapters)
      ? exam.chapters.map((chap) => {
          const rawSecList: any[] = Array.isArray(chap.sections)
            ? chap.sections
            : Array.isArray(chap.milestones)
              ? chap.milestones
              : [];

          const cleanSections: Section[] = rawSecList.map((sec: any, idx: number) => ({
            id: sec.id || `sec-${chap.id}-${idx + 1}`,
            documentId: sec.documentId || chap.id,
            title: sec.title || `Milestone ${idx + 1}`,
            sectionNumber: typeof sec.sectionNumber === 'number' ? sec.sectionNumber : idx + 1,
            completionRate: typeof sec.completionRate === 'number' ? sec.completionRate : 0,
            keyTopics: Array.isArray(sec.keyTopics) ? sec.keyTopics.slice(0, 8) : [],
            isSkipped: Boolean(sec.isSkipped),
            summaries: Array.isArray(sec.summaries)
              ? sec.summaries.map((s: any) => ({
                  id: s.id || `sum-${sec.id || idx}`,
                  sectionId: s.sectionId || sec.id || `sec-${chap.id}-${idx + 1}`,
                  mode: (s.mode === 'compact' ? 'compact' : 'detailed') as any,
                  contentMarkdown:
                    typeof s.contentMarkdown === 'string' && s.contentMarkdown.length > 1500
                      ? s.contentMarkdown.slice(0, 1500)
                      : s.contentMarkdown || '',
                }))
              : [],
            sectionTextExcerpt:
              typeof sec.sectionTextExcerpt === 'string' && sec.sectionTextExcerpt.length > 500
                ? sec.sectionTextExcerpt.slice(0, 500)
                : sec.sectionTextExcerpt,
            // Strip nested card queues from studyflow_exams since they are stored in milestone_recall_deck_*
            recallDeck: undefined,
            flashcards: undefined,
            checkpoints: undefined,
          }));

          return {
            id: chap.id,
            name: chap.name || (chap as any).title || 'Chapter',
            status: chap.status || 'not_started',
            targetScore: (chap as any).targetScore,
            difficulty: (chap as any).difficulty,
            completedTasks: (chap as any).completedTasks || 0,
            totalTasks: (chap as any).totalTasks || 3,
            documentName: (chap as any).documentName,
            sourceType: (chap as any).sourceType,
            // Retain brief excerpt reference instead of multi-megabyte raw documents
            rawText:
              typeof (chap as any).rawText === 'string' && (chap as any).rawText.length > 300
                ? (chap as any).rawText.slice(0, 300)
                : (chap as any).rawText,
            documentText: undefined,
            ocrNotes:
              typeof (chap as any).ocrNotes === 'string' && (chap as any).ocrNotes.length > 1000
                ? (chap as any).ocrNotes.slice(0, 1000)
                : (chap as any).ocrNotes,
            aiNotes: (chap as any).aiNotes,
            notes:
              typeof chap.notes === 'string' && chap.notes.length > 1000
                ? chap.notes.slice(0, 1000)
                : chap.notes,
            // Clean materials: strip all base64 data and cap text content
            materials: Array.isArray(chap.materials)
              ? chap.materials.map((mat) => ({
                  id: mat.id,
                  type: mat.type,
                  title: mat.title,
                  fileName: mat.fileName,
                  uploadedAt: mat.uploadedAt,
                  // Never store raw binary/base64 in main exams state
                  fileData: undefined,
                  content:
                    typeof mat.content === 'string' && mat.content.length > 500
                      ? mat.content.slice(0, 500)
                      : mat.content,
                }))
              : [],
            sections: cleanSections,
            milestones: cleanSections,
          };
        })
      : [],
  }));
}

/**
 * Frees up localStorage space when QuotaExceededError occurs by purging non-critical keys.
 */
export function purgeExpendableStorage(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      // Identify expendable cache entries
      if (
        key.startsWith('doc_preview_') ||
        key.startsWith('cached_doc_') ||
        key.startsWith('document_content_') ||
        key.startsWith('pdf_') ||
        key.startsWith('raw_pdf_') ||
        key.startsWith('temp_') ||
        key.startsWith('debug_') ||
        key.startsWith('test_') ||
        key.startsWith('chapter_diagnostic_') ||
        key === 'studyflow_diagnostic_answers' ||
        key.startsWith('temp_ocr_')
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });
  } catch (err) {
    console.warn('[StorageUtils] Failed to purge expendable storage:', err);
  }
}

/**
 * Ultra-lean fallback for exams if storage is critically constrained.
 */
function createMinimalExams(exams: Exam[]): any[] {
  if (!Array.isArray(exams)) return [];
  return exams.map((e) => ({
    id: e.id,
    name: e.name,
    examDate: e.examDate,
    daysLeft: e.daysLeft,
    color: e.color,
    subjectId: (e as any).subjectId,
    chapters: (e.chapters || []).map((c: any) => ({
      id: c.id,
      title: c.title || c.name,
      name: c.name || c.title,
      status: c.status,
      progress: c.progress || 0,
      sections: (c.sections || c.milestones || []).map((s: any) => ({
        id: s.id,
        documentId: s.documentId || c.id,
        title: s.title,
        sectionNumber: s.sectionNumber,
        completionRate: s.completionRate,
      })),
      milestones: (c.sections || c.milestones || []).map((s: any) => ({
        id: s.id,
        documentId: s.documentId || c.id,
        title: s.title,
        sectionNumber: s.sectionNumber,
        completionRate: s.completionRate,
      })),
    })),
  }));
}

/**
 * Safe wrapper for localStorage.setItem that catches and gracefully mitigates QuotaExceededError.
 * Never throws an uncaught error to prevent crashing React components.
 */
export function safeSetItem(key: string, value: any): boolean {
  try {
    let serialized: string;
    if (key === 'studyflow_exams' && Array.isArray(value)) {
      serialized = JSON.stringify(sanitizeExamsForStorage(value));
    } else if (typeof value === 'string') {
      serialized = value;
    } else {
      serialized = JSON.stringify(value);
    }

    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      `${err?.message}`.toLowerCase().includes('quota');

    if (isQuotaError) {
      purgeExpendableStorage();

      try {
        if (key === 'studyflow_exams' && Array.isArray(value)) {
          // Tier 1: Sanitize
          const sanitized = sanitizeExamsForStorage(value);
          const sanitizedStr = JSON.stringify(sanitized);
          localStorage.setItem(key, sanitizedStr);
          return true;
        }

        const fallbackStr = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, fallbackStr);
        return true;
      } catch {
        try {
          if (key === 'studyflow_exams' && Array.isArray(value)) {
            // Tier 2: Ultra-lean minimal structure
            const minimalExams = createMinimalExams(value);
            localStorage.setItem(key, JSON.stringify(minimalExams));
            return true;
          }
        } catch {
          // If still constrained, purge old temporary keys and silently retain in-memory state
          try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const k = localStorage.key(i);
              if (k && k.startsWith('milestone_summary_read_')) {
                localStorage.removeItem(k);
              }
            }
            if (key === 'studyflow_exams' && Array.isArray(value)) {
              localStorage.setItem(key, JSON.stringify(createMinimalExams(value)));
              return true;
            }
          } catch {}
          return false;
        }
      }
    }

    return false;
  }
}

/**
 * Safe wrapper for localStorage.getItem with fallback.
 */
export function safeGetItem<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null || saved === undefined) return fallback;
    return JSON.parse(saved);
  } catch (err) {
    console.warn(`[StorageUtils] Error parsing localStorage key "${key}":`, err);
    return fallback;
  }
}
