import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  type?: 'chapter' | 'topic' | 'subject';
  itemName: string;
  customTitle?: string;
  customMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  type = 'chapter',
  itemName,
  customTitle,
  customMessage,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isChapter = type === 'chapter';
  const isSubject = type === 'subject';
  const modalTitle =
    customTitle ||
    (isSubject
      ? `Delete ${itemName}?`
      : isChapter
      ? 'Delete this chapter?'
      : 'Delete this topic?');
  const modalMessage =
    customMessage ||
    (isSubject
      ? `Delete ${itemName}? This will permanently remove this subject and all its chapters, checkpoints, and review history.`
      : isChapter
      ? 'Are you sure you want to delete this chapter and all of its topics? This action cannot be undone.'
      : 'Are you sure you want to delete this topic?');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            {isChapter ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="delete-dialog-title"
              className="text-base font-black text-slate-900 dark:text-white leading-tight"
            >
              {modalTitle}
            </h2>
            {itemName && (
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 truncate">
                &ldquo;{itemName}&rdquo;
              </p>
            )}
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {modalMessage}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition -mr-1 -mt-1 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
