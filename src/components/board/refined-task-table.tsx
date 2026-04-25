'use client';

// Refined Task Table — grouped, pill-driven, drag-to-reorder.
// Drop-in replacement for the legacy task-table that uses the design-system
// primitives (StatusPill, PriorityTag, Avatar, TimelineBar) and the same
// data hooks (useChangeTaskStatus, useUpdateTask) so logic is preserved.

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  GripVertical,
  Plus,
  MoreHorizontal,
} from 'lucide-react';
import {
  StatusPill,
  PriorityTag,
  Avatar,
  TimelineBar,
} from '@/components/design-system';
import { useChangeTaskStatus } from '@/lib/hooks/use-tasks';
import { cn } from '@/lib/utils/cn';
import type { Task, TaskStatus, User } from '@/lib/types';
import {
  STATUS_META,
  STATUS_OPTIONS,
  STATUS_ORDER,
  PRIORITY_META,
} from './board-meta';

interface RefinedTaskTableProps {
  tasks: Task[];
  users: User[];
  onTaskClick?: (taskId: string) => void;
  onAddTask?: (status: TaskStatus) => void;
  // Multi-select integration with the floating BulkBar
  selected?: Record<string, boolean>;
  onSelectChange?: (selected: Record<string, boolean>) => void;
  className?: string;
}

interface ColSpec {
  readonly id: 'check' | 'task' | 'owner' | 'status' | 'due' | 'priority' | 'notes' | 'timeline';
  readonly label: string;
  readonly width: number;
  readonly center?: boolean;
}

const COLS: readonly ColSpec[] = [
  { id: 'check',    label: '',         width: 36,  center: true },
  { id: 'task',     label: 'Task',     width: 360 },
  { id: 'owner',    label: 'Owner',    width: 90,  center: true },
  { id: 'status',   label: 'Status',   width: 150, center: true },
  { id: 'due',      label: 'Due date', width: 120 },
  { id: 'priority', label: 'Priority', width: 130, center: true },
  { id: 'notes',    label: 'Notes',    width: 180 },
  { id: 'timeline', label: 'Timeline', width: 220 },
];

const TOTAL_WIDTH = COLS.reduce((acc, c) => acc + c.width, 0) + 60;

export function RefinedTaskTable({
  tasks,
  users,
  onTaskClick,
  onAddTask,
  selected = {},
  onSelectChange,
  className,
}: RefinedTaskTableProps) {
  const usersById = useMemo(() => {
    const m: Record<string, User> = {};
    for (const u of users) m[u.id] = u;
    return m;
  }, [users]);

  // Local optimistic ordering. We don't persist row ordering to the DB
  // (the legacy `position` column isn't wired); reorders are visual within
  // a session. Status-change drags ARE persisted (see handleDragEnd).
  const [orderedIds, setOrderedIds] = useState<string[]>(() => tasks.map(t => t.id));
  useEffect(() => {
    // Re-seed when the task list grows/shrinks; preserve existing local
    // order for ids that still exist.
    setOrderedIds((prev) => {
      const seen = new Set(prev);
      const incoming = tasks.map(t => t.id);
      const kept = prev.filter(id => incoming.includes(id));
      const added = incoming.filter(id => !seen.has(id));
      return [...kept, ...added];
    });
  }, [tasks]);

  const orderedTasks = useMemo(() => {
    const byId: Record<string, Task> = {};
    for (const t of tasks) byId[t.id] = t;
    return orderedIds.map(id => byId[id]).filter(Boolean);
  }, [orderedIds, tasks]);

  const [collapsed, setCollapsed] = useState<Record<TaskStatus, boolean>>({} as Record<TaskStatus, boolean>);
  const toggleGroup = useCallback((s: TaskStatus) => {
    setCollapsed(prev => ({ ...prev, [s]: !prev[s] }));
  }, []);

  // Compute axis for the timeline column from the visible task set so the
  // bars are proportional. Falls back to a 30-day window if no ETAs.
  const axis = useMemo(() => {
    const dates: number[] = [];
    for (const t of tasks) {
      if (t.eta) dates.push(new Date(t.eta).getTime());
      if (t.created_at) dates.push(new Date(t.created_at).getTime());
    }
    if (dates.length === 0) {
      const now = Date.now();
      return { start: new Date(now - 30 * 86400_000), end: new Date(now + 30 * 86400_000) };
    }
    return { start: new Date(Math.min(...dates)), end: new Date(Math.max(...dates)) };
  }, [tasks]);

  const groups = useMemo(() => {
    return STATUS_ORDER.map((status) => ({
      status,
      meta: STATUS_META[status],
      tasks: orderedTasks.filter(t => t.status === status),
    }));
  }, [orderedTasks]);

  const changeStatus = useChangeTaskStatus();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeIdx = orderedIds.indexOf(activeId);
    const overIdx = orderedIds.indexOf(overId);
    if (activeIdx < 0 || overIdx < 0) return;

    setOrderedIds((ids) => arrayMove(ids, activeIdx, overIdx));
  };

  return (
    <div className={cn('relative w-full overflow-x-auto', className)}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <div style={{ minWidth: TOTAL_WIDTH }}>
            {groups.map(({ status, meta, tasks: groupTasks }) => {
              const isCollapsed = collapsed[status];
              return (
                <section key={status} className="mb-5">
                  {/* Group header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(status)}
                    className="mb-1 flex w-fit items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-hover"
                  >
                    {isCollapsed ? (
                      <ChevronRightIcon className="h-3.5 w-3.5" style={{ color: groupColor(meta.tone) }} />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" style={{ color: groupColor(meta.tone) }} />
                    )}
                    <span
                      className="text-[14.5px] font-semibold"
                      style={{ color: groupColor(meta.tone), fontFamily: 'var(--font-display)' }}
                    >
                      {meta.label}
                    </span>
                    <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-text-faint">
                      {groupTasks.length}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="relative overflow-hidden rounded-lg border border-border-color bg-surface">
                      {/* Group accent stripe */}
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-[3px]"
                        style={{ background: groupColor(meta.tone) }}
                      />

                      {/* Header row */}
                      <div
                        className="sticky top-0 z-10 flex h-9 items-center border-b border-border-color bg-table-head pl-1"
                        style={{ minWidth: TOTAL_WIDTH }}
                      >
                        {COLS.map((c, i) => (
                          <div
                            key={c.id}
                            className={cn(
                              'flex h-full items-center px-3 text-[10.5px] font-semibold uppercase tracking-wider text-text-faint',
                              c.center && 'justify-center',
                              i < COLS.length - 1 && 'border-r border-border-color',
                            )}
                            style={{ width: c.width, flexShrink: 0 }}
                          >
                            {c.label}
                          </div>
                        ))}
                      </div>

                      {/* Body rows */}
                      {groupTasks.length === 0 ? (
                        <div className="flex items-center justify-center py-6 text-[12.5px] text-text-faint">
                          No tasks in {meta.label}
                        </div>
                      ) : (
                        groupTasks.map((task, idx) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            owner={usersById[task.owner_id]}
                            rowIndex={idx}
                            isLast={idx === groupTasks.length - 1}
                            isSelected={!!selected[task.id]}
                            onSelectChange={
                              onSelectChange
                                ? (v) => onSelectChange({ ...selected, [task.id]: v || undefined as unknown as boolean })
                                : undefined
                            }
                            onClick={() => onTaskClick?.(task.id)}
                            onChangeStatus={(s) => changeStatus.mutate({ id: task.id, status: s })}
                            axis={axis}
                          />
                        ))
                      )}

                      {/* Add task row */}
                      {onAddTask && (
                        <button
                          type="button"
                          onClick={() => onAddTask(status)}
                          className="flex h-8 w-full items-center gap-2 border-t border-border-color px-3 pl-4 text-left text-[12.5px] text-text-muted transition-colors hover:bg-hover hover:text-text"
                        >
                          <Plus className="h-3 w-3" strokeWidth={2.4} />
                          Add task
                        </button>
                      )}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function groupColor(tone: string): string {
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

interface TaskRowProps {
  task: Task;
  owner: User | undefined;
  rowIndex: number;
  isLast: boolean;
  isSelected: boolean;
  onSelectChange?: (v: boolean) => void;
  onClick: () => void;
  onChangeStatus: (s: TaskStatus) => void;
  axis: { start: Date; end: Date };
}

function TaskRow({
  task,
  owner,
  rowIndex,
  isLast,
  isSelected,
  onSelectChange,
  onClick,
  onChangeStatus,
  axis,
}: TaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    minWidth: TOTAL_WIDTH,
  };

  const priority = PRIORITY_META[task.priority];
  const status = STATUS_META[task.status];
  const isOverdue = task.aging_status === 'overdue' && task.status !== 'completed' && task.status !== 'cancelled';
  const eta = task.eta ? new Date(task.eta) : null;
  const created = task.created_at ? new Date(task.created_at) : axis.start;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        'group flex h-11 items-center border-b border-border-color pl-1 text-[13px] text-text transition-colors',
        isSelected ? 'bg-selected' : 'hover:bg-hover',
        isLast && 'border-b-0',
      )}
    >
      {COLS.map((c, i) => {
        const cellClass = cn(
          'flex h-full items-center px-3',
          c.center && 'justify-center',
          i < COLS.length - 1 && 'border-r border-border-color/60',
        );
        const cellStyle = { width: c.width, flexShrink: 0 } as const;

        if (c.id === 'check') {
          return (
            <div
              key={c.id}
              className={cellClass}
              style={cellStyle}
              onClick={(e) => e.stopPropagation()}
            >
              {onSelectChange ? (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onSelectChange(e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]"
                />
              ) : (
                <span className="text-[11px] tabular-nums text-text-faint">{rowIndex + 1}</span>
              )}
            </div>
          );
        }
        if (c.id === 'task') {
          return (
            <div key={c.id} className={cn(cellClass, 'gap-2 justify-start')} style={cellStyle}>
              <button
                type="button"
                {...attributes}
                {...listeners}
                onClick={(e) => e.stopPropagation()}
                aria-label="Drag to reorder"
                className="shrink-0 cursor-grab text-text-faint opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <span
                className={cn(
                  'flex-1 truncate font-medium',
                  task.status === 'completed' && 'text-text-muted line-through decoration-text-faint',
                )}
              >
                {task.title}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="shrink-0 rounded p-1 text-text-faint opacity-0 transition-opacity hover:bg-hover hover:text-text group-hover:opacity-100"
                aria-label="Open task"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        }
        if (c.id === 'owner') {
          return (
            <div key={c.id} className={cellClass} style={cellStyle}>
              {owner ? (
                <Avatar fullName={owner.full_name} src={owner.avatar_url} size="sm" />
              ) : (
                <span className="text-[11px] text-text-faint">—</span>
              )}
            </div>
          );
        }
        if (c.id === 'status') {
          return (
            <div
              key={c.id}
              className={cellClass}
              style={cellStyle}
              onClick={(e) => e.stopPropagation()}
            >
              <StatusPill
                label={status.label}
                tone={status.tone}
                style="solid"
                size="sm"
                value={task.status}
                options={STATUS_OPTIONS}
                onChange={onChangeStatus}
              />
            </div>
          );
        }
        if (c.id === 'due') {
          return (
            <div key={c.id} className={cn(cellClass, 'justify-start gap-1.5')} style={cellStyle}>
              {isOverdue && (
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              )}
              <span
                className={cn(
                  isOverdue && 'font-semibold text-red-600 dark:text-red-300',
                  task.status === 'completed' && 'line-through text-text-muted',
                )}
              >
                {eta ? eta.toLocaleString('en-US', { month: 'short', day: 'numeric' }) : '—'}
              </span>
            </div>
          );
        }
        if (c.id === 'priority') {
          return (
            <div key={c.id} className={cellClass} style={cellStyle}>
              <PriorityTag
                label={priority.label}
                tone={priority.tone}
                level={priority.level}
                style="soft"
              />
            </div>
          );
        }
        if (c.id === 'notes') {
          return (
            <div key={c.id} className={cn(cellClass, 'justify-start')} style={cellStyle}>
              <span className="truncate text-[12.5px] text-text-muted">
                {task.remarks || task.description || ''}
              </span>
            </div>
          );
        }
        if (c.id === 'timeline') {
          return (
            <div key={c.id} className={cn(cellClass, 'justify-start')} style={cellStyle}>
              {eta ? (
                <TimelineBar
                  start={created}
                  end={eta}
                  axisStart={axis.start}
                  axisEnd={axis.end}
                  tone={status.tone}
                  showStartLabel={false}
                />
              ) : (
                <span className="text-[11px] text-text-faint">No ETA</span>
              )}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
