import { v4 as uuidv4 } from 'uuid';
import { createClient } from '../supabase';
import type { Notification, CreateNotificationInput, NotificationType } from '../types';

function sb() {
  return createClient();
}

function mapRow(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    type: row.type as NotificationType,
    title: row.title as string,
    body: (row.body as string) ?? '',
    task_id: (row.task_id as string) ?? null,
    project_id: (row.project_id as string) ?? null,
    is_read: row.is_read as boolean,
    created_at: row.created_at as string,
  };
}

export async function getNotifications(
  userId: string,
  limit: number = 30,
): Promise<Notification[]> {
  const { data, error } = await sb()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await sb()
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function markAsRead(id: string): Promise<void> {
  const { error } = await sb()
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await sb()
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<Notification> {
  const { data, error } = await sb()
    .from('notifications')
    .insert({
      id: uuidv4(),
      user_id: input.user_id,
      type: input.type,
      title: input.title,
      body: input.body ?? '',
      task_id: input.task_id ?? null,
      project_id: input.project_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function createBulkNotifications(
  inputs: CreateNotificationInput[],
): Promise<void> {
  if (inputs.length === 0) return;
  const rows = inputs.map((input) => ({
    id: uuidv4(),
    user_id: input.user_id,
    type: input.type,
    title: input.title,
    body: input.body ?? '',
    task_id: input.task_id ?? null,
    project_id: input.project_id ?? null,
  }));
  const { error } = await sb().from('notifications').insert(rows);
  if (error) throw error;
}
