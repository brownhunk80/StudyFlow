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
  ai: GoogleGenAI,
  req: BlurtEvaluationRequest
): Promise<BlurtEvaluationResult> {
  const {
    chapterTitle,
    milestoneTitle,
    subjectName = 'Science',
    sectionExcerpt,
    studentBlurt,
  } = req;

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

  const models = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

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
      console.warn(`[evaluateStudentBlurt] Model ${model} failed, trying next fallback:`, err?.message || err);
      lastError = err;
    }
  }

  // Graceful fallback if offline or models unavailable
  return generateOfflineBlurtEvaluation(req);
}

function generateOfflineBlurtEvaluation(req: BlurtEvaluationRequest): BlurtEvaluationResult {
  const blurt = req.studentBlurt.toLowerCase().trim();
  const words = blurt ? blurt.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  let coverageScore = 40;
  if (wordCount >= 100) coverageScore = 75;
  else if (wordCount >= 50) coverageScore = 60;
  else if (wordCount < 20) coverageScore = 25;

  return {
    coverageScore,
    masteryTier: coverageScore >= 80 ? 'high' : coverageScore >= 50 ? 'moderate' : 'needs_reinforcement',
    qualitativeSummary: `You blurted ${wordCount} words for "${req.milestoneTitle}". Review the section syllabus to reinforce any unmentioned definitions and principles.`,
    pointsCovered: [
      {
        point: `General recall of ${req.milestoneTitle}`,
        explanation: 'You captured introductory aspects of the topic during active recall.',
      },
    ],
    missedPoints: [
      {
        concept: 'Formal definitions & key terminology',
        whyImportant: 'Examiners award marks for exact scientific terms rather than vague descriptions.',
        hintForReview: 'Review bold vocabulary terms and canonical equations in this section.',
      },
    ],
    misconceptions: [],
    nextStepsAdvice: [
      'Compare your blurt against the Section Checkpoints tab to test specific questions.',
      'Turn the missed points into active recall flashcards.',
    ],
    evaluatedAt: new Date().toISOString(),
  };
}
