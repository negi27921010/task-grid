'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error logged server-side; keep client console clean
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center bg-canvas animate-fade-in-up">
      <div className="relative">
        <div className="rounded-2xl p-5" style={{ background: 'rgba(239, 68, 68, 0.08)' }}>
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        {/* Glow */}
        <div className="absolute -inset-2 rounded-2xl animate-pulse-glow" style={{ background: 'rgba(239, 68, 68, 0.1)', filter: 'blur(12px)' }} />
      </div>
      <h2 className="mt-6 text-xl font-bold text-text" style={{ fontFamily: 'var(--font-display)' }}>
        Something went wrong
      </h2>
      <p className="mt-2 max-w-md text-sm text-text-muted leading-relaxed">
        An unexpected error occurred. Please try again or contact support if the issue persists.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 group inline-flex items-center gap-2 rounded-[var(--radius-md)] px-5 py-2.5 text-sm font-semibold text-white overflow-hidden relative"
        style={{ background: 'var(--accent-gradient)', boxShadow: 'var(--shadow-glow)' }}
      >
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer" />
        <RotateCcw className="h-4 w-4 relative" />
        <span className="relative">Try Again</span>
      </button>
    </div>
  );
}
