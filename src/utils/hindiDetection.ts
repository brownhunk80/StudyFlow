/**
 * Hindi Subject & Content Detection Utility
 * Detects whether a subject, chapter, or document content pertains to Hindi
 * (CBSE/NCERT Hindi Course A / Course B, Kshitij, Kritika, Sparsh, Sanchayan, Vyakaran)
 */

export const isHindiSubject = (
  subjectName?: string,
  chapterName?: string,
  textSample?: string
): boolean => {
  const normSubj = (subjectName || '').toLowerCase().trim();
  const normChap = (chapterName || '').toLowerCase().trim();

  // 1. Direct subject keywords
  const hindiKeywords = [
    'hindi',
    'हिन्दी',
    'हिंदी',
    'kshitij',
    'क्षितिज',
    'kritika',
    'कृतिका',
    'sparsh',
    'स्पर्श',
    'sanchayan',
    'संचयन',
    'vyakaran',
    'व्याकरण',
    'hindi a',
    'hindi b',
    'hindi-a',
    'hindi-b',
    'hindi core',
    'hindi elective',
  ];

  if (hindiKeywords.some((kw) => normSubj.includes(kw))) {
    return true;
  }

  // 2. Check chapter name keywords
  if (hindiKeywords.some((kw) => normChap.includes(kw))) {
    return true;
  }

  // 3. Devanagari Unicode character presence: range [\u0900-\u097F]
  const devanagariRegex = /[\u0900-\u097F]/;

  if (devanagariRegex.test(subjectName || '')) {
    return true;
  }

  if (devanagariRegex.test(chapterName || '')) {
    return true;
  }

  // 4. Sample text check (if more than 5 Devanagari characters are present in sample)
  if (textSample) {
    const devanagariMatches = textSample.match(/[\u0900-\u097F]/g);
    if (devanagariMatches && devanagariMatches.length > 5) {
      return true;
    }
  }

  return false;
};

export const HINDI_STOP_WORDS = new Set([
  'और', 'तथा', 'एवं', 'या', 'कि', 'की', 'के', 'का', 'को', 'में', 'पर', 'से', 'ने', 'है', 'हैं', 'था', 'थी', 'थे',
  'होता', 'होती', 'होते', 'गया', 'गई', 'गए', 'कर', 'करके', 'दिया', 'लिया', 'हो', 'हुए', 'भी', 'तो', 'ही', 'यह',
  'वह', 'इन', 'उन', 'इस', 'उस', 'जिस', 'तिस', 'कहा', 'बोला', 'अपने', 'अपनी', 'अपना', 'द्वारा', 'लिए', 'सकते',
  'सकता', 'सकती', 'रहा', 'रही', 'रहे', 'जब', 'तब', 'अब', 'यहाँ', 'वहाँ', 'जहाँ', 'कहाँ', 'कैसे', 'कैसा', 'कैसी',
  'कौन', 'क्या', 'क्यों', 'कोई', 'कुछ', 'सब', 'सभी', 'हर', 'एक', 'दो', 'तीन', 'चार', 'पांच', 'बहुत', 'कम',
  'ज्यादा', 'जैसे', 'वैसे', 'तथापि', 'किन्तु', 'परन्तु', 'मगर', 'लेकिन', 'अतः', 'इसलिए', 'क्योंकि', 'मानो',
]);

/**
 * Extracts high-yield Devanagari Hindi phrases, character names, dialogues, and key topics from text.
 */
export function extractHindiKeyEntities(text: string, count: number = 8): string[] {
  if (!text) return [];

  const entities: string[] = [];

  // 1. Quoted dialogues or phrases: e.g. "..." or '...' or “...”
  const quotedRegex = /["'“‘]([\u0900-\u097F\s,!?।]{3,60})["'”’]/g;
  let qMatch;
  while ((qMatch = quotedRegex.exec(text)) !== null) {
    const clean = qMatch[1].trim();
    if (clean.length >= 4 && clean.split(/\s+/).length <= 6) {
      entities.push(clean);
    }
  }

  // 2. Character honorifics & dialogue markers: e.g. "हालदार साहब", "कैप्टन", "बाबूजी", "गोपियाँ", etc.
  const honorificRegex = /([\u0900-\u097F]{2,15}\s+(?:साहब|जी|भगत|दास|बाबू|महोदय|भैया|चाचा|काका|पंडित|मियां))/g;
  let hMatch;
  while ((hMatch = honorificRegex.exec(text)) !== null) {
    entities.push(hMatch[1].trim());
  }

  // 3. Significant compound words or frequent nouns (length >= 3, not in stop words)
  const words = text
    .replace(/[^\u0900-\u097F\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !HINDI_STOP_WORDS.has(w));

  const freqMap = new Map<string, number>();
  for (const w of words) {
    freqMap.set(w, (freqMap.get(w) || 0) + 1);
  }

  const frequentWords = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map((e) => e[0]);

  for (const w of frequentWords) {
    if (!entities.includes(w)) {
      entities.push(w);
    }
  }

  return Array.from(new Set(entities)).slice(0, count);
}

/**
 * Returns prompt directives for Gemini when working with Hindi chapters.
 * Enforces STRICT GROUNDING exclusively on the uploaded chapter text.
 */
export const getHindiPromptDirectives = (chapterName?: string): string => {
  return `
[CRITICAL HINDI LANGUAGE & STRICT TEXTUAL GROUNDING REQUIREMENT]
- Target Subject: Hindi (CBSE / NCERT Course A & Course B Curriculum).
- Mandatory Script: Standard Devanagari script (देवनागरी लिपि / शुद्ध हिन्दी).
- Do NOT output in English or Romanized Hindi (Hinglish). All titles, headings, summaries, explanations, questions, options, cues, and answers MUST be written completely in standard grammatical Hindi.
- STRICT GROUNDING ON UPLOADED TEXT ONLY:
  * You MUST extract and discuss the ACTUAL characters, actual plot events, actual stanzas, actual dialogue lines, and actual words present in the provided chapter text.
  * DO NOT output generic boilerplate templates (e.g. do NOT write vague lines like "पाठ के केंद्रीय भाव को समझना" or "कवि का जीवन परिचय" unless the uploaded text literally contains that biography).
  * Every summary bullet, Check Learning question, and flashcard MUST reference concrete details from the text (e.g. names of people/places, specific actions, exact lines from the poem/story, or specific grammar rules shown in the excerpt).
- Use clear, student-friendly, and academically rigorous Hindi terminology suitable for CBSE board examinations.
`;
};
