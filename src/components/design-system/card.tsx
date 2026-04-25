'use client';

import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface DSCardProps {
  title: string;
  subtitle?: string;
  pad?: number;          // px
  className?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

export function DSCard({
  title, subtitle, pad = 20, className, rightSlot, children,
}: DSCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border-color bg-surface',
        className,
      )}
      style={{ padding: pad }}
    >
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p
            className="truncate text-[14.5px] font-semibold tracking-tight text-text"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </p>
          {subtitle && (
            <p className="mt-0.5 truncate text-[11.5px] text-text-muted">{subtitle}</p>
          )}
        </div>
        {rightSlot ?? (
          <button
            type="button"
            aria-label="Card actions"
            className="rounded p-1 text-text-faint transition-colors hover:bg-hover hover:text-text"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
