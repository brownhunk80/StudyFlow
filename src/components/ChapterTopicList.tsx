import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  BookOpen,
  RotateCcw,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  ListTodo,
} from 'lucide-react';
import { ChapterTopicItem, TopicStatus } from '../types';

interface ChapterTopicListProps {
  topics: ChapterTopicItem[];
  chapterName: string;
  selectedTopicId?: string | null;
  onSelectTopic?: (topicId: string) => void;
  onAddTopic?: (title: string, summary?: string) => void;
  onUpdateTopic?: (updatedTopic: ChapterTopicItem) => void;
  onDeleteTopic?: (topicId: string) => void;
  onReorderTopics?: (reorderedTopics: ChapterTopicItem[]) => void;
  onStartStudyTopic?: (topic: ChapterTopicItem) => void;
  onStartRevisionTopic?: (topic: ChapterTopicItem) => void;
  onStartUpdateNotesTopic?: (topic: ChapterTopicItem) => void;
  onAutoExtractTopics?: () => void;
  isExtracting?: boolean;
}

export const ChapterTopicList: React.FC<ChapterTopicListProps> = ({
  topics = [],
  chapterName,
  selectedTopicId,
  onSelectTopic,
  onAddTopic,
  onUpdateTopic,
  onDeleteTopic,
  onReorderTopics,
  onStartStudyTopic,
  onStartRevisionTopic,
  onStartUpdateNotesTopic,
  onAutoExtractTopics,
  isExtracting = false,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');

  // Editing state
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editEstimatedMinutes, setEditEstimatedMinutes] = useState<number>(15);

  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  const handleStartEdit = (topic: ChapterTopicItem) => {
    setEditingTopicId(topic.id);
    setEditTitle(topic.title);
    setEditSummary(topic.summary || '');
    setEditEstimatedMinutes(topic.estimatedMinutes || 15);
  };

  const handleSaveEdit = (topic: ChapterTopicItem) => {
    if (!editTitle.trim()) return;
    if (onUpdateTopic) {
      onUpdateTopic({
        ...topic,
        title: editTitle.trim(),
        summary: editSummary.trim() || undefined,
        estimatedMinutes: Number(editEstimatedMinutes) || 15,
      });
    }
    setEditingTopicId(null);
  };

  const handleCancelEdit = () => {
    setEditingTopicId(null);
  };

  const handleAddNewTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (onAddTopic) {
      onAddTopic(newTitle.trim(), newSummary.trim() || undefined);
    }
    setNewTitle('');
    setNewSummary('');
    setIsAdding(false);
  };

  const handleStatusChange = (topic: ChapterTopicItem, newStatus: TopicStatus) => {
    if (onUpdateTopic) {
      onUpdateTopic({
        ...topic,
        status: newStatus,
        lastRevised: newStatus === 'completed' ? new Date().toISOString() : topic.lastRevised,
      });
    }
  };

  const moveTopic = (idx: number, direction: 'up' | 'down') => {
    if (!onReorderTopics) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= topics.length) return;
    const newTopics = [...topics];
    const temp = newTopics[idx];
    newTopics[idx] = newTopics[targetIdx];
    newTopics[targetIdx] = temp;
    // update orderIndex
    const reordered = newTopics.map((t, i) => ({ ...t, orderIndex: i + 1 }));
    onReorderTopics(reordered);
  };

  // Status badge styling
  const getStatusBadge = (status: TopicStatus) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Mastered',
          badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300/40',
          dotClass: 'bg-emerald-500',
        };
      case 'revision_needed':
        return {
          label: 'Revision Due',
          badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300/40',
          dotClass: 'bg-amber-500 animate-pulse',
        };
      case 'in_progress':
        return {
          label: 'In Progress',
          badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300/40',
          dotClass: 'bg-indigo-500',
        };
      case 'not_started':
      default:
        return {
          label: 'Not Started',
          badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300/40',
          dotClass: 'bg-slate-400',
        };
    }
  };

  // Calculate progress stats
  const completedCount = topics.filter((t) => t.status === 'completed').length;
  const inProgressCount = topics.filter((t) => t.status === 'in_progress').length;
  const revisionCount = topics.filter((t) => t.status === 'revision_needed').length;
  const percentComplete = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

  return (
    <div
      id={`chapter-topics-section-${chapterName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4"
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              LEARNING BREAKDOWN
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Chapter Topics</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {topics.length} Concepts
              </span>
            </h3>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {onAutoExtractTopics && (
            <button
              id="btn-trigger-topic-extract"
              type="button"
              onClick={onAutoExtractTopics}
              disabled={isExtracting}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isExtracting ? 'Extracting...' : 'AI Topic Extraction'}</span>
            </button>
          )}

          <button
            id="btn-add-topic-manually"
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAdding ? 'Close' : 'Add Topic'}</span>
          </button>
        </div>
      </div>

      {/* Progress mini-bar */}
      {topics.length > 0 && (
        <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Topic Mastery Progress: {percentComplete}%
            </span>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                {completedCount} Mastered
              </span>
              {revisionCount > 0 && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  {revisionCount} Recall Due
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" />
                {topics.length - completedCount - revisionCount} Remaining
              </span>
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      )}

      {/* Add New Topic Form */}
      {isAdding && (
        <form
          onSubmit={handleAddNewTopic}
          className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-3"
        >
          <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Add Meaningful Chapter Topic / Sub-topic</span>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Image Formation by Concave Mirrors, Snell's Law"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <textarea
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder="Optional summary or key principles contained in this topic..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              Save Topic
            </button>
          </div>
        </form>
      )}

      {/* Topics list */}
      {topics.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <ListTodo className="w-5 h-5" />
          </div>
          <div className="max-w-md mx-auto">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              No topics mapped for this chapter yet
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Extract topics directly from chapter content or uploaded book pages to enable focused, granular Study → Revision → Notes sessions.
            </p>
          </div>
          {onAutoExtractTopics && (
            <button
              type="button"
              onClick={onAutoExtractTopics}
              disabled={isExtracting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isExtracting ? 'Analyzing Content...' : 'Extract Topics with AI'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {topics.map((topic, idx) => {
            const isSelected = selectedTopicId === topic.id;
            const isEditing = editingTopicId === topic.id;
            const isExpanded = expandedTopicId === topic.id;
            const statusConfig = getStatusBadge(topic.status);

            return (
              <div
                key={topic.id || `topic-row-${idx}`}
                className={`rounded-xl border transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-xs'
                    : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                {/* Main topic header row */}
                <div className="p-3 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                    {/* Index tag & reorder buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-[11px] flex items-center justify-center">
                        {idx + 1}
                      </div>
                      {onReorderTopics && (
                        <div className="flex flex-col -space-y-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveTopic(idx, 'up')}
                            className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-20 cursor-pointer"
                            title="Move topic up"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === topics.length - 1}
                            onClick={() => moveTopic(idx, 'down')}
                            className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-20 cursor-pointer"
                            title="Move topic down"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Topic Title & Status */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectTopic) onSelectTopic(topic.id);
                            setExpandedTopicId(isExpanded ? null : topic.id);
                          }}
                          className="text-left font-bold text-xs text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer truncate"
                        >
                          {topic.title}
                        </button>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1.5 shrink-0 ${statusConfig.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Source reference or summary preview */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {topic.sourceReference && (
                          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[150px]">{topic.sourceReference}</span>
                          </span>
                        )}
                        {topic.estimatedMinutes && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{topic.estimatedMinutes}m</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick stage action triggers for this topic */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {onStartStudyTopic && (
                      <button
                        type="button"
                        onClick={() => onStartStudyTopic(topic)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                        title="Study this topic"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span className="hidden sm:inline">Study</span>
                      </button>
                    )}

                    {onStartRevisionTopic && (
                      <button
                        type="button"
                        onClick={() => onStartRevisionTopic(topic)}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                        title="Revise this topic"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span className="hidden sm:inline">Revise</span>
                      </button>
                    )}

                    {onStartUpdateNotesTopic && (
                      <button
                        type="button"
                        onClick={() => onStartUpdateNotesTopic(topic)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer"
                        title="Update notes for this topic"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Notes</span>
                      </button>
                    )}

                    {/* Status dropdown/cycle */}
                    <button
                      type="button"
                      onClick={() => {
                        const nextStatus: Record<TopicStatus, TopicStatus> = {
                          not_started: 'in_progress',
                          in_progress: 'completed',
                          completed: 'revision_needed',
                          revision_needed: 'completed',
                        };
                        handleStatusChange(topic, nextStatus[topic.status]);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition cursor-pointer"
                      title="Cycle Topic Status"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(topic)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition cursor-pointer"
                      title="Edit Topic"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button */}
                    {onDeleteTopic && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove topic "${topic.title}"?`)) {
                            onDeleteTopic(topic.id);
                          }
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="Delete Topic"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Expand/collapse button */}
                    <button
                      type="button"
                      onClick={() => setExpandedTopicId(isExpanded ? null : topic.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Inline edit form */}
                {isEditing && (
                  <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-b-xl space-y-2">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Edit Topic Details</div>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Topic Title"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                    <textarea
                      value={editSummary}
                      onChange={(e) => setEditSummary(e.target.value)}
                      placeholder="Topic Summary / Key Principles"
                      rows={2}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Est. Minutes:</span>
                        <input
                          type="number"
                          value={editEstimatedMinutes}
                          onChange={(e) => setEditEstimatedMinutes(Number(e.target.value))}
                          className="w-16 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                          min={5}
                          max={120}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-2.5 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(topic)}
                          className="px-3 py-1 rounded bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expanded details view */}
                {!isEditing && isExpanded && (
                  <div className="p-3.5 border-t border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 rounded-b-xl space-y-2 text-xs">
                    {topic.summary && (
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Concept Summary:
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5">
                          {topic.summary}
                        </p>
                      </div>
                    )}

                    {topic.sourceReference && (
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                        Grounding Source: {topic.sourceReference}
                      </div>
                    )}

                    {topic.lastRevised && (
                      <div className="text-[11px] text-slate-400">
                        Last Revised: {new Date(topic.lastRevised).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
