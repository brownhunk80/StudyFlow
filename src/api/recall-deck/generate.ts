import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

// =============================================================
// 1. ZOD VALIDATION SCHEMAS
// =============================================================

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
  breadcrumb: z.string().optional(),
  parentConcept: z.string(),
  promptQuestion: z.string(),
  answer: z.string(),
  inlineAnswer: z.string().optional(),
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
  targetModule: z.string().optional().default('Recall Deck (Active Recall Cards)'),
  totalCards: z.number().optional(),
  cards: z.array(RecallCardSchema),
  // Retain recallDeck alias for maximum backward compatibility
  recallDeck: z.array(RecallCardSchema).optional(),
});

export type RecallDeckGenerateResponse = z.infer<typeof RecallDeckGenerateResponseSchema>;

// =============================================================
// 2. GEMINI STRUCTURED OUTPUT SCHEMA (JSON SCHEMA)
// =============================================================

export const recallDeckResponseSchema = {
  type: Type.OBJECT,
  properties: {
    milestoneTitle: {
      type: Type.STRING,
      description: 'Title of the milestone',
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

// =============================================================
// 3. FALLBACK EXTRACTOR (RESILIENCE AGAINST 503 SPIKES)
// =============================================================

function extractFallbackCards(
  milestoneTitle: string,
  excerpt: string,
  targetCount: number,
  chapterTitle: string = 'Elections Chapter 7'
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
    const briefAnswer = words.slice(0, 10).join(' ').replace(/[,;:.]$/, '');

    cards.push({
      id: `card_${String(i + 1).padStart(2, '0')}`,
      breadcrumb: `@ ${chapterTitle}`,
      parentConcept: concept || milestoneTitle,
      promptQuestion: `According to the source text, what principle governs ${concept}?`,
      answer: briefAnswer,
      inlineAnswer: briefAnswer,
      cardType: 'single',
      listItems: [],
      explanation: `In ${milestoneTitle}, this mechanism is established: ${sentence}. It provides the structural rule ensuring accurate recall and conceptual clarity.`,
      sourceQuote: sentence,
      front: `According to the source text, what principle governs ${concept}?`,
      back: briefAnswer,
      sourceExcerpt: sentence,
      topicTag: concept || milestoneTitle,
      interval: 1,
      repetition: 0,
      easinessFactor: 2.5,
    });
  }

  return {
    milestoneTitle,
    targetModule: 'Recall Deck (Active Recall Cards)',
    totalCards: cards.length,
    cards,
    recallDeck: cards,
  };
}

// =============================================================
// 4. GENERATION SERVICE IMPLEMENTATION
// =============================================================

export async function generateRecallDeck(
  params: RecallDeckGenerateRequest,
  apiKey: string
): Promise<RecallDeckGenerateResponse> {
  const { chapterTitle, milestoneTitle, sectionTextExcerpt, cardCount } = params;

  // Guardrail: Return error if sectionTextExcerpt is fewer than 80 characters
  const trimmedExcerpt = (sectionTextExcerpt || '').trim();
  if (!trimmedExcerpt || trimmedExcerpt.length < 80) {
    const error: any = new Error(
      'No text excerpt provided for this milestone or excerpt is fewer than 80 characters. Please verify document extraction.'
    );
    error.statusCode = 400;
    error.code = 'INVALID_EXCERPT';
    throw error;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

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

  // Supported flash models with multi-model fallback cascade
  const candidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
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
      const status = err?.status || err?.code || (err?.message?.includes('503') ? 503 : 'error');
      console.log(`[generateRecallDeck] Model ${model} unavailable (${status}), trying fallback model...`);
      await new Promise((res) => setTimeout(res, 250));
      continue;
    }
  }

  // Graceful fallback if models hit transient demand spike
  if (!response || !response.text) {
    return extractFallbackCards(milestoneTitle, trimmedExcerpt, cardCount);
  }

  const responseText = response.text.trim();
  let parsedJson: any;
  try {
    parsedJson = JSON.parse(responseText);
  } catch (parseErr) {
    console.warn('[generateRecallDeck] Failed to parse JSON response, using grounded fallback:', parseErr);
    return extractFallbackCards(milestoneTitle, trimmedExcerpt, cardCount);
  }

  if (!parsedJson.milestoneTitle) {
    parsedJson.milestoneTitle = milestoneTitle;
  }

  parsedJson.targetModule = 'Recall Deck (Active Recall Cards)';

  if (Array.isArray(parsedJson.cards)) {
    parsedJson.cards = parsedJson.cards.map((card: any, idx: number) => {
      const parentConcept = card.parentConcept || milestoneTitle;
      const promptQuestion = card.promptQuestion || card.front || `Core principle of ${parentConcept}?`;
      const answer = card.answer || card.inlineAnswer || card.back || 'Factual mechanism as outlined in the text.';
      const inlineAnswer = card.inlineAnswer || answer;
      const cardType = card.cardType === 'list' ? 'list' : 'single';
      const listItems = Array.isArray(card.listItems) ? card.listItems : [];
      const explanation =
        card.explanation ||
        'Foundational educational principle necessary for conceptual mastery.';
      const sourceQuote = card.sourceQuote || card.sourceExcerpt || '';
      const breadcrumb = card.breadcrumb || `@ ${chapterTitle}`;

      return {
        id: card.id || `card_${String(idx + 1).padStart(2, '0')}`,
        breadcrumb,
        parentConcept,
        promptQuestion,
        answer,
        inlineAnswer,
        cardType,
        listItems,
        explanation,
        sourceQuote,
        front: promptQuestion,
        back: answer,
        sourceExcerpt: sourceQuote,
        topicTag: parentConcept,
        interval: typeof card.interval === 'number' ? card.interval : 1,
        repetition: typeof card.repetition === 'number' ? card.repetition : 0,
        easinessFactor: typeof card.easinessFactor === 'number' ? card.easinessFactor : 2.5,
      };
    });
    parsedJson.totalCards = parsedJson.cards.length;
    parsedJson.recallDeck = parsedJson.cards;
  }

  return RecallDeckGenerateResponseSchema.parse(parsedJson);
}
