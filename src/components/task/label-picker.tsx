'use client';

import { useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useLabels, useCreateLabel } from '@/lib/hooks/use-labels';
import { useUpdateTask } from '@/lib/hooks/use-tasks';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { LABEL_COLORS } from '@/lib/types/task';
import type { Label } from '@/lib/types/task';

interface LabelBadgeProps {
  label: Label;
  onRemove?: () => void;
}

export function LabelBadge({ label, onRemove }: LabelBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: label.color }}
    >
      {label.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-white/20"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

interface LabelPickerProps {
  taskId: string;
  taskLabels: string[];
  editable?: boolean;
}

export function LabelPicker({ taskId, taskLabels, editable = true }: LabelPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(LABEL_COLORS[0]);

  const { data: allLabels } = useLabels();
  const createLabel = useCreateLabel();
  const updateTask = useUpdateTask();
  const { currentUser } = useCurrentUser();

  const assignedLabels = (allLabels ?? []).filter(l => taskLabels.includes(l.id));
  const unassignedLabels = (allLabels ?? []).filter(l => !taskLabels.includes(l.id));

  const handleAdd = (labelId: string) => {
    updateTask.mutate({ id: taskId, updates: { labels: [...taskLabels, labelId] } });
  };

  const handleRemove = (labelId: string) => {
    updateTask.mutate({ id: taskId, updates: { labels: taskLabels.filter(id => id !== labelId) } });
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createLabel.mutate(
      { name: newName.trim(), color: newColor, created_by: currentUser.id },
      {
        onSuccess: (label) => {
          updateTask.mutate({ id: taskId, updates: { labels: [...taskLabels, label.id] } });
          setNewName('');
          setCreating(false);
        },
      }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {assignedLabels.map(label => (
          <LabelBadge
            key={label.id}
            label={label}
            onRemove={editable ? () => handleRemove(label.id) : undefined}
          />
        ))}
        {editable && (
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700"
          >
            <Tag className="h-3 w-3" />
            Label
          </button>
        )}
      </div>

      {showPicker && editable && (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          {unassignedLabels.length > 0 && (
            <div className="mb-2 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Available</p>
              <div className="flex flex-wrap gap-1">
                {unassignedLabels.map(label => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => handleAdd(label.id)}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white transition-opacity hover:opacity-80"
                    style={{ backgroundColor: label.color }}
                  >
                    <Plus className="h-2.5 w-2.5" />
                    {label.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!creating ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex items-center gap-1 text-xs text-blue-600 transition-colors hover:text-blue-800"
            >
              <Plus className="h-3 w-3" />
              Create new label
            </button>
          ) : (
            <div className="space-y-2 border-t border-gray-100 pt-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Label name"
                className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                autoFocus
              />
              <div className="flex flex-wrap gap-1">
                {LABEL_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={cn(
                      'h-5 w-5 rounded-full transition-transform',
                      newColor === color && 'ring-2 ring-offset-1 ring-gray-400 scale-110'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setNewName(''); }}
                  className="rounded-md px-3 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
