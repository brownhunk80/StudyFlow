import React, { useState } from 'react';
import { X, BookOpen, Layers, Sparkles, FileText, CheckCircle2, Bookmark, ExternalLink } from 'lucide-react';
import { Section, Chapter } from '../../types';
import { getChapterCuratedContent } from '../../data/chapterTopicsData';

interface DocumentReaderModalProps {
  chapter: Chapter;
  activeSection?: Section | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkComplete?: () => void;
}

export const DocumentReaderModal: React.FC<DocumentReaderModalProps> = ({
  chapter,
  activeSection,
  isOpen,
  onClose,
  onMarkComplete,
}) => {
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    activeSection?.id || null
  );

  const curated = React.useMemo(() => {
    return getChapterCuratedContent(chapter.name, chapter.subject || 'Science');
  }, [chapter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Full Document Source Material
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 line-clamp-1">
                {chapter.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
          {/* Chapter Overview */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
              Curriculum Overview & Scope
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {curated.overview ||
                `Comprehensive academic study guide for ${chapter.name}. Review foundational theorems, derivations, and application boundaries.`}
            </p>
          </div>

          {/* Core Textbook Sections */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Textbook Content & Derivations
            </h3>

            {curated.topics && curated.topics.length > 0 ? (
              curated.topics.map((t, idx) => (
                <div
                  key={t.id || idx}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      Section {idx + 1}: {t.title}
                    </h4>
                    {t.keyFormula && (
                      <code className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {t.keyFormula}
                      </code>
                    )}
                  </div>

                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pl-4 list-disc">
                    {t.keyInfo.map((info, kIdx) => (
                      <li key={kIdx} className="leading-relaxed">
                        {info}
                      </li>
                    ))}
                  </ul>

                  {t.commonTraps && (
                    <div className="text-xs p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200">
                      ⚠️ <strong>Exam Trap:</strong> {t.commonTraps}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                {chapter.notes || 'Full document text loaded from syllabus records.'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
            <span>StudyFlow Learn Document Engine</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
            {onMarkComplete && (
              <button
                onClick={() => {
                  onMarkComplete();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Document Read</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
