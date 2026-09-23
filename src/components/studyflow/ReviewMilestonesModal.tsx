import React, { useState } from 'react';
import {
  CheckCircle2,
  X,
  FileText,
  Plus,
  Trash2,
  Edit3,
  BookOpen,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
} from 'lucide-react';
import type { DocumentMilestoneItem } from '../../types';

interface ReviewMilestonesModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterName: string;
  documentName?: string;
  initialMilestones: DocumentMilestoneItem[];
  onApprove: (approvedMilestones: DocumentMilestoneItem[]) => void;
  onReextract?: () => void;
}

export const ReviewMilestonesModal: React.FC<ReviewMilestonesModalProps> = ({
  isOpen,
  onClose,
  chapterName,
  documentName,
  initialMilestones,
  onApprove,
  onReextract,
}) => {
  const [milestones, setMilestones] = useState<DocumentMilestoneItem[]>(initialMilestones);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expandedSummaryIndex, setExpandedSummaryIndex] = useState<number | null>(null);
  
  // Edit Form State
  const [editTitle, setEditTitle] = useState('');
  const [editPageRange, setEditPageRange] = useState('');
  const [editTopics, setEditTopics] = useState('');

  // Add Section State
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPageRange, setNewPageRange] = useState('');
  const [newTopics, setNewTopics] = useState('');

  // Synchronize when initialMilestones changes
  React.useEffect(() => {
    setMilestones(initialMilestones);
  }, [initialMilestones]);

  if (!isOpen) return null;

  const startEditing = (idx: number) => {
    const item = milestones[idx];
    setEditingIndex(idx);
    setEditTitle(item.title);
    setEditPageRange(item.sourcePageRange || `Pages ${idx * 3 + 1}–${(idx + 1) * 3}`);
    setEditTopics(item.coreTopics?.join(', ') || '');
  };

  const saveEditing = (idx: number) => {
    if (!editTitle.trim()) return;
    const updated = [...milestones];
    const topicsArray = editTopics
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    updated[idx] = {
      ...updated[idx],
      title: editTitle.trim(),
      milestoneTitle: editTitle.trim(),
      sourcePageRange: editPageRange.trim() || updated[idx].sourcePageRange,
      coreTopics: topicsArray.length > 0 ? topicsArray : updated[idx].coreTopics,
    };
    setMilestones(updated);
    setEditingIndex(null);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
  };

  const removeMilestone = (idx: number) => {
    if (milestones.length <= 1) {
      alert('A chapter requires at least one curriculum milestone.');
      return;
    }
    const filtered = milestones.filter((_, i) => i !== idx);
    // Renumber remaining
    const renumbered = filtered.map((m, newIdx) => ({
      ...m,
      milestoneNumber: newIdx + 1,
    }));
    setMilestones(renumbered);
  };

  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const topicsArray = newTopics
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const nextNumber = milestones.length + 1;
    const pageRange = newPageRange.trim() || `Pages ${(nextNumber - 1) * 3 + 1}–${nextNumber * 3}`;
    const cleanTitle = newTitle.trim();

    const newMilestone: DocumentMilestoneItem = {
      milestoneNumber: nextNumber,
      title: cleanTitle,
      milestoneTitle: cleanTitle,
      sourcePageRange: pageRange,
      sourceHeading: cleanTitle,
      summary: {
        compact: `• **Source Reference**: ${pageRange}\n• **Key Focus**: Core syllabus requirements for "${cleanTitle}".\n• Master the critical definitions and derivations presented in this section.`,
        detailed: `### ${cleanTitle}\n\n#### Section Overview (${pageRange})\nThis section addresses fundamental curriculum topics for ${chapterName}.\n\n#### Core Equations & Principles\n- Apply principles established in ${pageRange}.\n- Ensure units are converted and assumptions hold.`,
      },
      coreTopics: topicsArray.length > 0 ? topicsArray : [cleanTitle, 'Analytical Application', 'Exam Pitfalls'],
      checkLearning: [
        {
          question: `What is the primary concept established in "${cleanTitle}" (${pageRange})?`,
          options: [
            'Governing physical laws and boundary assumptions must be satisfied',
            'Arbitrary parameters without dimensional verification',
            'Dissipative processes in an unbounded system',
            'Strict asymptotic limits at infinity',
          ],
          correctIndex: 0,
          explanation: `Directly derived from the syllabus requirements for ${cleanTitle}.`,
          misdirectionBreakdown: 'Distractors represent common conceptual errors violating fundamental boundary constraints.',
          correctAnswer: 'Governing physical laws and boundary assumptions must be satisfied',
        },
      ],
      recallDeck: [
        {
          front: `Define the core principle of ${cleanTitle}.`,
          back: `The fundamental relation and conditions established in ${pageRange}.`,
          sourceExcerpt: `Direct from ${pageRange}`,
        },
        {
          front: `What common trap should students avoid in ${cleanTitle}?`,
          back: `Applying formulas outside their domain of validity or omitting standard unit conversions.`,
          sourceExcerpt: `Direct from ${pageRange}`,
        },
      ],
      recallCards: [
        {
          front: `Define the core principle of ${cleanTitle}.`,
          back: `The fundamental relation and conditions established in ${pageRange}.`,
        },
      ],
      checkLearningQuestions: [
        {
          question: `What is the primary concept established in "${cleanTitle}" (${pageRange})?`,
          options: [
            'Governing physical laws and boundary assumptions must be satisfied',
            'Arbitrary parameters without dimensional verification',
            'Dissipative processes in an unbounded system',
            'Strict asymptotic limits at infinity',
          ],
          correctIndex: 0,
          explanation: `Directly derived from the syllabus requirements for ${cleanTitle}.`,
          correctAnswer: 'Governing physical laws and boundary assumptions must be satisfied',
        },
      ],
    };

    setMilestones([...milestones, newMilestone]);
    setNewTitle('');
    setNewPageRange('');
    setNewTopics('');
    setIsAddingSection(false);
  };

  const handleApprove = () => {
    onApprove(milestones);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Review Extracted Curriculum
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {milestones.length} Milestones Detected
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verify the sections extracted from your source material before building the study roadmap for{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-200">{chapterName}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onReextract && (
              <button
                type="button"
                onClick={onReextract}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Re-run extraction from the source document"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Re-extract
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Context Chip Bar */}
        <div className="px-6 py-2.5 bg-slate-100/60 dark:bg-slate-800/20 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            <span>Source:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-xs">
              {documentName || 'Attached Document'}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 dark:text-slate-400">
              Strictly grounded in source text & headings
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingSection(true)}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Missing Section
          </button>
        </div>

        {/* Milestone List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Add Section Inline Drawer */}
          {isAddingSection && (
            <form
              onSubmit={handleAddSection}
              className="p-4 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Curriculum Milestone
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingSection(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Section / Topic Title *
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Section 1.3: Newton's Third Law & Momentum Conservation"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Source Reference (Pages)
                  </label>
                  <input
                    type="text"
                    value={newPageRange}
                    onChange={(e) => setNewPageRange(e.target.value)}
                    placeholder="e.g. Pages 14–18"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Core Sub-Topics (comma-separated)
                </label>
                <input
                  type="text"
                  value={newTopics}
                  onChange={(e) => setNewTopics(e.target.value)}
                  placeholder="e.g. Action-Reaction Pairs, Isolated Systems, Elastic Collisions"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingSection(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm"
                >
                  Insert Section
                </button>
              </div>
            </form>
          )}

          {/* Render Milestone Cards */}
          {milestones.map((m, idx) => {
            const isEditing = editingIndex === idx;
            const isSummaryExpanded = expandedSummaryIndex === idx;
            const cardCount = m.recallDeck?.length || m.recallCards?.length || 0;
            const quizCount = m.checkLearning?.length || m.checkLearningQuestions?.length || 0;

            return (
              <div
                key={`milestone-preview-${idx}`}
                className={`p-4 rounded-xl border transition-all ${
                  isEditing
                    ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {isEditing ? (
                  /* Inline Edit Form */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        Editing Milestone {idx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => saveEditing(idx)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 rounded-md"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Section Title
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Page Range
                        </label>
                        <input
                          type="text"
                          value={editPageRange}
                          onChange={(e) => setEditPageRange(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Core Topics (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={editTopics}
                        onChange={(e) => setEditTopics(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ) : (
                  /* Standard Milestone Item View */
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                          {String(m.milestoneNumber || idx + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {m.title || m.milestoneTitle}
                            </h3>
                            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              {m.sourcePageRange || `Pages ${idx * 3 + 1}–${(idx + 1) * 3}`}
                            </span>
                            {m.sourceHeading && m.sourceHeading !== m.title && (
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs" title={m.sourceHeading}>
                                Heading: &ldquo;{m.sourceHeading}&rdquo;
                              </span>
                            )}
                          </div>

                          {/* Core Topics Pills */}
                          {m.coreTopics && m.coreTopics.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {m.coreTopics.map((topic, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Item Quick Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditing(idx)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Title or Page Range"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMilestone(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Remove Milestone"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata strip & Summary Toggle */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          {cardCount} Recall Cards
                        </span>
                        <span>•</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {quizCount} Practice Drills
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedSummaryIndex(isSummaryExpanded ? null : idx)}
                        className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                      >
                        {isSummaryExpanded ? (
                          <>
                            Hide Summary <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            Preview Notes <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Expanded Summary Preview */}
                    {isSummaryExpanded && (
                      <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2 animate-in fade-in duration-150">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Compact Summary:</span>
                        </div>
                        <div className="whitespace-pre-line text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                          {typeof m.summary === 'object' ? m.summary.compact : m.summary}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer / Primary CTA */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {milestones.length} curriculum sections ready
            </span>{' '}
            to build your dynamic Roadmap with active Recall Decks.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApprove}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-indigo-500/25 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve &amp; Build Roadmap
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
