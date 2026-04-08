'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Check, X, Loader2, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useCreateTask } from '@/lib/hooks/use-tasks';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useUsers } from '@/lib/hooks/use-users';
import { Avatar } from '@/components/ui/avatar';
import type { Priority } from '@/lib/types';

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'P1', label: 'Critical', color: 'bg-red-500' },
  { value: 'P2', label: 'High', color: 'bg-pink-500' },
  { value: 'P3', label: 'Medium', color: 'bg-blue-500' },
  { value: 'P4', label: 'Low', color: 'bg-slate-400' },
];

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
  const [priority, setPriority] = useState<Priority>('P3');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();
  const { currentUser } = useCurrentUser();
  const { data: users } = useUsers();

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { if (showUserPicker) setTimeout(() => searchRef.current?.focus(), 50); }, [showUserPicker]);

  const selectedOwner = assigneeIds[0] || currentUser.id;
  const displayUsers = (users ?? []).filter(u => assigneeIds.includes(u.id));
  const displayLabel = displayUsers.length > 0
    ? displayUsers.map(u => u.full_name.split(' ')[0]).join(', ')
    : currentUser.full_name.split(' ')[0];

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    return (users ?? []).filter(u =>
      u.full_name.toLowerCase().includes(q) || u.department.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const toggleUser = (uid: string) => {
    setAssigneeIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const currentPriority = PRIORITIES.find(p => p.value === priority)!;

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !projectId) return;

    createTask.mutate(
      {
        project_id: projectId,
        parent_id: parentId ?? null,
        title: trimmedTitle,
        status: 'not_started',
        priority,
        owner_id: selectedOwner,
        eta: eta || null,
      },
      {
        onSuccess: () => {
          setTitle(''); setEta(''); setAssigneeIds([]); setPriority('P3');
          onCreated();
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showUserPicker && !showPriorityPicker) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (showUserPicker) setShowUserPicker(false);
      else if (showPriorityPicker) setShowPriorityPicker(false);
      else onCancel();
    }
  };

  const canSave = title.trim().length > 0 && !createTask.isPending;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <tr className="border-b-2 border-blue-200 bg-blue-50/50">
      <td className="w-8 px-1 py-2" />
      <td className="w-14 px-1 py-2 text-center">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[10px] font-bold text-blue-600">+</span>
      </td>

      {/* Priority picker */}
      <td className="w-24 px-2 py-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowPriorityPicker(v => !v); setShowUserPicker(false); }}
            className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-white px-2 py-1 text-xs transition-colors hover:border-blue-400"
          >
            <span className={cn('h-2 w-2 rounded-full', currentPriority.color)} />
            <span className="text-slate-700">{priority}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>
          {showPriorityPicker && (
            <div className="absolute left-0 top-full z-50 mt-1 w-36 rounded-lg border border-slate-200 bg-white shadow-lg">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => { setPriority(p.value); setShowPriorityPicker(false); }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors hover:bg-blue-50',
                    p.value === priority && 'bg-blue-50 text-blue-700',
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full', p.color)} />
                  <span>{p.value} — {p.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* Title */}
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

      {showProject && (
        <td className="px-2 py-2 text-xs text-slate-400 truncate max-w-[140px]">{projectName || ''}</td>
      )}

      {/* Status */}
      <td className="px-2 py-2">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">To Do</span>
      </td>

      {/* Assignee picker with search + multi-select */}
      <td className="px-2 py-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowUserPicker(v => !v); setShowPriorityPicker(false); setUserSearch(''); }}
            className="flex items-center gap-1 rounded-md border border-blue-200 bg-white px-1.5 py-1 text-xs transition-colors hover:border-blue-400"
          >
            {displayUsers.length > 0 ? (
              <div className="flex -space-x-1">
                {displayUsers.slice(0, 3).map(u => (
                  <Avatar key={u.id} fullName={u.full_name} src={u.avatar_url} size="sm" />
                ))}
              </div>
            ) : (
              <Avatar fullName={currentUser.full_name} src={currentUser.avatar_url} size="sm" />
            )}
            <span className="max-w-[50px] truncate text-slate-700">{displayLabel}</span>
            {assigneeIds.length > 1 && (
              <span className="rounded-full bg-blue-100 px-1 text-[9px] font-semibold text-blue-700">+{assigneeIds.length - 1}</span>
            )}
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showUserPicker && (
            <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-slate-200 bg-white shadow-lg">
              {/* Search */}
              <div className="border-b border-slate-100 px-2 py-1.5">
                <div className="flex items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1">
                  <Search className="h-3 w-3 text-slate-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
              {/* User list */}
              <div className="max-h-48 overflow-y-auto p-1">
                {filteredUsers.map(u => {
                  const selected = assigneeIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUser(u.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
                        selected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50',
                      )}
                    >
                      <div className={cn(
                        'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                        selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300',
                      )}>
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <Avatar fullName={u.full_name} src={u.avatar_url} size="sm" />
                      <div className="text-left truncate">
                        <span className="font-medium">{u.full_name}</span>
                        <span className="ml-1 text-slate-400">{u.department}</span>
                      </div>
                    </button>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <p className="px-3 py-2 text-xs text-slate-400">No matches</p>
                )}
              </div>
              {/* Done button */}
              <div className="border-t border-slate-100 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => setShowUserPicker(false)}
                  className="w-full rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
                >
                  Done{assigneeIds.length > 0 ? ` (${assigneeIds.length})` : ''}
                </button>
              </div>
            </div>
          )}
        </div>
      </td>

      {/* ETA */}
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

      {/* Actions */}
      <td className="w-20 px-1 py-2">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSave}
            title="Save task (Enter)"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-md transition-all',
              canSave ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm' : 'bg-slate-100 text-slate-300 cursor-not-allowed'
            )}
          >
            {createTask.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
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
