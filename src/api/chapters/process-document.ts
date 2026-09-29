import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import type { DocumentMilestoneItem, DocumentCurriculumExtraction } from '../../types';
import { parsePdfBuffer } from '../debug/inspect-document';
import { isHindiSubject, getHindiPromptDirectives, extractHindiKeyEntities } from '../../utils/hindiDetection';

// =============================================================
// ZOD VALIDATION SCHEMAS
// =============================================================

export const ProcessDocumentRequestSchema = z.object({
  chapterName: z.string().min(1, 'Chapter name is required'),
  subject: z.string().optional().default('General'),
  documentName: z.string().optional(),
  rawText: z.string().optional(),
  inlinePdf: z.string().optional(),
  mimeType: z.string().optional().default('application/pdf'),
});

export type ProcessDocumentRequest = z.infer<typeof ProcessDocumentRequestSchema>;

export const CheckLearningQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
  misdirectionBreakdown: z.string().optional(),
  correctAnswer: z.string().optional(),
});

export const RecallDeckCardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  sourceExcerpt: z.string().optional().default(''),
  explanation: z.string().optional(),
});

export const MilestoneSchema = z.object({
  milestoneNumber: z.number().int().min(1),
  title: z.string().min(1),
  sourcePageRange: z.string().default('Pages 1-3'),
  sourceHeading: z.string().default(''),
  summary: z.object({
    compact: z.string(),
    detailed: z.string(),
  }),
  coreTopics: z.array(z.string()),
  checkLearning: z.array(CheckLearningQuestionSchema),
  recallDeck: z.array(RecallDeckCardSchema),
});

export const MilestoneExtractionOutputSchema = z.object({
  chapterTitle: z.string(),
  totalSectionsDetected: z.number().int(),
  milestones: z.array(MilestoneSchema),
});

export type MilestoneExtractionOutput = z.infer<typeof MilestoneExtractionOutputSchema>;

export interface ProcessDocumentResponse extends DocumentCurriculumExtraction {
  chapterName: string;
  documentName?: string;
}

// =============================================================
// ROBUST DOCUMENT INGESTION & PAGE/SECTION CHUNKING
// =============================================================

interface ExtractedPage {
  pageNumber: number;
  text: string;
  detectedHeadings: string[];
}

/**
 * Extracts page-by-page text from base64 PDF stream data,
 * preserving numbered section titles (e.g., "1.1", "Section 2") and page boundaries [Page X].
 */
export async function extractTextWithPagesFromPdfBase64(base64: string): Promise<{
  fullText: string;
  pageCount: number;
  pages: ExtractedPage[];
  headings: Array<{ title: string; pageNumber: number }>;
  isScannedImagePdf: boolean;
}> {
  try {
    const raw = Buffer.from(base64.replace(/^data:[^;]+;base64,/, ''), 'base64');
    const parsed = await parsePdfBuffer(raw);
    const headings = extractHeadingsFromText(parsed.text);

    return {
      fullText: parsed.text,
      pageCount: parsed.pageCount,
      pages: [],
      headings,
      isScannedImagePdf: parsed.isScannedImagePdf,
    };
  } catch (err: any) {
    console.warn('[PDFExtraction] Error parsing base64 PDF with parser:', err?.message || err);
    return {
      fullText: '',
      pageCount: 1,
      pages: [],
      headings: [],
      isScannedImagePdf: true,
    };
  }
}

/**
 * Normalizes raw text input with page boundaries [Page X] and headings
 */
export function chunkAndFormatText(rawText: string): {
  formattedText: string;
  pageCount: number;
  detectedHeadings: Array<{ title: string; pageNumber: number }>;
} {
  const existingPageMarkers = /\[Page\s+(\d+)\]/i.test(rawText);
  if (existingPageMarkers) {
    const pageMatches = rawText.match(/\[Page\s+(\d+)\]/gi);
    return {
      formattedText: rawText,
      pageCount: pageMatches ? pageMatches.length : 1,
      detectedHeadings: extractHeadingsFromText(rawText),
    };
  }

  // Segment by words (~350 words per textbook page)
  const paragraphs = rawText.split(/\n\s*\n/);
  const pages: string[] = [];
  let currentPage = '';
  let wordCount = 0;
  let pageNumber = 1;
  const headings: Array<{ title: string; pageNumber: number }> = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Check if paragraph is a heading
    if (
      trimmed.length < 90 &&
      (/^(\d+\.?\d*|[A-Z]\.|\b(Section|Unit|Chapter|Topic|Part)\b\s*\d*[:.-]?)\s+[A-Z]/i.test(trimmed) ||
        /^#{1,3}\s+/.test(trimmed))
    ) {
      headings.push({ title: trimmed.replace(/^#{1,3}\s+/, ''), pageNumber });
    }

    const words = trimmed.split(/\s+/).length;
    if (wordCount + words > 350 && currentPage.length > 0) {
      pages.push(`[Page ${pageNumber}]\n${currentPage.trim()}`);
      pageNumber++;
      currentPage = trimmed;
      wordCount = words;
    } else {
      currentPage += '\n\n' + trimmed;
      wordCount += words;
    }
  }

  if (currentPage.trim().length > 0) {
    pages.push(`[Page ${pageNumber}]\n${currentPage.trim()}`);
  }

  return {
    formattedText: pages.join('\n\n'),
    pageCount: Math.max(1, pages.length),
    detectedHeadings: headings,
  };
}

function extractHeadingsFromText(text: string): Array<{ title: string; pageNumber: number }> {
  const headings: Array<{ title: string; pageNumber: number }> = [];
  const lines = text.split(/\r?\n/);
  let currentPage = 1;

  for (const line of lines) {
    const pageMatch = line.match(/\[Page\s+(\d+)\]/i);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10) || currentPage;
      continue;
    }

    const trimmed = line.trim();
    if (
      trimmed.length >= 4 &&
      trimmed.length <= 80 &&
      (/^(\d+\.?\d*|[A-Z]\.|\b(Section|Unit|Chapter|Topic|Part)\b\s*\d*[:.-]?)\s+[A-Z]/i.test(trimmed) ||
        /^#{1,3}\s+/.test(trimmed))
    ) {
      headings.push({ title: trimmed.replace(/^#{1,3}\s+/, ''), pageNumber: currentPage });
    }
  }

  return headings;
}

// =============================================================
// GROUNDED AI EXTRACTION PIPELINE
// =============================================================

export async function processDocumentWithGemini(
  payload: ProcessDocumentRequest,
  apiKey?: string
): Promise<ProcessDocumentResponse> {
  // Validate request with Zod
  const validatedPayload = ProcessDocumentRequestSchema.parse(payload);
  const { chapterName, subject, documentName, rawText, inlinePdf } = validatedPayload;
  const effectiveKey = apiKey || process.env.GEMINI_API_KEY;

  // Step 1: Check File Payload
  const payloadSizeBytes = inlinePdf
    ? Buffer.from(inlinePdf.replace(/^data:[^;]+;base64,/, ''), 'base64').length
    : (rawText ? Buffer.byteLength(rawText, 'utf-8') : 0);

  console.log('[ProcessDocument:Step 1] Ingesting file payload:', {
    documentName: documentName || chapterName,
    mimeType: validatedPayload.mimeType || (inlinePdf ? 'application/pdf' : 'text/plain'),
    payloadSizeBytes,
    hasInlinePdf: Boolean(inlinePdf),
    hasRawText: Boolean(rawText),
  });

  // Step 2: Check Extracted Text
  let extractedText = '';
  let detectedPageCount = 1;
  let preDetectedHeadings: Array<{ title: string; pageNumber: number }> = [];
  let isScannedImagePdf = false;

  if (rawText && rawText.trim().length > 0) {
    const chunked = chunkAndFormatText(rawText);
    extractedText = chunked.formattedText;
    detectedPageCount = chunked.pageCount;
    preDetectedHeadings = chunked.detectedHeadings;
  } else if (inlinePdf) {
    const pdfExtracted = await extractTextWithPagesFromPdfBase64(inlinePdf);
    extractedText = pdfExtracted.fullText;
    detectedPageCount = pdfExtracted.pageCount;
    preDetectedHeadings = pdfExtracted.headings;
    isScannedImagePdf = pdfExtracted.isScannedImagePdf;
  }

  const characterCount = extractedText ? extractedText.trim().length : 0;
  const wordCount = extractedText ? extractedText.trim().split(/\s+/).filter(Boolean).length : 0;

  console.log('[ProcessDocument:Step 2] Extracted text analysis:', {
    characterCount,
    wordCount,
    detectedPageCount,
    detectedHeadingsCount: preDetectedHeadings.length,
    isScannedImagePdf,
  });

  const isTextEmpty = !extractedText || characterCount < 50;

  if (isTextEmpty && !inlinePdf) {
    console.error('[ProcessDocument:Guardrail] Document is unreadable (no text layer and no inline PDF provided):', {
      characterCount,
      isScannedImagePdf,
      payloadSizeBytes,
    });
    const unreadableError: any = new Error(
      'The document contains no readable text. It may be an image-only scanned PDF or password protected. Please run OCR or upload a text-based document.'
    );
    unreadableError.code = 'UNREADABLE_DOCUMENT';
    unreadableError.status = 400;
    unreadableError.characterCount = characterCount;
    throw unreadableError;
  }

  const documentContent = extractedText || '';

  // Step 3: Call Gemini with strict anti-hallucination guardrails if API key is present
  console.log(
    `[ProcessDocument:Step 3] Dispatching to Gemini (Text chars: ${characterCount}, Pages: ${detectedPageCount}, HasInlinePDF: ${Boolean(inlinePdf)})...`
  );
  if (effectiveKey) {
    const ai = new GoogleGenAI({
      apiKey: effectiveKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const isHindi = isHindiSubject(subject, chapterName, documentContent);
    const hindiDirective = isHindi
      ? `\n${getHindiPromptDirectives(chapterName)}\n- CRITICAL MANDATORY INSTRUCTION: You MUST write the entire JSON response completely in standard Hindi (Devanagari script, शुद्ध हिन्दी). Do NOT use English.`
      : '';

    const systemInstruction = `You are a strict curriculum analysis engine. Your sole task is to analyze the provided textbook chapter/document and extract learning milestones based EXCLUSIVELY and VERBATIM on the actual text, headings, events, dialogues, stanzas, and sub-sections present in the source material.${hindiDirective}

CRITICAL RULES:
1. ONLY USE INPUT FROM THE UPLOADED TEXT. DO NOT LOOK FOR OR INVENT ANYTHING FROM OUTSIDE KNOWLEDGE.
2. Every milestone must correspond to an actual section, poem stanza, story event, or heading found in the text.
3. Every summary bullet, Check Learning question, and flashcard MUST mention the specific characters, dialogue quotes, actions, stanzas, and terms that literally appear in the provided text.
4. ABSOLUTELY FORBIDDEN: Do NOT output vague filler statements (e.g. "पाठ के केंद्रीय भाव को समझना", "साहित्यिक गरिमा", "कवि का परिचय", "General rules") unless those exact words and biographies are literally in the text.
5. If the chapter has 3 to 6 distinct narrative/conceptual sections, generate 3 to 6 milestones.
6. Provide the exact source reference (e.g., 'Pages 1-3' or 'Section 1.2') and verbatim quotes for each milestone.

Return pure JSON matching this exact structure:
{
  "chapterTitle": "string (as stated in document)",
  "totalSectionsDetected": 0,
  "milestones": [
    {
      "milestoneNumber": 1,
      "title": "string (actual section heading or main event/stanza title from the text)",
      "sourcePageRange": "string (e.g. 'Pages 1-4')",
      "sourceHeading": "string (the exact heading/subheading in text)",
      "summary": {
        "compact": "string (concise summary citing actual events, dialogues, characters, and quotes from text)",
        "detailed": "string (deep-dive markdown with actual quotes, character actions, story progression, and facts from the text)"
      },
      "coreTopics": [
        "string (specific character name, dialogue phrase, stanza theme, or concept directly mentioned in this section)"
      ],
      "checkLearning": [
        {
          "question": "string (asking about a specific event, dialogue, action, or fact directly present in this section)",
          "options": ["string", "string", "string", "string"],
          "correctIndex": 0,
          "explanation": "string (citing exact document sentences and facts)",
          "misdirectionBreakdown": "string (why other options contradict the text)"
        }
      ],
      "recallDeck": [
        {
          "front": "string (direct active recall prompt about a specific event, dialogue, character, or definition in the text)",
          "back": "string (precise factual answer directly from the text)",
          "sourceExcerpt": "string (direct verbatim quote from the text verifying this answer)"
        }
      ]
    }
  ]
}`;

    // Prepare contents payload: text-based or multimodal PDF fallback
    let requestContents: any;
    if (isTextEmpty && inlinePdf) {
      const cleanBase64 = inlinePdf.replace(/^data:[^;]+;base64,/, '');
      requestContents = [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: cleanBase64,
          },
        },
        {
          text: `Chapter: "${chapterName}"\nSubject: "${subject}"\nSource Document: "${documentName || 'Document'}"\n\nPlease read this PDF visually/OCR and extract the curriculum milestones matching the sections, chapters, characters, dialogues, and headings literally in the document. Do not invent outside information.`,
        },
      ];
    } else if (detectedPageCount > 30 && preDetectedHeadings.length >= 3) {
      const outlineText = preDetectedHeadings
        .slice(0, 20)
        .map((h) => `- ${h.title} (Page ${h.pageNumber})`)
        .join('\n');

      requestContents = `Chapter: "${chapterName}"
Subject: "${subject}"
Source Document: "${documentName || 'Document'}"
Detected Outline Headings:
${outlineText}

Full Document Excerpt:
${documentContent.slice(0, 75000)}

Analyze the source text above. Extract curriculum milestones strictly bound to the document's actual text, quoting the real character names, dialogues, stanzas, and events from the excerpt. Do not use outside knowledge.`;
    } else {
      requestContents = `Chapter: "${chapterName}"
Subject: "${subject}"
Source Document: "${documentName || 'Document'}"

Source Document Content (with [Page X] markers):
${documentContent.slice(0, 95000)}

Extract the learning milestones strictly matching the actual sections, characters, events, and stanzas in the text above. Only use input from this uploaded chapter.`;
    }

    const modelsToTry = [
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
    ];

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: requestContents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.15,
          },
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text);
          if (parsed && Array.isArray(parsed.milestones) && parsed.milestones.length > 0) {
            const normalized = normalizeMilestones(parsed.milestones, chapterName);
            console.log('[ProcessDocument:Step 4] Generated milestone count from Gemini:', normalized.length);
            return {
              chapterName,
              documentName,
              chapterTitle: parsed.chapterTitle || chapterName,
              totalSectionsDetected: normalized.length,
              milestones: normalized,
              generatedAt: new Date().toISOString(),
              source: 'gemini',
            };
          }
        }
      } catch (err: any) {
        const status = err?.status || err?.code || (err?.message?.includes('503') ? 503 : 'unavailable');
        console.warn(`[ProcessDocument] Model ${model} unavailable (${status}), trying fallback`);
        if (status === 503 || status === 429 || `${err?.message}`.includes('high demand')) {
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }
    }
  }

  // If text is empty and Gemini multimodal also failed or was not configured, throw explicit unreadable error
  if (isTextEmpty) {
    const unreadableError: any = new Error(
      'The document contains no readable text. It may be an image-only scanned PDF or password protected. Please run OCR or upload a text-based document.'
    );
    unreadableError.code = 'UNREADABLE_DOCUMENT';
    unreadableError.status = 400;
    unreadableError.characterCount = characterCount;
    throw unreadableError;
  }

  // 3. Grounded Algorithmic Fallback based directly on detected headings and pages
  return generateGroundedFallback(
    chapterName,
    subject,
    documentName,
    documentContent,
    preDetectedHeadings,
    detectedPageCount
  );
}

// =============================================================
// NORMALIZATION & ALIAS MAPPING
// =============================================================

function normalizeMilestones(rawMilestones: any[], chapterName: string): DocumentMilestoneItem[] {
  return rawMilestones.map((m: any, idx: number): DocumentMilestoneItem => {
    const milestoneNumber = typeof m.milestoneNumber === 'number' ? m.milestoneNumber : idx + 1;
    const title = m.title || m.milestoneTitle || `Section ${milestoneNumber}: Core Topic`;
    const sourcePageRange = m.sourcePageRange || `Pages ${idx * 3 + 1}–${(idx + 1) * 3}`;
    const sourceHeading = m.sourceHeading || title;

    const compactSummary =
      typeof m.summary === 'object' && m.summary?.compact
        ? m.summary.compact
        : typeof m.summary === 'string'
          ? m.summary
          : `• Key syllabus concept for ${title}\n• Core governing definition directly referenced in the text`;

    const detailedSummary =
      typeof m.summary === 'object' && m.summary?.detailed
        ? m.summary.detailed
        : `### ${title}\n\n${compactSummary}\n\n**Key Takeaway**: Master the fundamental properties and problem-solving steps outlined in this section.`;

    const rawCheckLearning = Array.isArray(m.checkLearning)
      ? m.checkLearning
      : Array.isArray(m.checkLearningQuestions)
        ? m.checkLearningQuestions
        : [];

    const checkLearning = rawCheckLearning.map((q: any, qIdx: number) => {
      const options = Array.isArray(q.options) && q.options.length >= 2
        ? q.options
        : ['Correct concept formulation', 'Incorrect application of boundary condition', 'Sign or unit error in derivation', 'Unrelated distractor'];
      
      const correctIndex = typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < options.length
        ? q.correctIndex
        : 0;

      return {
        question: q.question || `What is the primary principle established in "${title}"?`,
        options,
        correctIndex,
        explanation: q.explanation || `Derived directly from ${sourcePageRange} in the textbook.`,
        misdirectionBreakdown: q.misdirectionBreakdown || 'Distractors represent common conceptual traps or wrong conditions of applicability.',
        correctAnswer: options[correctIndex],
      };
    });

    const rawRecallDeck = Array.isArray(m.recallDeck)
      ? m.recallDeck
      : Array.isArray(m.recallCards)
        ? m.recallCards
        : [];

    const recallDeck = rawRecallDeck.map((rc: any, rIdx: number) => ({
      front: rc.front || `State the core definition or rule for: ${title} (Part ${rIdx + 1})`,
      back: rc.back || `Authoritative answer according to ${sourceHeading}`,
      sourceExcerpt: rc.sourceExcerpt || `Reference: ${sourcePageRange}`,
      explanation: rc.explanation || undefined,
    }));

    // If deck is empty, provide minimum high-yield active recall card
    if (recallDeck.length === 0) {
      recallDeck.push({
        front: `What is the governing principle of ${title}?`,
        back: `The fundamental relation and conditions established in ${sourcePageRange}.`,
        sourceExcerpt: `Direct from ${sourceHeading}`,
      });
    }

    const coreTopics = Array.isArray(m.coreTopics) && m.coreTopics.length > 0
      ? m.coreTopics
      : [title, 'Fundamental Laws', 'Analytical Application'];

    return {
      milestoneNumber,
      title,
      sourcePageRange,
      sourceHeading,
      summary: {
        compact: compactSummary,
        detailed: detailedSummary,
      },
      coreTopics,
      checkLearning,
      recallDeck,
      // Backward compatibility aliases
      milestoneTitle: title,
      recallCards: recallDeck,
      checkLearningQuestions: checkLearning,
    };
  });
}

// =============================================================
// GROUNDED DETERMINISTIC FALLBACK
// =============================================================

// =============================================================
// GROUNDED DETERMINISTIC FALLBACK (VERBATIM TEXT EXTRACTION)
// =============================================================

function generateGroundedFallback(
  chapterName: string,
  subject: string,
  documentName?: string,
  documentContent: string = '',
  detectedHeadings?: Array<{ title: string; pageNumber: number }>,
  pageCount: number = 1
): ProcessDocumentResponse {
  const isHindi = isHindiSubject(subject, chapterName, documentContent);
  const cleanDocText = documentContent.replace(/\[Page\s+\d+\]/gi, '').trim();

  // Split text into meaningful paragraphs
  const paragraphs = cleanDocText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 20);

  const totalParagraphs = paragraphs.length;
  const chunkCount = Math.min(5, Math.max(3, Math.ceil(totalParagraphs / 6) || 3));

  interface TextBlock {
    title: string;
    sourcePageRange: string;
    sourceHeading: string;
    text: string;
    sentences: string[];
    entities: string[];
  }

  const blocks: TextBlock[] = [];

  if (detectedHeadings && detectedHeadings.length >= 2) {
    const selectedHeadings = detectedHeadings.slice(0, 6);
    selectedHeadings.forEach((h, idx) => {
      const nextH = selectedHeadings[idx + 1];
      const startPage = h.pageNumber;
      const endPage = nextH ? Math.max(startPage, nextH.pageNumber - 1) : Math.min(startPage + 2, pageCount);
      const pageRange = isHindi
        ? startPage === endPage ? `पृष्ठ ${startPage}` : `पृष्ठ ${startPage}–${endPage}`
        : startPage === endPage ? `Page ${startPage}` : `Pages ${startPage}–${endPage}`;

      // Find paragraphs near this heading
      const pStartIndex = Math.floor((idx / selectedHeadings.length) * totalParagraphs);
      const pEndIndex = Math.floor(((idx + 1) / selectedHeadings.length) * totalParagraphs);
      const blockParas = paragraphs.slice(pStartIndex, Math.max(pStartIndex + 1, pEndIndex));
      const blockText = blockParas.join('\n\n') || cleanDocText.slice(0, 1500);

      const sentences = blockText
        .split(/[।.\n!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 15 && s.length <= 250);

      const entities = isHindi
        ? extractHindiKeyEntities(blockText, 6)
        : extractKeyTermsFromBlock(blockText, h.title);

      blocks.push({
        title: h.title,
        sourcePageRange: pageRange,
        sourceHeading: h.title,
        text: blockText,
        sentences: sentences.length > 0 ? sentences : [blockText.slice(0, 120)],
        entities: entities.length > 0 ? entities : [h.title],
      });
    });
  } else {
    // Partition document paragraphs into narrative chunks
    const parasPerChunk = Math.max(1, Math.ceil(totalParagraphs / chunkCount));

    for (let c = 0; c < chunkCount; c++) {
      const chunkParas = paragraphs.slice(c * parasPerChunk, (c + 1) * parasPerChunk);
      const blockText = chunkParas.join('\n\n') || cleanDocText.slice(c * 1500, (c + 1) * 1500) || `${chapterName} खंड ${c + 1}`;

      const sentences = blockText
        .split(/[।.\n!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 15 && s.length <= 250);

      const entities = isHindi
        ? extractHindiKeyEntities(blockText, 6)
        : extractKeyTermsFromBlock(blockText, '');

      const startPage = Math.max(1, Math.round((c / chunkCount) * pageCount) + 1);
      const endPage = Math.max(startPage, Math.min(pageCount, Math.round(((c + 1) / chunkCount) * pageCount)));
      const pageRange = isHindi
        ? startPage === endPage ? `पृष्ठ ${startPage}` : `पृष्ठ ${startPage}–${endPage}`
        : startPage === endPage ? `Page ${startPage}` : `Pages ${startPage}–${endPage}`;

      // Generate a title based on the primary entity/dialogue/first sentence from this block
      let blockTitle = '';
      if (isHindi) {
        if (entities.length >= 2) {
          blockTitle = `${entities[0]} एवं ${entities[1]}`;
        } else if (entities.length === 1) {
          blockTitle = `${entities[0]} — महत्वपूर्ण प्रसंग`;
        } else if (sentences.length > 0) {
          blockTitle = sentences[0].slice(0, 45);
        } else {
          blockTitle = `${chapterName}: भाग ${c + 1}`;
        }
      } else {
        if (entities.length >= 2) {
          blockTitle = `${entities[0]} & ${entities[1]}`;
        } else if (entities.length === 1) {
          blockTitle = `${entities[0]} Module`;
        } else {
          blockTitle = `${chapterName}: Part ${c + 1}`;
        }
      }

      blocks.push({
        title: blockTitle,
        sourcePageRange: pageRange,
        sourceHeading: blockTitle,
        text: blockText,
        sentences: sentences.length > 0 ? sentences : [blockText.slice(0, 120)],
        entities: entities.length > 0 ? entities : [blockTitle],
      });
    }
  }

  // Build authentic milestones from the extracted text blocks
  const milestones: DocumentMilestoneItem[] = blocks.map((block, idx) => {
    const milestoneNumber = idx + 1;
    const { title, sourcePageRange, sourceHeading, sentences, entities, text } = block;

    const topSentences = sentences.slice(0, 4);
    const primarySentence = sentences[0] || text.slice(0, 100);
    const secondarySentence = sentences[1] || sentences[0] || text.slice(0, 100);

    if (isHindi) {
      const compactBullets = topSentences
        .map((s) => `• "${s.length > 120 ? s.slice(0, 120) + '...' : s}"`)
        .join('\n');

      const compactSummary = `### मुख्य विवरण एवं पंक्तियाँ (${sourcePageRange}):\n${compactBullets}\n• **प्रमुख पात्र / विषय**: ${entities.join(', ')}`;

      const detailedSummary = `## ${title} (${sourcePageRange})\n\n### 1. पाठ के इस खंड का वास्तविक घटनाक्रम व प्रसंग\n${topSentences.map((s, i) => `${i + 1}. **मूल पंक्ति**: "${s}"\n   - **व्याख्या व संदर्भ**: यह प्रसंग '${chapterName}' के अंतर्गत ${entities[i % entities.length] || 'पाठ'} के महत्वपूर्ण संवाद और विचार को दर्शाता है।`).join('\n\n')}\n\n### 2. मुख्य पात्र, संवाद एवं शब्दावली\n- **पात्र व विषय**: ${entities.join(', ')}\n- **परीक्षा दृष्टि**: बोर्ड परीक्षा में इन पंक्तियों के संदर्भ, पात्रों के भाव तथा शब्दार्थ पर आधारित प्रश्न पूछे जाते हैं।`;

      const checkLearningQuestions = [
        {
          question: `पाठ के इस अंश (${sourcePageRange}) के अनुसार निम्नलिखित पंक्ति का वास्तविक संदर्भ क्या है:\n"${primarySentence.slice(0, 110)}..."?`,
          options: [
            `यह इस अंश में वर्णित घटनाक्रम और ${entities[0] || 'मुख्य पात्र'} की स्थिति को दर्शाता है।`,
            'यह पाठ के विपरीत एक असत्य एवं काल्पनिक प्रसंग है।',
            'इसका पाठ की मूल कथावस्तु या घटनाक्रम से कोई संबंध नहीं है।',
            'यह किसी अन्य अप्रासंगिक प्रसंग का सामान्य कथन है।',
          ],
          correctIndex: 0,
          explanation: `पाठ्यांश की मूल पंक्ति: "${primarySentence}"।`,
          misdirectionBreakdown: 'अन्य विकल्प पाठ के वास्तविक गद्यांश/काव्यांश के विपरीत हैं।',
          correctAnswer: `यह इस अंश में वर्णित घटनाक्रम और ${entities[0] || 'मुख्य पात्र'} की स्थिति को दर्शाता है।`,
        },
      ];

      const recallDeck = [
        {
          front: `पाठ '${chapterName}' के इस अंश (${sourcePageRange}) में '${entities[0] || title}' के बारे में क्या उल्लेख है?`,
          back: secondarySentence.length > 90 ? secondarySentence.slice(0, 90) + '...' : secondarySentence,
          sourceExcerpt: `मूल पाठ्यांश: "${primarySentence.slice(0, 140)}"`,
        },
        {
          front: `इस अंश में उल्लिखित महत्वपूर्ण संवाद/घटना: "${primarySentence.slice(0, 70)}..." का संबंध किससे है?`,
          back: `${entities.slice(0, 2).join(' / ')} के प्रसंग से।`,
          sourceExcerpt: `मूल पाठ (${sourcePageRange})`,
        },
      ];

      return {
        milestoneNumber,
        title,
        sourcePageRange,
        sourceHeading,
        summary: {
          compact: compactSummary,
          detailed: detailedSummary,
        },
        coreTopics: entities.length >= 2 ? entities.slice(0, 4) : [title, 'मूल पाठ्यांश', 'संवाद व प्रसंग'],
        checkLearning: checkLearningQuestions,
        recallDeck,
        milestoneTitle: title,
        recallCards: recallDeck,
        checkLearningQuestions,
      };
    }

    // English Fallback
    const compactBullets = topSentences
      .map((s) => `• "${s.length > 120 ? s.slice(0, 120) + '...' : s}"`)
      .join('\n');

    const compactSummary = `### Key Excerpts (${sourcePageRange}):\n${compactBullets}\n• **Key Concepts**: ${entities.join(', ')}`;

    const detailedSummary = `## ${title} (${sourcePageRange})\n\n### Direct Syllabus Excerpts & Principles\n${topSentences.map((s, i) => `${i + 1}. **Source Text**: "${s}"\n   - **Curriculum Context**: Establishes core mechanism for ${entities[i % entities.length] || 'topic'}.`).join('\n\n')}\n\n### Key Terms & Parameters\n- **Identified Concepts**: ${entities.join(', ')}\n- **Exam Application**: Understand the direct conditions and derivations in this section.`;

    const checkLearningQuestions = [
      {
        question: `According to the source text (${sourcePageRange}): "${primarySentence.slice(0, 110)}...", what principle is established?`,
        options: [
          `It defines the core mechanism and relationship for ${entities[0] || 'the section'}.`,
          'It is an empirical approximation with no physical significance.',
          'It applies only when external boundary conditions are ignored.',
          'It is an outdated convention replaced by arbitrary standards.',
        ],
        correctIndex: 0,
        explanation: `Direct quote from text: "${primarySentence}"`,
        misdirectionBreakdown: 'Distractor options contradict the text excerpt.',
        correctAnswer: `It defines the core mechanism and relationship for ${entities[0] || 'the section'}.`,
      },
    ];

    const recallDeck = [
      {
        front: `State the key principle or fact established for ${entities[0] || title} (${sourcePageRange}).`,
        back: secondarySentence.length > 90 ? secondarySentence.slice(0, 90) + '...' : secondarySentence,
        sourceExcerpt: `Direct from source: "${primarySentence.slice(0, 140)}"`,
      },
      {
        front: `What condition or relationship is described in: "${primarySentence.slice(0, 70)}..."?`,
        back: `Governs ${entities.slice(0, 2).join(' and ')} in this section.`,
        sourceExcerpt: `Reference: ${sourcePageRange}`,
      },
    ];

    return {
      milestoneNumber,
      title,
      sourcePageRange,
      sourceHeading,
      summary: {
        compact: compactSummary,
        detailed: detailedSummary,
      },
      coreTopics: entities.length >= 2 ? entities.slice(0, 4) : [title, 'Core Principles', 'Direct Application'],
      checkLearning: checkLearningQuestions,
      recallDeck,
      milestoneTitle: title,
      recallCards: recallDeck,
      checkLearningQuestions,
    };
  });

  return {
    chapterName,
    documentName,
    chapterTitle: chapterName,
    totalSectionsDetected: milestones.length,
    milestones,
    generatedAt: new Date().toISOString(),
    source: 'structured_fallback',
  };
}

function extractKeyTermsFromBlock(text: string, excludeTitle: string): string[] {
  const stopWords = new Set([
    'the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'were', 'which',
    'chapter', 'section', 'page', 'these', 'their', 'there', 'about', 'would', 'could',
    'should', 'using', 'study', 'learn', 'notes', 'review', 'also', 'such', 'into',
  ]);

  const candidateMatches = text.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b/g) || [];
  const freqMap = new Map<string, number>();

  for (const m of candidateMatches) {
    const clean = m.trim();
    if (!stopWords.has(clean.toLowerCase()) && !excludeTitle.toLowerCase().includes(clean.toLowerCase())) {
      freqMap.set(clean, (freqMap.get(clean) || 0) + 1);
    }
  }

  const sorted = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map((e) => e[0]);

  return sorted.slice(0, 4);
}
