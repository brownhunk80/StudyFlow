import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';
import { isHindiSubject, getHindiPromptDirectives, extractHindiKeyEntities } from '../../utils/hindiDetection';

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

export const FadedStage1Schema = z.object({
  stage: z.literal(1),
  stageTitle: z.string().default('Stage 1: Fully Worked Example'),
  problemStatement: z.string(),
  fullDerivationSteps: z.array(
    z.object({
      step: z.number(),
      action: z.string(),
      reasonWhy: z.string(),
    })
  ),
  keyTakeaway: z.string(),
});

export type FadedStage1 = z.infer<typeof FadedStage1Schema>;

export const FadedStage2Schema = z.object({
  stage: z.literal(2),
  stageTitle: z.string().default('Stage 2: Faded Scaffold (Complete the Missing Step)'),
  problemStatement: z.string(),
  givenSteps: z.array(z.string()),
  fadedMissingStepPrompt: z.string(),
  benchmarkMissingStep: z.string(),
  solution: z.string(),
  fadedStepHint: z.string().optional(),
  alternativeAcceptableAnswers: z.array(z.string()).optional(),
});

export type FadedStage2 = z.infer<typeof FadedStage2Schema>;

export const FadedStage3Schema = z.object({
  stage: z.literal(3),
  stageTitle: z.string().default('Stage 3: Independent Practice'),
  problemStatement: z.string(),
  benchmarkAnswer: z.string(),
  scoringCriteria: z.array(z.string()),
  trapAnalysis: z.string().optional(),
});

export type FadedStage3 = z.infer<typeof FadedStage3Schema>;

export const WorkedExampleStepSchema = z.object({
  stepNumber: z.number(),
  label: z.string(),
  expressionOrAction: z.string(),
  rationale: z.string(),
  isFaded: z.boolean().optional(),
  fadedPlaceholder: z.string().optional(),
  fadedExpectedAnswer: z.string().optional(),
  fadedAlternativeAnswers: z.array(z.string()).optional(),
});

export type WorkedExampleStep = z.infer<typeof WorkedExampleStepSchema>;

export const WorkedExampleProblemSchema = z.object({
  problemStatement: z.string(),
  givenData: z.array(
    z.object({
      symbol: z.string(),
      value: z.string(),
      meaning: z.string(),
    })
  ),
  governingFormulaOrLaw: z.string(),
  steps: z.array(WorkedExampleStepSchema),
  finalAnswer: z.string(),
  teacherKeyTip: z.string(),
});

export type WorkedExampleProblem = z.infer<typeof WorkedExampleProblemSchema>;

export const FadedScaffoldProblemSchema = z.object({
  problemStatement: z.string(),
  givenData: z.array(
    z.object({
      symbol: z.string(),
      value: z.string(),
      meaning: z.string(),
    })
  ),
  governingFormulaOrLaw: z.string(),
  steps: z.array(WorkedExampleStepSchema),
  finalAnswer: z.string(),
  fadedStepHint: z.string(),
});

export type FadedScaffoldProblem = z.infer<typeof FadedScaffoldProblemSchema>;

export const WorkedExampleFadingPayloadSchema = z.object({
  mode: z.literal('worked_example_fading').default('worked_example_fading'),
  topicTag: z.string(),
  subjectType: z.enum(['Science', 'Maths', 'procedural', 'declarative']).default('Science'),
  fadedScaffolding: z.tuple([FadedStage1Schema, FadedStage2Schema, FadedStage3Schema]).optional(),
  workedExample: WorkedExampleProblemSchema,
  fadedScaffold: FadedScaffoldProblemSchema,
  independentProblem: z.object({
    id: z.string(),
    prompt: z.string(),
    benchmarkAnswer: z.string(),
    keyPointsToVerify: z.array(z.string()),
    trapAnalysis: z.string(),
    sourceCitation: z.string().optional(),
  }),
});

export type WorkedExampleFadingPayload = z.infer<typeof WorkedExampleFadingPayloadSchema>;

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
  targetModule: z.literal('Module 2: Conceptual Checkpoints').optional().default('Module 2: Conceptual Checkpoints'),
  subjectType: z.enum(['procedural', 'declarative', 'Science', 'Maths', 'SST', 'Hindi', 'General']).optional(),
  fadedScaffolding: z.array(z.any()).optional(),
  checkpoints: z.array(CheckpointItemSchema).optional().default([]),
  workedExampleFading: WorkedExampleFadingPayloadSchema.optional(),
});

export type GenerateCheckpointsResponse = z.infer<typeof GenerateCheckpointsResponseSchema>;

export function isScienceOrMathSubject(subject?: string, chapterName?: string, content?: string): boolean {
  const text = `${subject || ''} ${chapterName || ''} ${content || ''}`.toLowerCase();
  const mathKeywords = [
    'math',
    'maths',
    'mathematics',
    'algebra',
    'geometry',
    'trigonometry',
    'quadratic',
    'calculus',
    'probability',
    'statistics',
    'arithmetic',
    'polynomial',
    'coordinate',
    'triangle',
    'circle',
  ];
  const scienceKeywords = [
    'science',
    'physics',
    'chemistry',
    'biology',
    'optics',
    'reflection',
    'refraction',
    'electricity',
    'magnetism',
    'chemical',
    'reaction',
    'equation',
    'stoichiometry',
    'acid',
    'base',
    'salt',
    'carbon',
    'metal',
    'non-metal',
    'light',
    'mirror',
    'lens',
    'current',
    'voltage',
    'resistance',
    'force',
    'motion',
    'gravitation',
    'work',
    'energy',
    'power',
    'cell',
    'tissue',
    'photosynthesis',
    'respiration',
    'reproduction',
    'heredity',
    'evolution',
  ];

  return mathKeywords.some((k) => text.includes(k)) || scienceKeywords.some((k) => text.includes(k));
}

// =============================================================
// DETERMINISTIC HUMAN-TEACHER FALLBACK GENERATOR
// =============================================================

function extractMeaningfulSentences(text: string): string[] {
  if (!text) return [];
  return text
    .replace(/^#+\s+.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[Page\s+\d+\]/gi, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^[•\-\*]\s+/gm, '')
    .split(/(?<=[.?!।])\s+|\n{2,}/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 20 && !s.startsWith('#') && !s.startsWith('>'));
}

function buildFadedScaffoldingArray(
  workedExample: WorkedExampleProblem,
  fadedScaffold: FadedScaffoldProblem,
  independentProblem: any
): [FadedStage1, FadedStage2, FadedStage3] {
  const stage1: FadedStage1 = {
    stage: 1,
    stageTitle: 'Stage 1: Fully Worked Example',
    problemStatement: workedExample.problemStatement,
    fullDerivationSteps: workedExample.steps.map((s, idx) => ({
      step: s.stepNumber || idx + 1,
      action: `${s.label}: ${s.expressionOrAction}`,
      reasonWhy: s.rationale,
    })),
    keyTakeaway: workedExample.teacherKeyTip || `Final Result: ${workedExample.finalAnswer}`,
  };

  const fadedStep = fadedScaffold.steps.find((s) => s.isFaded) || fadedScaffold.steps[1] || fadedScaffold.steps[0];
  const givenSteps = fadedScaffold.steps
    .filter((s) => !s.isFaded)
    .map((s) => `Step ${s.stepNumber}: ${s.label} → ${s.expressionOrAction}`);

  const stage2: FadedStage2 = {
    stage: 2,
    stageTitle: 'Stage 2: Faded Scaffold (Complete the Missing Step)',
    problemStatement: fadedScaffold.problemStatement,
    givenSteps: givenSteps.length > 0 ? givenSteps : [`Formula: ${fadedScaffold.governingFormulaOrLaw}`],
    fadedMissingStepPrompt: fadedStep
      ? `Step ${fadedStep.stepNumber} (${fadedStep.label}): Calculate the intermediate derivation value for ${fadedStep.expressionOrAction.replace('[BLANK]', '______')}`
      : 'Calculate the missing intermediate step calculation value.',
    benchmarkMissingStep: fadedStep?.fadedExpectedAnswer || fadedScaffold.finalAnswer,
    solution: fadedScaffold.finalAnswer,
    fadedStepHint: fadedScaffold.fadedStepHint,
    alternativeAcceptableAnswers: fadedStep?.fadedAlternativeAnswers || [],
  };

  const stage3: FadedStage3 = {
    stage: 3,
    stageTitle: 'Stage 3: Independent Practice',
    problemStatement: independentProblem.prompt,
    benchmarkAnswer: independentProblem.benchmarkAnswer,
    scoringCriteria: independentProblem.keyPointsToVerify || [],
    trapAnalysis: independentProblem.trapAnalysis,
  };

  return [stage1, stage2, stage3];
}

function generateDeterministicWorkedExampleFading(
  chapterTitle: string,
  milestoneTitle: string,
  topicTags: string[],
  excerpt: string,
  subjectName?: string
): WorkedExampleFadingPayload {
  const isMath = `${subjectName || ''} ${chapterTitle} ${milestoneTitle}`.toLowerCase().includes('math');
  const subjectType: 'Science' | 'Maths' = isMath ? 'Maths' : 'Science';
  const primaryTopic = topicTags[0] || milestoneTitle;

  // Detect common physics / chemistry / math themes from excerpt
  const lowerExcerpt = excerpt.toLowerCase();

  if (lowerExcerpt.includes('mirror') || lowerExcerpt.includes('lens') || lowerExcerpt.includes('focal') || lowerExcerpt.includes('reflection') || lowerExcerpt.includes('refraction')) {
    const isConcave = lowerExcerpt.includes('concave');
    const workedExample: WorkedExampleProblem = {
      problemStatement: `An object is placed at a distance of 30 cm in front of a ${isConcave ? 'concave' : 'convex'} mirror of focal length 20 cm. Find the position, nature, and magnification of the image.`,
      givenData: [
        { symbol: 'u', value: '-30 cm', meaning: 'Object distance (always negative in Cartesian convention)' },
        { symbol: 'f', value: isConcave ? '-20 cm' : '+20 cm', meaning: `Focal length of ${isConcave ? 'concave mirror (negative)' : 'convex mirror (positive)'}` },
      ],
      governingFormulaOrLaw: 'Mirror Formula: 1/f = 1/v + 1/u and Magnification: m = -v/u',
      steps: [
        {
          stepNumber: 1,
          label: 'Assign Cartesian Sign Conventions',
          expressionOrAction: `u = -30 cm, f = ${isConcave ? '-20 cm' : '+20 cm'}`,
          rationale: 'In New Cartesian Sign Convention, distances measured opposite to the incident light (in front of mirror) are negative.',
        },
        {
          stepNumber: 2,
          label: 'Substitute into Mirror Formula & Solve for v',
          expressionOrAction: `1/v = 1/f - 1/u = 1/(${isConcave ? '-20' : '20'}) - 1/(-30) = ${isConcave ? '-1/20 + 1/30 = (-3 + 2)/60 = -1/60' : '1/20 + 1/30 = (3 + 2)/60 = 5/60 = 1/12'} ⇒ v = ${isConcave ? '-60 cm' : '+12 cm'}`,
          rationale: 'Rearrange 1/f = 1/v + 1/u to isolate 1/v before cross-multiplying and taking the reciprocal.',
        },
        {
          stepNumber: 3,
          label: 'Calculate Magnification & State Nature',
          expressionOrAction: `m = -v/u = -(${isConcave ? '-60' : '12'})/(-30) = ${isConcave ? '-2' : '+0.4'}`,
          rationale: `${isConcave ? 'Since v is negative, the image is formed 60 cm in front of mirror (Real & Inverted). Since |m| = 2 > 1, the image is magnified.' : 'Since v is positive, the image is formed 12 cm behind mirror (Virtual & Erect, Diminished).'}`,
        },
      ],
      finalAnswer: `Image position v = ${isConcave ? '-60 cm' : '+12 cm'}, Nature = ${isConcave ? 'Real & Inverted (m = -2)' : 'Virtual & Erect (m = +0.4)'}`,
      teacherKeyTip: 'Always remember: u is negative for all real objects in Cartesian convention. Do not drop the negative sign when subtracting negative numbers (1/f - (-1/u) = 1/f + 1/u).',
    };

    const fadedScaffold: FadedScaffoldProblem = {
      problemStatement: `An object is placed at a distance of 15 cm in front of a ${isConcave ? 'concave' : 'convex'} mirror of focal length 10 cm. Complete the faded intermediate calculation to determine the image distance (v).`,
      givenData: [
        { symbol: 'u', value: '-15 cm', meaning: 'Object distance' },
        { symbol: 'f', value: isConcave ? '-10 cm' : '+10 cm', meaning: 'Focal length' },
      ],
      governingFormulaOrLaw: '1/v = 1/f - 1/u',
      steps: [
        {
          stepNumber: 1,
          label: 'Cartesian Convention Setup',
          expressionOrAction: `u = -15 cm, f = ${isConcave ? '-10 cm' : '+10 cm'}`,
          rationale: 'Establish known variables with standard sign conventions.',
        },
        {
          stepNumber: 2,
          label: 'Solve for Image Distance (v)',
          expressionOrAction: `1/v = 1/(${isConcave ? '-10' : '10'}) - 1/(-15) = [BLANK]`,
          rationale: 'Calculate the common denominator (30) and compute the reciprocal.',
          isFaded: true,
          fadedPlaceholder: isConcave ? 'e.g., -30 cm or v = -30' : 'e.g., 6 cm or v = 6',
          fadedExpectedAnswer: isConcave ? '-30' : '6',
          fadedAlternativeAnswers: isConcave ? ['-30 cm', 'v = -30', 'v = -30 cm', '-30cm', '-1/30'] : ['6 cm', 'v = 6', 'v = 6 cm', '6cm', '1/6'],
        },
        {
          stepNumber: 3,
          label: 'Magnification & Interpretation',
          expressionOrAction: `m = -v/u = -(${isConcave ? '-30' : '6'})/(-15) = ${isConcave ? '-2' : '+0.4'} (${isConcave ? 'Real, Inverted, Magnified' : 'Virtual, Erect, Diminished'})`,
          rationale: 'Interpret the physical meaning of the sign and magnitude of magnification.',
        },
      ],
      finalAnswer: `v = ${isConcave ? '-30 cm' : '+6 cm'}`,
      fadedStepHint: `Hint: 1/(-10) - 1/(-15) = -1/10 + 1/15 = (-3 + 2)/30 = -1/30. Take reciprocal to get v.`,
    };

    const independentProblem = {
      id: 'chk_ind_01',
      prompt: `A concave mirror produces a real image of size 3 times that of the object placed at 20 cm in front of it. Calculate the focal length of the mirror and write the Cartesian sign conventions applied.`,
      benchmarkAnswer: `**1. Given Data & Sign Application:**\nu = -20 cm. Since image is real, m = -3 (m = -v/u ⇒ -3 = -v/(-20) ⇒ v = -60 cm).\n\n**2. Mirror Formula Derivation:**\n1/f = 1/v + 1/u = 1/(-60) + 1/(-20) = (-1 - 3)/60 = -4/60 = -1/15.\nTaking reciprocal: f = -15 cm.\n\n**3. Conclusion:**\nThe focal length of the concave mirror is 15 cm (f = -15 cm, negative sign confirms concave nature).`,
      keyPointsToVerify: [
        'Correctly sets m = -3 for a real inverted image',
        'Computes image distance v = -60 cm correctly',
        'Calculates focal length f = -15 cm with negative sign',
      ],
      trapAnalysis: 'Common Pitfall: Taking magnification as +3 instead of -3. Remember: Real images always have negative magnification, whereas virtual images have positive magnification.',
      sourceCitation: 'NCERT Science Class 10, Chapter: Light - Reflection and Refraction',
    };

    return {
      mode: 'worked_example_fading',
      topicTag: primaryTopic,
      subjectType: 'Science',
      fadedScaffolding: buildFadedScaffoldingArray(workedExample, fadedScaffold, independentProblem),
      workedExample,
      fadedScaffold,
      independentProblem,
    };
  }

  // Default Science / Math worked example fading
  const workedExample: WorkedExampleProblem = {
    problemStatement: isMath
      ? `Solve the quadratic equation 2x² - 7x + 3 = 0 using the quadratic formula, and state the nature of its roots.`
      : `A potential difference of 12 V is applied across a conductor having resistance 4 Ω. Calculate the electric current flowing through it and the heat energy produced in 5 seconds.`,
    givenData: isMath
      ? [
          { symbol: 'a', value: '2', meaning: 'Coefficient of x²' },
          { symbol: 'b', value: '-7', meaning: 'Coefficient of x' },
          { symbol: 'c', value: '3', meaning: 'Constant term' },
        ]
      : [
          { symbol: 'V', value: '12 V', meaning: 'Potential difference across conductor' },
          { symbol: 'R', value: '4 Ω', meaning: 'Resistance of conductor' },
          { symbol: 't', value: '5 s', meaning: 'Time interval' },
        ],
    governingFormulaOrLaw: isMath ? 'x = (-b ± √(b² - 4ac)) / (2a)' : 'Ohm\'s Law: I = V/R and Joule\'s Heating: H = I²Rt',
    steps: [
      {
        stepNumber: 1,
        label: isMath ? 'Compute Discriminant D = b² - 4ac' : 'Calculate Current (I) via Ohm\'s Law',
        expressionOrAction: isMath ? 'D = (-7)² - 4(2)(3) = 49 - 24 = 25' : 'I = V / R = 12 V / 4 Ω = 3 A',
        rationale: isMath ? 'Since D = 25 > 0, the equation has two distinct real roots.' : 'Direct application of Ohm\'s law relating potential difference and resistance.',
      },
      {
        stepNumber: 2,
        label: isMath ? 'Apply Quadratic Formula' : 'Calculate Heat Energy Produced (H)',
        expressionOrAction: isMath
          ? 'x = (-(-7) ± √25) / (2 × 2) = (7 ± 5) / 4'
          : 'H = I²Rt = (3 A)² × 4 Ω × 5 s = 9 × 4 × 5 = 180 J',
        rationale: isMath ? 'Substitute a, b, and √D into the formula.' : 'Apply Joule\'s law of heating with standard SI units (Joules).',
      },
      {
        stepNumber: 3,
        label: isMath ? 'Extract Both Roots' : 'State Governing Principles & Units',
        expressionOrAction: isMath
          ? 'x₁ = (7 + 5)/4 = 12/4 = 3;  x₂ = (7 - 5)/4 = 2/4 = 1/2'
          : 'Current I = 3 A (Amperes), Heat H = 180 J (Joules)',
        rationale: isMath ? 'Separate plus and minus solutions.' : 'Ensure all quantities carry correct SI units.',
      },
    ],
    finalAnswer: isMath ? 'x = 3 or x = 1/2' : 'I = 3 A, H = 180 J',
    teacherKeyTip: isMath
      ? 'Carefully handle -(-b) which becomes positive +7. A sign slip here invalidates both roots.'
      : 'Ensure time is in seconds (SI unit) before calculating heat energy H in Joules.',
  };

  const fadedScaffold: FadedScaffoldProblem = {
    problemStatement: isMath
      ? `Solve the quadratic equation x² - 5x + 6 = 0. Fill in the faded discriminant and roots.`
      : `A heating coil of resistance 10 Ω is connected to a 20 V supply. Complete the faded intermediate step to find current and power.`,
    givenData: isMath
      ? [
          { symbol: 'a', value: '1', meaning: 'Coefficient of x²' },
          { symbol: 'b', value: '-5', meaning: 'Coefficient of x' },
          { symbol: 'c', value: '6', meaning: 'Constant term' },
        ]
      : [
          { symbol: 'V', value: '20 V', meaning: 'Potential difference' },
          { symbol: 'R', value: '10 Ω', meaning: 'Resistance' },
        ],
    governingFormulaOrLaw: isMath ? 'D = b² - 4ac' : 'I = V/R and P = V × I',
    steps: [
      {
        stepNumber: 1,
        label: isMath ? 'Setup Equation Variables' : 'Compute Current (I)',
        expressionOrAction: isMath ? 'a = 1, b = -5, c = 6' : 'I = 20 V / 10 Ω = 2 A',
        rationale: isMath ? 'Extract coefficients.' : 'Find current through the heating element.',
      },
      {
        stepNumber: 2,
        label: isMath ? 'Calculate Discriminant D' : 'Calculate Power Dissipated (P)',
        expressionOrAction: isMath ? 'D = (-5)² - 4(1)(6) = 25 - 24 = [BLANK]' : 'P = V × I = 20 V × 2 A = [BLANK]',
        rationale: isMath ? 'Evaluate D = b² - 4ac.' : 'Power is the rate of energy dissipation.',
        isFaded: true,
        fadedPlaceholder: isMath ? 'e.g., 1' : 'e.g., 40 W or 40',
        fadedExpectedAnswer: isMath ? '1' : '40',
        fadedAlternativeAnswers: isMath ? ['1', 'D = 1', '+1'] : ['40 W', '40W', '40 Joules/s', '40'],
      },
      {
        stepNumber: 3,
        label: isMath ? 'Final Roots' : 'Final Unit State',
        expressionOrAction: isMath ? 'x = (5 ± 1)/2 ⇒ x = 3 or x = 2' : 'Power P = 40 Watts',
        rationale: isMath ? 'Compute final roots.' : 'State with correct standard SI unit.',
      },
    ],
    finalAnswer: isMath ? 'x = 3 or x = 2' : 'P = 40 W, I = 2 A',
    fadedStepHint: isMath ? 'Hint: (-5)² is 25, 4*1*6 is 24. 25 - 24 = ?' : 'Hint: P = V * I = 20 * 2 = ? Watts',
  };

  const independentProblem = {
    id: 'chk_ind_01',
    prompt: isMath
      ? `Find the value of k for which the quadratic equation 2x² + kx + 3 = 0 has two equal real roots.`
      : `State Ohm\'s Law. An electric lamp of resistance 20 Ω and a conductor of 4 Ω resistance are connected in series to a 6 V battery. Calculate: (a) total resistance of circuit, (b) overall current in the circuit.`,
    benchmarkAnswer: isMath
      ? `**1. Condition for Equal Roots:**\nFor equal real roots, the discriminant D must be zero: D = b² - 4ac = 0.\n\n**2. Substitution & Calculation:**\nHere a = 2, b = k, c = 3.\nk² - 4(2)(3) = 0 ⇒ k² - 24 = 0 ⇒ k² = 24.\n\n**3. Final Value:**\nk = ±√24 = ±2√6.`
      : `**1. Statement of Ohm\'s Law:**\nAt constant temperature, current flowing through a conductor is directly proportional to potential difference across its ends (V = IR).\n\n**2. Calculation:**\n(a) Series combination: R_total = R₁ + R₂ = 20 Ω + 4 Ω = 24 Ω.\n(b) Current I = V / R_total = 6 V / 24 Ω = 0.25 A.\n\n**3. Conclusion:**\nTotal resistance is 24 Ω and circuit current is 0.25 A.`,
    keyPointsToVerify: isMath
      ? ['States condition D = 0 for equal roots', 'Sets up k² - 24 = 0 correctly', 'Includes both positive and negative values: k = ±2√6']
      : ['States Ohm\'s Law with constant temperature condition', 'Calculates total series resistance R = 24 Ω', 'Calculates current I = 0.25 A with correct unit'],
    trapAnalysis: isMath
      ? 'Common Pitfall: Forgetting the negative root and writing only k = +2√6 instead of k = ±2√6.'
      : 'Common Pitfall: Omitting "at constant temperature" in Ohm\'s Law definition or adding resistances in parallel instead of series.',
    sourceCitation: isMath ? 'NCERT Mathematics Class 10, Quadratic Equations' : 'NCERT Science Class 10, Electricity',
  };

  return {
    mode: 'worked_example_fading',
    topicTag: primaryTopic,
    subjectType,
    fadedScaffolding: buildFadedScaffoldingArray(workedExample, fadedScaffold, independentProblem),
    workedExample,
    fadedScaffold,
    independentProblem,
  };
}

/**
 * Creates high school curriculum exam questions without templates or robotic placeholders.
 * Fully subject-aware: Adapts question structure and benchmark answers for Science vs Social Science vs Hindi.
 */
function generateDeterministicFallbackCheckpoints(
  chapterTitle: string,
  milestoneTitle: string,
  topicTags: string[],
  excerpt: string,
  subjectName?: string
): GenerateCheckpointsResponse {
  const sentences = extractMeaningfulSentences(excerpt);
  const isHindi = isHindiSubject(subjectName, chapterTitle, `${milestoneTitle} ${excerpt}`);
  const isScienceOrMath = isScienceOrMathSubject(subjectName, chapterTitle, `${milestoneTitle} ${excerpt}`);

  const hindiEntities = isHindi ? extractHindiKeyEntities(excerpt || `${milestoneTitle} ${topicTags.join(' ')}`, 6) : [];
  const topics = isHindi && hindiEntities.length > 0
    ? hindiEntities
    : (topicTags.length > 0 ? topicTags : [milestoneTitle]);

  const primaryTopic = topics[0] || milestoneTitle;
  const secondaryTopic = topics[1] || topics[0] || (isHindi ? 'मुख्य संवाद' : 'Core Mechanism');
  const tertiaryTopic = topics[2] || topics[1] || (isHindi ? 'घटनाक्रम व निष्कर्ष' : 'Key Safeguards & Standards');

  if (isScienceOrMath) {
    const fading = generateDeterministicWorkedExampleFading(chapterTitle, milestoneTitle, topicTags, excerpt, subjectName);
    const fact1 = sentences[0] || `${primaryTopic} governs the core quantitative relationship in ${chapterTitle}.`;
    const fact2 = sentences[1] || `${secondaryTopic} requires strict adherence to mathematical derivation steps and sign rules.`;
    const fact3 = sentences[2] || `${tertiaryTopic} dictates the physical boundaries and experimental conditions in standard problems.`;

    return {
      milestoneTitle,
      targetModule: 'Module 2: Conceptual Checkpoints',
      subjectType: 'procedural',
      fadedScaffolding: fading.fadedScaffolding,
      workedExampleFading: fading,
      checkpoints: [
        {
          id: 'chk_01',
          checkpointNumber: 1,
          topicTag: primaryTopic,
          prompt: `Step 1 (Worked Example Rationale): Explain the core governing formula, physical law, or Cartesian sign convention applied in "${primaryTopic}". Why is strict adherence to Cartesian coordinates essential?`,
          benchmarkAnswer: `**1. Governing Formula & Principle:**\n${fact1}\n\n**2. Cartesian Sign Rule:**\nAll distances opposite incident light are negative; focal lengths and object positions must adhere to standard coordinate signs.\n\n**3. Conclusion:**\nPrevents algebraic sign cancellation errors and ensures correct physical image orientation.`,
          keyPointsToVerify: [
            `States the precise formula or governing law for "${primaryTopic}"`,
            'Explains standard Cartesian sign conventions (u negative, f signs)',
            'Identifies the physical interpretation of the result',
          ],
          sourceCitation: fact1,
          trapAnalysis: 'Common Pitfall: Dropping negative signs in Cartesian convention.',
        },
        {
          id: 'chk_02',
          checkpointNumber: 2,
          topicTag: secondaryTopic,
          prompt: `Step 2 (Scaffold Derivation): When solving problems for "${secondaryTopic}", how is the intermediate step calculated and simplified?`,
          benchmarkAnswer: `**1. Intermediate Step:**\n${fact2}\n\n**2. Mathematical Operation:**\nFind common denominator, isolate the target variable, and compute reciprocal.\n\n**3. Verification:**\nCheck dimensional consistency and ensure units match standard SI requirements.`,
          keyPointsToVerify: [
            'Details the intermediate step substitution accurately',
            'Applies common denominator or algebraic rearrangement correctly',
            'Attaches correct SI units to final quantity',
          ],
          sourceCitation: fact2,
          trapAnalysis: 'Common Pitfall: Forgetting to take the reciprocal after adding fractions.',
        },
        {
          id: 'chk_03',
          checkpointNumber: 3,
          topicTag: tertiaryTopic,
          prompt: `Step 3 (Independent Synthesis): ${fading.independentProblem.prompt}`,
          benchmarkAnswer: fading.independentProblem.benchmarkAnswer,
          keyPointsToVerify: fading.independentProblem.keyPointsToVerify,
          sourceCitation: fact3,
          trapAnalysis: fading.independentProblem.trapAnalysis,
        },
      ],
    };
  }

  // Pure Qualitative Synthesis for Social Science (SST) & Hindi
  const fact1 = sentences[0] || `${primaryTopic} forms the historical and institutional cornerstone of ${chapterTitle}.`;
  const fact2 = sentences[1] || `${secondaryTopic} illustrates the primary socio-economic or democratic principle in action.`;
  const fact3 = sentences[2] || `${tertiaryTopic} highlights the constitutional safeguards and long-term societal impact.`;

  if (isHindi) {
    return {
      milestoneTitle,
      targetModule: 'Module 2: Conceptual Checkpoints',
      subjectType: 'declarative',
      checkpoints: [
        {
          id: 'chk_01',
          checkpointNumber: 1,
          topicTag: primaryTopic,
          prompt: `पाठ के आधार पर '${primaryTopic}' का मुख्य केंद्रीय भाव और उद्देश्य स्पष्ट कीजिए।`,
          benchmarkAnswer: `**1. मुख्य विचार:**\n${fact1}\n\n**2. पाठगत उदाहरण:**\n${fact2}\n\n**3. निष्कर्ष:**\nयह प्रसंग मानवीय मूल्यों तथा सामाजिक चेतना को उजागर करता है।`,
          keyPointsToVerify: [
            `'${primaryTopic}' का सटीक अर्थ और संदर्भ`,
            'पात्र या लेखक के दृष्टिकोण का स्पष्ट उल्लेख',
            'पाठ से संबंधित सटीक निष्कर्ष',
          ],
          sourceCitation: fact1,
          trapAnalysis: 'सामान्य त्रुटि: सामान्य शब्दों में उत्तर देना और पाठ के मुख्य तथ्यों को छोड़ देना।',
        },
        {
          id: 'chk_02',
          checkpointNumber: 2,
          topicTag: secondaryTopic,
          prompt: `'${secondaryTopic}' से जुड़ी प्रमुख घटना और उसके प्रभाव का विश्लेषण कीजिए।`,
          benchmarkAnswer: `**1. घटना का विवरण:**\n${fact2}\n\n**2. पात्रों/स्थिति पर प्रभाव:**\n${fact3}\n\n**3. नैतिक व वैचारिक संदेश:**\nयह घटना स्थिति के मूल परिवर्तन को रेखांकित करती है।`,
          keyPointsToVerify: [
            'घटना का यथार्थवादी विवरण',
            'पात्रों के व्यवहार व संवाद का विश्लेषण',
            'घटना के परिणाम का स्पष्ट निरूपण',
          ],
          sourceCitation: fact2,
          trapAnalysis: 'सामान्य त्रुटि: घटनाक्रम का क्रम गलत लिखना या अनुमान से उत्तर लिखना।',
        },
        {
          id: 'chk_03',
          checkpointNumber: 3,
          topicTag: tertiaryTopic,
          prompt: `'${tertiaryTopic}' का समग्र संदेश तथा परीक्षा की दृष्टि से इसका महत्व बताइए।`,
          benchmarkAnswer: `**1. मुख्य संदेश:**\n${fact3}\n\n**2. साहित्यिक विशेषता:**\nभाषा शैली तथा प्रतीकात्मक भाव का सशक्त प्रयोग।\n\n**3. परीक्षा-केंद्रित बिंदु:**\nबोर्ड परीक्षा में इस अंश से व्याख्यात्मक प्रश्न पूछे जाते हैं।`,
          keyPointsToVerify: [
            'पाठ के अंतिम संदेश की सटीक पहचान',
            'भाषा शैली और रचनात्मक प्रभाव का उल्लेख',
            'परीक्षा उपयोगी मुख्य बिंदुओं का समावेश',
          ],
          sourceCitation: fact3,
          trapAnalysis: 'सामान्य त्रुटि: विषय वस्तु से हटकर सामान्य निबंध शैली में उत्तर लिखना।',
        },
      ],
    };
  }

  return {
    milestoneTitle,
    targetModule: 'Module 2: Conceptual Checkpoints',
    subjectType: 'declarative',
    checkpoints: [
      {
        id: 'chk_01',
        checkpointNumber: 1,
        topicTag: primaryTopic,
        prompt: `Explain how "${primaryTopic}" operates within the context of ${chapterTitle}. What is its historical, economic, or constitutional significance?`,
        benchmarkAnswer: `**1. Core Factual Principle:**\n${fact1}\n\n**2. Practical Mechanism / Case Example:**\n${fact2}\n\n**3. Institutional Outcome:**\nEstablishes legal authority, constitutional checks and balances, and civic accountability.`,
        keyPointsToVerify: [
          `Identifies the precise definition and structural framework of "${primaryTopic}"`,
          'Cites specific historical events, constitutional clauses, or economic mechanisms',
          'States the institutional outcome and civic significance',
        ],
        sourceCitation: fact1,
        trapAnalysis: 'Common Pitfall: Giving vague moral opinions instead of citing specific textbook institutions and constitutional clauses.',
      },
      {
        id: 'chk_02',
        checkpointNumber: 2,
        topicTag: secondaryTopic,
        prompt: `Analyze the critical conditions, causes, or policies associated with "${secondaryTopic}". How did they impact different sections of society?`,
        benchmarkAnswer: `**1. Root Cause / Policy Framework:**\n${fact2}\n\n**2. Socio-Economic Impact:**\n${fact3}\n\n**3. Structural Conclusion:**\nLed to statutory reforms, democratic mobilization, and revised governmental policies.`,
        keyPointsToVerify: [
          `Details the foundational causes or policy framework of "${secondaryTopic}"`,
          'Analyzes direct impacts on marginalized groups, agrarian sectors, or institutional structures',
          'Explains the long-term historical or socio-economic consequences',
        ],
        sourceCitation: fact2,
        trapAnalysis: 'Common Pitfall: Confusing chronology or conflating distinct regional movements and policies.',
      },
      {
        id: 'chk_03',
        checkpointNumber: 3,
        topicTag: tertiaryTopic,
        prompt: `Evaluate the major safeguards, limitations, or contemporary debates surrounding "${tertiaryTopic}".`,
        benchmarkAnswer: `**1. Constitutional / Policy Safeguards:**\n${fact3}\n\n**2. Operational Challenges / Trade-offs:**\nBalancing executive power with judicial review and fundamental rights protections.\n\n**3. Contemporary Significance:**\nServes as a vital precedent for governance standards and modern democratic processes.`,
        keyPointsToVerify: [
          `Articulates the safeguards and institutional measures for "${tertiaryTopic}"`,
          'Identifies trade-offs between administrative expediency and democratic oversight',
          'Links the concept to modern civic governance or sustainable development',
        ],
        sourceCitation: fact3,
        trapAnalysis: 'Common Pitfall: Over-simplifying complex socio-political conflicts into one-sided moral claims.',
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

  const isHindi = isHindiSubject(subjectName, chapterTitle, `${milestoneTitle} ${sectionTextExcerpt}`);
  const isScienceOrMath = isScienceOrMathSubject(subjectName, chapterTitle, `${milestoneTitle} ${sectionTextExcerpt}`);
  const primaryTopic = topicTags[0] || milestoneTitle || 'Key Concept';

  console.log(`[GenerateCheckpoints] Generating Module 2 checkpoints for "${milestoneTitle}" in "${chapterTitle}" (subject: ${subjectName || 'unspecified'}, isScienceOrMath: ${isScienceOrMath}, isHindi: ${isHindi}, excerpt length: ${sectionTextExcerpt.length})`);

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

  const hindiDirectives = isHindi
    ? `\n${getHindiPromptDirectives(chapterTitle)}\n- CRITICAL MANDATORY REQUIREMENT: You MUST generate all prompts, benchmark answers, key points to verify, and trap analyses strictly in pure Hindi (Devanagari script, देवनागरी लिपि). Do NOT use English or Hinglish.`
    : '';

  const scienceMathInstruction = isScienceOrMath
    ? `
CRITICAL DISCIPLINE DIRECTIVE FOR SCIENCE & MATHEMATICS: "WORKED EXAMPLE FADING ENGINE"
For procedural Science (Physics numericals/ray optics/electricity, Chemistry reactions/stoichiometry, Biology genetic crosses/energy pathways) and Mathematics (Algebra, Geometry, Trigonometry, Calculus), you MUST generate a complete "fadedScaffolding" 3-stage array containing:
1. "fadedScaffolding":
   [
     {
       "stage": 1,
       "stageTitle": "Stage 1: Fully Worked Example",
       "problemStatement": "Authentic exam numerical or derivation problem from excerpt",
       "fullDerivationSteps": [
         { "step": 1, "action": "Identify known variables and Cartesian signs: u = -30 cm, f = -20 cm", "reasonWhy": "Distances in front of mirror are negative in Cartesian convention." },
         { "step": 2, "action": "Substitute into 1/v = 1/f - 1/u: 1/v = -1/20 - (-1/30) = -1/60 => v = -60 cm", "reasonWhy": "Calculate common denominator and compute reciprocal." },
         { "step": 3, "action": "Magnification m = -v/u = -(-60)/(-30) = -2 (Real & Inverted)", "reasonWhy": "Negative magnification indicates inverted real image." }
       ],
       "keyTakeaway": "Always verify Cartesian sign conventions before formula substitution."
     },
     {
       "stage": 2,
       "stageTitle": "Stage 2: Faded Scaffold (Complete the Missing Step)",
       "problemStatement": "Isomorphic practice problem with new parameters",
       "givenSteps": ["Step 1: Assign Cartesian coordinates u = -15 cm, f = -10 cm"],
       "fadedMissingStepPrompt": "Calculate 1/v = 1/f - 1/u and state image distance v",
       "benchmarkMissingStep": "-30",
       "solution": "v = -30 cm (Real and Inverted, 30 cm in front of mirror)",
       "fadedStepHint": "Hint: 1/(-10) - 1/(-15) = -1/10 + 1/15 = -1/30. Take reciprocal."
     },
     {
       "stage": 3,
       "stageTitle": "Stage 3: Independent Practice",
       "problemStatement": "Independent examination question testing full derivation from memory",
       "benchmarkAnswer": "**1. Given Data & Sign Application:** ...\\n\\n**2. Mirror Formula Derivation:** ...\\n\\n**3. Conclusion:** ...",
       "scoringCriteria": ["Applies correct signs", "Correct calculation", "Includes SI units"]
     }
   ]
2. Also provide the fallback "checkpoints" array.`
    : '';

  const subjectTypeStr = isScienceOrMath ? 'procedural' : 'declarative';

  const systemInstruction = `[SYSTEM DIRECTIVE: EXPERT HIGH SCHOOL TEACHER & CURRICULUM EXAMINER — CONCEPT CHECK (MODULE 2)]${hindiDirectives}${scienceMathInstruction}

Role:
You are an expert high school teacher, senior board examiner, and curriculum author across SCIENCE, MATHEMATICS, SOCIAL SCIENCE, and HINDI (CBSE / NCERT). Your task is to craft natural, rigorous, authentic exam checkpoints based EXCLUSIVELY on the provided textbook excerpt.

MANDATORY PEDAGOGICAL RULES:
1. GROUND EXCLUSIVELY IN THE EXCERPT: Use only the laws, formulas, numbers, and facts presented in the textbook excerpt.
2. NO GENERIC BOILERPLATE: Never use formulaic placeholder templates.
3. BENCHMARK MODEL ANSWERS: Structure answers into 3 distinct, numbered factual points.
4. KEY VERIFICATION CRITERIA: 3 concrete criteria required for full marks.
5. TRAP ANALYSIS: Pinpoint exact student exam mistakes.

JSON SCHEMA SPECIFICATION:
Return a valid JSON object matching:
{
  "milestoneTitle": "${milestoneTitle.replace(/"/g, '\\"')}",
  "targetModule": "Module 2: Conceptual Checkpoints",
  "subjectType": "${subjectTypeStr}",
  ${isScienceOrMath ? `"fadedScaffolding": [
    {
      "stage": 1,
      "stageTitle": "Stage 1: Fully Worked Example",
      "problemStatement": "string",
      "fullDerivationSteps": [
        { "step": 1, "action": "string", "reasonWhy": "string" }
      ],
      "keyTakeaway": "string"
    },
    {
      "stage": 2,
      "stageTitle": "Stage 2: Faded Scaffold (Complete the Missing Step)",
      "problemStatement": "string",
      "givenSteps": ["string"],
      "fadedMissingStepPrompt": "string",
      "benchmarkMissingStep": "string",
      "solution": "string",
      "fadedStepHint": "string"
    },
    {
      "stage": 3,
      "stageTitle": "Stage 3: Independent Practice",
      "problemStatement": "string",
      "benchmarkAnswer": "string",
      "scoringCriteria": ["string"]
    }
  ],` : ''}
  "checkpoints": [
    {
      "id": "chk_01",
      "checkpointNumber": 1,
      "topicTag": "string",
      "prompt": "string",
      "benchmarkAnswer": "**1. Direct Factual Explanation:**\\n...\\n\\n**2. Specific Textbook Rule / Example:**\\n...\\n\\n**3. Direct Conclusion:**\\n...",
      "keyPointsToVerify": ["string", "string", "string"],
      "sourceCitation": "string",
      "trapAnalysis": "string"
    },
    {
      "id": "chk_02",
      "checkpointNumber": 2,
      "topicTag": "string",
      "prompt": "string",
      "benchmarkAnswer": "**1. Direct Factual Explanation:**\\n...\\n\\n**2. Specific Textbook Rule / Example:**\\n...\\n\\n**3. Direct Conclusion:**\\n...",
      "keyPointsToVerify": ["string", "string", "string"],
      "sourceCitation": "string",
      "trapAnalysis": "string"
    },
    {
      "id": "chk_03",
      "checkpointNumber": 3,
      "topicTag": "string",
      "prompt": "string",
      "benchmarkAnswer": "**1. Direct Factual Explanation:**\\n...\\n\\n**2. Specific Textbook Rule / Example:**\\n...\\n\\n**3. Direct Conclusion:**\\n...",
      "keyPointsToVerify": ["string", "string", "string"],
      "sourceCitation": "string",
      "trapAnalysis": "string"
    }
  ]
}`;

  const userPrompt = `Subject: ${subjectName || (isScienceOrMath ? 'Science' : isHindi ? 'Hindi' : 'Social Science')}
Chapter: "${chapterTitle}"
Milestone Title: "${milestoneTitle}"
Core Topics: ${topicTags.map((t) => `"${t}"`).join(', ')}

Textbook Excerpt:
---
${sectionTextExcerpt.slice(0, 14000)}
---

Generate ${isScienceOrMath ? 'the 3-stage Worked Example Faded Scaffolding [Stage 1 -> Stage 2 -> Stage 3] and 3 checkpoints' : '3 natural, authentic exam questions and 3-point factual benchmark model answers'} grounded strictly in the excerpt.`;

  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ];

  for (const model of candidateModels) {
    let timeoutId: any = null;
    try {
      console.log(`[GenerateCheckpoints] Requesting from ${model} for "${milestoneTitle}" (isScienceOrMath: ${isScienceOrMath})`);
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Model ${model} request timed out after 30s`)), 30000);
      });

      const config: any = {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.15,
      };

      if (model.includes('3.8')) {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
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

        // Normalize if fadedScaffolding or workedExampleFading was returned
        if (Array.isArray(parsed.fadedScaffolding) && parsed.fadedScaffolding.length === 3 && !parsed.workedExampleFading) {
          const s1 = parsed.fadedScaffolding[0];
          const s2 = parsed.fadedScaffolding[1];
          const s3 = parsed.fadedScaffolding[2];

          parsed.workedExampleFading = {
            mode: 'worked_example_fading',
            topicTag: primaryTopic,
            subjectType: isScienceOrMath ? 'Science' : 'procedural',
            fadedScaffolding: parsed.fadedScaffolding,
            workedExample: {
              problemStatement: s1.problemStatement || milestoneTitle,
              givenData: [],
              governingFormulaOrLaw: s1.keyTakeaway || '',
              steps: (s1.fullDerivationSteps || []).map((st: any, idx: number) => ({
                stepNumber: st.step || idx + 1,
                label: `Step ${st.step || idx + 1}`,
                expressionOrAction: st.action || '',
                rationale: st.reasonWhy || '',
              })),
              finalAnswer: s1.keyTakeaway || '',
              teacherKeyTip: s1.keyTakeaway || '',
            },
            fadedScaffold: {
              problemStatement: s2.problemStatement || milestoneTitle,
              givenData: [],
              governingFormulaOrLaw: '',
              steps: [
                {
                  stepNumber: 1,
                  label: 'Given Step',
                  expressionOrAction: (s2.givenSteps || []).join('; ') || 'Given parameters',
                  rationale: 'Pre-calculated setup',
                },
                {
                  stepNumber: 2,
                  label: 'Missing Step Calculation',
                  expressionOrAction: s2.fadedMissingStepPrompt || 'Calculate intermediate value: [BLANK]',
                  rationale: 'Calculate missing intermediate step',
                  isFaded: true,
                  fadedPlaceholder: 'Enter intermediate derivation value...',
                  fadedExpectedAnswer: s2.benchmarkMissingStep || '',
                  fadedAlternativeAnswers: [s2.benchmarkMissingStep, s2.solution].filter(Boolean),
                },
                {
                  stepNumber: 3,
                  label: 'Solution Result',
                  expressionOrAction: s2.solution || '',
                  rationale: 'Complete result',
                },
              ],
              finalAnswer: s2.solution || '',
              fadedStepHint: s2.fadedStepHint || 'Review sign convention and arithmetic.',
            },
            independentProblem: {
              id: 'chk_ind_01',
              prompt: s3.problemStatement || '',
              benchmarkAnswer: s3.benchmarkAnswer || '',
              keyPointsToVerify: s3.scoringCriteria || [],
              trapAnalysis: s3.trapAnalysis || 'Common student calculation mistake.',
            },
          };
        } else if (parsed.workedExampleFading && !parsed.fadedScaffolding) {
          parsed.fadedScaffolding = buildFadedScaffoldingArray(
            parsed.workedExampleFading.workedExample,
            parsed.workedExampleFading.fadedScaffold,
            parsed.workedExampleFading.independentProblem
          );
          parsed.workedExampleFading.fadedScaffolding = parsed.fadedScaffolding;
        }

        const validated = GenerateCheckpointsResponseSchema.safeParse(parsed);
        if (validated.success) {
          console.log(`[GenerateCheckpoints] Successfully generated checkpoints with ${model} (has workedExampleFading: ${Boolean(validated.data.workedExampleFading)}, has fadedScaffolding: ${Boolean(validated.data.fadedScaffolding)})`);
          return validated.data;
        }
      }
    } catch (modelErr: any) {
      clearTimeout(timeoutId);
      const isRateLimited = `${modelErr?.message || ''}`.includes('429') || `${modelErr?.message || ''}`.includes('quota') || `${modelErr?.message || ''}`.includes('RESOURCE_EXHAUSTED');
      const isHighDemand = `${modelErr?.message || ''}`.includes('503') || `${modelErr?.message || ''}`.includes('high demand');
      if (isRateLimited) {
        console.log(`[GenerateCheckpoints] Model ${model} free-tier quota rate-limited (429), switching to next model in cascade...`);
      } else if (isHighDemand) {
        console.log(`[GenerateCheckpoints] Model ${model} high demand (503), switching to next model in cascade...`);
      } else {
        console.log(`[GenerateCheckpoints] Model ${model} unavailable, switching to next model in cascade...`);
      }
    }
  }

  console.log(`[GenerateCheckpoints] Live models offline/rate-limited. Seamlessly using deterministic curriculum checkpoints.`);
  return generateDeterministicFallbackCheckpoints(chapterTitle, milestoneTitle, topicTags, sectionTextExcerpt, subjectName);
}
