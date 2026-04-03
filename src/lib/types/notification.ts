export type NotificationType = 'mention' | 'assignment' | 'status_change';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  task_id: string | null;
  project_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface CreateNotificationInput {
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  task_id?: string | null;
  project_id?: string | null;
}
