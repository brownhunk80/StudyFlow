import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  FileCheck,
  AlignLeft,
  Sparkles,
  AlertCircle,
  File,
} from 'lucide-react';
import { ChapterCreationData } from '../types';

interface CreateChapterModalProps {
  isOpen: boolean;
  subjectName?: string;
  onClose: () => void;
  onCreateChapter: (data: ChapterCreationData) => void;
}

export const CreateChapterModal: React.FC<CreateChapterModalProps> = ({
  isOpen,
  subjectName,
  onClose,
  onCreateChapter,
}) => {
  const [chapterName, setChapterName] = useState('');
  const [sourceOption, setSourceOption] = useState<'upload' | 'paste'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedRawText, setExtractedRawText] = useState('');
  const [fileBase64, setFileBase64] = useState<string | undefined>(undefined);
  const [pageCount, setPageCount] = useState<number | undefined>(undefined);
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    setIsReadingFile(true);
    setErrorMsg(null);
    setSelectedFile(file);

    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    try {
      // Estimate or detect page count
      // For TXT or plain text
      if (ext === 'txt') {
        const text = await file.text();
        setExtractedRawText(text);
        const estimatedPages = Math.max(1, Math.round(text.split(/\s+/).length / 350));
        setPageCount(estimatedPages);
        setFileBase64(undefined);
      } else {
        // Read as DataURL for base64 transport
        const reader = new FileReader();
        reader.onload = (e) => {
          const resultStr = e.target?.result as string;
          setFileBase64(resultStr);

          // For PDF, extract text and page count via server inspector
          if (ext === 'pdf') {
            fetch('/api/debug/inspect-document', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: file.name,
                mimeType: 'application/pdf',
                fileSizeBytes: file.size,
                inlinePdf: resultStr,
              }),
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.pageCount) setPageCount(data.pageCount);
                if (data.extractedText) setExtractedRawText(data.extractedText);
              })
              .catch((err) => console.warn('Background inspector failed:', err));
          } else {
            // DOCX / EPUB estimation based on size (~15KB per page)
            setPageCount(Math.max(1, Math.round(file.size / (18 * 1024))));
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error('Error reading file:', err);
      setErrorMsg('Could not read the uploaded file. Please try another file or paste text directly.');
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileProcess(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileBase64(undefined);
    setExtractedRawText('');
    setPageCount(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterName.trim()) {
      setErrorMsg('Please enter a chapter name');
      return;
    }

    let sourceType: 'pdf' | 'docx' | 'txt' | 'epub' | 'pasted_text' | undefined = undefined;
    let finalRawText = '';
    let finalDocName = '';
    let finalDocUrl = fileBase64;
    let finalPageCount = pageCount;

    if (sourceOption === 'upload' && selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') sourceType = 'pdf';
      else if (ext === 'docx' || ext === 'doc') sourceType = 'docx';
      else if (ext === 'txt') sourceType = 'txt';
      else if (ext === 'epub') sourceType = 'epub';
      else sourceType = 'pdf';

      finalDocName = selectedFile.name;
      finalRawText = extractedRawText;
    } else if (sourceOption === 'paste' && pastedText.trim()) {
      sourceType = 'pasted_text';
      finalDocName = `${chapterName.trim()} Syllabus / Notes`;
      finalRawText = pastedText.trim();
      const words = pastedText.trim().split(/\s+/).length;
      finalPageCount = Math.max(1, Math.round(words / 300));
    }

    onCreateChapter({
      name: chapterName.trim(),
      documentName: finalDocName || undefined,
      documentUrl: finalDocUrl,
      rawText: finalRawText || undefined,
      pageCount: finalPageCount,
      sourceType,
      milestones: [],
    });

    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
                <Sparkles className="w-3 h-3" />
                Chapter Setup
              </span>
              {subjectName && (
                <span className="text-xs font-semibold text-slate-500">
                  in <strong className="text-slate-700 dark:text-slate-300">{subjectName}</strong>
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
              Create New Chapter
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-center gap-2.5 text-xs font-medium text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Field 1: Chapter Name */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Chapter Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={chapterName}
              onChange={(e) => {
                setChapterName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="e.g., Chapter 1: Chemical Reactions, or Unit 3: Thermodynamics"
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              autoFocus
            />
            <p className="text-[11px] text-slate-500">
              Give your chapter a clear curriculum title or textbook chapter code.
            </p>
          </div>

          {/* Field 2: Source Material Attachment */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Source Material Attachment
                </label>
                <p className="text-[11px] text-slate-500">
                  Attach your syllabus document or text to generate milestones & drills.
                </p>
              </div>
            </div>

            {/* Option selector pills */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
              <button
                type="button"
                onClick={() => setSourceOption('upload')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                  sourceOption === 'upload'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Document</span>
              </button>

              <button
                type="button"
                onClick={() => setSourceOption('paste')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition ${
                  sourceOption === 'paste'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <AlignLeft className="w-4 h-4" />
                <span>Syllabus / Paste Text</span>
              </button>
            </div>

            {/* Option A: Upload Document */}
            {sourceOption === 'upload' && (
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.txt,.epub"
                  className="hidden"
                />

                {!selectedFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-800/30'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Drag & drop your file here, or{' '}
                        <span className="text-indigo-600 dark:text-indigo-400 underline">browse</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Supports PDF, DOCX, TXT, or EPUB (up to 25MB)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {selectedFile.name}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>{formatFileSize(selectedFile.size)}</span>
                          {pageCount && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                ~{pageCount} Pages
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                            <FileCheck className="w-3 h-3" /> Ready
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {isReadingFile && (
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 animate-pulse text-center">
                    Processing document structure...
                  </p>
                )}
              </div>
            )}

            {/* Option B: Paste Syllabus / Raw Text */}
            {sourceOption === 'paste' && (
              <div className="space-y-2">
                <textarea
                  rows={6}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste syllabus outline, textbook excerpts, or key chapter notes here...
Example:
1. Core Definitions & Governing Principles
2. Formulas, Equations & Worked Methodologies
3. Common Traps & High-Yield Exam Applications"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {pastedText.trim() ? (
                      <>
                        <strong>{pastedText.trim().split(/\s+/).length}</strong> words • ~
                        {Math.max(1, Math.round(pastedText.trim().split(/\s+/).length / 300))} pages
                      </>
                    ) : (
                      'Paste chapter outline or raw textbook text'
                    )}
                  </span>
                  <span>Markdown / Plaintext</span>
                </div>
              </div>
            )}

            {/* Tip banner */}
            <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <File className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <span>
                <strong>Guardrail Active:</strong> Chapters start in a clean, empty state without
                dummy milestones. When you attach a document, you can trigger 1-click AI extraction
                for authentic milestones, Recall Decks, and check learning drills.
              </span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!chapterName.trim() || isReadingFile}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create Chapter</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
