export type ActivityAction = 'created' | 'status_change' | 'priority_change' | 'owner_change' | 'eta_change' | 'comment_added' | 'completed' | 'reopened' | 'deleted' | 'moved';

export interface ActivityLogEntry {
  id: string;
  task_id: string;
  user_id: string;
  action: ActivityAction;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
