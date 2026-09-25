import { Section, Chapter, SubjectItem, DocumentFlashcard } from '../../types';
import { EnrichedQuizQuestion } from './SectionQuizModal';

export const mockSectionOptics: Section = {
  id: 'sec-optics-101',
  documentId: 'doc-optics-101',
  sectionNumber: 1,
  title: 'Spherical Mirrors: Reflection, Focus & Ray Conventions',
  completionRate: 55, // triggers needs revision if below 60%
  isSkipped: false,
  keyTopics: [
    'Laws of Reflection & Paraxial Rays',
    'Cartesian Sign Convention',
    'Concave Mirror Image Characteristics',
    'Mirror Formula vs Lens Formula',
  ],
  summary: `# Spherical Mirrors: Reflection, Focus & Ray Conventions

Spherical mirrors form the bedrock of geometrical ray optics, governing both imaging devices and beam concentrators.

## Core Principles
- **Aperture & Paraxial Condition**: For mirrors of small aperture relative to curvature radius, paraxial rays converge precisely at the principal focus $F = R/2$.
- **Specular Reflection**: Every incident ray obeys $\\theta_i = \\theta_r$ relative to the surface normal drawn from the center of curvature $C$.
- **New Cartesian Sign Convention**:
  1. All optical distances are measured from the mirror pole $P$ acting as origin $(0, 0)$.
  2. Distances along incident beam travel (conventionally left-to-right) are **positive**.
  3. Distances opposing incident beam travel (left of pole) are **negative**. Consequently, object distance $u$ is consistently negative.
  4. Heights above the principal axis are **positive**; heights below are **negative**.

## Mirror Formula & Transverse Magnification
The fundamental equation tying focal length $f$, image coordinate $v$, and object coordinate $u$ is:
$$\\frac{1}{f} = \\frac{1}{v} + \\frac{1}{u}$$

Transverse linear magnification:
$$m = \\frac{h_i}{h_o} = -\\frac{v}{u}$$
A negative magnification indicates a **real and inverted** image, whereas a positive magnification denotes an **upright and virtual** image.

> **EXTRA INFO / KEY EXAM TRAP**:
> Do not confuse the mirror equation $(\\frac{1}{f} = \\frac{1}{v} + \\frac{1}{u})$ with the thin-lens Gaussian relation $(\\frac{1}{f} = \\frac{1}{v} - \\frac{1}{u})$. Concave mirrors strictly feature a negative focal length ($f < 0$), while convex mirrors always feature a positive focal length ($f > 0$).`,
  flashcards: [
    {
      id: 'fc-mock-1',
      sectionId: 'sec-optics-101',
      frontPrompt: 'Under the New Cartesian Sign Convention, object distance (u) is always {{c1::negative}} because light travels left-to-right.',
      backAnswer: 'Object distance (u) is always negative because distances opposite to incident light direction are defined negative.',
      sourceContext: 'Ray Optics Conventions • Section 1.1',
      interval: 1,
      repetition: 0,
      easinessFactor: 2.5,
      status: 'active',
    },
    {
      id: 'fc-mock-2',
      sectionId: 'sec-optics-101',
      frontPrompt: 'What is the relationship between radius of curvature (R) and focal length (f)? {{c1::f = R / 2}}.',
      backAnswer: 'f = R / 2 (or R = 2f) for spherical mirrors of small aperture.',
      sourceContext: 'Aperture Geometry • Section 1.2',
      interval: 2,
      repetition: 1,
      easinessFactor: 2.6,
      status: 'active',
    },
    {
      id: 'fc-mock-3',
      sectionId: 'sec-optics-101',
      frontPrompt: 'A concave mirror creates an upright, magnified virtual image when the object is located {{c1::between Pole (P) and Focus (F)}}.',
      backAnswer: 'Between Pole (P) and Focus (F). Reflected rays diverge in front and appear to originate from behind the mirror.',
      sourceContext: 'Concave Mirror Image Formation • Section 1.3',
      interval: 4,
      repetition: 2,
      easinessFactor: 2.7,
      status: 'active',
    },
    {
      id: 'fc-mock-4',
      sectionId: 'sec-optics-101',
      frontPrompt: 'The mirror formula connecting f, v, and u is written as {{c1::1/f = 1/v + 1/u}}.',
      backAnswer: '1/f = 1/v + 1/u. Note the addition sign; subtraction is for thin lenses.',
      sourceContext: 'Mirror Formula • Section 1.4',
      interval: 1,
      repetition: 0,
      easinessFactor: 2.5,
      status: 'active',
    },
  ],
  knowledgeQuestions: [
    {
      id: 'kq-mock-1',
      sectionId: 'sec-optics-101',
      question: 'State the New Cartesian Sign Convention for focal length in concave vs convex mirrors.',
      sampleAnswer: 'Concave mirrors have a negative focal length (f < 0) because focus lies in front (left of pole). Convex mirrors have a positive focal length (f > 0) because focus lies behind the mirror.',
      userResponse: '',
      isCorrect: null,
    },
    {
      id: 'kq-mock-2',
      sectionId: 'sec-optics-101',
      question: 'Where must an object be positioned in front of a concave mirror so that its real image has identical size to the object?',
      sampleAnswer: 'At the Center of Curvature (C, distance u = 2f). The image is formed at C, real, inverted, with magnification m = -1.',
      userResponse: '',
      isCorrect: null,
    },
    {
      id: 'kq-mock-3',
      sectionId: 'sec-optics-101',
      question: 'Why does covering half the aperture of a concave mirror not cut the image in half?',
      sampleAnswer: 'Light rays from every point of the object hit all parts of the mirror. Uncovered areas still form the entire image, but with reduced luminosity (50% brightness).',
      userResponse: '',
      isCorrect: null,
    },
  ],
  quizzes: [
    {
      id: 'quiz-mock-1',
      sectionId: 'sec-optics-101',
      mode: 'test',
      score: 55,
      timeTakenSeconds: 145,
      completedAt: '2026-09-20T10:30:00Z',
      questions: [],
    },
  ],
};

export const mockSectionRefraction: Section = {
  id: 'sec-optics-102',
  documentId: 'doc-optics-101',
  sectionNumber: 2,
  title: 'Snell\'s Law, Refractive Index & Total Internal Reflection',
  completionRate: 85,
  isSkipped: false,
  keyTopics: [
    'Snell\'s Law & Relative Refractive Index',
    'Critical Angle & Total Internal Reflection (TIR)',
    'Optical Fibers & Prism Dispersion',
  ],
  summary: `# Snell's Law & Total Internal Reflection (TIR)

When electromagnetic waves cross the boundary between dielectric media, phase velocity changes cause ray refraction.

## Snell's Law of Refraction
$$\\frac{\\sin i}{\\sin r} = \\frac{n_2}{n_1} = \\frac{v_1}{v_2}$$

Where $n$ represents absolute refractive index ($n = c / v$).

## Total Internal Reflection (TIR)
TIR occurs under two obligatory boundary conditions:
1. Ray travels from an **optically denser** medium to an **optically rarer** medium ($n_1 > n_2$).
2. Angle of incidence exceeds the **critical angle** $\\theta_c$:
$$\\sin \\theta_c = \\frac{n_2}{n_1}$$`,
  flashcards: [
    {
      id: 'fc-refract-1',
      sectionId: 'sec-optics-102',
      frontPrompt: 'The condition for total internal reflection requires light to travel from a {{c1::denser to a rarer}} medium.',
      backAnswer: 'Denser to rarer medium (n1 > n2).',
      sourceContext: 'TIR Conditions',
      interval: 6,
      repetition: 3,
      easinessFactor: 2.8,
      status: 'active',
    },
  ],
};

export const mockChapterOptics: Chapter = {
  id: 'chap-optics-mock',
  name: 'Light: Reflection and Refraction',
  subject: 'Physics',
  status: 'needs_practice',
  masteryPercentage: 62,
  sections: [mockSectionOptics, mockSectionRefraction],
};

export const mockSubjectPhysics: SubjectItem = {
  id: 'subj-physics-mock',
  name: 'Physics',
  color: '#059669',
  type: 'study',
  chapters: [mockChapterOptics],
};

export const mockDiagnosticQuestions: EnrichedQuizQuestion[] = [
  {
    id: 'diag-q1',
    quizId: 'diag-quiz',
    type: 'multiple_choice',
    questionText: 'When evaluating primary conceptual frameworks, which criteria ensures systemic consistency across applied problem solving?',
    choices: [
      'Establishing governing principles and validating boundary conditions through step-by-step reasoning.',
      'Relying solely on intuitive approximations without verifying fundamental relations.',
      'Assuming theoretical relationships invert when applied to practical curriculum scenarios.',
      'Isolating peripheral observations while disregarding foundational axioms.',
    ],
    correctIndex: 0,
    explanation: 'Systemic problem solving requires grounded governing principles and validation against core criteria.',
    topicTag: 'Governing Principles & Methodology',
    difficulty: 'Application',
    correctAnalysis: 'Step 1: Identify foundational laws and variables.\nStep 2: Map constraints and coordinate conventions.\nStep 3: Verify consistency against verified syllabus standards.',
    distractorAnalyses: {
      1: 'Trap: Intuitive approximations fail under rigorous examination criteria without foundational proofs.',
      2: 'Trap: Core laws maintain mathematical consistency across all standard applications.',
      3: 'Trap: Isolating peripheral facts overlooks systemic interactions.',
    },
  },
  {
    id: 'diag-q2',
    quizId: 'diag-quiz',
    type: 'multiple_choice',
    questionText: 'Which analytical approach distinguishes causal mechanisms from superficial observational correlations?',
    choices: [
      'Systematic empirical derivation and cross-examination of independent variables.',
      'Subjective conjecture without verification of underlying governing structures.',
      'Inverting causal flow without experimental validation.',
      'Disregarding anomalies in favor of simplified baseline models.',
    ],
    correctIndex: 0,
    explanation: 'Rigorous analysis relies on isolating variables and testing causal pathways directly.',
    topicTag: 'Analytical Derivation & Causality',
    difficulty: 'Application',
    correctAnalysis: 'Isolating test parameters and verifying cause-and-effect pathways delivers verifiable conceptual clarity.',
    distractorAnalyses: {
      1: 'Trap: Conjectures lack empirical grounding.',
      2: 'Trap: Reversing cause and effect violates foundational principles.',
      3: 'Trap: Overlooking edge-case anomalies compromises diagnostic precision.',
    },
  },
  {
    id: 'diag-q3',
    quizId: 'diag-quiz',
    type: 'multiple_choice',
    questionText: 'How should standard conventions and reference frames be established during problem formulation?',
    choices: [
      'Designate an explicit origin, consistent coordinate signs, and defined benchmark units.',
      'Alter sign orientations dynamically between intermediate calculation steps.',
      'Omit reference benchmarks and treat dimensional scales arbitrarily.',
      'Presume all reference vectors cancel regardless of spatial orientation.',
    ],
    correctIndex: 0,
    explanation: 'A fixed origin, unambiguous coordinate convention, and dimensional verification prevent sign and calculation errors.',
    topicTag: 'Reference Frames & Coordinate Standards',
    difficulty: 'Recall',
    correctAnalysis: 'Establishing an invariant reference origin and uniform vector signs ensures rigorous accuracy from start to finish.',
    distractorAnalyses: {
      1: 'Trap: Altering coordinate conventions mid-solution causes fatal sign errors.',
      2: 'Trap: Standard units and benchmarks are required for physical and mathematical consistency.',
      3: 'Trap: Spatial vectors maintain directional integrity unless balanced by equal opposite magnitudes.',
    },
  },
];
