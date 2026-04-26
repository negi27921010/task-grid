'use client';

import { cn } from '@/lib/utils/cn';
import { Clock } from 'lucide-react';
import type { TaskStatus, Priority, AgingStatus } from '@/lib/types';

/* ─── Base Badge ─── */

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-neutral-100 text-text',
  success: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  error:   'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30',
  info:    'bg-accent-soft text-[var(--accent)] border-[var(--accent)]/30',
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-xs font-medium',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

/* ─── Status Badge ─── */

const statusStyles: Record<TaskStatus, { className: string; label: string }> = {
  not_started: { className: 'bg-neutral-100 text-text-muted', label: 'Not Started' },
  in_progress: { className: 'bg-accent-soft text-[var(--accent)] border-[var(--accent)]/30', label: 'In Progress' },
  blocked: { className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30', label: 'Blocked' },
  completed: { className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30', label: 'Completed' },
  cancelled: { className: 'bg-neutral-100 text-text-muted line-through', label: 'Cancelled' },
};

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: TaskStatus;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const style = statusStyles[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium',
        style.className,
        className
      )}
      {...props}
    >
      {style.label}
    </span>
  );
}

/* ─── Priority Dot ─── */

const priorityColors: Record<Priority, string> = {
  P1: 'bg-red-500',
  P2: 'bg-pink-500',
  P3: 'bg-blue-500',
  P4: 'bg-neutral-200 dark:bg-neutral-700',
};

interface PriorityDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  priority: Priority;
  showLabel?: boolean;
}

const PRIORITY_LABEL_MAP: Record<Priority, string> = {
  P1: 'Critical',
  P2: 'High',
  P3: 'Medium',
  P4: 'Low',
};

export function PriorityDot({ priority, showLabel = false, className, ...props }: PriorityDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} {...props}>
      <span
        className={cn('h-2 w-2 shrink-0 rounded-full', priorityColors[priority])}
        aria-hidden="true"
      />
      {showLabel && (
        <span className="text-xs font-medium text-text-muted">
          {PRIORITY_LABEL_MAP[priority]}
        </span>
      )}
    </span>
  );
}

/* ─── Aging Badge ─── */

const agingStyles: Record<AgingStatus, { className: string; label: string }> = {
  overdue: { className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30', label: 'Overdue' },
  at_risk: { className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30', label: 'At Risk' },
  on_track: { className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30', label: 'On Track' },
  no_eta: { className: 'bg-neutral-100 text-text-muted', label: 'No ETA' },
  stale: { className: 'bg-neutral-100 text-text-muted', label: 'Stale' },
};

interface AgingBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: AgingStatus;
  label?: string;
}

export function AgingBadge({ status, label, className, ...props }: AgingBadgeProps) {
  const style = agingStyles[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-xs font-medium',
        style.className,
        className
      )}
      {...props}
    >
      {status === 'stale' && <Clock className="h-3 w-3" aria-hidden="true" />}
      {label ?? style.label}
    </span>
  );
}
