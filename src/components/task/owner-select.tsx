'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Avatar } from '@/components/ui/avatar';
import { Tooltip } from '@/components/ui/tooltip';
import { useUsers } from '@/lib/hooks/use-users';

interface OwnerSelectProps {
  currentOwnerId: string;
  assigneeIds?: string[];
  onOwnerChange: (ownerId: string) => void;
  onAssigneesChange?: (assigneeIds: string[]) => void;
  disabled?: boolean;
  compact?: boolean;
  multi?: boolean;
}

export function OwnerSelect({
  currentOwnerId,
  assigneeIds = [],
  onOwnerChange,
  onAssigneesChange,
  disabled,
  compact,
  multi,
}: OwnerSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { data: users } = useUsers();

  const serverIds = multi
    ? (assigneeIds.length > 0 ? assigneeIds : currentOwnerId ? [currentOwnerId] : [])
    : (currentOwnerId ? [currentOwnerId] : []);

  const [localIds, setLocalIds] = useState<string[]>(serverIds);

  useEffect(() => {
    setLocalIds(serverIds);
  }, [assigneeIds.join(','), currentOwnerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveIds = multi ? localIds : serverIds;
  const selectedUsers = (users ?? []).filter(u => effectiveIds.includes(u.id));

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const filtered = (users ?? []).filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.department.toLowerCase().includes(search.toLowerCase())
  );

  const departments = [...new Set(filtered.map(u => u.department))].sort();

  const handleSelect = useCallback((userId: string) => {
    if (multi && onAssigneesChange) {
      const current = [...localIds];
      let next: string[];
      if (current.includes(userId)) {
        if (current.length <= 1) return;
        next = current.filter(id => id !== userId);
      } else {
        next = [...current, userId];
      }
      setLocalIds(next);
      onAssigneesChange(next);
    } else {
      onOwnerChange(userId);
      setOpen(false);
    }
  }, [multi, onAssigneesChange, onOwnerChange, localIds]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setOpen(!open);
        }}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md transition-all',
          compact
            ? 'p-0.5 hover:bg-slate-100'
            : 'border border-slate-200 px-3 py-1.5 text-sm hover:border-slate-300 hover:bg-slate-50',
          disabled && 'cursor-default opacity-60'
        )}
      >
        {compact ? (
          <div className="flex -space-x-1.5">
            {selectedUsers.slice(0, 3).map(u => (
              <Tooltip key={u.id} content={`${u.full_name} — ${u.department}`}>
                <span><Avatar src={u.avatar_url} fullName={u.full_name} size="sm" /></span>
              </Tooltip>
            ))}
            {selectedUsers.length > 3 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[9px] font-semibold text-slate-600 ring-2 ring-white">
                +{selectedUsers.length - 3}
              </span>
            )}
            {selectedUsers.length === 0 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-400">?</span>
            )}
          </div>
        ) : (
          <>
            <div className="flex -space-x-1">
              {selectedUsers.slice(0, 2).map(u => (
                <Avatar key={u.id} src={u.avatar_url} fullName={u.full_name} size="sm" />
              ))}
            </div>
            <span className="text-sm text-slate-700">
              {selectedUsers.length === 0
                ? 'Unassigned'
                : selectedUsers.length === 1
                  ? selectedUsers[0].full_name
                  : `${selectedUsers.length} assigned`}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </>
        )}
      </button>

      {open && (
        <div
          className="fixed z-[100] w-72 rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50"
          style={(() => {
            if (!containerRef.current) return { top: 0, left: 0 };
            const rect = containerRef.current.getBoundingClientRect();
            const dropdownHeight = 380; // max-h-72 (288) + header (50) + footer (42)
            const spaceBelow = window.innerHeight - rect.bottom - 8;
            const spaceAbove = rect.top - 8;
            const flipUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
            return {
              top: flipUp ? Math.max(8, rect.top - dropdownHeight - 4) : rect.bottom + 4,
              left: Math.min(rect.left, window.innerWidth - 288 - 8),
              maxHeight: flipUp ? spaceAbove : spaceBelow,
            };
          })()}
          onClick={e => e.stopPropagation()}
        >
          <div className="border-b border-slate-100 p-2.5">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search team members..."
                className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto p-1.5" style={{ maxHeight: 'min(288px, calc(100vh - 200px))' }}>
            {departments.map(dept => {
              const deptUsers = filtered.filter(u => u.department === dept);
              if (deptUsers.length === 0) return null;
              return (
                <div key={dept}>
                  <div className="px-2.5 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {dept}
                  </div>
                  {deptUsers.map(user => {
                    const isSelected = effectiveIds.includes(user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(user.id);
                        }}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                          isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                        )}
                      >
                        <Avatar src={user.avatar_url} fullName={user.full_name} size="sm" />
                        <div className="flex flex-1 flex-col items-start min-w-0">
                          <span className="text-sm font-medium text-slate-900 truncate">{user.full_name}</span>
                          <span className="text-[10px] text-slate-400">{user.role}</span>
                        </div>
                        {multi && isSelected && (
                          <Check className="h-4 w-4 shrink-0 text-blue-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-slate-400">No matches found</p>
            )}
          </div>
          {multi && selectedUsers.length > 0 && (
            <div className="border-t border-slate-100 px-3 py-2">
              <div className="flex flex-wrap gap-1">
                {selectedUsers.map(u => (
                  <span key={u.id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                    {u.full_name.split(' ')[0]}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleSelect(u.id); }}
                      className="rounded-full p-0.5 hover:bg-blue-100"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
