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
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
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
  not_started: { className: 'bg-slate-100 text-slate-600', label: 'Not Started' },
  in_progress: { className: 'bg-blue-50 text-blue-700 border-blue-200', label: 'In Progress' },
  blocked: { className: 'bg-red-50 text-red-700 border-red-200', label: 'Blocked' },
  completed: { className: 'bg-green-50 text-green-700 border-green-200', label: 'Completed' },
  cancelled: { className: 'bg-slate-100 text-slate-500 line-through', label: 'Cancelled' },
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
  P2: 'bg-orange-500',
  P3: 'bg-blue-500',
  P4: 'bg-slate-400',
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
        <span className="text-xs font-medium text-slate-600">
          {PRIORITY_LABEL_MAP[priority]}
        </span>
      )}
    </span>
  );
}

/* ─── Aging Badge ─── */

const agingStyles: Record<AgingStatus, { className: string; label: string }> = {
  overdue: { className: 'bg-red-50 text-red-700 border-red-200', label: 'Overdue' },
  at_risk: { className: 'bg-amber-50 text-amber-700 border-amber-200', label: 'At Risk' },
  on_track: { className: 'bg-green-50 text-green-700 border-green-200', label: 'On Track' },
  no_eta: { className: 'bg-slate-100 text-slate-500', label: 'No ETA' },
  stale: { className: 'bg-slate-100 text-slate-500', label: 'Stale' },
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
