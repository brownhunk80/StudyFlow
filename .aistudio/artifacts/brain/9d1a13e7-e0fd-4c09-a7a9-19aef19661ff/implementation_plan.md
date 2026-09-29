# Fix Active Recall Missing Questions & Precision Math Mode

## Overview & Problem Diagnosis

When reviewing flashcards in **Today's Recall** (the primary Active Recall session modal from the main Recall tab), questions were frequently not showing up (rendering as a blank space) and regular conceptual questions were being forced into a mathematical calculation input with a symbol toolbar.

### Root Cause Analysis
1. **Field Naming Disconnect**: Recent changes to mathematical problem generation output cards with properties named `promptQuestion` and `problemStatement`. The `ActiveRecallSessionModal` strictly evaluated `{currentCard.front || (currentCard as any).question}`. When neither `front` nor `question` existed on the object, the prompt rendered as empty string.
2. **Sync Loss in `learnDeckSync.ts`**: The synchronizer that pools cards from chapter milestones into `Today's Recall` checked only `rc.frontPrompt || rc.front || rc.promptQuestion`. When cards had `problemStatement` or `prompt`, `frontText` became `""`. If `back` existed, the card was added with `front: ""` and showed up completely blank during practice.
3. **Aggressive Math Mode Hijack**: `isMathCard` in `ActiveRecallSessionModal` returned `true` if `cardObj.expectedAnswer` was defined (which was automatically set for all cards) or if the card text contained any digit or word like "physics" or "math". This replaced the standard active recall answer buttons and voice recording with an equation input and math symbol palette even for history, biology, or conceptual physics cards.
4. **Concept Check Overwrite**: In `MilestoneCheckpointsRunner`, detecting science or math forced `worked_example_fading` mode by default, which replaced authentic syllabus checkpoints with a hardcoded optics mirror formula scaffold.

---

## Proposed Changes

### 1. `src/components/ActiveRecallSessionModal.tsx`
- **Robust Multi-Field Prompt Extraction**:
  - Extract the question prompt using:
    `currentCard.front || cardObj.frontPrompt || cardObj.promptQuestion || cardObj.problemStatement || cardObj.question || cardObj.prompt || cardObj.questionText`
  - If all are empty, synthesize a clear, subject-grounded prompt:
    `"Recall the core concept and definition for ${cardObj.parentConcept || cardObj.milestoneTitle || currentCard.chapter || currentCard.subject || 'this topic'}."`
- **Robust Answer Extraction**:
  - Extract the model answer using:
    `currentCard.back || cardObj.backAnswer || cardObj.answer || cardObj.expectedAnswer || cardObj.inlineAnswer || cardObj.modelAnswer`
  - Fallback: `"Review the foundational notes and key principles for this topic."`
- **Precise Math Mode Scoping**:
  - Restrict `isMathCard` strictly to cards with:
    - `cardObj.cardType === 'math_problem'`, OR
    - `cardObj.isMathProblem === true`, OR
    - Explicit numerical problem phrasing (e.g. `/(?:calculate|compute|solve for|evaluate numerical|find the value of)\b/i.test(promptText)` accompanied by quantitative formula or parameter definitions, and not being a standard multiple-choice or qualitative question).
  - Ensure standard cards show the standard, clean active recall prompt, voice answering, and self-assessment controls.

### 2. `src/utils/learnDeckSync.ts`
- **Comprehensive Property Mapping**:
  - Update `extractLearnTabDecksAndCards` to extract `frontText` from `rc.frontPrompt || rc.front || rc.promptQuestion || rc.problemStatement || rc.question || rc.prompt || ''`.
  - Update `backText` from `rc.backAnswer || rc.back || rc.answer || rc.expectedAnswer || rc.inlineAnswer || ''`.
  - Add defensive prompt synthesis if `backText` is present but `frontText` is missing, ensuring no blank cards enter the `Flashcard[]` store.

### 3. `src/components/studyflow/MilestoneCheckpointsRunner.tsx`
- **Default to Standard Syllabus Checkpoints**:
  - Set default `activeEngineMode` to `'standard_checkpoints'` so students always see their chapter's actual syllabus checkpoints and rubric criteria, keeping Worked Example Fading accessible via the top toggle without overriding the main checkpoints.

### 4. `src/components/studyflow/MilestoneRecallDeckRunner.tsx`
- Ensure the same robust prompt extraction fallback exists for the Milestone Recall Deck runner so cards are guaranteed to render prompt statements clearly.

---

## Verification Plan

### Automated Verification
1. `compile_applet`: Verify successful compilation and TypeScript type checking.
2. `lint_applet`: Verify no linting or syntax errors.

### Manual Verification Steps
1. Navigate to the **Recall** tab on the main navigation.
2. Verify that **Today's Recall** displays total due items and estimated time.
3. Click **START RECALL** to launch the `ActiveRecallSessionModal`.
4. Verify that:
   - Every single flashcard displays a clear, legible question prompt (no blank text).
   - Conceptual and qualitative cards display standard active recall controls (Voice Answering, Reveal Answer, self-rating buttons 1-4).
   - Only explicit calculation problems display the quantitative math input field and symbol toolbar.
   - Revealing the answer shows the model textbook response and nuance notes without errors.
