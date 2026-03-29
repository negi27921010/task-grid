import { v4 as uuidv4 } from 'uuid';
import { createClient } from '../supabase';
import type { Project, ProjectStatus } from '../types';

function sb() {
  return createClient();
}

function mapRow(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    dept_id: 'general',
    name: row.name as string,
    description: (row.description as string) ?? '',
    status: row.status as ProjectStatus,
    owner_id: row.owner_id as string,
    start_date: (row.start_date as string) ?? null,
    target_date: (row.target_date as string) ?? null,
    created_at: row.created_at as string,
  };
}

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await sb()
    .from('projects')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getProjectById(id: string): Promise<Project | null> {
  const { data, error } = await sb()
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  owner_id: string;
  start_date?: string | null;
  target_date?: string | null;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const row = {
    id: uuidv4(),
    name: input.name,
    description: input.description ?? '',
    status: 'active',
    owner_id: input.owner_id,
    start_date: input.start_date ?? null,
    target_date: input.target_date ?? null,
  };
  const { data, error } = await sb()
    .from('projects')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function updateProject(
  id: string,
  updates: Partial<Pick<Project, 'name' | 'description' | 'status' | 'owner_id' | 'start_date' | 'target_date'>>,
): Promise<Project> {
  const { data, error } = await sb()
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await sb().from('projects').delete().eq('id', id);
  if (error) throw error;
}
