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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-red-50 p-4">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Something went wrong</h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">
        An unexpected error occurred. Please try again or contact support if the issue persists.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        <RotateCcw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}
