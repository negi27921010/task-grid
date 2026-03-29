'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { computeAgingStatus } from '@/lib/utils/aging';
import type { Task, AgingStatus } from '@/lib/types';

interface AgingSummaryBarProps {
  tasks: Task[];
  onFilterByAging: (agingStatus: AgingStatus) => void;
}

interface AgingCount {
  status: AgingStatus;
  label: string;
  count: number;
  color: string;
  hoverColor: string;
}

export function AgingSummaryBar({ tasks, onFilterByAging }: AgingSummaryBarProps) {
  const counts = useMemo(() => {
    const map: Record<AgingStatus, number> = {
      overdue: 0,
      at_risk: 0,
      on_track: 0,
      no_eta: 0,
      stale: 0,
    };

    for (const task of tasks) {
      const status = task.aging_status ?? computeAgingStatus(task);
      map[status]++;
    }

    return map;
  }, [tasks]);

  const items: AgingCount[] = [
    {
      status: 'overdue',
      label: 'overdue',
      count: counts.overdue,
      color: 'text-red-600',
      hoverColor: 'hover:bg-red-50',
    },
    {
      status: 'at_risk',
      label: 'at risk',
      count: counts.at_risk,
      color: 'text-amber-600',
      hoverColor: 'hover:bg-amber-50',
    },
    {
      status: 'on_track',
      label: 'on track',
      count: counts.on_track,
      color: 'text-green-600',
      hoverColor: 'hover:bg-green-50',
    },
    {
      status: 'no_eta',
      label: 'no ETA',
      count: counts.no_eta,
      color: 'text-slate-500',
      hoverColor: 'hover:bg-slate-100',
    },
    {
      status: 'stale',
      label: 'stale',
      count: counts.stale,
      color: 'text-slate-500',
      hoverColor: 'hover:bg-slate-100',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      <span className="font-medium text-slate-900">
        {tasks.length} total
      </span>

      {items.map((item) => (
        <span key={item.status} className="flex items-center">
          <span className="mx-1 text-slate-300" aria-hidden="true">|</span>
          <button
            type="button"
            onClick={() => onFilterByAging(item.status)}
            className={cn(
              'rounded-md px-1.5 py-0.5 text-sm font-medium transition-colors',
              item.hoverColor
            )}
          >
            <span className={cn('font-semibold', item.color)}>
              {item.count}
            </span>{' '}
            <span className="text-slate-600">{item.label}</span>
          </button>
        </span>
      ))}
    </div>
  );
}
