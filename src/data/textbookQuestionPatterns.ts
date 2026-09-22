import { PracticeMode, PracticeQuestion, QuestionPatternMap } from '../types';

export function getQuestionPatternMap(chapterName: string, subject: string): QuestionPatternMap {
  const normChap = chapterName.toLowerCase();
  const normSub = subject.toLowerCase();

  if (normSub.includes('math')) {
    if (normChap.includes('linear') || normChap.includes('equation')) {
      return {
        chapterName,
        subject,
        corePatterns: [
          {
            id: 'pat-1',
            name: 'Direct Equation Solving & Transposition',
            description: 'Solving linear equations with variables on one or both sides using balanced inverse operations.',
            expectedAction: 'solve',
          },
          {
            id: 'pat-2',
            name: 'Equations Involving Brackets & Parentheses',
            description: 'Applying distributive law, grouping like terms, and resolving signs before transposition.',
            expectedAction: 'solve',
          },
          {
            id: 'pat-3',
            name: 'Fractional Equations & LCM Elimination',
            description: 'Multiplying through by common denominator to clear algebraic fractions without sign mistakes.',
            expectedAction: 'solve',
          },
          {
            id: 'pat-4',
            name: 'Real-World Word Problems & Modeling',
            description: 'Translating age, rate, perimeter, and coin scenarios into algebraic equations and solving.',
            expectedAction: 'calculate',
          },
          {
            id: 'pat-5',
            name: 'Error Analysis & Solution Verification',
            description: 'Detecting algebraic pitfalls (such as dropping minus signs during distribution or cross-multiplication).',
            expectedAction: 'explain',
          },
        ],
        textbookActivityTypes: ['Direct Exercise', 'Worked-Example Variation', 'Word Problem', 'Error Detection', 'Verification'],
      };
    }

    if (normChap.includes('quadratic')) {
      return {
        chapterName,
        subject,
        corePatterns: [
          {
            id: 'pat-quad-1',
            name: 'Factorisation by Splitting the Middle Term',
            description: 'Finding pairs with sum b and product ac to factorise into linear binomials.',
            expectedAction: 'solve',
          },
          {
            id: 'pat-quad-2',
            name: 'Quadratic Formula & Root Derivation',
            description: 'Applying x = (-b ± √(b² - 4ac)) / (2a) accurately without sign slips.',
            expectedAction: 'solve',
          },
          {
            id: 'pat-quad-3',
            name: 'Nature of Roots via Discriminant',
            description: 'Analyzing Δ = b² - 4ac (real & distinct, real & equal, or no real roots).',
            expectedAction: 'calculate',
          },
          {
            id: 'pat-quad-4',
            name: 'Geometric & Speed Word Problems',
            description: 'Formulating quadratic equations from speed-time-distance and rectangle dimensions.',
            expectedAction: 'calculate',
          },
        ],
        textbookActivityTypes: ['Exercise 4.1-4.4', 'Solved Examples', 'Discriminant Check', 'Word Problem Modeling'],
      };
    }

    // Generic Mathematics Pattern
    return {
      chapterName,
      subject,
      corePatterns: [
        {
          id: 'pat-math-1',
          name: 'Direct Practice with New Values',
          description: 'Executing core mathematical method with fresh numerical parameters.',
          expectedAction: 'solve',
        },
        {
          id: 'pat-math-2',
          name: 'Worked-Example Structure Variation',
          description: 'Preserving textbook example structure with contextual changes.',
          expectedAction: 'solve',
        },
        {
          id: 'pat-math-3',
          name: 'Applied Word Problems',
          description: 'Translating practical problem statements into mathematical operations.',
          expectedAction: 'calculate',
        },
        {
          id: 'pat-math-4',
          name: 'Error Analysis & Method Audit',
          description: 'Auditing incorrect student steps to diagnose algebraic and arithmetic slips.',
          expectedAction: 'explain',
        },
      ],
      textbookActivityTypes: ['Textbook Exercises', 'In-Chapter Activities', 'Solved Examples', 'Chapter-End Practice'],
    };
  }

  // Science Patterns (Physics / Chemistry / Biology)
  if (normChap.includes('light') || normChap.includes('mirror') || normChap.includes('reflection')) {
    return {
      chapterName,
      subject,
      corePatterns: [
        {
          id: 'pat-sci-1',
          name: 'Cartesian Sign Convention & Mirror Formula Calculations',
          description: 'Using 1/f = 1/v + 1/u and m = -v/u with strict negative/positive coordinate rules.',
          expectedAction: 'calculate',
        },
        {
          id: 'pat-sci-2',
          name: 'Ray Diagram Interpretation & Image Characteristics',
          description: 'Constructing rays parallel to axis and through C/F to identify real/virtual, inverted/erect images.',
          expectedAction: 'diagram',
        },
        {
          id: 'pat-sci-3',
          name: 'Experimental Setup & Variable Testing',
          description: 'Investigating focal length measurement using a distant object and illuminated screen.',
          expectedAction: 'experiment',
        },
        {
          id: 'pat-sci-4',
          name: 'Law of Reflection Applications & Angle Variations',
          description: 'Calculating reflection angles when incident rays or mirror orientations rotate.',
          expectedAction: 'solve',
        },
      ],
      textbookActivityTypes: ['Activity 10.1 (Concave Mirror Focus)', 'Activity 10.2 (Image Positions)', 'Numerical Solved Examples', 'Chapter-End In-Text Questions'],
    };
  }

  return {
    chapterName,
    subject,
    corePatterns: [
      {
        id: 'pat-gen-1',
        name: 'Concept Application & Mechanism',
        description: 'Explaining underlying physical, chemical, or logical principles in action.',
        expectedAction: 'explain',
      },
      {
        id: 'pat-gen-2',
        name: 'Quantitative & Numerical Calculations',
        description: 'Applying governing equations with verified standard units.',
        expectedAction: 'calculate',
      },
      {
        id: 'pat-gen-3',
        name: 'Experimental Observation & Inquiry',
        description: 'Interpreting observations, identifying variables, and drawing valid conclusions.',
        expectedAction: 'experiment',
      },
      {
        id: 'pat-gen-4',
        name: 'Common Mistake Audit & Reasoning',
        description: 'Differentiating confusing terms and spotting exam distractor traps.',
        expectedAction: 'solve',
      },
    ],
    textbookActivityTypes: ['Let\'s Explore', 'Think About It', 'Solved Examples', 'Exercise Questions'],
  };
}

export function getCuratedTextbookPractice(
  chapterName: string,
  subject: string,
  mode: PracticeMode = 'practice'
): PracticeQuestion[] {
  const normChap = chapterName.toLowerCase();
  const normSub = subject.toLowerCase();

  // 1. Mathematics: Linear Equations / Algebra
  if (normSub.includes('math') || normChap.includes('linear') || normChap.includes('equation')) {
    const questions: PracticeQuestion[] = [
      {
        id: 'math-lin-1',
        type: 'direct_practice',
        question: 'Solve for x:\n5x - 8 = 27',
        context: 'Textbook pattern: Direct transposition with integer coefficients.',
        correctAnswer: '7',
        stepByStepSolution: [
          'Step 1: Add 8 to both sides to isolate the variable term: 5x = 27 + 8',
          'Step 2: Simplify: 5x = 35',
          'Step 3: Divide both sides by 5: x = 35 / 5',
          'Step 4: Result: x = 7',
        ],
        conceptTested: 'Linear Equation Transposition',
        learningObjective: 'Master inverse operations to isolate a single unknown variable',
        commonMistake: 'Subtracting 8 instead of adding 8 when moving to the right side (getting 5x = 19)',
        difficulty: 'textbook_fundamentals',
        sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
        subject: 'Mathematics',
        practiceMode: mode,
        hint: 'Add 8 to both sides first, then divide by 5.',
      },
      {
        id: 'math-lin-2',
        type: 'worked_example_variation',
        question: 'Solve for x:\n4(2x - 3) - 3(x + 5) = 13',
        context: 'Textbook pattern: Expanding parentheses with negative distribution and combining like terms.',
        stepByStepSolution: [
          'Step 1: Expand brackets carefully: (8x - 12) - (3x + 15) = 13',
          'Step 2: Note the negative sign distribution: 8x - 12 - 3x - 15 = 13',
          'Step 3: Combine like terms on LHS: (8x - 3x) + (-12 - 15) = 13 => 5x - 27 = 13',
          'Step 4: Transpose -27: 5x = 13 + 27 = 40',
          'Step 5: Divide by 5: x = 40 / 5 = 8',
        ],
        correctAnswer: '8',
        conceptTested: 'Parentheses Expansion & Minus Distribution',
        learningObjective: 'Correctly distribute negative multipliers across parentheses before solving',
        commonMistake: 'Forgetting to distribute the negative sign to the second term inside: writing -3(x + 5) as -3x + 15 instead of -3x - 15',
        difficulty: 'standard_practice',
        sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
        subject: 'Mathematics',
        practiceMode: mode,
        hint: 'Remember: -3 multiplied by +5 gives -15, not +15!',
      },
      {
        id: 'math-lin-3',
        type: 'problem_solving',
        question: 'Solve for y:\n(2y + 5) / 3 - (y - 2) / 4 = 3',
        context: 'Textbook pattern: Fractional linear equations with LCM multiplication.',
        stepByStepSolution: [
          'Step 1: The LCM of denominators 3 and 4 is 12. Multiply every term by 12:',
          'Step 2: 12 * [(2y + 5) / 3] - 12 * [(y - 2) / 4] = 12 * 3',
          'Step 3: 4(2y + 5) - 3(y - 2) = 36',
          'Step 4: Expand terms: 8y + 20 - 3y + 6 = 36',
          'Step 5: Combine like terms: 5y + 26 = 36',
          'Step 6: Subtract 26 from both sides: 5y = 10',
          'Step 7: Divide by 5: y = 2',
        ],
        correctAnswer: '2',
        conceptTested: 'Fractional Equations & LCM Elimination',
        learningObjective: 'Clear fractions by multiplying by the LCM of denominators',
        commonMistake: 'Multiplying only the fractions by 12 while forgetting to multiply the RHS (3) by 12',
        difficulty: 'standard_practice',
        sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
        subject: 'Mathematics',
        practiceMode: mode,
        hint: 'Multiply all terms including the right hand side by the LCM (12).',
      },
      {
        id: 'math-lin-4',
        type: 'word_problem',
        question: 'The perimeter of a rectangular garden is 84 m. If its length is 6 m more than twice its breadth, find the length of the garden in metres.',
        context: 'Textbook pattern: Translating geometric word problems into single-variable linear models.',
        correctAnswer: '30',
        stepByStepSolution: [
          'Step 1: Let the breadth be b metres.',
          'Step 2: The length is 6 m more than twice breadth: Length l = 2b + 6.',
          'Step 3: Perimeter formula: P = 2(l + b) = 84',
          'Step 4: Substitute l: 2[(2b + 6) + b] = 84 => 2(3b + 6) = 84',
          'Step 5: Divide by 2: 3b + 6 = 42 => 3b = 36 => b = 12 m.',
          'Step 6: Calculate length: l = 2(12) + 6 = 24 + 6 = 30 m.',
        ],
        conceptTested: 'Geometric Modeling & Word Problem Formulation',
        learningObjective: 'Formulate algebraic equations from verbal geometric descriptions',
        commonMistake: 'Stopping after finding breadth (12) instead of calculating length (30) as requested by the question',
        difficulty: 'standard_practice',
        sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
        subject: 'Mathematics',
        practiceMode: mode,
        hint: 'Let breadth = b. Length = 2b + 6. Set up 2(length + breadth) = 84.',
      },
      {
        id: 'math-lin-5',
        type: 'error_analysis',
        question: 'A student attempted to solve the equation: 3(x - 4) = 5x + 8.\nTheir steps were:\nStep 1: 3x - 12 = 5x + 8\nStep 2: 3x - 5x = 8 - 12\nStep 3: -2x = -4\nStep 4: x = 2\n\nIdentify which step contains the error, and provide the correct value of x.',
        context: 'Textbook pattern: Identifying sign transposition mistakes in algebra.',
        correctAnswer: 'Step 2, x = -10',
        stepByStepSolution: [
          'Step 1 is correct: 3(x - 4) = 3x - 12.',
          'Step 2 contains the error: When moving -12 from LHS to RHS, its sign must become +12, not -12. It should read: 3x - 5x = 8 + 12.',
          'Correct calculation: -2x = 20',
          'Dividing by -2: x = 20 / (-2) = -10.',
        ],
        conceptTested: 'Algebraic Transposition & Sign Integrity',
        learningObjective: 'Audit algebraic solutions to detect inverse sign transposition slips',
        commonMistake: 'Failing to change the sign of -12 when moving across the equals sign',
        difficulty: 'standard_practice',
        sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
        subject: 'Mathematics',
        practiceMode: mode,
        hint: 'Look at the sign of 12 when it moved from the left side to the right side.',
      },
    ];

    if (mode === 'quick_recall') {
      return questions.slice(0, 5);
    }
    if (mode === 'challenge') {
      return [
        {
          id: 'math-lin-chal-1',
          type: 'problem_solving',
          question: 'A cyclist travels from Town A to Town B at a speed of 18 km/h. On the return journey along the same route, a headwind slows their speed to 12 km/h. If the entire round trip takes 5 hours, find the one-way distance between Town A and Town B in kilometres.',
          context: 'Textbook challenge pattern: Time-speed-distance rational equation modeling.',
          correctAnswer: '36',
          stepByStepSolution: [
            'Step 1: Let the one-way distance be d km.',
            'Step 2: Time taken outward: t1 = d / 18 hours.',
            'Step 3: Time taken return: t2 = d / 12 hours.',
            'Step 4: Total time: t1 + t2 = 5 => d/18 + d/12 = 5.',
            'Step 5: LCM of 18 and 12 is 36. Multiply equation by 36: 2d + 3d = 180.',
            'Step 6: 5d = 180 => d = 36 km.',
          ],
          conceptTested: 'Rate-Distance-Time Linear Modeling',
          learningObjective: 'Model two-way journey time constraints using algebraic fractions',
          commonMistake: 'Averaging the two speeds (15 km/h) and multiplying by 2.5 hours, which yields an incorrect physics formulation',
          difficulty: 'challenge',
          sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
          subject: 'Mathematics',
          practiceMode: mode,
          hint: 'Distance / 18 + Distance / 12 = 5. Multiply by LCM 36.',
        },
        ...questions.slice(1, 5),
      ];
    }

    return questions;
  }

  // 2. Science: Light – Reflection & Refraction
  if (normChap.includes('light') || normChap.includes('mirror') || normChap.includes('reflection')) {
    const questions: PracticeQuestion[] = [
      {
        id: 'sci-light-1',
        type: 'problem_solving',
        question: 'An object is placed at a distance of 30 cm in front of a concave mirror of focal length 20 cm. Using the mirror formula and Cartesian sign convention, find the image distance (v) in cm. (State only the numerical value with appropriate sign, e.g. -60).',
        context: 'Textbook pattern: Mirror formula calculation with Cartesian sign convention.',
        correctAnswer: '-60',
        stepByStepSolution: [
          'Step 1: Identify given quantities with Cartesian signs:',
          '  Focal length of concave mirror: f = -20 cm (concave mirror focus is in front)',
          '  Object distance: u = -30 cm (object is in front of mirror)',
          'Step 2: State Mirror Formula: 1/f = 1/v + 1/u',
          'Step 3: Rearrange for 1/v: 1/v = 1/f - 1/u',
          'Step 4: Substitute values: 1/v = 1/(-20) - 1/(-30) = -1/20 + 1/30',
          'Step 5: Find LCM of 20 and 30 (which is 60): 1/v = (-3 + 2) / 60 = -1/60',
          'Step 6: Invert to find v: v = -60 cm.',
          'Conclusion: The image is formed 60 cm in front of the mirror (real and inverted).',
        ],
        conceptTested: 'Mirror Formula & Cartesian Sign Convention',
        learningObjective: 'Calculate image position using correct negative signs for concave mirror parameters',
        commonMistake: 'Taking focal length f as positive (+20) or forgetting that subtracting a negative (-1/-30) turns into addition (+1/30)',
        difficulty: 'textbook_fundamentals',
        sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
        subject: 'Science',
        practiceMode: mode,
        hint: 'Use 1/f = 1/v + 1/u. Remember f = -20 and u = -30.',
      },
      {
        id: 'sci-light-2',
        type: 'diagram_based',
        question: 'An object AB is placed between the Center of Curvature (C) and Principal Focus (F) in front of a concave mirror.\n1. Where is the image formed?\n2. What is the nature (real/virtual) and relative size of the image?',
        context: 'Textbook pattern: Ray diagram construction rules and image characteristics.',
        correctAnswer: 'Beyond C, real, inverted, and magnified',
        stepByStepSolution: [
          'Step 1: Ray 1 travels parallel to the principal axis and after reflection passes through the Focus (F).',
          'Step 2: Ray 2 passes through the Center of Curvature (or through F) and reflects back parallel to the axis.',
          'Step 3: The reflected rays actually intersect at a point beyond C.',
          'Step 4: Image Characteristics: Formed beyond C; Real and inverted; Larger than the object (magnified, |m| > 1).',
        ],
        conceptTested: 'Ray Diagrams & Image Characteristics for Spherical Mirrors',
        learningObjective: 'Deduce image position and nature from object placement relative to C and F',
        commonMistake: 'Confusing this with object placed beyond C (which forms a diminished image between C and F)',
        difficulty: 'standard_practice',
        sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
        subject: 'Science',
        practiceMode: mode,
        hint: 'When object moves closer (between C and F), image moves farther away (beyond C) and gets bigger.',
      },
      {
        id: 'sci-light-3',
        type: 'experiment_activity',
        question: 'In a textbook laboratory activity (Activity 10.1), a student wants to determine the approximate focal length of a concave mirror.\n1. What distant object should they choose?\n2. Where should the white screen be positioned to measure the focal length?\n3. What safety precaution is strictly mandated?',
        context: 'Textbook Activity 10.1: Focusing distant sunlight or trees onto a paper screen.',
        correctAnswer: 'Distant tree or building; position screen until sharp image is formed; do not look directly at reflected sunlight',
        stepByStepSolution: [
          'Step 1: Direct the reflecting surface of the concave mirror towards a distant object such as a tree or building.',
          'Step 2: Parallel rays of light from a distant infinity source converge at the principal focus.',
          'Step 3: Move a white paper screen back and forth in front of the mirror until a sharp, distinct image is focused on the paper.',
          'Step 4: The distance between the mirror pole and the screen equals the approximate focal length.',
          'Step 5: Precaution: Never focus sunlight directly onto your eye or look directly at reflected sunlight, as intense converging rays cause retinal burns.',
        ],
        conceptTested: 'Measurement of Focal Length via Distant Object Method',
        learningObjective: 'Design and explain the practical experimental protocol for measuring mirror focal length',
        commonMistake: 'Placing the object close to the mirror rather than at optical infinity (distant object)',
        difficulty: 'standard_practice',
        sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
        subject: 'Science',
        practiceMode: mode,
        hint: 'Light rays from a distant object arrive parallel to the principal axis and converge at F.',
      },
      {
        id: 'sci-light-4',
        type: 'worked_example_variation',
        question: 'A convex mirror used as a rear-view mirror on an automobile has a radius of curvature of 4.0 m. If a bus is located at 6.0 m from this mirror, find the position of the image in metres. (Round to two decimal places).',
        context: 'Textbook Solved Example variation: Convex rear-view mirror calculation.',
        stepByStepSolution: [
          'Step 1: Radius of curvature R = +4.0 m (convex mirror center is behind the mirror).',
          'Step 2: Focal length f = R / 2 = +2.0 m.',
          'Step 3: Object distance u = -6.0 m.',
          'Step 4: Mirror formula: 1/v = 1/f - 1/u = 1/2.0 - 1/(-6.0) = 1/2 + 1/6.',
          'Step 5: LCM = 6: 1/v = (3 + 1) / 6 = 4/6 = 2/3.',
          'Step 6: v = 3/2 = +1.50 m.',
        ],
        correctAnswer: '1.50',
        conceptTested: 'Convex Mirror Imaging & Rear-View Properties',
        learningObjective: 'Calculate virtual image distances behind a diverging convex mirror',
        commonMistake: 'Taking focal length as negative for a convex mirror (convex mirror focal length is always positive)',
        difficulty: 'standard_practice',
        sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
        subject: 'Science',
        practiceMode: mode,
        hint: 'For convex mirror, f is POSITIVE (+2.0 m). u is NEGATIVE (-6.0 m).',
      },
      {
        id: 'sci-light-5',
        type: 'problem_solving',
        question: 'A ray of light traveling in air enters obliquely into water of refractive index 1.33. Does the light ray bend towards the normal or away from the normal, and why? If the speed of light in vacuum is 3 × 10⁸ m/s, calculate the speed of light in water in m/s (in scientific notation, e.g. 2.25 x 10^8).',
        context: 'Textbook in-text exercise: Refraction Snell\'s law and optical density.',
        correctAnswer: 'Towards the normal; 2.25 x 10^8',
        stepByStepSolution: [
          'Step 1: Water is optically denser than air (n_water = 1.33 > n_air ≈ 1.0).',
          'Step 2: When light passes from an optically rarer to a denser medium, it slows down and bends towards the normal.',
          'Step 3: Formula relating refractive index and speed: n = c / v_medium.',
          'Step 4: v_medium = c / n = (3.0 × 10⁸ m/s) / 1.333 = 2.25 × 10⁸ m/s.',
        ],
        conceptTested: 'Refraction, Optical Density & Wave Speed',
        learningObjective: 'Apply optical density rules and calculate speed of light in dielectric media',
        commonMistake: 'Confusing mass density with optical density, or multiplying speed of light by refractive index instead of dividing',
        difficulty: 'standard_practice',
        sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
        subject: 'Science',
        practiceMode: mode,
        hint: 'Rarer to denser -> bends TOWARDS normal. Speed = c / n.',
      },
    ];

    if (mode === 'quick_recall') {
      return questions.slice(0, 5);
    }
    return questions;
  }

  // 3. Science: Chemical Reactions & Equations
  if (normChap.includes('chemical') || normChap.includes('reaction')) {
    return [
      {
        id: 'sci-chem-1',
        type: 'problem_solving',
        question: 'Balance the following skeletal chemical equation:\nFe + H₂O → Fe₃O₄ + H₂\nProvide the integer coefficients in order separated by commas (e.g. 3, 4, 1, 4).',
        context: 'Textbook Section 1.1: Step-by-step balancing of chemical equations.',
        correctAnswer: '3, 4, 1, 4',
        stepByStepSolution: [
          'Step 1: Count atoms on both sides: Fe: 1 vs 3. H: 2 vs 2. O: 1 vs 4.',
          'Step 2: Balance Oxygen first: There are 4 Oxygen in Fe₃O₄, so place coefficient 4 in front of H₂O: Fe + 4H₂O → Fe₃O₄ + H₂.',
          'Step 3: Balance Hydrogen: Now LHS has 4 × 2 = 8 Hydrogen atoms. Place coefficient 4 in front of H₂ on RHS: Fe + 4H₂O → Fe₃O₄ + 4H₂.',
          'Step 4: Balance Iron: RHS has 3 Fe atoms. Place coefficient 3 in front of Fe on LHS: 3Fe + 4H₂O → Fe₃O₄ + 4H₂.',
          'Step 5: Verify all counts: Fe: 3 = 3; H: 8 = 8; O: 4 = 4. Balanced coefficients: 3, 4, 1, 4.',
        ],
        conceptTested: 'Conservation of Mass & Stoichiometric Balancing',
        learningObjective: 'Balance complex chemical equations without altering chemical formulas',
        commonMistake: 'Changing chemical subscripts (e.g. writing H₂O₄) instead of adjusting stoichiometric coefficients',
        difficulty: 'textbook_fundamentals',
        sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
        subject: 'Chemistry',
        practiceMode: mode,
        hint: 'Balance oxygen first by putting 4 in front of H2O, then balance H and Fe.',
      },
      {
        id: 'sci-chem-2',
        type: 'experiment_activity',
        question: 'In a textbook experiment (Activity 1.1), a magnesium ribbon is burnt in air using a pair of tongs.\n1. Why is the ribbon cleaned with sandpaper before burning?\n2. What is the color of the dazzling flame observed?\n3. Name the white powder formed and write its chemical formula.',
        context: 'Textbook Activity 1.1: Burning of Magnesium ribbon in air.',
        correctAnswer: 'To remove basic magnesium oxide protective layer; dazzling white flame; Magnesium oxide (MgO)',
        stepByStepSolution: [
          'Step 1: Magnesium ribbon is stored exposed to atmospheric air where it forms a protective passivation layer of basic magnesium oxide/carbonate.',
          'Step 2: Cleaning with sandpaper exposes pure magnesium metal so it can ignite smoothly.',
          'Step 3: Burning in air reacts with oxygen: 2Mg(s) + O₂(g) → 2MgO(s).',
          'Step 4: It burns with a characteristic dazzling white flame, depositing white magnesium oxide powder.',
        ],
        conceptTested: 'Passivation Layer Removal & Combination Reactions',
        learningObjective: 'Explain safety and chemical rationale behind textbook lab activities',
        commonMistake: 'Forgetting that sandpaper removes the oxide layer, or naming the gas rather than the solid white powder',
        difficulty: 'standard_practice',
        sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
        subject: 'Chemistry',
        practiceMode: mode,
        hint: 'Magnesium reacts with air to form a dull coating. Sandpaper scrapes this off.',
      },
      {
        id: 'sci-chem-3',
        type: 'worked_example_variation',
        question: 'Identify the substance oxidised and the substance reduced in the following reaction:\nCuO + H₂ → Cu + H₂O',
        context: 'Textbook Section 1.2.5: Redox reactions and oxygen transfer.',
        correctAnswer: 'H2 is oxidised, CuO is reduced',
        stepByStepSolution: [
          'Step 1: Oxidation is the gain of oxygen (or loss of electrons). H₂ gains oxygen to become H₂O, therefore H₂ is oxidised.',
          'Step 2: Reduction is the loss of oxygen (or gain of electrons). CuO loses oxygen to become Cu, therefore CuO is reduced.',
          'Step 3: Since oxidation and reduction occur simultaneously, this is a redox reaction.',
        ],
        conceptTested: 'Redox Reactions & Oxidation-Reduction Identification',
        learningObjective: 'Identify oxidised and reduced chemical species based on oxygen transfer',
        commonMistake: 'Saying Cu is reduced instead of specifying the reactant CuO that undergoes reduction',
        difficulty: 'standard_practice',
        sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
        subject: 'Chemistry',
        practiceMode: mode,
        hint: 'Look at which reactant gains oxygen (oxidised) and which loses oxygen (reduced).',
      },
    ];
  }

  // Fallback for any other chapter
  return [
    {
      id: `gen-prac-1`,
      type: 'direct_practice',
      question: `Apply the fundamental governing equation of ${chapterName} to calculate the principal outcome when standard initial conditions are doubled.`,
      context: `Textbook pattern: Direct parameter scaling and sensitivity test.`,
      correctAnswer: 'Doubles or quadruples depending on system order',
      stepByStepSolution: [
        `Step 1: State the primary relation for ${chapterName}.`,
        `Step 2: Set input x' = 2x.`,
        `Step 3: Evaluate response according to proportionality laws.`,
      ],
      conceptTested: 'Parameter Scaling & Fundamental Formulation',
      learningObjective: `Solve direct textbook numericals and check dimensional integrity in ${chapterName}`,
      commonMistake: 'Neglecting exponential powers or confusing additive changes with multiplicative scaling',
      difficulty: 'textbook_fundamentals',
      sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
      subject: subject || 'General',
      practiceMode: mode,
      hint: 'Recall the governing proportionality equation from your textbook chapter.',
    },
    {
      id: `gen-prac-2`,
      type: 'worked_example_variation',
      question: `A student measures the key boundary variables for ${chapterName} and records an error in initial condition. What corrective step must be applied to align the result with textbook theory?`,
      context: `Textbook pattern: Diagnostic problem solving and error control.`,
      correctAnswer: 'Re-calibrate zero reference and apply Cartesian sign conventions',
      stepByStepSolution: [
        `Step 1: Identify baseline reference point.`,
        `Step 2: Verify consistency of measurement units (SI standards).`,
        `Step 3: Adjust algebraic signs according to standard convention.`,
      ],
      conceptTested: 'Systematic Error Control & Boundary Validation',
      learningObjective: 'Diagnose and correct standard experimental and calculation discrepancies',
      commonMistake: 'Mixing gauge values with absolute scales',
      difficulty: 'standard_practice',
      sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
      subject: subject || 'General',
      practiceMode: mode,
      hint: 'Always verify units and zero-point calibration.',
    },
    {
      id: `gen-prac-3`,
      type: 'application',
      question: `Explain how the central mechanism of ${chapterName} operates in an everyday real-world engineering or biological device.`,
      context: `Textbook pattern: Practical technology and natural phenomenon application.`,
      correctAnswer: 'Energy conservation and directional flow matching governing equilibrium laws',
      stepByStepSolution: [
        `Step 1: State the governing mechanism in ${chapterName}.`,
        `Step 2: Map theoretical variables to components of the real device.`,
        `Step 3: Show how equilibrium and conservation maintain stable operation.`,
      ],
      conceptTested: 'Real-World Technical Application',
      learningObjective: 'Connect abstract classroom principles to practical systems',
      commonMistake: 'Focusing on superficial cosmetic features rather than physical mechanisms',
      difficulty: 'standard_practice',
      sourceLabel: `Textbook-style practice • Based on Chapter: ${chapterName}`,
      subject: subject || 'General',
      practiceMode: mode,
      hint: 'Connect the chapter formula directly to how the everyday device functions.',
    },
  ];
}

export function generateSimilarQuestionOffline(question: PracticeQuestion): PracticeQuestion {
  // Generates a similar question for "Try a Similar Question" testing the exact same learning objective
  if (question.id.includes('math-lin-1') || question.question.includes('5x - 8 = 27')) {
    return {
      ...question,
      id: `similar-${Date.now()}`,
      question: 'Solve for x:\n6x - 7 = 29',
      correctAnswer: '6',
      stepByStepSolution: [
        'Step 1: Add 7 to both sides: 6x = 29 + 7',
        'Step 2: 6x = 36',
        'Step 3: Divide both sides by 6: x = 36 / 6',
        'Step 4: x = 6',
      ],
      sourceLabel: `${question.sourceLabel} • Try a Similar Question`,
      hint: 'Add 7 to both sides first, then divide by 6.',
    };
  }

  if (question.id.includes('sci-light-1') || question.question.includes('concave mirror')) {
    return {
      ...question,
      id: `similar-${Date.now()}`,
      question: 'An object is placed at a distance of 20 cm in front of a concave mirror of focal length 15 cm. Using the mirror formula and Cartesian sign convention, find the image distance (v) in cm. (State only the numerical value with appropriate sign, e.g. -60).',
      correctAnswer: '-60',
      stepByStepSolution: [
        'Step 1: Given: f = -15 cm, u = -20 cm.',
        'Step 2: Mirror formula: 1/v = 1/f - 1/u = 1/(-15) - 1/(-20) = -1/15 + 1/20.',
        'Step 3: LCM of 15 and 20 is 60: 1/v = (-4 + 3) / 60 = -1/60.',
        'Step 4: Invert: v = -60 cm.',
      ],
      sourceLabel: `${question.sourceLabel} • Try a Similar Question`,
      hint: 'Use 1/f = 1/v + 1/u. f = -15, u = -20. Find LCM of 15 and 20.',
    };
  }

  // General variation
  return {
    ...question,
    id: `similar-${Date.now()}`,
    question: `${question.question} (Variation: Verify with alternative parameters)`,
    sourceLabel: `${question.sourceLabel} • Try a Similar Question`,
  };
}
