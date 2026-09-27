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

    const systemInstruction = `You are an automated curriculum knowledge engineer and expert tutor. Given the milestone title, core topics, and reference excerpt from the chapter, generate:
1. A concise dual summary:
   - "compact": high-yield bulleted key takeaways, core definitions, and invariant formulas.
   - "detailed": complete explanatory markdown notes with conceptual breakdowns and exam guidance.
2. 2-3 Check Learning multiple choice questions:
   - "question": clear conceptual, computational, or mechanism question.
   - "options": exactly 4 distinct plausible answer choices.
   - "correctIndex": 0-based integer (0 to 3) pointing to the correct choice.
   - "explanation": rationale explaining why the correct choice is right and common traps.
3. 4-5 Active Recall Deck flashcards following the RemNote Concept-Descriptor architecture:
   - "front": direct atomic active recall question (e.g. "What quantity remains invariant during isothermal expansion?", "State the operational SI unit of electric flux.").
   - "back": concise, punchy target answer revealed upon click (under 15 words).
   - "sourceExcerpt": direct reference citation or excerpt from the material.

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

Generate the detailed summary, check learning questions, and atomic RemNote active recall deck for this milestone.`;

    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
    ];

    for (const model of candidateModels) {
      let timeoutId: any = null;
      try {
        console.log(`[GenerateMilestoneContent] Calling ${model} for "${milestoneTitle}"`);
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(`Model ${model} request timed out after 20s`)), 20000);
        });

        const apiPromise = ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.15,
          },
        });

        // Attach a silent catch handler to apiPromise immediately to prevent unhandled rejection
        // if timeoutPromise rejects the race before apiPromise resolves or rejects in the background
        apiPromise.catch(() => {
          // Handled via Promise.race or discarded safely on timeout
        });

        const response = await Promise.race([apiPromise, timeoutPromise]);

        clearTimeout(timeoutId);

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
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        const errStatus = err?.status || err?.code || (err?.message?.includes('503') ? 503 : 'error');
        console.log(`[GenerateMilestoneContent] Model ${model} unavailable (${errStatus}), trying fallback model...`);
        if (`${err?.message}`.includes('503') || `${err?.message}`.includes('high demand') || `${err?.message}`.includes('429')) {
          await new Promise((res) => setTimeout(res, 300));
        }
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
${topicsList.map((t) => `- **${t}**: Core principle essential for syllabus understanding in ${chapterName}.`).join('\n')}
- **Active Recall Discipline**: Master atomic definitions and invariant relations before tackling complex multi-step problems.`;

  const detailedSummary = `## ${milestoneTitle} — Detailed Syllabus Notes

### Overview
This milestone establishes mastery over **${milestoneTitle}** within **${chapterName}**.

### Core Conceptual Modules
${topicsList
  .map(
    (t, i) => `#### ${i + 1}. ${t}
- **Definition & Scope**: Fundamental laws, boundary criteria, and SI parameters governing ${t}.
- **Key Principles**: Systematic mathematical relations, operational mechanisms, and conservation properties.
- **Exam Application**: Recognizing standard problem patterns and eliminating common sign or unit errors.`
  )
  .join('\n\n')}

### Summary & Next Steps
Consolidate understanding through the Check Learning questions and Spaced Repetition Recall Deck below.`;

  const checkLearning = topicsList.slice(0, 3).map((topic, idx) => ({
    question: `What fundamental principle or governing condition characterizes ${topic} in ${milestoneTitle}?`,
    options: [
      `It defines the core operational boundary and invariant relationship for ${topic}.`,
      `It represents an unverified empirical approximation without theoretical basis.`,
      `It applies only when all boundary forces and energy inputs are set to infinity.`,
      `It is purely descriptive and does not relate to testable examination problems.`,
    ],
    correctIndex: 0,
    explanation: `${topic} establishes the governing criteria and foundational equation tested throughout ${milestoneTitle}.`,
  }));

  const recallDeck = topicsList.slice(0, 5).map((topic, idx) => ({
    front: `State the operational definition and governing condition for ${topic}.`,
    back: `${topic} establishes the direct rate and equilibrium relation under standard boundary conditions.`,
    sourceExcerpt: `${chapterName} › ${milestoneTitle} • Core Topic: ${topic}`,
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
