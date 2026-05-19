'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Input — bumped to 40px (was 36) for Antigravity-style generous chrome.
 * `size` is additive; default (md) renders identically to v1 except for
 * the height bump. Old callers continue to work.
 */
type InputSize = 'sm' | 'md' | 'lg';

interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  size?: InputSize;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-8 px-2.5 text-xs rounded-[var(--radius-sm)]',
  md: 'h-10 px-3.5 text-sm rounded-[var(--radius-md)]',
  lg: 'h-12 px-4 text-base rounded-[var(--radius-md)]',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, size = 'md', ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-text leading-none"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full border border-border-color bg-surface text-text shadow-[var(--shadow-xs)]',
            'placeholder:text-text-faint',
            'hover:border-border-strong',
            'focus:border-[var(--accent)] focus:outline-none focus:ring-[3px] focus:ring-[var(--accent-glow)]',
            'disabled:cursor-not-allowed disabled:bg-hover disabled:opacity-60',
            sizeClasses[size],
            error &&
              'border-[var(--brand-red)]/60 focus:border-[var(--brand-red)] focus:ring-[rgba(252,65,61,0.20)]',
            className,
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-xs text-[var(--brand-red)] animate-fade-in-up leading-tight"
          >
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
