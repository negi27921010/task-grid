'use client';

// Refined Kanban — drag tasks between status columns. Drag is powered by
// dnd-kit. Dropping into a different column triggers useChangeTaskStatus
// which persists via the existing API + invalidates React Query so the
// table view stays consistent with the kanban view.

import { useMemo, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { useChangeTaskStatus } from '@/lib/hooks/use-tasks';
import { RefinedTaskCard } from './refined-task-card';
import { STATUS_META, STATUS_ORDER } from './board-meta';
import { cn } from '@/lib/utils/cn';
import type { Task, TaskStatus, User } from '@/lib/types';

interface RefinedKanbanProps {
  tasks: Task[];
  users: User[];
  onTaskClick?: (taskId: string) => void;
  onAddTask?: (status: TaskStatus) => void;
  className?: string;
}

export function RefinedKanban({
  tasks,
  users,
  onTaskClick,
  onAddTask,
  className,
}: RefinedKanbanProps) {
  const usersById = useMemo(() => {
    const m: Record<string, User> = {};
    for (const u of users) m[u.id] = u;
    return m;
  }, [users]);

  // Local mirror of (id → status) so we can render the new column instantly
  // on drop, while the backend mutation is in flight. Reconciled with the
  // live `tasks` prop on every render.
  const [pendingMoves, setPendingMoves] = useState<Record<string, TaskStatus>>({});

  // Local row order per column. Reordering within a column is visual only
  // (the legacy DB schema doesn't have a position column wired through to
  // tasks). Cross-column drags ARE persisted via the status change.
  const [columnOrder, setColumnOrder] = useState<Record<TaskStatus, string[]>>(() => {
    const init: Record<TaskStatus, string[]> = {} as Record<TaskStatus, string[]>;
    for (const s of STATUS_ORDER) init[s] = [];
    return init;
  });

  // Resolve effective columns from props + local state.
  const columns = useMemo(() => {
    const seen = new Set<string>();
    const buckets: Record<TaskStatus, Task[]> = {} as Record<TaskStatus, Task[]>;
    for (const s of STATUS_ORDER) buckets[s] = [];

    // Incoming task list, with optimistic status overrides applied.
    const resolvedTasks = tasks.map(t => {
      const next = pendingMoves[t.id];
      return next ? { ...t, status: next } : t;
    });

    // Group by status.
    for (const t of resolvedTasks) {
      if (buckets[t.status]) {
        buckets[t.status].push(t);
        seen.add(t.id);
      }
    }

    // Apply the per-column local ordering on top of the incoming order so a
    // user-driven reorder survives a re-render.
    return STATUS_ORDER.map((status) => {
      const taskMap: Record<string, Task> = {};
      for (const t of buckets[status]) taskMap[t.id] = t;
      const ordered = (columnOrder[status] || []).filter(id => taskMap[id]);
      const remaining = buckets[status].filter(t => !ordered.includes(t.id)).map(t => t.id);
      const finalIds = [...ordered, ...remaining];
      return { status, meta: STATUS_META[status], tasks: finalIds.map(id => taskMap[id]) };
    });
  }, [tasks, pendingMoves, columnOrder]);

  const taskById = useMemo(() => {
    const m: Record<string, Task> = {};
    for (const c of columns) for (const t of c.tasks) m[t.id] = t;
    return m;
  }, [columns]);

  const changeStatus = useChangeTaskStatus();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const findColumnOf = (taskId: string): TaskStatus | null => {
    for (const col of columns) {
      if (col.tasks.find(t => t.id === taskId)) return col.status;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const sourceCol = findColumnOf(activeId);
    if (!sourceCol) return;

    // overId is either another task id (we infer its column) or a column
    // id (drop on empty space inside a column).
    let targetCol = STATUS_ORDER.find(s => s === overId);
    if (!targetCol) targetCol = findColumnOf(overId) ?? undefined;
    if (!targetCol) return;

    if (sourceCol === targetCol) {
      // Reorder within the same column.
      setColumnOrder(prev => {
        const ids = (prev[targetCol!] && prev[targetCol!].length > 0)
          ? prev[targetCol!]
          : columns.find(c => c.status === targetCol)!.tasks.map(t => t.id);
        const fromIdx = ids.indexOf(activeId);
        const toIdx = ids.indexOf(overId);
        if (fromIdx < 0 || toIdx < 0) return prev;
        return { ...prev, [targetCol!]: arrayMove(ids, fromIdx, toIdx) };
      });
      return;
    }

    // Cross-column drag → persist status change.
    setPendingMoves(prev => ({ ...prev, [activeId]: targetCol! }));
    changeStatus.mutate(
      { id: activeId, status: targetCol },
      {
        onSettled: () => {
          // Once the mutation succeeds (or fails — invalidate happens in the
          // hook), clear the optimistic override so the live data wins.
          setPendingMoves(prev => {
            const { [activeId]: _, ...rest } = prev;
            return rest;
          });
        },
      },
    );
  };

  const activeTask = activeDragId ? taskById[activeDragId] : null;
  const activeOwner = activeTask ? usersById[activeTask.owner_id] : undefined;

  return (
    <div className={cn('flex gap-3 overflow-x-auto pb-4', className)}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {columns.map(({ status, meta, tasks: colTasks }) => (
          <KanbanColumn
            key={status}
            status={status}
            label={meta.label}
            tone={meta.tone}
            tasks={colTasks}
            usersById={usersById}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask ? () => onAddTask(status) : undefined}
          />
        ))}

        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div className="w-[280px]">
              <RefinedTaskCard task={activeTask} owner={activeOwner} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  tone: string;
  tasks: Task[];
  usersById: Record<string, User>;
  onTaskClick?: (taskId: string) => void;
  onAddTask?: () => void;
}

function KanbanColumn({
  status, label, tone, tasks, usersById, onTaskClick, onAddTask,
}: KanbanColumnProps) {
  // Make the column itself a droppable so a card dropped into empty space
  // still finds a target.
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const accent = colorFor(tone);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-[280px] shrink-0 flex-col rounded-xl border bg-canvas p-2.5 transition-colors',
        isOver ? 'border-[var(--accent)] bg-accent-soft' : 'border-border-color',
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-1.5 py-1">
        <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: accent }} />
        <span
          className="text-[12px] font-semibold uppercase tracking-wider"
          style={{ color: accent, fontFamily: 'var(--font-display)' }}
        >
          {label}
        </span>
        <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-text-muted">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="mt-2 flex min-h-[60px] flex-col gap-2">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              owner={usersById[task.owner_id]}
              onClick={() => onTaskClick?.(task.id)}
            />
          ))}
        </div>
      </SortableContext>

      {onAddTask && (
        <button
          type="button"
          onClick={onAddTask}
          className="mt-2 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:bg-hover hover:text-text"
        >
          <Plus className="h-3 w-3" strokeWidth={2.4} />
          Add task
        </button>
      )}
    </div>
  );
}

function SortableTaskCard({
  task, owner, onClick,
}: { task: Task; owner?: User; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <RefinedTaskCard
        task={task}
        owner={owner}
        isDragging={isDragging}
        onClick={onClick}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLDivElement>}
      />
    </div>
  );
}

function colorFor(tone: string): string {
  const map: Record<string, string> = {
    gray: '#94a3b8', blue: '#0073ea', red: '#dc2626', green: '#16a34a',
    neutral: '#64748b', amber: '#f59e0b', orange: '#f97316',
    purple: '#9333ea', indigo: '#6366f1',
  };
  return map[tone] ?? '#64748b';
}
