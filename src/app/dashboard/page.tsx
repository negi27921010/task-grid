'use client';

import { Suspense, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ListTodo, PlayCircle, ShieldAlert, Clock, CheckCircle2 } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
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
import { cn } from '@/lib/utils/cn';
import type { AgingStatus } from '@/lib/types';

function DashboardContent() {
  const searchParams = useSearchParams();
  const isTeamView = searchParams.get('view') === 'team';
  const { currentUser, isLoading: userLoading } = useCurrentUser();
  const { data: allUsersData } = useUsers();
  const { data: projectsData } = useProjects();
  const { viewMode, setViewMode } = useViewMode();

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

  // Add Task state — on dashboard, user must pick a project first
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [addTaskProjectId, setAddTaskProjectId] = useState<string | null>(null);
  const [showCreateRow, setShowCreateRow] = useState(false);

  const activeProjects = useMemo(
    () => (projectsData ?? []).filter(p => p.status === 'active'),
    [projectsData]
  );

  const handleAddTask = useCallback(() => {
    if (activeProjects.length === 1) {
      // Single project — go straight to inline create
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

  const pageSubtitle = userIsAdmin
    ? 'All tasks across every project'
    : isTeamView
      ? `All tasks in ${currentUser.department}`
      : `Tasks assigned to you across all projects`;

  // Stats computed from the active view (filtered when filters applied, all otherwise)
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

  const statCards = [
    { label: 'Total Tasks', value: stats.total, icon: ListTodo, bg: 'bg-slate-50', text: 'text-slate-600', accent: 'bg-slate-200' },
    { label: 'In Progress', value: stats.inProgress, icon: PlayCircle, bg: 'bg-blue-50', text: 'text-blue-600', accent: 'bg-blue-200' },
    { label: 'Blocked', value: stats.blocked, icon: ShieldAlert, bg: 'bg-red-50', text: 'text-red-600', accent: 'bg-red-200' },
    { label: 'Overdue', value: stats.overdue, icon: Clock, bg: 'bg-amber-50', text: 'text-amber-600', accent: 'bg-amber-200' },
  ];

  return (
    <AppShell viewMode={viewMode} onViewModeChange={setViewMode}>
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header with greeting + tabs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {userLoading ? 'Loading...' : userIsAdmin ? `Welcome, ${currentUser.full_name.split(' ')[0]}` : isTeamView ? 'Team View' : `Welcome, ${currentUser.full_name.split(' ')[0]}`}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">{pageSubtitle}</p>
            {!isLoading && (
              <p className="mt-0.5 text-xs text-slate-400">
                {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                {hasActiveFilters ? ' (filtered)' : ''}
              </p>
            )}
          </div>
          {!userIsAdmin && (
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <Link
                href="/dashboard"
                className={cn(
                  'rounded-md px-4 py-1.5 text-sm font-medium transition-all',
                  !isTeamView ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                My Tasks
              </Link>
              <Link
                href="/dashboard?view=team"
                className={cn(
                  'rounded-md px-4 py-1.5 text-sm font-medium transition-all',
                  isTeamView ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                Team View
              </Link>
            </div>
          )}
          {userIsAdmin && (
            <span className="rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              Admin — Full View
            </span>
          )}
        </div>

        {/* Stat card skeletons while loading */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-slate-100 animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-6 w-10 rounded bg-slate-100 animate-pulse" />
                    <div className="h-3 w-16 rounded bg-slate-50 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stat cards + completion progress */}
        {!isLoading && allTasks.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {statCards.map(({ label, value, icon: Icon, bg, text }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className={cn('rounded-lg p-2', bg)}>
                    <Icon className={cn('h-5 w-5', text)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                </div>
              </div>
            ))}
            {/* Completion rate card */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-50 p-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold text-slate-900">{stats.completionRate}%</p>
                  <p className="text-xs text-slate-500">Completed</p>
                </div>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>
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
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-md">
            <p className="mb-2 text-xs font-medium text-slate-500">Select a project for the new task</p>
            <div className="flex flex-wrap gap-2">
              {activeProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePickProject(p.id)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {p.name}
                </button>
              ))}
              <button
                onClick={() => setShowProjectPicker(false)}
                className="rounded-md px-3 py-1.5 text-sm text-slate-400 transition-colors hover:text-slate-600"
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
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
