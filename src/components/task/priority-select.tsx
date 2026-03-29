'use client';

import { cn } from '@/lib/utils/cn';
import * as DropdownMenu from '@/components/ui/dropdown-menu';
import type { Priority } from '@/lib/types';
import { PRIORITY_LABELS } from '@/lib/types';

const ALL_PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4'];

const PRIORITY_COLORS: Record<Priority, string> = {
  P1: 'bg-red-500',
  P2: 'bg-pink-500',
  P3: 'bg-blue-500',
  P4: 'bg-slate-400',
};

const PRIORITY_TEXT_COLORS: Record<Priority, string> = {
  P1: 'text-red-700',
  P2: 'text-pink-700',
  P3: 'text-blue-700',
  P4: 'text-slate-600',
};

interface PrioritySelectProps {
  currentPriority: Priority;
  onPriorityChange: (priority: Priority) => void;
}

export function PrioritySelect({ currentPriority, onPriorityChange }: PrioritySelectProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          aria-label={`Priority: ${PRIORITY_LABELS[currentPriority]}`}
        >
          <span className={cn('h-2 w-2 shrink-0 rounded-full', PRIORITY_COLORS[currentPriority])} />
          <span className={cn(PRIORITY_TEXT_COLORS[currentPriority])}>
            {PRIORITY_LABELS[currentPriority]}
          </span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start">
        <DropdownMenu.Label>Set Priority</DropdownMenu.Label>
        {ALL_PRIORITIES.map((priority) => (
          <DropdownMenu.Item
            key={priority}
            className={cn(
              'flex items-center gap-2',
              priority === currentPriority && 'bg-slate-50 font-medium'
            )}
            onSelect={() => onPriorityChange(priority)}
          >
            <span className={cn('h-2 w-2 shrink-0 rounded-full', PRIORITY_COLORS[priority])} />
            <span className="text-sm text-slate-700">
              {PRIORITY_LABELS[priority]}
            </span>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
