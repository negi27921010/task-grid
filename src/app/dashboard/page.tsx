'use client';

import { Suspense, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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

  const pageTitle = isTeamView ? 'Team View' : 'My Tasks';
  const pageSubtitle = isTeamView
    ? `All tasks in ${currentUser.department}`
    : `Tasks assigned to you across all projects`;

  return (
    <AppShell viewMode={viewMode} onViewModeChange={setViewMode}>
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{pageSubtitle}</p>
          {!isLoading && (
            <p className="mt-0.5 text-sm text-slate-400">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
              {hasActiveFilters ? ' (filtered)' : ''}
            </p>
          )}
        </div>

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
