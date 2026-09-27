# Concept Check Blurting & Section Understanding Evaluator

Integrates the active recall "Blurting" technique directly into Concept Check, allowing students to blurt out everything they remember about a section via text or voice dictation, which AI then rigorously evaluates against the actual section content to identify mastered concepts, knowledge gaps, and misconceptions.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during the interactive clarification interview:

- **Confirmed Input Method**: Rich text area with interactive voice dictation support (Web Speech API with live transcript capture and audio visualizer feedback).
- **Confirmed Evaluation Breakdown**: Comprehensive breakdown analyzing **Key Points Covered**, **Missed Concepts**, **Misconceptions & Pitfalls**, and an overarching **Coverage & Retention Score (0–100%)**.
- **Confirmed Placement**: Dedicated **Blurting Tab** positioned prominently alongside Checkpoints and Section Quiz within the Concept Check runner modal.

---

## 1. Overview & Core Concept

### What It Does
The **Blurting Method** is a cognitive science active recall strategy where a student reviews a section, closes their notes, and "blurts out" everything they remember from memory without looking. 

In this new Concept Check feature:
1. **Blurting Phase**: The student chooses a section and types or speaks their unfiltered understanding into an active recall canvas.
2. **AI Comparison & Grounding**: When submitted, the backend compares the student's blurt against the authentic text, key concepts, and summaries of that specific section using Gemini (`gemini-3.8-flash` with resilient multi-model fallbacks).
3. **Diagnostic Breakdown**: The student receives structured feedback:
   - **Retention & Coverage Score**: Percentage of the section's core syllabus covered.
   - **Accurately Recalled Points**: Validated concepts with citations/corroborations from the section.
   - **Omitted & Missed Concepts**: High-yield facts, formulas, or principles the student forgot to mention.
   - **Misconceptions & Pitfalls**: Inaccurate statements or flawed reasoning in the student's blurt corrected with canonical benchmark explanations.
   - **Next Best Action**: Tailored flashcard or checkpoint recommendations to close identified gaps.

### Target Audience & Persona
Students preparing for board exams, university finals, and competitive tests who need high-leverage active recall and self-diagnostic tools to find blind spots before taking formal quizzes.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Opening Concept Check**: Inside any chapter milestone/section, clicking "Concept Check" opens the full modal.
2. **Switching to Blurting Mode**: The top navigation features a tabbed selector: `Checkpoints (Step-by-Step)` | `Brain Dump / Blurting (Active Recall)` | `Section Quiz`.
3. **Drafting the Blurt**:
   - The student sees a clean focus workspace with the section title and key topic tags (without revealing the full text).
   - A single-click **Voice Dictation** button enables hands-free speaking with live waveform pulse and transcript appending.
   - Live word and character metrics with optional timer.
4. **Instant Semantic Analysis**:
   - Clicking **"Analyze My Blurt"** triggers Gemini analysis with an animated progress state showing grounded comparison steps.
5. **Interactive Diagnostic Report**:
   - **Score Badge**: Circular visual score meter (e.g. `82% Recall Coverage`) with color-coded status (`● High Mastery`, `▲ Gaps Identified`).
   - **Mastered Concepts Card**: Emerald badge list showing each recalled concept with an affirmative checkmark.
   - **Missed Points Card**: Amber list with expandable explanations of what was left out.
   - **Misconceptions & Fixes Card**: Rose/Coral card showing specific student claims vs. correct textbook reality.
   - **One-Click Flashcard Creator**: Option to convert missed points directly into custom flashcards.
6. **Persistence**: The evaluated blurt, score, and feedback are saved in `localStorage` under `milestone_blurt_${sectionId}` so the student can review previous attempts.

### Visual Identity & Theme
- **Color Palette**:
  - Dominant Neutral: `#FFFFFF` / dark `#0F172A`
  - Mastered / Covered: Emerald `#059669` / `#10B981`
  - Missed / Gaps: Amber `#D97706` / `#F59E0B`
  - Misconceptions: Coral `#DC2626` / `#EF4444`
  - Accent / Primary CTA: Indigo `#6366F1` / `#4F46E5`
- **Typography**: Clean, readable sans-serif (`Plus Jakarta Sans` / system UI font) with tabular figures for statistics and word counts.
- **Micro-Interactions**: Smooth accordion expansions for feedback categories, audio pulse ring when recording, and celebratory confetti on scores $\ge 80\%$.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Server-Side Gemini API Proxy**:
  - *Chosen Approach*: Create a dedicated endpoint `/api/checkpoints/evaluate-blurt` handled in `server.ts` utilizing `@google/genai` with `gemini-3.8-flash` and resilient fallback cascade.
  - *Why*: Protects API keys, guarantees strict JSON schema output parsing, and prevents client-side bundle bloat.
- **Decision 2: Web Speech API for Voice Dictation with Textarea Fallback**:
  - *Chosen Approach*: Use native `webkitSpeechRecognition` / `SpeechRecognition` in the browser with real-time transcript streaming into the textarea.
  - *Why*: Zero latency, instant feedback, no heavy audio file upload required, and full support for keyboard edits alongside voice.
- **Decision 3: Non-Destructive Multi-Tab Architecture**:
  - *Chosen Approach*: Embed the Blurting experience as a first-class tab in `MilestoneCheckpointsRunner` while keeping checkpoints and progress calculation unified.
  - *Why*: Seamless user experience without opening disconnected modal windows.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Concept Check Modal (MilestoneCheckpointsRunner)     │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ [🎯 Checkpoints]   [🧠 Blurting Active Recall]   [📝 Quiz]     │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                │                                       │
│          ┌─────────────────────┴─────────────────────┐                 │
│          ▼                                           ▼                 │
│  ┌───────────────────────────┐           ┌───────────────────────────┐ │
│  │   Blurt Input Workspace   │           │   Blurt Diagnostic Report │ │
│  │  - Rich Text Area         │   POST    │  - Coverage % Score       │ │
│  │  - Web Speech Dictation   │──────────►│  - Points Mastered (✓)    │ │
│  │  - Word Counter & Tips    │ /api/     │  - Points Missed (▲)      │ │
│  │  - "Analyze Blurt" Action │ evaluate- │  - Misconceptions (✕)     │ │
│  └───────────────────────────┘  blurt    │  - Add Missed to Cards    │ │
│                                          └───────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│               Backend: Express + @google/genai (server.ts)             │
│                                                                        │
│  Endpoint: POST /api/checkpoints/evaluate-blurt                        │
│  Model: gemini-3.8-flash (fallback: gemini-flash-latest)               │
│  Input: { chapterTitle, milestoneTitle, sectionExcerpt, studentBlurt } │
│  Output: Structured JSON schema with coverageScore, pointsCovered,    │
│          missedPoints, misconceptions, qualitativeSummary, nextSteps   │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Structures & State Model

```ts
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

export interface SavedBlurtSession {
  sectionId: string;
  studentBlurt: string;
  wordCount: number;
  result: BlurtEvaluationResult | null;
  timestamp: string;
}
```
