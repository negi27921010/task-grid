'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@/components/ui/dialog';
import { Search, ArrowUp, ArrowDown, CornerDownLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import * as taskApi from '@/lib/api/tasks';
import * as projectApi from '@/lib/api/projects';
import { StatusBadge, PriorityDot } from '@/components/ui/badge';
import type { Task, Project } from '@/lib/types';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Map<string, Project>>(new Map());
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const found = await taskApi.searchAllTasks(query);
      setResults(found);
      setIsSearching(false);

      const projectIds = [...new Set(found.map((t) => t.project_id))];
      const projectMap = new Map<string, Project>();
      await Promise.all(
        projectIds.map(async (id) => {
          const p = await projectApi.getProjectById(id);
          if (p) projectMap.set(id, p);
        })
      );
      setProjects(projectMap);
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const grouped = useMemo(() => {
    const groups: Record<string, { name: string; tasks: Task[] }> = {};
    for (const task of results) {
      if (!groups[task.project_id]) {
        groups[task.project_id] = {
          name: projects.get(task.project_id)?.name ?? 'Unknown Project',
          tasks: [],
        };
      }
      groups[task.project_id].tasks.push(task);
    }
    return Object.entries(groups);
  }, [results, projects]);

  const flatResults = useMemo(() => results, [results]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    const selected = listRef.current.querySelector('[data-selected="true"]');
    selected?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const navigateToTask = useCallback(
    (task: Task) => {
      onOpenChange(false);
      router.push(`/project/${task.project_id}?task=${task.id}`);
    },
    [onOpenChange, router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < flatResults.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : flatResults.length - 1
        );
      } else if (e.key === 'Enter' && flatResults[selectedIndex]) {
        e.preventDefault();
        navigateToTask(flatResults[selectedIndex]);
      }
    },
    [flatResults, selectedIndex, navigateToTask]
  );

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [open, onOpenChange]);

  let flatIndex = -1;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        className="top-[20%] translate-y-0 max-w-xl p-0 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4">
          {isSearching ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-500" />
          ) : (
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search tasks..."
            className="h-12 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
            autoComplete="off"
          />
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto px-2 py-2">
          {query.trim() && !isSearching && flatResults.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-500">
              No tasks found for &ldquo;{query}&rdquo;
            </div>
          )}

          {!query.trim() && (
            <div className="py-8 text-center text-sm text-slate-400">
              Start typing to search tasks...
            </div>
          )}

          {grouped.map(([projectId, group]) => (
            <div key={projectId} className="mb-2">
              <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {group.name}
              </div>
              {group.tasks.map((task) => {
                flatIndex++;
                const isSelected = flatIndex === selectedIndex;
                const currentFlatIndex = flatIndex;

                return (
                  <button
                    key={task.id}
                    data-selected={isSelected}
                    onClick={() => navigateToTask(task)}
                    onMouseEnter={() => setSelectedIndex(currentFlatIndex)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                      isSelected ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <PriorityDot priority={task.priority} />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {task.title}
                    </span>
                    <StatusBadge status={task.status} className="shrink-0" />
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hints */}
        {flatResults.length > 0 && (
          <div className="flex items-center gap-4 border-t border-slate-200 px-4 py-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              <ArrowDown className="h-3 w-3" />
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" />
              open
            </span>
          </div>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
