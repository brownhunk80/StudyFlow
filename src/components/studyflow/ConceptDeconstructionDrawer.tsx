import React, { useState } from 'react';
import {
  X,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Send,
  HelpCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { EnrichedQuizQuestion } from './SectionQuizModal';

interface ConceptDeconstructionDrawerProps {
  isOpen: boolean;
  question: EnrichedQuizQuestion;
  selectedAnswerIndex?: number;
  onClose: () => void;
}

export const ConceptDeconstructionDrawer: React.FC<ConceptDeconstructionDrawerProps> = ({
  isOpen,
  question,
  selectedAnswerIndex,
  onClose,
}) => {
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([]);

  if (!isOpen) return null;

  const correctLetter = String.fromCharCode(65 + question.correctIndex);
  const correctChoiceText = question.choices[question.correctIndex];

  const handleSendQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuery.trim()) return;

    const query = followUpQuery.trim();
    setFollowUpQuery('');

    // Generate intelligent pedagogical responses
    let responseText = '';
    const lower = query.toLowerCase();

    if (lower.includes('why') || lower.includes('reason') || lower.includes('explain')) {
      responseText = `The primary physical reason stems from the principle: "${question.explanation}". When analyzing "${question.topicTag}", always check whether the Cartesian sign convention or focal geometry restricts the boundary values.`;
    } else if (lower.includes('exam') || lower.includes('mistake') || lower.includes('trap')) {
      responseText = `Most exam candidates lose points here by failing to invert reciprocals (e.g. confusing 1/f with f) or swapping positive/negative signs for virtual vs real images. Always write given variables with signs before calculating.`;
    } else if (lower.includes('analogy') || lower.includes('simple') || lower.includes('intuitive')) {
      responseText = `Think of it like a spotlight vs a flat mirror: when rays converge into a focal point, any rays passing closer to the axis bend symmetrically. This means the principal axis acts like an optical anchor line.`;
    } else {
      responseText = `Regarding "${question.questionText}":\n\n• **Core Principle**: ${question.correctAnalysis}\n• **Quick Exam Rule**: For ${question.topicTag}, double check signs and paraxial assumptions before selecting.`;
    }

    setChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: query },
      { sender: 'ai', text: responseText },
    ]);
  };

  const handlePromptChipClick = (preset: string) => {
    setFollowUpQuery(preset);
  };

  return (
    <div
      id="concept-deconstruction-drawer"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
    >
      {/* Drawer Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              Concept Deconstruction
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
              {question.topicTag} • Detailed Breakdown
            </p>
          </div>
        </div>

        <button
          id="close-deconstruction-drawer-btn"
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs leading-relaxed">
        {/* Section 1: "Why the Correct Answer Works" */}
        <div
          id="section-why-correct-works"
          className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2.5 shadow-2xs"
        >
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black uppercase text-[11px] tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Section 1: Why the Correct Answer Works</span>
          </div>

          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-emerald-200/80 dark:border-emerald-800/80">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Option {correctLetter} (Correct Choice)
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
              {correctChoiceText}
            </div>
          </div>

          <p className="text-slate-700 dark:text-slate-300 font-normal leading-relaxed">
            {question.correctAnalysis || question.explanation}
          </p>
        </div>

        {/* Section 2: "Trap Analysis: Why Other Choices Are Incorrect" */}
        <div
          id="section-trap-analysis"
          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3 shadow-2xs"
        >
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-black uppercase text-[11px] tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Section 2: Trap Analysis: Why Other Choices Are Incorrect</span>
          </div>

          <div className="space-y-2.5">
            {question.choices.map((choiceText, cIdx) => {
              if (cIdx === question.correctIndex) return null;
              const optionLetter = String.fromCharCode(65 + cIdx);
              const isUserSelection = selectedAnswerIndex === cIdx;
              const distractorReason =
                question.distractorAnalyses?.[cIdx] ||
                `Choice ${optionLetter} fails the fundamental physical boundary constraints for ${question.topicTag}.`;

              return (
                <div
                  key={cIdx}
                  className={`p-3 rounded-xl border transition ${
                    isUserSelection
                      ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 ring-1 ring-rose-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-rose-600 dark:text-rose-400 text-xs flex items-center gap-1.5">
                      <span>Trap Option {optionLetter}</span>
                      {isUserSelection && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200">
                          Your Selected Choice
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1.5 italic">
                    "{choiceText}"
                  </div>

                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                    {distractorReason}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat History if user has asked follow-ups */}
        {chatMessages.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Clarification Discussion</span>
            </div>
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl whitespace-pre-line text-xs ${
                  msg.sender === 'user'
                    ? 'ml-auto bg-emerald-600 text-white font-medium max-w-[85%]'
                    : 'mr-auto bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 max-w-[90%]'
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preset Chips */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => handlePromptChipClick('Can you give me an intuitive real-world analogy?')}
          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
        >
          💡 Analogy
        </button>
        <button
          type="button"
          onClick={() => handlePromptChipClick('What are the most common exam mistakes on this?')}
          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
        >
          ⚠️ Exam Traps
        </button>
        <button
          type="button"
          onClick={() => handlePromptChipClick('How do I verify the signs step-by-step?')}
          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
        >
          📐 Sign Rules
        </button>
      </div>

      {/* Follow-up chat prompt: "Ask follow-up clarification..." */}
      <form
        onSubmit={handleSendQuery}
        className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 shrink-0"
      >
        <input
          id="follow-up-chat-input"
          type="text"
          value={followUpQuery}
          onChange={(e) => setFollowUpQuery(e.target.value)}
          placeholder="Ask follow-up clarification..."
          className="flex-1 text-xs p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
        />
        <button
          id="send-clarification-btn"
          type="submit"
          className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer shrink-0 shadow-xs"
          title="Send clarification"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
