'use client';

import { useState, useCallback } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/avatar';
import { PriorityDot, AgingBadge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { StatusSelect } from './status-select';
import { BlockerReasonDialog } from './blocker-reason-dialog';
import { useChildTasks, useChangeTaskStatus } from '@/lib/hooks/use-tasks';
import { useUsers } from '@/lib/hooks/use-users';
import { computeAgingStatus, getAgingLabel } from '@/lib/utils/aging';
import { formatDate } from '@/lib/utils/dates';
import type { Task, TaskStatus, AgingStatus } from '@/lib/types';

const AGING_BORDER_COLORS: Record<AgingStatus, string> = {
  overdue: 'border-l-red-500',
  at_risk: 'border-l-amber-500',
  on_track: 'border-l-emerald-500',
  no_eta: 'border-l-transparent',
  stale: 'border-l-slate-400',
};

interface HybridListItemProps {
  task: Task;
  depth?: number;
  onSelectTask?: (taskId: string) => void;
}

export function HybridListItem({ task, depth = 0, onSelectTask }: HybridListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [blockerOpen, setBlockerOpen] = useState(false);

  const hasChildren = (task.children_count ?? 0) > 0;
  const { data: children, isLoading: childrenLoading } = useChildTasks(
    task.id,
    isExpanded && hasChildren
  );
  const changeStatus = useChangeTaskStatus();
  const { data: users } = useUsers();

  const agingStatus = task.aging_status ?? computeAgingStatus(task);
  const agingLabel = getAgingLabel(task);
  const isCompleted = task.status === 'completed' || task.status === 'cancelled';
  const owner = users?.find((u) => u.id === task.owner_id);
  const borderColor = AGING_BORDER_COLORS[agingStatus];

  const handleToggle = useCallback(() => {
    if (hasChildren) {
      setIsExpanded((prev) => !prev);
    }
  }, [hasChildren]);

  const handleStatusChange = useCallback(
    (status: TaskStatus) => {
      if (status === 'blocked') {
        setBlockerOpen(true);
        return;
      }
      if (status === 'completed' && hasChildren) {
        const childrenDone = (children ?? []).every(c => c.status === 'completed' || c.status === 'cancelled');
        if (!childrenDone) return;
      }
      changeStatus.mutate({ id: task.id, status });
    },
    [changeStatus, task.id, hasChildren, children]
  );

  const handleBlockerConfirm = useCallback(
    (reason: string) => {
      changeStatus.mutate({ id: task.id, status: 'blocked', metadata: { blocker_reason: reason } });
    },
    [changeStatus, task.id]
  );

  return (
    <div>
      {/* Header row - always visible */}
      <div
        className={cn(
          'group flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 transition-colors hover:bg-slate-50/80',
          'border-l-4',
          borderColor,
          isCompleted && 'opacity-60'
        )}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        {/* Expand chevron */}
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors',
            hasChildren
              ? 'text-slate-400 hover:bg-slate-200 hover:text-slate-600'
              : 'pointer-events-none'
          )}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          tabIndex={hasChildren ? 0 : -1}
        >
          {hasChildren && (
            <ChevronRight
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isExpanded && 'rotate-90'
              )}
            />
          )}
        </button>

        {/* Priority dot */}
        <PriorityDot priority={task.priority} />

        {/* Title - takes remaining space */}
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm font-medium text-slate-900',
            isCompleted && 'line-through text-slate-500',
            onSelectTask && 'cursor-pointer hover:text-blue-600'
          )}
          title={task.title}
          onClick={() => onSelectTask?.(task.id)}
        >
          {task.title}
        </span>

        {/* Status chip */}
        <div className="shrink-0">
          <StatusSelect
            currentStatus={task.status}
            onStatusChange={handleStatusChange}
          />
        </div>

        {/* Owner avatar */}
        <div className="shrink-0">
          {owner ? (
            <Tooltip content={owner.full_name}>
              <span>
                <Avatar
                  src={owner.avatar_url}
                  fullName={owner.full_name}
                  size="sm"
                />
              </span>
            </Tooltip>
          ) : (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-400">
              ?
            </span>
          )}
        </div>

        {/* ETA */}
        <span
          className={cn(
            'shrink-0 text-xs',
            task.eta ? 'text-slate-600' : 'text-slate-400'
          )}
        >
          {task.eta ? formatDate(task.eta) : 'No ETA'}
        </span>

        {/* Aging badge */}
        <div className="shrink-0">
          <AgingBadge status={agingStatus} label={agingLabel} />
        </div>
      </div>

      {/* Children section - expandable */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-in-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          {isExpanded && hasChildren && (
            <div
              className="border-l-2 border-slate-200"
              style={{ marginLeft: `${20 + depth * 20}px` }}
            >
              {childrenLoading ? (
                <div className="space-y-1 py-2 pl-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2"
                    >
                      <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
                      <div className="h-2 w-2 animate-pulse rounded-full bg-slate-200" />
                      <div
                        className="h-4 animate-pulse rounded bg-slate-200"
                        style={{ width: `${[150, 180][i - 1] ?? 160}px` }}
                      />
                    </div>
                  ))}
                </div>
              ) : children && children.length > 0 ? (
                children.map((child) => (
                  <HybridListItem
                    key={child.id}
                    task={child}
                    depth={depth + 1}
                    onSelectTask={onSelectTask}
                  />
                ))
              ) : null}
            </div>
          )}
        </div>
      </div>
      <BlockerReasonDialog
        open={blockerOpen}
        onOpenChange={setBlockerOpen}
        onConfirm={handleBlockerConfirm}
      />
    </div>
  );
}
