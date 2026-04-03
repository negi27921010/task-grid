'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, LayoutList, LayoutGrid, List, Settings } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { UserSwitcher } from './user-switcher';
import { NotificationBell } from './notification-bell';
import { useProject } from '@/lib/hooks/use-projects';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { isAdmin } from '@/lib/utils/permissions';
import type { ViewMode } from '@/lib/types/filters';

interface HeaderProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSearchOpen?: () => void;
}

const viewModes: { mode: ViewMode; icon: typeof LayoutList; label: string }[] = [
  { mode: 'table', icon: LayoutList, label: 'Table View' },
  { mode: 'kanban', icon: LayoutGrid, label: 'Kanban View' },
  { mode: 'hybrid', icon: List, label: 'Hybrid View' },
];

function useProjectBreadcrumb(pathname: string): string | null {
  const projectId = pathname.startsWith('/project/') ? pathname.split('/')[2] : '';
  const { data: project } = useProject(projectId ?? '');
  return project?.name ?? null;
}

export function Header({ viewMode, onViewModeChange, onSearchOpen }: HeaderProps) {
  const pathname = usePathname();
  const projectName = useProjectBreadcrumb(pathname);
  const { currentUser } = useCurrentUser();
  const userIsAdmin = isAdmin(currentUser);

  const breadcrumbs: { label: string; href?: string }[] = [
    { label: 'Task Grid', href: '/dashboard' },
  ];

  if (pathname.startsWith('/dashboard')) {
    breadcrumbs.push({ label: 'Dashboard' });
  } else if (pathname.startsWith('/project/')) {
    breadcrumbs.push({ label: 'Projects', href: '/dashboard' });
    breadcrumbs.push({ label: projectName ?? 'Project' });
  } else if (pathname.startsWith('/settings')) {
    breadcrumbs.push({ label: 'Settings' });
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
      {/* Left: Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-slate-300 select-none" aria-hidden="true">/</span>
            )}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-slate-500 transition-colors hover:text-slate-700"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-slate-900">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Center: Search trigger */}
      <div className="mx-auto hidden max-w-md flex-1 sm:block">
        <button
          onClick={onSearchOpen}
          className="flex h-9 w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-100"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search tasks...</span>
          <kbd className="hidden items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline-flex">
            <span className="text-xs">&#8984;</span>K
          </kbd>
        </button>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1">
        {/* View mode toggles */}
        <div className="mr-2 flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {viewModes.map(({ mode, icon: Icon, label }) => (
            <Tooltip key={mode} content={label} side="bottom">
              <button
                onClick={() => onViewModeChange(mode)}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md transition-all duration-150',
                  viewMode === mode
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                )}
                aria-label={label}
                aria-pressed={viewMode === mode}
              >
                <Icon className="h-4 w-4" />
              </button>
            </Tooltip>
          ))}
        </div>

        {/* Settings (admin only) */}
        {userIsAdmin && (
          <Tooltip content="Settings" side="bottom">
            <Link
              href="/settings"
              aria-label="Settings"
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900',
                pathname === '/settings' && 'bg-slate-100 text-slate-900'
              )}
            >
              <Settings className="h-4 w-4" />
            </Link>
          </Tooltip>
        )}

        {/* Notifications */}
        <NotificationBell />

        {/* Divider */}
        <div className="mx-1.5 h-6 w-px bg-slate-200" />

        {/* User switcher */}
        <UserSwitcher />
      </div>
    </header>
  );
}
