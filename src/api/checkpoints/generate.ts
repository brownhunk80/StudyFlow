import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

// =============================================================
// VALIDATION SCHEMAS
// =============================================================

export const CheckpointItemSchema = z.object({
  id: z.string(),
  checkpointNumber: z.number().int().min(1).max(10),
  topicTag: z.string(),
  prompt: z.string().min(1),
  benchmarkAnswer: z.string().min(1),
  keyPointsToVerify: z.array(z.string()).min(1),
  sourceCitation: z.string(),
});

export type CheckpointItem = z.infer<typeof CheckpointItemSchema>;

export const GenerateCheckpointsRequestSchema = z.object({
  chapterTitle: z.string().optional().default('Curriculum Chapter'),
  chapterName: z.string().optional(),
  milestoneTitle: z.string().min(1, 'milestoneTitle is required'),
  milestoneId: z.string().optional(),
  topicTags: z.array(z.string()).optional().default([]),
  coreTopics: z.array(z.string()).optional(),
  sectionTextExcerpt: z.string().optional().default(''),
});

export type GenerateCheckpointsRequest = z.infer<typeof GenerateCheckpointsRequestSchema>;

export const GenerateCheckpointsResponseSchema = z.object({
  milestoneTitle: z.string(),
  targetModule: z.literal('Module 2: Conceptual Checkpoints'),
  checkpoints: z.array(CheckpointItemSchema),
});

export type GenerateCheckpointsResponse = z.infer<typeof GenerateCheckpointsResponseSchema>;

// =============================================================
// DETERMINISTIC FALLBACK GENERATOR (OFFLINE / FALLBACK)
// =============================================================

function generateDeterministicFallbackCheckpoints(
  chapterTitle: string,
  milestoneTitle: string,
  topicTags: string[],
  excerpt: string
): GenerateCheckpointsResponse {
  const topics = topicTags.length > 0 ? topicTags : [milestoneTitle, 'Core Principles', 'Analytical Application'];
  const sentences = excerpt
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && !s.startsWith('#'));

  const citation1 = sentences[0] || `${milestoneTitle} establishes the governing criteria and physical laws for ${chapterTitle}.`;
  const citation2 = sentences[1] || `${topics[1] || topics[0]} defines the specific constitutive constraints under standard boundary conditions.`;
  const citation3 = sentences[2] || `Consistent coordinate conventions and sign adherence must be maintained throughout all derivations.`;

  return {
    milestoneTitle,
    targetModule: 'Module 2: Conceptual Checkpoints',
    checkpoints: [
      {
        id: 'chk_01',
        checkpointNumber: 1,
        topicTag: topics[0] || milestoneTitle,
        prompt: `Based strictly on the source text, explain the fundamental relationship and governing criteria underlying "${topics[0] || milestoneTitle}". What assumptions must be satisfied?`,
        benchmarkAnswer: `According to the source passage: "${citation1}". The governing relationship mandates that all system coordinates and primary variables be evaluated strictly against established boundary conditions and reference criteria.`,
        keyPointsToVerify: [
          `Explicit citation or identification of the primary governing principle: "${topics[0] || milestoneTitle}"`,
          'Accurate description of the required assumptions or initial system constraints',
          'Clear explanation of the cause-and-effect relationship outlined in the text',
        ],
        sourceCitation: citation1,
      },
      {
        id: 'chk_02',
        checkpointNumber: 2,
        topicTag: topics[1] || topics[0] || milestoneTitle,
        prompt: `How does the excerpt differentiate or systematically characterize "${topics[1] || topics[0]}"? Trace the underlying mechanism described in the text.`,
        benchmarkAnswer: `The text highlights that "${citation2}". The mechanism operates through defined constitutive stages, ensuring state continuity and preventing misinterpretation of variables.`,
        keyPointsToVerify: [
          `Direct reference to the operational mechanism of "${topics[1] || topics[0]}"`,
          'Identification of the key distinctions or boundaries identified in the passage',
          'Correct usage of academic terminology verbatim from the text',
        ],
        sourceCitation: citation2,
      },
      {
        id: 'chk_03',
        checkpointNumber: 3,
        topicTag: topics[2] || topics[0] || milestoneTitle,
        prompt: `What critical procedural rule, constraint, or pitfall does the text emphasize regarding "${topics[2] || topics[0]}"? Explain how to properly apply it.`,
        benchmarkAnswer: `As noted in the text: "${citation3}". Proper application requires strict adherence to defined conventions without premature approximations or sign reversals.`,
        keyPointsToVerify: [
          'Identification of the critical rule, boundary constraint, or convention',
          'Explanation of why adhering to this constraint is required for accuracy',
          'Synthesis of the proper step-by-step application described in the passage',
        ],
        sourceCitation: citation3,
      },
    ],
  };
}

// =============================================================
// MAIN GEMINI EXTRACTION ENGINE
// =============================================================

export async function generateConceptualCheckpoints(
  reqBody: GenerateCheckpointsRequest
): Promise<GenerateCheckpointsResponse> {
  const chapterTitle = (reqBody.chapterTitle || reqBody.chapterName || 'Curriculum Chapter').trim();
  const milestoneTitle = (reqBody.milestoneTitle || '').trim();
  const topicTags = Array.isArray(reqBody.topicTags) && reqBody.topicTags.length > 0
    ? reqBody.topicTags
    : Array.isArray(reqBody.coreTopics) && reqBody.coreTopics.length > 0
      ? reqBody.coreTopics
      : [milestoneTitle];
  const sectionTextExcerpt = (reqBody.sectionTextExcerpt || '').trim();

  console.log(`[GenerateCheckpoints] Generating Module 2 checkpoints for "${milestoneTitle}" in "${chapterTitle}" (excerpt length: ${sectionTextExcerpt.length})`);

  const effectiveKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    '';

  if (!effectiveKey || !sectionTextExcerpt || sectionTextExcerpt.length < 50) {
    console.log(`[GenerateCheckpoints] Using deterministic fallback (API key: ${Boolean(effectiveKey)}, excerpt len: ${sectionTextExcerpt.length})`);
    return generateDeterministicFallbackCheckpoints(chapterTitle, milestoneTitle, topicTags, sectionTextExcerpt);
  }

  const ai = new GoogleGenAI({
    apiKey: effectiveKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const systemInstruction = `[SYSTEM DIRECTIVE: RIGOROUS CONCEPT CHECK GENERATOR — REASONING EFFORT: MAXIMUM]
[EXECUTION MODE: DETERMINISTIC CLOSED-BOOK EXTRACTION — STRICT PASSAGE FIDELITY]

Role:
You are an uncompromising academic assessor. Your sole mission is to generate 3 high-quality, open-ended conceptual synthesis checkpoints for "Module 2: Conceptual Checkpoints" (Concept Check) based EXCLUSIVELY on the provided source text excerpt.

MANDATORY GENERATION RULES:
1. STRICT CLOSED-BOOK GROUNDING: Every checkpoint prompt, benchmark answer, and scoring criterion MUST originate 100% from the text between <<<SOURCE_TEXT_START>>> and <<<SOURCE_TEXT_END>>>. If a concept, term, or rule is not explicitly mentioned in this passage, it is STRICTLY FORBIDDEN from appearing in the output.
2. ZERO DRIFT / NO EXTERNAL DOMAINS: If this passage discusses Civics, Governance, or Elections, you must NEVER produce physics problems, arithmetic calculations, or unrelated topics. If it discusses Optics, you must never introduce Biology.
3. DEEP CONCEPTUAL SYNTHESIS: Frame questions that test genuine understanding (e.g., asking students to explain "why" or "how", compare systems, or trace cause-and-effect mechanisms explained in the excerpt), rather than trivial recall.
4. CITATION REQUIREMENT: For every checkpoint, you must extract an exact, unmodified sentence from the passage and place it into "sourceCitation" before formulating the prompt and answer.
5. BENCHMARK ANSWER: The model answer must be structured, professional, and directly state the essential facts required for full credit.
6. KEY VERIFICATION POINTS: Provide 3 distinct, concise factual points that must be present in the student's answer to count as understood.`;

  const userPrompt = `Target Details:
- Chapter: ${chapterTitle}
- Milestone: ${milestoneTitle}
- Target Topic Tags: ${topicTags.join(', ')}

<<<SOURCE_TEXT_START>>>
${sectionTextExcerpt.slice(0, 18000)}
<<<SOURCE_TEXT_END>>>

Generate exactly 3 open-ended conceptual synthesis checkpoints adhering strictly to the system directive.`;

  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ];

  for (const model of candidateModels) {
    let timeoutId: any = null;
    try {
      console.log(`[GenerateCheckpoints] Querying ${model} for "${milestoneTitle}"`);
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Model ${model} request timed out after 25s`)), 25000);
      });

      const apiPromise = ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT' as any,
            properties: {
              milestoneTitle: { type: 'STRING' as any },
              targetModule: { type: 'STRING' as any },
              checkpoints: {
                type: 'ARRAY' as any,
                items: {
                  type: 'OBJECT' as any,
                  properties: {
                    id: { type: 'STRING' as any },
                    checkpointNumber: { type: 'INTEGER' as any },
                    topicTag: { type: 'STRING' as any },
                    prompt: { type: 'STRING' as any },
                    benchmarkAnswer: { type: 'STRING' as any },
                    keyPointsToVerify: {
                      type: 'ARRAY' as any,
                      items: { type: 'STRING' as any },
                    },
                    sourceCitation: { type: 'STRING' as any },
                  },
                  required: ['id', 'checkpointNumber', 'topicTag', 'prompt', 'benchmarkAnswer', 'keyPointsToVerify', 'sourceCitation'],
                },
              },
            },
            required: ['milestoneTitle', 'targetModule', 'checkpoints'],
          },
          temperature: 0.1,
        },
      });

      const res = await Promise.race([apiPromise, timeoutPromise]);
      clearTimeout(timeoutId);

      const rawText = (res as any)?.text?.trim();
      if (!rawText) {
        console.warn(`[GenerateCheckpoints] Model ${model} returned empty response`);
        continue;
      }

      const parsed = JSON.parse(rawText);
      const validated = GenerateCheckpointsResponseSchema.parse(parsed);

      if (validated.checkpoints.length > 0) {
        console.log(`[GenerateCheckpoints] Successfully generated ${validated.checkpoints.length} grounded checkpoints with ${model}`);
        return validated;
      }
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      console.warn(`[GenerateCheckpoints] Model ${model} failed:`, err?.message || err);
    }
  }

  console.warn('[GenerateCheckpoints] All AI models failed, using deterministic fallback');
  return generateDeterministicFallbackCheckpoints(chapterTitle, milestoneTitle, topicTags, sectionTextExcerpt);
}
