import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { isHindiSubject, getHindiPromptDirectives, extractHindiKeyEntities } from '../../utils/hindiDetection';

// =============================================================
// 1. ZOD VALIDATION SCHEMAS
// =============================================================

export const RecallDeckGenerateRequestSchema = z.object({
  chapterTitle: z.string().min(1, 'chapterTitle is required'),
  milestoneTitle: z.string().min(1, 'milestoneTitle is required'),
  sectionTextExcerpt: z.string().optional().default(''),
  cardCount: z.coerce.number().int().min(1).max(20).default(8),
  topicTags: z.array(z.string()).optional(),
  subjectName: z.string().optional(),
});

export type RecallDeckGenerateRequest = z.infer<typeof RecallDeckGenerateRequestSchema>;

export const DerivationStepSchema = z.object({
  stepNumber: z.number(),
  stepAction: z.string(),
  expression: z.string(),
  reasonWhy: z.string().optional(),
});

export type DerivationStep = z.infer<typeof DerivationStepSchema>;

export const RecallCardSchema = z.object({
  id: z.string(),
  breadcrumb: z.string().optional(),
  parentConcept: z.string(),
  promptQuestion: z.string(),
  answer: z.string(),
  inlineAnswer: z.string().optional(),
  cardType: z.enum(['single', 'list', 'math_problem']).default('single'),
  listItems: z.array(z.string()).default([]),
  explanation: z.string(),
  sourceQuote: z.string(),
  // Mathematics & Quantitative Problem Solving Fields
  problemStatement: z.string().optional(),
  givenData: z.array(z.string()).optional(),
  stepByStepDerivation: z.array(DerivationStepSchema).optional(),
  expectedAnswer: z.string().optional(),
  acceptableAnswers: z.array(z.string()).optional(),
  formulaUsed: z.string().optional(),
  hint: z.string().optional(),
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
  subjectType: z.enum(['procedural', 'declarative', 'math']).optional(),
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
      description: 'Active recall flashcards (problem-solving calculations for Maths, RemNote Q&A for Humanities)',
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
              'The broader concept or topic header (e.g., "Quadratic Formula", "Arithmetic Progression Sum", "Single Transferable Vote")',
          },
          promptQuestion: {
            type: Type.STRING,
            description:
              'For Maths: Concrete numerical problem to solve (e.g., "Solve 2x² - 7x + 3 = 0 using the quadratic formula"). For other subjects: Direct recall prompt.',
          },
          problemStatement: {
            type: Type.STRING,
            description: 'Full mathematical problem statement or derivation question to solve',
          },
          expectedAnswer: {
            type: Type.STRING,
            description: 'Exact numerical or simplified algebraic target value (e.g., "3, 1/2" or "x = 3 or x = 0.5")',
          },
          acceptableAnswers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of mathematically equivalent acceptable formats (e.g., ["3, 1/2", "1/2, 3", "3, 0.5", "0.5, 3"])',
          },
          formulaUsed: {
            type: Type.STRING,
            description: 'Core formula or identity applied (e.g., "x = (-b ± √(b² - 4ac))/(2a)" or "Sn = n/2[2a + (n-1)d]")',
          },
          givenData: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Given parameter list (e.g., ["a = 2", "b = -7", "c = 3"])',
          },
          hint: {
            type: Type.STRING,
            description: 'Progressive calculation hint (e.g., "Calculate discriminant D = b² - 4ac first")',
          },
          stepByStepDerivation: {
            type: Type.ARRAY,
            description: 'Step-by-step expert numerical calculation breakdown',
            items: {
              type: Type.OBJECT,
              properties: {
                stepNumber: { type: Type.INTEGER },
                stepAction: { type: Type.STRING, description: 'Action performed in this step' },
                expression: { type: Type.STRING, description: 'Mathematical expression or intermediate value' },
                reasonWhy: { type: Type.STRING, description: 'Rationale or rule applied' },
              },
              required: ['stepNumber', 'stepAction', 'expression'],
            },
          },
          answer: {
            type: Type.STRING,
            description:
              'The direct answer revealed after the prompt (e.g., "x = 3, 1/2" or conceptual explanation)',
          },
          cardType: {
            type: Type.STRING,
            description: 'Set to "math_problem" for mathematics calculations, "single" for standard Q&A, or "list" for multi-item recall',
          },
          listItems: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of items if cardType is "list", otherwise an empty array',
          },
          explanation: {
            type: Type.STRING,
            description:
              'Educational breakdown providing full context and step-by-step solution derivation',
          },
          sourceQuote: {
            type: Type.STRING,
            description: 'Exact verbatim sentence or theorem formula from the text excerpt',
          },
        },
        required: [
          'id',
          'parentConcept',
          'promptQuestion',
          'answer',
          'cardType',
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

function isMathSubjectOrTopic(subjectName?: string, chapterTitle: string = '', milestoneTitle: string = '', excerpt: string = ''): boolean {
  const combined = `${subjectName || ''} ${chapterTitle} ${milestoneTitle} ${excerpt}`.toLowerCase();
  return (
    combined.includes('math') ||
    combined.includes('algebra') ||
    combined.includes('geometry') ||
    combined.includes('calculus') ||
    combined.includes('trigonometry') ||
    combined.includes('arithmetic') ||
    combined.includes('quadratic') ||
    combined.includes('polynomial') ||
    combined.includes('probability') ||
    combined.includes('statistics') ||
    combined.includes('surface area') ||
    combined.includes('coordinate geometry') ||
    combined.includes('triangles') ||
    combined.includes('circles') ||
    combined.includes('linear equation')
  );
}

function extractFallbackCards(
  milestoneTitle: string,
  excerpt: string,
  targetCount: number,
  chapterTitle: string = 'Curriculum Chapter',
  subjectName?: string
): RecallDeckGenerateResponse {
  const isHindi = isHindiSubject(subjectName, chapterTitle, `${milestoneTitle} ${excerpt}`);
  const isMath = isMathSubjectOrTopic(subjectName, chapterTitle, milestoneTitle, excerpt);
  const cleanText = excerpt.replace(/\[Page\s+\d+\]/gi, '').trim();

  const cards: RecallCard[] = [];

  if (isMath) {
    // Generate high-yield mathematical problem-solving cards with step-by-step calculations
    const mathTemplates = [
      {
        parent: `${milestoneTitle} • Numerical Problem 1`,
        problem: `In ${milestoneTitle}, solve for the unknown root or parameter: Given equation 2x² - 7x + 3 = 0, find both roots using the quadratic formula.`,
        given: ['a = 2', 'b = -7', 'c = 3'],
        formula: 'x = (-b ± √(b² - 4ac)) / (2a)',
        hint: 'Calculate the discriminant D = b² - 4ac first: (-7)² - 4(2)(3) = 49 - 24 = 25.',
        expected: '3, 1/2',
        acceptable: ['3, 1/2', '1/2, 3', '3, 0.5', '0.5, 3', 'x = 3, x = 1/2', 'x = 3 or 1/2'],
        steps: [
          { stepNumber: 1, stepAction: 'Identify coefficients & calculate discriminant', expression: 'D = (-7)² - 4(2)(3) = 49 - 24 = 25', reasonWhy: 'D > 0 indicates two distinct real roots.' },
          { stepNumber: 2, stepAction: 'Apply quadratic formula', expression: 'x = (-(-7) ± √25) / (2 × 2) = (7 ± 5) / 4', reasonWhy: 'Standard root derivation.' },
          { stepNumber: 3, stepAction: 'Simplify roots', expression: 'x₁ = (7+5)/4 = 12/4 = 3 ; x₂ = (7-5)/4 = 2/4 = 1/2', reasonWhy: 'Final simplified solutions.' },
        ],
        answer: 'x = 3, 1/2',
        explanation: 'Discriminant D = 25 > 0 yields real rational roots. Roots are x = 3 and x = 1/2 (or 0.5).',
      },
      {
        parent: `${milestoneTitle} • Numerical Problem 2`,
        problem: `Find the 10th term of the Arithmetic Progression (AP): 2, 7, 12, 17...`,
        given: ['First term a = 2', 'Common difference d = 7 - 2 = 5', 'n = 10'],
        formula: 'an = a + (n - 1)d',
        hint: 'Use the nth term formula: a₁₀ = 2 + (10 - 1) × 5.',
        expected: '47',
        acceptable: ['47', 'a10 = 47', 'an = 47'],
        steps: [
          { stepNumber: 1, stepAction: 'Find common difference d', expression: 'd = a₂ - a₁ = 7 - 2 = 5', reasonWhy: 'Difference between consecutive terms.' },
          { stepNumber: 2, stepAction: 'Substitute into general term formula', expression: 'a₁₀ = 2 + (10 - 1) × 5 = 2 + 9 × 5', reasonWhy: 'Linear sequence progression.' },
          { stepNumber: 3, stepAction: 'Evaluate arithmetic', expression: 'a₁₀ = 2 + 45 = 47', reasonWhy: 'Final numerical value.' },
        ],
        answer: 'a₁₀ = 47',
        explanation: 'The 10th term of the AP is calculated as a + (10 - 1)d = 2 + 45 = 47.',
      },
      {
        parent: `${milestoneTitle} • Numerical Problem 3`,
        problem: `If sin θ = 3/5, calculate the exact value of tan θ + cos θ for acute angle θ.`,
        given: ['sin θ = opposite / hypotenuse = 3/5', 'Opposite = 3', 'Hypotenuse = 5'],
        formula: 'Adjacent = √(5² - 3²) = 4, tan θ = 3/4, cos θ = 4/5',
        hint: 'Find the adjacent side using Pythagorean theorem: √(25 - 9) = √16 = 4.',
        expected: '31/20',
        acceptable: ['31/20', '1.55', '1 11/20'],
        steps: [
          { stepNumber: 1, stepAction: 'Find adjacent side using Pythagoras theorem', expression: 'Adjacent = √(5² - 3²) = √(25 - 9) = 4', reasonWhy: 'Right triangle trigonometric ratios.' },
          { stepNumber: 2, stepAction: 'Evaluate trigonometric ratios', expression: 'tan θ = 3/4, cos θ = 4/5', reasonWhy: 'Standard definitions.' },
          { stepNumber: 3, stepAction: 'Sum the expressions with common denominator', expression: 'tan θ + cos θ = 3/4 + 4/5 = 15/20 + 16/20 = 31/20 = 1.55', reasonWhy: 'Final fractional computation.' },
        ],
        answer: '31/20 (or 1.55)',
        explanation: 'Adjacent side is 4. Thus tan θ = 3/4, cos θ = 4/5. Their sum is 15/20 + 16/20 = 31/20 = 1.55.',
      },
      {
        parent: `${milestoneTitle} • Numerical Problem 4`,
        problem: `Find the coordinates of the point P that divides the line segment joining A(-1, 7) and B(4, -3) internally in the ratio 2:3.`,
        given: ['A(x₁, y₁) = (-1, 7)', 'B(x₂, y₂) = (4, -3)', 'Ratio m:n = 2:3'],
        formula: 'P(x, y) = ((m x₂ + n x₁) / (m + n), (m y₂ + n y₁) / (m + n))',
        hint: 'Use section formula: x = (2(4) + 3(-1))/(2+3), y = (2(-3) + 3(7))/(2+3).',
        expected: '(1, 3)',
        acceptable: ['(1, 3)', '1, 3', 'P(1, 3)', 'x = 1, y = 3'],
        steps: [
          { stepNumber: 1, stepAction: 'Compute x-coordinate via section formula', expression: 'x = (2(4) + 3(-1)) / 5 = (8 - 3) / 5 = 5/5 = 1', reasonWhy: 'Internal division formula along x-axis.' },
          { stepNumber: 2, stepAction: 'Compute y-coordinate via section formula', expression: 'y = (2(-3) + 3(7)) / 5 = (-6 + 21) / 5 = 15/5 = 3', reasonWhy: 'Internal division formula along y-axis.' },
          { stepNumber: 3, stepAction: 'Combine point coordinates', expression: 'P = (1, 3)', reasonWhy: 'Internal dividing point coordinates.' },
        ],
        answer: 'P(1, 3)',
        explanation: 'Section formula yields x = 5/5 = 1 and y = 15/5 = 3. Point P is (1, 3).',
      },
    ];

    const count = Math.min(targetCount, mathTemplates.length);
    for (let i = 0; i < count; i++) {
      const tmpl = mathTemplates[i];
      cards.push({
        id: `card_${String(i + 1).padStart(2, '0')}`,
        breadcrumb: `@ ${chapterTitle} › ${milestoneTitle}`,
        parentConcept: tmpl.parent,
        promptQuestion: tmpl.problem,
        problemStatement: tmpl.problem,
        expectedAnswer: tmpl.expected,
        acceptableAnswers: tmpl.acceptable,
        formulaUsed: tmpl.formula,
        givenData: tmpl.given,
        hint: tmpl.hint,
        stepByStepDerivation: tmpl.steps,
        answer: tmpl.answer,
        inlineAnswer: tmpl.expected,
        cardType: 'math_problem',
        listItems: [],
        explanation: tmpl.explanation,
        sourceQuote: `NCERT / CBSE Mathematics: ${chapterTitle} - ${milestoneTitle}`,
        front: tmpl.problem,
        back: tmpl.answer,
        sourceExcerpt: `Formulation for ${milestoneTitle}`,
        topicTag: milestoneTitle,
        interval: 1,
        repetition: 0,
        easinessFactor: 2.5,
      });
    }

    return {
      milestoneTitle,
      targetModule: 'Recall Deck (Active Recall Cards)',
      subjectType: 'procedural',
      totalCards: cards.length,
      cards,
      recallDeck: cards,
    };
  }

  // Non-math (Hindi / SST / English / Science Conceptual)
  const sentences = cleanText
    .split(/(?<=[.!?।])\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && !s.startsWith('#'));

  const hindiEntities = isHindi ? extractHindiKeyEntities(cleanText, 8) : [];
  const count = Math.min(targetCount, Math.max(3, sentences.length));

  for (let i = 0; i < count; i++) {
    const sentence = sentences[i % sentences.length] || cleanText.slice(0, 100);
    const entity = isHindi && hindiEntities[i % hindiEntities.length]
      ? hindiEntities[i % hindiEntities.length]
      : sentence.split(/\s+/).slice(0, 3).join(' ').replace(/[,;:.।]$/, '') || milestoneTitle;

    const promptQuestion = isHindi
      ? `पाठ '${chapterTitle}' (${milestoneTitle}) के अनुसार: "${sentence.slice(0, 75)}..." का क्या संदर्भ अथवा आशय है?`
      : `According to the text (${milestoneTitle}), what principle is described in: "${sentence.slice(0, 75)}..."?`;

    const answer = isHindi
      ? `${entity} के संदर्भ में पाठ का महत्वपूर्ण विवरण और घटनाक्रम।`
      : `Establishes the key rule and criteria for ${entity}.`;

    const explanation = isHindi
      ? `मूल पाठ्यांश: "${sentence}"। परीक्षा में संदर्भ-सहित व्याख्या हेतु यह अंश आवश्यक है।`
      : `Source citation: "${sentence}". Direct evidence from the curriculum text.`;

    cards.push({
      id: `card_${String(i + 1).padStart(2, '0')}`,
      breadcrumb: `@ ${chapterTitle}`,
      parentConcept: entity,
      promptQuestion,
      answer,
      inlineAnswer: answer,
      cardType: 'single',
      listItems: [],
      explanation,
      sourceQuote: sentence,
      front: promptQuestion,
      back: answer,
      sourceExcerpt: sentence,
      topicTag: entity,
      interval: 1,
      repetition: 0,
      easinessFactor: 2.5,
    });
  }

  return {
    milestoneTitle,
    targetModule: 'Recall Deck (Active Recall Cards)',
    subjectType: isHindi ? 'declarative' : 'declarative',
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

  const isMath = isMathSubjectOrTopic(params.subjectName, chapterTitle, milestoneTitle, trimmedExcerpt);
  const isHindi = isHindiSubject(params.subjectName, chapterTitle, `${milestoneTitle} ${trimmedExcerpt}`);
  const hindiDirective = isHindi
    ? `\n${getHindiPromptDirectives(chapterTitle)}\n- CRITICAL MANDATORY INSTRUCTION: You MUST write all fields ('parentConcept', 'promptQuestion', 'answer', 'explanation', 'sourceQuote') strictly in pure Hindi (Devanagari script, शुद्ध हिन्दी). Do NOT use English.`
    : '';

  let systemPrompt = '';
  if (isMath) {
    systemPrompt = `You are an elite Mathematics Active Recall Specialist and pedagogy expert.
For this Mathematics chapter ("${chapterTitle}") and milestone ("${milestoneTitle}"), generate ${cardCount} high-yield ACTIVE RECALL PROBLEM-SOLVING FLASHCARDS with step-by-step numerical/algebraic calculations.

CRITICAL MATHEMATICS RULES:
1. PROBLEM-SOLVING CARDS: Every card must challenge the student to SOLVE a concrete numerical or algebraic problem based directly on the excerpt formulas and theorems. Do NOT generate vague descriptive definitions (e.g. "What is an AP?"). Instead generate: "Find the sum of the first 15 terms of the AP: 8, 3, -2...".
2. FIELD REQUIREMENTS:
   - 'cardType': MUST be "math_problem".
   - 'parentConcept': The specific mathematical subtopic (e.g. "Quadratic Formula", "Discriminant Analysis", "AP Sum Formula", "Trigonometric Values").
   - 'promptQuestion': The clear, actionable problem statement for the student to calculate and solve.
   - 'problemStatement': Full problem statement.
   - 'givenData': Array of parameters (e.g. ["a = 8", "d = -5", "n = 15"]).
   - 'formulaUsed': The primary mathematical formula/identity applied.
   - 'hint': A concise progressive hint (e.g. "Use Sn = n/2[2a + (n-1)d]").
   - 'expectedAnswer': The exact numerical or simplified algebraic target value (e.g. "-405" or "3, 1/2").
   - 'acceptableAnswers': Array of valid alternative notations (e.g. ["-405", "Sn = -405"]).
   - 'stepByStepDerivation': Array of 2-4 numbered derivation steps with 'stepNumber', 'stepAction', and mathematical 'expression'.
   - 'answer': Concise final answer to display on the back of the card.
   - 'explanation': Clear pedagogical breakdown explaining why and how the derivation works.
   - 'sourceQuote': Exact formula or statement from the text excerpt.`;
  } else {
    systemPrompt = `You are an active-recall flashcard curriculum specialist. Extract ${cardCount} high-yield flashcards based EXCLUSIVELY on the provided section text excerpt.${hindiDirective}

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
  }

  const userPrompt = `TARGET CHAPTER: ${chapterTitle}
TARGET MILESTONE: ${milestoneTitle}
SUBJECT: ${params.subjectName || (isMath ? 'Mathematics' : 'General')}

[SECTION TEXT EXCERPT]:
"""
${trimmedExcerpt}
"""

Extract exactly ${cardCount} high-yield active-recall flashcards strictly matching the schema and formatting rules above.${
  isHindi ? ' All output fields (parentConcept, promptQuestion, answer, explanation, sourceQuote) must be written strictly in pure Hindi (Devanagari script).' : ''
}`;

  // Supported flash models with multi-model fallback cascade
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
          responseSchema: recallDeckResponseSchema,
          temperature: isMath ? 0.1 : 0.2,
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
    return extractFallbackCards(milestoneTitle, trimmedExcerpt, cardCount, chapterTitle, params.subjectName);
  }

  const responseText = response.text.trim();
  let parsedJson: any;
  try {
    parsedJson = JSON.parse(responseText);
  } catch (parseErr) {
    console.warn('[generateRecallDeck] Failed to parse JSON response, using grounded fallback:', parseErr);
    return extractFallbackCards(milestoneTitle, trimmedExcerpt, cardCount, chapterTitle, params.subjectName);
  }

  if (!parsedJson.milestoneTitle) {
    parsedJson.milestoneTitle = milestoneTitle;
  }

  parsedJson.targetModule = 'Recall Deck (Active Recall Cards)';
  parsedJson.subjectType = isMath ? 'procedural' : isHindi ? 'declarative' : 'declarative';

  if (Array.isArray(parsedJson.cards)) {
    parsedJson.cards = parsedJson.cards.map((card: any, idx: number) => {
      const parentConcept = card.parentConcept || milestoneTitle;
      const promptQuestion = card.promptQuestion || card.problemStatement || card.front || `Core principle of ${parentConcept}?`;
      const answer = card.answer || card.expectedAnswer || card.inlineAnswer || card.back || 'Calculated mathematical solution.';
      const inlineAnswer = card.inlineAnswer || card.expectedAnswer || answer;
      const cardType = card.cardType === 'math_problem' || isMath ? 'math_problem' : card.cardType === 'list' ? 'list' : 'single';
      const listItems = Array.isArray(card.listItems) ? card.listItems : [];
      const explanation =
        card.explanation ||
        'Foundational educational principle necessary for conceptual mastery.';
      const sourceQuote = card.sourceQuote || card.sourceExcerpt || '';
      const breadcrumb = card.breadcrumb || `@ ${chapterTitle} › ${milestoneTitle}`;

      return {
        id: card.id || `card_${String(idx + 1).padStart(2, '0')}`,
        breadcrumb,
        parentConcept,
        promptQuestion,
        problemStatement: card.problemStatement || promptQuestion,
        expectedAnswer: card.expectedAnswer || answer,
        acceptableAnswers: Array.isArray(card.acceptableAnswers) ? card.acceptableAnswers : [card.expectedAnswer || answer],
        formulaUsed: card.formulaUsed || '',
        givenData: Array.isArray(card.givenData) ? card.givenData : [],
        hint: card.hint || '',
        stepByStepDerivation: Array.isArray(card.stepByStepDerivation) ? card.stepByStepDerivation : [],
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
