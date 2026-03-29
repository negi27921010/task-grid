import type { Project } from '../types';

export const seedProjects: Project[] = [
  {
    id: 'proj-clm',
    dept_id: 'general',
    name: 'Customer Lifecycle Management',
    description: 'End-to-end customer lifecycle tracking — acquisition, onboarding, engagement, retention, and win-back workflows.',
    status: 'active',
    owner_id: 'user-admin-1',
    start_date: '2026-03-01',
    target_date: null,
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'proj-tp',
    dept_id: 'general',
    name: 'Test Prep',
    description: 'Test preparation operations — content scheduling, batch management, student performance tracking, and result analysis.',
    status: 'active',
    owner_id: 'user-admin-1',
    start_date: '2026-03-01',
    target_date: null,
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'proj-k8',
    dept_id: 'general',
    name: 'K8',
    description: 'K8 vertical operations — curriculum planning, teacher coordination, content delivery, and student engagement for classes K–8.',
    status: 'active',
    owner_id: 'user-admin-2',
    start_date: '2026-03-01',
    target_date: null,
    created_at: '2026-03-01T00:00:00Z',
  },
];
