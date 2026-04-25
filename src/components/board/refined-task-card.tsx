'use client';

import { CalendarDays, MessageSquare, GripVertical } from 'lucide-react';
import { Avatar, PriorityTag } from '@/components/design-system';
import { cn } from '@/lib/utils/cn';
import type { Task, User } from '@/lib/types';
import { PRIORITY_META, STATUS_META } from './board-meta';

interface RefinedTaskCardProps {
  task: Task;
  owner?: User;
  isDragging?: boolean;
  onClick?: () => void;
  // dnd-kit listener spread point — passed by RefinedKanban so the whole
  // card (including the grip) is draggable while remaining clickable.
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  className?: string;
}

export function RefinedTaskCard({
  task,
  owner,
  isDragging = false,
  onClick,
  dragHandleProps,
  className,
}: RefinedTaskCardProps) {
  const priority = PRIORITY_META[task.priority];
  const status = STATUS_META[task.status];
  const isOverdue =
    task.aging_status === 'overdue' &&
    task.status !== 'completed' &&
    task.status !== 'cancelled';
  const eta = task.eta ? new Date(task.eta) : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative cursor-pointer rounded-lg border border-border-color bg-surface p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-px',
        isDragging && 'opacity-50',
        className,
      )}
    >
      {/* Status accent stripe */}
      <span
        aria-hidden="true"
        className="absolute inset-y-2 left-0 w-[3px] rounded-r"
        style={{ background: statusColor(status.tone) }}
      />

      {/* Drag grip — top right, fades in on hover */}
      <div
        {...dragHandleProps}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-1.5 top-1.5 cursor-grab rounded p-1 text-text-faint opacity-0 transition-opacity hover:bg-hover hover:text-text-muted group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Drag card"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      <div className="pl-2.5 pr-6">
        <p
          className={cn(
            'text-[13px] font-medium leading-snug text-text',
            task.status === 'completed' && 'text-text-muted line-through decoration-text-faint',
          )}
        >
          {task.title}
        </p>

        {/* Meta row */}
        <div className="mt-2.5 flex items-center gap-2">
          <PriorityTag
            label={priority.label}
            tone={priority.tone}
            level={priority.level}
            style="bar"
          />
          <span className="flex-1" />
          {eta && (
            <span
              className={cn(
                'flex items-center gap-1 text-[11px] tabular-nums',
                isOverdue ? 'font-semibold text-red-600 dark:text-red-300' : 'text-text-muted',
              )}
              title={isOverdue ? `Overdue · was due ${eta.toLocaleDateString()}` : eta.toLocaleDateString()}
            >
              <CalendarDays className="h-3 w-3" />
              {eta.toLocaleString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task.comments_count != null && task.comments_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-text-muted">
              <MessageSquare className="h-3 w-3" />
              {task.comments_count}
            </span>
          )}
          {owner && <Avatar fullName={owner.full_name} src={owner.avatar_url} size="sm" />}
        </div>
      </div>
    </div>
  );
}

function statusColor(tone: string): string {
  const map: Record<string, string> = {
    gray: '#94a3b8',
    blue: '#0073ea',
    red: '#dc2626',
    green: '#16a34a',
    neutral: '#64748b',
    amber: '#f59e0b',
    orange: '#f97316',
    purple: '#9333ea',
    indigo: '#6366f1',
  };
  return map[tone] ?? '#64748b';
}
