'use client';

import { cn } from '@/lib/utils/cn';
import { StatusBadge } from '@/components/ui/badge';
import * as DropdownMenu from '@/components/ui/dropdown-menu';
import { getValidTransitions } from '@/lib/utils/status';
import { STATUS_LABELS } from '@/lib/types/task';
import type { TaskStatus } from '@/lib/types';

interface StatusSelectProps {
  currentStatus: TaskStatus;
  onStatusChange: (status: TaskStatus) => void;
  disabled?: boolean;
}

export function StatusSelect({ currentStatus, onStatusChange, disabled }: StatusSelectProps) {
  const validTransitions = getValidTransitions(currentStatus);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center rounded transition-colors hover:ring-2 hover:ring-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1',
            disabled && 'pointer-events-none opacity-50'
          )}
          disabled={disabled}
          aria-label={`Status: ${STATUS_LABELS[currentStatus]}`}
        >
          <StatusBadge status={currentStatus} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start">
        <DropdownMenu.Label>Change Status</DropdownMenu.Label>
        {validTransitions.length === 0 ? (
          <DropdownMenu.Item disabled>No transitions available</DropdownMenu.Item>
        ) : (
          validTransitions.map((status) => (
            <DropdownMenu.Item
              key={status}
              className="flex items-center gap-2"
              onSelect={() => onStatusChange(status)}
            >
              <StatusBadge status={status} />
            </DropdownMenu.Item>
          ))
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
