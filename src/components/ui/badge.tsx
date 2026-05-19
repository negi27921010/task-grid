'use client';

import { cn } from '@/lib/utils/cn';
import { Clock } from 'lucide-react';
import type { TaskStatus, Priority, AgingStatus } from '@/lib/types';

/* ─── Base Badge ────────────────────────────────────────────────────────
 * Antigravity-aligned: pill radius, soft semantic background, color-matched
 * text. New `tone` is an alias of `variant` for forward-friendly naming;
 * the original `variant` prop continues to work unchanged.
 * ─────────────────────────────────────────────────────────────────────── */

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
type BadgeTone = BadgeVariant | 'accent' | 'danger' | 'neutral';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Alias of `variant` with extended vocabulary. Falls back to `variant` if both set. */
  tone?: BadgeTone;
}

const toneStyles: Record<BadgeTone, string> = {
  default:
    'bg-[var(--neutral-100)] text-text border-border-color',
  neutral:
    'bg-[var(--neutral-100)] text-text border-border-color',
  success:
    'bg-[rgba(0,185,92,0.10)] text-[var(--brand-green)] border-[rgba(0,185,92,0.22)] ' +
    'dark:bg-[rgba(0,185,92,0.16)] dark:text-[#1fd57e] dark:border-[rgba(0,185,92,0.28)]',
  warning:
    'bg-[rgba(251,188,4,0.12)] text-[#a06a00] border-[rgba(251,188,4,0.30)] ' +
    'dark:bg-[rgba(251,188,4,0.16)] dark:text-[var(--brand-yellow)] dark:border-[rgba(251,188,4,0.34)]',
  error:
    'bg-[rgba(252,65,61,0.10)] text-[var(--brand-red)] border-[rgba(252,65,61,0.24)] ' +
    'dark:bg-[rgba(252,65,61,0.16)] dark:text-[#ff6864] dark:border-[rgba(252,65,61,0.32)]',
  danger:
    'bg-[rgba(252,65,61,0.10)] text-[var(--brand-red)] border-[rgba(252,65,61,0.24)] ' +
    'dark:bg-[rgba(252,65,61,0.16)] dark:text-[#ff6864] dark:border-[rgba(252,65,61,0.32)]',
  info:
    'bg-accent-soft text-[var(--accent)] border-[rgba(var(--accent-rgb),0.22)]',
  accent:
    'bg-accent-soft text-[var(--accent)] border-[rgba(var(--accent-rgb),0.22)]',
};

export function Badge({ className, variant, tone, ...props }: BadgeProps) {
  const resolved: BadgeTone = (variant ?? tone ?? 'default');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-pill)] border px-2.5 py-0.5',
        'text-xs font-medium leading-none',
        toneStyles[resolved],
        className,
      )}
      {...props}
    />
  );
}

/* ─── Status Badge ───────────────────────────────────────────────────── */

const statusStyles: Record<TaskStatus, { className: string; label: string }> = {
  not_started: {
    className: 'bg-[var(--neutral-100)] text-text-muted border-border-color',
    label: 'Not Started',
  },
  in_progress: {
    className:
      'bg-accent-soft text-[var(--accent)] border-[rgba(var(--accent-rgb),0.22)]',
    label: 'In Progress',
  },
  blocked: {
    className:
      'bg-[rgba(252,65,61,0.10)] text-[var(--brand-red)] border-[rgba(252,65,61,0.24)] ' +
      'dark:bg-[rgba(252,65,61,0.16)] dark:text-[#ff6864] dark:border-[rgba(252,65,61,0.32)]',
    label: 'Blocked',
  },
  completed: {
    className:
      'bg-[rgba(0,185,92,0.10)] text-[var(--brand-green)] border-[rgba(0,185,92,0.22)] ' +
      'dark:bg-[rgba(0,185,92,0.16)] dark:text-[#1fd57e] dark:border-[rgba(0,185,92,0.28)]',
    label: 'Completed',
  },
  cancelled: {
    className:
      'bg-[var(--neutral-100)] text-text-muted line-through border-border-color',
    label: 'Cancelled',
  },
};

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: TaskStatus;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const style = statusStyles[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-pill)] border px-2.5 py-0.5',
        'text-xs font-medium leading-none',
        style.className,
        className,
      )}
      {...props}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {style.label}
    </span>
  );
}

/* ─── Priority Dot ───────────────────────────────────────────────────── */

const priorityColors: Record<Priority, string> = {
  P1: 'bg-[var(--brand-red)]',
  P2: 'bg-[#ec4899]',
  P3: 'bg-[var(--accent)]',
  P4: 'bg-[var(--text-faint)]',
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

export function PriorityDot({
  priority,
  showLabel = false,
  className,
  ...props
}: PriorityDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} {...props}>
      <span
        className={cn(
          'h-2 w-2 shrink-0 rounded-full ring-2 ring-[var(--surface)]/60',
          priorityColors[priority],
        )}
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

/* ─── Aging Badge ────────────────────────────────────────────────────── */

const agingStyles: Record<AgingStatus, { className: string; label: string }> = {
  overdue: {
    className:
      'bg-[rgba(252,65,61,0.10)] text-[var(--brand-red)] border-[rgba(252,65,61,0.24)] ' +
      'dark:bg-[rgba(252,65,61,0.16)] dark:text-[#ff6864] dark:border-[rgba(252,65,61,0.32)]',
    label: 'Overdue',
  },
  at_risk: {
    className:
      'bg-[rgba(251,188,4,0.12)] text-[#a06a00] border-[rgba(251,188,4,0.30)] ' +
      'dark:bg-[rgba(251,188,4,0.16)] dark:text-[var(--brand-yellow)] dark:border-[rgba(251,188,4,0.34)]',
    label: 'At Risk',
  },
  on_track: {
    className:
      'bg-[rgba(0,185,92,0.10)] text-[var(--brand-green)] border-[rgba(0,185,92,0.22)] ' +
      'dark:bg-[rgba(0,185,92,0.16)] dark:text-[#1fd57e] dark:border-[rgba(0,185,92,0.28)]',
    label: 'On Track',
  },
  no_eta: {
    className: 'bg-[var(--neutral-100)] text-text-muted border-border-color',
    label: 'No ETA',
  },
  stale: {
    className: 'bg-[var(--neutral-100)] text-text-muted border-border-color',
    label: 'Stale',
  },
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
        'inline-flex items-center gap-1 rounded-[var(--radius-pill)] border px-2.5 py-0.5',
        'text-xs font-medium leading-none',
        style.className,
        className,
      )}
      {...props}
    >
      {status === 'stale' && <Clock className="h-3 w-3" aria-hidden="true" />}
      {label ?? style.label}
    </span>
  );
}
