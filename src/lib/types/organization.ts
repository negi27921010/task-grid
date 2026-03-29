export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface Department {
  id: string;
  org_id: string;
  name: string;
  custom_label: string | null;
  head_user_id: string | null;
  color: string | null;
  created_at: string;
}
