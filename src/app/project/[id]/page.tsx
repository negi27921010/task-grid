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
          <div className="rounded-xl border border-border-color bg-surface p-5">
            {/* Top row: completion ring + segmented bar + status chips */}
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-3">
                <CompletionRing
                  pct={projectStats.completionPct}
                  size={56}
                  stroke={6}
                />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Completion
                  </p>
                  <p
                    className="text-2xl font-semibold leading-none text-text"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {projectStats.completed}
                    <span className="ml-1 text-[14px] font-medium text-text-muted">
                      / {projectStats.total}
                    </span>
                  </p>
                </div>
              </div>

              <div className="h-10 w-px bg-border-color" aria-hidden="true" />

              <div className="min-w-[260px] flex-1 space-y-2">
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
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
                <div className="flex flex-wrap items-center gap-3 text-[12px]">
                  {projectStats.completed > 0 && (
                    <StatusChip dot="bg-emerald-500" label="Done" count={projectStats.completed} />
                  )}
                  {projectStats.inProgress > 0 && (
                    <StatusChip dot="bg-blue-500" label="In progress" count={projectStats.inProgress} />
                  )}
                  {projectStats.blocked > 0 && (
                    <StatusChip dot="bg-red-500" label="Blocked" count={projectStats.blocked} />
                  )}
                  {projectStats.notStarted > 0 && (
                    <StatusChip dot="bg-neutral-300 dark:bg-neutral-700" label="Not started" count={projectStats.notStarted} />
                  )}
                  {hasActiveFilters && (
                    <span className="text-text-faint">
                      (showing {filteredTasks.length} filtered)
                    </span>
                  )}
                </div>
              </div>

              <div className="hidden h-10 w-px bg-border-color md:block" aria-hidden="true" />

              {/* Aging KPIs as compact tiles — click to filter */}
              <div className="grid grid-cols-3 gap-2 md:flex md:gap-3">
                <AgingKpi
                  label="Overdue"
                  value={projectStats.overdue}
                  tone="red"
                  active={filters.aging_status?.includes('overdue')}
                  onClick={() => handleFilterByAging('overdue')}
                />
                <AgingKpi
                  label="At risk"
                  value={statsCount(allTasks, 'at_risk')}
                  tone="amber"
                  active={filters.aging_status?.includes('at_risk')}
                  onClick={() => handleFilterByAging('at_risk')}
                />
                <AgingKpi
                  label="On track"
                  value={statsCount(allTasks, 'on_track')}
                  tone="green"
                  active={filters.aging_status?.includes('on_track')}
                  onClick={() => handleFilterByAging('on_track')}
                />
                <AgingKpi
                  label="No ETA"
                  value={statsCount(allTasks, 'no_eta')}
                  tone="gray"
                  active={filters.aging_status?.includes('no_eta')}
                  onClick={() => handleFilterByAging('no_eta')}
                />
                <AgingKpi
                  label="Stale"
                  value={statsCount(allTasks, 'stale')}
                  tone="neutral"
                  active={filters.aging_status?.includes('stale')}
                  onClick={() => handleFilterByAging('stale')}
                />
              </div>
            </div>
          </div>
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
              canCreate={can(currentUser, 'canCreateTasks')}
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

function StatusChip({
  dot, label, count,
}: { dot: string; label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border-color bg-canvas px-2 py-0.5">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="font-medium text-text">{count}</span>
      <span className="text-text-muted">{label}</span>
    </span>
  );
}

function CompletionRing({
  pct, size = 56, stroke = 6,
}: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = Math.PI * 2 * r;
  const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  const ringColor = pct >= 80 ? '#16a34a' : pct >= 50 ? '#0073ea' : pct >= 25 ? '#f59e0b' : '#dc2626';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--neutral-100)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={ringColor} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[12px] font-bold tabular-nums text-text"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {pct}%
      </span>
    </div>
  );
}

const AGING_TONES = {
  red:    { bg: 'bg-red-50 dark:bg-red-500/10',         text: 'text-red-700 dark:text-red-300',         border: 'border-red-200 dark:border-red-500/30' },
  amber:  { bg: 'bg-amber-50 dark:bg-amber-500/10',     text: 'text-amber-700 dark:text-amber-300',     border: 'border-amber-200 dark:border-amber-500/30' },
  green:  { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-500/30' },
  gray:   { bg: 'bg-neutral-100',                       text: 'text-text-muted',                        border: 'border-border-color' },
  neutral:{ bg: 'bg-neutral-100',                       text: 'text-text-faint',                        border: 'border-border-color' },
} as const;

function AgingKpi({
  label, value, tone, active = false, onClick,
}: {
  label: string;
  value: number;
  tone: keyof typeof AGING_TONES;
  active?: boolean;
  onClick?: () => void;
}) {
  const t = AGING_TONES[tone];
  const cls = `flex min-w-[78px] flex-col items-center justify-center rounded-md border px-2 py-1.5 transition-all ${t.bg} ${t.border} ${active ? 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-surface' : ''}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} cursor-pointer hover:-translate-y-px`}>
        <span className={`text-[16px] font-bold leading-none tabular-nums ${t.text}`} style={{ fontFamily: 'var(--font-display)' }}>
          {value}
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">
          {label}
        </span>
      </button>
    );
  }
  return (
    <div className={cls}>
      <span className={`text-[16px] font-bold leading-none tabular-nums ${t.text}`} style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </span>
      <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-text-muted">
        {label}
      </span>
    </div>
  );
}

function statsCount(
  tasks: { aging_status?: string; status?: string }[],
  agingStatus: string,
): number {
  return tasks.filter(t => t.aging_status === agingStatus).length;
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
