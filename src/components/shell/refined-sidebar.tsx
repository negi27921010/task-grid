'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckSquare,
  ClipboardCheck,
  Users,
  BookOpen,
  FolderKanban,
  Settings,
  LogOut,
  Plus,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  Inbox,
  Star,
  Zap,
} from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useProjects } from '@/lib/hooks/use-projects';
import { isAdmin } from '@/lib/utils/permissions';
import { Avatar } from '@/components/design-system/avatar';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/cn';

interface RefinedSidebarProps {
  width?: number;          // 56 → 280; <80 = collapsed icon mode
  onToggle?: () => void;
}

interface NavLink {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  adminOnly?: boolean;
}

const QUICK_NAV: NavLink[] = [
  { href: '/dashboard', icon: Inbox, label: 'Inbox' },
  { href: '/', icon: CheckSquare, label: 'My work' },
];

const BOARDS: NavLink[] = [
  { href: '/', icon: CheckSquare, label: 'Tasks' },
  { href: '/standups', icon: ClipboardCheck, label: 'Daily Standup' },
  { href: '/registry', icon: BookOpen, label: 'Registry' },
  { href: '/dashboard', icon: FolderKanban, label: 'Dashboard' },
];

const PROJECT_COLORS = ['#0073ea', '#9333ea', '#16a34a', '#f59e0b', '#ec4899', '#06b6d4'];

export function RefinedSidebar({ width = 240, onToggle }: RefinedSidebarProps) {
  const pathname = usePathname();
  const { currentUser, signOut } = useCurrentUser();
  const { data: projects } = useProjects();
  const userIsAdmin = isAdmin(currentUser);
  const collapsed = width < 80;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/' || pathname.startsWith('/project/');
    return pathname.startsWith(href);
  };

  return (
    <aside
      className="flex h-full flex-shrink-0 flex-col overflow-hidden border-r border-border-color bg-sidebar-bg transition-[width] duration-200"
      style={{ width }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-3.5 pt-4 pb-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))' }}
        >
          <Zap className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-tight text-text">Task Grid</p>
            <p className="text-[11px] text-text-muted">PW Academy</p>
          </div>
        )}
        {!collapsed && onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="rounded p-1 text-text-faint transition-colors hover:bg-sidebar-hover hover:text-text"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {collapsed && onToggle && (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={onToggle}
            aria-label="Expand sidebar"
            className="rounded p-1 text-text-faint transition-colors hover:bg-sidebar-hover hover:text-text"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Quick nav */}
      <nav className="px-2 pb-2">
        {QUICK_NAV.map((item) => (
          <SidebarLink
            key={item.label}
            item={item}
            collapsed={collapsed}
            active={isActive(item.href)}
          />
        ))}
      </nav>

      {/* Workspace section */}
      {!collapsed && (
        <div className="flex items-center justify-between px-3.5 pt-2 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            Workspace
          </p>
          <button
            type="button"
            aria-label="New workspace"
            className="rounded p-0.5 text-text-faint transition-colors hover:text-text"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="px-2 pb-1">
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-2.5 rounded-md text-[13px] font-medium text-text transition-colors',
            collapsed ? 'justify-center px-0 py-1.5' : 'px-2.5 py-1.5',
            'bg-sidebar-active hover:bg-sidebar-active-strong',
          )}
        >
          <span
            className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] text-[11px] font-semibold text-white"
            style={{ background: 'var(--accent)' }}
          >
            P
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left">PW Academy</span>
              <ChevronDown className="h-3 w-3 text-text-faint" />
            </>
          )}
        </button>
      </div>

      {/* Boards under workspace */}
      {!collapsed && (
        <nav className="px-2 pb-2">
          {BOARDS.map((item) => (
            <SidebarBoardLink
              key={item.label + item.href}
              item={item}
              active={isActive(item.href)}
            />
          ))}
        </nav>
      )}

      {/* Projects */}
      {!collapsed && projects && projects.length > 0 && (
        <>
          <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
              Projects
            </p>
          </div>
          <nav className="overflow-y-auto px-2 pb-2">
            {projects.map((p, i) => {
              const href = `/project/${p.id}`;
              const active = pathname === href;
              return (
                <Link
                  key={p.id}
                  href={href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
                    active
                      ? 'bg-sidebar-active-strong font-medium text-text'
                      : 'text-text-muted hover:bg-sidebar-hover hover:text-text',
                  )}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: PROJECT_COLORS[i % PROJECT_COLORS.length] }}
                  />
                  <span className="truncate">{p.name}</span>
                </Link>
              );
            })}
          </nav>
        </>
      )}

      <div className="flex-1" />

      {/* Bottom: admin links */}
      {userIsAdmin && (
        <nav className={cn('border-t border-border-color px-2 py-1.5', collapsed && 'flex flex-col items-center')}>
          <SidebarLink
            item={{ href: '/dashboard?view=members', icon: Users, label: 'Members' }}
            collapsed={collapsed}
            active={pathname === '/dashboard' && !!(typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('view'))}
          />
          <SidebarLink
            item={{ href: '/settings', icon: Settings, label: 'Settings' }}
            collapsed={collapsed}
            active={isActive('/settings')}
          />
        </nav>
      )}

      {/* Footer: user + theme toggle */}
      <div
        className={cn(
          'flex items-center gap-2 border-t border-border-color px-3 py-2.5',
          collapsed && 'flex-col gap-2',
        )}
      >
        {currentUser && (
          <Avatar fullName={currentUser.full_name} src={currentUser.avatar_url} size={collapsed ? 'sm' : 'md'} />
        )}
        {!collapsed && currentUser && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-text">{currentUser.full_name}</p>
            <p className="truncate text-[11px] text-text-muted">{userIsAdmin ? 'Admin' : 'Member'}</p>
          </div>
        )}
        <ThemeToggle size="sm" />
        {!collapsed && (
          <button
            type="button"
            onClick={() => signOut?.()}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-md p-1.5 text-text-faint transition-colors hover:bg-sidebar-hover hover:text-text"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </aside>
  );
}

function SidebarLink({
  item, collapsed, active,
}: {
  item: NavLink;
  collapsed: boolean;
  active: boolean;
}) {
  const { icon: IconComponent, href, label } = item;
  const inner = (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-colors',
        collapsed ? 'mx-auto h-8 w-8 justify-center' : 'px-2.5 py-1.5',
        active
          ? 'bg-sidebar-active-strong text-text'
          : 'text-text-muted hover:bg-sidebar-hover hover:text-text',
      )}
    >
      <IconComponent className="h-3.5 w-3.5 shrink-0" />
      {!collapsed && <span className="flex-1 truncate text-left">{label}</span>}
    </Link>
  );
  if (collapsed) return <Tooltip content={label} side="right">{inner}</Tooltip>;
  return inner;
}

function SidebarBoardLink({
  item, active,
}: {
  item: NavLink;
  active: boolean;
}) {
  const { icon: IconComponent, href, label } = item;
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md py-1.5 pl-7 pr-2.5 text-[13px] transition-colors',
        active
          ? 'bg-sidebar-active-strong font-semibold text-text'
          : 'font-medium text-text-muted hover:bg-sidebar-hover hover:text-text',
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-3.5 top-1.5 bottom-1.5 w-0.5 rounded-full"
          style={{ background: 'var(--accent)' }}
        />
      )}
      <IconComponent
        className={cn('h-3.5 w-3.5 shrink-0', active && 'text-[var(--accent)]')}
      />
      <span className="flex-1 truncate text-left">{label}</span>
    </Link>
  );
}
