import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

// ============================================================================
// 1. ZOD REQUEST & RESPONSE SCHEMAS
// ============================================================================

export const CheckLearningGenerateRequestSchema = z.object({
  chapterTitle: z.string().min(1, 'chapterTitle is required'),
  milestoneTitle: z.string().min(1, 'milestoneTitle is required'),
  topicTags: z.array(z.string()).min(1, 'At least one topic tag is required'),
  sectionTextExcerpt: z.string().optional().default(''),
  questionCount: z.coerce.number().int().min(1).max(10).default(4),
});

export type CheckLearningGenerateRequest = z.infer<typeof CheckLearningGenerateRequestSchema>;

export const CheckLearningQuestionSchema = z.object({
  id: z.string(),
  topicTag: z.string(),
  difficulty: z.literal('Applied Reasoning').default('Applied Reasoning'),
  questionText: z.string().min(1),
  modelAnswer: z.string().min(1),
  keyScoringPoints: z.array(z.string()).min(1),
  sourceCitation: z.string().min(1),
});

export type CheckLearningQuestion = z.infer<typeof CheckLearningQuestionSchema>;

export const CheckLearningGenerateResponseSchema = z.object({
  milestoneTitle: z.string(),
  questions: z.array(CheckLearningQuestionSchema),
});

export type CheckLearningGenerateResponse = z.infer<typeof CheckLearningGenerateResponseSchema>;

// ============================================================================
// 2. GEMINI STRUCTURED OUTPUT SCHEMA (JSON SCHEMA)
// ============================================================================

const checkLearningResponseSchema = {
  type: Type.OBJECT,
  properties: {
    milestoneTitle: {
      type: Type.STRING,
      description: 'The title of the milestone being evaluated',
    },
    questions: {
      type: Type.ARRAY,
      description: 'Accurate, rigorous conceptual questions based strictly on the source excerpt',
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: 'Unique identifier for the question (e.g., q-1, q-2)',
          },
          topicTag: {
            type: Type.STRING,
            description: 'The specific subtopic tag from topicTags that this question tests',
          },
          difficulty: {
            type: Type.STRING,
            description: 'Must always be "Applied Reasoning"',
          },
          questionText: {
            type: Type.STRING,
            description: 'The analytical or application question testing understanding, principles, and causes',
          },
          modelAnswer: {
            type: Type.STRING,
            description: 'Comprehensive, rigorous model answer explaining underlying mechanisms',
          },
          keyScoringPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Specific criteria or points needed for full credit',
          },
          sourceCitation: {
            type: Type.STRING,
            description: 'Direct verbatim citation quote from the excerpt justifying the model answer',
          },
        },
        required: [
          'id',
          'topicTag',
          'difficulty',
          'questionText',
          'modelAnswer',
          'keyScoringPoints',
          'sourceCitation',
        ],
      },
    },
  },
  required: ['milestoneTitle', 'questions'],
};

// ============================================================================
// 3. NEXT.JS APP ROUTER ROUTE HANDLER
// ============================================================================

/**
 * Next.js App Router POST Route: /api/check-learning/generate
 *
 * Dedicated academic assessment question generator powered by the Gemini API.
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
    const parsedRequest = CheckLearningGenerateRequestSchema.safeParse(rawBody);
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

    const { chapterTitle, milestoneTitle, topicTags, sectionTextExcerpt, questionCount } =
      parsedRequest.data;

    // 2. Strict Guardrail: Check text excerpt length
    // If sectionTextExcerpt is empty, undefined, or fewer than 60 characters, immediately return 400 error
    const trimmedExcerpt = (sectionTextExcerpt || '').trim();
    if (!trimmedExcerpt || trimmedExcerpt.length < 60) {
      return Response.json(
        {
          error: 'No source text provided for this milestone. Please verify the document extraction.',
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

    // 3. System Prompt & Strict Negative Prompting Grounding Rules
    const systemPrompt = `You are an academic assessment designer. Your objective is to create ${questionCount} accurate, rigorous conceptual questions based SOLELY on the provided source excerpt.

CRITICAL INSTRUCTIONS:
- Grounding: Base every question strictly on the text provided in [SOURCE EXCERPT]. Do NOT use external world knowledge or topics from other subjects.
- Topic Alignment: All questions must directly test concepts under '${milestoneTitle}' and the topics: ${topicTags.join(', ')}.
- No Hallucinated Domains: If the text is about civics, law, or elections, never introduce physics, math, or chemistry problems.
- Quality: Formulate analytical/application questions that test understanding, principles, and causes rather than shallow keyword matching.
- Citations: Provide a direct citation quote from the excerpt justifying the model answer.`;

    const userPrompt = `[CHAPTER TITLE]: ${chapterTitle}
[MILESTONE TITLE]: ${milestoneTitle}
[TOPIC TAGS]: ${topicTags.join(', ')}

[SOURCE EXCERPT]:
"""
${trimmedExcerpt}
"""

Formulate exactly ${questionCount} rigorous validation questions testing understanding of the provided excerpt. Ensure difficulty is "Applied Reasoning" and every question includes verbatim sourceCitation.`;

    // Candidate models: start with gemini-3.8-flash, with fallback to active flash models
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
            responseSchema: checkLearningResponseSchema,
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
          errMsg.includes('no longer available')
        ) {
          console.warn(`[CheckLearningGenerate] Model ${model} returned error, falling back...`);
          continue;
        }
        throw err;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Failed to generate response from Gemini API.');
    }

    const responseText = response.text.trim();
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('[CheckLearningGenerate] Failed to parse JSON response:', parseErr);
      return Response.json(
        {
          error: 'PARSE_ERROR',
          message: 'The model failed to produce valid structured JSON.',
        },
        { status: 502 }
      );
    }

    if (!parsedJson.milestoneTitle) {
      parsedJson.milestoneTitle = milestoneTitle;
    }

    if (Array.isArray(parsedJson.questions)) {
      parsedJson.questions = parsedJson.questions.map((q: any, idx: number) => ({
        id: q.id || `q-${idx + 1}`,
        topicTag: q.topicTag || topicTags[idx % topicTags.length] || milestoneTitle,
        difficulty: 'Applied Reasoning',
        questionText: q.questionText || '',
        modelAnswer: q.modelAnswer || '',
        keyScoringPoints:
          Array.isArray(q.keyScoringPoints) && q.keyScoringPoints.length > 0
            ? q.keyScoringPoints
            : ['Demonstrate accurate understanding of foundational principles.'],
        sourceCitation: q.sourceCitation || '',
      }));
    }

    // 4. Validate output against response schema
    const validatedResult = CheckLearningGenerateResponseSchema.parse(parsedJson);

    return Response.json(validatedResult, { status: 200 });
  } catch (error: any) {
    console.error('Error in POST /api/check-learning/generate:', error);
    const status = typeof error?.status === 'number' ? error.status : 500;
    return Response.json(
      {
        error: error?.code || 'GENERATION_ERROR',
        message: error?.message || 'Failed to generate validation questions.',
      },
      { status }
    );
  }
}
