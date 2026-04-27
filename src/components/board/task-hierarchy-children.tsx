'use client';

// Lazy-loaded children renderer for the Refined task table.
//
// Mounted only when its parent row is expanded — so useChildTasks fires
// exactly when needed, not on every mount of the parent table. Renders
// each child as a non-sortable indented row (drag-reorder stays on the
// top-level group only for now). Recursive: a child that's also expanded
// renders its own grandchildren the same way.

import { useState, useMemo, Fragment } from 'react';
import {
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Plus,
  X,
  Check,
  MoreHorizontal,
} from 'lucide-react';
import {
  StatusPill,
  PriorityTag,
  Avatar,
  TimelineBar,
} from '@/components/design-system';
import {
  useChildTasks,
  useChangeTaskStatus,
  useCreateTask,
} from '@/lib/hooks/use-tasks';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { cn } from '@/lib/utils/cn';
import type { Task, TaskStatus, User } from '@/lib/types';
import {
  STATUS_META,
  STATUS_OPTIONS,
  PRIORITY_META,
} from './board-meta';

interface RefinedTaskChildrenProps {
  parentId: string;
  projectId: string;
  // 1 means "first level under top — depth 1". Indents at depth × 24px.
  depth: number;
  expandedIds: Set<string>;
  onToggleExpanded: (id: string) => void;
  onTaskClick?: (id: string) => void;
  usersById: Record<string, User>;
  axis: { start: Date; end: Date };
  // Pixel width of each grid column — must match the parent table so
  // children align under their headers.
  cols: ReadonlyArray<{ id: string; width: number; center?: boolean }>;
  totalWidth: number;
  // Whether the current user can create new subtasks (RBAC).
  canCreate: boolean;
}

export function RefinedTaskChildren({
  parentId,
  projectId,
  depth,
  expandedIds,
  onToggleExpanded,
  onTaskClick,
  usersById,
  axis,
  cols,
  totalWidth,
  canCreate,
}: RefinedTaskChildrenProps) {
  const { data: children, isLoading } = useChildTasks(parentId, true);
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return <SkeletonRows depth={depth} totalWidth={totalWidth} />;
  }

  return (
    <>
      {(children ?? []).map((child) => (
        <Fragment key={child.id}>
          <ChildRow
            task={child}
            depth={depth}
            expanded={expandedIds.has(child.id)}
            onToggleExpand={onToggleExpanded}
            onClick={() => onTaskClick?.(child.id)}
            owner={usersById[child.owner_id]}
            axis={axis}
            cols={cols}
            totalWidth={totalWidth}
          />
          {expandedIds.has(child.id) && (
            <RefinedTaskChildren
              parentId={child.id}
              projectId={projectId}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggleExpanded={onToggleExpanded}
              onTaskClick={onTaskClick}
              usersById={usersById}
              axis={axis}
              cols={cols}
              totalWidth={totalWidth}
              canCreate={canCreate}
            />
          )}
        </Fragment>
      ))}
      {canCreate && (
        showCreate ? (
          <SubtaskCreateRow
            projectId={projectId}
            parentId={parentId}
            depth={depth}
            totalWidth={totalWidth}
            onCancel={() => setShowCreate(false)}
            onCreated={() => setShowCreate(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex h-7 items-center gap-1.5 border-b border-border-color/60 text-[12px] text-text-muted transition-colors hover:bg-hover hover:text-text"
            style={{ minWidth: totalWidth, paddingLeft: 12 + depth * 24 + 24 }}
            aria-label="Add subtask"
          >
            <Plus className="h-3 w-3" strokeWidth={2.4} />
            Add {depth === 1 ? 'subtask' : depth === 2 ? 'microtask' : `level ${depth + 1}`}
          </button>
        )
      )}
    </>
  );
}

interface ChildRowProps {
  task: Task;
  depth: number;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
  onClick: () => void;
  owner: User | undefined;
  axis: { start: Date; end: Date };
  cols: ReadonlyArray<{ id: string; width: number; center?: boolean }>;
  totalWidth: number;
}

function ChildRow({
  task,
  depth,
  expanded,
  onToggleExpand,
  onClick,
  owner,
  axis,
  cols,
  totalWidth,
}: ChildRowProps) {
  const changeStatus = useChangeTaskStatus();
  const priority = PRIORITY_META[task.priority];
  const status = STATUS_META[task.status];
  const isOverdue =
    task.aging_status === 'overdue' &&
    task.status !== 'completed' &&
    task.status !== 'cancelled';
  const eta = task.eta ? new Date(task.eta) : null;
  const created = task.created_at ? new Date(task.created_at) : axis.start;
  const hasChildren = (task.children_count ?? 0) > 0;
  const indentPx = depth * 24;

  return (
    <div
      onClick={onClick}
      className="group flex h-10 items-center border-b border-border-color/60 pl-1 text-[13px] text-text transition-colors hover:bg-hover"
      style={{ minWidth: totalWidth }}
    >
      {cols.map((c, i) => {
        const cellClass = cn(
          'flex h-full items-center px-3',
          c.center && 'justify-center',
          i < cols.length - 1 && 'border-r border-border-color/40',
        );
        const cellStyle = { width: c.width, flexShrink: 0 } as const;

        if (c.id === 'check') {
          return <div key={c.id} className={cellClass} style={cellStyle} />;
        }
        if (c.id === 'task') {
          return (
            <div
              key={c.id}
              className={cn(cellClass, 'gap-1.5 justify-start')}
              style={cellStyle}
            >
              <span style={{ width: indentPx }} aria-hidden="true" />
              {hasChildren ? (
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
                <span className="inline-block w-[18px]" aria-hidden="true" />
              )}
              <span className="text-[10.5px] font-medium text-text-faint">
                {labelForDepth(depth)}
              </span>
              <span
                className={cn(
                  'flex-1 truncate',
                  task.status === 'completed' && 'text-text-muted line-through decoration-text-faint',
                )}
              >
                {task.title}
              </span>
              {(task.children_count ?? 0) > 0 && (
                <span className="shrink-0 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
                  {task.children_count}
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
                onChange={(s: TaskStatus) => changeStatus.mutate({ id: task.id, status: s })}
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

function labelForDepth(depth: number): string {
  if (depth === 1) return 'Subtask';
  if (depth === 2) return 'Microtask';
  return `L${depth + 1}`;
}

function SkeletonRows({ depth, totalWidth }: { depth: number; totalWidth: number }) {
  return (
    <>
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex h-10 items-center border-b border-border-color/60 pl-1"
          style={{ minWidth: totalWidth }}
        >
          <div style={{ width: 36 }} />
          <div className="flex-1 px-3">
            <div
              className="h-3 animate-pulse rounded bg-neutral-100"
              style={{ width: `${60 - depth * 5}%`, marginLeft: depth * 24 }}
            />
          </div>
        </div>
      ))}
    </>
  );
}

interface SubtaskCreateRowProps {
  projectId: string;
  parentId: string;
  depth: number;
  totalWidth: number;
  onCancel: () => void;
  onCreated: () => void;
}

function SubtaskCreateRow({
  projectId, parentId, depth, totalWidth, onCancel, onCreated,
}: SubtaskCreateRowProps) {
  const [title, setTitle] = useState('');
  const [eta, setEta] = useState('');
  const create = useCreateTask();
  const { currentUser } = useCurrentUser();
  const placeholder = useMemo(
    () => depth === 1 ? 'New subtask…' : depth === 2 ? 'New microtask…' : `New level ${depth + 1} task…`,
    [depth],
  );

  const handleSave = () => {
    if (!title.trim() || create.isPending) return;
    create.mutate(
      {
        project_id: projectId,
        parent_id: parentId,
        title: title.trim(),
        owner_id: currentUser.id,
        eta: eta || null,
      },
      {
        onSuccess: () => {
          setTitle('');
          setEta('');
          onCreated();
        },
      },
    );
  };

  return (
    <div
      className="flex h-10 items-center gap-2 border-b border-border-color/60 bg-accent-soft pr-3"
      style={{ minWidth: totalWidth, paddingLeft: 12 + depth * 24 + 24 }}
    >
      <span className="rounded bg-[var(--accent)]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--accent)]">
        + {labelForDepth(depth)}
      </span>
      <input
        type="text"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        placeholder={placeholder}
        maxLength={200}
        disabled={create.isPending}
        className="flex-1 rounded-md border border-[var(--accent)]/30 bg-surface px-2.5 py-1.5 text-[13px] text-text placeholder:text-text-faint focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
      />
      <input
        type="date"
        value={eta}
        onChange={(e) => setEta(e.target.value)}
        disabled={create.isPending}
        className="w-[140px] rounded-md border border-[var(--accent)]/30 bg-surface px-2 py-1.5 text-[12px] text-text focus:border-[var(--accent)] focus:outline-none"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={!title.trim() || create.isPending}
        aria-label="Save subtask"
        className="rounded-md bg-[var(--accent)] p-1.5 text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={create.isPending}
        aria-label="Cancel"
        className="rounded-md p-1.5 text-text-faint transition-colors hover:bg-hover hover:text-text-muted"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
