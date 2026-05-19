'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  ClipboardCheck,
  Users,
  BookOpen,
  FolderKanban,
  Settings,
  LogOut,
  Plus,
  X,
  Trash2,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  CalendarCheck,
} from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useProjects, useCreateProject, useDeleteProject } from '@/lib/hooks/use-projects';
import { isAdmin, can } from '@/lib/utils/permissions';
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

const BOARDS: NavLink[] = [
  { href: '/dashboard', icon: FolderKanban, label: 'Dashboard' },
  { href: '/standups', icon: ClipboardCheck, label: 'Daily Standup' },
  { href: '/registry', icon: BookOpen, label: 'Registry' },
];

const PROJECT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

export function RefinedSidebar({ width = 240, onToggle }: RefinedSidebarProps) {
  const pathname = usePathname();
  const { currentUser, signOut } = useCurrentUser();
  const { data: projects } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const userIsAdmin = isAdmin(currentUser);
  const canCreateProjects = can(currentUser, 'canCreateProjects');
  const collapsed = width < 80;

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreateProject = () => {
    const name = newProjectName.trim();
    if (!name) return;
    createProject.mutate(
      { name, owner_id: currentUser.id },
      {
        onSuccess: () => {
          setNewProjectName('');
          setShowNewProject(false);
        },
      },
    );
  };

  const isActive = (href: string) => {
    // Dashboard is also active when viewing an individual project (projects
    // are scoped task lists, conceptually part of the dashboard surface).
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/' || pathname.startsWith('/project/');
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside
      className="flex h-full flex-shrink-0 flex-col overflow-hidden border-r border-border-color bg-sidebar-bg transition-[width] duration-300"
      style={{ width, transitionTimingFunction: 'var(--ease-out-expo)' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-3.5 pt-4 pb-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-white relative"
          style={{ background: 'var(--accent-gradient)' }}
        >
          <CalendarCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
          {/* Subtle glow */}
          <span className="absolute -inset-0.5 rounded-[var(--radius-md)] opacity-30" style={{ background: 'var(--accent-gradient)', filter: 'blur(6px)' }} />
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-tight text-text">Task Grid</p>
            <p className="text-[10.5px] text-text-faint tracking-wide">PW Academy</p>
          </div>
        )}
        {!collapsed && onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="rounded-[var(--radius-sm)] p-1 text-text-faint hover:bg-sidebar-hover hover:text-text active:scale-95"
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
            className="rounded-[var(--radius-sm)] p-1 text-text-faint hover:bg-sidebar-hover hover:text-text active:scale-95"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Workspace section */}
      {!collapsed && (
        <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-faint">
            Workspace
          </p>
        </div>
      )}
      <div className="px-2 pb-1">
        <button
          type="button"
          className={cn(
            'flex w-full items-center gap-2.5 rounded-[var(--radius-md)] text-[13px] font-medium text-text',
            collapsed ? 'justify-center px-0 py-1.5' : 'px-2.5 py-1.5',
            'bg-sidebar-active hover:bg-sidebar-active-strong',
          )}
        >
          <span
            className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] text-[10px] font-bold text-white"
            style={{ background: 'var(--accent-gradient)' }}
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

      {/* Projects — always show section when expanded so first project can be created */}
      {!collapsed && (
        <>
          <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-faint">
              Projects
            </p>
            {canCreateProjects && (
              <Tooltip content="New project" side="top">
                <button
                  type="button"
                  onClick={() => setShowNewProject((v) => !v)}
                  className="rounded-[var(--radius-sm)] p-0.5 text-text-faint hover:bg-sidebar-hover hover:text-text active:scale-90"
                  aria-label="New project"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </Tooltip>
            )}
          </div>
          {showNewProject && canCreateProjects && (
            <div className="mx-3.5 mb-2 flex items-center gap-1.5 rounded-[var(--radius-md)] border border-border-color bg-surface px-2 py-1.5 shadow-[var(--shadow-xs)]">
              <input
                type="text"
                autoFocus
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateProject();
                  }
                  if (e.key === 'Escape') {
                    setShowNewProject(false);
                    setNewProjectName('');
                  }
                }}
                placeholder="Project name…"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-text placeholder:text-text-faint focus:outline-none"
                disabled={createProject.isPending}
              />
              <button
                type="button"
                onClick={() => {
                  setShowNewProject(false);
                  setNewProjectName('');
                }}
                className="rounded p-0.5 text-text-faint hover:text-text"
                aria-label="Cancel"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <nav className="max-h-[40vh] overflow-y-auto px-2 pb-2">
            {(!projects || projects.length === 0) && (
              <p className="px-2.5 py-2 text-[12px] text-text-muted">
                {canCreateProjects
                  ? 'No projects yet. Use + above to create one.'
                  : 'No projects yet. Ask an admin to create a project or grant you access.'}
              </p>
            )}
            {(projects ?? []).map((p, i) => {
              const href = `/project/${p.id}`;
              const active = pathname === href;
              const isConfirming = deleteConfirmId === p.id;
              return (
                <div key={p.id}>
                  <div
                    className={cn(
                      'group flex items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-1.5 text-[13px]',
                      active
                        ? 'bg-sidebar-active-strong font-medium text-text'
                        : 'text-text-muted hover:bg-sidebar-hover hover:text-text',
                    )}
                  >
                    <Link href={href} className="flex min-w-0 flex-1 items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: PROJECT_COLORS[i % PROJECT_COLORS.length] }}
                      />
                      <span className="truncate">{p.name}</span>
                    </Link>
                    {userIsAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(isConfirming ? null : p.id)}
                        className="ml-auto shrink-0 rounded p-0.5 text-text-faint opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                        aria-label={`Delete ${p.name}`}
                        title="Delete project"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {isConfirming && (
                    <div className="mx-2 mb-1 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-2.5 py-2 text-[12px] dark:border-red-500/30 dark:bg-red-500/10">
                      <p className="mb-1.5 text-red-700 dark:text-red-300">
                        Delete <strong>{p.name}</strong>? All tasks removed.
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            deleteProject.mutate(p.id, {
                              onSuccess: () => setDeleteConfirmId(null),
                            });
                          }}
                          disabled={deleteProject.isPending}
                          className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          {deleteProject.isPending ? '…' : 'Delete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="rounded px-2 py-0.5 text-[11px] text-text-muted hover:text-text"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
            <p className="truncate text-[11px] text-text-faint">{userIsAdmin ? 'Admin' : 'Member'}</p>
          </div>
        )}
        <ThemeToggle size="sm" />
        {!collapsed && (
          <button
            type="button"
            onClick={() => signOut?.()}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-[var(--radius-md)] p-1.5 text-text-faint hover:bg-sidebar-hover hover:text-text active:scale-95"
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
        'flex items-center gap-2.5 rounded-[var(--radius-md)] text-[13px] font-medium',
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
        'group relative flex items-center gap-2.5 rounded-[var(--radius-md)] py-1.5 pl-7 pr-2.5 text-[13px]',
        active
          ? 'bg-sidebar-active-strong font-semibold text-text'
          : 'font-medium text-text-muted hover:bg-sidebar-hover hover:text-text',
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-3.5 top-1.5 bottom-1.5 w-0.5 rounded-full"
          style={{ background: 'var(--accent-gradient)' }}
        />
      )}
      <IconComponent
        className={cn('h-3.5 w-3.5 shrink-0', active && 'text-[var(--accent)]')}
      />
      <span className="flex-1 truncate text-left">{label}</span>
    </Link>
  );
}
