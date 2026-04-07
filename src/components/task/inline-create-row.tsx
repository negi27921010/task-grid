'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useCreateTask } from '@/lib/hooks/use-tasks';
import { useCurrentUser } from '@/lib/hooks/use-current-user';

interface InlineCreateRowProps {
  projectId: string;
  parentId?: string | null;
  depth?: number;
  onCancel: () => void;
  onCreated: () => void;
  showProject?: boolean;
  projectName?: string;
}

export function InlineCreateRow({
  projectId,
  parentId,
  depth = 0,
  onCancel,
  onCreated,
  showProject = false,
  projectName,
}: InlineCreateRowProps) {
  const [title, setTitle] = useState('');
  const [eta, setEta] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();
  const { currentUser } = useCurrentUser();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !projectId) return;

    createTask.mutate(
      {
        project_id: projectId,
        parent_id: parentId ?? null,
        title: trimmedTitle,
        status: 'not_started',
        priority: 'P3',
        owner_id: currentUser.id,
        eta: eta || null,
      },
      {
        onSuccess: () => {
          setTitle('');
          setEta('');
          onCreated();
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const canSave = title.trim().length > 0 && !createTask.isPending;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <tr className="border-b-2 border-blue-200 bg-blue-50/50">
      {/* Expand placeholder */}
      <td className="w-8 px-1 py-2" />
      {/* Serial — shows + icon */}
      <td className="w-14 px-1 py-2 text-center">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-600">+</span>
      </td>
      {/* Priority — shows default */}
      <td className="w-8 px-2 py-2">
        <span className="inline-flex h-2 w-2 rounded-full bg-blue-400" title="Medium (P3)" />
      </td>
      {/* Title input */}
      <td className="py-2 pr-2" colSpan={1}>
        <div style={{ paddingLeft: `${depth * 24}px` }}>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            onKeyDown={handleKeyDown}
            aria-label="New task title"
            placeholder="What needs to be done?"
            className={cn(
              'w-full rounded-md border bg-white px-2.5 py-1.5 text-sm text-slate-900 transition-colors',
              'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
              title.trim() ? 'border-blue-400 focus:border-blue-500' : 'border-blue-200 focus:border-blue-400'
            )}
            disabled={createTask.isPending}
          />
        </div>
      </td>
      {/* Project column */}
      {showProject && (
        <td className="px-2 py-2 text-xs text-slate-400 truncate max-w-[140px]">
          {projectName || ''}
        </td>
      )}
      {/* Status */}
      <td className="px-2 py-2">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">To Do</span>
      </td>
      {/* Owner */}
      <td className="px-2 py-2" />
      {/* ETA — date picker */}
      <td className="px-2 py-2">
        <input
          type="date"
          value={eta}
          onChange={(e) => setEta(e.target.value)}
          onKeyDown={handleKeyDown}
          min={today}
          className="w-full rounded-md border border-blue-200 bg-white px-1.5 py-1 text-xs text-slate-700 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20"
          disabled={createTask.isPending}
        />
      </td>
      {/* Aging */}
      <td className="px-2 py-2" />
      {/* Comments */}
      <td className="px-2 py-2" />
      {/* Actions — Save + Cancel buttons */}
      <td className="w-20 px-1 py-2">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSave}
            title="Save task (Enter)"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-all',
              canSave
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            )}
          >
            {createTask.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            title="Cancel (Esc)"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
