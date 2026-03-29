'use client';

import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/avatar';
import { PriorityDot, AgingBadge } from '@/components/ui/badge';
import { useUsers } from '@/lib/hooks/use-users';
import { computeAgingStatus, getAgingLabel } from '@/lib/utils/aging';
import { formatDate } from '@/lib/utils/dates';
import type { Task, Priority } from '@/lib/types';
import { Calendar } from 'lucide-react';

/* ─── Priority border colors ─── */

const PRIORITY_BORDER: Record<Priority, string> = {
  P1: 'border-l-red-500',
  P2: 'border-l-pink-500',
  P3: 'border-l-blue-500',
  P4: 'border-l-slate-400',
};

/* ─── Props ─── */

interface TaskCardProps {
  task: Task;
  onSelectTask?: (taskId: string) => void;
}

export function TaskCard({ task, onSelectTask }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: { status: task.status },
  });

  const { data: users } = useUsers();
  const assignees = (users ?? []).filter(u => (task.assignee_ids ?? []).includes(u.id));
  const owner = users?.find(u => u.id === task.owner_id);
  const displayUsers = assignees.length > 0 ? assignees : owner ? [owner] : [];

  const agingStatus = task.aging_status ?? computeAgingStatus(task);
  const agingLabel = getAgingLabel(task);
  const isCompleted = task.status === 'completed' || task.status === 'cancelled';

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'group cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md',
        'border-l-[3px]',
        PRIORITY_BORDER[task.priority],
        isDragging && 'z-50 rotate-2 opacity-50 shadow-lg',
        isCompleted && 'opacity-60'
      )}
    >
      {/* Top row: priority dot + aging badge */}
      <div className="mb-2 flex items-center justify-between">
        <PriorityDot priority={task.priority} showLabel />
        {agingStatus !== 'on_track' || task.eta ? (
          <AgingBadge status={agingStatus} label={agingLabel} />
        ) : null}
      </div>

      {/* Title */}
      <p
        className={cn(
          'mb-2 line-clamp-2 text-sm font-medium text-slate-900 cursor-pointer hover:text-blue-600',
          isCompleted && 'line-through text-slate-500'
        )}
        title="Click to open details"
        onClick={(e) => { e.stopPropagation(); onSelectTask?.(task.id); }}
      >
        {task.title}
      </p>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
              +{task.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Bottom row: assignees + ETA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {displayUsers.length > 0 ? (
            <div className="flex -space-x-1.5">
              {displayUsers.slice(0, 3).map(u => (
                <Avatar key={u.id} src={u.avatar_url} fullName={u.full_name} size="sm" />
              ))}
              {displayUsers.length > 3 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[9px] font-semibold text-slate-600 ring-2 ring-white">
                  +{displayUsers.length - 3}
                </span>
              )}
            </div>
          ) : (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-400">
              ?
            </span>
          )}
        </div>

        {task.eta && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="h-3 w-3" />
            {formatDate(task.eta)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Static card for DragOverlay (no hooks) ─── */

interface TaskCardOverlayProps {
  task: Task;
  ownerName?: string;
}

export function TaskCardOverlay({ task, ownerName }: TaskCardOverlayProps) {
  const agingStatus = task.aging_status ?? computeAgingStatus(task);
  const agingLabel = getAgingLabel(task);
  const isCompleted = task.status === 'completed' || task.status === 'cancelled';

  return (
    <div
      className={cn(
        'w-[272px] rotate-2 cursor-grabbing rounded-lg border border-slate-200 bg-white p-3 shadow-xl',
        'border-l-[3px]',
        PRIORITY_BORDER[task.priority],
        isCompleted && 'opacity-60'
      )}
    >
      {/* Top row */}
      <div className="mb-2 flex items-center justify-between">
        <PriorityDot priority={task.priority} showLabel />
        {agingStatus !== 'on_track' || task.eta ? (
          <AgingBadge status={agingStatus} label={agingLabel} />
        ) : null}
      </div>

      {/* Title */}
      <p
        className={cn(
          'mb-2 line-clamp-2 text-sm font-medium text-slate-900',
          isCompleted && 'line-through text-slate-500'
        )}
      >
        {task.title}
      </p>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">
              +{task.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {ownerName ? (
            <span className="max-w-[80px] truncate text-xs text-slate-500">
              {ownerName.split(' ')[0]}
            </span>
          ) : (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-400">
              ?
            </span>
          )}
        </div>

        {task.eta && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="h-3 w-3" />
            {formatDate(task.eta)}
          </span>
        )}
      </div>
    </div>
  );
}
