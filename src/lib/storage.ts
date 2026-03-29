import type { User } from './types/user';
import type { Project } from './types/project';
import type { Task, Label } from './types/task';

const STORAGE_VERSION = 'v6';

const KEYS = {
  users: `taskflow-${STORAGE_VERSION}-users`,
  projects: `taskflow-${STORAGE_VERSION}-projects`,
  tasks: `taskflow-${STORAGE_VERSION}-tasks`,
  labels: `taskflow-${STORAGE_VERSION}-labels`,
  currentUserId: `taskflow-${STORAGE_VERSION}-current-user-id`,
};

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function loadRaw<T>(key: string): T | null {
  if (!isClient()) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveRaw<T>(key: string, data: T): void {
  if (!isClient()) return;
  localStorage.setItem(key, JSON.stringify(data));
}

export function loadUsers(seed: User[]): User[] {
  const stored = loadRaw<User[]>(KEYS.users);
  if (stored && stored.length > 0) return stored;
  saveRaw(KEYS.users, seed);
  return [...seed];
}

export function saveUsers(users: User[]): void {
  saveRaw(KEYS.users, users);
}

export function loadProjects(seed: Project[]): Project[] {
  const stored = loadRaw<Project[]>(KEYS.projects);
  if (stored && stored.length > 0) return stored;
  saveRaw(KEYS.projects, seed);
  return [...seed];
}

export function saveProjects(projects: Project[]): void {
  saveRaw(KEYS.projects, projects);
}

export function loadTasks(seed: Task[]): Task[] {
  const stored = loadRaw<Task[]>(KEYS.tasks);
  if (stored) return stored;
  saveRaw(KEYS.tasks, seed);
  return [...seed];
}

export function saveTasks(tasks: Task[]): void {
  saveRaw(KEYS.tasks, tasks);
}

export function loadLabels(seed: Label[]): Label[] {
  const stored = loadRaw<Label[]>(KEYS.labels);
  if (stored && stored.length > 0) return stored;
  saveRaw(KEYS.labels, seed);
  return [...seed];
}

export function saveLabels(labels: Label[]): void {
  saveRaw(KEYS.labels, labels);
}

export function loadCurrentUserId(defaultId: string): string {
  if (!isClient()) return defaultId;
  return localStorage.getItem(KEYS.currentUserId) ?? defaultId;
}

export function saveCurrentUserId(id: string): void {
  if (!isClient()) return;
  localStorage.setItem(KEYS.currentUserId, id);
}
