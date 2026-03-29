import { v4 as uuidv4 } from 'uuid';
import { createClient } from '../supabase';
import type { Task, TaskStatus, CreateTaskInput, TaskComment } from '../types';
import { computeAgingStatus } from '../utils';

function sb() {
  return createClient();
}

function mapRow(row: Record<string, unknown>, childrenCount = 0, comments: TaskComment[] = []): Task {
  const ownerId = row.owner_id as string;
  const rawAssignees = (row.assignee_ids as string[]) ?? [];
  const assigneeIds = rawAssignees.length > 0 ? rawAssignees : ownerId ? [ownerId] : [];

  const task: Task = {
    id: row.id as string,
    project_id: row.project_id as string,
    parent_id: (row.parent_id as string) ?? null,
    title: row.title as string,
    description: (row.description as string) ?? '',
    status: row.status as TaskStatus,
    priority: row.priority as Task['priority'],
    owner_id: ownerId,
    assignee_ids: assigneeIds,
    eta: (row.eta as string) ?? null,
    started_at: (row.started_at as string) ?? null,
    completed_at: (row.completed_at as string) ?? null,
    blocker_reason: (row.blocker_reason as string) ?? null,
    depth: row.depth as number,
    position: row.position as number,
    path: row.path as string,
    tags: (row.tags as string[]) ?? [],
    estimated_hours: (row.estimated_hours as number) ?? null,
    actual_hours: (row.actual_hours as number) ?? null,
    remarks: (row.remarks as string) ?? null,
    comments,
    labels: (row.labels as string[]) ?? [],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    children_count: childrenCount,
  };
  task.aging_status = computeAgingStatus(task);
  return task;
}

async function countChildrenBulk(taskIds: string[]): Promise<Record<string, number>> {
  if (taskIds.length === 0) return {};
  const { data, error } = await sb()
    .from('tasks')
    .select('parent_id')
    .in('parent_id', taskIds);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const pid = row.parent_id as string;
    counts[pid] = (counts[pid] ?? 0) + 1;
  }
  return counts;
}

async function mapRows(rows: Record<string, unknown>[]): Promise<Task[]> {
  const ids = rows.map(r => r.id as string);
  const childCounts = await countChildrenBulk(ids);
  return rows.map(r => mapRow(r, childCounts[r.id as string] ?? 0));
}

export async function getTasks(projectId?: string): Promise<Task[]> {
  let query = sb().from('tasks').select('*');
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query.order('position', { ascending: true });
  if (error) throw error;
  return mapRows(data ?? []);
}

export async function getRootTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await sb()
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .eq('depth', 0)
    .order('position', { ascending: true });
  if (error) throw error;
  return mapRows(data ?? []);
}

export async function getChildTasks(parentId: string): Promise<Task[]> {
  const { data, error } = await sb()
    .from('tasks')
    .select('*')
    .eq('parent_id', parentId)
    .order('position', { ascending: true });
  if (error) throw error;
  return mapRows(data ?? []);
}

export async function getTaskById(id: string): Promise<Task | null> {
  const { data, error } = await sb()
    .from('tasks')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: commentRows } = await sb()
    .from('comments')
    .select('*')
    .eq('task_id', id)
    .order('created_at', { ascending: true });

  const comments: TaskComment[] = (commentRows ?? []).map(c => ({
    id: c.id,
    author_id: c.author_id,
    content: c.content,
    created_at: c.created_at,
  }));

  const childCounts = await countChildrenBulk([id]);
  return mapRow(data, childCounts[id] ?? 0, comments);
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const id = uuidv4();
  let depth = 0;
  let path = `/${id}`;
  let position = 0;

  if (input.parent_id) {
    const { data: parent } = await sb()
      .from('tasks')
      .select('depth, path')
      .eq('id', input.parent_id)
      .single();
    if (parent) {
      depth = (parent.depth as number) + 1;
      path = `${parent.path}/${id}`;
    }
    const { count } = await sb()
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', input.parent_id);
    position = count ?? 0;
  } else {
    const { count } = await sb()
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', input.project_id)
      .eq('depth', 0);
    position = count ?? 0;
  }

  const now = new Date().toISOString();
  const row = {
    id,
    project_id: input.project_id,
    parent_id: input.parent_id ?? null,
    title: input.title,
    description: input.description ?? '',
    status: input.status ?? 'not_started',
    priority: input.priority ?? 'P3',
    owner_id: input.owner_id,
    eta: input.eta ?? null,
    started_at: null,
    completed_at: null,
    blocker_reason: null,
    depth,
    position,
    path,
    tags: input.tags ?? [],
    estimated_hours: input.estimated_hours ?? null,
    actual_hours: null,
    remarks: input.remarks ?? null,
    labels: input.labels ?? [],
    assignee_ids: input.assignee_ids ?? [input.owner_id],
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await sb()
    .from('tasks')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return mapRow(data, 0);
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const safeUpdates: Record<string, unknown> = {};
  const allowed = [
    'title', 'description', 'status', 'priority', 'owner_id', 'assignee_ids',
    'eta', 'started_at', 'completed_at', 'blocker_reason', 'depth', 'position',
    'path', 'tags', 'estimated_hours', 'actual_hours', 'remarks', 'labels',
    'parent_id',
  ];
  for (const key of allowed) {
    if (key in updates) {
      safeUpdates[key] = (updates as Record<string, unknown>)[key];
    }
  }

  const { data, error } = await sb()
    .from('tasks')
    .update(safeUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  const childCounts = await countChildrenBulk([id]);
  return mapRow(data, childCounts[id] ?? 0);
}

export async function changeTaskStatus(
  id: string,
  newStatus: TaskStatus,
  metadata?: { blocker_reason?: string },
): Promise<Task> {
  const { data: current, error: fetchErr } = await sb()
    .from('tasks')
    .select('status, started_at')
    .eq('id', id)
    .single();
  if (fetchErr) throw fetchErr;

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { status: newStatus };

  if (newStatus === 'in_progress' && !current.started_at) {
    updates.started_at = now;
  }
  if (newStatus === 'blocked') {
    updates.blocker_reason = metadata?.blocker_reason ?? 'No reason provided';
  }
  if (newStatus === 'in_progress' && current.status === 'blocked') {
    updates.blocker_reason = null;
  }
  if (newStatus === 'completed') {
    updates.completed_at = now;
  }
  if (newStatus === 'in_progress' && current.status === 'completed') {
    updates.completed_at = null;
  }

  return updateTask(id, updates as Partial<Task>);
}

export async function deleteTask(id: string, mode: 'cascade' | 'promote'): Promise<void> {
  const { data: task, error: fetchErr } = await sb()
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchErr) throw fetchErr;

  if (mode === 'cascade') {
    const { error } = await sb()
      .from('tasks')
      .delete()
      .like('path', `${task.path}%`);
    if (error) throw error;
  } else {
    const { data: children } = await sb()
      .from('tasks')
      .select('*')
      .eq('parent_id', id);

    if (children && children.length > 0) {
      for (const child of children) {
        const newPath = task.parent_id
          ? (task.path as string).replace(`/${id}`, '') + `/${child.id}`
          : `/${child.id}`;
        await sb()
          .from('tasks')
          .update({
            parent_id: task.parent_id,
            depth: task.depth,
            path: newPath,
          })
          .eq('id', child.id);
      }
    }

    const { error } = await sb().from('tasks').delete().eq('id', id);
    if (error) throw error;
  }
}

export async function moveTask(
  id: string,
  newParentId: string | null,
  newPosition: number,
): Promise<Task> {
  const { data: task, error: fetchErr } = await sb()
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchErr) throw fetchErr;

  const oldPath = task.path as string;
  let newPath: string;
  let newDepth: number;

  if (newParentId) {
    const { data: parent } = await sb()
      .from('tasks')
      .select('depth, path')
      .eq('id', newParentId)
      .single();
    if (!parent) throw new Error('Parent not found');
    newDepth = (parent.depth as number) + 1;
    newPath = `${parent.path}/${id}`;
  } else {
    newDepth = 0;
    newPath = `/${id}`;
  }

  await sb()
    .from('tasks')
    .update({
      parent_id: newParentId,
      depth: newDepth,
      position: newPosition,
      path: newPath,
    })
    .eq('id', id);

  const { data: descendants } = await sb()
    .from('tasks')
    .select('id, path, depth')
    .like('path', `${oldPath}/%`);

  if (descendants && descendants.length > 0) {
    for (const d of descendants) {
      const updatedPath = (d.path as string).replace(oldPath, newPath);
      const updatedDepth = updatedPath.split('/').length - 2;
      await sb()
        .from('tasks')
        .update({ path: updatedPath, depth: updatedDepth })
        .eq('id', d.id);
    }
  }

  const { data: updated } = await sb()
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
  const childCounts = await countChildrenBulk([id]);
  return mapRow(updated!, childCounts[id] ?? 0);
}

export async function searchAllTasks(query: string): Promise<Task[]> {
  if (!query.trim()) return [];
  const q = `%${query}%`;
  const { data, error } = await sb()
    .from('tasks')
    .select('*')
    .or(`title.ilike.${q},description.ilike.${q}`)
    .limit(50);
  if (error) throw error;
  return mapRows(data ?? []);
}

export async function getTasksByOwner(ownerId: string): Promise<Task[]> {
  const { data, error } = await sb()
    .from('tasks')
    .select('*')
    .or(`owner_id.eq.${ownerId},assignee_ids.cs.{${ownerId}}`)
    .order('position', { ascending: true });
  if (error) throw error;
  return mapRows(data ?? []);
}

export async function getTasksByDepartment(deptId: string, userIds: string[]): Promise<Task[]> {
  if (userIds.length === 0) return [];
  const ownerFilter = userIds.map(id => `owner_id.eq.${id}`).join(',');
  const assigneeFilter = userIds.map(id => `assignee_ids.cs.{${id}}`).join(',');
  const { data, error } = await sb()
    .from('tasks')
    .select('*')
    .or(`${ownerFilter},${assigneeFilter}`)
    .order('position', { ascending: true });
  if (error) throw error;
  return mapRows(data ?? []);
}

export async function getAllTasks(): Promise<Task[]> {
  const { data, error } = await sb()
    .from('tasks')
    .select('*')
    .order('position', { ascending: true });
  if (error) throw error;
  return mapRows(data ?? []);
}

export async function deleteTasksByProject(projectId: string): Promise<void> {
  const { error } = await sb()
    .from('tasks')
    .delete()
    .eq('project_id', projectId);
  if (error) throw error;
}

export async function addComment(
  taskId: string,
  authorId: string,
  content: string,
): Promise<Task> {
  const commentRow = {
    id: uuidv4(),
    task_id: taskId,
    author_id: authorId,
    content,
  };
  const { error } = await sb().from('comments').insert(commentRow);
  if (error) throw error;

  const task = await getTaskById(taskId);
  if (!task) throw new Error('Task not found');
  return task;
}

export async function updateRemarks(taskId: string, remarks: string | null): Promise<Task> {
  return updateTask(taskId, { remarks } as Partial<Task>);
}
