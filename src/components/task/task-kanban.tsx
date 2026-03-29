'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { KanbanColumn } from './kanban-column';
import { TaskCardOverlay } from './task-card';
import { useChangeTaskStatus } from '@/lib/hooks/use-tasks';
import { useUsers } from '@/lib/hooks/use-users';
import { useToast } from '@/components/ui/toast';
import { canTransitionTo } from '@/lib/utils/status';
import { STATUS_LABELS } from '@/lib/types';
import type { Task, TaskStatus } from '@/lib/types';

/* ─── Column order ─── */

const COLUMN_ORDER: TaskStatus[] = [
  'not_started',
  'in_progress',
  'blocked',
  'completed',
  'cancelled',
];

/* ─── Props ─── */

interface TaskKanbanProps {
  tasks: Task[];
  isLoading?: boolean;
  onSelectTask?: (taskId: string) => void;
}

export function TaskKanban({ tasks, isLoading, onSelectTask }: TaskKanbanProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const changeStatus = useChangeTaskStatus();
  const { data: users } = useUsers();
  const { toast } = useToast();

  // Require 8px of movement before activating drag to allow clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      not_started: [],
      in_progress: [],
      blocked: [],
      completed: [],
      cancelled: [],
    };

    for (const task of tasks) {
      grouped[task.status].push(task);
    }

    return grouped;
  }, [tasks]);

  // Find owner name for overlay (no hooks allowed in overlay)
  const getOwnerName = useCallback(
    (ownerId: string) => {
      return users?.find((u) => u.id === ownerId)?.full_name;
    },
    [users]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id);
      if (task) setActiveTask(task);
    },
    [tasks]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null);

      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as string;
      const targetStatus = over.id as TaskStatus;

      // Read the source status from the draggable data
      const sourceStatus = active.data.current?.status as TaskStatus | undefined;
      if (!sourceStatus || sourceStatus === targetStatus) return;

      // Validate transition
      if (!canTransitionTo(sourceStatus, targetStatus)) {
        toast(
          `Cannot move from "${STATUS_LABELS[sourceStatus]}" to "${STATUS_LABELS[targetStatus]}"`,
          'error'
        );
        return;
      }

      changeStatus.mutate({ id: taskId, status: targetStatus });
    },
    [changeStatus, toast]
  );

  const handleDragCancel = useCallback(() => {
    setActiveTask(null);
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMN_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            isLoading={isLoading}
            onSelectTask={onSelectTask}
          />
        ))}
      </div>

      {/* Drag overlay -- rendered outside columns for smooth appearance */}
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <TaskCardOverlay
            task={activeTask}
            ownerName={getOwnerName(activeTask.owner_id)}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
