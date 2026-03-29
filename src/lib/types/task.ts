export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
export type Priority = 'P1' | 'P2' | 'P3' | 'P4';
export type AgingStatus = 'overdue' | 'at_risk' | 'on_track' | 'no_eta' | 'stale';
export type TaskDepthLabel = 'Task' | 'Subtask' | 'Microtask' | string;

export interface TaskComment {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  created_by: string;
  created_at: string;
}

export const LABEL_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export interface Task {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  owner_id: string;
  assignee_ids: string[];
  eta: string | null;
  started_at: string | null;
  completed_at: string | null;
  blocker_reason: string | null;
  depth: number;
  position: number;
  path: string;
  tags: string[];
  estimated_hours: number | null;
  actual_hours: number | null;
  remarks: string | null;
  comments: TaskComment[];
  labels: string[];
  created_at: string;
  updated_at: string;
  children_count?: number;
  comments_count?: number;
  aging_status?: AgingStatus;
}

export interface CreateTaskInput {
  project_id: string;
  parent_id?: string | null;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  owner_id: string;
  assignee_ids?: string[];
  eta?: string | null;
  tags?: string[];
  estimated_hours?: number | null;
  remarks?: string | null;
  labels?: string[];
}

export const VALID_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  not_started: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['blocked', 'completed', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  completed: ['in_progress'],
  cancelled: ['not_started'],
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  P1: 0,
  P2: 1,
  P3: 2,
  P4: 3,
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'To Do',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  completed: 'Done',
  cancelled: 'Cancelled',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  P1: 'Critical',
  P2: 'High',
  P3: 'Medium',
  P4: 'Low',
};

export function getTaskDepthLabel(depth: number): TaskDepthLabel {
  switch (depth) {
    case 0: return 'Task';
    case 1: return 'Subtask';
    case 2: return 'Microtask';
    default: return `Level ${depth}`;
  }
}
