import { differenceInHours, differenceInDays } from 'date-fns';
import type { Task, AgingStatus } from '../types';

export function computeAgingStatus(task: Task, now: Date = new Date()): AgingStatus {
  // Completed/cancelled tasks are always on_track
  if (task.status === 'completed' || task.status === 'cancelled') return 'on_track';

  // Check stale first: no updates in 7+ days
  const lastUpdate = new Date(task.updated_at);
  if (differenceInDays(now, lastUpdate) >= 7) return 'stale';

  // No ETA set
  if (!task.eta) return 'no_eta';

  const eta = new Date(task.eta);

  // Overdue: past ETA
  if (now > eta) return 'overdue';

  // At risk: within 48 hours
  if (differenceInHours(eta, now) <= 48) return 'at_risk';

  return 'on_track';
}

export function getAgingDays(task: Task, now: Date = new Date()): number | null {
  if (!task.eta) return null;
  const eta = new Date(task.eta);
  return differenceInDays(now, eta); // positive = overdue, negative = days remaining
}

export function getAgingLabel(task: Task, now: Date = new Date()): string {
  const status = computeAgingStatus(task, now);
  const days = getAgingDays(task, now);

  switch (status) {
    case 'overdue': return `${days}d overdue`;
    case 'at_risk': {
      const hours = differenceInHours(new Date(task.eta!), now);
      return hours <= 24 ? `${hours}h left` : `${Math.abs(days!)}d left`;
    }
    case 'on_track': return days !== null ? `${Math.abs(days!)}d left` : '';
    case 'no_eta': return 'No ETA';
    case 'stale': return 'Stale';
  }
}
