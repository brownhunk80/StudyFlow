import React, { useState } from 'react';
import { X, FileText, Download, Copy, Check, FileUp } from 'lucide-react';
import { Chapter } from '../../types';

interface DocumentSourceModalProps {
  isOpen: boolean;
  chapter: Chapter;
  onClose: () => void;
  onReplaceDocument: () => void;
}

export const DocumentSourceModal: React.FC<DocumentSourceModalProps> = ({
  isOpen,
  chapter,
  onClose,
  onReplaceDocument,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (chapter.rawText) {
      navigator.clipboard.writeText(chapter.rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {chapter.documentName || 'Attached Source Document'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {chapter.pageCount ? `${chapter.pageCount} Pages • ` : ''}
                {chapter.sourceType?.toUpperCase() || 'DOCUMENT'} • Linked to {chapter.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onReplaceDocument();
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1.5"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Replace Document</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chapter.rawText ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Raw Extracted Content ({chapter.rawText.length.toLocaleString()} characters)
                </span>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                {chapter.rawText}
              </div>
            </div>
          ) : chapter.documentUrl ? (
            <div className="p-6 text-center space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
              <FileText className="w-12 h-12 mx-auto text-indigo-500" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Binary Attachment: {chapter.documentName}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  This document is stored as an inline payload for AI milestone extraction.
                </p>
              </div>
              {chapter.documentUrl.startsWith('data:') && (
                <a
                  href={chapter.documentUrl}
                  download={chapter.documentName || 'chapter-material.pdf'}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </a>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              No raw content found for this document.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
