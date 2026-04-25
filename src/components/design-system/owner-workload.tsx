'use client';

import { Avatar, colorForName } from './avatar';
import { cn } from '@/lib/utils/cn';

export interface WorkloadRow {
  id: string;
  name: string;
  avatarUrl?: string | null;
  total: number;       // total assigned
  active: number;      // currently active subset (drives the filled bar)
}

interface OwnerWorkloadProps {
  rows: WorkloadRow[];
  className?: string;
}

export function OwnerWorkload({ rows, className }: OwnerWorkloadProps) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-text-muted">No assignments yet</p>
    );
  }
  const max = Math.max(...rows.map((r) => r.total), 1);

  return (
    <ul className={cn('space-y-2.5', className)}>
      {rows.map((r) => {
        const color = colorForName(r.name);
        const totalPct = (r.total / max) * 100;
        const activePct = (r.active / max) * 100;
        return (
          <li key={r.id} className="flex items-center gap-3">
            <Avatar fullName={r.name} src={r.avatarUrl} size="sm" />
            <div className="w-28 min-w-0 truncate text-[12.5px] font-medium text-text">
              {r.name}
            </div>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${totalPct}%`, background: color + '40' }}
              />
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${activePct}%`, background: color }}
              />
            </div>
            <div className="min-w-[44px] text-right text-[12px] tabular-nums">
              <span className="font-semibold text-text">{r.active}</span>
              <span className="text-text-faint">/{r.total}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
