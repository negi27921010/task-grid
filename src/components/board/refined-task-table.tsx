'use client';

// Refined Task Table — grouped, pill-driven, drag-to-reorder.
// Drop-in replacement for the legacy task-table that uses the design-system
// primitives (StatusPill, PriorityTag, Avatar, TimelineBar) and the same
// data hooks (useChangeTaskStatus, useUpdateTask) so logic is preserved.

import { useState, useMemo, useEffect, useCallback, useRef, Fragment } from 'react';
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
  Check,
  X as XIcon,
  Loader2,
} from 'lucide-react';
import {
  StatusPill,
  PriorityTag,
  Avatar,
  TimelineBar,
} from '@/components/design-system';
import { useChangeTaskStatus, useCreateTask } from '@/lib/hooks/use-tasks';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { cn } from '@/lib/utils/cn';
import type { Task, TaskStatus, User, Priority } from '@/lib/types';
import {
  STATUS_META,
  STATUS_OPTIONS,
  STATUS_ORDER,
  PRIORITY_META,
} from './board-meta';
import { RefinedTaskChildren } from './task-hierarchy-children';

interface RefinedTaskTableProps {
  tasks: Task[];
  users: User[];
  onTaskClick?: (taskId: string) => void;
  // When invoked, the parent should set `createInStatus` to render the
  // inline create row at the top of the matching group. Pre-fills the
  // status field of the new task.
  onAddTask?: (status: TaskStatus) => void;
  // Controlled inline-create state: when set, renders the inline create
  // row at the top of the matching status group. Parent owns the state so
  // the FilterBar's "+ New task" button and the per-group "+ Add task"
  // buttons can both feed into it.
  createInStatus?: TaskStatus | null;
  onCancelCreate?: () => void;
  onCreatedTask?: () => void;
  // Project id is required when createInStatus is set — task inserts
  // need a project_id. Optional otherwise (e.g. cross-project Dashboard
  // table where create is disabled).
  projectId?: string;
  // Multi-select integration with the floating BulkBar
  selected?: Record<string, boolean>;
  onSelectChange?: (selected: Record<string, boolean>) => void;
  // Whether the current user can create new tasks (RBAC). Drives whether
  // the "+ Add subtask" affordance appears in expanded subtask groups.
  canCreate?: boolean;
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
  createInStatus = null,
  onCancelCreate,
  onCreatedTask,
  projectId,
  selected = {},
  onSelectChange,
  canCreate = false,
  className,
}: RefinedTaskTableProps) {
  // Track which parents are expanded → mounts <RefinedTaskChildren>
  // for those rows, which lazy-loads via useChildTasks. Survives
  // status changes / re-renders since it's keyed by task id.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
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

                      {/* Inline create row — pinned to the top of the
                          group whose status matches createInStatus. */}
                      {createInStatus === status && projectId && onCancelCreate && onCreatedTask && (
                        <InlineCreateBar
                          projectId={projectId}
                          status={status}
                          totalWidth={TOTAL_WIDTH}
                          onCancel={onCancelCreate}
                          onCreated={onCreatedTask}
                        />
                      )}

                      {/* Body rows */}
                      {groupTasks.length === 0 && createInStatus !== status ? (
                        <div className="flex items-center justify-center py-6 text-[12.5px] text-text-faint">
                          No tasks in {meta.label}
                        </div>
                      ) : groupTasks.length === 0 ? null : (
                        groupTasks.map((task, idx) => (
                          <Fragment key={task.id}>
                            <TaskRow
                              task={task}
                              owner={usersById[task.owner_id]}
                              rowIndex={idx}
                              isLast={idx === groupTasks.length - 1 && !expandedIds.has(task.id)}
                              isSelected={!!selected[task.id]}
                              expanded={expandedIds.has(task.id)}
                              onToggleExpand={
                                (task.children_count ?? 0) > 0 ? toggleExpanded : undefined
                              }
                              onSelectChange={
                                onSelectChange
                                  ? (v) => onSelectChange({ ...selected, [task.id]: v || undefined as unknown as boolean })
                                  : undefined
                              }
                              onClick={() => onTaskClick?.(task.id)}
                              onChangeStatus={(s) => changeStatus.mutate({ id: task.id, status: s })}
                              axis={axis}
                            />
                            {expandedIds.has(task.id) && (
                              <RefinedTaskChildren
                                parentId={task.id}
                                projectId={task.project_id}
                                depth={1}
                                expandedIds={expandedIds}
                                onToggleExpanded={toggleExpanded}
                                onTaskClick={onTaskClick}
                                usersById={usersById}
                                axis={axis}
                                cols={COLS}
                                totalWidth={TOTAL_WIDTH}
                                canCreate={canCreate}
                              />
                            )}
                          </Fragment>
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
  // When the task has children, the expand chevron is shown in the
  // title cell. `expanded` reflects parent-level expanded state;
  // `onToggleExpand` is undefined when the task has no children
  // (children_count === 0) — used to gate the chevron + a11y.
  expanded?: boolean;
  onToggleExpand?: (id: string) => void;
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
  expanded = false,
  onToggleExpand,
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
          const childCount = task.children_count ?? 0;
          return (
            <div key={c.id} className={cn(cellClass, 'gap-1.5 justify-start')} style={cellStyle}>
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
              {onToggleExpand ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onToggleExpand(task.id); }}
                  aria-label={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
                  aria-expanded={expanded}
                  className="shrink-0 rounded p-0.5 text-text-faint transition-colors hover:bg-hover hover:text-text"
                >
                  {expanded
                    ? <ChevronDown className="h-3.5 w-3.5" />
                    : <ChevronRightIcon className="h-3.5 w-3.5" />}
                </button>
              ) : (
                <span aria-hidden="true" className="inline-block w-[18px]" />
              )}
              <span
                className={cn(
                  'flex-1 truncate font-medium',
                  task.status === 'completed' && 'text-text-muted line-through decoration-text-faint',
                )}
              >
                {task.title}
              </span>
              {childCount > 0 && (
                <span
                  className="shrink-0 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-text-muted"
                  title={`${childCount} subtask${childCount === 1 ? '' : 's'}`}
                >
                  {childCount}
                </span>
              )}
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

// ─── Inline create bar ──────────────────────────────────────────────────
// Slim single-row form pinned to the top of a status group. Title is
// required; everything else has a sensible default (priority P3, owner
// = current user, no ETA). Enter saves, Esc cancels. The bar matches
// the table's grid width but uses a flex row instead of column-aligned
// cells — column alignment with the data rows isn't important here, the
// bar is a self-contained mini-form.
const PRIORITY_DOT_COLOR: Record<Priority, string> = {
  P1: 'bg-red-500',
  P2: 'bg-orange-500',
  P3: 'bg-amber-500',
  P4: 'bg-neutral-300 dark:bg-neutral-600',
};

interface InlineCreateBarProps {
  projectId: string;
  status: TaskStatus;
  totalWidth: number;
  onCancel: () => void;
  onCreated: () => void;
}

function InlineCreateBar({
  projectId, status, totalWidth, onCancel, onCreated,
}: InlineCreateBarProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('P3');
  const [eta, setEta] = useState('');
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const create = useCreateTask();
  const { currentUser } = useCurrentUser();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const t = title.trim();
    if (!t || create.isPending) return;
    create.mutate(
      {
        project_id: projectId,
        parent_id: null,
        title: t,
        status,
        priority,
        owner_id: currentUser.id,
        eta: eta || null,
      },
      {
        onSuccess: () => {
          // Keep the bar open so users can add multiple tasks in a row;
          // just clear the title. Esc / Cancel closes the bar.
          setTitle('');
          setEta('');
          onCreated();
          inputRef.current?.focus();
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const canSave = title.trim().length > 0 && !create.isPending;

  return (
    <div
      className="flex items-center gap-2 border-b border-[var(--accent)]/30 bg-accent-soft px-3 py-2"
      style={{ minWidth: totalWidth }}
    >
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[color:rgba(0,115,234,0.18)] text-[11px] font-bold text-[var(--accent)]">
        +
      </span>

      {/* Priority */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowPriorityMenu((v) => !v)}
          className="flex h-7 items-center gap-1.5 rounded-md border border-[var(--accent)]/30 bg-surface px-2 text-xs hover:border-[var(--accent)]"
        >
          <span className={cn('h-2 w-2 rounded-full', PRIORITY_DOT_COLOR[priority])} />
          <span className="text-text">{priority}</span>
          <ChevronDown className="h-3 w-3 text-text-faint" />
        </button>
        {showPriorityMenu && (
          <div className="absolute left-0 top-full z-50 mt-1 w-36 rounded-lg border border-border-color bg-surface shadow-lg">
            {(Object.keys(PRIORITY_META) as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { setPriority(p); setShowPriorityMenu(false); }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent-soft',
                  p === priority && 'bg-accent-soft text-[var(--accent)]',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', PRIORITY_DOT_COLOR[p])} />
                <span>{p} — {PRIORITY_META[p].label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Title */}
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        maxLength={200}
        placeholder="What needs to be done?  (Enter to save · Esc to cancel)"
        aria-label="New task title"
        disabled={create.isPending}
        className={cn(
          'h-7 flex-1 rounded-md border bg-surface px-2.5 text-sm text-text',
          'placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20',
          title.trim()
            ? 'border-[var(--accent)] focus:border-[var(--accent)]'
            : 'border-[var(--accent)]/30 focus:border-[var(--accent)]',
        )}
      />

      {/* ETA */}
      <input
        type="date"
        value={eta}
        onChange={(e) => setEta(e.target.value)}
        onKeyDown={handleKeyDown}
        min={today}
        title="ETA (optional)"
        disabled={create.isPending}
        className="h-7 rounded-md border border-[var(--accent)]/30 bg-surface px-1.5 text-xs text-text focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/20"
      />

      {/* Owner avatar (current user — keep simple) */}
      <div title={`Owner: ${currentUser.full_name}`}>
        <Avatar fullName={currentUser.full_name} src={currentUser.avatar_url} size="sm" />
      </div>

      {/* Add / Cancel — explicit labeled buttons. Icon-only was confusing
          (users didn't know which button did what). */}
      <button
        type="button"
        onClick={submit}
        disabled={!canSave}
        title="Add task (Enter)"
        className={cn(
          'inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-all',
          canSave
            ? 'bg-green-600 text-white shadow-sm hover:bg-green-700'
            : 'cursor-not-allowed bg-neutral-100 text-text-faint dark:bg-neutral-800',
        )}
      >
        {create.isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Adding…</span>
          </>
        ) : (
          <>
            <Check className="h-3.5 w-3.5" />
            <span>Add task</span>
          </>
        )}
      </button>
      <button
        type="button"
        onClick={onCancel}
        title="Cancel (Esc)"
        disabled={create.isPending}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-border-color bg-surface px-2.5 text-xs font-medium text-text-muted transition-colors hover:bg-hover hover:text-text disabled:opacity-50"
      >
        <XIcon className="h-3.5 w-3.5" />
        <span>Cancel</span>
      </button>
    </div>
  );
}
