'use client';

import type { Task } from '@/lib/types';
import type { ViewMode, SortConfig } from '@/lib/types/filters';
import { TaskTable } from './task-table';
import { TaskKanban } from './task-kanban';
import { TaskHybridList } from './task-hybrid-list';

interface TaskViewContainerProps {
  tasks: Task[];
  isLoading?: boolean;
  viewMode: ViewMode;
  projectId?: string;
  sort?: SortConfig[];
  onSortToggle?: (field: SortConfig['field']) => void;
  onSelectTask?: (taskId: string) => void;
  showProject?: boolean;
  projectsMap?: Record<string, string>;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function TaskViewContainer({
  tasks,
  isLoading,
  viewMode,
  projectId,
  sort,
  onSortToggle,
  onSelectTask,
  showProject,
  projectsMap,
  emptyTitle,
  emptyDescription,
}: TaskViewContainerProps) {
  switch (viewMode) {
    case 'table':
      return <TaskTable tasks={tasks} isLoading={isLoading} projectId={projectId} sort={sort} onSortToggle={onSortToggle} onSelectTask={onSelectTask} showProject={showProject} projectsMap={projectsMap} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />;
    case 'kanban':
      return <TaskKanban tasks={tasks} isLoading={isLoading} onSelectTask={onSelectTask} />;
    case 'hybrid':
      return <TaskHybridList tasks={tasks} isLoading={isLoading} onSelectTask={onSelectTask} />;
    default:
      return <TaskTable tasks={tasks} isLoading={isLoading} projectId={projectId} sort={sort} onSortToggle={onSortToggle} onSelectTask={onSelectTask} showProject={showProject} projectsMap={projectsMap} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />;
  }
}
