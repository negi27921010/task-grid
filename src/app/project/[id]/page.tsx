'use client';

import { use, useMemo, useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { Pencil, Check, X, FolderOpen } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { AgingSummaryBar } from '@/components/task/aging-summary-bar';
import { FilterBar } from '@/components/task/filter-bar';
import { TaskViewContainer } from '@/components/task/task-view-container';
import { TaskDetailPanel } from '@/components/task/task-detail-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useProject, useUpdateProject } from '@/lib/hooks/use-projects';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useFilters } from '@/lib/hooks/use-filters';
import { useViewMode } from '@/lib/hooks/use-view-mode';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { can } from '@/lib/utils/permissions';
import { filterTasks } from '@/lib/utils/search';
import type { AgingStatus } from '@/lib/types';

function ProjectContent({ id }: { id: string }) {
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: tasks, isLoading: tasksLoading } = useTasks(id);
  const { currentUser } = useCurrentUser();
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

  const updateProject = useUpdateProject();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const descInputRef = useRef<HTMLTextAreaElement>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const handleSelectTask = useCallback((taskId: string) => setSelectedTaskId(taskId), []);
  const handleClosePanel = useCallback(() => setSelectedTaskId(null), []);

  const [showCreateRow, setShowCreateRow] = useState(false);
  const handleAddTask = useCallback(() => setShowCreateRow(true), []);
  const handleCloseCreateRow = useCallback(() => setShowCreateRow(false), []);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  useEffect(() => {
    if (editingDesc && descInputRef.current) {
      descInputRef.current.focus();
      const len = descInputRef.current.value.length;
      descInputRef.current.setSelectionRange(len, len);
    }
  }, [editingDesc]);

  const handleNameSave = () => {
    const trimmed = nameValue.trim();
    if (trimmed && project && trimmed !== project.name) {
      updateProject.mutate({ id: project.id, updates: { name: trimmed } });
    }
    setEditingName(false);
  };

  const handleDescSave = () => {
    const trimmed = descValue.trim();
    if (project && trimmed !== (project.description || '')) {
      updateProject.mutate({ id: project.id, updates: { description: trimmed } });
    }
    setEditingDesc(false);
  };

  const startEditName = () => {
    if (project) {
      setNameValue(project.name);
      setEditingName(true);
    }
  };

  const startEditDesc = () => {
    if (project) {
      setDescValue(project.description || '');
      setEditingDesc(true);
    }
  };

  const allTasks = tasks ?? [];
  const filteredTasks = useMemo(
    () => filterTasks(allTasks, filters),
    [allTasks, filters]
  );

  const isLoading = projectLoading || tasksLoading;

  const projectStats = useMemo(() => {
    const total = allTasks.length;
    if (total === 0) return null;
    const completed = allTasks.filter(t => t.status === 'completed').length;
    const inProgress = allTasks.filter(t => t.status === 'in_progress').length;
    const blocked = allTasks.filter(t => t.status === 'blocked').length;
    const notStarted = allTasks.filter(t => t.status === 'not_started').length;
    const overdue = allTasks.filter(t => t.aging_status === 'overdue').length;
    return {
      total, completed, inProgress, blocked, notStarted, overdue,
      completionPct: Math.round((completed / total) * 100),
    };
  }, [allTasks]);

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
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleNameSave(); }
                      if (e.key === 'Escape') { e.preventDefault(); setEditingName(false); }
                    }}
                    className="rounded-md border border-blue-300 bg-white px-2 py-1 text-xl font-bold tracking-tight text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button type="button" onClick={handleNameSave} className="rounded-md p-1 text-green-600 hover:bg-green-50">
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setEditingName(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="group/title flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    {project.name}
                  </h1>
                  <button
                    type="button"
                    onClick={startEditName}
                    className="rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 group-hover/title:opacity-100"
                    title="Edit project name"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {editingDesc ? (
                <div className="mt-1.5 flex items-start gap-2">
                  <textarea
                    ref={descInputRef}
                    value={descValue}
                    onChange={e => setDescValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleDescSave(); }
                      if (e.key === 'Escape') { e.preventDefault(); setEditingDesc(false); }
                    }}
                    rows={2}
                    placeholder="Project description..."
                    className="flex-1 rounded-md border border-blue-300 bg-white px-2 py-1 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                  <button type="button" onClick={handleDescSave} className="rounded-md p-1 text-green-600 hover:bg-green-50" title="Save (Ctrl+Enter)">
                    <Check className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setEditingDesc(false)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="group/desc mt-1 flex items-center gap-2">
                  {project.description ? (
                    <p
                      className="text-sm text-slate-500 cursor-pointer hover:text-slate-700 transition-colors"
                      onClick={startEditDesc}
                    >
                      {project.description}
                    </p>
                  ) : (
                    <p
                      className="text-sm text-slate-400 italic cursor-pointer hover:text-slate-500 transition-colors"
                      onClick={startEditDesc}
                    >
                      Add a description...
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={startEditDesc}
                    className="rounded p-1 text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-600 group-hover/desc:opacity-100"
                    title="Edit description"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="h-12 w-12 text-slate-300" />
              <h2 className="mt-4 text-lg font-semibold text-slate-900">Project not found</h2>
              <p className="mt-1 text-sm text-slate-500">This project may have been deleted or you don&apos;t have access.</p>
            </div>
          )}

          {/* Project stats */}
          {!isLoading && projectStats && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {/* Completion bar */}
              <div className="flex items-center gap-2 min-w-[140px]">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${projectStats.completionPct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-emerald-600">{projectStats.completionPct}%</span>
              </div>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-500">{projectStats.total} tasks</span>
              {projectStats.completed > 0 && <span className="text-xs text-emerald-600">{projectStats.completed} done</span>}
              {projectStats.inProgress > 0 && <span className="text-xs text-blue-600">{projectStats.inProgress} in progress</span>}
              {projectStats.blocked > 0 && <span className="text-xs text-red-600">{projectStats.blocked} blocked</span>}
              {projectStats.overdue > 0 && <span className="text-xs text-amber-600">{projectStats.overdue} overdue</span>}
              {hasActiveFilters && (
                <span className="text-xs text-slate-400">(showing {filteredTasks.length} filtered)</span>
              )}
            </div>
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
          onAddTask={can(currentUser, 'canCreateTasks') ? handleAddTask : undefined}
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
          showCreateRow={showCreateRow}
          onCloseCreateRow={handleCloseCreateRow}
        />
      </div>

      {/* Task Detail Panel */}
      <TaskDetailPanel taskId={selectedTaskId} onClose={handleClosePanel} />
    </AppShell>
  );
}

function ProjectSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
    </div>
  );
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={<ProjectSkeleton />}>
      <ProjectContent id={id} />
    </Suspense>
  );
}
