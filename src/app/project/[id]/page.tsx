'use client';

import { use, useMemo, useState, useCallback } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { AgingSummaryBar } from '@/components/task/aging-summary-bar';
import { FilterBar } from '@/components/task/filter-bar';
import { TaskViewContainer } from '@/components/task/task-view-container';
import { TaskDetailPanel } from '@/components/task/task-detail-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useProject } from '@/lib/hooks/use-projects';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useFilters } from '@/lib/hooks/use-filters';
import { useViewMode } from '@/lib/hooks/use-view-mode';
import { filterTasks } from '@/lib/utils/search';
import type { AgingStatus } from '@/lib/types';

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: tasks, isLoading: tasksLoading } = useTasks(id);
  const { viewMode, setViewMode } = useViewMode();
  const {
    filters,
    sort,
    presets,
    setFilter,
    clearFilters,
    toggleSort,
    savePreset,
    loadPreset,
    deletePreset,
    hasActiveFilters,
  } = useFilters();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const handleSelectTask = useCallback((taskId: string) => setSelectedTaskId(taskId), []);
  const handleClosePanel = useCallback(() => setSelectedTaskId(null), []);

  const allTasks = tasks ?? [];
  const filteredTasks = useMemo(
    () => filterTasks(allTasks, filters),
    [allTasks, filters]
  );

  const isLoading = projectLoading || tasksLoading;

  const handleFilterByAging = (agingStatus: AgingStatus) => {
    const current = filters.aging_status ?? [];
    if (current.includes(agingStatus)) {
      setFilter(
        'aging_status',
        current.filter((a) => a !== agingStatus)
      );
    } else {
      setFilter('aging_status', [...current, agingStatus]);
    }
  };

  return (
    <AppShell viewMode={viewMode} onViewModeChange={setViewMode}>
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* Project header */}
        <div>
          {projectLoading ? (
            <div className="space-y-2">
              <Skeleton width={240} height={22} />
              <Skeleton width={360} height={14} />
            </div>
          ) : project ? (
            <>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {project.name}
              </h1>
              {project.description && (
                <p className="mt-1 text-sm text-slate-500">
                  {project.description}
                </p>
              )}
            </>
          ) : (
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Project</h1>
          )}

          {!isLoading && (
            <p className="mt-0.5 text-xs text-slate-400">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
              {hasActiveFilters ? ' (filtered)' : ''}
            </p>
          )}
        </div>

        {/* Aging summary */}
        {!isLoading && allTasks.length > 0 && (
          <AgingSummaryBar
            tasks={allTasks}
            onFilterByAging={handleFilterByAging}
          />
        )}

        {/* Filter bar */}
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

        {/* View container */}
        <TaskViewContainer
          tasks={filteredTasks}
          isLoading={isLoading}
          viewMode={viewMode}
          projectId={id}
          sort={sort}
          onSortToggle={toggleSort}
          onSelectTask={handleSelectTask}
        />
      </div>

      {/* Task Detail Panel */}
      <TaskDetailPanel taskId={selectedTaskId} onClose={handleClosePanel} />
    </AppShell>
  );
}
