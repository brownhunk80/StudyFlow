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
      subtopicTag: 'Cartesian Sign Convention',
      question: 'Under the New Cartesian Sign Convention for spherical mirrors, what is the reference origin for all measurements, and why is the focal length (f) of a concave mirror negative while a convex mirror is positive?',
      sampleAnswer: '**1. Reference Origin:**\nAll optical distances are measured from the **mirror pole (P)** as the origin $(0, 0)$, with the principal axis as the horizontal reference axis.\n\n**2. Focal Length Sign Analysis:**\n- **Concave Mirror ($f < 0$):** The principal focus lies in front of the reflecting surface (to the left of pole P), opposite to the incident ray direction (which travels left-to-right). Thus, $f$ is strictly **negative**.\n- **Convex Mirror ($f > 0$):** The principal focus lies behind the reflecting surface (to the right of pole P), along the incident ray direction. Thus, $f$ is strictly **positive**.\n\n**3. Object Distance Rule:**\nObjects are placed to the left of the mirror, so the object distance $u$ is consistently **negative** for all spherical mirror problems.',
      keyScoringPoints: [
        'States that all distances are measured starting from the mirror pole (P) as origin (0, 0)',
        'Explains that concave mirror focus lies to the left of the pole (in front), making f negative',
        'Explains that convex mirror focus lies to the right of the pole (behind mirror), making f positive',
      ],
      trapAnalysis: 'Common Pitfall: Confusing the mirror convention with lenses or assuming object distance (u) can be positive when placed in front of a mirror.',
      sourceCitation: 'All optical distances are measured from the mirror pole P acting as origin (0, 0).',
      userResponse: '',
      isCorrect: null,
    },
    {
      id: 'kq-mock-2',
      sectionId: 'sec-optics-101',
      subtopicTag: 'Concave Mirror Image Characteristics',
      question: 'Where must an object be positioned in front of a concave mirror so that its real image has the exact same size as the object? State the image location, orientation, and magnification (m).',
      sampleAnswer: '**1. Object Position:**\nThe object must be positioned at the **Center of Curvature (C)**, at a distance $u = 2f = R$ in front of the concave mirror.\n\n**2. Image Characteristics:**\n- **Location:** The real image is formed at the **Center of Curvature (C)**.\n- **Nature & Orientation:** The image is **real and inverted**.\n- **Size:** Identical size to the object ($h_i = h_o$).\n\n**3. Magnification Calculation:**\n$$m = -\\frac{v}{u} = -\\frac{-2f}{-2f} = -1$$\nThe magnitude $|m| = 1$ confirms equal size, and the negative sign indicates inverted orientation.',
      keyScoringPoints: [
        'Identifies object position at Center of Curvature (C, distance u = 2f or R)',
        'States that image is formed at C, real, inverted, and equal in size to object',
        'Explicitly states magnification m = -1 with the correct negative sign',
      ],
      trapAnalysis: 'Common Pitfall: Stating magnification is +1 instead of -1. A positive magnification means an upright virtual image (which only happens between P and F).',
      sourceCitation: 'At C (distance u = 2f), rays intersect at C to produce an inverted image of identical height.',
      userResponse: '',
      isCorrect: null,
    },
    {
      id: 'kq-mock-3',
      sectionId: 'sec-optics-101',
      subtopicTag: 'Mirror Formula vs Lens Formula',
      question: 'State the Mirror Formula relating f, v, and u. Why does covering the lower half of a concave mirror with opaque paper not cut the formed image in half?',
      sampleAnswer: '**1. Mirror Formula:**\n$$\\frac{1}{f} = \\frac{1}{v} + \\frac{1}{u}$$\n*(Note: Uses addition; the lens formula uses subtraction: $\\frac{1}{f} = \\frac{1}{v} - \\frac{1}{u}$)*.\n\n**2. Why Covering Half the Mirror Does Not Cut the Image in Half:**\n- Light rays from **every point of the object** strike all sections of the mirror.\n- The exposed top half of the mirror still collects and focuses rays from every point of the object, completely reconstructing the full image.\n- **Observed Effect:** The image remains complete in shape and geometry, but its **brightness / luminosity is reduced by 50%** because fewer total light rays converge to form the image.',
      keyScoringPoints: [
        'Correctly states the mirror formula: 1/f = 1/v + 1/u (with addition sign)',
        'Explains that light rays from every part of the object hit all parts of the mirror, so uncovered area forms the entire image',
        'Identifies that the only observable change is reduced intensity / brightness',
      ],
      trapAnalysis: 'Common Pitfall: Believing the top half of a mirror only forms the top half of an image, or confusing the mirror formula with the thin-lens formula.',
      sourceCitation: 'Light rays from every point of the object hit all parts of the mirror.',
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
  knowledgeQuestions: [
    {
      id: 'kq-refract-1',
      sectionId: 'sec-optics-102',
      subtopicTag: 'Snell\'s Law & Refractive Index',
      question: 'State Snell\'s Law of refraction in equation form. Define absolute refractive index (n) in terms of light speed, and state whether a ray bends towards or away from the normal when moving into an optically denser medium.',
      sampleAnswer: '**1. Snell\'s Law Formulation:**\n$$\\frac{\\sin i}{\\sin r} = \\frac{n_2}{n_1} = \\frac{v_1}{v_2}$$\nWhere $i$ is the angle of incidence, $r$ is the angle of refraction, and $n_2/n_1$ is the relative refractive index of medium 2 with respect to medium 1.\n\n**2. Absolute Refractive Index:**\n$$n = \\frac{c}{v}$$\nWhere $c$ is the speed of light in vacuum ($\\approx 3 \\times 10^8\\text{ m/s}$) and $v$ is the phase velocity of light in that medium.\n\n**3. Ray Bending Rule:**\nWhen light enters an **optically denser** medium ($n_2 > n_1$, so speed $v_2 < v_1$), the ray bends **towards the normal** ($\\angle r < \\angle i$).',
      keyScoringPoints: [
        'States Snell\'s Law equation: sin(i) / sin(r) = n2 / n1 = v1 / v2',
        'Defines absolute refractive index as n = c / v (speed in vacuum over speed in medium)',
        'Affirms that light bends towards the normal when entering an optically denser medium',
      ],
      trapAnalysis: 'Common Pitfall: Inverting the ratio (writing sin i / sin r = n1 / n2) or measuring angles relative to the boundary surface rather than the normal line.',
      sourceCitation: 'When electromagnetic waves cross the boundary between dielectric media, phase velocity changes cause ray refraction.',
      userResponse: '',
      isCorrect: null,
    },
    {
      id: 'kq-refract-2',
      sectionId: 'sec-optics-102',
      subtopicTag: 'Critical Angle & Total Internal Reflection (TIR)',
      question: 'What are the two mandatory boundary conditions required for Total Internal Reflection (TIR) to occur? State the formula relating the critical angle (θc) to the refractive indices.',
      sampleAnswer: '**1. Two Mandatory Conditions for TIR:**\n1. Light must travel from an **optically denser medium to an optically rarer medium** ($n_1 > n_2$).\n2. The angle of incidence ($i$) in the denser medium must be **strictly greater than the critical angle** ($\\theta_c$):\n   $$i > \\theta_c$$\n\n**2. Critical Angle Formula:**\nAt the critical angle, the angle of refraction is $90^\\circ$ (the ray skims the surface):\n$$\\sin \\theta_c = \\frac{n_2}{n_1}$$\nIf the rarer medium is air ($n_2 = 1$):\n$$\\sin \\theta_c = \\frac{1}{n_1}$$',
      keyScoringPoints: [
        'Condition 1: Light must travel from optically denser to rarer medium (n1 > n2)',
        'Condition 2: Angle of incidence must exceed the critical angle (i > θc)',
        'Correctly states formula: sin(θc) = n2 / n1 (or 1/n into air)',
      ],
      trapAnalysis: 'Common Pitfall: Forgetting that TIR is physically impossible when light travels from rarer to denser media, regardless of incidence angle.',
      sourceCitation: 'TIR occurs under two obligatory boundary conditions: Ray travels from denser to rarer, and incidence angle exceeds critical angle.',
      userResponse: '',
      isCorrect: null,
    },
    {
      id: 'kq-refract-3',
      sectionId: 'sec-optics-102',
      subtopicTag: 'Optical Fibers & Core-Cladding Boundary',
      question: 'How do optical fibers exploit Total Internal Reflection to transmit signals over long distances without significant loss? Why must the core have a higher refractive index than the cladding?',
      sampleAnswer: '**1. Core vs Cladding Refractive Index Requirement:**\nThe optical fiber core must have a **higher refractive index** than the surrounding cladding ($n_{\\text{core}} > n_{\\text{cladding}}$). This ensures that light propagating inside the core travels toward an optically rarer medium, satisfying the first prerequisite for TIR.\n\n**2. Total Internal Reflection Mechanism:**\n- Light signals are launched into the core at angles such that rays strike the core-cladding interface at an angle of incidence greater than the critical angle ($i > \\theta_c$).\n- The rays undergo repeated **100% total internal reflection** along the length of the fiber without refracting out into the cladding, allowing low-loss transmission even across curved paths.',
      keyScoringPoints: [
        'States that n(core) must be greater than n(cladding) to create a denser-to-rarer interface',
        'Explains that light strikes the interface at angles greater than critical angle (i > θc)',
        'Describes successive internal reflections guiding the beam with minimal loss',
      ],
      trapAnalysis: 'Common Pitfall: Believing fibers have internal silver mirror coatings rather than relying on pure dielectric total internal reflection.',
      sourceCitation: 'Optical fibers utilize total internal reflection at the core-cladding boundary.',
      userResponse: '',
      isCorrect: null,
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
    questionText: 'When applying the New Cartesian Sign Convention to spherical mirrors, what determines the algebraic sign of object distance (u)?',
    choices: [
      'Object distance u is consistently negative because distances opposing incident beam travel are defined negative.',
      'Object distance u is positive whenever the object is placed in front of a concave mirror.',
      'The sign depends solely on whether the image formed is real or virtual.',
      'Object distance u is positive for convex mirrors and negative for concave mirrors.',
    ],
    correctIndex: 0,
    explanation: 'Under the New Cartesian Sign Convention, all distances measured against the direction of incident light (conventionally left of the pole) are strictly negative.',
    topicTag: 'Cartesian Sign Conventions',
    difficulty: 'Application',
    correctAnalysis: 'Step 1: Pole P acts as origin (0, 0).\nStep 2: Incident light travels from left to right (positive direction).\nStep 3: Object is placed to the left of the pole, so u is always negative.',
    distractorAnalyses: {
      1: 'Sign Trap: Distances opposite to incident light direction are strictly negative, regardless of mirror concavity.',
      2: 'Trap: Object coordinate sign is independent of image characteristics.',
      3: 'Trap: Both convex and concave mirrors treat front object positions with negative coordinates.',
    },
  },
  {
    id: 'diag-q2',
    quizId: 'diag-quiz',
    type: 'multiple_choice',
    questionText: 'When examining ray paths in convex mirrors, which characteristic strictly defines the formed image for any real object position?',
    choices: [
      'A virtual, upright, and diminished image formed behind the mirror between pole and focus.',
      'A real, inverted, and magnified image formed in front of the mirror beyond the center of curvature.',
      'An equal-sized inverted image formed precisely at the center of curvature.',
      'A real image formed at infinity with divergent wavefront propagation.',
    ],
    correctIndex: 0,
    explanation: 'Convex mirrors always diverge incident rays, causing reflected rays to appear to originate from an upright, virtual, diminished focus behind the mirror.',
    topicTag: 'Convex Mirror Ray Tracing',
    difficulty: 'Application',
    correctAnalysis: 'Convex mirrors possess a virtual focus behind the reflective surface (f > 0). For all real object distances u < 0, rays diverge after reflection and intersect virtually between P and F.',
    distractorAnalyses: {
      1: 'Trap: Convex mirrors cannot converge rays to form a real or inverted image from real objects.',
      2: 'Trap: Equal-sized inverted images only occur in concave mirrors when the object is at the center of curvature C.',
      3: 'Trap: Images at infinity occur when objects are placed precisely at the focal point of a concave mirror.',
    },
  },
  {
    id: 'diag-q3',
    quizId: 'diag-quiz',
    type: 'multiple_choice',
    questionText: 'Under the spherical mirror formula (1/f = 1/v + 1/u), how is transverse linear magnification (m) strictly defined and interpreted?',
    choices: [
      'm = -v / u; a negative value signifies a real and inverted image, while a positive value denotes a virtual upright image.',
      'm = +v / u; identical in sign to the thin Gaussian lens formulation.',
      'm = u / v; where values greater than 1 represent reduced dimensions.',
      'm = -u / f; valid exclusively for paraxial rays near the optical center.',
    ],
    correctIndex: 0,
    explanation: 'Transverse magnification for spherical mirrors is m = h_i / h_o = -v / u. The negative sign distinguishes mirror optics from thin lens optics.',
    topicTag: 'Mirror Formula & Magnification Ratio',
    difficulty: 'Recall',
    correctAnalysis: 'Linear magnification combines image coordinate v and object coordinate u via m = -v/u. A negative magnification confirms inverted orientation, characteristic of real images.',
    distractorAnalyses: {
      1: 'Trap: Thin lenses use m = +v/u; spherical mirrors require the negative sign (m = -v/u).',
      2: 'Trap: The ratio is image distance over object distance, not object over image.',
      3: 'Trap: Magnification directly requires image and object coordinates rather than purely focal distance.',
    },
  },
];
