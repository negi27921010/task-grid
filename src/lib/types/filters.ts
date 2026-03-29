import type { TaskStatus, Priority, AgingStatus } from './task';

export type SortField = 'priority' | 'eta' | 'created_at' | 'title' | 'status' | 'aging' | 'updated_at';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'table' | 'kanban' | 'hybrid';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: Priority[];
  owner_id?: string[];
  aging_status?: AgingStatus[];
  tags?: string[];
  search?: string;
  date_range?: {
    start: string;
    end: string;
    field: 'created_at' | 'eta';
  };
}

export interface SavedFilterPreset {
  id: string;
  name: string;
  filters: TaskFilters;
  sort: SortConfig[];
}
