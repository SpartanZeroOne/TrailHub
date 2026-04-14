// ─── TrailHub Admin – Toast Notification System ───────────────────────────────
import { useState, useCallback, useRef } from 'react';

let idCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timeouts = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timeouts.current[id]);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++idCounter;
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      timeouts.current[id] = setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const success = useCallback((msg, dur) => toast(msg, 'success', dur), [toast]);
  const error   = useCallback((msg, dur) => toast(msg, 'error', dur ?? 6000), [toast]);
  const info    = useCallback((msg, dur) => toast(msg, 'info',  dur), [toast]);
  const warning = useCallback((msg, dur) => toast(msg, 'warning', dur), [toast]);

  // Undo-toast: shows action with 5s countdown, returns promise
  const undoToast = useCallback((message, onUndo) => {
    const id = ++idCounter;
    let undone = false;
    setToasts(prev => [...prev, {
      id, message, type: 'undo',
      onUndo: () => { undone = true; dismiss(id); if (onUndo) onUndo(); },
    }]);
    return new Promise((resolve) => {
      timeouts.current[id] = setTimeout(() => {
        dismiss(id);
        resolve(!undone);
      }, 5000);
    });
  }, [dismiss]);

  return { toasts, toast, success, error, info, warning, undoToast, dismiss };
}

// ─── Toast Container Component ────────────────────────────────────────────────
export function ToastContainer({ toasts, dismiss }) {
  const icons = {
    success: (
      <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
      </svg>
    ),
    undo: (
      <svg className="w-5 h-5 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
      </svg>
    ),
  };

  const bgColors = {
    success: 'bg-stone-800 border-green-500/30',
    error:   'bg-stone-800 border-red-500/30',
    warning: 'bg-stone-800 border-amber-500/30',
    info:    'bg-stone-800 border-blue-500/30',
    undo:    'bg-stone-800 border-orange-500/30',
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-xl animate-[slideUp_0.2s_ease] ${bgColors[t.type] || bgColors.info}`}
        >
          {icons[t.type] || icons.info}
          <span className="text-stone-200 text-sm flex-1 leading-snug">{t.message}</span>
          {t.type === 'undo' && (
            <button
              onClick={t.onUndo}
              className="text-orange-400 text-sm font-semibold hover:text-orange-300 flex-shrink-0 ml-2"
            >
              Rückgängig
            </button>
          )}
          <button
            onClick={() => dismiss(t.id)}
            className="text-stone-500 hover:text-stone-300 flex-shrink-0 ml-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
