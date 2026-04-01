'use client';

import { useState, useRef, useEffect } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();
  const { currentUser } = useCurrentUser();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !projectId) {
      onCancel();
      return;
    }

    createTask.mutate(
      {
        project_id: projectId,
        parent_id: parentId ?? null,
        title: trimmedTitle,
        status: 'not_started',
        priority: 'P3',
        owner_id: currentUser.id,
      },
      {
        onSuccess: () => {
          setTitle('');
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

  return (
    <tr className="border-b border-blue-100 bg-blue-50/40">
      {/* Expand placeholder */}
      <td className="w-8 px-1 py-1.5" />
      {/* Serial placeholder */}
      <td className="w-14 px-1 py-1.5" />
      {/* Priority placeholder */}
      <td className="w-8 px-1 py-1.5" />
      {/* Title input */}
      <td className="py-1.5 pr-2" colSpan={1}>
        <div style={{ paddingLeft: `${depth * 24}px` }}>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (!title.trim()) onCancel(); }}
            aria-label="New task title"
            placeholder="Task title... (Enter to save, Esc to cancel)"
            className={cn(
              'w-full rounded border border-blue-300 bg-white px-2 py-1 text-sm text-slate-900',
              'placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'
            )}
            disabled={createTask.isPending}
          />
        </div>
      </td>
      {/* Project column (only when showProject=true) */}
      {showProject && (
        <td className="px-2 py-1.5 text-xs text-slate-400 truncate max-w-[160px]">
          {projectName || ''}
        </td>
      )}
      {/* Status placeholder */}
      <td className="px-2 py-1.5" />
      {/* Owner placeholder */}
      <td className="px-2 py-1.5" />
      {/* ETA placeholder */}
      <td className="px-2 py-1.5" />
      {/* Aging placeholder */}
      <td className="px-2 py-1.5" />
      {/* Comments placeholder */}
      <td className="px-2 py-1.5" />
      {/* Actions placeholder */}
      <td className="w-8 px-1 py-1.5" />
    </tr>
  );
}
