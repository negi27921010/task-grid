'use client';

import { Suspense, useMemo, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ListTodo,
  PlayCircle,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
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
import { AgingSummaryBar } from '@/components/task/aging-summary-bar';
import { FilterBar } from '@/components/task/filter-bar';
import { TaskViewContainer } from '@/components/task/task-view-container';
import { BulkUploadDialog } from '@/components/task/bulk-upload-dialog';
import { TaskDetailPanel } from '@/components/task/task-detail-panel';
import { useTasks, useTasksByOwner, useTasksByDepartment } from '@/lib/hooks/use-tasks';
import { useProjects } from '@/lib/hooks/use-projects';
import { useUsers } from '@/lib/hooks/use-users';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useFilters } from '@/lib/hooks/use-filters';
import { useViewMode } from '@/lib/hooks/use-view-mode';
import { isAdmin, can } from '@/lib/utils/permissions';
import { filterTasks } from '@/lib/utils/search';
import type { AgingStatus, Task, TaskStatus } from '@/lib/types';

// Map app status enum → analytics tone for the donut/pills.
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

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTeamView = searchParams.get('view') === 'team';
  const { currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: allUsersData } = useUsers();
  const { data: projectsData } = useProjects();
  const { viewMode } = useViewMode();

  const userIsAdmin = !userLoading && isAdmin(currentUser);
  const userReady = !userLoading && !!currentUser.id;

  const deptUserIds = useMemo(
    () => (allUsersData ?? []).filter(u => u.department === currentUser.department).map(u => u.id),
    [allUsersData, currentUser.department]
  );

  const projectsMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projectsData ?? []) { map[p.id] = p.name; }
    return map;
  }, [projectsData]);

  const usersById = useMemo(() => {
    const map: Record<string, { name: string; src: string | null }> = {};
    for (const u of allUsersData ?? []) {
      map[u.id] = { name: u.full_name, src: u.avatar_url };
    }
    return map;
  }, [allUsersData]);

  // Admin sees ALL tasks; member sees only their own / their department's
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
  const handleSelectTask = useCallback((taskId: string) => setSelectedTaskId(taskId), []);
  const handleClosePanel = useCallback(() => setSelectedTaskId(null), []);

  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [addTaskProjectId, setAddTaskProjectId] = useState<string | null>(null);
  const [showCreateRow, setShowCreateRow] = useState(false);

  const activeProjects = useMemo(
    () => (projectsData ?? []).filter(p => p.status === 'active'),
    [projectsData]
  );

  const handleAddTask = useCallback(() => {
    if (activeProjects.length === 1) {
      setAddTaskProjectId(activeProjects[0].id);
      setShowCreateRow(true);
    } else if (activeProjects.length > 1) {
      setShowProjectPicker(true);
    }
  }, [activeProjects]);

  const handlePickProject = useCallback((projectId: string) => {
    setAddTaskProjectId(projectId);
    setShowProjectPicker(false);
    setShowCreateRow(true);
  }, []);

  const handleCloseCreateRow = useCallback(() => {
    setShowCreateRow(false);
    setAddTaskProjectId(null);
  }, []);

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const allTasks = tasks ?? [];
  const filteredTasks = useMemo(() => filterTasks(allTasks, filters), [allTasks, filters]);

  const handleFilterByAging = (agingStatus: AgingStatus) => {
    const current = filters.aging_status ?? [];
    setFilter('aging_status', current.includes(agingStatus)
      ? current.filter(a => a !== agingStatus)
      : [...current, agingStatus]
    );
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

  // Donut slices
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

  // Owner workload (top 8 by total)
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

  // Last-14-days completion sparkline
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

  // Top overdue tasks (max 5)
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

  // Header tabs (only for non-admin members)
  const headerTabs: PageTab[] | undefined = !userLoading && !userIsAdmin
    ? [{ id: 'my', label: 'My Tasks' }, { id: 'team', label: 'Team View' }]
    : undefined;
  const activeTab = isTeamView ? 'team' : 'my';
  const handleTabChange = (id: string) => {
    router.push(id === 'team' ? '/dashboard?view=team' : '/dashboard');
  };

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
        tabs={headerTabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        rightSlot={
          userIsAdmin ? (
            <span
              className="rounded-md px-3 py-1.5 text-[11.5px] font-semibold"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              Admin · Full View
            </span>
          ) : undefined
        }
      />

      <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {!isLoading && allTasks.length > 0 && (
          <p className="text-[11.5px] text-text-faint">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
            {hasActiveFilters ? ' (filtered)' : ''}
          </p>
        )}

        {/* KPI tiles */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[100px] animate-pulse rounded-xl border border-border-color bg-surface" />
            ))}
          </div>
        )}
        {!isLoading && allTasks.length > 0 && (
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
        )}

        {/* Analytics row 1 — donut + risk panel */}
        {!isLoading && allTasks.length > 0 && (
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
        )}

        {/* Analytics row 2 — owner workload + completion sparkline */}
        {!isLoading && allTasks.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <DSCard title="Owner workload" subtitle="Active assignments by team member">
              <OwnerWorkload rows={workloadRows} />
            </DSCard>
            <DSCard title="Completion this sprint" subtitle="Done vs. planned, last 14 days">
              <CompletionSpark daily={completionDaily} total={stats.total} done={stats.completed} />
            </DSCard>
          </div>
        )}

        {/* Aging summary — reflects active filters */}
        {!isLoading && statsSource.length > 0 && (
          <AgingSummaryBar tasks={statsSource} onFilterByAging={handleFilterByAging} />
        )}

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

        {/* Project picker popover for Add Task on dashboard */}
        {showProjectPicker && (
          <div className="rounded-lg border border-border-color bg-surface p-3 shadow-md">
            <p className="mb-2 text-xs font-medium text-text-muted">Select a project for the new task</p>
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

        <TaskViewContainer
          tasks={filteredTasks}
          isLoading={isLoading}
          viewMode={viewMode}
          projectId={addTaskProjectId ?? undefined}
          sort={sort}
          onSortToggle={toggleSort}
          onSelectTask={handleSelectTask}
          showProject
          projectsMap={projectsMap}
          emptyTitle={userIsAdmin ? 'No tasks in the system' : isTeamView ? 'No team tasks found' : 'No tasks assigned to you'}
          emptyDescription={userIsAdmin ? 'Create a project and add tasks to get started.' : isTeamView ? 'Tasks assigned to team members in your department will appear here.' : 'Tasks assigned to you across projects will appear here. Ask an admin to assign you tasks.'}
          showCreateRow={showCreateRow}
          onCloseCreateRow={handleCloseCreateRow}
        />
      </div>

      <TaskDetailPanel taskId={selectedTaskId} onClose={handleClosePanel} />
      <BulkUploadDialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen} />
    </RefinedAppShell>
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
