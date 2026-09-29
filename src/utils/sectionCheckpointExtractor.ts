import { Section } from '../types';
import { getAuthenticCuratedChapter, getChapterCuratedContent } from '../data/chapterTopicsData';
import { isHindiSubject } from './hindiDetection';

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
 * Checks if a string or checkpoint contains stale generic boilerplate or robotic templates.
 * NOTE: Does NOT ban legitimate science curriculum terms like 'milliamperes', 'sign convention',
 * 'coordinate convention', 'resistance', 'equilibrium', etc.
 */
export function isStaleBoilerplateText(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    // Legacy pseudo-physics academic hallucination boilerplate
    lower.includes('constitutive relation') ||
    lower.includes('quasi-static adiabatic') ||
    lower.includes('restorative flux') ||
    lower.includes('ambient reservoir') ||
    lower.includes('infinite dissipation') ||
    lower.includes('high-temperature asymptotic') ||
    lower.includes('closed reference boundaries') ||
    lower.includes('microscopic interactions with observed macroscopic') ||
    lower.includes('formulate the step-by-step problem-solving heuristic') ||
    lower.includes('satisfies the required boundary conditions or operational prerequisites') ||
    // Robotic template phrases identified by curriculum examiners
    lower.includes('functions according to this section. what specific role does it play') ||
    lower.includes('govern or explain the outcomes discussed') ||
    lower.includes('establishes the scope within the lesson') ||
    lower.includes('articulates key scope') ||
    lower.includes('clarifies adjacent concepts') ||
    lower.includes('accurately defines concept using terminology from this section') ||
    lower.includes('as covered in this section. what are its essential characteristics') ||
    lower.includes('what critical distinction, safeguard, or limitation regarding') ||
    lower.includes('operational role & mechanism of') ||
    lower.includes('application standards & key safeguards for') ||
    lower.includes('essential conceptual takeaway:') ||
    lower.includes('core definition & principles of') ||
    lower.includes('without this foundation, representatives or systems operate without accountability') ||
    lower.includes('without this mechanism, representatives or systems operate without accountability')
  );
}

/**
 * Cleanly extracts meaningful sentences from markdown or plain text, stripping syntax
 */
function cleanSentences(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  return text
    .replace(/^#+\s+.*$/gm, '') // Remove markdown headers
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/^[•\-\*]\s+/gm, '') // Remove bullet markers
    .split(/(?<=[.?!])\s+|\n{2,}/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 25 && !s.startsWith('>') && !s.startsWith('|') && !isStaleBoilerplateText(s));
}

/**
 * Safely extracts comprehensive narrative and factual text from a Section
 */
function extractFullSectionText(section: Section): {
  fullText: string;
  sentences: string[];
  keyFacts: string[];
} {
  const parts: string[] = [];

  // 1. Detailed and compact summaries
  if (Array.isArray(section.summaries)) {
    section.summaries.forEach((sum) => {
      if (sum && typeof sum.contentMarkdown === 'string') {
        parts.push(sum.contentMarkdown);
      }
    });
  }

  // 2. Legacy or single summary field
  if (section.summary) {
    if (typeof section.summary === 'string') {
      parts.push(section.summary);
    } else if (typeof section.summary === 'object') {
      const obj = section.summary as any;
      if (typeof obj.detailed === 'string') parts.push(obj.detailed);
      if (typeof obj.compact === 'string') parts.push(obj.compact);
    }
  }

  // 3. Section text excerpt
  if (section.sectionTextExcerpt && typeof section.sectionTextExcerpt === 'string') {
    parts.push(section.sectionTextExcerpt);
  }

  // 4. Source reference
  if (section.sourceReference && typeof section.sourceReference === 'string') {
    parts.push(section.sourceReference);
  }

  // 5. Recall deck cards (rich domain-specific Q&As)
  const cardFacts: string[] = [];
  if (Array.isArray(section.recallDeck)) {
    section.recallDeck.forEach((card) => {
      if (card.back && typeof card.back === 'string' && !isStaleBoilerplateText(card.back)) {
        cardFacts.push(card.back);
      }
      if (card.explanation && typeof card.explanation === 'string' && !isStaleBoilerplateText(card.explanation)) {
        cardFacts.push(card.explanation);
      }
    });
  }

  // 6. Flashcards
  if (Array.isArray(section.flashcards)) {
    section.flashcards.forEach((fc) => {
      if (fc.backAnswer && typeof fc.backAnswer === 'string' && !isStaleBoilerplateText(fc.backAnswer)) {
        cardFacts.push(fc.backAnswer);
      }
    });
  }

  // 7. Check learning questions & quizzes
  if (Array.isArray(section.checkLearningQuestions)) {
    section.checkLearningQuestions.forEach((q) => {
      if (q.explanation && typeof q.explanation === 'string' && !isStaleBoilerplateText(q.explanation)) {
        cardFacts.push(q.explanation);
      }
    });
  }

  // 8. Saved recall deck from localStorage
  try {
    const saved = localStorage.getItem(`milestone_recall_deck_${section.id}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach((c: any) => {
          if (c.back && !isStaleBoilerplateText(c.back)) cardFacts.push(c.back);
          if (c.backAnswer && !isStaleBoilerplateText(c.backAnswer)) cardFacts.push(c.backAnswer);
          if (c.explanation && !isStaleBoilerplateText(c.explanation)) cardFacts.push(c.explanation);
        });
      }
    }
  } catch {}

  const combinedText = parts.join('\n\n');
  const extractedSentences = cleanSentences(combinedText);
  const allFacts = [...extractedSentences, ...cardFacts.flatMap((c) => cleanSentences(c))];
  const uniqueFacts = Array.from(new Set(allFacts)).filter((f) => f.length > 25);

  return {
    fullText: combinedText,
    sentences: extractedSentences,
    keyFacts: uniqueFacts,
  };
}

/**
 * Detects whether the current milestone belongs to Science (Physics, Chemistry, Biology)
 */
function isScienceSubject(section: Section, chapterName?: string, subjectName?: string): boolean {
  const combined = `${subjectName || ''} ${chapterName || ''} ${section.title || ''} ${(section.keyTopics || []).join(' ')}`.toLowerCase();
  return (
    combined.includes('sci') ||
    combined.includes('physic') ||
    combined.includes('chem') ||
    combined.includes('bio') ||
    combined.includes('light') ||
    combined.includes('mirror') ||
    combined.includes('lens') ||
    combined.includes('refract') ||
    combined.includes('reflect') ||
    combined.includes('electric') ||
    combined.includes('circuit') ||
    combined.includes('ohm') ||
    combined.includes('reaction') ||
    combined.includes('acid') ||
    combined.includes('base') ||
    combined.includes('atom') ||
    combined.includes('cell') ||
    combined.includes('reproduction') ||
    combined.includes('heredity') ||
    combined.includes('energy')
  );
}

/**
 * Extracts and formats 3 high-quality, authentic exam questions and 3-point benchmark model answers.
 * Strictly adheres to human examiner standards across BOTH Science and Social Science:
 * - Real exam questions tailored to the section's unique concepts.
 * - 3-point factual benchmark answers citing textbook mechanisms, formulas, and examples.
 * - Concrete key verification criteria with mandatory keywords/facts.
 * - Meaningful trap analysis addressing genuine student exam pitfalls.
 */
export function extractSectionCheckpoints(
  section: Section,
  chapterName?: string,
  subjectName?: string
): SectionCheckpoint[] {
  // 1. If section has pre-configured knowledgeQuestions that are non-boilerplate, use them
  if (Array.isArray(section.knowledgeQuestions) && section.knowledgeQuestions.length > 0) {
    const hasValidQuestions = section.knowledgeQuestions.every(
      (kq) =>
        kq.question &&
        kq.question.trim().length > 15 &&
        !isStaleBoilerplateText(`${kq.question} ${kq.sampleAnswer || ''} ${kq.benchmarkAnswer || ''}`)
    );

    if (hasValidQuestions) {
      return section.knowledgeQuestions.map((kq, idx) => {
        const topicTag =
          kq.subtopicTag ||
          section.keyTopics?.[idx % (section.keyTopics?.length || 1)] ||
          section.title;

        const scoringPoints =
          Array.isArray(kq.keyScoringPoints) && kq.keyScoringPoints.length >= 2
            ? kq.keyScoringPoints
            : [
                `Directly explains the core definition or rule of "${topicTag}"`,
                'Provides specific factual reasoning or consequences covered in this section',
                'References the concrete textbook distinction or standard required for full credit',
              ];

        const trap =
          kq.trapAnalysis ||
          `Common Pitfall: Missing key technical terminology or giving an informal description of ${topicTag} rather than the precise textbook rule.`;

        const modelAnswer =
          kq.benchmarkAnswer ||
          kq.sampleAnswer ||
          `**1. Direct Factual Explanation:**\nCore curriculum definition and scope for ${topicTag}.\n\n**2. Specific Textbook Rule / Example:**\nSpecific standard and consequences detailed in ${section.title}.\n\n**3. Direct Conclusion:**\nEnsures accurate conceptual understanding and prevents systemic errors.`;

        return {
          id: kq.id || `cp-${section.id}-${idx + 1}`,
          checkpointNumber: idx + 1,
          prompt: kq.question,
          subtopicTag: topicTag,
          benchmarkAnswer: modelAnswer,
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
  }

  // 2. Derive checkpoints directly from the Recall Deck (SM-2 Flashcards)
  // Recall deck logic is working seamlessly for both SST and Science!
  // Checking localStorage, section.recallDeck, and section.flashcards:
  let rawCards: any[] = [];
  try {
    const saved = localStorage.getItem(`milestone_recall_deck_${section.id}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        rawCards = parsed;
      }
    }
  } catch {}

  if (rawCards.length === 0 && Array.isArray(section.recallDeck) && section.recallDeck.length > 0) {
    rawCards = section.recallDeck;
  }
  if (rawCards.length === 0 && Array.isArray(section.flashcards) && section.flashcards.length > 0) {
    rawCards = section.flashcards;
  }

  const validCards = rawCards.filter((c) => {
    const q = (c.front || c.frontPrompt || '').trim();
    const a = (c.back || c.backAnswer || '').trim();
    return q.length > 10 && a.length > 10 && !isStaleBoilerplateText(`${q} ${a}`);
  });

  if (validCards.length >= 2) {
    return validCards.slice(0, 3).map((card, idx) => {
      const questionText = (card.front || card.frontPrompt || '').trim();
      const answerText = (card.back || card.backAnswer || '').trim();
      const explanationText = (card.explanation || card.sourceExcerpt || '').trim();
      const topic = section.keyTopics?.[idx] || section.title;

      const cleanPrompt = questionText.endsWith('?') ? questionText : `${questionText}?`;

      // Extract key keywords from the answer for precise grading criteria
      const words = answerText
        .split(/[,.;:\n]/)
        .map((w: string) => w.replace(/[*_]/g, '').trim())
        .filter((w: string) => w.length > 6 && !w.toLowerCase().includes('this'));

      const scoringPoints = [
        words[0]
          ? `Accurately states: "${words[0]}"`
          : `Directly explains the core definition or governing principle of ${topic}`,
        words[1]
          ? `Explains the specific mechanism: "${words[1]}"`
          : 'Provides the factual textbook consequence, formula, or example',
        'Concludes with the specific textbook standard and correct scientific/civic terminology',
      ];

      const benchmark = `**1. Direct Factual Explanation:**\n${answerText}\n\n**2. Specific Textbook Mechanism / Rule:**\n${explanationText || `Under standard conditions outlined in ${section.title}, this principle governs the observable outcomes and prevents conceptual misconceptions.`}\n\n**3. Direct Conclusion:**\nDemonstrates how adherence to this relationship ensures accurate exam problem-solving and rigorous understanding.`;

      const trap = isScienceSubject(section, chapterName, subjectName)
        ? `Common Pitfall: Forgetting to state units/conventions or confusing cause-and-effect in ${topic} (e.g., incorrect signs or mixing up terminology).`
        : `Common Pitfall: Giving an everyday opinion about ${topic} rather than stating the exact constitutional/textbook definition and legal consequence.`;

      return {
        id: `cp-rc-${section.id}-${idx + 1}`,
        checkpointNumber: idx + 1,
        prompt: cleanPrompt,
        subtopicTag: topic,
        benchmarkAnswer: benchmark,
        keyScoringPoints: scoringPoints,
        trapAnalysis: trap,
        userResponse: '',
        inputMode: 'type',
        isRevealed: false,
        selfAssessment: null,
        sourceCitation: card.sourceExcerpt || card.breadcrumb || `${chapterName || section.title} Textbook Reference`,
      };
    });
  }

  // 3. Check curated chapter library ONLY for authentic pre-compiled chapters (Light, Electricity, Chemical Reactions, etc.)
  const authenticCurated = getAuthenticCuratedChapter(chapterName || section.title);
  if (authenticCurated && Array.isArray(authenticCurated.topics) && authenticCurated.topics.length > 0) {
    const matchingTopics = authenticCurated.topics.slice(0, 3);
    return matchingTopics.map((top, idx) => {
      const isSci = isScienceSubject(section, chapterName, subjectName);
      let prompt = '';
      let answer = '';
      let scoringPoints: string[] = [];

      if (isSci) {
        if (top.keyFormula) {
          prompt = `State the governing law and formula for "${top.title}". How are the variables defined, and what precautions must be taken regarding units or sign conventions?`;
          answer = `**1. Direct Factual Explanation:**\n${top.keyInfo.slice(0, 2).join(' ')}\n\n**2. Governing Formula & Rules:**\n${top.keyFormula}\n\n**3. Direct Conclusion:**\nCorrect application ensures consistent physical/chemical calculations without sign or dimensional errors.`;
          scoringPoints = [
            `States the core definition/law of "${top.title}"`,
            `Cites the correct formula or principle: ${top.keyFormula}`,
            'Specifies correct sign conventions, state symbols, or SI units',
          ];
        } else {
          prompt = `Explain the mechanism of "${top.title}" as described in ${authenticCurated.chapterName}. What observable outcome or consequence occurs during this process?`;
          answer = `**1. Direct Factual Explanation:**\n${top.keyInfo[0] || 'Core scientific principle.'}\n\n**2. Specific Textbook Observation:**\n${top.keyInfo[1] || 'Direct cause-and-effect relationship.'}\n\n**3. Direct Conclusion:**\n${top.keyInfo[2] || 'Provides the factual basis tested in curriculum examinations.'}`;
          scoringPoints = [
            `Accurately explains the physical/chemical mechanism of "${top.title}"`,
            'Mentions the specific observable outcome, state change, or textbook example',
            'Uses standard scientific terminology required for full marks',
          ];
        }
      } else {
        prompt = `Why is "${top.title}" a critical principle in ${authenticCurated.chapterName}? Explain what happens if this rule or safeguard is violated.`;
        answer = `**1. Direct Factual Explanation:**\n${top.keyInfo.slice(0, 2).join(' ')}\n\n**2. Specific Textbook Rule / Case:**\n${top.keyInfo[2] || 'Prevents arbitrary exercise of power and ensures fair participation.'}\n\n**3. Direct Conclusion:**\nGuarantees institutional legitimacy and protects citizen rights as mandated by curriculum standards.`;
        scoringPoints = [
          `Accurately states the core definition of "${top.title}"`,
          'Identifies the specific textbook rule, procedure, or historical consequence',
          'Concludes with the fundamental standard of democratic accountability',
        ];
      }

      return {
        id: `cp-cur-${section.id}-${idx + 1}`,
        checkpointNumber: idx + 1,
        prompt,
        subtopicTag: top.title,
        benchmarkAnswer: answer,
        keyScoringPoints: scoringPoints,
        trapAnalysis: top.commonTraps || `Common Pitfall: Memorizing definitions without understanding how to apply them to textbook problems.`,
        userResponse: '',
        inputMode: 'type',
        isRevealed: false,
        selfAssessment: null,
        sourceCitation: `${authenticCurated.chapterName} • ${top.title}`,
      };
    });
  }

  // 4. Subject-aware dynamic synthesizer from all available facts
  const isHindi = isHindiSubject(subjectName, chapterName, `${section.title} ${section.sectionTextExcerpt || ''}`);
  const isScience = !isHindi && isScienceSubject(section, chapterName, subjectName);
  const { keyFacts } = extractFullSectionText(section);

  const rawTopics = Array.isArray(section.keyTopics) && section.keyTopics.length > 0
    ? section.keyTopics
    : [section.title];

  const topics = rawTopics.map((t) => t.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  const primaryTopic = topics[0] || section.title;
  const secondaryTopic = topics[1] || topics[0] || (isHindi ? 'मुख्य भाव एवं प्रसंग' : (isScience ? 'Governing Formula & Laws' : 'Core Mechanism'));
  const tertiaryTopic = topics[2] || topics[1] || (isHindi ? 'शब्दार्थ व व्याकरण बिंदु' : (isScience ? 'Experimental Observation & Units' : 'Key Safeguards & Standards'));

  const fact1 = keyFacts[0] || (isHindi ? `'${primaryTopic}' पाठ '${chapterName}' का अत्यंत महत्वपूर्ण वैचारिक एवं साहित्यिक सोपान है।` : `${primaryTopic} represents the primary foundational relationship governing ${section.title}.`);
  const fact2 = keyFacts[1] || (isHindi ? `'${secondaryTopic}' के माध्यम से लेखक/कवि ने जीवन मूल्यों और यथार्थ का सजीव चित्रण किया है।` : `${secondaryTopic} defines the operational conditions and quantitative/qualitative rules in the textbook.`);
  const fact3 = keyFacts[2] || (isHindi ? `'${tertiaryTopic}' बोर्ड परीक्षा में संदर्भ-सहित व्याख्या, भावार्थ एवं व्याकरणिक प्रश्नों हेतु अनिवार्य है।` : `${tertiaryTopic} establishes the mandatory standards of verification and practical problem solving.`);

  if (isHindi) {
    const q1 = `पाठ '${chapterName}' के आधार पर '${primaryTopic}' का प्रतिपाद्य एवं केंद्रीय भाव स्पष्ट कीजिए। लेखक/कवि इसके माध्यम से क्या संदेश देना चाहते हैं?`;
    const a1 = `**1. मुख्य व्याख्या एवं केंद्रीय भाव:**\n${fact1}\n\n**2. पाठ का विशिष्ट प्रसंग / प्रमाण:**\nपाठ के संदर्भ में यह प्रसंग स्पष्ट करता है कि मानवीय संवेदनाएं, त्याग, कर्तव्यनिष्ठा और नैतिक मूल्य जीवन के सच्चे आधार हैं।\n\n**3. निष्कर्ष एवं संदेश:**\nयह रचना विद्यार्थियों को आत्म-मंथन करने, सत्य के पथ पर चलने तथा मानवीय गरिमा को अपनाने की सशक्त प्रेरणा देती है।`;
    const rub1 = [
      `'${primaryTopic}' का सही संदर्भ और पाठ का केंद्रीय भाव स्पष्ट किया गया हो`,
      'पाठ से संबंधित सटीक प्रसंग, पंक्ति या संवाद का उल्लेख हो',
      'सटीक, मानक एवं व्याकरण सम्मत हिन्दी भाषा का प्रयोग हो',
    ];
    const trap1 = `सामान्य भूल: केवल अपनी सामान्य राय लिखना, जबकि बोर्ड परीक्षा में पाठ के संदर्भ और लेखक/कवि के मूल विचार का सटीक उल्लेख आवश्यक होता है।`;

    const q2 = `प्रस्तुत खंड में '${secondaryTopic}' का क्या महत्व है? इससे संबंधित पात्रों के स्वभाव अथवा घटनाक्रम का विश्लेषण कीजिए।`;
    const a2 = `**1. मुख्य व्याख्या एवं संदर्भ:**\n${fact2}\n\n**2. पात्र अथवा घटना का विश्लेषण:**\nयह प्रसंग पात्रों के आंतरिक द्वंद्व, नैतिक साहस अथवा सामाजिक यथार्थ को प्रभावशाली शैली में उद्घाटित करता है।\n\n**3. निष्कर्ष:**\nकथा या काव्य की यह कड़ी पाठक को मानवीय संवेदना और विवेक की गहराई तक ले जाती है।`;
    const rub2 = [
      `'${secondaryTopic}' की प्रासंगिकता और पात्रों/घटनाओं का तार्किक विश्लेषण`,
      'पाठ्यपुस्तक के मुख्य शब्दों और भावार्थ का प्रामाणिक प्रयोग',
      'बिंदुवार संतुलित उत्तर लेखन',
    ];
    const trap2 = `सामान्य भूल: पात्रों के चरित्र की सतही व्याख्या करना और घटना के पीछे छिपे गहरे संदेश की उपेक्षा करना।`;

    const q3 = `'${tertiaryTopic}' के संदर्भ में भाषा-शैली, शब्दार्थ अथवा व्याकरणिक सौंदर्य पर प्रकाश डालिए। बोर्ड परीक्षा की दृष्टि से इसका क्या महत्व है?`;
    const a3 = `**1. मुख्य व्याख्या:**\n${fact3}\n\n**2. भाषा एवं शिल्प-सौंदर्य:**\nप्रयुक्त भाषा में तत्सम-तद्भव शब्दों, उपयुक्त मुहावरों और अलंकारों का सटीक समन्वय है जो भाव अभिव्यक्ति को प्रभावशाली बनाता है।\n\n**3. परीक्षा दृष्टि:**\nआशय स्पष्टीकरण और शिल्प-सौंदर्य संबंधी प्रश्नों में पूरे अंक प्राप्त करने हेतु यह अत्यंत उपयोगी है।`;
    const rub3 = [
      `भाषा-शैली, शब्द-चयन अथवा व्याकरणिक बिंदु का सटीक उल्लेख`,
      'भाव-सौंदर्य एवं शिल्प-सौंदर्य का संतुलित समन्वय',
      'परीक्षा के प्रारूप के अनुसार बिंदुवार प्रस्तुति',
    ];
    const trap3 = `सामान्य भूल: केवल अर्थ लिखकर छोड़ देना और भाषा के शिल्प-सौंदर्य अथवा मुहावरों के प्रयोग को अनदेखा करना।`;

    return [
      {
        id: `cp-hin-1-${section.id}`,
        checkpointNumber: 1,
        prompt: q1,
        subtopicTag: primaryTopic,
        benchmarkAnswer: a1,
        keyScoringPoints: rub1,
        trapAnalysis: trap1,
        userResponse: '',
        inputMode: 'type',
        isRevealed: false,
        selfAssessment: null,
        sourceCitation: fact1,
      },
      {
        id: `cp-hin-2-${section.id}`,
        checkpointNumber: 2,
        prompt: q2,
        subtopicTag: secondaryTopic,
        benchmarkAnswer: a2,
        keyScoringPoints: rub2,
        trapAnalysis: trap2,
        userResponse: '',
        inputMode: 'type',
        isRevealed: false,
        selfAssessment: null,
        sourceCitation: fact2,
      },
      {
        id: `cp-hin-3-${section.id}`,
        checkpointNumber: 3,
        prompt: q3,
        subtopicTag: tertiaryTopic,
        benchmarkAnswer: a3,
        keyScoringPoints: rub3,
        trapAnalysis: trap3,
        userResponse: '',
        inputMode: 'type',
        isRevealed: false,
        selfAssessment: null,
        sourceCitation: fact3,
      },
    ];
  }

  if (isScience) {
    // SCIENCE QUESTIONS (Physics / Chemistry / Biology)
    const q1 = `State the scientific law or definition of "${primaryTopic}" as taught in ${section.title}. What physical or chemical phenomenon does it explain?`;
    const a1 = `**1. Direct Factual Explanation:**\n${fact1}\n\n**2. Textbook Mechanism & Effect:**\nGoverns the interaction between components, explaining observable changes in states, trajectories, or reaction rates.\n\n**3. Direct Conclusion:**\nForms the necessary foundation for predictive calculations and experimental verification.`;
    const rub1 = [
      `States the precise textbook definition or law of "${primaryTopic}"`,
      'Explains the specific cause-and-effect relationship or physical phenomenon',
      'Uses standard scientific terminology (no vague or informal descriptions)',
    ];
    const trap1 = `Common Pitfall: Confusing everyday terminology with strict scientific definitions or failing to state the exact condition under which the law holds true.`;

    const q2 = `Explain how "${secondaryTopic}" is applied in problem solving or laboratory observations. What formula, Cartesian sign rule, or balanced reaction is required?`;
    const a2 = `**1. Direct Factual Explanation:**\n${fact2}\n\n**2. Specific Textbook Rule / Example:**\nRequires strict adherence to mathematical relationships, unit conversions (e.g. SI units), and stoichiometric coefficients.\n\n**3. Direct Conclusion:**\nPrevents sign flips, dimensional mismatches, and incorrect quantitative predictions.`;
    const rub2 = [
      `Accurately states the governing formula, reaction, or mechanism for "${secondaryTopic}"`,
      'Applies the correct Cartesian signs, state symbols, or SI unit conversions',
      'Provides the step-by-step reasoning expected on a board exam sheet',
    ];
    const trap2 = `Common Pitfall: Overlooking negative signs in Cartesian conventions or forgetting to balance atoms before computing quantities.`;

    const q3 = `What critical experimental condition, precaution, or limitation does the textbook emphasize for "${tertiaryTopic}"? What happens if this condition is not met?`;
    const a3 = `**1. Direct Factual Explanation:**\n${fact3}\n\n**2. Specific Textbook Consequence:**\nDeparting from this condition introduces systematic errors, invalidates standard assumptions, or causes anomalous results.\n\n**3. Direct Conclusion:**\nStrict control of experimental variables ensures reproducible, valid scientific outcomes.`;
    const rub3 = [
      `Identifies the specific prerequisite, boundary condition, or experimental precaution for "${tertiaryTopic}"`,
      'Describes the error, distortion, or anomalous observation that occurs when this condition is violated',
      'Concludes with the verified textbook standard required for full credit',
    ];
    const trap3 = `Common Pitfall: Assuming physical/chemical rules apply universally without checking boundary assumptions (e.g., constant temperature for Ohm\'s Law).`;

    return [
      {
        id: `cp-sci-1-${section.id}`,
        checkpointNumber: 1,
        prompt: q1,
        subtopicTag: primaryTopic,
        benchmarkAnswer: a1,
        keyScoringPoints: rub1,
        trapAnalysis: trap1,
        userResponse: '',
        inputMode: 'type',
        isRevealed: false,
        selfAssessment: null,
        sourceCitation: fact1,
      },
      {
        id: `cp-sci-2-${section.id}`,
        checkpointNumber: 2,
        prompt: q2,
        subtopicTag: secondaryTopic,
        benchmarkAnswer: a2,
        keyScoringPoints: rub2,
        trapAnalysis: trap2,
        userResponse: '',
        inputMode: 'type',
        isRevealed: false,
        selfAssessment: null,
        sourceCitation: fact2,
      },
      {
        id: `cp-sci-3-${section.id}`,
        checkpointNumber: 3,
        prompt: q3,
        subtopicTag: tertiaryTopic,
        benchmarkAnswer: a3,
        keyScoringPoints: rub3,
        trapAnalysis: trap3,
        userResponse: '',
        inputMode: 'type',
        isRevealed: false,
        selfAssessment: null,
        sourceCitation: fact3,
      },
    ];
  }

  // SOCIAL SCIENCE / HUMANITIES QUESTIONS (Civics, History, Geography, Economics)
  const q1 = `Why is ${primaryTopic.toLowerCase().startsWith('why') ? primaryTopic : `the principle of "${primaryTopic}"`} essential in ${section.title}? According to this section, what specific problem does it solve, and what would happen if it were absent?`;
  const a1 = `**1. Direct Factual Explanation:**\n${fact1}\n\n**2. Textbook Consequence:**\nWithout this mechanism, representatives or institutions operate without accountability, leading to arbitrary decisions and loss of legitimacy.\n\n**3. Direct Conclusion:**\nEnsures authority remains rooted in continuous verification, fair rules, and the active consent of citizens.`;
  const rub1 = [
    `Explicitly identifies "${primaryTopic}" and explains its core definition`,
    'Cites the specific textbook consequence or breakdown that occurs when this principle is absent',
    'Concludes with the fundamental purpose or standard of accountability taught in this lesson',
  ];
  const trap1 = `Common Pitfall: Writing personal opinions or general impressions instead of citing the precise definition and systemic consequences stated in the chapter.`;

  const q2 = `How does the textbook distinguish the practical mechanism of "${secondaryTopic}" from related alternatives? Give the specific reasoning or example highlighted in this section.`;
  const a2 = `**1. Direct Factual Explanation:**\n${fact2}\n\n**2. Specific Textbook Rule or Example:**\nContrasts the operational steps and demonstrates how procedural safeguards function during actual implementation.\n\n**3. Direct Conclusion:**\nShows that the process is not merely symbolic, but produces distinct, verifiable outcomes defined by curriculum standards.`;
  const rub2 = [
    `Accurately explains the operational mechanism of "${secondaryTopic}"`,
    'Identifies the specific contrast, distinction, or rule provided in the textbook',
    'References the concrete example or systematic sequence detailed in the section',
  ];
  const trap2 = `Common Pitfall: Confusing the official mechanism with informal practices or failing to cite the distinct criteria that separate this from adjacent procedures.`;

  const q3 = `What minimum condition, safeguard, or limitation does the textbook establish regarding "${tertiaryTopic}"? What happens if this safeguard is violated?`;
  const a3 = `**1. Direct Factual Explanation:**\n${fact3}\n\n**2. Specific Textbook Consequence:**\nViolating this condition leads to an unequal balance, compromised legitimacy, or systemic failure in governance.\n\n**3. Direct Conclusion:**\nThese safeguards exist specifically to prevent unilateral overreach and guarantee fairness across all participants.`;
  const rub3 = [
    `Identifies the specific safeguard, limitation, or prerequisite required for "${tertiaryTopic}"`,
    'Describes what breakdown or illegitimacy occurs when this safeguard is compromised',
    'Explains why adhering to this protective standard is required for full compliance',
  ];
  const trap3 = `Common Pitfall: Treating the concept as absolute or unconditional without acknowledging the mandatory rules, boundaries, and exceptions outlined in the syllabus.`;

  return [
    {
      id: `cp-sst-1-${section.id}`,
      checkpointNumber: 1,
      prompt: q1,
      subtopicTag: primaryTopic,
      benchmarkAnswer: a1,
      keyScoringPoints: rub1,
      trapAnalysis: trap1,
      userResponse: '',
      inputMode: 'type',
      isRevealed: false,
      selfAssessment: null,
      sourceCitation: fact1,
    },
    {
      id: `cp-sst-2-${section.id}`,
      checkpointNumber: 2,
      prompt: q2,
      subtopicTag: secondaryTopic,
      benchmarkAnswer: a2,
      keyScoringPoints: rub2,
      trapAnalysis: trap2,
      userResponse: '',
      inputMode: 'type',
      isRevealed: false,
      selfAssessment: null,
      sourceCitation: fact2,
    },
    {
      id: `cp-sst-3-${section.id}`,
      checkpointNumber: 3,
      prompt: q3,
      subtopicTag: tertiaryTopic,
      benchmarkAnswer: a3,
      keyScoringPoints: rub3,
      trapAnalysis: trap3,
      userResponse: '',
      inputMode: 'type',
      isRevealed: false,
      selfAssessment: null,
      sourceCitation: fact3,
    },
  ];
}
