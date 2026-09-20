export interface ChapterTopic {
  id: string;
  title: string;
  keyInfo: string[];
  keyFormula?: string;
  commonTraps?: string;
  video: {
    title: string;
    channel: string;
    duration: string;
    url: string;
    description: string;
    badgeColor: string;
  };
}

export interface ChapterCuratedContent {
  chapterName: string;
  subject: string;
  overview: string;
  topics: ChapterTopic[];
}

export const curatedChapterLibrary: Record<string, ChapterCuratedContent> = {
  'Light - Reflection & Refraction': {
    chapterName: 'Light - Reflection & Refraction',
    subject: 'Science',
    overview:
      'Light travels in straight lines. Understand image formation by spherical mirrors, Snell’s Law of refraction, and lens power calculations.',
    topics: [
      {
        id: 'light-1',
        title: 'Laws of Reflection & Spherical Mirrors',
        keyInfo: [
          'Angle of incidence equals angle of reflection (∠i = ∠r).',
          'Concave mirrors converge light; can form both real/inverted and virtual/erect images.',
          'Convex mirrors always form virtual, erect, and diminished images (used as rear-view mirrors).',
        ],
        keyFormula: 'f = R / 2 (Focal length is half radius of curvature)',
        commonTraps: 'Remember: Real images are inverted; virtual images are always erect.',
        video: {
          title: 'Spherical Mirrors & Ray Diagrams Explained',
          channel: 'CrashCourse Physics',
          duration: '10 min',
          url: 'https://www.youtube.com/results?search_query=crash+course+geometric+optics+spherical+mirrors',
          description: 'Visual animations of concave and convex mirror ray diagrams and image properties.',
          badgeColor: 'bg-red-500',
        },
      },
      {
        id: 'light-2',
        title: 'Mirror Formula & Cartesian Sign Convention',
        keyInfo: [
          'All distances measured from mirror pole (P) along principal axis.',
          'Object distance (u) is ALWAYS negative under Cartesian convention.',
          'Concave mirror focal length (f) is negative; Convex mirror focal length (f) is positive.',
        ],
        keyFormula: '1/f = 1/v + 1/u   |   Magnification m = h\'/h = -v/u',
        commonTraps: 'Don’t forget the negative sign in mirror magnification (m = -v/u)!',
        video: {
          title: 'Mirror Formula & Sign Convention Tricks',
          channel: 'The Organic Chemistry Tutor',
          duration: '12 min',
          url: 'https://www.youtube.com/results?search_query=mirror+equation+sign+conventions+organic+chemistry+tutor',
          description: 'Step-by-step numerical examples solving for image distance and magnification.',
          badgeColor: 'bg-indigo-600',
        },
      },
      {
        id: 'light-3',
        title: "Refraction of Light & Snell's Law",
        keyInfo: [
          'When light enters an optically denser medium, it slows down and bends TOWARDS the normal.',
          'When light enters a rarer medium, it speeds up and bends AWAY from the normal.',
          'Refractive index n = speed of light in vacuum (c) / speed of light in medium (v).',
        ],
        keyFormula: 'Snell\'s Law: sin(i) / sin(r) = n₂ / n₁   or   n₁·sin(i) = n₂·sin(r)',
        commonTraps: 'Optical density is not the same as mass density (kerosene is optically denser than water but floats!).',
        video: {
          title: "Snell's Law & Refraction of Light",
          channel: 'Khan Academy',
          duration: '8 min',
          url: 'https://www.youtube.com/results?search_query=khan+academy+snells+law+refraction+light',
          description: 'Intuitive explanation of why light bends when changing speed across media.',
          badgeColor: 'bg-emerald-600',
        },
      },
      {
        id: 'light-4',
        title: 'Lens Formula & Optical Power',
        keyInfo: [
          'Convex lens is converging (positive focal length f > 0).',
          'Concave lens is diverging (negative focal length f < 0).',
          'Lens formula has a MINUS sign: 1/f = 1/v - 1/u.',
          'Lens power unit is Diopter (D), defined as 1 / focal length in METERS.',
        ],
        keyFormula: '1/f = 1/v - 1/u   |   Power P = 1 / f (in meters) [Diopters]',
        commonTraps: 'Students often calculate P with f in centimeters. Always convert cm to meters first!',
        video: {
          title: 'Thin Lens Equation & Power of Lens',
          channel: 'Bozeman Science',
          duration: '11 min',
          url: 'https://www.youtube.com/results?search_query=bozeman+science+thin+lens+equation+diopters',
          description: 'Clear walkthrough of lens ray diagrams, magnification, and diopter calculations.',
          badgeColor: 'bg-blue-600',
        },
      },
    ],
  },
  'Chemical Reactions & Equations': {
    chapterName: 'Chemical Reactions & Equations',
    subject: 'Science',
    overview:
      'Master the law of conservation of mass, balancing chemical equations, key reaction archetypes, and redox reactions.',
    topics: [
      {
        id: 'chem-1',
        title: 'Balancing Chemical Equations & Conservation of Mass',
        keyInfo: [
          'Total mass of reactants must equal total mass of products.',
          'Never change chemical subscripts (e.g., H₂O stays H₂O); only adjust stoichiometric coefficients.',
          'Balance polyatomic ions as single units if they appear unchanged on both sides.',
        ],
        keyFormula: 'Mass(reactants) = Mass(products)',
        commonTraps: 'Do not change molecular formulas to balance atoms. Only place whole number coefficients in front.',
        video: {
          title: 'How to Balance Any Chemical Equation',
          channel: 'The Organic Chemistry Tutor',
          duration: '14 min',
          url: 'https://www.youtube.com/results?search_query=how+to+balance+chemical+equations+organic+chemistry+tutor',
          description: 'A foolproof method for balancing simple and complex chemical reactions.',
          badgeColor: 'bg-amber-600',
        },
      },
      {
        id: 'chem-2',
        title: 'Types of Chemical Reactions',
        keyInfo: [
          'Combination: A + B → AB (e.g. Quicklime CaO + H₂O → Slaked lime Ca(OH)₂ + heat).',
          'Decomposition: AB → A + B (Thermal, electrolytic, photolytic).',
          'Displacement: A + BC → AC + B (More reactive metal displaces less reactive metal).',
          'Double Displacement: AB + CD → AD + CB (Precipitation reactions like Na₂SO₄ + BaCl₂ → BaSO₄↓ + 2NaCl).',
        ],
        keyFormula: 'Reactivity series determines whether a single displacement reaction occurs.',
        commonTraps: 'White precipitate BaSO₄ does not dissolve in water; always indicate state symbols (s, l, g, aq).',
        video: {
          title: 'Types of Chemical Reactions',
          channel: 'CrashCourse Chemistry',
          duration: '11 min',
          url: 'https://www.youtube.com/results?search_query=crash+course+types+of+chemical+reactions',
          description: 'High-energy visual guide to precipitation, combination, and decomposition reactions.',
          badgeColor: 'bg-purple-600',
        },
      },
      {
        id: 'chem-3',
        title: 'Redox Reactions, Corrosion & Rancidity',
        keyInfo: [
          'Oxidation = Gain of oxygen OR loss of hydrogen (Loss of electrons - OIL).',
          'Reduction = Loss of oxygen OR gain of hydrogen (Gain of electrons - RIG).',
          'Corrosion: Slow degradation of metals (Rust is hydrated iron oxide Fe₂O₃·xH₂O).',
          'Rancidity: Oxidation of fats/oils causing foul odor; prevented by packaging with Nitrogen gas or antioxidants.',
        ],
        keyFormula: 'OIL RIG: Oxidation Is Loss, Reduction Is Gain of electrons',
        commonTraps: 'The substance oxidized is the REDUCING agent. The substance reduced is the OXIDIZING agent.',
        video: {
          title: 'Redox Reactions & Oxidation States',
          channel: 'Khan Academy',
          duration: '9 min',
          url: 'https://www.youtube.com/results?search_query=khan+academy+redox+reactions+oxidation+reduction',
          description: 'Clear breakdown of oxidizing vs reducing agents with everyday examples.',
          badgeColor: 'bg-emerald-600',
        },
      },
    ],
  },
  'Electricity & Circuits': {
    chapterName: 'Electricity & Circuits',
    subject: 'Science',
    overview:
      'Understand electric potential, Ohm’s Law, series and parallel resistor networks, and electrical heating power.',
    topics: [
      {
        id: 'elec-1',
        title: "Ohm's Law & Resistance",
        keyInfo: [
          'Current through a conductor is directly proportional to voltage across it at constant temperature.',
          'Resistance depends on material resistivity (ρ), length (L), and cross-sectional area (A): R = ρ·L/A.',
          'Thicker wires have less resistance; longer wires have more resistance.',
        ],
        keyFormula: 'V = I · R   |   R = ρ · (L / A)',
        commonTraps: 'Ohm’s law only holds true if temperature remains constant (non-ohmic devices like diodes curve).',
        video: {
          title: "Ohm's Law & Resistivity Explained",
          channel: 'Khan Academy',
          duration: '9 min',
          url: 'https://www.youtube.com/results?search_query=khan+academy+ohms+law+resistance+circuits',
          description: 'Interactive circuit simulations showing how voltage pushes current against resistance.',
          badgeColor: 'bg-cyan-600',
        },
      },
      {
        id: 'elec-2',
        title: 'Series vs Parallel Resistor Circuits',
        keyInfo: [
          'In Series: Current (I) is identical through all resistors; total Req = R₁ + R₂ + R₃.',
          'In Parallel: Voltage (V) is identical across all branches; 1/Req = 1/R₁ + 1/R₂ + 1/R₃.',
          'Household appliances are connected in parallel so one failing device doesn’t shut down the entire house.',
        ],
        keyFormula: 'Series: Req = R₁ + R₂   |   Parallel: Req = (R₁ · R₂) / (R₁ + R₂)',
        commonTraps: 'In parallel, the equivalent resistance is ALWAYS smaller than the smallest single resistor!',
        video: {
          title: 'Series vs Parallel Circuits: How to Solve',
          channel: 'The Organic Chemistry Tutor',
          duration: '15 min',
          url: 'https://www.youtube.com/results?search_query=series+and+parallel+circuits+organic+chemistry+tutor',
          description: 'Step-by-step circuit reduction techniques and finding current in each branch.',
          badgeColor: 'bg-indigo-600',
        },
      },
      {
        id: 'elec-3',
        title: "Joule's Law of Heating & Electric Power",
        keyInfo: [
          'Heat produced in a resistor is proportional to the square of current (I²), resistance (R), and time (t).',
          'Electric power P = V·I = I²·R = V² / R.',
          'Commercial unit of energy is 1 Kilowatt-hour (kWh) = 3.6 × 10⁶ Joules (1 "unit" on electricity bills).',
        ],
        keyFormula: 'Heat H = I² · R · t   |   Power P = V · I   |   1 kWh = 3.6 × 10⁶ J',
        commonTraps: 'Remember to convert minutes or hours into seconds when using H = I²Rt in standard SI units.',
        video: {
          title: 'Electric Power, Work, and Joule Heating',
          channel: 'CrashCourse Physics',
          duration: '10 min',
          url: 'https://www.youtube.com/results?search_query=crash+course+electric+power+joule+heating',
          description: 'Practical explanations of fuses, light bulbs, heaters, and kilowatt-hour billing.',
          badgeColor: 'bg-rose-600',
        },
      },
    ],
  },
  'Quadratic Equations': {
    chapterName: 'Quadratic Equations',
    subject: 'Maths',
    overview:
      'Master solving second-degree polynomials using factorization, completing the square, and the quadratic formula.',
    topics: [
      {
        id: 'quad-1',
        title: 'Standard Form & Factorization',
        keyInfo: [
          'Standard form: ax² + bx + c = 0 where a ≠ 0.',
          'Factorization method: Find two numbers that multiply to give (a·c) and add to give (b).',
          'Zero-Product Property: If (x - p)(x - q) = 0, then x = p or x = q.',
        ],
        keyFormula: 'ax² + bx + c = 0',
        commonTraps: 'Always rearrange terms so the right-hand side equals 0 before trying to factor!',
        video: {
          title: 'Factoring Quadratic Equations',
          channel: 'Khan Academy',
          duration: '8 min',
          url: 'https://www.youtube.com/results?search_query=khan+academy+factoring+quadratic+equations',
          description: 'Visual grid and splitting-the-middle-term techniques for quick factoring.',
          badgeColor: 'bg-blue-600',
        },
      },
      {
        id: 'quad-2',
        title: 'The Quadratic Formula & Discriminant Analysis',
        keyInfo: [
          'The Quadratic Formula works on any quadratic equation without guesswork.',
          'Discriminant D = b² - 4ac governs root behavior:',
          '• If D > 0: Two distinct real roots.',
          '• If D = 0: Exactly one real root (two coincident roots: x = -b / 2a).',
          '• If D < 0: No real roots (roots are complex numbers).',
        ],
        keyFormula: 'x = [ -b ± √(b² - 4ac) ] / (2a)   |   D = b² - 4ac',
        commonTraps: 'The entire numerator is divided by 2a, not just the square root term!',
        video: {
          title: 'The Quadratic Formula & Discriminant Explained',
          channel: 'Brian McLogan',
          duration: '10 min',
          url: 'https://www.youtube.com/results?search_query=quadratic+formula+discriminant+brian+mclogan',
          description: 'Clear examples demonstrating how the discriminant predicts the graph’s x-intercepts.',
          badgeColor: 'bg-emerald-600',
        },
      },
      {
        id: 'quad-3',
        title: 'Relations Between Roots & Coefficients',
        keyInfo: [
          'If α and β are roots of ax² + bx + c = 0:',
          'Sum of roots: α + β = -b / a.',
          'Product of roots: α · β = c / a.',
          'Forming equation from roots: x² - (Sum)x + (Product) = 0.',
        ],
        keyFormula: 'α + β = -b/a   |   α · β = c/a   |   x² - (α+β)x + αβ = 0',
        commonTraps: 'Remember the minus sign in front of the sum of roots in x² - Sx + P = 0.',
        video: {
          title: 'Sum and Product of Roots of a Quadratic Equation',
          channel: 'The Organic Chemistry Tutor',
          duration: '11 min',
          url: 'https://www.youtube.com/results?search_query=sum+and+product+of+roots+quadratic+equation+organic+chemistry+tutor',
          description: 'Fast algebraic shortcuts using Vieta’s formulas on exam problems.',
          badgeColor: 'bg-purple-600',
        },
      },
    ],
  },
  'Trigonometry & Heights': {
    chapterName: 'Trigonometry & Heights',
    subject: 'Maths',
    overview:
      'Understand right-triangle ratios, trigonometric value tables, core Pythagorean identities, and real-world angle of elevation calculations.',
    topics: [
      {
        id: 'trig-1',
        title: 'Trig Ratios & Exact Values Table (0° to 90°)',
        keyInfo: [
          'SOH CAH TOA: sin = Opposite/Hypotenuse, cos = Adjacent/Hypotenuse, tan = Opposite/Adjacent.',
          'Key exact values:',
          '• sin(30°) = 1/2, sin(45°) = 1/√2, sin(60°) = √3/2, sin(90°) = 1.',
          '• cos is the reverse sequence of sin from 0° to 90°.',
          '• tan(θ) = sin(θ) / cos(θ). tan(45°) = 1.',
        ],
        keyFormula: 'tan(θ) = sin(θ) / cos(θ)   |   cosec = 1/sin   |   sec = 1/cos   |   cot = 1/tan',
        commonTraps: 'tan(90°) is undefined because cos(90°) = 0, causing division by zero.',
        video: {
          title: 'Trigonometry Table Trick: Memorize in 2 Minutes',
          channel: 'Khan Academy',
          duration: '7 min',
          url: 'https://www.youtube.com/results?search_query=trigonometry+table+trick+memorize+khan+academy',
          description: 'The palm-hand trick to quickly write down 0°, 30°, 45°, 60°, 90° values in exam margins.',
          badgeColor: 'bg-blue-600',
        },
      },
      {
        id: 'trig-2',
        title: 'Pythagorean Trigonometric Identities',
        keyInfo: [
          'Identity 1: sin²(θ) + cos²(θ) = 1.',
          'Identity 2: 1 + tan²(θ) = sec²(θ) (obtained by dividing Identity 1 by cos²θ).',
          'Identity 3: 1 + cot²(θ) = cosec²(θ) (obtained by dividing Identity 1 by sin²θ).',
        ],
        keyFormula: 'sin²θ + cos²θ = 1   |   1 + tan²θ = sec²θ   |   1 + cot²θ = cosec²θ',
        commonTraps: 'Be careful with signs when rearranging: sec²θ - tan²θ = 1, but tan²θ - sec²θ = -1.',
        video: {
          title: 'Trigonometric Identities Made Easy',
          channel: '3Blue1Brown / Khan Academy',
          duration: '12 min',
          url: 'https://www.youtube.com/results?search_query=trigonometric+identities+proofs+khan+academy',
          description: 'Geometric proofs on the unit circle that make the identities intuitive.',
          badgeColor: 'bg-indigo-600',
        },
      },
      {
        id: 'trig-3',
        title: 'Heights & Distances: Angles of Elevation & Depression',
        keyInfo: [
          'Angle of Elevation: Angle between line of sight and horizontal when looking UP at an object.',
          'Angle of Depression: Angle between line of sight and horizontal when looking DOWN at an object.',
          'The angle of depression from top of tower to ground observer equals the angle of elevation from observer to top (alternate interior angles).',
        ],
        keyFormula: 'tan(Elevation) = Height of Tower / Distance to Base',
        commonTraps: 'Angle of depression is measured from the HORIZONTAL line at the observer’s eye, NOT the vertical tower wall!',
        video: {
          title: 'Angle of Elevation and Depression Word Problems',
          channel: 'The Organic Chemistry Tutor',
          duration: '13 min',
          url: 'https://www.youtube.com/results?search_query=angle+of+elevation+depression+organic+chemistry+tutor',
          description: 'Diagram drawing tips and trigonometric ratio selection for real-world word problems.',
          badgeColor: 'bg-emerald-600',
        },
      },
    ],
  },
};

export function getChapterCuratedContent(chapterName: string, subject: string): ChapterCuratedContent {
  // Exact match
  if (curatedChapterLibrary[chapterName]) {
    return curatedChapterLibrary[chapterName];
  }

  // Partial or case-insensitive match
  const foundKey = Object.keys(curatedChapterLibrary).find(
    (k) =>
      k.toLowerCase().includes(chapterName.toLowerCase()) ||
      chapterName.toLowerCase().includes(k.toLowerCase())
  );
  if (foundKey) {
    return curatedChapterLibrary[foundKey];
  }

  // Fallback high-school chapter generator
  return {
    chapterName,
    subject,
    overview: `Key curriculum concepts, formulas, and verified topic walkthroughs for ${chapterName}.`,
    topics: [
      {
        id: `topic-${chapterName}-1`,
        title: `${chapterName}: Core Principles & Definitions`,
        keyInfo: [
          `Fundamental axioms and standard definitions governing ${chapterName}.`,
          'Key terminology frequently tested in board and term exams.',
          'Core qualitative mechanisms and real-world examples.',
        ],
        keyFormula: 'Master standard definitions and units of measurement.',
        commonTraps: 'Avoid memorizing words without understanding the underlying cause-and-effect relationship.',
        video: {
          title: `${chapterName} Full Concept Review`,
          channel: 'Khan Academy / CrashCourse',
          duration: '10 min',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(chapterName + ' ' + subject + ' full concept review')}`,
          description: `Comprehensive video tutorial covering essential exam concepts for ${chapterName}.`,
          badgeColor: 'bg-indigo-600',
        },
      },
      {
        id: `topic-${chapterName}-2`,
        title: `${chapterName}: Formulas, Equations & Problem Solving`,
        keyInfo: [
          'Standard mathematical derivations and governing formulas.',
          'Step-by-step problem-solving strategy for high-weightage questions.',
          'Cartesian conventions, state symbols, and unit conversions.',
        ],
        keyFormula: 'Always verify SI units before substituting into numerical formulas.',
        commonTraps: 'Be cautious with negative signs and unit conversions (e.g., cm to meters, grams to kg).',
        video: {
          title: `${chapterName} Numerical Problems & Formulas`,
          channel: 'The Organic Chemistry Tutor',
          duration: '14 min',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(chapterName + ' formulas and numerical problems')}`,
          description: `Worked-out example problems with test-taking tips and common pitfalls to avoid.`,
          badgeColor: 'bg-emerald-600',
        },
      },
      {
        id: `topic-${chapterName}-3`,
        title: `${chapterName}: High-Yield Exam Questions & Common Traps`,
        keyInfo: [
          'The 3 most common mistakes students make on this chapter in exams.',
          'High-probability question patterns from past 5 years of exam papers.',
          'Mnemonics and quick mental checkpoints for exam day.',
        ],
        commonTraps: 'Read questions carefully to see if the examiner is asking for "true" vs "false" statements.',
        video: {
          title: `${chapterName} Most Common Exam Mistakes`,
          channel: 'Exam Master / Bozeman Science',
          duration: '9 min',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(chapterName + ' exam questions and common mistakes')}`,
          description: `Past exam analysis revealing what examiners look for in top-scoring answers.`,
          badgeColor: 'bg-amber-600',
        },
      },
    ],
  };
}
