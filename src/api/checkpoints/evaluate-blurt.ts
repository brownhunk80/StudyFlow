import { GoogleGenAI, Type } from '@google/genai';

export interface BlurtEvaluationRequest {
  chapterTitle: string;
  milestoneTitle: string;
  subjectName?: string;
  sectionExcerpt: string;
  studentBlurt: string;
}

export interface BlurtEvaluationResult {
  coverageScore: number; // 0-100
  masteryTier: 'high' | 'moderate' | 'needs_reinforcement';
  qualitativeSummary: string;
  pointsCovered: Array<{
    point: string;
    studentQuote?: string;
    explanation: string;
  }>;
  missedPoints: Array<{
    concept: string;
    whyImportant: string;
    hintForReview: string;
  }>;
  misconceptions: Array<{
    studentClaim: string;
    correction: string;
    canonicalRule: string;
  }>;
  nextStepsAdvice: string[];
  evaluatedAt: string;
}

export async function evaluateStudentBlurt(
  ai: GoogleGenAI | null | undefined,
  req: BlurtEvaluationRequest
): Promise<BlurtEvaluationResult> {
  if (!ai || !ai.models) {
    return generateOfflineBlurtEvaluation(req);
  }

  const {
    chapterTitle,
    milestoneTitle,
    subjectName = 'Science',
    sectionExcerpt,
    studentBlurt,
  } = req;

  if (!studentBlurt || studentBlurt.trim().length < 3) {
    return generateOfflineBlurtEvaluation(req);
  }

  const prompt = `You are a master academic examiner and cognitive learning coach in ${subjectName}.
A student is using the Active Recall "Blurting Technique" where they write down everything they remember about a specific chapter section from memory without looking at notes.

SECTION CONTEXT:
- Chapter: ${chapterTitle}
- Section / Milestone: ${milestoneTitle}
- Official Section Syllabus & Content:
"""
${sectionExcerpt ? sectionExcerpt.slice(0, 18000) : 'Section: ' + milestoneTitle}
"""

STUDENT'S RECALLED BLURT:
"""
${studentBlurt ? studentBlurt.slice(0, 10000) : '(Empty blurt)'}
"""

YOUR TASK:
Compare the student's blurt against the official section content:
1. Identify all core facts, principles, formulas, definitions, and mechanisms the student ACCURATELY recalled (pointsCovered).
2. Identify high-yield syllabus concepts from the section that the student COMPLETELY MISSED or omitted (missedPoints).
3. Detect any FACTUAL ERRORS, false claims, confusing reversals, or misconceptions in what the student wrote, providing the exact canonical correction (misconceptions).
4. Calculate an objective coverageScore (integer 0-100) representing what percentage of the section's core content was accurately recalled.
5. Set masteryTier ('high' if >= 80, 'moderate' if 50-79, 'needs_reinforcement' if < 50).
6. Provide a concise, encouraging 2-sentence qualitativeSummary and 2-3 actionable nextStepsAdvice.

Return strict JSON adhering to the provided schema.`;

  // Try flash models: primary 3.8-flash, followed by 3.1-flash-lite (separate quota pool), and flash-latest
  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction:
            'You are an expert educational examiner. Assess active recall blurts with constructive rigor, precision, and pedagogical clarity.',
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              coverageScore: {
                type: Type.INTEGER,
                description: 'Estimated percentage score from 0 to 100 of section content accurately covered',
              },
              masteryTier: {
                type: Type.STRING,
                description: "'high' (>=80), 'moderate' (50-79), or 'needs_reinforcement' (<50)",
              },
              qualitativeSummary: {
                type: Type.STRING,
                description: 'Concise 2-sentence summary of the student recall performance',
              },
              pointsCovered: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    point: { type: Type.STRING, description: 'The accurately recalled concept or rule' },
                    studentQuote: { type: Type.STRING, description: 'Excerpt from student blurt demonstrating recall' },
                    explanation: { type: Type.STRING, description: 'Why this is correct according to textbook syllabus' },
                  },
                  required: ['point', 'explanation'],
                },
              },
              missedPoints: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    concept: { type: Type.STRING, description: 'High-yield concept omitted by student' },
                    whyImportant: { type: Type.STRING, description: 'Why this concept is critical for exams' },
                    hintForReview: { type: Type.STRING, description: 'A helpful mnemonic or clue for revision' },
                  },
                  required: ['concept', 'whyImportant', 'hintForReview'],
                },
              },
              misconceptions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    studentClaim: { type: Type.STRING, description: 'What the student incorrectly stated' },
                    correction: { type: Type.STRING, description: 'The accurate scientific/academic fact' },
                    canonicalRule: { type: Type.STRING, description: 'The official textbook rule or formula' },
                  },
                  required: ['studentClaim', 'correction', 'canonicalRule'],
                },
              },
              nextStepsAdvice: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 specific recommendations for next revision step',
              },
            },
            required: [
              'coverageScore',
              'masteryTier',
              'qualitativeSummary',
              'pointsCovered',
              'missedPoints',
              'misconceptions',
              'nextStepsAdvice',
            ],
          },
        },
      });

      const text = response.text;
      if (text) {
        const parsed = JSON.parse(text);
        return {
          coverageScore: Math.max(0, Math.min(100, Number(parsed.coverageScore) || 0)),
          masteryTier:
            parsed.masteryTier === 'high' || parsed.masteryTier === 'moderate' || parsed.masteryTier === 'needs_reinforcement'
              ? parsed.masteryTier
              : parsed.coverageScore >= 80
              ? 'high'
              : parsed.coverageScore >= 50
              ? 'moderate'
              : 'needs_reinforcement',
          qualitativeSummary: parsed.qualitativeSummary || 'Good effort on active recall blurting.',
          pointsCovered: Array.isArray(parsed.pointsCovered) ? parsed.pointsCovered : [],
          missedPoints: Array.isArray(parsed.missedPoints) ? parsed.missedPoints : [],
          misconceptions: Array.isArray(parsed.misconceptions) ? parsed.misconceptions : [],
          nextStepsAdvice: Array.isArray(parsed.nextStepsAdvice) ? parsed.nextStepsAdvice : [],
          evaluatedAt: new Date().toISOString(),
        };
      }
    } catch (err: any) {
      const isQuotaOrRateLimit =
        err?.status === 429 ||
        err?.code === 429 ||
        `${err?.message}`.includes('429') ||
        `${err?.message}`.includes('RESOURCE_EXHAUSTED') ||
        `${err?.message}`.includes('Quota exceeded');

      if (isQuotaOrRateLimit) {
        console.warn(`[evaluateStudentBlurt] Model ${model} rate limit reached (429), checking next fallback.`);
        // Brief pause before trying fallback model
        await new Promise((resolve) => setTimeout(resolve, 150));
      } else {
        console.warn(`[evaluateStudentBlurt] Model ${model} unavailable (${err?.message || 'error'}), checking next fallback.`);
      }
    }
  }

  // Resilient heuristic fallback if AI is rate-limited or offline
  return generateOfflineBlurtEvaluation(req);
}

function generateOfflineBlurtEvaluation(req: BlurtEvaluationRequest): BlurtEvaluationResult {
  const blurt = (req.studentBlurt || '').trim();
  const rawBlurtLower = blurt.toLowerCase();
  const sectionText = (req.sectionExcerpt || '').trim();
  const milestoneTitle = req.milestoneTitle || 'Milestone Section';

  // Tokenize blurt words
  const blurtWords = blurt ? blurt.split(/\s+/).filter(Boolean) : [];
  const wordCount = blurtWords.length;

  // Extract key sentences / concepts from section text
  const sectionSentences = sectionText
    ? sectionText
        .split(/[.\n;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 20 && s.length < 200)
    : [];

  // Extract high-yield keywords from section text (excluding common stop words)
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'in', 'and', 'or', 'for', 'of', 'to', 'with', 'by', 'as',
    'this', 'that', 'these', 'those', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'it', 'its', 'from', 'into', 'can', 'could', 'will', 'would', 'should', 'about', 'also', 'such',
  ]);

  const candidateKeywords = Array.from(
    new Set(
      (sectionText || milestoneTitle)
        .replace(/[^a-zA-Z0-9\u0900-\u097F\s]/g, ' ')
        .split(/\s+/)
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.length >= 4 && !stopWords.has(w))
    )
  ).slice(0, 40);

  // Measure keyword hits
  const coveredKeywords: string[] = [];
  const missedKeywords: string[] = [];

  for (const kw of candidateKeywords) {
    if (rawBlurtLower.includes(kw)) {
      coveredKeywords.push(kw);
    } else {
      missedKeywords.push(kw);
    }
  }

  // Calculate nuanced coverage score
  let baseScore = 30;
  if (candidateKeywords.length > 0) {
    const keywordCoverageRatio = coveredKeywords.length / candidateKeywords.length;
    baseScore = Math.round(keywordCoverageRatio * 60) + Math.min(40, Math.round(wordCount / 3));
  } else {
    if (wordCount >= 100) baseScore = 80;
    else if (wordCount >= 50) baseScore = 65;
    else if (wordCount >= 25) baseScore = 50;
    else baseScore = 30;
  }

  const coverageScore = Math.max(15, Math.min(95, baseScore));
  const masteryTier: 'high' | 'moderate' | 'needs_reinforcement' =
    coverageScore >= 80 ? 'high' : coverageScore >= 50 ? 'moderate' : 'needs_reinforcement';

  // Build pointsCovered from matched concepts or student sentences
  const blurtSentences = blurt.split(/[.\n!?]+/).map((s) => s.trim()).filter((s) => s.length > 10);
  const pointsCovered = blurtSentences.slice(0, 4).map((sentence, idx) => {
    const matchedKw = candidateKeywords.find((k) => sentence.toLowerCase().includes(k)) || `Concept ${idx + 1}`;
    return {
      point: `Accurate recall of ${matchedKw.toUpperCase()}`,
      studentQuote: sentence.length > 80 ? sentence.slice(0, 80) + '...' : sentence,
      explanation: `Your recall captures the key principle of ${matchedKw} matching the textbook syllabus.`,
    };
  });

  if (pointsCovered.length === 0) {
    pointsCovered.push({
      point: `Recall foundation for ${milestoneTitle}`,
      studentQuote: blurt.slice(0, 70),
      explanation: 'You captured the introductory concepts and keywords for this section.',
    });
  }

  // Build missedPoints from high-yield omitted keywords
  const highYieldMissed = missedKeywords.slice(0, 3);
  const missedPoints = highYieldMissed.map((kw, i) => {
    const contextSentence = sectionSentences.find((s) => s.toLowerCase().includes(kw));
    return {
      concept: kw.charAt(0).toUpperCase() + kw.slice(1),
      whyImportant: contextSentence
        ? `Official syllabus definition: "${contextSentence.slice(0, 110)}..."`
        : `This term carries key marks in board exam questions for ${milestoneTitle}.`,
      hintForReview: `Review the definition and core application of "${kw}" in your chapter summary notes.`,
    };
  });

  if (missedPoints.length === 0) {
    missedPoints.push({
      concept: 'Formal Textbook Terminology & Formula Nuances',
      whyImportant: 'Examiners award full marks for standard academic terms and scientific units.',
      hintForReview: 'Cross-check your blurt with the Checkpoints tab to verify every sub-clause.',
    });
  }

  const qualitativeSummary =
    masteryTier === 'high'
      ? `Outstanding active recall! You recalled ${wordCount} words covering major concepts for "${milestoneTitle}".`
      : masteryTier === 'moderate'
      ? `Solid recall attempt (${wordCount} words). You established the core ideas of "${milestoneTitle}", but should reinforce specific technical terms.`
      : `Good first blurting effort (${wordCount} words). Use the Checkpoints runner to build stronger memory anchors for "${milestoneTitle}".`;

  return {
    coverageScore,
    masteryTier,
    qualitativeSummary,
    pointsCovered,
    missedPoints,
    misconceptions: [],
    nextStepsAdvice: [
      'Convert the missed high-yield points into active recall flashcards.',
      'Test your retention with the Section Checkpoint questions.',
      'Perform a second 2-minute quick blurt tomorrow to cement spaced retention.',
    ],
    evaluatedAt: new Date().toISOString(),
  };
}
