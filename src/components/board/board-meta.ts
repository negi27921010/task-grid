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

// Column order: Working first, then To Do, then Completed (per product
// direction). Stuck and Closed trail at the end since they're exception
// states. Order numbers are 0-indexed left-to-right.
export const STATUS_META: Record<TaskStatus, StatusMeta> = {
  in_progress: { label: 'Working',   tone: 'blue',    order: 0 },
  not_started: { label: 'To Do',     tone: 'gray',    order: 1 },
  completed:   { label: 'Completed', tone: 'green',   order: 2 },
  blocked:     { label: 'Stuck',     tone: 'red',     order: 3 },
  cancelled:   { label: 'Closed',    tone: 'neutral', order: 4 },
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
