import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { isHindiSubject } from '../../utils/hindiDetection';

export const VoiceRecallEvaluationRequestSchema = z.object({
  cardId: z.string().optional(),
  front: z.string().min(1, 'front prompt is required'),
  back: z.string().min(1, 'back answer is required'),
  notes: z.string().optional().default(''),
  explanation: z.string().optional().default(''),
  subject: z.string().optional().default('General'),
  chapter: z.string().optional().default(''),
  spokenTranscript: z.string().min(1, 'spokenTranscript is required'),
});

export type VoiceRecallEvaluationRequest = z.infer<typeof VoiceRecallEvaluationRequestSchema>;

export const VoiceRecallEvaluationResponseSchema = z.object({
  accuracyScore: z.number().int().min(0).max(100),
  verdict: z.enum(['mastered', 'good', 'hard', 'again']),
  verdictLabel: z.string(),
  instantFeedback: z.string(),
  keyPointsCovered: z.array(z.string()),
  keyPointsMissed: z.array(z.string()),
  suggestedRating: z.enum(['again', 'hard', 'good', 'easy']),
  spokenTranscript: z.string(),
});

export type VoiceRecallEvaluationResponse = z.infer<typeof VoiceRecallEvaluationResponseSchema>;

const evaluationSchema = {
  type: Type.OBJECT,
  properties: {
    accuracyScore: {
      type: Type.INTEGER,
      description: 'Accuracy score from 0 (completely wrong/unrelated) to 100 (flawless complete answer)',
    },
    verdict: {
      type: Type.STRING,
      description: 'Verdict category: "mastered" (90-100), "good" (75-89), "hard" (50-74), or "again" (0-49)',
    },
    verdictLabel: {
      type: Type.STRING,
      description: 'Short punchy label, e.g., "Spot on!", "Solid Recall", "Partially Correct", "Needs Review"',
    },
    instantFeedback: {
      type: Type.STRING,
      description: '1-2 concise, conversational sentences highlighting what the student got right and any key nuances they missed.',
    },
    keyPointsCovered: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Core concepts, terms, or relations the student correctly mentioned',
    },
    keyPointsMissed: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key terms, conditions, or distinctions from the model answer that were omitted',
    },
    suggestedRating: {
      type: Type.STRING,
      description: 'SM-2 rating recommendation: "easy" (score >= 90), "good" (score >= 75), "hard" (score >= 50), or "again" (score < 50)',
    },
  },
  required: [
    'accuracyScore',
    'verdict',
    'verdictLabel',
    'instantFeedback',
    'keyPointsCovered',
    'keyPointsMissed',
    'suggestedRating',
  ],
};

export async function evaluateVoiceAnswer(
  params: VoiceRecallEvaluationRequest,
  apiKey?: string
): Promise<VoiceRecallEvaluationResponse> {
  const { front, back, notes, explanation, subject, chapter, spokenTranscript } = params;

  const key = apiKey || process.env.GEMINI_API_KEY || '';
  if (key) {
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const isHindi = isHindiSubject(subject, chapter, `${front} ${back} ${spokenTranscript}`);
    const hindiInstruction = isHindi
      ? `\n- HINDI CURRICULUM DIRECTIVE: The subject/flashcard is in Hindi. All feedback (instantFeedback, verdictLabel, keyPointsCovered, keyPointsMissed) MUST be written in natural, fluent Devanagari Hindi (शुद्ध हिन्दी). Do NOT critique the student for speaking in Hindi.`
      : '';

    const systemInstruction = `You are a supportive, high-precision academic tutor evaluating a student's spoken verbal response to an active recall flashcard.${hindiInstruction}

Your task:
1. Compare the student's spoken transcript against the flashcard prompt and model reference answer.
2. Evaluate conceptual correctness rather than requiring exact verbatim word-for-word repetition. If the student explained the concept accurately in their own words, award high marks.
3. Check for essential scientific/factual accuracy, invariant laws, boundary conditions, or definitions.
4. Provide immediate, constructive feedback that is encouraging yet academically rigorous.
5. Suggest the appropriate SM-2 rating:
   - score >= 90: "easy" (effortless mastery)
   - score >= 75: "good" (correctly remembered core idea)
   - score >= 50: "hard" (partially recalled with notable gaps)
   - score < 50: "again" (incorrect or missing fundamental idea)`;

    const userPrompt = `SUBJECT: ${subject} ${chapter ? `(${chapter})` : ''}
FLASHCARD QUESTION: "${front}"
MODEL REFERENCE ANSWER: "${back}"
${notes ? `ADDITIONAL NOTES: "${notes}"` : ''}
${explanation ? `EXPLANATION: "${explanation}"` : ''}

STUDENT'S SPOKEN TRANSCRIPT:
"${spokenTranscript}"

Evaluate the accuracy and provide instant feedback matching the JSON schema.`;

    const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: evaluationSchema,
            temperature: 0.1,
          },
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text.trim());
          const validated = VoiceRecallEvaluationResponseSchema.safeParse({
            ...parsed,
            spokenTranscript,
          });
          if (validated.success) {
            return validated.data;
          }
        }
      } catch (err: any) {
        const isQuotaOrRateLimit =
          err?.status === 429 ||
          err?.code === 429 ||
          `${err?.message}`.includes('429') ||
          `${err?.message}`.includes('RESOURCE_EXHAUSTED') ||
          `${err?.message}`.includes('Quota exceeded');

        if (isQuotaOrRateLimit) {
          console.warn(`[evaluateVoiceAnswer] Model ${model} rate limit reached (429), checking next fallback.`);
          await new Promise((resolve) => setTimeout(resolve, 150));
        } else {
          console.warn(`[evaluateVoiceAnswer] Model ${model} unavailable (${err?.message || 'error'}), checking fallback.`);
        }
      }
    }
  }

  // Resilient heuristic fallback if AI is rate-limited or offline
  return fallbackEvaluation(front, back, spokenTranscript);
}

function fallbackEvaluation(
  front: string,
  back: string,
  spokenTranscript: string
): VoiceRecallEvaluationResponse {
  const normSpoken = spokenTranscript.toLowerCase().replace(/[^\w\s]/g, ' ');
  const normBack = back.toLowerCase().replace(/[^\w\s]/g, ' ');

  const backWords = Array.from(
    new Set(
      normBack
        .split(/\s+/)
        .filter((w) => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'been', 'which', 'what', 'when', 'under', 'these'].includes(w))
    )
  );

  const spokenWords = new Set(normSpoken.split(/\s+/));
  const matched = backWords.filter((w) => spokenWords.has(w));
  const matchRatio = backWords.length > 0 ? matched.length / backWords.length : 0.5;

  let accuracyScore = Math.round(matchRatio * 100);
  if (normSpoken.length > 20 && matchRatio > 0.4) {
    accuracyScore = Math.min(100, Math.max(70, accuracyScore + 20));
  } else if (normSpoken.length < 10) {
    accuracyScore = Math.min(40, accuracyScore);
  }

  let verdict: 'mastered' | 'good' | 'hard' | 'again' = 'good';
  let verdictLabel = 'Good Recall';
  let suggestedRating: 'again' | 'hard' | 'good' | 'easy' = 'good';

  if (accuracyScore >= 88) {
    verdict = 'mastered';
    verdictLabel = 'Excellent Recall! 🌟';
    suggestedRating = 'easy';
  } else if (accuracyScore >= 70) {
    verdict = 'good';
    verdictLabel = 'Solid Answer 👍';
    suggestedRating = 'good';
  } else if (accuracyScore >= 45) {
    verdict = 'hard';
    verdictLabel = 'Partially Correct ⚠️';
    suggestedRating = 'hard';
  } else {
    verdict = 'again';
    verdictLabel = 'Needs Review 🔄';
    suggestedRating = 'again';
  }

  return {
    accuracyScore,
    verdict,
    verdictLabel,
    instantFeedback:
      accuracyScore >= 75
        ? `Great explanation! You accurately communicated the core concept of "${front}".`
        : `You captured parts of the concept, but review the reference answer to cement key mechanisms.`,
    keyPointsCovered: matched.slice(0, 4),
    keyPointsMissed: backWords.filter((w) => !spokenWords.has(w)).slice(0, 3),
    suggestedRating,
    spokenTranscript,
  };
}
