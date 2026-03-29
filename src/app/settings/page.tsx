'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useViewMode } from '@/lib/hooks/use-view-mode';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/lib/hooks/use-users';
import { isAdmin, getCapabilities, ROLE_DESCRIPTIONS, CAPABILITY_LABELS } from '@/lib/utils/permissions';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import * as Dialog from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import {
  Settings,
  Users,
  Shield,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
} from 'lucide-react';
import type { User, UserRole } from '@/lib/types';

type SettingsTab = 'users' | 'permissions';

function UserForm({
  user,
  onSave,
  onCancel,
  isPending,
}: {
  user?: User;
  onSave: (data: { full_name: string; email: string; role: UserRole; department: string }) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(user?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'member');
  const [department, setDepartment] = useState(user?.department ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ full_name: name.trim(), email: email.trim(), role, department: department.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          required
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@pw.live"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="admin">Admin</option>
          <option value="member">Member</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
        <input
          type="text"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="e.g. Product & Analytics"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" size="sm" disabled={isPending || !name.trim()}>
          {user ? 'Save Changes' : 'Add User'}
        </Button>
      </div>
    </form>
  );
}

export default function SettingsPage() {
  const { currentUser, refreshUsers } = useCurrentUser();
  const { viewMode, setViewMode } = useViewMode();
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const { toast } = useToast();

  const [tab, setTab] = useState<SettingsTab>('users');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [resetPwUser, setResetPwUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetPwLoading, setResetPwLoading] = useState(false);

  const userIsAdmin = isAdmin(currentUser);

  if (!userIsAdmin) {
    return (
      <AppShell viewMode={viewMode} onViewModeChange={setViewMode}>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <ShieldAlert className="mx-auto h-12 w-12 text-gray-300" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900">Access Denied</h2>
            <p className="mt-1 text-sm text-gray-500">Only admins can access the Settings panel.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const handleAddUser = (data: { full_name: string; email: string; role: UserRole; department: string }) => {
    createUser.mutate(
      { full_name: data.full_name, email: data.email || undefined, role: data.role, department: data.department },
      {
        onSuccess: () => {
          setAddDialogOpen(false);
          refreshUsers();
          toast('User added successfully', 'success');
        },
        onError: (err: Error) => {
          toast(`Failed to add user: ${err.message}`, 'error');
        },
      }
    );
  };

  const handleEditUser = (data: { full_name: string; email: string; role: UserRole; department: string }) => {
    if (!editingUser) return;
    if (editingUser.role === 'admin' && data.role !== 'admin') {
      const otherAdmins = allUsers.filter(u => u.role === 'admin' && u.id !== editingUser.id);
      if (otherAdmins.length === 0) {
        toast('Cannot demote the last admin', 'error');
        return;
      }
    }
    updateUser.mutate(
      { id: editingUser.id, updates: data },
      {
        onSuccess: () => {
          setEditingUser(null);
          refreshUsers();
          toast('User updated', 'success');
        },
        onError: (err: Error) => {
          toast(`Failed to update user: ${err.message}`, 'error');
        },
      }
    );
  };

  const handleDeleteUser = () => {
    if (!deleteConfirmUser) return;
    if (deleteConfirmUser.id === currentUser.id) {
      toast('Cannot delete yourself', 'error');
      setDeleteConfirmUser(null);
      return;
    }
    if (deleteConfirmUser.role === 'admin') {
      const otherAdmins = allUsers.filter(u => u.role === 'admin' && u.id !== deleteConfirmUser.id);
      if (otherAdmins.length === 0) {
        toast('Cannot delete the last admin', 'error');
        setDeleteConfirmUser(null);
        return;
      }
    }
    deleteUserMutation.mutate(deleteConfirmUser.id, {
      onSuccess: () => {
        setDeleteConfirmUser(null);
        refreshUsers();
        toast('User removed', 'success');
      },
    });
  };

  const handleResetPassword = async () => {
    if (!resetPwUser?.email || !newPassword) return;
    if (newPassword.length < 8) {
      toast('Password must be at least 8 characters', 'error');
      return;
    }
    setResetPwLoading(true);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetPwUser.email, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to reset password');
      toast(`Password reset for ${resetPwUser.full_name}`, 'success');
      setResetPwUser(null);
      setNewPassword('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to reset password', 'error');
    } finally {
      setResetPwLoading(false);
    }
  };

  const allUsers = users ?? [];
  const adminCount = allUsers.filter(u => u.role === 'admin').length;
  const memberCount = allUsers.filter(u => u.role === 'member').length;

  return (
    <AppShell viewMode={viewMode} onViewModeChange={setViewMode}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-400" />
            Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">Manage users, roles, and permissions.</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === 'users'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="h-4 w-4" />
            User Management
          </button>
          <button
            onClick={() => setTab('permissions')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === 'permissions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Shield className="h-4 w-4" />
            Permissions Overview
          </button>
        </div>

        {/* User Management Tab */}
        {tab === 'users' && (
          <div className="space-y-4">
            {/* Stats + Add */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{allUsers.length} users total</span>
                <Badge variant="info">{adminCount} Admin{adminCount !== 1 ? 's' : ''}</Badge>
                <Badge variant="default">{memberCount} Member{memberCount !== 1 ? 's' : ''}</Badge>
              </div>
              <Button variant="primary" size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add User
              </Button>
            </div>

            {/* User list */}
            <div className="rounded-lg border border-gray-200 bg-white">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">User</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Department</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Role</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                    <th className="w-24 px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Loading...</td></tr>
                  ) : allUsers.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">No users found</td></tr>
                  ) : (
                    allUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar fullName={user.full_name} src={user.avatar_url} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                              {user.id === currentUser.id && (
                                <span className="text-[10px] text-blue-600 font-medium">(You)</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.department || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={user.role === 'admin' ? 'info' : 'default'}>
                            {user.role === 'admin' ? 'Admin' : 'Member'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{user.email || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {user.email && (
                              <button
                                onClick={() => { setResetPwUser(user); setNewPassword(''); }}
                                className="rounded p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                                aria-label={`Reset password for ${user.full_name}`}
                                title="Reset Password"
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setEditingUser(user)}
                              className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                              aria-label={`Edit ${user.full_name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmUser(user)}
                              disabled={user.id === currentUser.id}
                              className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:pointer-events-none"
                              aria-label={`Delete ${user.full_name}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Future-ready note */}
            <p className="text-xs text-gray-400 italic">
              Future: email-based login, invitation links, and SSO will be supported once backend is connected.
            </p>
          </div>
        )}

        {/* Permissions Overview Tab */}
        {tab === 'permissions' && (
          <div className="space-y-6">
            {(['admin', 'member'] as UserRole[]).map((role) => {
              const caps = getCapabilities(role);
              const desc = ROLE_DESCRIPTIONS[role];
              const entries = Object.entries(CAPABILITY_LABELS) as [keyof typeof caps, string][];

              return (
                <div key={role} className="rounded-lg border border-gray-200 bg-white">
                  <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
                    <ShieldCheck className={`h-5 w-5 ${role === 'admin' ? 'text-blue-500' : 'text-gray-400'}`} />
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{desc.label}</h3>
                      <p className="text-xs text-gray-500">{desc.description}</p>
                    </div>
                  </div>
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {entries.map(([key, label]) => {
                        const allowed = caps[key];
                        return (
                          <div key={key} className="flex items-center gap-2 text-sm">
                            {allowed ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <X className="h-4 w-4 text-red-400" />
                            )}
                            <span className={allowed ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add User Dialog */}
        <Dialog.Root open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <Dialog.Content className="max-w-md">
            <Dialog.Title>Add New User</Dialog.Title>
            <Dialog.Description>Add a team member to Task Grid.</Dialog.Description>
            <div className="mt-4">
              <UserForm
                onSave={handleAddUser}
                onCancel={() => setAddDialogOpen(false)}
                isPending={createUser.isPending}
              />
            </div>
          </Dialog.Content>
        </Dialog.Root>

        {/* Edit User Dialog */}
        <Dialog.Root open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
          <Dialog.Content className="max-w-md">
            <Dialog.Title>Edit User</Dialog.Title>
            <Dialog.Description>Update user details and role assignment.</Dialog.Description>
            <div className="mt-4">
              {editingUser && (
                <UserForm
                  user={editingUser}
                  onSave={handleEditUser}
                  onCancel={() => setEditingUser(null)}
                  isPending={updateUser.isPending}
                />
              )}
            </div>
          </Dialog.Content>
        </Dialog.Root>

        {/* Delete Confirm Dialog */}
        <Dialog.Root open={!!deleteConfirmUser} onOpenChange={(open) => { if (!open) setDeleteConfirmUser(null); }}>
          <Dialog.Content className="max-w-sm">
            <Dialog.Title>Remove User</Dialog.Title>
            <Dialog.Description>
              Are you sure you want to remove <strong>{deleteConfirmUser?.full_name}</strong>? Their existing task assignments will remain but the user will no longer appear in the system.
            </Dialog.Description>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmUser(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteUser} disabled={deleteUserMutation.isPending}>
                Remove User
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Root>

        {/* Reset Password Dialog */}
        <Dialog.Root open={!!resetPwUser} onOpenChange={(open) => { if (!open) { setResetPwUser(null); setNewPassword(''); } }}>
          <Dialog.Content className="max-w-sm">
            <Dialog.Title>Reset Password</Dialog.Title>
            <Dialog.Description>
              Set a new password for <strong>{resetPwUser?.full_name}</strong> ({resetPwUser?.email}).
            </Dialog.Description>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setResetPwUser(null); setNewPassword(''); }}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleResetPassword} disabled={resetPwLoading || newPassword.length < 8}>
                  {resetPwLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Root>
      </div>
    </AppShell>
  );
}
