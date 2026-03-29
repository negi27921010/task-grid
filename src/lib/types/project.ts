export type ProjectStatus = 'active' | 'archived' | 'paused';

export interface Project {
  id: string;
  dept_id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner_id: string;
  start_date: string | null;
  target_date: string | null;
  created_at: string;
}
