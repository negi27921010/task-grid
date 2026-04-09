import { v4 as uuidv4 } from 'uuid';
import { createClient } from '../supabase';
import type {
  WorkstreamRegistry,
  CreateRegistryInput,
  UpdateRegistryInput,
  RegistryCategory,
  RegistryPriorityTag,
  RegistryStatus,
} from '../types';

function sb() {
  return createClient();
}

function mapRow(row: Record<string, unknown>): WorkstreamRegistry {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
    category: row.category as RegistryCategory,
    priority_tag: row.priority_tag as RegistryPriorityTag,
    status: row.status as RegistryStatus,
    primary_owner_id: row.primary_owner_id as string,
    secondary_owner_id: (row.secondary_owner_id as string) ?? null,
    team: (row.team as string) ?? '',
    sop_links: (row.sop_links as string[]) ?? [],
    important_links: (row.important_links as string[]) ?? [],
    dependencies: (row.dependencies as string) ?? '',
    notes: (row.notes as string) ?? '',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function getRegistries(): Promise<WorkstreamRegistry[]> {
  const { data, error } = await sb()
    .from('workstream_registry')
    .select('*')
    .order('priority_tag', { ascending: true })
    .order('name', { ascending: true });
  if (error) {
    // Table may not exist yet
    if (error.message?.includes('workstream_registry')) return [];
    throw error;
  }
  return (data ?? []).map(mapRow);
}

export async function getRegistryById(id: string): Promise<WorkstreamRegistry | null> {
  const { data, error } = await sb()
    .from('workstream_registry')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function createRegistry(input: CreateRegistryInput): Promise<WorkstreamRegistry> {
  const now = new Date().toISOString();
  const { data, error } = await sb()
    .from('workstream_registry')
    .insert({
      id: uuidv4(),
      name: input.name,
      description: input.description ?? '',
      category: input.category,
      priority_tag: input.priority_tag,
      status: input.status ?? 'Active',
      primary_owner_id: input.primary_owner_id,
      secondary_owner_id: input.secondary_owner_id ?? null,
      team: input.team ?? '',
      sop_links: input.sop_links ?? [],
      important_links: input.important_links ?? [],
      dependencies: input.dependencies ?? '',
      notes: input.notes ?? '',
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function updateRegistry(
  id: string,
  input: UpdateRegistryInput,
): Promise<WorkstreamRegistry> {
  const { data, error } = await sb()
    .from('workstream_registry')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function deleteRegistry(id: string): Promise<void> {
  const { error } = await sb().from('workstream_registry').delete().eq('id', id);
  if (error) throw error;
}
