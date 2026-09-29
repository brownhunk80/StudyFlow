import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { isHindiSubject, getHindiPromptDirectives, extractHindiKeyEntities } from '../../utils/hindiDetection';

// =============================================================
// VALIDATION SCHEMAS
// =============================================================

export const GenerateMilestoneContentRequestSchema = z.object({
  milestoneTitle: z.string().min(1, 'milestoneTitle is required'),
  coreTopics: z.array(z.string()).default([]),
  sectionTextExcerpt: z.string().optional().default(''),
  chapterTitle: z.string().optional(),
  chapterName: z.string().optional(),
  subjectName: z.string().optional(),
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

    const isHindi = isHindiSubject(reqBody.subjectName, chapterName, `${milestoneTitle} ${excerpt}`);

    const hindiDirective = isHindi
      ? `\n${getHindiPromptDirectives(chapterName)}\n- CRITICAL MANDATORY INSTRUCTION: You MUST generate all summaries (compact and detailed), all checkLearning questions/options/explanations, and all recallDeck flashcards EXCLUSIVELY in pure Hindi (Devanagari script, शुद्ध हिन्दी). Do NOT use English.`
      : '';

    const systemInstruction = `You are an automated curriculum knowledge engineer and expert tutor. Given the milestone title, core topics, and reference excerpt from the chapter, generate strictly grounded curriculum content:${hindiDirective}
1. A concise dual summary:
   - "compact": high-yield bulleted key takeaways quoting actual sentences, character names, dialogues, and formulas from the text.
   - "detailed": complete explanatory markdown notes citing actual events, stanzas, lines, and conceptual breakdowns from the excerpt.
2. 2-3 Check Learning multiple choice questions:
   - "question": clear question asking about a specific event, dialogue, character action, formula, or definition directly present in the excerpt.
   - "options": exactly 4 distinct plausible answer choices with option 0 or correctIndex matching the text.
   - "correctIndex": 0-based integer (0 to 3) pointing to the correct choice.
   - "explanation": rationale citing the exact quote from the excerpt.
3. 4-5 Active Recall Deck flashcards following the RemNote Concept-Descriptor architecture:
   - "front": direct atomic active recall question about a specific event, quote, character, or rule in the excerpt.
   - "back": concise, punchy target answer revealed upon click (under 15 words).
   - "sourceExcerpt": direct reference citation or excerpt from the material.

CRITICAL RULES:
- ONLY USE INPUT FROM THE PROVIDED REFERENCE EXCERPT. DO NOT LOOK FOR OR INVENT ANYTHING FROM OUTSIDE KNOWLEDGE.
- Mention specific names, dialogue quotes, actions, stanzas, and terms that literally appear in the provided excerpt.
- Do NOT output vague filler statements (e.g. "पाठ के केंद्रीय भाव को समझना", "General principles").`;

    const userPrompt = `Chapter: "${chapterName}"
Milestone Title: "${milestoneTitle}"
Core Topics: ${coreTopics.map((t) => `"${t}"`).join(', ')}

${excerpt ? `Reference Material Excerpt:\n---\n${excerpt.slice(0, 15000)}\n---` : 'Generate authoritative curriculum content grounded strictly on the specified title and topics.'}

Generate the detailed summary, check learning questions, and atomic RemNote active recall deck for this milestone based EXCLUSIVELY on the excerpt above.${
      isHindi
        ? ' Ensure all outputs are written strictly in pure Hindi (Devanagari script).'
        : ''
    }`;

    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
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
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: {
                  type: Type.OBJECT,
                  properties: {
                    compact: { type: Type.STRING },
                    detailed: { type: Type.STRING },
                  },
                  required: ['compact', 'detailed'],
                },
                checkLearning: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      options: { type: Type.ARRAY, items: { type: Type.STRING } },
                      correctIndex: { type: Type.INTEGER },
                      explanation: { type: Type.STRING },
                    },
                    required: ['question', 'options', 'correctIndex', 'explanation'],
                  },
                },
                recallDeck: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      front: { type: Type.STRING },
                      back: { type: Type.STRING },
                      sourceExcerpt: { type: Type.STRING },
                    },
                    required: ['front', 'back'],
                  },
                },
              },
              required: ['summary', 'checkLearning', 'recallDeck'],
            },
            temperature: 0.15,
          },
        });

        apiPromise.catch(() => {});

        const response = await Promise.race([apiPromise, timeoutPromise]);
        clearTimeout(timeoutId);

        const rawJson = (response.text || '').trim();
        if (rawJson) {
          const cleanJson = rawJson.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
          const parsed = JSON.parse(cleanJson);

          // Normalize summary structure if needed
          const normalizedSummary = typeof parsed.summary === 'object' && parsed.summary !== null
            ? {
                compact: String(parsed.summary.compact || parsed.summary.summary || 'Core summary'),
                detailed: String(parsed.summary.detailed || parsed.summary.notes || parsed.summary.compact || 'Detailed notes'),
              }
            : {
                compact: typeof parsed.summary === 'string' ? parsed.summary : 'Core summary',
                detailed: typeof parsed.summary === 'string' ? parsed.summary : 'Detailed notes',
              };

          const normalizedCheckLearning = Array.isArray(parsed.checkLearning)
            ? parsed.checkLearning.map((q: any) => ({
                question: String(q.question || `Key question on ${milestoneTitle}`),
                options: Array.isArray(q.options) && q.options.length >= 2 ? q.options.map(String) : ['Option A', 'Option B', 'Option C', 'Option D'],
                correctIndex: typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0,
                explanation: String(q.explanation || 'Verified from excerpt'),
              }))
            : [];

          const normalizedRecallDeck = Array.isArray(parsed.recallDeck)
            ? parsed.recallDeck.map((c: any) => ({
                front: String(c.front || `Key question on ${milestoneTitle}`),
                back: String(c.back || 'Key target answer'),
                sourceExcerpt: String(c.sourceExcerpt || ''),
              }))
            : [];

          const normalizedPayload = {
            summary: normalizedSummary,
            checkLearning: normalizedCheckLearning,
            recallDeck: normalizedRecallDeck,
          };

          const validated = MilestoneContentResponseSchema.safeParse(normalizedPayload);
          if (validated.success) {
            console.log(`[GenerateMilestoneContent] Successfully generated content with ${model}`);
            return validated.data;
          }
        }
      } catch (err: any) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        const isQuota = err?.status === 429 || `${err?.message}`.includes('429') || `${err?.message}`.includes('RESOURCE_EXHAUSTED');
        if (isQuota) {
          console.warn(`[GenerateMilestoneContent] Model ${model} rate-limited (429), trying fallback model...`);
          await new Promise((res) => setTimeout(res, 200));
        } else {
          console.warn(`[GenerateMilestoneContent] Model ${model} unavailable (${err?.message || 'error'}), trying fallback model...`);
        }
      }
    }
  }

  // Grounded topic-specific fallback if Gemini is offline or unavailable
  console.log(`[GenerateMilestoneContent] Building grounded fallback for "${milestoneTitle}"`);
  return createGroundedMilestoneContent(milestoneTitle, coreTopics, chapterName, reqBody.subjectName, excerpt);
}

function createGroundedMilestoneContent(
  milestoneTitle: string,
  coreTopics: string[],
  chapterName: string,
  subjectName?: string,
  excerpt: string = ''
): MilestoneContentResponse {
  const isHindi = isHindiSubject(subjectName, chapterName, `${milestoneTitle} ${coreTopics.join(' ')} ${excerpt}`);

  // Extract sentences from the actual excerpt
  const sentences = excerpt
    ? excerpt
        .replace(/\[Page\s+\d+\]/gi, '')
        .split(/[।.\n!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 15 && s.length <= 250)
    : [];

  const entities = isHindi
    ? extractHindiKeyEntities(excerpt || `${milestoneTitle} ${coreTopics.join(' ')}`, 6)
    : coreTopics.length > 0
    ? coreTopics
    : [milestoneTitle];

  const topicsList = entities.length > 0 ? entities : (coreTopics.length > 0 ? coreTopics : [milestoneTitle]);

  const topSentences = sentences.slice(0, 4);
  const s1 = topSentences[0] || `${milestoneTitle} का महत्वपूर्ण प्रसंग।`;
  const s2 = topSentences[1] || topSentences[0] || `${chapterName} के मुख्य विचार।`;

  if (isHindi) {
    const compactSummary = sentences.length > 0
      ? `### मुख्य पंक्तियाँ एवं विवरण: ${milestoneTitle}
${topSentences.map((s) => `• "${s}"`).join('\n')}
• **प्रमुख पात्र / प्रसंग**: ${topicsList.join(', ')}`
      : `### मुख्य बिंदु: ${milestoneTitle}
${topicsList.map((t) => `- **${t}**: '${chapterName}' का महत्वपूर्ण संदर्भ।`).join('\n')}`;

    const detailedSummary = `## ${milestoneTitle} — अध्ययन नोट्स

### 1. पाठ्यांश के मूल विचार एवं प्रसंग
${topSentences.length > 0
  ? topSentences.map((s, i) => `${i + 1}. **मूल पंक्ति**: "${s}"\n   - **व्याख्या**: यह प्रसंग '${chapterName}' में ${topicsList[i % topicsList.length] || 'घटना'} के महत्वपूर्ण विवरण को स्पष्ट करता है।`).join('\n\n')
  : `यह खंड **${chapterName}** के अंतर्गत **${milestoneTitle}** के मुख्य प्रसंगों और विचारों का विश्लेषण प्रस्तुत करता है।`}

### 2. मुख्य पात्र, संवाद एवं भाषा-शैली
- **प्रमुख विषय व पात्र**: ${topicsList.join(', ')}
- **परीक्षा की दृष्टि से महत्वपूर्ण**: बोर्ड परीक्षा में इन पंक्तियों के संदर्भ, पात्रों के भाव तथा शब्दार्थ पर आधारित प्रश्न पूछे जाते हैं।`;

    const checkLearning = [
      {
        question: `पाठ्यांश के अनुसार: "${s1.slice(0, 100)}..." का संबंध किस प्रसंग से है?`,
        options: [
          `यह '${chapterName}' के इस खंड में ${topicsList[0] || 'मूल पात्र/घटना'} के संदर्भ को स्पष्ट करता है।`,
          'यह पाठ के विपरीत एक असत्य एवं काल्पनिक प्रसंग है।',
          'इसका पाठ की मूल कथावस्तु से कोई संबंध नहीं है।',
          'यह किसी अन्य अप्रासंगिक घटना का सामान्य कथन है।',
        ],
        correctIndex: 0,
        explanation: `पाठ की वास्तविक पंक्ति: "${s1}"।`,
      },
      {
        question: `इस खंड में उल्लिखित मुख्य प्रसंग या पात्र '${topicsList[0] || milestoneTitle}' का क्या महत्व है?`,
        options: [
          `यह इस अंश में वर्णित घटनाक्रम और विचारों का मुख्य आधार है।`,
          'यह केवल एक अप्रसांगिक शब्द है।',
          'इसका पाठ के कथानक में कोई स्थान नहीं है।',
          'यह पाठ के भाव के विपरीत है।',
        ],
        correctIndex: 0,
        explanation: `'${topicsList[0] || milestoneTitle}' इस खंड का मुख्य प्रतिपाद्य है।`,
      },
    ];

    const recallDeck = [
      {
        front: `'${chapterName}' के इस खंड में '${topicsList[0] || milestoneTitle}' के बारे में क्या उल्लेख है?`,
        back: s2.length > 90 ? s2.slice(0, 90) + '...' : s2,
        sourceExcerpt: `मूल पाठ्यांश: "${s1.slice(0, 140)}"`,
      },
      {
        front: `इस अंश में उल्लिखित महत्वपूर्ण पंक्ति: "${s1.slice(0, 70)}..." का संदर्भ क्या है?`,
        back: `${topicsList.slice(0, 2).join(' / ')} का प्रसंग।`,
        sourceExcerpt: `${chapterName} › ${milestoneTitle}`,
      },
    ];

    return {
      summary: {
        compact: compactSummary,
        detailed: detailedSummary,
      },
      checkLearning,
      recallDeck,
    };
  }

  // English Fallback
  const compactSummary = sentences.length > 0
    ? `### Key Excerpts: ${milestoneTitle}
${topSentences.map((s) => `• "${s}"`).join('\n')}
• **Core Principles**: ${topicsList.join(', ')}`
    : `### Key Takeaways: ${milestoneTitle}
${topicsList.map((t) => `- **${t}**: Essential syllabus component for ${chapterName}.`).join('\n')}`;

  const detailedSummary = `## ${milestoneTitle} — Syllabus Notes

### Direct Excerpts & Principles
${topSentences.length > 0
  ? topSentences.map((s, i) => `${i + 1}. **Source Statement**: "${s}"\n   - **Mechanism**: Establishes rule for ${topicsList[i % topicsList.length] || 'concept'}.`).join('\n\n')
  : `Detailed conceptual breakdown for **${milestoneTitle}** in **${chapterName}**.`}

### Key Parameters & Terms
- **Identified Modules**: ${topicsList.join(', ')}
- **Problem Solving**: Review direct application of these principles in exam problems.`;

  const checkLearning = [
    {
      question: `According to the source excerpt: "${s1.slice(0, 100)}...", what principle is established?`,
      options: [
        `It defines the core mechanism and relationship for ${topicsList[0] || 'the section'}.`,
        'It is an empirical approximation with no theoretical significance.',
        'It applies only when external boundary conditions are ignored.',
        'It is an outdated convention replaced by arbitrary standards.',
      ],
      correctIndex: 0,
      explanation: `Direct quote from text: "${s1}"`,
    },
  ];

  const recallDeck = [
    {
      front: `State the key principle established for ${topicsList[0] || milestoneTitle}.`,
      back: s2.length > 90 ? s2.slice(0, 90) + '...' : s2,
      sourceExcerpt: `Direct from source: "${s1.slice(0, 140)}"`,
    },
  ];

  return {
    summary: {
      compact: compactSummary,
      detailed: detailedSummary,
    },
    checkLearning,
    recallDeck,
  };
}
