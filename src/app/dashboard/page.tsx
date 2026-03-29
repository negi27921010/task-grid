'use client';

import { Suspense, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ListTodo, PlayCircle, ShieldAlert, Clock } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { AgingSummaryBar } from '@/components/task/aging-summary-bar';
import { FilterBar } from '@/components/task/filter-bar';
import { TaskViewContainer } from '@/components/task/task-view-container';
import { TaskDetailPanel } from '@/components/task/task-detail-panel';
import { useTasksByOwner, useTasksByDepartment } from '@/lib/hooks/use-tasks';
import { useProjects } from '@/lib/hooks/use-projects';
import { useUsers } from '@/lib/hooks/use-users';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useFilters } from '@/lib/hooks/use-filters';
import { useViewMode } from '@/lib/hooks/use-view-mode';
import { filterTasks } from '@/lib/utils/search';
import { cn } from '@/lib/utils/cn';
import type { AgingStatus } from '@/lib/types';

function DashboardContent() {
  const searchParams = useSearchParams();
  const isTeamView = searchParams.get('view') === 'team';
  const { currentUser } = useCurrentUser();
  const { data: allUsersData } = useUsers();
  const { data: projectsData } = useProjects();

  const deptUserIds = useMemo(
    () => (allUsersData ?? []).filter(u => u.department === currentUser.department).map(u => u.id),
    [allUsersData, currentUser.department]
  );

  const projectsMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projectsData ?? []) { map[p.id] = p.name; }
    return map;
  }, [projectsData]);

  const myTasks = useTasksByOwner(currentUser.id);
  const teamTasks = useTasksByDepartment(currentUser.department, deptUserIds);

  const { data: tasks, isLoading } = isTeamView ? teamTasks : myTasks;
  const { viewMode, setViewMode } = useViewMode();
  const {
    filters, sort, presets,
    setFilter, clearFilters, toggleSort,
    savePreset, loadPreset, deletePreset, hasActiveFilters,
  } = useFilters();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const handleSelectTask = useCallback((taskId: string) => setSelectedTaskId(taskId), []);
  const handleClosePanel = useCallback(() => setSelectedTaskId(null), []);

  const allTasks = tasks ?? [];
  const filteredTasks = useMemo(() => filterTasks(allTasks, filters), [allTasks, filters]);

  const handleFilterByAging = (agingStatus: AgingStatus) => {
    const current = filters.aging_status ?? [];
    setFilter('aging_status', current.includes(agingStatus)
      ? current.filter(a => a !== agingStatus)
      : [...current, agingStatus]
    );
  };

  const pageSubtitle = isTeamView
    ? `All tasks in ${currentUser.department}`
    : `Tasks assigned to you across all projects`;

  const stats = useMemo(() => ({
    total: allTasks.length,
    inProgress: allTasks.filter(t => t.status === 'in_progress').length,
    blocked: allTasks.filter(t => t.status === 'blocked').length,
    overdue: allTasks.filter(t => t.aging_status === 'overdue').length,
  }), [allTasks]);

  const statCards = [
    { label: 'Total Tasks', value: stats.total, icon: ListTodo, bg: 'bg-slate-50', text: 'text-slate-600' },
    { label: 'In Progress', value: stats.inProgress, icon: PlayCircle, bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Blocked', value: stats.blocked, icon: ShieldAlert, bg: 'bg-red-50', text: 'text-red-600' },
    { label: 'Overdue', value: stats.overdue, icon: Clock, bg: 'bg-amber-50', text: 'text-amber-600' },
  ];

  return (
    <AppShell viewMode={viewMode} onViewModeChange={setViewMode}>
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header with tabs */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">{pageSubtitle}</p>
            {!isLoading && (
              <p className="mt-0.5 text-xs text-slate-400">
                {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                {hasActiveFilters ? ' (filtered)' : ''}
              </p>
            )}
          </div>
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
        </div>

        {/* Stat cards */}
        {!isLoading && allTasks.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statCards.map(({ label, value, icon: Icon, bg, text }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
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
          </div>
        )}

        {/* Aging summary */}
        {!isLoading && allTasks.length > 0 && (
          <AgingSummaryBar tasks={allTasks} onFilterByAging={handleFilterByAging} />
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
        />

        <TaskViewContainer
          tasks={filteredTasks}
          isLoading={isLoading}
          viewMode={viewMode}
          sort={sort}
          onSortToggle={toggleSort}
          onSelectTask={handleSelectTask}
          showProject
          projectsMap={projectsMap}
          emptyTitle={isTeamView ? 'No team tasks found' : 'No tasks assigned to you'}
          emptyDescription={isTeamView ? 'Tasks assigned to team members in your department will appear here.' : 'Tasks assigned to you across projects will appear here. Ask an admin to assign you tasks.'}
        />
      </div>

      <TaskDetailPanel taskId={selectedTaskId} onClose={handleClosePanel} />
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
