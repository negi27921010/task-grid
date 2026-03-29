export type NotificationType = 'assigned' | 'status_changed' | 'mentioned' | 'overdue' | 'completed' | 'eta_changed';

export interface Notification {
  id: string;
  user_id: string;
  task_id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  created_at: string;
}
