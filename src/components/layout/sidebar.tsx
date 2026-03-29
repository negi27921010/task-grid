'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { CheckSquare, Users, PanelLeftClose, PanelLeft, FolderKanban, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useProjects } from '@/lib/hooks/use-projects';
import { isAdmin } from '@/lib/utils/permissions';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import type { UserRole } from '@/lib/types';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const roleBadgeVariant: Record<UserRole, 'info' | 'default'> = {
  admin: 'info',
  member: 'default',
};

const roleLabel: Record<UserRole, string> = {
  admin: 'Admin',
  member: 'Member',
};

const PROJECT_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444', '#06B6D4'];

function getProjectColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length];
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
}

function NavItem({ href, icon, label, active, collapsed }: NavItemProps) {
  const content = (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
        active
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
        collapsed && 'justify-center px-0'
      )}
    >
      <span className={cn('shrink-0', active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600')}>
        {icon}
      </span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip content={label} side="right">
        {content}
      </Tooltip>
    );
  }

  return content;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser, signOut } = useCurrentUser();
  const { data: projects } = useProjects();

  const activeProjects = (projects ?? []).filter((p) => p.status === 'active');
  const userIsAdmin = isAdmin(currentUser);

  const isMyTasks = pathname === '/dashboard' && searchParams.get('view') !== 'team';
  const isTeamView = pathname === '/dashboard' && searchParams.get('view') === 'team';
  const isSettings = pathname === '/settings';

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-gray-200 bg-white transition-all duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-gray-100 px-4',
          collapsed && 'justify-center px-0'
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="PW Academy"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-lg object-contain"
          />
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-gray-900">
              Task Grid
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        <NavItem
          href="/dashboard"
          icon={<CheckSquare className="h-[18px] w-[18px]" />}
          label="My Tasks"
          active={isMyTasks}
          collapsed={collapsed}
        />
        <NavItem
          href="/dashboard?view=team"
          icon={<Users className="h-[18px] w-[18px]" />}
          label="Team View"
          active={isTeamView}
          collapsed={collapsed}
        />

        {/* Separator */}
        <div className="my-3 h-px bg-gray-100" />

        {/* Projects header */}
        {!collapsed && (
          <div className="flex items-center justify-between px-3 pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Projects
            </span>
            <FolderKanban className="h-3.5 w-3.5 text-gray-300" />
          </div>
        )}

        {collapsed && (
          <Tooltip content="Projects" side="right">
            <div className="flex justify-center py-1">
              <FolderKanban className="h-4 w-4 text-gray-300" />
            </div>
          </Tooltip>
        )}

        {/* Project list */}
        <div className="flex flex-col gap-0.5">
          {activeProjects.map((project, idx) => {
            const isActive = pathname === `/project/${project.id}`;
            const color = getProjectColor(idx);

            const content = (
              <Link
                key={project.id}
                href={`/project/${project.id}`}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  collapsed && 'justify-center px-0'
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                {!collapsed && (
                  <span className="truncate">{project.name}</span>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={project.id} content={project.name} side="right">
                  {content}
                </Tooltip>
              );
            }

            return <div key={project.id}>{content}</div>;
          })}
        </div>

        {/* Settings (admin only) */}
        {userIsAdmin && (
          <>
            <div className="my-3 h-px bg-gray-100" />
            <NavItem
              href="/settings"
              icon={<Settings className="h-[18px] w-[18px]" />}
              label="Settings"
              active={isSettings}
              collapsed={collapsed}
            />
          </>
        )}
      </nav>

      {/* Bottom: User info + Collapse toggle */}
      <div className="shrink-0 border-t border-gray-100">
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-3',
            collapsed && 'justify-center px-0'
          )}
        >
          <Avatar
            fullName={currentUser.full_name}
            src={currentUser.avatar_url}
            size="sm"
          />
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-gray-900">
                {currentUser.full_name}
              </span>
              <Badge variant={roleBadgeVariant[currentUser.role]} className="w-fit text-[10px] py-0">
                {roleLabel[currentUser.role]}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex border-t border-gray-100">
          <button
            onClick={() => signOut()}
            className={cn(
              'flex flex-1 items-center justify-center py-2.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500',
              collapsed ? 'border-r-0' : 'border-r border-gray-100'
            )}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
          {!collapsed && (
            <button
              onClick={onToggle}
              className="flex flex-1 items-center justify-center py-2.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
          {collapsed && (
            <button
              onClick={onToggle}
              className="flex flex-1 items-center justify-center py-2.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
              aria-label="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
