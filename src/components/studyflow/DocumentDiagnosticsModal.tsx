import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  FileText,
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Hash,
  BookOpen,
  Copy,
  Check,
  RefreshCw,
  UploadCloud,
} from 'lucide-react';
import { Chapter } from '../../types';
import type { InspectDocumentResult } from '../../api/debug/inspect-document';

interface DocumentDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter;
  onOpenAttachModal?: () => void;
}

export const DocumentDiagnosticsModal: React.FC<DocumentDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  chapter,
  onOpenAttachModal,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<InspectDocumentResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'first500' | 'last500' | 'headings'>('overview');

  const runDiagnostics = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/debug/inspect-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: chapter.documentName || chapter.name,
          mimeType: chapter.sourceType === 'pdf' ? 'application/pdf' : 'text/plain',
          rawText: chapter.rawText,
          inlinePdf: chapter.documentUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`Diagnostic request failed with HTTP ${response.status}`);
      }

      const data: InspectDocumentResult = await response.json();
      setDiagnosticData(data);
    } catch (err: any) {
      console.error('Error running document diagnostics:', err);
      setErrorMsg(err.message || 'Failed to inspect document.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen, chapter.id, chapter.documentName, chapter.documentUrl, chapter.rawText]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const getStatusBadge = (status?: 'healthy' | 'warning' | 'unreadable') => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Healthy Text Layer
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Text Density
          </span>
        );
      case 'unreadable':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5" />
            Unreadable / Scanned Image PDF
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Document Ingestion Diagnostics
              </h2>
              <p className="text-xs text-slate-500">
                Pipeline health check & text extraction inspection for <strong>{chapter.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-bold">Inspecting document streams & decoding text layers...</p>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              <p className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Diagnostic Error
              </p>
              <p className="mt-1">{errorMsg}</p>
            </div>
          )}

          {!isLoading && diagnosticData && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Extraction Health Status
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(diagnosticData.ingestionMethod?.status)}
                    <span className="text-xs font-mono text-slate-500">
                      Method: {diagnosticData.ingestionMethod?.method}
                    </span>
                  </div>
                </div>

                <button
                  onClick={runDiagnostics}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition self-start sm:self-center"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Re-Inspect
                </button>
              </div>

              {/* Scanned Image PDF Alert if unreadable */}
              {diagnosticData.ingestionMethod?.isScannedImagePdf && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Scanned / Image-Only PDF Detected</span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    This file contains document pages or images, but zero or near-zero selectable text was found in the text layer. Gemini requires text or an OCR pass to extract accurate milestones.
                  </p>
                  {onOpenAttachModal && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAttachModal();
                      }}
                      className="mt-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      Replace with Text / Paste Syllabus
                    </button>
                  )}
                </div>
              )}

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <Hash className="w-3 h-3 text-indigo-500" />
                    Characters
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {diagnosticData.extractedCharacterCount.toLocaleString()}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-indigo-500" />
                    Word Count
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {diagnosticData.wordCount.toLocaleString()}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-indigo-500" />
                    Pages
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {diagnosticData.pageCount}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                    <FileSearch className="w-3 h-3 text-indigo-500" />
                    Headings
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {diagnosticData.sampleHeadings.length}
                  </div>
                </div>
              </div>

              {/* Sub-tabs for Text Inspection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-2.5 text-xs font-bold transition border-b-2 ${
                      activeTab === 'overview'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Diagnostics Log
                  </button>
                  <button
                    onClick={() => setActiveTab('first500')}
                    className={`pb-2.5 text-xs font-bold transition border-b-2 ${
                      activeTab === 'first500'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    First 500 Characters
                  </button>
                  <button
                    onClick={() => setActiveTab('last500')}
                    className={`pb-2.5 text-xs font-bold transition border-b-2 ${
                      activeTab === 'last500'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Last 500 Characters
                  </button>
                  <button
                    onClick={() => setActiveTab('headings')}
                    className={`pb-2.5 text-xs font-bold transition border-b-2 ${
                      activeTab === 'headings'
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Sample Headings ({diagnosticData.sampleHeadings.length})
                  </button>
                </div>

                {/* Tab 1: Overview / Diagnostic logs */}
                {activeTab === 'overview' && (
                  <div className="p-4 rounded-2xl bg-slate-900 text-slate-300 font-mono text-xs space-y-2 max-h-48 overflow-y-auto">
                    <p className="text-slate-400 font-bold">Ingestion Trace Logs:</p>
                    {diagnosticData.ingestionMethod?.diagnostics?.map((diag, idx) => (
                      <p key={idx} className="leading-relaxed">
                        <span className="text-indigo-400">[{idx + 1}]</span> {diag}
                      </p>
                    ))}
                  </div>
                )}

                {/* Tab 2: First 500 chars */}
                {activeTab === 'first500' && (
                  <div className="relative p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => copyToClipboard(diagnosticData.first500Chars)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-600 transition"
                      title="Copy text snippet"
                    >
                      {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                      {diagnosticData.first500Chars || '(No text extracted)'}
                    </pre>
                  </div>
                )}

                {/* Tab 3: Last 500 chars */}
                {activeTab === 'last500' && (
                  <div className="relative p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => copyToClipboard(diagnosticData.last500Chars)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-600 transition"
                      title="Copy text snippet"
                    >
                      {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                      {diagnosticData.last500Chars || '(No text extracted)'}
                    </pre>
                  </div>
                )}

                {/* Tab 4: Sample headings */}
                {activeTab === 'headings' && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 max-h-56 overflow-y-auto">
                    {diagnosticData.sampleHeadings.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No structured section headings detected.</p>
                    ) : (
                      diagnosticData.sampleHeadings.map((h, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold truncate">{h}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Source: <strong className="text-slate-700 dark:text-slate-300">{chapter.documentName || 'Raw Text'}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
