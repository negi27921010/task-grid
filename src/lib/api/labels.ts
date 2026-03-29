import { v4 as uuidv4 } from 'uuid';
import { createClient } from '../supabase';
import type { Label } from '../types';

function sb() {
  return createClient();
}

export async function getLabels(): Promise<Label[]> {
  const { data, error } = await sb()
    .from('labels')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Label[];
}

export async function createLabel(input: {
  name: string;
  color: string;
  created_by: string;
}): Promise<Label> {
  const row = {
    id: uuidv4(),
    name: input.name,
    color: input.color,
    created_by: input.created_by,
  };
  const { data, error } = await sb()
    .from('labels')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as Label;
}

export async function deleteLabel(id: string): Promise<void> {
  const { error } = await sb().from('labels').delete().eq('id', id);
  if (error) throw error;
}
