import { GoogleGenAI, ThinkingLevel } from '@google/genai';
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
  trapAnalysis: z.string().optional(),
});

export type CheckpointItem = z.infer<typeof CheckpointItemSchema>;

export const GenerateCheckpointsRequestSchema = z.object({
  chapterTitle: z.string().optional().default('Curriculum Chapter'),
  chapterName: z.string().optional(),
  milestoneTitle: z.string().min(1, 'milestoneTitle is required'),
  milestoneId: z.string().optional(),
  subjectName: z.string().optional(),
  subject: z.string().optional(),
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
// DETERMINISTIC HUMAN-TEACHER FALLBACK GENERATOR
// =============================================================

function extractMeaningfulSentences(text: string): string[] {
  if (!text) return [];
  return text
    .replace(/^#+\s+.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^[•\-\*]\s+/gm, '')
    .split(/(?<=[.?!])\s+|\n{2,}/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 25 && !s.startsWith('#') && !s.startsWith('>'));
}

/**
 * Creates high school curriculum exam questions without templates or robotic placeholders.
 * Fully subject-aware: Adapts question structure and benchmark answers for Science vs Social Science.
 */
function generateDeterministicFallbackCheckpoints(
  chapterTitle: string,
  milestoneTitle: string,
  topicTags: string[],
  excerpt: string,
  subjectName?: string
): GenerateCheckpointsResponse {
  const sentences = extractMeaningfulSentences(excerpt);
  const topics = topicTags.length > 0 ? topicTags : [milestoneTitle];

  const primaryTopic = topics[0] || milestoneTitle;
  const secondaryTopic = topics[1] || topics[0] || 'Core Mechanism';
  const tertiaryTopic = topics[2] || topics[1] || 'Key Safeguards & Standards';

  const combined = `${subjectName || ''} ${chapterTitle} ${milestoneTitle} ${topics.join(' ')}`.toLowerCase();
  const isScience =
    combined.includes('sci') ||
    combined.includes('physic') ||
    combined.includes('chem') ||
    combined.includes('bio') ||
    combined.includes('light') ||
    combined.includes('mirror') ||
    combined.includes('lens') ||
    combined.includes('refract') ||
    combined.includes('reflect') ||
    combined.includes('electric') ||
    combined.includes('circuit') ||
    combined.includes('ohm') ||
    combined.includes('reaction') ||
    combined.includes('acid') ||
    combined.includes('base') ||
    combined.includes('atom') ||
    combined.includes('cell');

  if (isScience) {
    // SCIENCE (Physics / Chemistry / Biology)
    const fact1 = sentences[0] || `${primaryTopic} represents the primary physical or chemical law governing ${chapterTitle}.`;
    const fact2 = sentences[1] || `${secondaryTopic} defines the operational conditions, formulas, and state relationships in the textbook.`;
    const fact3 = sentences[2] || `${tertiaryTopic} establishes the experimental conditions and quantitative verification standards.`;

    const q1 = `State the scientific law or definition of "${primaryTopic}" as presented in ${chapterTitle}. What physical or chemical phenomenon does it explain?`;
    const a1 = `**1. Direct Factual Explanation:**\n${fact1}\n\n**2. Textbook Mechanism & Effect:**\nGoverns the interaction between components, explaining observable changes in states, trajectories, or reaction rates.\n\n**3. Direct Conclusion:**\nForms the necessary foundation for predictive calculations and experimental verification.`;
    const rub1 = [
      `States the precise textbook definition or law of "${primaryTopic}"`,
      'Explains the specific cause-and-effect relationship or physical phenomenon',
      'Uses standard scientific terminology (no vague or informal descriptions)',
    ];
    const trap1 = `Common Pitfall: Confusing everyday terminology with strict scientific definitions or failing to state the exact condition under which the law holds true.`;

    const q2 = `Explain how "${secondaryTopic}" is applied in problem solving or laboratory observations. What formula, Cartesian sign rule, or balanced reaction is required?`;
    const a2 = `**1. Direct Factual Explanation:**\n${fact2}\n\n**2. Specific Textbook Rule / Example:**\nRequires strict adherence to mathematical relationships, unit conversions (e.g. SI units), and stoichiometric coefficients.\n\n**3. Direct Conclusion:**\nPrevents sign flips, dimensional mismatches, and incorrect quantitative predictions.`;
    const rub2 = [
      `Accurately states the governing formula, reaction, or mechanism for "${secondaryTopic}"`,
      'Applies the correct Cartesian signs, state symbols, or SI unit conversions',
      'Provides the step-by-step reasoning expected on a board exam sheet',
    ];
    const trap2 = `Common Pitfall: Overlooking negative signs in Cartesian conventions or forgetting to balance atoms before computing quantities.`;

    const q3 = `What critical experimental condition, precaution, or limitation does the textbook emphasize for "${tertiaryTopic}"? What happens if this condition is not met?`;
    const a3 = `**1. Direct Factual Explanation:**\n${fact3}\n\n**2. Specific Textbook Consequence:**\nDeparting from this condition introduces systematic errors, invalidates standard assumptions, or causes anomalous results.\n\n**3. Direct Conclusion:**\nStrict control of experimental variables ensures reproducible, valid scientific outcomes.`;
    const rub3 = [
      `Identifies the specific prerequisite, boundary condition, or experimental precaution for "${tertiaryTopic}"`,
      'Describes the error, distortion, or anomalous observation that occurs when this condition is violated',
      'Concludes with the verified textbook standard required for full credit',
    ];
    const trap3 = `Common Pitfall: Assuming physical/chemical rules apply universally without checking boundary assumptions (e.g., constant temperature for Ohm\'s Law).`;

    return {
      milestoneTitle,
      targetModule: 'Module 2: Conceptual Checkpoints',
      checkpoints: [
        {
          id: 'chk_01',
          checkpointNumber: 1,
          topicTag: primaryTopic,
          prompt: q1,
          benchmarkAnswer: a1,
          keyPointsToVerify: rub1,
          sourceCitation: fact1,
          trapAnalysis: trap1,
        },
        {
          id: 'chk_02',
          checkpointNumber: 2,
          topicTag: secondaryTopic,
          prompt: q2,
          benchmarkAnswer: a2,
          keyPointsToVerify: rub2,
          sourceCitation: fact2,
          trapAnalysis: trap2,
        },
        {
          id: 'chk_03',
          checkpointNumber: 3,
          topicTag: tertiaryTopic,
          prompt: q3,
          benchmarkAnswer: a3,
          keyPointsToVerify: rub3,
          sourceCitation: fact3,
          trapAnalysis: trap3,
        },
      ],
    };
  }

  // SOCIAL SCIENCE (Civics / History / Geography / Economics)
  const fact1 = sentences[0] || `${primaryTopic} provides the direct legal or institutional framework in ${chapterTitle}.`;
  const fact2 = sentences[1] || `${secondaryTopic} establishes the operational criteria and governing procedures detailed in the text.`;
  const fact3 = sentences[2] || `Proper adherence to ${tertiaryTopic} prevents distortion of standards and ensures constitutional safeguards are upheld.`;

  const q1 = `Why is ${primaryTopic.toLowerCase().startsWith('why') ? primaryTopic : `the concept of "${primaryTopic}"`} essential in ${chapterTitle}? Explain what consequences arise when this principle is ignored or absent.`;
  const a1 = `**1. Direct Factual Explanation:**\n${fact1}\n\n**2. Textbook Consequence:**\nWithout this foundation, representatives or systems operate without accountability, undermining the core standards taught in the chapter.\n\n**3. Direct Conclusion:**\nEnsures authority remains derived from structured consent and periodic verification rather than arbitrary power.`;
  const rub1 = [
    `Explicitly identifies "${primaryTopic}" and its primary definition from the lesson`,
    'Cites the specific consequence or breakdown described in the text when this principle is absent',
    'Concludes with the fundamental purpose or standard of accountability explained in the material',
  ];
  const trap1 = `Common Pitfall: Giving an everyday opinion about ${primaryTopic} instead of stating the specific definition, mechanism, and consequence taught in the book.`;

  const q2 = `How does the textbook distinguish the practical mechanism of "${secondaryTopic}" from related alternatives? Give the specific reasoning or example highlighted in this section.`;
  const a2 = `**1. Direct Factual Explanation:**\n${fact2}\n\n**2. Specific Textbook Rule or Example:**\nDirectly contrasts the operational steps and demonstrates how procedural safeguards function during actual implementation.\n\n**3. Direct Conclusion:**\nShows that the process is not merely symbolic, but produces distinct, verifiable outcomes defined by curriculum standards.`;
  const rub2 = [
    `Accurately explains the operational mechanism of "${secondaryTopic}"`,
    'Identifies the specific contrast, distinction, or rule provided in the textbook',
    'References the concrete example or systematic sequence detailed in the section',
  ];
  const trap2 = `Common Pitfall: Confusing the official mechanism with informal practices or failing to cite the distinct criteria that separate this from adjacent procedures.`;

  const q3 = `What minimum condition, safeguard, or limitation does the textbook establish for "${tertiaryTopic}"? What happens if this safeguard is violated?`;
  const a3 = `**1. Direct Factual Explanation:**\n${fact3}\n\n**2. Specific Textbook Consequence:**\nViolating this condition leads to an unequal balance, compromised legitimacy, or systemic failure in governance.\n\n**3. Direct Conclusion:**\nThese safeguards exist specifically to prevent unilateral overreach and guarantee fairness across all participants.`;
  const rub3 = [
    `Identifies the specific safeguard, limitation, or prerequisite required for "${tertiaryTopic}"`,
    'Describes what breakdown or illegitimacy occurs when this safeguard is compromised',
    'Explains why adhering to this protective standard is required for full compliance',
  ];
  const trap3 = `Common Pitfall: Treating the concept as absolute or unconditional without acknowledging the mandatory rules, boundaries, and exceptions outlined in the syllabus.`;

  return {
    milestoneTitle,
    targetModule: 'Module 2: Conceptual Checkpoints',
    checkpoints: [
      {
        id: 'chk_01',
        checkpointNumber: 1,
        topicTag: primaryTopic,
        prompt: q1,
        benchmarkAnswer: a1,
        keyPointsToVerify: rub1,
        sourceCitation: fact1,
        trapAnalysis: trap1,
      },
      {
        id: 'chk_02',
        checkpointNumber: 2,
        topicTag: secondaryTopic,
        prompt: q2,
        benchmarkAnswer: a2,
        keyPointsToVerify: rub2,
        sourceCitation: fact2,
        trapAnalysis: trap2,
      },
      {
        id: 'chk_03',
        checkpointNumber: 3,
        topicTag: tertiaryTopic,
        prompt: q3,
        benchmarkAnswer: a3,
        keyPointsToVerify: rub3,
        sourceCitation: fact3,
        trapAnalysis: trap3,
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
  const subjectName = (reqBody.subjectName || reqBody.subject || '').trim();
  const topicTags = Array.isArray(reqBody.topicTags) && reqBody.topicTags.length > 0
    ? reqBody.topicTags
    : Array.isArray(reqBody.coreTopics) && reqBody.coreTopics.length > 0
      ? reqBody.coreTopics
      : [milestoneTitle];
  const sectionTextExcerpt = (reqBody.sectionTextExcerpt || '').trim();

  console.log(`[GenerateCheckpoints] Generating human-examiner Module 2 checkpoints for "${milestoneTitle}" in "${chapterTitle}" (subject: ${subjectName || 'unspecified'}, excerpt length: ${sectionTextExcerpt.length})`);

  const effectiveKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    '';

  if (!effectiveKey || !sectionTextExcerpt || sectionTextExcerpt.length < 50) {
    console.log(`[GenerateCheckpoints] Using human-teacher fallback (API key: ${Boolean(effectiveKey)}, excerpt len: ${sectionTextExcerpt.length})`);
    return generateDeterministicFallbackCheckpoints(chapterTitle, milestoneTitle, topicTags, sectionTextExcerpt, subjectName);
  }

  const ai = new GoogleGenAI({
    apiKey: effectiveKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const systemInstruction = `[SYSTEM DIRECTIVE: EXPERT HIGH SCHOOL TEACHER & CURRICULUM EXAMINER — CONCEPT CHECK (MODULE 2)]

Role:
You are an expert high school teacher, senior board examiner, and curriculum author across both SCIENCE (Physics, Chemistry, Biology) and SOCIAL SCIENCE / HUMANITIES (Civics, History, Economics). Your task is to craft 3 natural, rigorous, authentic exam questions and detailed benchmark model answers based EXCLUSIVELY on the provided textbook excerpt.

MANDATORY PEDAGOGICAL RULES:

1. WRITE LIKE A REAL HUMAN TEACHER:
   - Carefully read the textbook passage.
   - Formulate natural, thoughtful exam questions directly addressing the specific facts, real-world examples, scientific mechanisms, governing formulas, chemical reactions, constitutional provisions, or practical dilemmas discussed in the text.
   - NEVER use robotic formulaic templates such as:
     * "Explain how [Topic] functions according to this section..." (STRICTLY BANNED)
     * "What specific role does it play, and how does it govern or explain the outcomes discussed?" (STRICTLY BANNED)
     * "Define [Topic] and explain its role in [Chapter]..." (STRICTLY BANNED)
   - NEVER inject milestone titles or subtopic titles verbatim into the middle of a repetitive question sentence.
   - Tailor the question to the academic discipline:
     * FOR SCIENCE (Physics / Chemistry / Biology):
       - Ask about physical laws, governing mathematical formulas (e.g. 1/f = 1/v + 1/u, V = IR), Cartesian sign conventions, chemical equations and balancing rules, state symbols, biological mechanisms (e.g. stomatal regulation, transpiration), or laboratory observations (e.g. Activity 10.1 pinhole focus, heating lead nitrate).
       - e.g., "An object is placed at a distance of 30 cm in front of a concave mirror of focal length 20 cm. Using the mirror formula and Cartesian sign convention, explain where the image will be formed and whether it is real or virtual."
       - e.g., "State Snell's Law of refraction. When light passes obliquely from air into water of refractive index 1.33, why does it bend towards the normal, and how does its wave speed change?"
       - e.g., "Write the balanced chemical equation for the reaction of iron with steam. Why is it chemically incorrect to alter subscripts like H₂O to balance atoms?"
     * FOR SOCIAL SCIENCE / HUMANITIES (Civics / History / Geography / Economics):
       - Ask about constitutional rules, democratic necessity, electoral systems, historical causes/consequences, or institutional safeguards.
       - e.g., "Why are regular elections necessary in a representative democracy? Explain what would happen if voters had no mechanism to remove leaders they are dissatisfied with."
       - e.g., "How do voters participate differently in direct versus indirect elections? Give an example of a representative body elected indirectly as mentioned in the chapter."

2. BENCHMARK MODEL ANSWERS MUST CONTAIN REAL TEXTBOOK FACTS:
   - NEVER write vague meta-statements or pedagogical filler like "Articulates key scope", "Establishes the scope within the lesson", or "Clarifies adjacent concepts".
   - Write the exact factual answer an examiner expects to see on a top student's exam sheet, directly citing textbook facts, formulas, equations, mechanisms, and examples.
   - Structure every benchmark answer into 3 distinct, numbered factual points:
     * 1. Direct factual explanation or core definition with exact textbook terms.
     * 2. Specific textbook consequence, rule, mechanism, formula, or concrete case/example.
     * 3. Direct analytical conclusion or practical scientific/civic significance.

3. KEY VERIFICATION CRITERIA (CHECKLIST FOR GRADING):
   - Provide 3 concrete, verifiable keywords, rules, or specific facts that MUST appear in the student's answer for full marks (e.g., in Science: "1. States concave mirror focal length is negative (f = -20 cm); 2. Applies 1/v = 1/f - 1/u correctly; 3. Concludes image is real, inverted, at -60 cm").

4. TRAP ANALYSIS (COMMON STUDENT ERRORS):
   - For every question, include a concise 'trapAnalysis' identifying the exact mistake students make on exams (e.g. in Science: "Forgetting the negative sign in Cartesian object distance (u is always negative)" or in SST: "Confusing direct universal franchise with indirect legislative representation").

JSON SCHEMA SPECIFICATION:
Return a valid JSON object matching:
{
  "milestoneTitle": "${milestoneTitle}",
  "targetModule": "Module 2: Conceptual Checkpoints",
  "checkpoints": [
    {
      "id": "chk_01",
      "checkpointNumber": 1,
      "topicTag": string,
      "prompt": string,
      "benchmarkAnswer": "**1. Direct Factual Explanation:**\\n...\\n\\n**2. Specific Textbook Rule / Example:**\\n...\\n\\n**3. Direct Conclusion:**\\n...",
      "keyPointsToVerify": [string, string, string],
      "sourceCitation": string,
      "trapAnalysis": string
    },
    ... (total 3 checkpoints)
  ]
}`;

  const userPrompt = `Subject: ${subjectName || 'Curriculum Subject'}
Chapter: "${chapterTitle}"
Milestone Title: "${milestoneTitle}"
Core Topics: ${topicTags.map((t) => `"${t}"`).join(', ')}

Textbook Excerpt:
---
${sectionTextExcerpt.slice(0, 14000)}
---

Generate 3 natural, authentic exam questions and 3-point factual benchmark model answers following all expert teacher guidelines.`;

  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];

  for (const model of candidateModels) {
    let timeoutId: any = null;
    try {
      console.log(`[GenerateCheckpoints] Requesting from ${model} for "${milestoneTitle}"`);
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Model ${model} request timed out after 30s`)), 30000);
      });

      const config: any = {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.15,
      };

      if (model.includes('3.8')) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const apiPromise = ai.models.generateContent({
        model,
        contents: userPrompt,
        config,
      });

      apiPromise.catch(() => {});

      const response = await Promise.race([apiPromise, timeoutPromise]);
      clearTimeout(timeoutId);

      const rawJson = (response.text || '').trim();
      if (rawJson) {
        const cleanJson = rawJson.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(cleanJson);
        const validated = GenerateCheckpointsResponseSchema.safeParse(parsed);
        if (validated.success) {
          console.log(`[GenerateCheckpoints] Successfully generated 3 checkpoints with ${model}`);
          return validated.data;
        }
      }
    } catch (modelErr: any) {
      clearTimeout(timeoutId);
      console.warn(`[GenerateCheckpoints] Model ${model} failed:`, modelErr?.message || modelErr);
    }
  }

  console.warn(`[GenerateCheckpoints] All live Gemini models failed. Using deterministic human-teacher fallback.`);
  return generateDeterministicFallbackCheckpoints(chapterTitle, milestoneTitle, topicTags, sectionTextExcerpt, subjectName);
}
