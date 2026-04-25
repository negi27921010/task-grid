'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { computeAgingStatus } from '@/lib/utils/aging';
import type { Task, AgingStatus } from '@/lib/types';

interface AgingSummaryBarProps {
  tasks: Task[];
  onFilterByAging: (agingStatus: AgingStatus) => void;
  // Optional active set so we can render the selected ring on cards that
  // are currently filtered. Pass filters.aging_status from useFilters.
  activeStatuses?: AgingStatus[];
}

interface AgingTile {
  status: AgingStatus | 'total';
  label: string;
  count: number;
  tone: 'red' | 'amber' | 'green' | 'gray' | 'neutral' | 'blue';
}

const TONE_CLASSES: Record<AgingTile['tone'], { bg: string; text: string; border: string; ring: string }> = {
  blue:    { bg: 'bg-accent-soft',                       text: 'text-[var(--accent)]',                  border: 'border-[var(--accent)]/30',  ring: 'ring-[var(--accent)]' },
  red:     { bg: 'bg-red-50 dark:bg-red-500/10',         text: 'text-red-700 dark:text-red-300',        border: 'border-red-200 dark:border-red-500/30', ring: 'ring-red-500' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-700 dark:text-amber-300',    border: 'border-amber-200 dark:border-amber-500/30', ring: 'ring-amber-500' },
  green:   { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-500/30', ring: 'ring-emerald-500' },
  gray:    { bg: 'bg-neutral-100',                       text: 'text-text-muted',                       border: 'border-border-color',                  ring: 'ring-text-muted' },
  neutral: { bg: 'bg-neutral-100',                       text: 'text-text-faint',                       border: 'border-border-color',                  ring: 'ring-text-faint' },
};

export function AgingSummaryBar({
  tasks,
  onFilterByAging,
  activeStatuses,
}: AgingSummaryBarProps) {
  const counts = useMemo(() => {
    const map: Record<AgingStatus, number> = {
      overdue: 0, at_risk: 0, on_track: 0, no_eta: 0, stale: 0,
    };
    for (const task of tasks) {
      const status = task.aging_status ?? computeAgingStatus(task);
      map[status]++;
    }
    return map;
  }, [tasks]);

  const tiles: AgingTile[] = [
    { status: 'total',    label: 'Total',    count: tasks.length,    tone: 'blue' },
    { status: 'overdue',  label: 'Overdue',  count: counts.overdue,  tone: 'red' },
    { status: 'at_risk',  label: 'At risk',  count: counts.at_risk,  tone: 'amber' },
    { status: 'on_track', label: 'On track', count: counts.on_track, tone: 'green' },
    { status: 'no_eta',   label: 'No ETA',   count: counts.no_eta,   tone: 'gray' },
    { status: 'stale',    label: 'Stale',    count: counts.stale,    tone: 'neutral' },
  ];

  const isActive = (s: AgingTile['status']) =>
    s !== 'total' && (activeStatuses?.includes(s) ?? false);

  return (
    <div
      className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3"
      role="group"
      aria-label="Task aging summary"
    >
      {tiles.map((t) => {
        const cls = TONE_CLASSES[t.tone];
        const interactive = t.status !== 'total';
        const active = isActive(t.status);
        const Element = interactive ? 'button' : 'div';
        return (
          <Element
            key={t.status}
            type={interactive ? 'button' : undefined}
            onClick={interactive ? () => onFilterByAging(t.status as AgingStatus) : undefined}
            className={cn(
              'flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-all',
              cls.bg,
              cls.border,
              interactive && 'cursor-pointer hover:-translate-y-px',
              active && 'ring-2 ring-offset-2 ring-offset-canvas',
              active && cls.ring,
            )}
          >
            <span
              className={cn(
                'text-[20px] font-bold leading-none tabular-nums',
                cls.text,
              )}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t.count}
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-muted">
              {t.label}
            </span>
          </Element>
        );
      })}
    </div>
  );
}
