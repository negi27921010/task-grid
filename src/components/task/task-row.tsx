'use client';

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/avatar';
import { AgingBadge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { useUpdateTask, useChangeTaskStatus, useDeleteTask, useChildTasks } from '@/lib/hooks/use-tasks';
import { useUsers } from '@/lib/hooks/use-users';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { computeAgingStatus, getAgingLabel } from '@/lib/utils/aging';
import { canCompleteTask } from '@/lib/utils/status';
import { can } from '@/lib/utils/permissions';
import { getTaskDepthLabel, STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types/task';
import { formatDate, formatRelative } from '@/lib/utils/dates';
import type { Task, TaskStatus, Priority, AgingStatus } from '@/lib/types';
import { PrioritySelect } from './priority-select';
import { StatusSelect } from './status-select';
import { OwnerSelect } from './owner-select';
import { TaskRowMenu } from './task-row-menu';
import { DeleteDialog } from './delete-dialog';
import { BlockerReasonDialog } from './blocker-reason-dialog';
import { InlineCreateRow } from './inline-create-row';
import { TaskChildren } from './task-children';

const AGING_BORDER_COLORS: Record<AgingStatus, string> = {
  overdue: 'border-l-red-500',
  at_risk: 'border-l-amber-500',
  on_track: 'border-l-emerald-500',
  no_eta: '',
  stale: '',
};

interface TaskRowProps {
  task: Task;
  onExpand: (taskId: string) => void;
  isExpanded: boolean;
  editingCell: { taskId: string; field: string } | null;
  onEditCell: (cell: { taskId: string; field: string } | null) => void;
  expandedTasks: Set<string>;
  projectId: string;
  isLastChild?: boolean;
  onSelectTask?: (taskId: string) => void;
  showProject?: boolean;
  projectName?: string;
}

export const TaskRow = memo(function TaskRow({
  task,
  onExpand,
  isExpanded,
  editingCell,
  onEditCell,
  expandedTasks,
  projectId,
  isLastChild = false,
  onSelectTask,
  showProject,
  projectName,
}: TaskRowProps) {
  const [editTitle, setEditTitle] = useState(task.title);
  const [editEta, setEditEta] = useState(task.eta ?? '');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [blockerOpen, setBlockerOpen] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const etaInputRef = useRef<HTMLInputElement>(null);

  const updateTask = useUpdateTask();
  const changeStatus = useChangeTaskStatus();
  const deleteTask = useDeleteTask();
  const { data: users } = useUsers();
  const { currentUser } = useCurrentUser();
  const hasChildren = (task.children_count ?? 0) > 0;
  const { data: children } = useChildTasks(task.id, hasChildren);

  const agingStatus = task.aging_status ?? computeAgingStatus(task);
  const agingLabel = getAgingLabel(task);
  const isCompleted = task.status === 'completed' || task.status === 'cancelled';
  const isBlocked = task.status === 'blocked';
  const depth = task.depth ?? 0;
  const depthLabel = getTaskDepthLabel(depth);

  const isEditingTitle = editingCell?.taskId === task.id && editingCell.field === 'title';
  const isEditingEta = editingCell?.taskId === task.id && editingCell.field === 'eta';

  const assignees = (users ?? []).filter(u => (task.assignee_ids ?? []).includes(u.id));
  const primaryOwner = users?.find(u => u.id === task.owner_id);
  const displayUsers = assignees.length > 0 ? assignees : primaryOwner ? [primaryOwner] : [];
  const borderColor = AGING_BORDER_COLORS[agingStatus];

  const canEditAll = can(currentUser, 'canModifyAllTaskFields');
  const canEditStatus = can(currentUser, 'canUpdateTaskStatus');
  const canEditEta = can(currentUser, 'canUpdateTaskEta');
  const canDelete = can(currentUser, 'canDeleteTasks');

  useEffect(() => {
    if (isEditingTitle) {
      setEditTitle(task.title);
      requestAnimationFrame(() => titleInputRef.current?.focus());
    }
  }, [isEditingTitle, task.title]);

  useEffect(() => {
    if (isEditingEta) {
      setEditEta(task.eta ?? '');
      requestAnimationFrame(() => etaInputRef.current?.focus());
    }
  }, [isEditingEta, task.eta]);

  const handleTitleSave = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask.mutate({ id: task.id, updates: { title: trimmed } });
    }
    onEditCell(null);
  }, [editTitle, task.title, task.id, updateTask, onEditCell]);

  const handleEtaSave = useCallback(() => {
    const newEta = editEta || null;
    if (newEta !== task.eta) {
      updateTask.mutate({ id: task.id, updates: { eta: newEta } });
    }
    onEditCell(null);
  }, [editEta, task.eta, task.id, updateTask, onEditCell]);

  const handleStatusChange = (status: TaskStatus) => {
    if (status === 'blocked') { setBlockerOpen(true); return; }
    if (status === 'completed' && hasChildren && children) {
      const check = canCompleteTask(task, children);
      if (!check.allowed) { alert(check.reason); return; }
    }
    changeStatus.mutate({ id: task.id, status });
  };

  const handleBlockerConfirm = (reason: string) => {
    changeStatus.mutate({ id: task.id, status: 'blocked', metadata: { blocker_reason: reason } });
  };

  const handlePriorityChange = (priority: Priority) => {
    updateTask.mutate({ id: task.id, updates: { priority } });
  };

  const handleOwnerChange = (ownerId: string) => {
    updateTask.mutate({ id: task.id, updates: { owner_id: ownerId } });
  };

  const handleAssigneesChange = useCallback((ids: string[]) => {
    const primaryOwner = ids.includes(task.owner_id) ? task.owner_id : ids[0];
    updateTask.mutate({
      id: task.id,
      updates: {
        owner_id: primaryOwner ?? task.owner_id,
        assignee_ids: ids,
      } as Partial<Task>,
    });
  }, [task.id, task.owner_id, updateTask]);

  const handleDeleteConfirm = (mode: 'cascade' | 'promote') => {
    deleteTask.mutate({ id: task.id, mode });
    setDeleteOpen(false);
  };

  const tooltipContent = (
    <div className="space-y-1">
      <p className="font-semibold">{task.title}</p>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px]">
        <span className="text-slate-400">Status</span><span>{STATUS_LABELS[task.status]}</span>
        <span className="text-slate-400">Priority</span><span>{PRIORITY_LABELS[task.priority]}</span>
        <span className="text-slate-400">Assignees</span><span>{displayUsers.map(u => u.full_name).join(', ') || 'Unassigned'}</span>
        <span className="text-slate-400">Due</span><span>{task.eta ? formatDate(task.eta) : 'Not set'}</span>
        <span className="text-slate-400">Created</span><span>{formatRelative(task.created_at)}</span>
      </div>
    </div>
  );

  return (
    <>
      <Tooltip content={tooltipContent} side="bottom" delayDuration={500}>
        <tr
          className={cn(
            'group/row border-b border-slate-100 transition-colors hover:bg-slate-50/80',
            borderColor && `border-l-4 ${borderColor}`,
            !borderColor && 'border-l-4 border-l-transparent',
            isCompleted && 'opacity-50',
            isBlocked && 'bg-red-50/30'
          )}
        >
          {/* Expand/collapse */}
          <td className="w-8 px-2 py-2 text-center">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => onExpand(task.id)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
              >
                <ChevronRight className={cn('h-3.5 w-3.5 transition-transform duration-150', isExpanded && 'rotate-90')} />
              </button>
            ) : (
              <span className="inline-block w-6" />
            )}
          </td>

          {/* Priority */}
          <td className="px-2 py-2">
            {canEditAll ? (
              <PrioritySelect currentPriority={task.priority} onPriorityChange={handlePriorityChange} />
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', task.priority === 'P1' && 'bg-red-500', task.priority === 'P2' && 'bg-orange-500', task.priority === 'P3' && 'bg-blue-500', task.priority === 'P4' && 'bg-slate-400')} />
                <span className="text-slate-600">{PRIORITY_LABELS[task.priority]}</span>
              </span>
            )}
          </td>

          {/* Title */}
          <td className="min-w-[220px] py-2 pr-3">
            <div className="flex items-center" style={{ paddingLeft: `${depth * 24}px` }}>
              {depth > 0 && (
                <span className="mr-1.5 shrink-0 rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold text-slate-500 uppercase">
                  {depthLabel}
                </span>
              )}
              {isEditingTitle && canEditAll ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleTitleSave(); } else if (e.key === 'Escape') { e.preventDefault(); onEditCell(null); } }}
                  onBlur={handleTitleSave}
                  className="w-full rounded-md border border-blue-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              ) : (
                <span
                  className={cn('cursor-pointer truncate text-sm font-medium text-slate-800 hover:text-blue-600', isCompleted && 'line-through text-slate-400')}
                  onClick={() => onSelectTask?.(task.id)}
                  onDoubleClick={e => { e.stopPropagation(); if (canEditAll) onEditCell({ taskId: task.id, field: 'title' }); }}
                >
                  {task.title}
                </span>
              )}
            </div>
          </td>

          {/* Project (optional) */}
          {showProject && (
            <td className="px-3 py-2">
              <span className="inline-flex max-w-[140px] truncate rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {projectName ?? '—'}
              </span>
            </td>
          )}

          {/* Status */}
          <td className="px-3 py-2">
            <StatusSelect currentStatus={task.status} onStatusChange={handleStatusChange} disabled={!canEditStatus} />
          </td>

          {/* Assignees */}
          <td className="px-3 py-2">
            {canEditAll ? (
              <OwnerSelect
                currentOwnerId={task.owner_id}
                assigneeIds={task.assignee_ids}
                onOwnerChange={handleOwnerChange}
                onAssigneesChange={handleAssigneesChange}
                compact
                multi
              />
            ) : (
              <div className="flex -space-x-1.5">
                {displayUsers.slice(0, 3).map(u => (
                  <Tooltip key={u.id} content={`${u.full_name} (${u.department})`}>
                    <span><Avatar src={u.avatar_url} fullName={u.full_name} size="sm" /></span>
                  </Tooltip>
                ))}
                {displayUsers.length > 3 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[9px] font-semibold text-slate-600 ring-2 ring-white">
                    +{displayUsers.length - 3}
                  </span>
                )}
                {displayUsers.length === 0 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-400">?</span>
                )}
              </div>
            )}
          </td>

          {/* ETA */}
          <td className="whitespace-nowrap px-3 py-2">
            {isEditingEta && canEditEta ? (
              <input
                ref={etaInputRef}
                type="date"
                value={editEta ? editEta.split('T')[0] : ''}
                onChange={e => setEditEta(e.target.value ? new Date(e.target.value).toISOString() : '')}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleEtaSave(); } else if (e.key === 'Escape') { e.preventDefault(); onEditCell(null); } }}
                onBlur={handleEtaSave}
                className="w-28 rounded-md border border-blue-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            ) : (
              <button
                type="button"
                onClick={() => { if (canEditEta) onEditCell({ taskId: task.id, field: 'eta' }); }}
                disabled={!canEditEta}
                className={cn('rounded-md px-2 py-1 text-xs transition-colors', canEditEta && 'hover:bg-slate-100', task.eta ? 'text-slate-700' : 'text-slate-400')}
              >
                {task.eta ? formatDate(task.eta) : 'Set date'}
              </button>
            )}
          </td>

          {/* Aging */}
          <td className="px-3 py-2">
            <AgingBadge status={agingStatus} label={agingLabel} />
          </td>

          {/* Actions */}
          <td className="w-8 px-2 py-2 text-center">
            <TaskRowMenu task={task} onAddSubtask={() => setAddingSubtask(true)} onDelete={canDelete ? () => setDeleteOpen(true) : undefined} />
          </td>
        </tr>
      </Tooltip>

      {isExpanded && hasChildren && (
        <TaskChildren
          parentId={task.id}
          projectId={projectId}
          editingCell={editingCell}
          onEditCell={onEditCell}
          expandedTasks={expandedTasks}
          onExpand={onExpand}
          onSelectTask={onSelectTask}
          showProject={showProject}
          projectName={projectName}
        />
      )}

      {addingSubtask && (
        <InlineCreateRow
          projectId={projectId}
          parentId={task.id}
          depth={depth + 1}
          onCancel={() => setAddingSubtask(false)}
          onCreated={() => setAddingSubtask(false)}
        />
      )}

      <DeleteDialog task={task} childrenCount={task.children_count ?? 0} open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={handleDeleteConfirm} />
      <BlockerReasonDialog open={blockerOpen} onOpenChange={setBlockerOpen} onConfirm={handleBlockerConfirm} />
    </>
  );
});
