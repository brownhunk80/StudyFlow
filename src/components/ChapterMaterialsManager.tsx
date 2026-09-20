import React, { useState, useMemo } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  BookOpen,
  Trash2,
  Sparkles,
  Plus,
  Layers,
  CheckCircle2,
  Eye,
  FileUp,
  ExternalLink,
  Download,
  FileCode,
  Check,
} from 'lucide-react';
import { ChapterMaterial } from '../types';

interface ChapterMaterialsManagerProps {
  materials?: ChapterMaterial[];
  chapterName: string;
  subject: string;
  onAddMaterial?: (material) => void;
  onRemoveMaterial?: (materialId: string) => void;
  onUpdateMaterials?: (materials: ChapterMaterial[]) => void;
  onGenerateNotesFromContent?: () => void;
  onGenerateFlashcardsFromContent?: () => void;
  onOpenFeynmanRecorder?: (mode: 'notes' | 'flashcards') => void;
  onOpenRecallVerification?: () => void;
  isGeneratingNotes?: boolean;
  isGeneratingCards?: boolean;
}

// Convert base64 data URLs to clean Blob URLs for optimal iframe/object PDF rendering
const getDisplayUrl = (data?: string, mime?: string, name?: string): string | null => {
  if (!data) return null;
  if (data.startsWith('blob:') || data.startsWith('http')) return data;
  if (
    data.startsWith('data:application/pdf') ||
    mime === 'application/pdf' ||
    name?.toLowerCase().endsWith('.pdf')
  ) {
    try {
      const base64Index = data.indexOf(';base64,');
      if (base64Index !== -1) {
        const base64 = data.substring(base64Index + 8);
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        return URL.createObjectURL(blob);
      }
    } catch (err) {
      console.warn('Error converting base64 to PDF blob URL:', err);
    }
  }
  return data;
};

export const ChapterMaterialsManager: React.FC<ChapterMaterialsManagerProps> = ({
  materials = [],
  chapterName,
  subject,
  onAddMaterial,
  onRemoveMaterial,
  onUpdateMaterials,
  onGenerateNotesFromContent,
  onGenerateFlashcardsFromContent,
  onOpenFeynmanRecorder,
  onOpenRecallVerification,
  isGeneratingNotes,
  isGeneratingCards,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [materialType, setMaterialType] = useState<ChapterMaterial['type']>('textbook');
  const [title, setTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<ChapterMaterial | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null);

  // Identify all attached PDF materials
  const pdfMaterials = useMemo(() => {
    return materials.filter(
      (m) =>
        m.type === 'pdf' ||
        m.mimeType === 'application/pdf' ||
        m.fileName?.toLowerCase().endsWith('.pdf') ||
        (m.fileData && m.fileData.startsWith('data:application/pdf'))
    );
  }, [materials]);

  // Primary active PDF material to show on screen
  const currentActivePdf = useMemo(() => {
    if (activeMaterialId) {
      const found = materials.find((m) => m.id === activeMaterialId);
      if (found) return found;
    }
    return pdfMaterials[0] || null;
  }, [activeMaterialId, materials, pdfMaterials]);

  const currentActivePdfUrl = useMemo(() => {
    if (!currentActivePdf) return null;
    return getDisplayUrl(
      currentActivePdf.fileData,
      currentActivePdf.mimeType,
      currentActivePdf.fileName
    );
  }, [currentActivePdf]);

  const handleAddMaterial = (newMat: ChapterMaterial) => {
    if (typeof onAddMaterial === 'function') {
      onAddMaterial(newMat);
    }
    if (typeof onUpdateMaterials === 'function') {
      onUpdateMaterials([newMat, ...materials]);
    }
    setActiveMaterialId(newMat.id);
  };

  const handleRemoveMaterial = (materialId: string) => {
    if (typeof onRemoveMaterial === 'function') {
      onRemoveMaterial(materialId);
    }
    if (typeof onUpdateMaterials === 'function') {
      onUpdateMaterials(materials.filter((m) => m.id !== materialId));
    }
    if (activeMaterialId === materialId) {
      setActiveMaterialId(null);
    }
  };

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    setMimeType(file.type || 'application/pdf');
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (isPdf) {
      setMaterialType('pdf');
      const blobUrl = URL.createObjectURL(file);
      setPdfBlobUrl(blobUrl);

      // Also read as Data URL so it is persistently stored in chapter materials
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileData(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (isImage) {
      setMaterialType('diagram');
      setPdfBlobUrl(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileData(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPdfBlobUrl(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setTextContent(text);
        setFileData(text);
      };
      reader.readAsText(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !fileData && !pdfBlobUrl && !fileName) return;

    const isPdf =
      materialType === 'pdf' ||
      mimeType === 'application/pdf' ||
      fileName?.toLowerCase().endsWith('.pdf') ||
      !!pdfBlobUrl;

    const newMat: ChapterMaterial = {
      id: 'mat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type: isPdf ? 'pdf' : materialType,
      title: title.trim() || fileName || `${materialType.toUpperCase()} Document`,
      content: textContent.trim() || (fileName ? `Source document: ${fileName}` : ''),
      fileName: fileName || undefined,
      fileData: fileData || pdfBlobUrl || undefined,
      mimeType: mimeType || (isPdf ? 'application/pdf' : undefined),
      size: fileData ? fileData.length : 0,
      uploadedAt: new Date().toISOString(),
    };

    handleAddMaterial(newMat);
    setTitle('');
    setTextContent('');
    setFileData(null);
    setFileName(null);
    setMimeType(null);
    setPdfBlobUrl(null);
    setShowAddForm(false);
  };

  const currentUploadPdfUrl =
    pdfBlobUrl ||
    (fileData && (mimeType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf'))
      ? getDisplayUrl(fileData, mimeType || undefined, fileName || undefined)
      : null);

  return (
    <div className="space-y-5">
      {/* Action Header Ribbon */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200">
                SOURCE OF TRUTH ENGINE
              </span>
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                <span>Chapter Knowledge Base</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/40 text-indigo-100 border border-indigo-400/30">
                  {materials.length} Sources Attached
                </span>
              </h3>
              <p className="text-xs text-indigo-100/80 max-w-xl mt-0.5">
                Upload textbooks, handwritten notes, PDFs, or diagram photos. AI synthesizes notes & flashcards directly from these materials.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 rounded-2xl bg-white hover:bg-slate-100 text-indigo-950 font-black text-xs shadow-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'Close Form' : 'Upload Content'}</span>
            </button>
          </div>

          {/* Quick AI Action Triggers */}
          {(onGenerateFlashcardsFromContent || onGenerateNotesFromContent || onOpenFeynmanRecorder || onOpenRecallVerification) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-white/10">
              {onGenerateFlashcardsFromContent && (
                <button
                  type="button"
                  onClick={onGenerateFlashcardsFromContent}
                  disabled={isGeneratingCards || materials.length === 0}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border border-white/10 disabled:opacity-50"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-300" />
                  <span>{isGeneratingCards ? 'Generating...' : 'Auto-Create Flashcards'}</span>
                </button>
              )}

              {onGenerateNotesFromContent && (
                <button
                  type="button"
                  onClick={onGenerateNotesFromContent}
                  disabled={isGeneratingNotes || materials.length === 0}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border border-white/10 disabled:opacity-50"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
                  <span>{isGeneratingNotes ? 'Synthesizing...' : 'Auto-Create Notes'}</span>
                </button>
              )}

              {onOpenFeynmanRecorder && (
                <button
                  type="button"
                  onClick={() => onOpenFeynmanRecorder('notes')}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-500/30 hover:bg-amber-500/40 active:scale-95 text-amber-100 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border border-amber-400/20"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Feynman AI Voice</span>
                </button>
              )}

              {onOpenRecallVerification && (
                <button
                  type="button"
                  onClick={onOpenRecallVerification}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/40 active:scale-95 text-emerald-100 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/20"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Check & Verify Gaps</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload / Add Material Modal / Accordion */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-4 shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Add Learning Material for "{chapterName}"</span>
            </h4>
            <span className="text-[11px] text-slate-500">Supported: Textbooks, PDFs, Diagrams, Handwritten Notes</span>
          </div>

          {/* Type Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { type: 'textbook', label: 'Textbook', icon: BookOpen },
              { type: 'notes', label: 'Lecture Notes', icon: FileText },
              { type: 'pdf', label: 'PDF Document', icon: FileUp },
              { type: 'diagram', label: 'Diagram / Photo', icon: ImageIcon },
              { type: 'pasted_text', label: 'Pasted Excerpt', icon: FileText },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setMaterialType(t.type as any)}
                  className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    materialType === t.type
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Material Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., NCERT Chapter 10 Excerpt, Class Circuit Diagram, Formula Sheet..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Drag and Drop Zone or File Picker */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-4 text-center transition cursor-pointer ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100/50'
            }`}
          >
            <input
              type="file"
              id="file-upload"
              accept="image/*,.pdf,.txt,.md"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer block space-y-1">
              <UploadCloud className="w-7 h-7 mx-auto text-indigo-600 dark:text-indigo-400" />
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {fileName ? `Selected: ${fileName}` : 'Click to browse or drag & drop files here'}
              </div>
              <p className="text-[11px] text-slate-500">
                Upload image of diagrams, formula sheets, textbook photos, or notes (.png, .jpg, .pdf, .txt)
              </p>
            </label>
          </div>

          {/* Whole PDF Viewer on Screen for Uploading Document */}
          {currentUploadPdfUrl && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    PDF
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{fileName || title || 'PDF Document'}</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                        Whole Document Loaded
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      You can scroll, zoom, read, and navigate all pages directly on this screen.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={currentUploadPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Tab</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setFileData(null);
                      setPdfBlobUrl(null);
                      setFileName(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-bold transition"
                  >
                    Remove File
                  </button>
                </div>
              </div>

              {/* Embedded Whole PDF Document Viewer */}
              <div className="rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-sm bg-slate-950">
                <object
                  data={`${currentUploadPdfUrl}#toolbar=1&navpanes=1&statusbar=1`}
                  type="application/pdf"
                  className="w-full h-[650px] lg:h-[750px] bg-white dark:bg-slate-900"
                >
                  <iframe
                    src={`${currentUploadPdfUrl}#toolbar=1&navpanes=1&statusbar=1`}
                    className="w-full h-[650px] lg:h-[750px] border-0"
                    title={fileName || title || 'PDF Preview'}
                  >
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800 rounded-2xl space-y-3">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        PDF preview is ready. You can open or download it:
                      </p>
                      <a
                        href={currentUploadPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Document in New Tab</span>
                      </a>
                    </div>
                  </iframe>
                </object>
              </div>
            </div>
          )}

          {/* Image Preview if image uploaded */}
          {fileData && mimeType?.startsWith('image/') && (
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <img
                src={fileData}
                alt="Uploaded preview"
                className="w-16 h-16 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
              />
              <div className="text-xs space-y-0.5">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Diagram / Image Loaded
                </span>
                <p className="text-[11px] text-slate-500">
                  Equations and diagrams will be grounded for AI study workflows.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setFileData(null);
                setPdfBlobUrl(null);
                setFileName(null);
              }}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Attach Material to Chapter</span>
            </button>
          </div>
        </form>
      )}

      {/* Whole PDF Viewer for Active Attached Document on Screen */}
      {currentActivePdf && currentActivePdfUrl && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
                PDF
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    {currentActivePdf.title || currentActivePdf.fileName || 'Chapter Textbook PDF'}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-300 text-[10px] font-black uppercase">
                    Whole Document
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>{currentActivePdf.fileName}</span>
                  <span>•</span>
                  <span>Uploaded {new Date(currentActivePdf.uploadedAt).toLocaleDateString()}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={currentActivePdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 hover:bg-slate-100 text-xs font-bold border border-slate-200 dark:border-slate-600 flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Tab</span>
              </a>
              <a
                href={currentActivePdfUrl}
                download={currentActivePdf.fileName || `${chapterName}-document.pdf`}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </div>
          </div>

          {/* Whole Document Embed */}
          <div className="w-full bg-slate-950">
            <object
              data={`${currentActivePdfUrl}#toolbar=1&navpanes=1&statusbar=1`}
              type="application/pdf"
              className="w-full h-[680px] lg:h-[780px] bg-white dark:bg-slate-900"
            >
              <iframe
                src={`${currentActivePdfUrl}#toolbar=1&navpanes=1&statusbar=1`}
                className="w-full h-[680px] lg:h-[780px] border-0"
                title={currentActivePdf.title || 'PDF Document'}
              >
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 space-y-3">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Your browser does not display this embedded PDF directly in this frame.
                  </p>
                  <a
                    href={currentActivePdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Whole PDF in New Window</span>
                  </a>
                </div>
              </iframe>
            </object>
          </div>
        </div>
      )}

      {/* Materials List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Attached Chapter Content ({materials.length})
          </h4>
          {materials.length === 0 && (
            <span className="text-xs text-amber-600 font-medium">
              Attach textbooks or notes to unlock source-grounded AI flashcards!
            </span>
          )}
        </div>

        {materials.length === 0 ? (
          <div className="p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
            <BookOpen className="w-9 h-9 mx-auto text-slate-400" />
            <div className="space-y-1">
              <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No materials attached yet
              </h5>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload your chapter PDF, lecture notes, or diagrams to view the full document and ground all study steps.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Add First Material
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {materials.map((mat) => {
              const isPdf =
                mat.type === 'pdf' ||
                mat.mimeType === 'application/pdf' ||
                mat.fileName?.toLowerCase().endsWith('.pdf') ||
                (mat.fileData && mat.fileData.startsWith('data:application/pdf'));
              const isDiagram =
                mat.type === 'diagram' || (mat.fileData && mat.mimeType?.startsWith('image/'));
              const isCurrentActive = currentActivePdf?.id === mat.id;

              return (
                <div
                  key={mat.id}
                  className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition flex flex-col justify-between space-y-3 shadow-xs ${
                    isCurrentActive
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                      : 'border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isPdf
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : mat.type === 'textbook'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : mat.type === 'diagram'
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {isPdf ? 'PDF' : mat.type}
                        </span>
                        {mat.fileName && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {mat.fileName}
                          </span>
                        )}
                        {isCurrentActive && isPdf && (
                          <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-0.5">
                            <Check className="w-3 h-3" />
                            <span>Viewing on Screen</span>
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveMaterial(mat.id)}
                        className="text-slate-400 hover:text-rose-500 transition cursor-pointer p-1"
                        title="Remove material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h5 className="text-xs font-black text-slate-900 dark:text-white leading-snug">
                      {mat.title}
                    </h5>

                    {/* Thumbnail if image */}
                    {isDiagram && mat.fileData && (
                      <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-28 bg-slate-100 dark:bg-slate-800">
                        <img
                          src={mat.fileData}
                          alt={mat.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>Uploaded {new Date(mat.uploadedAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      {isPdf && (
                        <button
                          type="button"
                          onClick={() => setActiveMaterialId(mat.id)}
                          className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Show on Screen</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedPreview(mat)}
                        className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Preview Modal</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Content Preview Modal */}
      {selectedPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-4xl w-full rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600">
                  {selectedPreview.type}
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {selectedPreview.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPreview(null)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1">
              {/* PDF Preview inside Modal */}
              {(selectedPreview.type === 'pdf' ||
                selectedPreview.mimeType === 'application/pdf' ||
                selectedPreview.fileName?.toLowerCase().endsWith('.pdf') ||
                (selectedPreview.fileData && selectedPreview.fileData.startsWith('data:application/pdf'))) && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
                  <object
                    data={`${getDisplayUrl(selectedPreview.fileData, selectedPreview.mimeType, selectedPreview.fileName)}#toolbar=1&navpanes=1`}
                    type="application/pdf"
                    className="w-full h-[70vh] bg-white dark:bg-slate-900"
                  >
                    <iframe
                      src={`${getDisplayUrl(selectedPreview.fileData, selectedPreview.mimeType, selectedPreview.fileName)}#toolbar=1&navpanes=1`}
                      className="w-full h-[70vh] border-0"
                      title={selectedPreview.title}
                    />
                  </object>
                </div>
              )}

              {/* Image Preview inside Modal */}
              {selectedPreview.fileData && selectedPreview.mimeType?.startsWith('image/') && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <img
                    src={selectedPreview.fileData}
                    alt={selectedPreview.title}
                    className="w-full max-h-[60vh] object-contain bg-slate-950"
                  />
                </div>
              )}

              {/* Text Fallback if neither PDF nor image */}
              {!selectedPreview.mimeType?.startsWith('image/') &&
                selectedPreview.type !== 'pdf' &&
                !selectedPreview.fileName?.toLowerCase().endsWith('.pdf') &&
                selectedPreview.content && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {selectedPreview.content}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
