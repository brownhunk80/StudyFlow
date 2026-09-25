import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

// ============================================================================
// 1. ZOD REQUEST & RESPONSE SCHEMAS
// ============================================================================

export const RecallDeckGenerateRequestSchema = z.object({
  chapterTitle: z.string().min(1, 'chapterTitle is required'),
  milestoneTitle: z.string().min(1, 'milestoneTitle is required'),
  sectionTextExcerpt: z.string().optional().default(''),
  cardCount: z.coerce.number().int().min(1).max(20).default(8),
  topicTags: z.array(z.string()).optional(),
});

export type RecallDeckGenerateRequest = z.infer<typeof RecallDeckGenerateRequestSchema>;

export const RecallCardSchema = z.object({
  id: z.string(),
  parentConcept: z.string(),
  promptQuestion: z.string(),
  answer: z.string(),
  cardType: z.enum(['single', 'list']).default('single'),
  listItems: z.array(z.string()).default([]),
  explanation: z.string(),
  sourceQuote: z.string(),
  // Backward compatibility & SM-2 fields
  front: z.string().optional(),
  back: z.string().optional(),
  sourceExcerpt: z.string().optional(),
  topicTag: z.string().optional(),
  interval: z.number().default(1),
  repetition: z.number().default(0),
  easinessFactor: z.number().default(2.5),
});

export type RecallCard = z.infer<typeof RecallCardSchema>;

export const RecallDeckGenerateResponseSchema = z.object({
  milestoneTitle: z.string(),
  cards: z.array(RecallCardSchema),
});

export type RecallDeckGenerateResponse = z.infer<typeof RecallDeckGenerateResponseSchema>;

// ============================================================================
// 2. GEMINI STRUCTURED OUTPUT SCHEMA (JSON SCHEMA)
// ============================================================================

const recallDeckResponseSchema = {
  type: Type.OBJECT,
  properties: {
    milestoneTitle: {
      type: Type.STRING,
      description: 'The title of the target milestone',
    },
    cards: {
      type: Type.ARRAY,
      description: 'RemNote-style active recall flashcards with parent-child structure',
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: 'Unique identifier for the card (e.g., card-1, card-2)',
          },
          parentConcept: {
            type: Type.STRING,
            description:
              'The broader concept or entity header (e.g., "Single Transferable Vote", "First-Past-the-Post System", "Democratic Accountability")',
          },
          promptQuestion: {
            type: Type.STRING,
            description:
              'The specific recall question (e.g., "How do voters express their choices in a Single Transferable Vote (STV) system?")',
          },
          answer: {
            type: Type.STRING,
            description:
              'The concise, direct answer revealed after the prompt (e.g., "By ranking candidates in order of preference")',
          },
          cardType: {
            type: Type.STRING,
            description:
              'Set to "single" for standard Q&A or "list" if testing a series of items',
          },
          listItems: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              'List of items if cardType is "list" (e.g., ["Rajya Sabha", "President", "Vice President"]), otherwise an empty array',
          },
          explanation: {
            type: Type.STRING,
            description:
              'Educational breakdown providing full context so the student understands the underlying mechanism',
          },
          sourceQuote: {
            type: Type.STRING,
            description:
              'Exact verbatim sentence from the text excerpt that proves the answer',
          },
        },
        required: [
          'id',
          'parentConcept',
          'promptQuestion',
          'answer',
          'cardType',
          'listItems',
          'explanation',
          'sourceQuote',
        ],
      },
    },
  },
  required: ['milestoneTitle', 'cards'],
};

// ============================================================================
// 3. FALLBACK EXTRACTOR (RESILIENCE AGAINST 503 SPIKES)
// ============================================================================

function extractFallbackCards(
  milestoneTitle: string,
  excerpt: string,
  targetCount: number
): RecallDeckGenerateResponse {
  const sentences = excerpt
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);

  const cards: RecallCard[] = [];
  const count = Math.min(targetCount, Math.max(3, sentences.length));

  for (let i = 0; i < count; i++) {
    const sentence = sentences[i % sentences.length];
    const words = sentence.split(' ');
    const concept = words.slice(0, 4).join(' ').replace(/[,;:.]$/, '') || milestoneTitle;

    cards.push({
      id: `recall-${i + 1}`,
      parentConcept: milestoneTitle,
      promptQuestion: `According to the source text, what is the core mechanism of ${concept}?`,
      answer: sentence,
      cardType: 'single',
      listItems: [],
      explanation: `Foundational mechanism from ${milestoneTitle}: ${sentence}`,
      sourceQuote: sentence,
      front: `According to the source text, what is the core mechanism of ${concept}?`,
      back: sentence,
      sourceExcerpt: sentence,
      topicTag: milestoneTitle,
      interval: 1,
      repetition: 0,
      easinessFactor: 2.5,
    });
  }

  return {
    milestoneTitle,
    cards,
  };
}

// ============================================================================
// 4. NEXT.JS APP ROUTER ROUTE HANDLER
// ============================================================================

/**
 * Next.js App Router POST Route: /api/recall-deck/generate
 *
 * Dedicated Spaced Repetition Active Recall Deck Generator powered by Gemini Flash API.
 * Formats flashcards in parent-child active-recall structure with strict grounding.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    let rawBody: any;
    try {
      rawBody = await req.json();
    } catch {
      return Response.json(
        {
          error: 'INVALID_JSON',
          message: 'The request body must be valid JSON.',
        },
        { status: 400 }
      );
    }

    // 1. Zod Request Validation
    const parsedRequest = RecallDeckGenerateRequestSchema.safeParse(rawBody);
    if (!parsedRequest.success) {
      return Response.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid request parameters.',
          details: parsedRequest.error.format(),
        },
        { status: 400 }
      );
    }

    const { chapterTitle, milestoneTitle, sectionTextExcerpt, cardCount } =
      parsedRequest.data;

    // 2. Guardrail: Return 400 if sectionTextExcerpt is fewer than 80 characters
    const trimmedExcerpt = (sectionTextExcerpt || '').trim();
    if (!trimmedExcerpt || trimmedExcerpt.length < 80) {
      return Response.json(
        {
          error: 'INVALID_EXCERPT',
          message:
            'No text excerpt provided for this milestone or excerpt is fewer than 80 characters. Please verify document extraction.',
        },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      '';

    if (!apiKey) {
      return Response.json(
        {
          error: 'CONFIGURATION_ERROR',
          message: 'GEMINI_API_KEY is not configured on the server.',
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // 3. System Prompt & Strict RemNote-style Constraints
    const systemPrompt = `You are an active-recall flashcard curriculum specialist. Extract ${cardCount} high-yield flashcards based EXCLUSIVELY on the provided section text excerpt.

STRICT FORMATTING RULES:
1. Parent Concept & Child Prompt: Every card must have:
   - 'parentConcept': The broader concept or entity header (e.g., 'Single Transferable Vote', 'First-Past-the-Post System', 'Democratic Accountability').
   - 'promptQuestion': The specific recall question (e.g., 'How do voters express their choices in a Single Transferable Vote (STV) system?').
   - 'answer': The concise, direct answer revealed after the prompt (e.g., 'By ranking candidates in order of preference').
   - 'cardType': 'single' (standard Q&A) or 'list' (e.g., asking for 2 or 3 items, where list items are hidden).
   - 'listItems': string[] (if cardType is 'list', e.g., ['Rajya Sabha', 'President', 'Vice President']).
2. In-Depth Explanation: Provide an educational breakdown in 'explanation' that gives full context so the student understands the mechanism.
3. Verbatim Source Citation: In 'sourceQuote', provide the exact sentence from the text excerpt that proves the answer.
4. Pure Grounding: Never pull facts from outside the excerpt.`;

    const userPrompt = `TARGET CHAPTER: ${chapterTitle}
TARGET MILESTONE: ${milestoneTitle}

[SECTION TEXT EXCERPT]:
"""
${trimmedExcerpt}
"""

Extract exactly ${cardCount} high-yield active-recall flashcards strictly matching the schema and formatting rules above.`;

    // Prioritize active flash models with graceful multi-model fallback
    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ];

    let response: any = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }],
            },
          ],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: recallDeckResponseSchema,
            temperature: 0.2,
          },
        });

        if (response && response.text) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code || err?.error?.code;
        let errMsg = `${err?.message || ''}`;
        try {
          errMsg += ' ' + JSON.stringify(err);
        } catch {
          // ignore
        }

        if (
          status === 404 ||
          status === 503 ||
          status === 429 ||
          errMsg.includes('404') ||
          errMsg.includes('503') ||
          errMsg.includes('429') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('not found') ||
          errMsg.includes('no longer available') ||
          errMsg.includes('RESOURCE_EXHAUSTED')
        ) {
          await new Promise((res) => setTimeout(res, 250));
          continue;
        }
        throw err;
      }
    }

    // If models are unavailable due to API spike, use intelligent deterministic grounding fallback
    if (!response || !response.text) {
      const fallbackDeck = extractFallbackCards(milestoneTitle, trimmedExcerpt, cardCount);
      return Response.json(fallbackDeck, { status: 200 });
    }

    const responseText = response.text.trim();
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(responseText);
    } catch (parseErr) {
      console.warn('[RecallDeckGenerate] Failed to parse JSON response, using grounded fallback:', parseErr);
      const fallbackDeck = extractFallbackCards(milestoneTitle, trimmedExcerpt, cardCount);
      return Response.json(fallbackDeck, { status: 200 });
    }

    if (!parsedJson.milestoneTitle) {
      parsedJson.milestoneTitle = milestoneTitle;
    }

    if (Array.isArray(parsedJson.cards)) {
      parsedJson.cards = parsedJson.cards.map((card: any, idx: number) => {
        const parentConcept = card.parentConcept || milestoneTitle;
        const promptQuestion = card.promptQuestion || card.front || `Core principle of ${parentConcept}?`;
        const answer = card.answer || card.back || 'Factual mechanism as outlined in the text.';
        const cardType = card.cardType === 'list' ? 'list' : 'single';
        const listItems = Array.isArray(card.listItems) ? card.listItems : [];
        const explanation =
          card.explanation ||
          'Foundational educational principle necessary for conceptual mastery.';
        const sourceQuote = card.sourceQuote || card.sourceExcerpt || '';

        return {
          id: card.id || `card-${idx + 1}`,
          parentConcept,
          promptQuestion,
          answer,
          cardType,
          listItems,
          explanation,
          sourceQuote,
          // Backward-compatible properties for runners
          front: promptQuestion,
          back: answer,
          sourceExcerpt: sourceQuote,
          topicTag: parentConcept,
          interval: typeof card.interval === 'number' ? card.interval : 1,
          repetition: typeof card.repetition === 'number' ? card.repetition : 0,
          easinessFactor: typeof card.easinessFactor === 'number' ? card.easinessFactor : 2.5,
        };
      });
    }

    // 4. Validate output against response schema
    const validatedResult = RecallDeckGenerateResponseSchema.parse(parsedJson);

    return Response.json(validatedResult, { status: 200 });
  } catch (error: any) {
    console.error('Error in POST /api/recall-deck/generate:', error);
    const status = typeof error?.status === 'number' ? error.status : 500;
    return Response.json(
      {
        error: error?.code || 'GENERATION_ERROR',
        message: error?.message || 'Failed to generate recall deck cards.',
      },
      { status }
    );
  }
}
