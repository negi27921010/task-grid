'use client';

import { useCallback, useState } from 'react';
import {
  X,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  Plus,
  Upload,
} from 'lucide-react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import * as Popover from '@/components/ui/popover';
import { Badge, PriorityDot, StatusBadge, AgingBadge } from '@/components/ui/badge';
import { useUsers } from '@/lib/hooks/use-users';
import type { TaskFilters, SortConfig, SortField, SavedFilterPreset } from '@/lib/types/filters';
import type { TaskStatus, Priority, AgingStatus } from '@/lib/types/task';
import { STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types/task';

interface FilterBarProps {
  filters: TaskFilters;
  sort: SortConfig[];
  onFilterChange: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void;
  onSortToggle: (field: SortField, addToExisting?: boolean) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  presets?: SavedFilterPreset[];
  onSavePreset?: (name: string) => void;
  onLoadPreset?: (preset: SavedFilterPreset) => void;
  onDeletePreset?: (id: string) => void;
  onAddTask?: () => void;
  onBulkUpload?: () => void;
}

/* ---- Checkbox helper ---- */

function FilterCheckbox({
  checked,
  onCheckedChange,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id: string;
}) {
  return (
    <CheckboxPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(v === true)}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 transition-colors',
        'data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1'
      )}
    >
      <CheckboxPrimitive.Indicator>
        <Check className="h-3 w-3 text-white" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

/* ---- Multi-select filter dropdown ---- */

interface FilterDropdownProps<T extends string> {
  label: string;
  options: { value: T; label: string; render?: React.ReactNode }[];
  selected: T[];
  onChange: (selected: T[]) => void;
}

function FilterDropdown<T extends string>({
  label,
  options,
  selected,
  onChange,
}: FilterDropdownProps<T>) {
  const activeCount = selected.length;

  const handleToggle = useCallback(
    (value: T) => {
      if (selected.includes(value)) {
        onChange(selected.filter((v) => v !== value));
      } else {
        onChange([...selected, value]);
      }
    },
    [selected, onChange]
  );

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
            activeCount > 0
              ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          )}
        >
          {label}
          {activeCount > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Content align="start" className="w-56 p-2">
        <div className="max-h-64 overflow-y-auto space-y-1">
          {options.map((option) => (
            <label
              key={option.value}
              htmlFor={`filter-${label}-${option.value}`}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-slate-50"
            >
              <FilterCheckbox
                id={`filter-${label}-${option.value}`}
                checked={selected.includes(option.value)}
                onCheckedChange={() => handleToggle(option.value)}
              />
              {option.render ?? <span className="text-slate-700">{option.label}</span>}
            </label>
          ))}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}

/* ---- Sort indicator ---- */

function SortIndicator({
  sort,
  onSortToggle,
}: {
  sort: SortConfig[];
  onSortToggle: (field: SortField, addToExisting?: boolean) => void;
}) {
  const sortFieldLabels: Record<SortField, string> = {
    priority: 'Priority',
    eta: 'ETA',
    created_at: 'Created',
    title: 'Title',
    status: 'Status',
    aging: 'Aging',
    updated_at: 'Updated',
  };

  if (sort.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <ArrowUpDown className="h-3.5 w-3.5" />
        No sort
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {sort.map((s) => (
        <button
          key={s.field}
          type="button"
          onClick={() => onSortToggle(s.field)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          {s.direction === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )}
          {sortFieldLabels[s.field]}
        </button>
      ))}
    </div>
  );
}

/* ---- Main FilterBar ---- */

const ALL_STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'blocked', 'completed', 'cancelled'];
const ALL_PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4'];
const ALL_AGING: AgingStatus[] = ['overdue', 'at_risk', 'on_track', 'no_eta', 'stale'];

const AGING_LABELS: Record<AgingStatus, string> = {
  overdue: 'Overdue',
  at_risk: 'At Risk',
  on_track: 'On Track',
  no_eta: 'No ETA',
  stale: 'Stale',
};

function PresetMenu({
  presets,
  hasActiveFilters,
  onSave,
  onLoad,
  onDelete,
}: {
  presets: SavedFilterPreset[];
  hasActiveFilters: boolean;
  onSave: (name: string) => void;
  onLoad: (preset: SavedFilterPreset) => void;
  onDelete: (id: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleSave = () => {
    const trimmed = presetName.trim();
    if (trimmed) {
      onSave(trimmed);
      setPresetName('');
      setSaving(false);
    }
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Presets
          {presets.length > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-slate-200 px-1 text-[10px] font-semibold text-slate-600">
              {presets.length}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Content align="end" className="w-64 p-2">
        {presets.length > 0 && (
          <div className="space-y-1 pb-2">
            <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Saved Presets
            </div>
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <button
                  type="button"
                  onClick={() => onLoad(preset)}
                  className="flex-1 text-left text-slate-700"
                >
                  {preset.name}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(preset.id)}
                  className="ml-2 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                  aria-label={`Delete preset ${preset.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {presets.length > 0 && <div className="my-1 h-px bg-slate-100" />}

        {saving ? (
          <div className="flex items-center gap-2 p-1">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setSaving(false);
              }}
              placeholder="Preset name..."
              className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
              autoFocus
            />
            <Button variant="primary" size="sm" className="h-6 px-2 text-xs" onClick={handleSave} disabled={!presetName.trim()}>
              Save
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSaving(true)}
            disabled={!hasActiveFilters}
            className="w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            + Save current filters as preset
          </button>
        )}
      </Popover.Content>
    </Popover.Root>
  );
}

export function FilterBar({
  filters,
  sort,
  onFilterChange,
  onSortToggle,
  onClearFilters,
  hasActiveFilters,
  presets = [],
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onAddTask,
  onBulkUpload,
}: FilterBarProps) {
  const { data: users } = useUsers();

  // Build active filter pills for display
  const activePills: { key: string; label: string; onRemove: () => void }[] = [];

  if (filters.status && filters.status.length > 0) {
    filters.status.forEach((s) => {
      activePills.push({
        key: `status-${s}`,
        label: STATUS_LABELS[s],
        onRemove: () =>
          onFilterChange(
            'status',
            filters.status!.filter((v) => v !== s)
          ),
      });
    });
  }

  if (filters.priority && filters.priority.length > 0) {
    filters.priority.forEach((p) => {
      activePills.push({
        key: `priority-${p}`,
        label: `${p} - ${PRIORITY_LABELS[p]}`,
        onRemove: () =>
          onFilterChange(
            'priority',
            filters.priority!.filter((v) => v !== p)
          ),
      });
    });
  }

  if (filters.owner_id && filters.owner_id.length > 0) {
    filters.owner_id.forEach((id) => {
      const user = users?.find((u) => u.id === id);
      activePills.push({
        key: `owner-${id}`,
        label: user?.full_name ?? id,
        onRemove: () =>
          onFilterChange(
            'owner_id',
            filters.owner_id!.filter((v) => v !== id)
          ),
      });
    });
  }

  if (filters.aging_status && filters.aging_status.length > 0) {
    filters.aging_status.forEach((a) => {
      activePills.push({
        key: `aging-${a}`,
        label: AGING_LABELS[a],
        onRemove: () =>
          onFilterChange(
            'aging_status',
            filters.aging_status!.filter((v) => v !== a)
          ),
      });
    });
  }

  return (
    <div className="space-y-2">
      {/* Filter dropdowns row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Add Task CTA */}
        {onAddTask && (
          <Button
            variant="primary"
            size="sm"
            className="gap-1.5 shadow-sm"
            onClick={onAddTask}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </Button>
        )}
        {onBulkUpload && (
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={onBulkUpload}
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </Button>
        )}

        <div className="mx-1 h-5 w-px bg-slate-200" />
        <Filter className="h-4 w-4 text-slate-400" />

        <FilterDropdown<TaskStatus>
          label="Status"
          options={ALL_STATUSES.map((s) => ({
            value: s,
            label: STATUS_LABELS[s],
            render: <StatusBadge status={s} />,
          }))}
          selected={filters.status ?? []}
          onChange={(v) => onFilterChange('status', v.length > 0 ? v : undefined)}
        />

        <FilterDropdown<Priority>
          label="Priority"
          options={ALL_PRIORITIES.map((p) => ({
            value: p,
            label: `${p} - ${PRIORITY_LABELS[p]}`,
            render: (
              <span className="flex items-center gap-1.5">
                <PriorityDot priority={p} />
                <span className="text-sm text-slate-700">
                  {p} - {PRIORITY_LABELS[p]}
                </span>
              </span>
            ),
          }))}
          selected={filters.priority ?? []}
          onChange={(v) => onFilterChange('priority', v.length > 0 ? v : undefined)}
        />

        <FilterDropdown<string>
          label="Owner"
          options={
            (users ?? []).map((u) => ({
              value: u.id,
              label: u.full_name,
            }))
          }
          selected={filters.owner_id ?? []}
          onChange={(v) => onFilterChange('owner_id', v.length > 0 ? v : undefined)}
        />

        <FilterDropdown<AgingStatus>
          label="Aging"
          options={ALL_AGING.map((a) => ({
            value: a,
            label: AGING_LABELS[a],
            render: <AgingBadge status={a} />,
          }))}
          selected={filters.aging_status ?? []}
          onChange={(v) => onFilterChange('aging_status', v.length > 0 ? v : undefined)}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Filter presets */}
        {onSavePreset && onLoadPreset && onDeletePreset && (
          <PresetMenu
            presets={presets}
            hasActiveFilters={hasActiveFilters}
            onSave={onSavePreset}
            onLoad={onLoadPreset}
            onDelete={onDeletePreset}
          />
        )}

        {/* Sort indicator */}
        <SortIndicator sort={sort} onSortToggle={onSortToggle} />
      </div>

      {/* Active filter pills */}
      {activePills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {activePills.map((pill) => (
            <span
              key={pill.key}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700"
            >
              {pill.label}
              <button
                type="button"
                onClick={pill.onRemove}
                className="ml-0.5 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                aria-label={`Remove ${pill.label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-6 px-2 text-xs text-slate-500"
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
