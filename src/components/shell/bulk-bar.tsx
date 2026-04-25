'use client';

import { X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface BulkAction {
  id: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

interface BulkBarProps {
  count: number;
  actions: BulkAction[];
  onClear: () => void;
  className?: string;
}

export function BulkBar({ count, actions, onClear, className }: BulkBarProps) {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 z-40 -translate-x-1/2',
        'flex items-center gap-3.5 rounded-full bg-text px-4 py-2 pl-4 pr-2 text-surface',
        'shadow-[0_12px_40px_rgba(0,0,0,0.25)] ring-1 ring-black/10',
        'animate-in slide-in-from-bottom-2 fade-in-0 duration-200',
        className,
      )}
      role="region"
      aria-label="Bulk actions"
    >
      <span className="text-[13px] font-medium">
        <span className="font-semibold">{count}</span> selected
      </span>
      <div className="h-[18px] w-px bg-white/15" aria-hidden="true" />
      {actions.map((a) => {
        const IconComponent = a.icon;
        return (
          <button
            key={a.id}
            type="button"
            onClick={a.onClick}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2 py-1 text-[12.5px] font-medium transition-colors',
              'hover:bg-white/12',
              a.destructive && 'text-red-300 hover:bg-red-500/20 hover:text-red-200',
            )}
          >
            <IconComponent className="h-3.5 w-3.5" />
            {a.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/12 text-surface transition-colors hover:bg-white/20"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
