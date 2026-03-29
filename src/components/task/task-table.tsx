'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  ListTodo,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { Task } from '@/lib/types';
import type { SortField, SortDirection, SortConfig } from '@/lib/types/filters';
import { TaskRow } from './task-row';
import { InlineCreateRow } from './inline-create-row';

interface TaskTableProps {
  tasks: Task[];
  isLoading?: boolean;
  projectId?: string;
  sort?: SortConfig[];
  onSortToggle?: (field: SortField) => void;
  onSelectTask?: (taskId: string) => void;
  showProject?: boolean;
  projectsMap?: Record<string, string>;
  emptyTitle?: string;
  emptyDescription?: string;
}

interface ColumnDef {
  key: SortField | 'expand' | 'actions' | 'owner' | 'project' | 'comments';
  label: string;
  sortable: boolean;
  className?: string;
}

function getColumns(showProject: boolean): ColumnDef[] {
  const cols: ColumnDef[] = [
    { key: 'expand', label: '', sortable: false, className: 'w-8' },
    { key: 'priority', label: 'Priority', sortable: true, className: 'w-24' },
    { key: 'title', label: 'Task', sortable: true, className: 'min-w-[220px]' },
  ];
  if (showProject) {
    cols.push({ key: 'project', label: 'Project', sortable: false, className: 'w-40' });
  }
  cols.push(
    { key: 'status', label: 'Status', sortable: true, className: 'w-28' },
    { key: 'owner', label: 'Assignees', sortable: false, className: 'w-28' },
    { key: 'eta', label: 'Due Date', sortable: true, className: 'w-28' },
    { key: 'aging', label: 'Aging', sortable: true, className: 'w-24' },
    { key: 'comments', label: '', sortable: false, className: 'w-10' },
    { key: 'actions', label: '', sortable: false, className: 'w-8' },
  );
  return cols;
}

function sortTasks(tasks: Task[], field: SortField, direction: SortDirection): Task[] {
  const sorted = [...tasks];
  const dir = direction === 'asc' ? 1 : -1;
  sorted.sort((a, b) => {
    switch (field) {
      case 'priority':
        return (({ P1: 0, P2: 1, P3: 2, P4: 3 })[a.priority] - ({ P1: 0, P2: 1, P3: 2, P4: 3 })[b.priority]) * dir;
      case 'title':
        return a.title.localeCompare(b.title) * dir;
      case 'status':
        return (({ in_progress: 0, blocked: 1, not_started: 2, completed: 3, cancelled: 4 })[a.status] - ({ in_progress: 0, blocked: 1, not_started: 2, completed: 3, cancelled: 4 })[b.status]) * dir;
      case 'eta': {
        if (!a.eta && !b.eta) return 0;
        if (!a.eta) return 1 * dir;
        if (!b.eta) return -1 * dir;
        return (new Date(a.eta).getTime() - new Date(b.eta).getTime()) * dir;
      }
      case 'aging':
        return (({ overdue: 0, at_risk: 1, stale: 2, on_track: 3, no_eta: 4 })[a.aging_status ?? 'no_eta'] - ({ overdue: 0, at_risk: 1, stale: 2, on_track: 3, no_eta: 4 })[b.aging_status ?? 'no_eta']) * dir;
      case 'created_at':
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      case 'updated_at':
        return (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()) * dir;
      default:
        return 0;
    }
  });
  return sorted;
}

export function TaskTable({ tasks, isLoading, projectId, sort, onSortToggle, onSelectTask, showProject = false, projectsMap, emptyTitle, emptyDescription }: TaskTableProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: string } | null>(null);
  const [showCreateRow, setShowCreateRow] = useState(false);

  const handleExpand = useCallback((taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  }, []);

  const activeSort = sort?.[0] ?? null;
  const sortField = activeSort?.field ?? null;
  const sortDirection = activeSort?.direction ?? 'asc';
  const sortedTasks = useMemo(
    () => sortField ? sortTasks(tasks, sortField, sortDirection) : tasks,
    [tasks, sortField, sortDirection]
  );

  const columns = useMemo(() => getColumns(showProject), [showProject]);
  const resolvedProjectId = projectId ?? tasks[0]?.project_id ?? '';
  const colSpan = columns.length;

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {columns.map((col, i) => (
                <th key={i} className={cn('px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500', col.className)}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="px-3 py-3" />
                <td className="px-3 py-3"><Skeleton shape="circle" width={8} height={8} /></td>
                <td className="py-3 pr-3"><Skeleton width={160 + Math.random() * 120} height={14} /></td>
                {showProject && <td className="px-3 py-3"><Skeleton width={80} height={14} /></td>}
                <td className="px-3 py-3"><Skeleton width={72} height={22} shape="rectangle" /></td>
                <td className="px-3 py-3"><Skeleton shape="circle" width={24} height={24} /></td>
                <td className="px-3 py-3"><Skeleton width={56} height={14} /></td>
                <td className="px-3 py-3"><Skeleton width={56} height={22} shape="rectangle" /></td>
                <td className="px-3 py-3"><Skeleton width={16} height={16} shape="circle" /></td>
                <td className="px-3 py-3" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (tasks.length === 0 && !showCreateRow) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <EmptyState
          icon={ListTodo}
          title={emptyTitle ?? 'No tasks yet'}
          description={emptyDescription ?? 'Create your first task to get started with this project.'}
          actionLabel={projectId ? 'Add Task' : undefined}
          onAction={projectId ? () => setShowCreateRow(true) : undefined}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {columns.map((col, i) => {
                const isSorted = col.sortable && sortField === col.key;
                return (
                  <th
                    key={i}
                    className={cn(
                      'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500',
                      col.sortable && 'cursor-pointer select-none transition-colors hover:text-slate-700',
                      col.className
                    )}
                    onClick={col.sortable ? () => onSortToggle?.(col.key as SortField) : undefined}
                  >
                    {col.label && (
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.sortable && (
                          <span className="inline-flex text-slate-400">
                            {isSorted ? (
                              sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-30" />
                            )}
                          </span>
                        )}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map(task => (
              <TaskRow
                key={task.id}
                task={task}
                onExpand={handleExpand}
                isExpanded={expandedTasks.has(task.id)}
                editingCell={editingCell}
                onEditCell={setEditingCell}
                expandedTasks={expandedTasks}
                projectId={resolvedProjectId}
                onSelectTask={onSelectTask}
                showProject={showProject}
                projectName={projectsMap?.[task.project_id]}
              />
            ))}
            {showCreateRow && (
              <InlineCreateRow
                projectId={resolvedProjectId}
                onCancel={() => setShowCreateRow(false)}
                onCreated={() => setShowCreateRow(false)}
                colSpan={colSpan}
              />
            )}
          </tbody>
        </table>
      </div>

      {!showCreateRow && (
        <div className="border-t border-slate-100 px-3 py-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-1.5 text-slate-500 hover:text-slate-700"
            onClick={() => setShowCreateRow(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
        </div>
      )}
    </div>
  );
}
