'use client';

import { MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import * as DropdownMenu from '@/components/ui/dropdown-menu';
import { getTaskDepthLabel } from '@/lib/types/task';
import type { Task } from '@/lib/types';

interface TaskRowMenuProps {
  task: Task;
  onAddSubtask: () => void;
  onDelete?: () => void;
}

export function TaskRowMenu({ task, onAddSubtask, onDelete }: TaskRowMenuProps) {
  const childLabel = getTaskDepthLabel(task.depth + 1);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-gray-600 group-hover/row:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`Actions for ${task.title}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Item
          className="flex items-center gap-2"
          onSelect={onAddSubtask}
        >
          <Plus className="h-3.5 w-3.5" />
          Add {childLabel}
        </DropdownMenu.Item>
        {onDelete && (
          <>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              className="flex items-center gap-2 text-red-600 hover:!bg-red-50 hover:!text-red-700 focus:!bg-red-50 focus:!text-red-700"
              onSelect={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </DropdownMenu.Item>
          </>
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
