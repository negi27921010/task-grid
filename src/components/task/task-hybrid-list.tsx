'use client';

import { ListTodo } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { HybridListItem } from './hybrid-list-item';
import type { Task } from '@/lib/types';

interface TaskHybridListProps {
  tasks: Task[];
  isLoading?: boolean;
  onSelectTask?: (taskId: string) => void;
}

export function TaskHybridList({ tasks, isLoading, onSelectTask }: TaskHybridListProps) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-gray-100 px-3 py-3"
          >
            <Skeleton shape="rectangle" width={16} height={16} />
            <Skeleton shape="circle" width={8} height={8} />
            <Skeleton width={180 + Math.random() * 120} height={14} />
            <div className="flex-1" />
            <Skeleton width={72} height={20} shape="rectangle" />
            <Skeleton shape="circle" width={24} height={24} />
            <Skeleton width={48} height={14} />
            <Skeleton width={56} height={20} shape="rectangle" />
          </div>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <EmptyState
          icon={ListTodo}
          title="No tasks found"
          description="There are no tasks matching your current filters."
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      {tasks.map((task) => (
        <HybridListItem key={task.id} task={task} depth={0} />
      ))}
    </div>
  );
}
