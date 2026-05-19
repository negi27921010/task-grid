'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils/cn';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

/* ─── Types ─── */

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

/* ─── Context ─── */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

/* ─── Provider ─── */

const AUTO_DISMISS_MS = 4000;

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/* ─── Container ─── */

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2.5"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

/* ─── Individual Toast ─── */

const variantStyles: Record<ToastVariant, string> = {
  success:
    'border-[rgba(0,185,92,0.28)] bg-[rgba(0,185,92,0.10)] text-[#0a7a3d] ' +
    'dark:border-[rgba(0,185,92,0.32)] dark:bg-[rgba(0,185,92,0.14)] dark:text-[#1fd57e]',
  error:
    'border-[rgba(252,65,61,0.28)] bg-[rgba(252,65,61,0.10)] text-[#b22622] ' +
    'dark:border-[rgba(252,65,61,0.32)] dark:bg-[rgba(252,65,61,0.14)] dark:text-[#ff6864]',
  warning:
    'border-[rgba(251,188,4,0.32)] bg-[rgba(251,188,4,0.12)] text-[#7a5400] ' +
    'dark:border-[rgba(251,188,4,0.36)] dark:bg-[rgba(251,188,4,0.16)] dark:text-[var(--brand-yellow)]',
  info:
    'border-[rgba(var(--accent-rgb),0.28)] bg-accent-soft-strong text-[var(--accent)]',
};

const variantIcons: Record<ToastVariant, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const Icon = variantIcons[toast.variant];

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, onDismiss]);

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-80 items-start gap-2.5',
        'rounded-[var(--radius-lg)] border p-3.5 backdrop-blur-xl',
        'shadow-[var(--shadow-lg)]',
        'animate-in slide-in-from-right-full fade-in-0 duration-300',
        variantStyles[toast.variant],
      )}
      role="alert"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded-[var(--radius-sm)] p-0.5 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="h-3.5 w-3.5" />
        <span className="sr-only">Dismiss</span>
      </button>
    </div>
  );
}
