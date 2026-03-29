import { VALID_STATUS_TRANSITIONS } from '../types';
import type { TaskStatus, Task } from '../types';

export function canTransitionTo(currentStatus: TaskStatus, targetStatus: TaskStatus): boolean {
  return VALID_STATUS_TRANSITIONS[currentStatus]?.includes(targetStatus) ?? false;
}

export function getValidTransitions(currentStatus: TaskStatus): TaskStatus[] {
  return VALID_STATUS_TRANSITIONS[currentStatus] ?? [];
}

export function canCompleteTask(task: Task, children: Task[]): { allowed: boolean; reason?: string } {
  const activeChildren = children.filter(
    c => c.status !== 'completed' && c.status !== 'cancelled'
  );

  if (activeChildren.length > 0) {
    return {
      allowed: false,
      reason: `Cannot complete: ${activeChildren.length} subtask(s) still active`,
    };
  }

  return { allowed: true };
}

export function requiresBlockerReason(targetStatus: TaskStatus): boolean {
  return targetStatus === 'blocked';
}
