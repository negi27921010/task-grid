import type { Task, TaskFilters } from '../types';
import { computeAgingStatus } from './aging';

export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  return tasks.filter(task => {
    if (filters.status?.length && !filters.status.includes(task.status)) return false;
    if (filters.priority?.length && !filters.priority.includes(task.priority)) return false;
    if (filters.owner_id?.length && !filters.owner_id.includes(task.owner_id)) return false;
    if (filters.aging_status?.length) {
      const aging = computeAgingStatus(task);
      if (!filters.aging_status.includes(aging)) return false;
    }
    if (filters.tags?.length) {
      if (!filters.tags.some(tag => task.tags.includes(tag))) return false;
    }
    if (filters.search) {
      const query = filters.search.toLowerCase();
      if (!task.title.toLowerCase().includes(query) && !task.description.toLowerCase().includes(query)) return false;
    }
    if (filters.date_range) {
      const { start, end, field } = filters.date_range;
      const taskDate = task[field];
      if (!taskDate || taskDate < start || taskDate > end) return false;
    }
    return true;
  });
}

export function searchTasks(tasks: Task[], query: string): Task[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return tasks.filter(task =>
    task.title.toLowerCase().includes(q) ||
    task.description.toLowerCase().includes(q) ||
    task.tags.some(tag => tag.toLowerCase().includes(q))
  );
}
