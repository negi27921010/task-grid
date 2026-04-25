'use client';

// Unified Dashboard — Main table / Kanban / Analytics view toggle.
// Wraps the new RefinedTaskTable + RefinedKanban (drag-and-drop, design
// system pills/avatars) and the existing analytics surface, all driven by
// the same useTasks data. Logic preserved: data hooks, RBAC scope,
// filters, AgingSummaryBar, TaskDetailPanel, BulkUpload — all unchanged.

import { Suspense, useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ListTodo,
  PlayCircle,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Table as TableIcon,
  Kanban as KanbanIcon,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { RefinedAppShell } from '@/components/shell';
import { RefinedPageHeader, type PageTab } from '@/components/shell';
import {
  KpiTile,
  DSCard,
  StatusDonut,
  type DonutSlice,
  OwnerWorkload,
  type WorkloadRow,
  CompletionSpark,
  Avatar,
  StatusPill,
  type Tone,
} from '@/components/design-system';
import { RefinedTaskTable, RefinedKanban } from '@/components/board';
import { AgingSummaryBar } from '@/components/task/aging-summary-bar';
import { FilterBar } from '@/components/task/filter-bar';
import { BulkUploadDialog } from '@/components/task/bulk-upload-dialog';
import { TaskDetailPanel } from '@/components/task/task-detail-panel';
import {
  useTasks,
  useTasksByOwner,
  useTasksByDepartment,
} from '@/lib/hooks/use-tasks';
import { useProjects } from '@/lib/hooks/use-projects';
import { useUsers } from '@/lib/hooks/use-users';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useFilters } from '@/lib/hooks/use-filters';
import { isAdmin, can } from '@/lib/utils/permissions';
import { filterTasks } from '@/lib/utils/search';
import { cn } from '@/lib/utils/cn';
import type { AgingStatus, TaskStatus } from '@/lib/types';

type View = 'analytics' | 'kanban' | 'table';
type Scope = 'mine' | 'team';

// Dashboard first by default; Kanban next; Main table last. The default
// view (parseView fallback) is also 'analytics' so the page lands on the
// summary instead of a possibly-empty task list.
const VIEW_TABS: PageTab[] = [
  { id: 'analytics', label: 'Dashboard',  icon: PieChartIcon },
  { id: 'kanban',    label: 'Kanban',     icon: KanbanIcon },
  { id: 'table',     label: 'Main table', icon: TableIcon },
];

const STATUS_TONE: Record<TaskStatus, Tone> = {
  not_started: 'gray',
  in_progress: 'blue',
  blocked: 'red',
  completed: 'green',
  cancelled: 'neutral',
};
const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: 'To do',
  in_progress: 'In progress',
  blocked: 'Blocked',
  completed: 'Done',
  cancelled: 'Cancelled',
};

function parseView(raw: string | null): View {
  return raw === 'kanban' || raw === 'table' ? raw : 'analytics';
}
function parseScope(raw: string | null): Scope {
  return raw === 'team' ? 'team' : 'mine';
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseView(searchParams.get('view'));
  const scope = parseScope(searchParams.get('scope'));

  const { currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: allUsersData } = useUsers();
  const { data: projectsData } = useProjects();

  const userIsAdmin = !userLoading && isAdmin(currentUser);
  const userReady = !userLoading && !!currentUser.id;
  const isTeamView = !userIsAdmin && scope === 'team';

  const deptUserIds = useMemo(
    () => (allUsersData ?? [])
      .filter(u => u.department === currentUser.department)
      .map(u => u.id),
    [allUsersData, currentUser.department]
  );

  const allTasksQuery = useTasks();
  const myTasks = useTasksByOwner(currentUser.id);
  const teamTasks = useTasksByDepartment(currentUser.department, deptUserIds);

  const activeQuery = userIsAdmin
    ? allTasksQuery
    : isTeamView ? teamTasks : myTasks;
  const { data: tasks, isLoading: tasksLoading } = activeQuery;
  const isLoading = !userReady || tasksLoading;

  const {
    filters, sort, presets,
    setFilter, clearFilters, toggleSort,
    savePreset, loadPreset, deletePreset, hasActiveFilters,
  } = useFilters();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const handleSelectTask = useCallback(
    (taskId: string) => setSelectedTaskId(taskId), []
  );
  const handleClosePanel = useCallback(() => setSelectedTaskId(null), []);

  // Add Task flow on the unified Dashboard requires a project context.
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const activeProjects = useMemo(
    () => (projectsData ?? []).filter(p => p.status === 'active'),
    [projectsData]
  );

  const handleAddTask = useCallback(() => {
    if (activeProjects.length === 0) return;
    if (activeProjects.length === 1) {
      router.push(`/project/${activeProjects[0].id}`);
    } else {
      setShowProjectPicker(true);
    }
  }, [activeProjects, router]);

  const handlePickProject = useCallback(
    (projectId: string) => {
      setShowProjectPicker(false);
      router.push(`/project/${projectId}`);
    },
    [router],
  );

  const allTasks = tasks ?? [];
  const filteredTasks = useMemo(
    () => filterTasks(allTasks, filters), [allTasks, filters]
  );

  const handleFilterByAging = (agingStatus: AgingStatus) => {
    const current = filters.aging_status ?? [];
    setFilter(
      'aging_status',
      current.includes(agingStatus)
        ? current.filter(a => a !== agingStatus)
        : [...current, agingStatus],
    );
  };

  const updateView = (next: View) => {
    const params = new URLSearchParams(searchParams.toString());
    // Default ('analytics') drops the param; others persist.
    if (next === 'analytics') params.delete('view'); else params.set('view', next);
    const qs = params.toString();
    router.push(`/dashboard${qs ? `?${qs}` : ''}`);
  };

  const updateScope = (next: Scope) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'mine') params.delete('scope'); else params.set('scope', next);
    const qs = params.toString();
    router.push(`/dashboard${qs ? `?${qs}` : ''}`);
  };

  // Stats reflect the active view (filtered when filters applied, all otherwise)
  const statsSource = hasActiveFilters ? filteredTasks : allTasks;

  const stats = useMemo(() => {
    const total = statsSource.length;
    const completed = statsSource.filter(t => t.status === 'completed').length;
    return {
      total,
      inProgress: statsSource.filter(t => t.status === 'in_progress').length,
      blocked: statsSource.filter(t => t.status === 'blocked').length,
      overdue: statsSource.filter(t => t.aging_status === 'overdue').length,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [statsSource]);

  const usersById = useMemo(() => {
    const map: Record<string, { name: string; src: string | null }> = {};
    for (const u of allUsersData ?? []) {
      map[u.id] = { name: u.full_name, src: u.avatar_url };
    }
    return map;
  }, [allUsersData]);

  const donutSlices = useMemo<DonutSlice[]>(() => {
    const counts: Record<TaskStatus, number> = {
      not_started: 0, in_progress: 0, blocked: 0, completed: 0, cancelled: 0,
    };
    for (const t of statsSource) counts[t.status] = (counts[t.status] ?? 0) + 1;
    return (Object.keys(counts) as TaskStatus[]).map((k) => ({
      key: k,
      label: STATUS_LABEL[k],
      value: counts[k],
      tone: STATUS_TONE[k],
    }));
  }, [statsSource]);

  const workloadRows = useMemo<WorkloadRow[]>(() => {
    const byOwner = new Map<string, { total: number; active: number }>();
    for (const t of statsSource) {
      if (!t.owner_id) continue;
      const cur = byOwner.get(t.owner_id) ?? { total: 0, active: 0 };
      cur.total += 1;
      if (t.status === 'in_progress' || t.status === 'blocked') cur.active += 1;
      byOwner.set(t.owner_id, cur);
    }
    return Array.from(byOwner.entries())
      .map(([id, { total, active }]) => {
        const u = usersById[id];
        return {
          id,
          name: u?.name ?? 'Unknown',
          avatarUrl: u?.src ?? null,
          total,
          active,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [statsSource, usersById]);

  const completionDaily = useMemo(() => {
    const days = 14;
    const buckets = new Array(days).fill(0);
    const now = Date.now();
    const dayMs = 86400_000;
    for (const t of statsSource) {
      if (t.status !== 'completed' || !t.completed_at) continue;
      const ms = new Date(t.completed_at).getTime();
      const daysAgo = Math.floor((now - ms) / dayMs);
      if (daysAgo >= 0 && daysAgo < days) {
        buckets[days - 1 - daysAgo] += 1;
      }
    }
    return buckets;
  }, [statsSource]);

  const overdueTasks = useMemo(
    () => statsSource
      .filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.aging_status === 'overdue')
      .sort((a, b) => {
        const ae = a.eta ? new Date(a.eta).getTime() : Infinity;
        const be = b.eta ? new Date(b.eta).getTime() : Infinity;
        return ae - be;
      })
      .slice(0, 5),
    [statsSource]
  );

  const greeting = userIsAdmin
    ? `Welcome, ${currentUser.full_name?.split(' ')[0] ?? ''}`
    : isTeamView
      ? 'Team View'
      : `Welcome, ${currentUser.full_name?.split(' ')[0] ?? ''}`;
  const subtitle = userIsAdmin
    ? 'All tasks across every project'
    : isTeamView
      ? `All tasks in ${currentUser.department}`
      : `Tasks assigned to you across all projects`;

  return (
    <RefinedAppShell>
      <RefinedPageHeader
        title={userLoading ? 'Loading…' : greeting}
        subtitle={subtitle}
        tabs={VIEW_TABS}
        activeTab={view}
        onTabChange={(id) => updateView(id as View)}
        rightSlot={
          <div className="flex items-center gap-2">
            {!userIsAdmin && !userLoading && (
              <div className="inline-flex items-center rounded-md border border-border-color bg-surface p-0.5 text-[12px]">
                <ScopeButton active={scope === 'mine'} onClick={() => updateScope('mine')}>My</ScopeButton>
                <ScopeButton active={scope === 'team'} onClick={() => updateScope('team')}>Team</ScopeButton>
              </div>
            )}
            {userIsAdmin && (
              <span
                className="rounded-md px-3 py-1.5 text-[11.5px] font-semibold"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                Admin · Full View
              </span>
            )}
          </div>
        }
      />

      <div className="mx-auto w-full max-w-[1400px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {!isLoading && allTasks.length > 0 && (
          <p className="text-[11.5px] text-text-faint">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
            {hasActiveFilters ? ' (filtered)' : ''}
          </p>
        )}

        {/* Filter bar — applies to all 3 views */}
        <FilterBar
          filters={filters}
          sort={sort}
          onFilterChange={setFilter}
          onSortToggle={toggleSort}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          presets={presets}
          onSavePreset={savePreset}
          onLoadPreset={loadPreset}
          onDeletePreset={deletePreset}
          onAddTask={activeProjects.length > 0 && can(currentUser, 'canCreateTasks') ? handleAddTask : undefined}
          onBulkUpload={activeProjects.length > 0 && can(currentUser, 'canCreateTasks') ? () => setBulkUploadOpen(true) : undefined}
        />

        {/* Project picker (Add Task flow on Dashboard) */}
        {showProjectPicker && (
          <div className="rounded-lg border border-border-color bg-surface p-3 shadow-md">
            <p className="mb-2 text-xs font-medium text-text-muted">
              Pick a project to add the task to
            </p>
            <div className="flex flex-wrap gap-2">
              {activeProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePickProject(p.id)}
                  className="rounded-md border border-border-color px-3 py-1.5 text-sm font-medium text-text transition-colors hover:border-[var(--accent)] hover:bg-accent-soft hover:text-[var(--accent)]"
                >
                  {p.name}
                </button>
              ))}
              <button
                onClick={() => setShowProjectPicker(false)}
                className="rounded-md px-3 py-1.5 text-sm text-text-faint transition-colors hover:text-text"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        )}

        {/* ── Main Table view ──────────────────────────────────── */}
        {!isLoading && view === 'table' && (
          allTasks.length === 0 ? (
            <EmptyState userIsAdmin={userIsAdmin} isTeamView={isTeamView} />
          ) : (
            <>
              {statsSource.length > 0 && (
                <AgingSummaryBar tasks={statsSource} onFilterByAging={handleFilterByAging} />
              )}
              <RefinedTaskTable
                tasks={filteredTasks}
                users={allUsersData ?? []}
                onTaskClick={handleSelectTask}
                onAddTask={can(currentUser, 'canCreateTasks') ? handleAddTask : undefined}
              />
            </>
          )
        )}

        {/* ── Kanban view ──────────────────────────────────────── */}
        {!isLoading && view === 'kanban' && (
          allTasks.length === 0 ? (
            <EmptyState userIsAdmin={userIsAdmin} isTeamView={isTeamView} />
          ) : (
            <RefinedKanban
              tasks={filteredTasks}
              users={allUsersData ?? []}
              onTaskClick={handleSelectTask}
              onAddTask={can(currentUser, 'canCreateTasks') ? handleAddTask : undefined}
            />
          )
        )}

        {/* ── Analytics view ───────────────────────────────────── */}
        {!isLoading && view === 'analytics' && (
          allTasks.length === 0 ? (
            <EmptyState userIsAdmin={userIsAdmin} isTeamView={isTeamView} />
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                <KpiTile label="Total" value={stats.total} icon={ListTodo} accent="#64748b" />
                <KpiTile
                  label="In progress"
                  value={stats.inProgress}
                  icon={PlayCircle}
                  accent="#0073ea"
                  delta={stats.blocked > 0 ? `${stats.blocked} blocked` : 'Steady'}
                  trend={stats.blocked > 0 ? 'warn' : 'neutral'}
                />
                <KpiTile
                  label="Blocked"
                  value={stats.blocked}
                  icon={ShieldAlert}
                  accent="#dc2626"
                  delta={stats.blocked > 0 ? 'Needs attention' : 'None'}
                  trend={stats.blocked > 0 ? 'down' : 'neutral'}
                />
                <KpiTile
                  label="Overdue"
                  value={stats.overdue}
                  icon={Clock}
                  accent="#f59e0b"
                  delta={stats.overdue > 0 ? 'Past due date' : 'On track'}
                  trend={stats.overdue > 0 ? 'warn' : 'neutral'}
                />
                <KpiTile
                  label="Completed"
                  value={stats.completed}
                  icon={CheckCircle2}
                  accent="#16a34a"
                  delta={`${stats.completionRate}% done`}
                  trend="up"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
                <DSCard title="Tasks by status" subtitle="Distribution across pipeline stages">
                  <StatusDonut slices={donutSlices} />
                </DSCard>
                <DSCard title="Risk & overdue" subtitle="Tasks past their due date">
                  {overdueTasks.length === 0 ? (
                    <p className="py-6 text-center text-sm text-text-muted">
                      No overdue tasks 🎉
                    </p>
                  ) : (
                    <ul className="max-h-[260px] space-y-2 overflow-y-auto">
                      {overdueTasks.map((t) => {
                        const owner = usersById[t.owner_id];
                        const daysLate = t.eta
                          ? Math.max(0, Math.floor((Date.now() - new Date(t.eta).getTime()) / 86400_000))
                          : 0;
                        return (
                          <li
                            key={t.id}
                            onClick={() => handleSelectTask(t.id)}
                            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border-color bg-neutral-50 px-3 py-2 transition-colors hover:bg-hover"
                          >
                            <span aria-hidden="true" className="h-full w-1 self-stretch rounded-sm bg-[#dc2626]" />
                            {owner && <Avatar fullName={owner.name} src={owner.src} size="sm" />}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-text">{t.title}</p>
                              <p className="text-[11.5px] text-text-muted">
                                {t.eta ? `Due ${new Date(t.eta).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No ETA'}
                                {daysLate > 0 && ` · ${daysLate}d late`}
                              </p>
                            </div>
                            <StatusPill
                              label={STATUS_LABEL[t.status]}
                              tone={STATUS_TONE[t.status]}
                              style="soft"
                              size="sm"
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </DSCard>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <DSCard title="Owner workload" subtitle="Active assignments by team member">
                  <OwnerWorkload rows={workloadRows} />
                </DSCard>
                <DSCard title="Completion this sprint" subtitle="Done vs. planned, last 14 days">
                  <CompletionSpark daily={completionDaily} total={stats.total} done={stats.completed} />
                </DSCard>
              </div>
            </div>
          )
        )}
      </div>

      <TaskDetailPanel taskId={selectedTaskId} onClose={handleClosePanel} />
      <BulkUploadDialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen} />
    </RefinedAppShell>
  );
}

function ScopeButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded px-2.5 py-1 font-medium transition-colors',
        active
          ? 'bg-hover text-text shadow-sm'
          : 'text-text-muted hover:text-text',
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({
  userIsAdmin, isTeamView,
}: { userIsAdmin: boolean; isTeamView: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-color bg-surface px-6 py-16 text-center">
      <p
        className="text-base font-semibold text-text"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {userIsAdmin
          ? 'No tasks in the system'
          : isTeamView
            ? 'No team tasks found'
            : 'No tasks assigned to you'}
      </p>
      <p className="mt-1 max-w-md text-sm text-text-muted">
        {userIsAdmin
          ? 'Create a project and add tasks to get started.'
          : isTeamView
            ? 'Tasks assigned to team members in your department will appear here.'
            : 'Tasks assigned to you across projects will appear here. Ask an admin to assign you tasks.'}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-canvas">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
