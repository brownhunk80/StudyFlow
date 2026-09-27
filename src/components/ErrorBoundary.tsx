import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[StudyFlow ErrorBoundary caught an unhandled error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    try {
      // Clear current navigation state or corrupted active sessions
      window.location.hash = '';
      window.location.pathname = '/';
    } catch {}
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleClearStorageQuota = () => {
    try {
      // Purge expendable large cached entries
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('doc_') || key.startsWith('cached_') || key.startsWith('pdf_') || key.startsWith('temp_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      // Sanitize studyflow_exams if it is over-quota
      const rawExams = localStorage.getItem('studyflow_exams');
      if (rawExams) {
        try {
          const parsed = JSON.parse(rawExams);
          if (Array.isArray(parsed)) {
            const clean = parsed.map((e: any) => ({
              ...e,
              chapters: (e.chapters || []).map((c: any) => ({
                ...c,
                materials: (c.materials || []).map((m: any) => ({
                  ...m,
                  fileData: undefined,
                  content: typeof m.content === 'string' ? m.content.slice(0, 20000) : m.content,
                })),
              })),
            }));
            localStorage.setItem('studyflow_exams', JSON.stringify(clean));
          }
        } catch {}
      }
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isQuotaError = `${this.state.error?.message}`.toLowerCase().includes('quota');

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {isQuotaError ? 'Storage Quota Limit Reached' : 'Something went wrong'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {isQuotaError
                  ? 'Your browser storage exceeded its quota due to uploaded files. You can safely free up cache space to resume.'
                  : 'StudyFlow encountered an unexpected display issue. Your saved chapters and recall cards remain safe.'}
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              {isQuotaError ? (
                <button
                  type="button"
                  onClick={this.handleClearStorageQuota}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Free Storage & Reload</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={this.handleResetState}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Home className="w-4 h-4" />
                    <span>Return to Dashboard</span>
                  </button>

                  <button
                    type="button"
                    onClick={this.handleReload}
                    className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reload Page</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
