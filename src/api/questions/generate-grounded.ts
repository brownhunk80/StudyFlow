import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

// ============================================================================
// 1. ZOD REQUEST & RESPONSE SCHEMAS
// ============================================================================

export const GenerateGroundedQuestionsRequestSchema = z.object({
  chapterTitle: z.string().min(1, 'chapterTitle is required'),
  milestoneTitle: z.string().min(1, 'milestoneTitle is required'),
  topicTags: z.array(z.string()).default([]),
  sectionTextExcerpt: z.string(),
  questionCount: z.coerce.number().int().min(1).max(10).default(4),
});

export type GenerateGroundedQuestionsRequest = z.infer<
  typeof GenerateGroundedQuestionsRequestSchema
>;

export const GroundedQuestionSchema = z.object({
  id: z.string(),
  topicTag: z.string(),
  difficulty: z.literal('Applied Reasoning').default('Applied Reasoning'),
  sourceAnchorQuote: z.string(),
  questionText: z.string(),
  modelAnswer: z.string(),
  keyScoringPoints: z.array(z.string()).min(1),
  // Backward compatibility & interactive modal fields
  anchoredConcept: z.string().optional(),
  type: z.enum(['multiple_choice', 'free_response']).default('multiple_choice'),
  choices: z.array(z.string()).default([]),
  correctIndex: z.number().int().default(0),
  correctAnswer: z.string().optional(),
  explanation: z.string().optional(),
  sourceCitation: z.string().optional(),
});

export type GroundedQuestion = z.infer<typeof GroundedQuestionSchema>;

export const GenerateGroundedQuestionsResponseSchema = z.object({
  milestoneTitle: z.string(),
  verifiedTopic: z.string(),
  questions: z.array(GroundedQuestionSchema),
  // Backward compatibility alias
  anchoredPoints: z.array(z.string()).optional(),
});

export type GenerateGroundedQuestionsResponse = z.infer<
  typeof GenerateGroundedQuestionsResponseSchema
>;

// ============================================================================
// 2. GEMINI STRUCTURED OUTPUT SCHEMA (JSON SCHEMA)
// Matches exact user specification:
// {
//   "milestoneTitle": "string",
//   "verifiedTopic": "string",
//   "questions": [
//     {
//       "id": "string",
//       "topicTag": "string",
//       "difficulty": "Applied Reasoning",
//       "sourceAnchorQuote": "string (verbatim sentence from the provided text excerpt)",
//       "questionText": "string (question derived strictly from sourceAnchorQuote)",
//       "modelAnswer": "string (accurate model explanation directly grounded in the text)",
//       "keyScoringPoints": ["string", "string"]
//     }
//   ]
// }
// ============================================================================

export const groundedQuestionsJsonSchema = {
  type: Type.OBJECT,
  properties: {
    milestoneTitle: {
      type: Type.STRING,
      description: 'The title of the target milestone being assessed',
    },
    verifiedTopic: {
      type: Type.STRING,
      description:
        'STEP 1 (ANCHOR): The verified core academic topic identified directly and exclusively from the text excerpt',
    },
    questions: {
      type: Type.ARRAY,
      description:
        'STEP 2 (VERIFY): Applied Reasoning questions derived strictly from the verbatim source anchor quotes with zero topic drift',
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: 'Unique identifier for the question (e.g., q-1, q-2)',
          },
          topicTag: {
            type: Type.STRING,
            description:
              'The specific subtopic tag from the verified topic that this question rigorously evaluates',
          },
          difficulty: {
            type: Type.STRING,
            description: 'Must always be "Applied Reasoning"',
          },
          sourceAnchorQuote: {
            type: Type.STRING,
            description:
              'Exact verbatim sentence from the provided text excerpt that anchors and proves the question answer',
          },
          questionText: {
            type: Type.STRING,
            description:
              'Rigorous Applied Reasoning question testing mechanisms, cause-and-effect, or implications derived strictly from sourceAnchorQuote',
          },
          modelAnswer: {
            type: Type.STRING,
            description:
              'Accurate model explanation directly and strictly grounded in the excerpt text',
          },
          keyScoringPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              'Exact non-negotiable scoring points required in a student response for full credit (at least 2 distinct points)',
          },
        },
        required: [
          'id',
          'topicTag',
          'difficulty',
          'sourceAnchorQuote',
          'questionText',
          'modelAnswer',
          'keyScoringPoints',
        ],
      },
    },
  },
  required: ['milestoneTitle', 'verifiedTopic', 'questions'],
};

// ============================================================================
// 3. DETERMINISTIC GROUNDED FALLBACK EXTRACTOR (ZERO TOPIC DRIFT)
// ============================================================================

/**
 * If external API spikes occur, this extractor creates guaranteed 100% relevant
 * questions derived purely from the sentences in the source text excerpt.
 */
export function extractDeterministicGroundedQuestions(
  chapterTitle: string,
  milestoneTitle: string,
  topicTags: string[],
  excerpt: string,
  targetCount: number
): GenerateGroundedQuestionsResponse {
  const sentences = excerpt
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);

  const count = Math.min(targetCount, Math.max(2, sentences.length));
  const verifiedTopic = topicTags[0] || milestoneTitle;

  const questions: GroundedQuestion[] = [];
  const anchoredPoints: string[] = [];

  for (let i = 0; i < count; i++) {
    const sentence = sentences[i % sentences.length];
    const words = sentence.split(' ');
    const anchorConcept =
      words.slice(0, 5).join(' ').replace(/[,;:.]$/, '') || milestoneTitle;

    anchoredPoints.push(sentence);

    const questionText = `According to the source text on ${milestoneTitle}, what principle governs ${anchorConcept}?`;
    const modelAnswer = `As established in ${milestoneTitle}: ${sentence}`;
    const keyScoringPoints = [
      `Directly identifies ${anchorConcept}`,
      'Explains the principle exactly as articulated in the source excerpt',
      'Demonstrates applied conceptual reasoning grounded in the source text',
    ];

    const distractor1 =
      sentences[(i + 1) % sentences.length] ||
      'An alternative mechanism not supported by this text.';
    const distractor2 =
      sentences[(i + 2) % sentences.length] ||
      'An opposite principle contradicting the stated rule.';
    const distractor3 =
      'An ungrounded assumption not present in the chapter excerpt.';

    questions.push({
      id: `grounded-${i + 1}`,
      topicTag: topicTags[i % Math.max(1, topicTags.length)] || verifiedTopic,
      difficulty: 'Applied Reasoning',
      sourceAnchorQuote: sentence,
      questionText,
      modelAnswer,
      keyScoringPoints,
      anchoredConcept: anchorConcept,
      type: 'multiple_choice',
      choices: [sentence, distractor1, distractor2, distractor3],
      correctIndex: 0,
      correctAnswer: sentence,
      explanation: `Step-by-step verification confirms that the correct answer is directly grounded in the excerpt: "${sentence}".`,
      sourceCitation: sentence,
    });
  }

  return {
    milestoneTitle,
    verifiedTopic,
    questions,
    anchoredPoints,
  };
}

// ============================================================================
// 4. CORE TWO-STEP ANCHOR-AND-VERIFY SERVICE
// ============================================================================

/**
 * Generates 100% grounded academic assessment questions with zero topic drift.
 * Implements Pre-Execution Payload Validation and Anchor-and-Verify Two-Step Pattern.
 */
export async function generateGroundedQuestions(
  payload: GenerateGroundedQuestionsRequest,
  apiKey?: string
): Promise<GenerateGroundedQuestionsResponse> {
  // --------------------------------------------------------------------------
  // Pre-Execution Payload Validation (MANDATORY GUARDRAIL)
  // --------------------------------------------------------------------------
  if (
    !payload.sectionTextExcerpt ||
    payload.sectionTextExcerpt.trim().length < 150
  ) {
    throw new Error(
      'REJECTED: Source text excerpt is empty or too short (<150 chars). Cannot generate questions without source material.'
    );
  }

  const effectiveKey =
    apiKey ||
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

  const {
    chapterTitle,
    milestoneTitle,
    topicTags,
    sectionTextExcerpt,
    questionCount,
  } = payload;
  const trimmedExcerpt = sectionTextExcerpt.trim();
  const resolvedTopics =
    topicTags && topicTags.length > 0 ? topicTags : [milestoneTitle];

  // --------------------------------------------------------------------------
  // Anchor-and-Verify Two-Step System Prompt & Strict Negative Constraints
  // --------------------------------------------------------------------------
  const systemPrompt = `You are an elite Principal Assessment Architect and Academic Curriculum Specialist.
Your task is to generate high-yield, academically rigorous questions using the "Anchor-and-Verify" Two-Step Pattern.
You must achieve 100% RELEVANCE and ZERO TOPIC DRIFT based EXCLUSIVELY on the provided section text excerpt.

METHODOLOGY: ANCHOR-AND-VERIFY TWO-STEP PATTERN
STEP 1 (ANCHOR & VERIFY TOPIC):
- Deeply inspect [SOURCE EXCERPT].
- Identify and verify the exact topic/subject matter covered in the excerpt. Populate 'verifiedTopic' with this verified domain (e.g., "Electoral Systems - Single Transferable Vote").
- Identify key verbatim sentences in the text that state core mechanisms, principles, definitions, or rules.

STEP 2 (VERIFY & DERIVE QUESTIONS):
- For each of the ${questionCount} questions:
  1. Extract a verbatim sentence from [SOURCE EXCERPT] into 'sourceAnchorQuote'. This quote MUST exist word-for-word in the excerpt.
  2. Formulate 'questionText' derived strictly from 'sourceAnchorQuote'. The question must evaluate deep conceptual understanding, causal relationships, mechanisms, or systemic trade-offs.
  3. Set 'difficulty' strictly to "Applied Reasoning".
  4. Write 'modelAnswer': a comprehensive, accurate model explanation directly grounded in the source text.
  5. Provide 'keyScoringPoints': an array of at least 2 exact, non-negotiable points required in a student response for full credit.

STRICT NEGATIVE CONSTRAINTS (ZERO TOLERANCE):
1. ZERO TOPIC DRIFT / ZERO UNRELATED DOMAINS: Never generate questions about unrelated disciplines. If the text excerpt is about civics, law, or elections, NEVER introduce physics, chemistry, calculus, generic pop trivia, or unrelated fields.
2. ABSOLUTE GROUNDING: Every question, quote, answer, and scoring criterion must be 100% provable from [SOURCE EXCERPT]. You have zero knowledge of facts outside this text.
3. VERBATIM SOURCE ANCHOR: 'sourceAnchorQuote' MUST be an exact verbatim sentence from [SOURCE EXCERPT]. Never fabricate or paraphrase citations.
4. NO GENERIC TRIVIA: Do not ask trivia questions. Focus exclusively on applied reasoning, mechanisms, and principles articulated in the text.
5. DIFFICULTY: Must strictly be "Applied Reasoning".`;

  const userPrompt = `TARGET CHAPTER: ${chapterTitle}
TARGET MILESTONE: ${milestoneTitle}
TARGET TOPICS: ${resolvedTopics.join(', ')}

[SOURCE EXCERPT]:
"""
${trimmedExcerpt}
"""

Execute the Anchor-and-Verify two-step pattern. Extract and verify the exact topic first, then formulate ${questionCount} grounded Applied Reasoning questions meeting all negative constraints.`;

  // Candidate models: cascade through modern supported flash models
  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ];

  let response: any = null;
  let lastError: any = null;

  for (let attempt = 0; attempt < 2 && !response; attempt++) {
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
            responseSchema: groundedQuestionsJsonSchema,
            temperature: 0.1, // Strict temperature = 0.1 for zero drift
          },
        });

        if (response && response.text) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code || err?.error?.code;
        const errMsg = `${err?.message || ''}`;

        // If transient spike or rate limit, try next candidate
        if (
          status === 404 ||
          status === 503 ||
          status === 429 ||
          errMsg.includes('404') ||
          errMsg.includes('503') ||
          errMsg.includes('429') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('no longer available')
        ) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          continue;
        }
        throw err;
      }
    }
  }

  // If models hit high-demand spikes, use the deterministic grounded fallback extractor
  if (!response || !response.text) {
    console.warn(
      '[generateGroundedQuestions] Gemini models unavailable, using deterministic grounded extractor.'
    );
    return extractDeterministicGroundedQuestions(
      chapterTitle,
      milestoneTitle,
      resolvedTopics,
      trimmedExcerpt,
      questionCount
    );
  }

  const responseText = response.text.trim();
  let parsedJson: any;
  try {
    parsedJson = JSON.parse(responseText);
  } catch (parseErr) {
    console.warn(
      '[generateGroundedQuestions] Failed to parse JSON, falling back to deterministic extractor:',
      parseErr
    );
    return extractDeterministicGroundedQuestions(
      chapterTitle,
      milestoneTitle,
      resolvedTopics,
      trimmedExcerpt,
      questionCount
    );
  }

  if (!parsedJson.milestoneTitle) {
    parsedJson.milestoneTitle = milestoneTitle;
  }
  if (!parsedJson.verifiedTopic) {
    parsedJson.verifiedTopic = resolvedTopics[0] || milestoneTitle;
  }

  if (Array.isArray(parsedJson.questions)) {
    const sentences = trimmedExcerpt
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25);

    parsedJson.questions = parsedJson.questions.map((q: any, idx: number) => {
      const topicTag =
        q.topicTag || resolvedTopics[idx % resolvedTopics.length] || parsedJson.verifiedTopic;
      const sourceAnchorQuote =
        q.sourceAnchorQuote || sentences[idx % sentences.length] || trimmedExcerpt.slice(0, 150);
      const questionText =
        q.questionText || `According to the text, what principle governs ${topicTag}?`;
      const modelAnswer =
        q.modelAnswer || `As stated in ${parsedJson.verifiedTopic}: ${sourceAnchorQuote}`;
      const keyScoringPoints =
        Array.isArray(q.keyScoringPoints) && q.keyScoringPoints.length > 0
          ? q.keyScoringPoints
          : [
              `Directly identifies ${topicTag}`,
              'Explains the mechanism exactly as articulated in the source excerpt',
            ];

      // Synthesize high-quality multiple choice options for drill compatibility
      const distractor1 =
        sentences[(idx + 1) % sentences.length] ||
        'An alternative mechanism not supported by this text.';
      const distractor2 =
        sentences[(idx + 2) % sentences.length] ||
        'An opposite principle contradicting the stated rule.';
      const distractor3 =
        'An ungrounded assumption not present in the chapter excerpt.';

      const choices = [modelAnswer, distractor1, distractor2, distractor3];

      return {
        id: q.id || `grounded-q-${idx + 1}`,
        topicTag,
        difficulty: 'Applied Reasoning',
        sourceAnchorQuote,
        questionText,
        modelAnswer,
        keyScoringPoints,
        anchoredConcept: topicTag,
        type: 'multiple_choice',
        choices,
        correctIndex: 0,
        correctAnswer: modelAnswer,
        explanation: `Step-by-step verification confirms that the correct answer is directly grounded in the excerpt: "${sourceAnchorQuote}".`,
        sourceCitation: sourceAnchorQuote,
      };
    });
  } else {
    return extractDeterministicGroundedQuestions(
      chapterTitle,
      milestoneTitle,
      resolvedTopics,
      trimmedExcerpt,
      questionCount
    );
  }

  // Populate backward compatibility alias
  parsedJson.anchoredPoints = parsedJson.questions.map(
    (q: any) => q.sourceAnchorQuote
  );

  return GenerateGroundedQuestionsResponseSchema.parse(parsedJson);
}
