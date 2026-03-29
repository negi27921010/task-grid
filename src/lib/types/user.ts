export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  org_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  department: string;
  created_at: string;
}
