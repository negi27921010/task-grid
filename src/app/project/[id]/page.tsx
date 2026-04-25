'use client';

import {
  use,
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
  Suspense,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Pencil,
  Check,
  X,
  FolderOpen,
  Table as TableIcon,
  Kanban as KanbanIcon,
} from 'lucide-react';
import { RefinedAppShell, RefinedPageHeader, type PageTab } from '@/components/shell';
import { RefinedTaskTable, RefinedKanban } from '@/components/board';
import { AgingSummaryBar } from '@/components/task/aging-summary-bar';
import { FilterBar } from '@/components/task/filter-bar';
import { TaskDetailPanel } from '@/components/task/task-detail-panel';
import { BulkUploadDialog } from '@/components/task/bulk-upload-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useProject, useUpdateProject } from '@/lib/hooks/use-projects';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useUsers } from '@/lib/hooks/use-users';
import { useFilters } from '@/lib/hooks/use-filters';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { can } from '@/lib/utils/permissions';
import { filterTasks } from '@/lib/utils/search';
import type { AgingStatus } from '@/lib/types';

type View = 'table' | 'kanban';

const VIEW_TABS: PageTab[] = [
  { id: 'table',  label: 'Main table', icon: TableIcon },
  { id: 'kanban', label: 'Kanban',     icon: KanbanIcon },
];

function parseView(raw: string | null): View {
  return raw === 'kanban' ? 'kanban' : 'table';
}

function ProjectContent({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseView(searchParams.get('view'));

  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: tasks, isLoading: tasksLoading } = useTasks(id);
  const { data: users } = useUsers();
  const { currentUser } = useCurrentUser();
  const {
    filters, sort, presets,
    setFilter, clearFilters, toggleSort,
    savePreset, loadPreset, deletePreset, hasActiveFilters,
  } = useFilters();

  const updateProject = useUpdateProject();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const descInputRef = useRef<HTMLTextAreaElement>(null);

  const taskFromUrl = searchParams.get('task');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(taskFromUrl);
  const handleSelectTask = useCallback(
    (taskId: string) => setSelectedTaskId(taskId), []
  );
  const handleClosePanel = useCallback(() => setSelectedTaskId(null), []);

  useEffect(() => {
    if (taskFromUrl && taskFromUrl !== selectedTaskId) {
      setSelectedTaskId(taskFromUrl);
    }
  }, [taskFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const [showCreateRow, setShowCreateRow] = useState(false);
  const handleAddTask = useCallback(() => setShowCreateRow(true), []);
  const handleCloseCreateRow = useCallback(() => setShowCreateRow(false), []);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

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
    () => filterTasks(allTasks, filters), [allTasks, filters]
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
    setFilter(
      'aging_status',
      current.includes(agingStatus)
        ? current.filter((a) => a !== agingStatus)
        : [...current, agingStatus],
    );
  };

  const updateView = (next: View) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'table') params.delete('view'); else params.set('view', next);
    const qs = params.toString();
    router.push(`/project/${id}${qs ? `?${qs}` : ''}`);
  };

  return (
    <RefinedAppShell>
      <RefinedPageHeader
        title={project?.name ?? (projectLoading ? 'Loading…' : 'Project not found')}
        subtitle={project?.description || (projectLoading ? '' : 'Project workspace')}
        tabs={project ? VIEW_TABS : undefined}
        activeTab={view}
        onTabChange={(id) => updateView(id as View)}
        rightSlot={
          project && can(currentUser, 'canEditProjects') && !editingName ? (
            <button
              type="button"
              onClick={startEditName}
              className="rounded-md p-1.5 text-text-faint transition-colors hover:bg-hover hover:text-text"
              aria-label="Edit project name"
              title="Edit project name"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : undefined
        }
      />

      <div className="mx-auto w-full max-w-[1400px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* Inline name editor — appears in place when triggered */}
        {editingName && project && (
          <div className="flex items-center gap-2 rounded-lg border border-border-color bg-surface p-3">
            <input
              ref={nameInputRef}
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleNameSave(); }
                if (e.key === 'Escape') { e.preventDefault(); setEditingName(false); }
              }}
              className="flex-1 rounded-md border border-border-color bg-surface px-2.5 py-1.5 text-sm font-semibold text-text focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            <button
              type="button"
              onClick={handleNameSave}
              className="rounded-md p-1.5 text-green-600 transition-colors hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-500/15"
              aria-label="Save name"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setEditingName(false)}
              className="rounded-md p-1.5 text-text-faint transition-colors hover:bg-hover hover:text-text-muted"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Inline description editor */}
        {editingDesc && project && (
          <div className="flex items-start gap-2 rounded-lg border border-border-color bg-surface p-3">
            <textarea
              ref={descInputRef}
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleDescSave(); }
                if (e.key === 'Escape') { e.preventDefault(); setEditingDesc(false); }
              }}
              rows={2}
              placeholder="Project description…"
              className="flex-1 resize-none rounded-md border border-border-color bg-surface px-2.5 py-1.5 text-sm text-text focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            <button
              type="button"
              onClick={handleDescSave}
              className="rounded-md p-1.5 text-green-600 transition-colors hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-500/15"
              title="Save (⌘⏎)"
              aria-label="Save description"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setEditingDesc(false)}
              className="rounded-md p-1.5 text-text-faint transition-colors hover:bg-hover hover:text-text-muted"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Project stats row */}
        {projectLoading && (
          <div className="space-y-2">
            <Skeleton width={240} height={22} />
            <Skeleton width={360} height={14} />
          </div>
        )}

        {!projectLoading && !project && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-color bg-surface px-6 py-16 text-center">
            <FolderOpen className="h-10 w-10 text-text-faint" />
            <h2
              className="mt-4 text-lg font-semibold text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Project not found
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              This project may have been deleted or you don&apos;t have access.
            </p>
          </div>
        )}

        {!isLoading && projectStats && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                {projectStats.completed > 0 && (
                  <div
                    className="bg-emerald-500 transition-all duration-500"
                    style={{ width: `${(projectStats.completed / projectStats.total) * 100}%` }}
                    title={`${projectStats.completed} completed`}
                  />
                )}
                {projectStats.inProgress > 0 && (
                  <div
                    className="bg-blue-500 transition-all duration-500"
                    style={{ width: `${(projectStats.inProgress / projectStats.total) * 100}%` }}
                    title={`${projectStats.inProgress} in progress`}
                  />
                )}
                {projectStats.blocked > 0 && (
                  <div
                    className="bg-red-500 transition-all duration-500"
                    style={{ width: `${(projectStats.blocked / projectStats.total) * 100}%` }}
                    title={`${projectStats.blocked} blocked`}
                  />
                )}
              </div>
              <span className="shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                {projectStats.completionPct}%
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="text-text-muted">{projectStats.total} tasks</span>
              {projectStats.completed > 0 && (
                <Stat color="bg-emerald-500" label={`${projectStats.completed} done`} />
              )}
              {projectStats.inProgress > 0 && (
                <Stat color="bg-blue-500" label={`${projectStats.inProgress} in progress`} />
              )}
              {projectStats.blocked > 0 && (
                <Stat color="bg-red-500" label={`${projectStats.blocked} blocked`} />
              )}
              {projectStats.notStarted > 0 && (
                <Stat color="bg-neutral-200" label={`${projectStats.notStarted} not started`} />
              )}
              {projectStats.overdue > 0 && (
                <span className="text-amber-600 dark:text-amber-300">{projectStats.overdue} overdue</span>
              )}
              {hasActiveFilters && (
                <span className="text-text-faint">(showing {filteredTasks.length} filtered)</span>
              )}
            </div>
          </div>
        )}

        {/* Aging summary */}
        {!isLoading && allTasks.length > 0 && (
          <AgingSummaryBar tasks={allTasks} onFilterByAging={handleFilterByAging} />
        )}

        {/* Filter bar */}
        {project && (
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
            onBulkUpload={can(currentUser, 'canCreateTasks') ? () => setBulkUploadOpen(true) : undefined}
          />
        )}

        {/* Refined views */}
        {project && !isLoading && (
          allTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-color bg-surface px-6 py-16 text-center">
              <p
                className="text-base font-semibold text-text"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                No tasks in this project yet
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Click <strong>+ New task</strong> in the toolbar above to add the first one.
              </p>
            </div>
          ) : view === 'kanban' ? (
            <RefinedKanban
              tasks={filteredTasks}
              users={users ?? []}
              onTaskClick={handleSelectTask}
              onAddTask={can(currentUser, 'canCreateTasks') ? handleAddTask : undefined}
            />
          ) : (
            <RefinedTaskTable
              tasks={filteredTasks}
              users={users ?? []}
              onTaskClick={handleSelectTask}
              onAddTask={can(currentUser, 'canCreateTasks') ? handleAddTask : undefined}
            />
          )
        )}

        {/* Inline create row indicator */}
        {showCreateRow && (
          <div className="flex items-center justify-between rounded-lg border border-[var(--accent)]/40 bg-accent-soft px-4 py-3 text-sm">
            <span className="text-text-muted">
              Inline task creation is in the legacy panel — open the Task Detail panel to add subtasks here, or use the Add Task button.
            </span>
            <button
              type="button"
              onClick={handleCloseCreateRow}
              className="rounded-md px-3 py-1 text-xs font-medium text-text-muted hover:bg-hover hover:text-text"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      <TaskDetailPanel taskId={selectedTaskId} onClose={handleClosePanel} />
      <BulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        defaultProjectId={id}
      />
    </RefinedAppShell>
  );
}

function Stat({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-text-muted">{label}</span>
    </span>
  );
}

function ProjectSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-canvas">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
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
