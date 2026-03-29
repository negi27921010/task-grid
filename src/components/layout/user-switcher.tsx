'use client';

import { useState } from 'react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { createClient } from '@/lib/supabase';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import * as DropdownMenu from '@/components/ui/dropdown-menu';
import * as Dialog from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { ChevronDown, LogOut, KeyRound } from 'lucide-react';
import type { UserRole } from '@/lib/types';

const roleBadgeVariant: Record<UserRole, 'info' | 'default'> = {
  admin: 'info',
  member: 'default',
};

const roleLabel: Record<UserRole, string> = {
  admin: 'Admin',
  member: 'Member',
};

export function UserSwitcher() {
  const { currentUser, signOut } = useCurrentUser();
  const { toast } = useToast();
  const [changePwOpen, setChangePwOpen] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (newPw.length < 8) {
      toast('Password must be at least 8 characters', 'error');
      return;
    }
    if (newPw !== confirmPw) {
      toast('Passwords do not match', 'error');
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast('Password changed successfully', 'success');
      setChangePwOpen(false);
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
            <Avatar fullName={currentUser.full_name} src={currentUser.avatar_url} size="sm" />
            <span className="max-w-[120px] truncate font-medium">{currentUser.full_name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content align="end" className="w-56">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-gray-900">{currentUser.full_name}</p>
            <p className="text-xs text-gray-500">{currentUser.email}</p>
            <Badge variant={roleBadgeVariant[currentUser.role]} className="mt-1 text-[10px]">
              {roleLabel[currentUser.role]}
            </Badge>
          </div>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onClick={() => setChangePwOpen(true)}
            className="flex items-center gap-2"
          >
            <KeyRound className="h-4 w-4" />
            Change Password
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onClick={() => signOut()}
            className="flex items-center gap-2 text-red-600 focus:text-red-700"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <Dialog.Root open={changePwOpen} onOpenChange={open => { if (!open) { setChangePwOpen(false); setNewPw(''); setConfirmPw(''); } }}>
        <Dialog.Content className="max-w-sm">
          <Dialog.Title>Change Password</Dialog.Title>
          <Dialog.Description>Enter a new password for your account.</Dialog.Description>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setChangePwOpen(false); setNewPw(''); setConfirmPw(''); }}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleChangePassword} disabled={loading || newPw.length < 8 || newPw !== confirmPw}>
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
