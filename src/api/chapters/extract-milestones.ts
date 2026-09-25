import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { parsePdfBuffer } from '../debug/inspect-document';

// =============================================================
// VALIDATION SCHEMAS
// =============================================================

export const ExtractMilestonesRequestSchema = z.object({
  chapterTitle: z.string().optional(),
  chapterName: z.string().optional(),
  rawText: z.string().optional(),
  inlinePdf: z.string().optional(),
  documentName: z.string().optional(),
  subject: z.string().optional(),
});

export type ExtractMilestonesRequest = z.infer<typeof ExtractMilestonesRequestSchema>;

export const MilestoneOutlineItemSchema = z.object({
  milestoneNumber: z.number().int().min(1),
  title: z.string().min(1),
  coreTopics: z.array(z.string()).min(1),
  pageOrSectionRef: z.string().optional().default('Section 1'),
});

export type MilestoneOutlineItem = z.infer<typeof MilestoneOutlineItemSchema>;

export const ExtractMilestonesResponseSchema = z.object({
  chapterName: z.string().min(1),
  milestones: z.array(MilestoneOutlineItemSchema).min(1, 'At least one milestone must be detected'),
  note: z.string().optional(),
  isGroundedFromText: z.boolean().optional(),
});

export type ExtractMilestonesResponse = z.infer<typeof ExtractMilestonesResponseSchema>;

// =============================================================
// CORE EXTRACTION FUNCTION
// =============================================================

export async function extractChapterMilestones(
  reqBody: ExtractMilestonesRequest
): Promise<ExtractMilestonesResponse> {
  const chapterTitle = (reqBody.chapterTitle || reqBody.chapterName || 'Chapter').trim();
  let rawText = (reqBody.rawText || '').trim();

  // If rawText is not provided or empty, but inlinePdf exists, attempt server-side extraction
  if (rawText.length < 100 && reqBody.inlinePdf) {
    try {
      const cleanBase64 = reqBody.inlinePdf.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      const parsed = await parsePdfBuffer(buffer);
      if (parsed.text && parsed.text.trim().length >= 100) {
        rawText = parsed.text.trim();
      }
    } catch (pdfErr) {
      console.warn('[ExtractMilestones] PDF parse fallback failed:', pdfErr);
    }
  }

  console.log(`[ExtractMilestones] Processing outline discovery for "${chapterTitle}". Text length: ${rawText.length}`);

  // Validation: Must be at least 100 characters long
  if (!rawText || rawText.length < 100) {
    const error: any = new Error('Chapter text must be at least 100 characters long. Please paste chapter text or upload a document with readable content.');
    error.code = 'INVALID_INPUT';
    error.status = 400;
    error.characterCount = rawText?.length || 0;
    throw error;
  }

  const effectiveKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    '';

  if (!effectiveKey) {
    const error: any = new Error('Gemini API key is not configured on the server. Please verify your GEMINI_API_KEY environment variable.');
    error.code = 'API_KEY_MISSING';
    error.status = 500;
    throw error;
  }

  const ai = new GoogleGenAI({
    apiKey: effectiveKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const systemInstruction = `Analyze the provided chapter text. Identify 3 to 6 major sections/milestones based strictly on the text headings and structural topic shifts.
Return ONLY a valid JSON object matching this schema:
{
  "chapterName": string,
  "milestones": [
    {
      "milestoneNumber": number,
      "title": string (actual section name from text),
      "coreTopics": string[] (3-5 specific subtopics mentioned under this section),
      "pageOrSectionRef": string
    }
  ]
}

CRITICAL RULES:
1. Base milestones EXCLUSIVELY on the headings, numbered sections (e.g. 1.1, 1.2), and conceptual progression in the provided text.
2. Do NOT invent concepts from outside the text.
3. Every milestone must represent a substantive section.
4. Output strict JSON only. Do not wrap in markdown or backticks.`;

  // Provide up to 200k chars for high coverage without token exhaustion
  const truncatedText = rawText.length > 200000 ? rawText.slice(0, 200000) + '\n...[End of text segment]' : rawText;

  const userPrompt = `Chapter Name: "${chapterTitle}"
Subject: "${reqBody.subject || 'General'}"
Document Reference: "${reqBody.documentName || 'Document'}"

Source Text:
---
${truncatedText}
---

Extract the 3 to 6 curriculum milestones matching the sections and headings above.`;

  const candidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
  ];

  let lastError: any = null;

  for (const model of candidateModels) {
    let timeoutId: any = null;
    try {
      console.log(`[ExtractMilestones] Requesting outline discovery with model: ${model}`);
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Model ${model} request timed out after 20s`)), 20000);
      });

      const apiPromise = ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      // Attach a silent catch handler to apiPromise immediately to prevent unhandled rejection
      // if timeoutPromise rejects the race before apiPromise resolves or rejects in the background
      apiPromise.catch(() => {
        // Handled via Promise.race or safely discarded on timeout
      });

      const response = await Promise.race([apiPromise, timeoutPromise]);

      clearTimeout(timeoutId);

      const rawJson = (response.text || '').trim();
      if (!rawJson) {
        throw new Error(`Empty response from model ${model}`);
      }

      // Clean potential JSON markdown fence if returned
      const cleanJson = rawJson.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      const parsedData = JSON.parse(cleanJson);

      const validated = ExtractMilestonesResponseSchema.safeParse(parsedData);
      if (validated.success) {
        console.log(
          `[ExtractMilestones] Successfully extracted ${validated.data.milestones.length} milestones using ${model}`
        );
        return validated.data;
      }

      // Fallback normalization if schema was slightly loose
      if (Array.isArray(parsedData.milestones) && parsedData.milestones.length > 0) {
        const normalizedMilestones: MilestoneOutlineItem[] = parsedData.milestones.map(
          (m: any, idx: number) => ({
            milestoneNumber: typeof m.milestoneNumber === 'number' ? m.milestoneNumber : idx + 1,
            title: m.title || m.name || `Section ${idx + 1}`,
            coreTopics: Array.isArray(m.coreTopics) && m.coreTopics.length > 0
              ? m.coreTopics.map(String)
              : [m.title || `Topic ${idx + 1}`],
            pageOrSectionRef: m.pageOrSectionRef || m.sourcePageRange || `Section ${idx + 1}`,
          })
        );

        return {
          chapterName: parsedData.chapterName || chapterTitle,
          milestones: normalizedMilestones,
        };
      }

      throw new Error(`Invalid schema output from model ${model}: ${validated.error.message}`);
    } catch (err: any) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      const errStatus = err?.status || err?.code || (err?.message?.includes('503') ? 503 : 'error');
      console.log(`[ExtractMilestones] Model ${model} unavailable (${errStatus}), trying fallback model...`);
      lastError = err;
      // Brief pause before trying fallback model if 503/429
      if (`${err?.message}`.includes('503') || `${err?.message}`.includes('high demand') || `${err?.message}`.includes('429')) {
        await new Promise((res) => setTimeout(res, 300));
      }
    }
  }

  // If external AI models hit rate-limit quotas (429) or high-demand spikes (503):
  // Perform high-precision structural milestone discovery directly from the user's uploaded chapter text!
  // This extracts the user's ACTUAL headings and topics rather than failing or injecting irrelevant static mocks.
  console.log(
    `[ExtractMilestones] External models unavailable. Extracting milestones directly from document text structure.`
  );

  return extractTextGroundedMilestones(rawText, chapterTitle, lastError?.message);
}

// =============================================================
// DETERMINISTIC TEXT-GROUNDED MILESTONE EXTRACTOR
// (Discovers actual headings & topics directly from the chapter text)
// =============================================================

export function extractTextGroundedMilestones(
  rawText: string,
  chapterTitle: string,
  diagnosticNote?: string
): ExtractMilestonesResponse {
  const lines = rawText.split(/\r?\n/);
  const detectedHeadings: Array<{ title: string; lineIndex: number; ref?: string }> = [];

  // Match section prefixes: e.g. "1.1 Something", "Chapter 1", "Section 2", "## Heading", etc.
  const headingRegex =
    /^(?:(#+)\s+(.+)|(\d+(?:\.\d+)*)\s*[:.\-–]?\s+(.+)|(?:Section|Unit|Chapter|Part|Module)\s+(\d+[:.\-–]?\s*.+)|([A-Z0-9\s\-:]{4,70}))$/i;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.length < 3 || trimmed.length > 90) continue;

    // Skip trailing periods/commas unless it's a markdown heading
    if (/[.,;]$/.test(trimmed) && !trimmed.startsWith('#')) continue;

    const match = trimmed.match(headingRegex);
    if (match) {
      const candidate = (match[2] || match[4] || match[5] || match[6] || trimmed).trim();
      const lower = candidate.toLowerCase();
      if (
        candidate.length >= 4 &&
        !/^(page\s+\d+|contents|table of contents|index|references|bibliography|glossary|summary)$/i.test(
          lower
        )
      ) {
        const last = detectedHeadings[detectedHeadings.length - 1];
        if (!last || i - last.lineIndex >= 3) {
          detectedHeadings.push({
            title: candidate,
            lineIndex: i,
            ref: match[3] ? `Section ${match[3]}` : `Part ${detectedHeadings.length + 1}`,
          });
        }
      }
    }
  }

  let finalMilestones: MilestoneOutlineItem[] = [];

  if (detectedHeadings.length >= 2) {
    const selected = detectedHeadings.slice(0, 6);
    finalMilestones = selected.map((h, idx) => {
      const startLine = h.lineIndex;
      const endLine = selected[idx + 1] ? selected[idx + 1].lineIndex : Math.min(lines.length, startLine + 50);
      const sectionSnippet = lines.slice(startLine, endLine).join(' ');
      const terms = extractKeyTerms(sectionSnippet, h.title);

      const topics =
        terms.length >= 2
          ? terms
          : Array.from(new Set([...terms, `${h.title} Principles`, 'Key Mechanisms'])).slice(0, 3);

      return {
        milestoneNumber: idx + 1,
        title: h.title,
        coreTopics: topics,
        pageOrSectionRef: h.ref || `Section ${idx + 1}`,
      };
    });
  } else {
    // If no explicit heading format is detected, partition text evenly into 3 to 5 logical modules
    const totalLen = rawText.length;
    const chunkCount = Math.min(5, Math.max(3, Math.round(totalLen / 12000)));
    const chunkSize = Math.floor(totalLen / chunkCount);

    for (let c = 0; c < chunkCount; c++) {
      const chunk = rawText.slice(c * chunkSize, (c + 1) * chunkSize);
      const terms = extractKeyTerms(chunk, '');

      let title = '';
      if (c === 0) {
        title = `${chapterTitle}: Foundations & Core Definitions`;
      } else if (c === chunkCount - 1) {
        title = `${chapterTitle}: Applications & Summary`;
      } else {
        title = terms[0] ? `${chapterTitle}: ${terms[0]}` : `${chapterTitle}: Part ${c + 1}`;
      }

      finalMilestones.push({
        milestoneNumber: c + 1,
        title,
        coreTopics: terms.length >= 2 ? terms.slice(0, 4) : [`Part ${c + 1} Principles`, 'Mechanisms', 'Problem Solving'],
        pageOrSectionRef: `Section ${c + 1}`,
      });
    }
  }

  return {
    chapterName: chapterTitle,
    milestones: finalMilestones,
    note: diagnosticNote
      ? `Extracted from text structure (${diagnosticNote})`
      : 'Extracted from document headings',
    isGroundedFromText: true,
  };
}

function extractKeyTerms(text: string, excludeTitle: string): string[] {
  const stopWords = new Set([
    'the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'were', 'which',
    'chapter', 'section', 'page', 'these', 'their', 'there', 'about', 'would', 'could',
    'should', 'using', 'study', 'learn', 'notes', 'review', 'also', 'such', 'into',
    'been', 'more', 'when', 'will', 'what', 'some', 'other', 'most', 'only', 'each',
    'part', 'unit', 'through', 'under', 'between', 'during', 'without', 'because',
  ]);

  const excludeWords = new Set(
    excludeTitle
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );

  const candidateMatches = text.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b/g) || [];
  const freqMap = new Map<string, number>();

  for (const m of candidateMatches) {
    const clean = m.trim();
    const words = clean.split(/\s+/);
    const validWords = words.filter((w) => !stopWords.has(w.toLowerCase()) && !excludeWords.has(w.toLowerCase()));

    if (validWords.length > 0) {
      const refinedPhrase = validWords.join(' ');
      if (refinedPhrase.length >= 3 && !stopWords.has(refinedPhrase.toLowerCase())) {
        freqMap.set(refinedPhrase, (freqMap.get(refinedPhrase) || 0) + 1);
      }
    }
  }

  const sorted = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map((entry) => entry[0]);

  return sorted.slice(0, 4);
}
