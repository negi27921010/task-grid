// Shared meta for the refined task board surfaces.
// Maps the app's TaskStatus / Priority enums to the Refined design-system
// tones so StatusPill / PriorityTag / kanban columns all stay in lockstep.

import type { TaskStatus, Priority } from '@/lib/types';
import type { Tone, StatusOption } from '@/components/design-system';

export interface StatusMeta {
  label: string;
  tone: Tone;
  // Sort order for left-to-right column rendering on Kanban.
  order: number;
}

export const STATUS_META: Record<TaskStatus, StatusMeta> = {
  not_started: { label: 'Backlog', tone: 'gray',   order: 0 },
  in_progress: { label: 'Working', tone: 'blue',   order: 1 },
  blocked:     { label: 'Stuck',   tone: 'red',    order: 2 },
  completed:   { label: 'Done',    tone: 'green',  order: 3 },
  cancelled:   { label: 'Closed',  tone: 'neutral', order: 4 },
};

export const STATUS_ORDER: TaskStatus[] = (
  Object.entries(STATUS_META) as [TaskStatus, StatusMeta][]
)
  .sort(([, a], [, b]) => a.order - b.order)
  .map(([k]) => k);

export const STATUS_OPTIONS: StatusOption<TaskStatus>[] = STATUS_ORDER.map((s) => ({
  value: s,
  label: STATUS_META[s].label,
  tone: STATUS_META[s].tone,
}));

export interface PriorityMeta {
  label: string;
  tone: Tone;
  level: number;
}

export const PRIORITY_META: Record<Priority, PriorityMeta> = {
  P1: { label: 'Critical', tone: 'red',    level: 4 },
  P2: { label: 'High',     tone: 'orange', level: 3 },
  P3: { label: 'Medium',   tone: 'amber',  level: 2 },
  P4: { label: 'Low',      tone: 'gray',   level: 1 },
};
