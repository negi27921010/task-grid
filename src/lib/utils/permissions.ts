import type { User, UserRole } from '../types/user';

export interface RoleCapabilities {
  canManageUsers: boolean;
  canAssignRoles: boolean;
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canAssignTaskToAnyone: boolean;
  canModifyAllTaskFields: boolean;
  canDeleteTasks: boolean;
  canUpdateTaskStatus: boolean;
  canUpdateTaskEta: boolean;
  canSetPriority: boolean;
  canAddComments: boolean;
  canViewAllProjects: boolean;
  canAccessSettings: boolean;
}

const ROLE_CAPABILITIES: Record<UserRole, RoleCapabilities> = {
  admin: {
    canManageUsers: true,
    canAssignRoles: true,
    canCreateProjects: true,
    canEditProjects: true,
    canDeleteProjects: true,
    canAssignTaskToAnyone: true,
    canModifyAllTaskFields: true,
    canDeleteTasks: true,
    canUpdateTaskStatus: true,
    canUpdateTaskEta: true,
    canSetPriority: true,
    canAddComments: true,
    canViewAllProjects: true,
    canAccessSettings: true,
  },
  member: {
    canManageUsers: false,
    canAssignRoles: false,
    canCreateProjects: false,
    canEditProjects: false,
    canDeleteProjects: false,
    canAssignTaskToAnyone: false,
    canModifyAllTaskFields: false,
    canDeleteTasks: false,
    canUpdateTaskStatus: true,
    canUpdateTaskEta: true,
    canSetPriority: true,
    canAddComments: true,
    canViewAllProjects: true,
    canAccessSettings: false,
  },
};

export function getCapabilities(role: UserRole): RoleCapabilities {
  return ROLE_CAPABILITIES[role];
}

export function can(user: User, capability: keyof RoleCapabilities): boolean {
  return ROLE_CAPABILITIES[user.role][capability];
}

export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

export const ROLE_DESCRIPTIONS: Record<UserRole, { label: string; description: string }> = {
  admin: {
    label: 'Admin',
    description: 'Full access: manage users, create/edit/delete projects, assign tasks to anyone, modify all task fields.',
  },
  member: {
    label: 'Member',
    description: 'View assigned & shared projects. Update task status, comments, and ETA. Cannot delete projects or manage users.',
  },
};

export const CAPABILITY_LABELS: Record<keyof RoleCapabilities, string> = {
  canManageUsers: 'Add / Remove Users',
  canAssignRoles: 'Assign Roles',
  canCreateProjects: 'Create Projects',
  canEditProjects: 'Edit Projects',
  canDeleteProjects: 'Delete Projects',
  canAssignTaskToAnyone: 'Assign Tasks to Anyone',
  canModifyAllTaskFields: 'Modify All Task Fields',
  canDeleteTasks: 'Delete Tasks',
  canUpdateTaskStatus: 'Update Task Status',
  canUpdateTaskEta: 'Update Task ETA',
  canSetPriority: 'Set Task Priority',
  canAddComments: 'Add Comments',
  canViewAllProjects: 'View All Projects',
  canAccessSettings: 'Access Settings Panel',
};
