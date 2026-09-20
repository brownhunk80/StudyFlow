import React, { useState } from 'react';
import { Sparkles, Layers, CheckCircle2, AlertCircle, RefreshCw, FileText, ChevronRight } from 'lucide-react';
import { ChapterMaterial, ChapterTopicItem } from '../types';
import { fetchExtractChapterTopics } from '../utils/aiClient';

interface ChapterTopicExtractorProps {
  chapterName: string;
  subject: string;
  examName?: string;
  materials?: ChapterMaterial[];
  existingTopics?: ChapterTopicItem[];
  onTopicsExtracted: (topics: ChapterTopicItem[]) => void;
  className?: string;
}

export const ChapterTopicExtractor: React.FC<ChapterTopicExtractorProps> = ({
  chapterName,
  subject,
  examName,
  materials = [],
  existingTopics = [],
  onTopicsExtracted,
  className = '',
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastExtractedCount, setLastExtractedCount] = useState<number | null>(null);
  const [extractedSummary, setExtractedSummary] = useState<string | null>(null);

  const handleExtract = async () => {
    setIsExtracting(true);
    setError(null);
    try {
      const result = await fetchExtractChapterTopics(chapterName, subject, materials, examName);
      if (result && Array.isArray(result.topics) && result.topics.length > 0) {
        onTopicsExtracted(result.topics);
        setLastExtractedCount(result.topics.length);
        if (result.sourceSummary) {
          setExtractedSummary(result.sourceSummary);
        }
      } else {
        throw new Error('No topics could be extracted from the content.');
      }
    } catch (err: any) {
      console.error('Failed to extract chapter topics:', err);
      setError(err.message || 'Failed to extract topics. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const hasTopics = existingTopics && existingTopics.length > 0;

  return (
    <div
      id={`topic-extractor-${chapterName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
      className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Chapter Topic Structure</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                {hasTopics ? `${existingTopics.length} Topics Extracted` : 'Not Extracted Yet'}
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {materials.length > 0
                ? `Grounds topics in ${materials.length} attached chapter material${materials.length === 1 ? '' : 's'}.`
                : 'Extracts educational concept breakdown grounded in textbook curriculum.'}
            </p>
          </div>
        </div>

        <button
          id="btn-extract-chapter-topics"
          type="button"
          onClick={handleExtract}
          disabled={isExtracting}
          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
        >
          {isExtracting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing Content...</span>
            </>
          ) : hasTopics ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-Extract Topics</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Extract Chapter Topics</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {lastExtractedCount !== null && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Successfully extracted {lastExtractedCount} educational topics from chapter content.</span>
          </div>
          {extractedSummary && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 italic hidden sm:inline">
              {extractedSummary}
            </span>
          )}
        </div>
      )}

      {/* Preview list of extracted topics */}
      {hasTopics && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Extracted Topics Overview:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {existingTopics.map((topic, idx) => (
              <div
                key={topic.id || `topic-preview-${idx}`}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5"
              >
                <div className="w-5 h-5 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {topic.title}
                  </div>
                  {topic.sourceReference && (
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 mt-0.5">
                      <FileText className="w-2.5 h-2.5" />
                      <span className="truncate">{topic.sourceReference}</span>
                    </div>
                  )}
                  {topic.summary && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {topic.summary}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
