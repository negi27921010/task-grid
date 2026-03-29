'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils/cn';
import { TaskCard } from './task-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Task, TaskStatus } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';

/* ─── Column accent colors ─── */

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  not_started: 'bg-gray-400',
  in_progress: 'bg-blue-500',
  blocked: 'bg-red-500',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-400',
};

const COLUMN_COUNT_BG: Record<TaskStatus, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-50 text-blue-700',
  blocked: 'bg-red-50 text-red-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

/* ─── Props ─── */

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  isLoading?: boolean;
  onSelectTask?: (taskId: string) => void;
}

export function KanbanColumn({ status, tasks, isLoading, onSelectTask }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div className="flex w-[300px] shrink-0 flex-col">
      {/* Accent bar */}
      <div className={cn('h-1 rounded-t-lg', COLUMN_ACCENT[status])} />

      {/* Column container */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-1 flex-col rounded-b-lg border border-t-0 border-gray-200 bg-gray-50/50 transition-colors',
          isOver && 'border-blue-300 bg-blue-50/40'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <h3 className="text-sm font-semibold text-gray-700">
            {STATUS_LABELS[status]}
          </h3>
          <span
            className={cn(
              'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium',
              COLUMN_COUNT_BG[status]
            )}
          >
            {tasks.length}
          </span>
        </div>

        {/* Card list */}
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : tasks.length === 0 ? (
            <div className="flex flex-1 items-center justify-center py-8">
              <p className="text-xs text-gray-400">No tasks</p>
            </div>
          ) : (
            tasks.map((task) => <TaskCard key={task.id} task={task} onSelectTask={onSelectTask} />)
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton Card ─── */

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <Skeleton shape="circle" width={8} height={8} />
        <Skeleton width={60} height={18} className="rounded-full" />
      </div>
      <Skeleton className="mb-1.5" width="90%" height={14} />
      <Skeleton className="mb-3" width="60%" height={14} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Skeleton shape="circle" width={24} height={24} />
          <Skeleton width={48} height={12} />
        </div>
        <Skeleton width={48} height={12} />
      </div>
    </div>
  );
}
