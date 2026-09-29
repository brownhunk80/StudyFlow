import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { isHindiSubject, getHindiPromptDirectives } from '../../utils/hindiDetection';

// =============================================================
// 1. ZOD VALIDATION SCHEMAS
// =============================================================

export const CheckLearningGenerateRequestSchema = z.object({
  chapterTitle: z.string().min(1, 'chapterTitle is required'),
  milestoneTitle: z.string().min(1, 'milestoneTitle is required'),
  topicTags: z.array(z.string()).min(1, 'At least one topic tag is required'),
  sectionTextExcerpt: z.string().optional().default(''),
  questionCount: z.coerce.number().int().min(1).max(10).default(4),
  subjectName: z.string().optional(),
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

// =============================================================
// 2. GEMINI STRUCTURED OUTPUT SCHEMA (JSON SCHEMA)
// =============================================================

const checkLearningResponseSchema = {
  type: Type.OBJECT,
  properties: {
    milestoneTitle: {
      type: Type.STRING,
      description: 'The title of the milestone being assessed',
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
            description: '3 to 5 critical conceptual criteria required for full credit',
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

// =============================================================
// 3. CORE GENERATION SERVICE FUNCTION
// =============================================================

export async function generateCheckLearningQuestions(
  input: CheckLearningGenerateRequest
): Promise<CheckLearningGenerateResponse> {
  const { chapterTitle, milestoneTitle, topicTags, sectionTextExcerpt, questionCount } = input;

  const effectiveKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    '';

  if (!effectiveKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const ai = new GoogleGenAI({
    apiKey: effectiveKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const isHindi = isHindiSubject((input as any).subjectName || (input as any).subject, chapterTitle, `${milestoneTitle} ${sectionTextExcerpt}`);
  const hindiDirective = isHindi
    ? `\n${getHindiPromptDirectives(chapterTitle)}\n- CRITICAL MANDATORY INSTRUCTION: You MUST formulate all questions, modelAnswers, keyScoringPoints, and sourceCitations completely in standard Hindi (Devanagari script, शुद्ध हिन्दी). Do NOT use English.`
    : '';

  // Strict negative prompting and academic assessment grounding instructions
  const systemPrompt = `You are an academic assessment designer. Your objective is to create ${questionCount} accurate, rigorous conceptual questions based SOLELY on the provided source excerpt.${hindiDirective}

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
${sectionTextExcerpt}
"""

Formulate exactly ${questionCount} rigorous validation questions testing understanding of the provided excerpt. Ensure difficulty is "Applied Reasoning" and every question includes verbatim sourceCitation.${
    isHindi
      ? ' All text must be in pure Devanagari Hindi.'
      : ''
  }`;

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
            parts: [
              {
                text: userPrompt,
              },
            ],
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
        errMsg.includes('no longer available') ||
        errMsg.includes('RESOURCE_EXHAUSTED')
      ) {
        await new Promise((res) => setTimeout(res, 250));
        continue;
      }
      throw err;
    }
  }

  if (!response || !response.text) {
    console.warn('[CheckLearningGenerate] Gemini models unavailable, using grounded excerpt fallback');
    return extractFallbackCheckLearning(chapterTitle, milestoneTitle, topicTags, sectionTextExcerpt, questionCount, (input as any).subjectName || (input as any).subject);
  }

  const responseText = response.text?.trim();
  if (!responseText) {
    return extractFallbackCheckLearning(chapterTitle, milestoneTitle, topicTags, sectionTextExcerpt, questionCount, (input as any).subjectName || (input as any).subject);
  }

  let parsedJson: any;
  try {
    parsedJson = JSON.parse(responseText);
  } catch (err: any) {
    console.error('[CheckLearningGenerate] JSON parse error, using grounded fallback:', err);
    return extractFallbackCheckLearning(chapterTitle, milestoneTitle, topicTags, sectionTextExcerpt, questionCount, (input as any).subjectName || (input as any).subject);
  }

  // Ensure milestoneTitle is present in response
  if (!parsedJson.milestoneTitle) {
    parsedJson.milestoneTitle = milestoneTitle;
  }

  // Ensure question items adhere to expected difficulty
  if (Array.isArray(parsedJson.questions)) {
    parsedJson.questions = parsedJson.questions.map((q: any, idx: number) => ({
      id: q.id || `q-${idx + 1}`,
      topicTag: q.topicTag || topicTags[idx % topicTags.length] || milestoneTitle,
      difficulty: 'Applied Reasoning',
      questionText: q.questionText || '',
      modelAnswer: q.modelAnswer || '',
      keyScoringPoints: Array.isArray(q.keyScoringPoints) && q.keyScoringPoints.length > 0
        ? q.keyScoringPoints
        : ['Demonstrate accurate understanding of foundational principles.', 'Cite direct textual evidence.'],
      sourceCitation: q.sourceCitation || '',
    }));
  }

  // Final schema validation with Zod
  const validatedResponse = CheckLearningGenerateResponseSchema.parse(parsedJson);
  return validatedResponse;
}

function extractFallbackCheckLearning(
  chapterTitle: string,
  milestoneTitle: string,
  topicTags: string[],
  excerpt: string,
  count: number,
  subjectName?: string
): CheckLearningGenerateResponse {
  const isHindi = isHindiSubject(subjectName, chapterTitle, `${milestoneTitle} ${excerpt}`);
  const clean = excerpt.replace(/\[Page\s+\d+\]/gi, '').trim();
  const sentences = clean
    .split(/(?<=[.!?।])\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && !s.startsWith('#'));

  const questions: CheckLearningQuestion[] = [];
  const targetCount = Math.min(count, Math.max(2, sentences.length));

  for (let i = 0; i < targetCount; i++) {
    const sentence = sentences[i % sentences.length] || clean.slice(0, 100);
    const tag = topicTags[i % topicTags.length] || milestoneTitle;

    questions.push({
      id: `q-${i + 1}`,
      topicTag: tag,
      difficulty: 'Applied Reasoning',
      questionText: isHindi
        ? `पाठ '${chapterTitle}' के इस अंश (${milestoneTitle}) के अनुसार: "${sentence.slice(0, 75)}..." का क्या मुख्य संदर्भ है?`
        : `According to the source text (${milestoneTitle}), what is the primary significance of: "${sentence.slice(0, 75)}..."?`,
      modelAnswer: isHindi
        ? `पाठ्यांश के अनुसार: "${sentence}"`
        : `As established in the text: "${sentence}"`,
      keyScoringPoints: isHindi
        ? [
            `'${tag}' का सटीक संदर्भ स्पष्ट करना`,
            'पाठ की मूल पंक्ति का उल्लेख करना',
            'मानक हिन्दी में उत्तर लेखन',
          ]
        : [
            `Identifies ${tag} accurately`,
            'Cites exact text from the source excerpt',
            'Explains core mechanism clearly',
          ],
      sourceCitation: sentence,
    });
  }

  return {
    milestoneTitle,
    questions,
  };
}
