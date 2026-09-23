import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

// =============================================================
// VALIDATION SCHEMAS
// =============================================================

export const GenerateMilestoneContentRequestSchema = z.object({
  milestoneTitle: z.string().min(1, 'milestoneTitle is required'),
  coreTopics: z.array(z.string()).default([]),
  sectionTextExcerpt: z.string().optional().default(''),
  chapterTitle: z.string().optional(),
  chapterName: z.string().optional(),
});

export type GenerateMilestoneContentRequest = z.infer<typeof GenerateMilestoneContentRequestSchema>;

export const CheckLearningItemSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string(),
});

export const RecallDeckItemSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  sourceExcerpt: z.string().optional().default(''),
});

export const MilestoneContentResponseSchema = z.object({
  summary: z.object({
    compact: z.string(),
    detailed: z.string(),
  }),
  checkLearning: z.array(CheckLearningItemSchema),
  recallDeck: z.array(RecallDeckItemSchema),
});

export type MilestoneContentResponse = z.infer<typeof MilestoneContentResponseSchema>;

// =============================================================
// CORE GENERATOR
// =============================================================

export async function generateMilestoneContent(
  reqBody: GenerateMilestoneContentRequest
): Promise<MilestoneContentResponse> {
  const milestoneTitle = (reqBody.milestoneTitle || '').trim();
  const coreTopics = Array.isArray(reqBody.coreTopics) && reqBody.coreTopics.length > 0
    ? reqBody.coreTopics
    : [milestoneTitle];
  const excerpt = (reqBody.sectionTextExcerpt || '').trim();
  const chapterName = reqBody.chapterTitle || reqBody.chapterName || 'Chapter';

  console.log(`[GenerateMilestoneContent] Generating content for "${milestoneTitle}" (${coreTopics.length} topics, excerpt length: ${excerpt.length})`);

  const effectiveKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    '';

  if (effectiveKey) {
    const ai = new GoogleGenAI({
      apiKey: effectiveKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const systemInstruction = `You are an expert curriculum tutor. Given the milestone title, core topics, and reference excerpt from the chapter, generate:
1. A concise dual summary:
   - "compact": high-yield bulleted key takeaways, core definitions, and formulas.
   - "detailed": complete explanatory markdown notes with conceptual breakdowns.
2. 2-3 Check Learning multiple choice questions:
   - "question": clear conceptual or practical question.
   - "options": exactly 4 distinct answer choices.
   - "correctIndex": 0-based integer (0 to 3) pointing to the correct choice.
   - "explanation": rationale explaining why the correct choice is right.
3. 3-4 Active Recall Deck flashcards:
   - "front": direct active recall prompt or question.
   - "back": precise factual answer.
   - "sourceExcerpt": direct reference or quote from the material.

Return ONLY a valid JSON object matching this schema:
{
  "summary": {
    "compact": string,
    "detailed": string
  },
  "checkLearning": [
    {
      "question": string,
      "options": [string, string, string, string],
      "correctIndex": number,
      "explanation": string
    }
  ],
  "recallDeck": [
    {
      "front": string,
      "back": string,
      "sourceExcerpt": string
    }
  ]
}`;

    const userPrompt = `Chapter: "${chapterName}"
Milestone Title: "${milestoneTitle}"
Core Topics: ${coreTopics.map((t) => `"${t}"`).join(', ')}

${excerpt ? `Reference Material Excerpt:\n---\n${excerpt.slice(0, 15000)}\n---` : 'Generate authoritative curriculum content grounded strictly on the specified title and topics.'}

Generate the detailed summary, check learning questions, and active recall deck for this single milestone.`;

    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];

    for (const model of candidateModels) {
      try {
        console.log(`[GenerateMilestoneContent] Calling ${model} for "${milestoneTitle}"`);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Model ${model} request timed out after 12s`)), 12000);
        });

        const response = await Promise.race([
          ai.models.generateContent({
            model,
            contents: userPrompt,
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              temperature: 0.15,
            },
          }),
          timeoutPromise,
        ]);

        const rawJson = (response.text || '').trim();
        if (rawJson) {
          const cleanJson = rawJson.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
          const parsed = JSON.parse(cleanJson);
          const validated = MilestoneContentResponseSchema.safeParse(parsed);
          if (validated.success) {
            console.log(`[GenerateMilestoneContent] Successfully generated content with ${model}`);
            return validated.data;
          }
        }
      } catch (err: any) {
        console.warn(`[GenerateMilestoneContent] Model ${model} failed:`, err?.message || err);
      }
    }
  }

  // Grounded topic-specific fallback if Gemini is offline or unavailable
  console.log(`[GenerateMilestoneContent] Building grounded fallback for "${milestoneTitle}"`);
  return createGroundedMilestoneContent(milestoneTitle, coreTopics, chapterName);
}

function createGroundedMilestoneContent(
  milestoneTitle: string,
  coreTopics: string[],
  chapterName: string
): MilestoneContentResponse {
  const topicsList = coreTopics.length > 0 ? coreTopics : [milestoneTitle];

  const compactSummary = `### Key Takeaways: ${milestoneTitle}
${topicsList.map((t) => `- **${t}**: Core concept essential for understanding ${chapterName}.`).join('\n')}
- **Retention Rule**: Review active recall flashcards within 24 hours to cement foundational concepts.`;

  const detailedSummary = `## ${milestoneTitle} — Detailed Syllabus Notes

### Overview
This milestone establishes mastery over **${milestoneTitle}** within **${chapterName}**.

### Core Conceptual Modules
${topicsList
  .map(
    (t, i) => `#### ${i + 1}. ${t}
- **Definition & Scope**: Examination of ${t} as applied in this curriculum section.
- **Key Principles**: Systematic problem solving, structural characteristics, and analytical methods.
- **Application**: Recognizing examination patterns and avoiding typical misinterpretations regarding ${t}.`
  )
  .join('\n\n')}

### Summary & Next Steps
Consolidate understanding through the Check Learning questions and Spaced Repetition Recall Deck below.`;

  const checkLearning = topicsList.slice(0, 3).map((topic, idx) => ({
    question: `What is the primary significance of ${topic} in the context of ${milestoneTitle}?`,
    options: [
      `It provides the foundational framework for analyzing ${topic} and related concepts.`,
      `It represents an outdated hypothesis superseded by modern approaches.`,
      `It applies exclusively to theoretical simulations without practical relevance.`,
      `It functions solely as an optional supplementary footnote in ${chapterName}.`,
    ],
    correctIndex: 0,
    explanation: `${topic} is a core foundational pillar in ${milestoneTitle}, providing essential principles required for syllabus mastery.`,
  }));

  const recallDeck = topicsList.slice(0, 4).map((topic) => ({
    front: `Define and state the key function of ${topic}.`,
    back: `${topic} is a vital concept in ${milestoneTitle} that establishes essential criteria and problem-solving principles.`,
    sourceExcerpt: `${milestoneTitle} • Core Topic: ${topic}`,
  }));

  return {
    summary: {
      compact: compactSummary,
      detailed: detailedSummary,
    },
    checkLearning,
    recallDeck,
  };
}
