'use client';

import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import * as DropdownMenu from '@/components/ui/dropdown-menu';
import { ChevronDown, LogOut } from 'lucide-react';
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

  return (
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
          onClick={() => signOut()}
          className="flex items-center gap-2 text-red-600 focus:text-red-700"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
