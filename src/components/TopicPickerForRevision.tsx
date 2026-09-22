import React from 'react';
import { Chapter, ChapterTopicItem } from '../types';
import { Layers, AlertCircle, Upload, CheckCircle2, ChevronRight, Sigma, Target, Sparkles, BookOpen } from 'lucide-react';

export interface TopicPickerForRevisionProps {
  chapter: Chapter;
  selectedTopicId: string | null;
  onSelectTopic: (topic: ChapterTopicItem) => void;
  actionLabel?: string;
  mode?: 'recall' | 'test';
  onOpenUpload?: () => void;
  onStartRevision?: (topic: ChapterTopicItem) => void;
  isStarting?: boolean;
}

export const TopicPickerForRevision: React.FC<TopicPickerForRevisionProps> = ({
  chapter,
  selectedTopicId,
  onSelectTopic,
  actionLabel,
  mode = 'recall',
  onOpenUpload,
  onStartRevision,
  isStarting = false,
}) => {
  const topics = chapter.topics || [];
  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  const defaultActionLabel = actionLabel || (mode === 'recall' ? 'Start Active Recall' : 'Start Practice Test');

  // If chapter.topics is empty: show blocking card requiring upload
  if (topics.length === 0) {
    return (
      <div id="topic-picker-blocking-empty" className="p-8 max-w-xl mx-auto text-center bg-amber-50/70 border border-amber-200 rounded-2xl shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Topics Not Yet Extracted</h3>
        <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
          Topics not yet extracted. Upload chapter materials (textbook pages, lecture notes, syllabus PDF) to extract granular curriculum topics before revising.
        </p>
        {onOpenUpload ? (
          <button
            type="button"
            id="btn-open-materials-upload"
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Chapter Materials
          </button>
        ) : (
          <div className="text-xs text-amber-800 bg-amber-100/70 py-2 px-3 rounded-lg inline-block">
            Please add materials to {chapter.name} in the chapter settings to extract topics.
          </div>
        )}
      </div>
    );
  }

  return (
    <div id="topic-picker-container" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <Target className="w-3.5 h-3.5" />
            Step 1: Select Topic for Revision
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {mode === 'recall' ? 'Choose Topic to Recall' : 'Choose Topic to Test'}
          </h3>
          <p className="text-xs text-slate-500">
            Revision is topic-scoped to prevent vague overviews. Choose one specific topic from {chapter.name}.
          </p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
          {topics.length} {topics.length === 1 ? 'Topic' : 'Topics'} Available
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto pr-1">
        {topics.map((topic, index) => {
          const isSelected = selectedTopicId === topic.id;
          const status = topic.status || 'not_started';
          const hasFormula = Boolean(topic.keyFormula);

          return (
            <div
              key={topic.id}
              id={`topic-item-${topic.id}`}
              onClick={() => onSelectTopic(topic)}
              className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-150 relative ${
                isSelected
                  ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                  : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                    <span className="font-semibold text-slate-900 text-sm">{topic.title}</span>
                    {hasFormula && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Sigma className="w-3 h-3" />
                        {topic.keyFormula}
                      </span>
                    )}
                    {topic.sourceReference && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {topic.sourceReference}
                      </span>
                    )}
                  </div>

                  {topic.summary && (
                    <p className="text-xs text-slate-600 line-clamp-2 mb-2 leading-relaxed">
                      {topic.summary}
                    </p>
                  )}

                  {topic.keyPoints && topic.keyPoints.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {topic.keyPoints.slice(0, 3).map((kp, kpIdx) => (
                        <span
                          key={kpIdx}
                          className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                        >
                          • {kp}
                        </span>
                      ))}
                      {topic.keyPoints.length > 3 && (
                        <span className="text-[10px] text-slate-400 self-center">
                          +{topic.keyPoints.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {status === 'revised' ? (
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Revised
                    </span>
                  ) : status === 'recall_due' ? (
                    <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Due
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                      Pending
                    </span>
                  )}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Button */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="text-xs text-slate-500">
          {selectedTopic ? (
            <span>
              Selected: <strong className="text-slate-800">{selectedTopic.title}</strong>
            </span>
          ) : (
            <span className="text-amber-700 font-medium">Please select a topic above to continue</span>
          )}
        </div>

        {onStartRevision && (
          <button
            type="button"
            id="btn-start-revision-topic"
            disabled={!selectedTopic || isStarting}
            onClick={() => selectedTopic && onStartRevision(selectedTopic)}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              selectedTopic && !isStarting
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isStarting ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                Preparing {mode === 'recall' ? 'Recall...' : 'Questions...'}
              </>
            ) : (
              <>
                {defaultActionLabel}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export interface SelectedTopicRevisionBannerProps {
  topic: ChapterTopicItem;
  chapterName?: string;
  onSwitchTopic?: () => void;
}

export const SelectedTopicRevisionBanner: React.FC<SelectedTopicRevisionBannerProps> = ({
  topic,
  chapterName,
  onSwitchTopic,
}) => {
  return (
    <div id="revising-topic-banner" className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200/80 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-indigo-600 text-white text-[11px] font-bold rounded uppercase tracking-wider">
              Revising Topic
            </span>
            {chapterName && <span className="text-xs text-slate-500">Chapter: {chapterName}</span>}
          </div>
          <h4 className="text-base font-bold text-slate-900">{topic.title}</h4>
          {topic.keyFormula && (
            <div className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 bg-white rounded-md border border-indigo-200 text-indigo-900 font-semibold mt-1">
              <Sigma className="w-3.5 h-3.5 text-indigo-600" />
              Formula: {topic.keyFormula}
            </div>
          )}
          {topic.keyPoints && topic.keyPoints.length > 0 && (
            <div className="pt-2">
              <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target Study Points:
              </div>
              <ul className="text-xs text-slate-600 space-y-0.5 pl-4 list-disc">
                {topic.keyPoints.map((kp, idx) => (
                  <li key={idx}>{kp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {onSwitchTopic && (
          <button
            type="button"
            onClick={onSwitchTopic}
            className="text-xs text-indigo-700 hover:text-indigo-900 font-medium px-2.5 py-1 rounded bg-white hover:bg-indigo-100 border border-indigo-200 transition-colors"
          >
            Change Topic
          </button>
        )}
      </div>
    </div>
  );
};
