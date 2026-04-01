import type { User, UserRole } from '../types/user';

export interface RoleCapabilities {
  canManageUsers: boolean;
  canAssignRoles: boolean;
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canCreateTasks: boolean;
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

const ADMIN_CAPABILITIES: RoleCapabilities = {
  canManageUsers: true,
  canAssignRoles: true,
  canCreateProjects: true,
  canEditProjects: true,
  canDeleteProjects: true,
  canCreateTasks: true,
  canAssignTaskToAnyone: true,
  canModifyAllTaskFields: true,
  canDeleteTasks: true,
  canUpdateTaskStatus: true,
  canUpdateTaskEta: true,
  canSetPriority: true,
  canAddComments: true,
  canViewAllProjects: true,
  canAccessSettings: true,
};

export const DEFAULT_MEMBER_CAPABILITIES: RoleCapabilities = {
  canManageUsers: false,
  canAssignRoles: false,
  canCreateProjects: false,
  canEditProjects: false,
  canDeleteProjects: false,
  canCreateTasks: true,
  canAssignTaskToAnyone: false,
  canModifyAllTaskFields: false,
  canDeleteTasks: false,
  canUpdateTaskStatus: true,
  canUpdateTaskEta: true,
  canSetPriority: true,
  canAddComments: true,
  canViewAllProjects: true,
  canAccessSettings: false,
};

// Runtime-overridable member capabilities (set via setMemberCapabilities)
let _memberCapabilities: RoleCapabilities = { ...DEFAULT_MEMBER_CAPABILITIES };

export function setMemberCapabilities(caps: Partial<RoleCapabilities>) {
  _memberCapabilities = { ...DEFAULT_MEMBER_CAPABILITIES, ...caps };
}

export function getMemberCapabilities(): RoleCapabilities {
  return _memberCapabilities;
}

export function getCapabilities(role: UserRole): RoleCapabilities {
  return role === 'admin' ? ADMIN_CAPABILITIES : _memberCapabilities;
}

export function can(user: User, capability: keyof RoleCapabilities): boolean {
  return getCapabilities(user.role)[capability];
}

export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}

// Capabilities that admin can never lose (always true for admin, but can be toggled for member)
export const ADMIN_LOCKED_CAPABILITIES: (keyof RoleCapabilities)[] = [
  'canManageUsers',
  'canAssignRoles',
  'canAccessSettings',
];

// Capabilities that should always remain true for members (non-toggleable)
export const MEMBER_LOCKED_TRUE: (keyof RoleCapabilities)[] = [];

// Capabilities that should always remain false for members
export const MEMBER_LOCKED_FALSE: (keyof RoleCapabilities)[] = [
  'canManageUsers',
  'canAssignRoles',
  'canAccessSettings',
];

export const ROLE_DESCRIPTIONS: Record<UserRole, { label: string; description: string }> = {
  admin: {
    label: 'Admin',
    description: 'Full access to all capabilities. Cannot be modified.',
  },
  member: {
    label: 'Member',
    description: 'Configurable access. Toggle capabilities below.',
  },
};

export const CAPABILITY_LABELS: Record<keyof RoleCapabilities, string> = {
  canManageUsers: 'Add / Remove Users',
  canAssignRoles: 'Assign Roles',
  canCreateProjects: 'Create Projects',
  canEditProjects: 'Edit Projects',
  canDeleteProjects: 'Delete Projects',
  canCreateTasks: 'Add Tasks',
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
