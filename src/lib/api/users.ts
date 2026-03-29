import { v4 as uuidv4 } from 'uuid';
import { createClient } from '../supabase';
import type { User, UserRole } from '../types';

function sb() {
  return createClient();
}

function mapRow(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    org_id: 'org-1',
    email: (row.email as string) ?? '',
    full_name: row.full_name as string,
    avatar_url: (row.avatar_url as string) ?? null,
    role: row.role as UserRole,
    department: (row.department as string) ?? '',
    created_at: row.created_at as string,
  };
}

export async function getUsers(): Promise<User[]> {
  const { data, error } = await sb()
    .from('users')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await sb()
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await sb()
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function getUsersByDepartment(dept: string): Promise<User[]> {
  const { data, error } = await sb()
    .from('users')
    .select('*')
    .eq('department', dept);
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export interface CreateUserInput {
  full_name: string;
  email?: string;
  role: UserRole;
  department: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const row = {
    id: uuidv4(),
    email: input.email ?? '',
    full_name: input.full_name,
    avatar_url: null,
    role: input.role,
    department: input.department,
  };
  const { data, error } = await sb()
    .from('users')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function updateUser(
  id: string,
  updates: Partial<Pick<User, 'full_name' | 'email' | 'role' | 'department'>>,
): Promise<User> {
  const { data, error } = await sb()
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await sb().from('users').delete().eq('id', id);
  if (error) throw error;
}

export async function getUsersSync(): Promise<User[]> {
  return getUsers();
}
