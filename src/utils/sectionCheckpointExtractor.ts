import { Section, KnowledgeQuestion } from '../types';

export interface SectionCheckpoint {
  id: string;
  checkpointNumber: number;
  prompt: string;
  subtopicTag: string;
  benchmarkAnswer: string;
  keyScoringPoints: string[];
  trapAnalysis: string;
  userResponse: string;
  inputMode: 'type' | 'speak' | 'paper';
  isRevealed: boolean;
  selfAssessment: 'understood' | 'needs_work' | null;
  paperImage?: string | null;
  sourceCitation?: string;
}

/**
 * Cleanly extracts clean sentences from text, stripping markdown symbols
 */
function cleanSentences(text: string): string[] {
  if (!text) return [];
  return text
    .replace(/^#+\s+.*$/gm, '') // Remove markdown headers
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && !s.startsWith('>') && !s.startsWith('|'));
}

/**
 * Extracts and formats 3 high-quality conceptual check questions and structured answers
 * strictly grounded in the given section. These are designed exclusively for students
 * to check their knowledge of that specific section.
 */
export function extractSectionCheckpoints(section: Section): SectionCheckpoint[] {
  // 1. If the section already has pre-configured knowledgeQuestions, use and format them
  if (Array.isArray(section.knowledgeQuestions) && section.knowledgeQuestions.length > 0) {
    return section.knowledgeQuestions.map((kq, idx) => {
      const topicTag =
        kq.subtopicTag ||
        section.keyTopics?.[idx % (section.keyTopics?.length || 1)] ||
        section.title;

      const scoringPoints =
        Array.isArray(kq.keyScoringPoints) && kq.keyScoringPoints.length > 0
          ? kq.keyScoringPoints
          : [
              `Directly states the core principle or rule of ${topicTag}`,
              'Provides clear, technically accurate explanation without reversing terms',
              'References the specific governing criteria or conditions taught in this section',
            ];

      const trap =
        kq.trapAnalysis ||
        `Common Pitfall: Confusing the governing conditions of ${topicTag} with adjacent concepts or omitting necessary boundary constraints.`;

      return {
        id: kq.id || `cp-${section.id}-${idx + 1}`,
        checkpointNumber: idx + 1,
        prompt: kq.question,
        subtopicTag: topicTag,
        benchmarkAnswer: kq.sampleAnswer || kq.benchmarkAnswer || 'Structured model answer from section.',
        keyScoringPoints: scoringPoints,
        trapAnalysis: trap,
        userResponse: kq.userResponse || '',
        inputMode: 'type',
        isRevealed: false,
        selfAssessment:
          kq.isCorrect === true ? 'understood' : kq.isCorrect === false ? 'needs_work' : null,
        sourceCitation: kq.sourceCitation,
      };
    });
  }

  // 2. Derive checkpoints directly from the section's actual summary text and keyTopics
  const summaryText = section.summary || (section as any).contentMarkdown || section.sectionTextExcerpt || '';
  const topics = Array.isArray(section.keyTopics) && section.keyTopics.length > 0
    ? section.keyTopics
    : [section.title];

  const t0 = topics[0] || section.title;
  const t1 = topics[1] || t0;
  const t2 = topics[2] || t0;

  const sentences = cleanSentences(summaryText);
  const fact1 = sentences[0] || `${t0} is a core principle established in this section.`;
  const fact2 = sentences[1] || `${t1} provides the key operational mechanism and relationship.`;
  const fact3 = sentences[2] || `Proper understanding of ${t2} requires strict adherence to defined conventions.`;

  // Checkpoint 1: Core Definition / Fundamental Law of the Section
  const cp1: SectionCheckpoint = {
    id: `cp-1-${section.id}`,
    checkpointNumber: 1,
    prompt: `State the fundamental principle or rule governing **${t0}** as covered in this section. What are its essential defining characteristics?`,
    subtopicTag: t0,
    benchmarkAnswer: `**Core Principle of ${t0}:**\n\n${fact1}\n\n**Essential Takeaway:**\n- Clarifies the baseline definition and governing constraints of this section.\n- Outlines the primary cause-and-effect relationship without extraneous assumptions.`,
    keyScoringPoints: [
      `Accurately states the governing definition or principle of "${t0}"`,
      'Correctly identifies the primary parameters or components involved',
      'Uses the specific terminology and criteria outlined in this section',
    ],
    trapAnalysis: `Common Pitfall: Giving an overly vague general definition instead of the precise formulation explained in this section.`,
    userResponse: '',
    inputMode: 'type',
    isRevealed: false,
    selfAssessment: null,
    sourceCitation: fact1,
  };

  // Checkpoint 2: Mechanism / Relationship / Cause-and-Effect in this Section
  const cp2: SectionCheckpoint = {
    id: `cp-2-${section.id}`,
    checkpointNumber: 2,
    prompt: `Explain the mechanism or relationship underlying **${t1}**. How do the primary variables or conditions interact according to the text?`,
    subtopicTag: t1,
    benchmarkAnswer: `**Mechanism of ${t1}:**\n\n${fact2}\n\n**Key Operational Details:**\n- Direct correlation or dependency between key variables as detailed in the lesson.\n- Satisfies the required boundary conditions or operational prerequisites.`,
    keyScoringPoints: [
      `Explains the underlying mechanism or relationship of "${t1}"`,
      'Traces how changes in input conditions affect the resulting output or state',
      'Maintains consistency with the section summary',
    ],
    trapAnalysis: `Common Pitfall: Confusing cause and effect or inverting variable relationships when analyzing ${t1}.`,
    userResponse: '',
    inputMode: 'type',
    isRevealed: false,
    selfAssessment: null,
    sourceCitation: fact2,
  };

  // Checkpoint 3: Critical Constraint, Application, or Common Pitfall in this Section
  const cp3: SectionCheckpoint = {
    id: `cp-3-${section.id}`,
    checkpointNumber: 3,
    prompt: `What critical rule, constraint, or boundary condition must be maintained when applying **${t2}**? Explain why neglecting it leads to errors.`,
    subtopicTag: t2,
    benchmarkAnswer: `**Application & Constraints for ${t2}:**\n\n${fact3}\n\n**Mandatory Verification:**\n- Always verify initial parameters against the section's boundary criteria.\n- Avoid premature assumptions or confusing this concept with related topics.`,
    keyScoringPoints: [
      `Identifies the specific boundary condition, rule, or prerequisite for "${t2}"`,
      'Explains the reason why this constraint is mandatory',
      'Demonstrates correct step-by-step reasoning based on section material',
    ],
    trapAnalysis: `Common Pitfall: Applying the rules of ${t2} outside their valid domain or misapplying conventions.`,
    userResponse: '',
    inputMode: 'type',
    isRevealed: false,
    selfAssessment: null,
    sourceCitation: fact3,
  };

  return [cp1, cp2, cp3];
}
