export type RegistryCategory = 'Finance' | 'Ops' | 'Hiring' | 'Product' | 'Tech' | 'Business';
export type RegistryPriorityTag = 'Core' | 'Strategic' | 'Support';
export type RegistryStatus = 'Active' | 'On Hold' | 'Completed' | 'Deprecated';

export interface WorkstreamRegistry {
  id: string;
  name: string;
  description: string;
  category: RegistryCategory;
  priority_tag: RegistryPriorityTag;
  status: RegistryStatus;
  primary_owner_id: string;
  secondary_owner_id: string | null;
  team: string;
  sop_links: string[];
  important_links: string[];
  dependencies: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRegistryInput {
  name: string;
  description?: string;
  category: RegistryCategory;
  priority_tag: RegistryPriorityTag;
  status?: RegistryStatus;
  primary_owner_id: string;
  secondary_owner_id?: string | null;
  team?: string;
  sop_links?: string[];
  important_links?: string[];
  dependencies?: string;
  notes?: string;
}

export interface UpdateRegistryInput {
  name?: string;
  description?: string;
  category?: RegistryCategory;
  priority_tag?: RegistryPriorityTag;
  status?: RegistryStatus;
  primary_owner_id?: string;
  secondary_owner_id?: string | null;
  team?: string;
  sop_links?: string[];
  important_links?: string[];
  dependencies?: string;
  notes?: string;
}
