'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Search,
  CheckSquare,
  FolderKanban,
  BookOpen,
  User as UserIcon,
  ClipboardCheck,
  ChevronRight,
  X,
} from 'lucide-react';
import { useSearch } from '@/lib/hooks/use-search';
import { useProjects } from '@/lib/hooks/use-projects';
import { useUsers } from '@/lib/hooks/use-users';
import { useRegistries } from '@/lib/hooks/use-registry';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { isAdmin } from '@/lib/utils/permissions';
import { Avatar } from '@/components/design-system/avatar';
import { Kbd } from '@/components/design-system/kbd';
import { cn } from '@/lib/utils/cn';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ResultKind = 'task' | 'project' | 'registry' | 'member' | 'standup' | 'navigation';

interface PaletteResult {
  id: string;
  kind: ResultKind;
  label: string;
  sublabel?: string;
  href: string;
  // Optional avatar (members) — wins over icon if set.
  avatar?: { fullName: string; src?: string | null };
}

interface NavCommand {
  id: string;
  label: string;
  href: string;
  shortcut?: string;
  adminOnly?: boolean;
}

const NAV_COMMANDS: NavCommand[] = [
  { id: 'nav-dashboard', label: 'Go to Dashboard', href: '/dashboard' },
  { id: 'nav-tasks', label: 'Go to Tasks', href: '/' },
  { id: 'nav-standups', label: 'Go to Daily Standup', href: '/standups' },
  { id: 'nav-registry', label: 'Go to Registry', href: '/registry' },
  { id: 'nav-settings', label: 'Open Settings', href: '/settings', adminOnly: true },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const { currentUser } = useCurrentUser();
  const userIsAdmin = isAdmin(currentUser);

  // Existing tasks-only debounced search hook (server-side).
  const search = useSearch();

  // Cache other collections client-side (already in React Query cache from
  // the rest of the app). They're filtered locally.
  const { data: projects = [] } = useProjects();
  const { data: users = [] } = useUsers();
  const { data: registries = [] } = useRegistries();

  // Mirror the typed query into the server-side task search, debounced
  // inside that hook.
  useEffect(() => {
    search.setQuery(query);
  }, [query, search]);

  // Reset state every time the palette opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo<PaletteResult[]>(() => {
    const q = query.trim().toLowerCase();
    const out: PaletteResult[] = [];

    // 1. Navigation actions — always shown when query is empty, filtered when
    // query exists.
    const navMatches = NAV_COMMANDS
      .filter((n) => !n.adminOnly || userIsAdmin)
      .filter((n) => !q || n.label.toLowerCase().includes(q))
      .slice(0, 5)
      .map<PaletteResult>((n) => ({
        id: n.id,
        kind: 'navigation',
        label: n.label,
        href: n.href,
      }));
    out.push(...navMatches);

    if (!q) return out.slice(0, 8);

    // 2. Tasks (server-side via useSearch — already debounced).
    // Join project_name from the projects cache for the sublabel.
    const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
    const taskMatches = (search.results ?? []).slice(0, 6).map<PaletteResult>((t) => ({
      id: `task-${t.id}`,
      kind: 'task',
      label: t.title,
      sublabel: projectNameById.get(t.project_id),
      href: t.project_id ? `/project/${t.project_id}?task=${t.id}` : '/',
    }));
    out.push(...taskMatches);

    // 3. Projects
    const projectMatches = projects
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map<PaletteResult>((p) => ({
        id: `project-${p.id}`,
        kind: 'project',
        label: p.name,
        sublabel: 'Project',
        href: `/project/${p.id}`,
      }));
    out.push(...projectMatches);

    // 4. Registry items
    const registryMatches = registries
      .filter((r) => r.name.toLowerCase().includes(q))
      .slice(0, 5)
      .map<PaletteResult>((r) => ({
        id: `registry-${r.id}`,
        kind: 'registry',
        label: r.name,
        sublabel: r.category,
        href: `/registry?id=${r.id}`,
      }));
    out.push(...registryMatches);

    // 5. Members — admin-only navigation since /settings has the user list,
    // but shown to everyone for "find a colleague".
    const memberMatches = users
      .filter((u) =>
        u.full_name.toLowerCase().includes(q) ||
        (u.department ?? '').toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map<PaletteResult>((u) => ({
        id: `member-${u.id}`,
        kind: 'member',
        label: u.full_name,
        sublabel: u.department || u.email,
        href: userIsAdmin ? `/settings?user=${u.id}` : `/standups?user=${u.id}`,
        avatar: { fullName: u.full_name, src: u.avatar_url },
      }));
    out.push(...memberMatches);

    return out;
  }, [query, search.results, projects, registries, users, userIsAdmin]);

  // Keep highlight in range when results change.
  useEffect(() => {
    if (highlight >= results.length) setHighlight(Math.max(0, results.length - 1));
  }, [results.length, highlight]);

  const select = (result: PaletteResult) => {
    onOpenChange(false);
    router.push(result.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(results.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[highlight];
      if (r) select(r);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[14vh] z-50 w-[560px] max-w-[92vw] -translate-x-1/2 overflow-hidden rounded-xl border border-border-color bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.25)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>

          {/* Input */}
          <div className="flex items-center gap-2.5 border-b border-border-color px-4 py-3.5">
            <Search className="h-4 w-4 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
              onKeyDown={onKeyDown}
              placeholder="Search tasks, jump to a view, find a colleague…"
              className="flex-1 bg-transparent text-[14.5px] text-text outline-none placeholder:text-text-faint"
            />
            <Kbd>esc</Kbd>
          </div>

          {/* Results */}
          <div className="max-h-[420px] overflow-y-auto p-1.5">
            {results.length === 0 && query && !search.isSearching && (
              <div className="px-4 py-8 text-center text-[13px] text-text-muted">
                No results for &ldquo;{query}&rdquo;
              </div>
            )}
            {results.length === 0 && !query && (
              <div className="px-4 py-8 text-center text-[13px] text-text-muted">
                Type to search across tasks, projects, members, registry…
              </div>
            )}

            <ResultGroup
              kind="navigation"
              title="Actions"
              results={results}
              highlight={highlight}
              setHighlight={setHighlight}
              onSelect={select}
            />
            <ResultGroup
              kind="task"
              title="Tasks"
              results={results}
              highlight={highlight}
              setHighlight={setHighlight}
              onSelect={select}
            />
            <ResultGroup
              kind="project"
              title="Projects"
              results={results}
              highlight={highlight}
              setHighlight={setHighlight}
              onSelect={select}
            />
            <ResultGroup
              kind="registry"
              title="Registry"
              results={results}
              highlight={highlight}
              setHighlight={setHighlight}
              onSelect={select}
            />
            <ResultGroup
              kind="member"
              title="Members"
              results={results}
              highlight={highlight}
              setHighlight={setHighlight}
              onSelect={select}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3.5 border-t border-border-color px-4 py-2.5 text-[11.5px] text-text-muted">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↵</Kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>esc</Kbd>
              <span>close</span>
            </span>
          </div>

          <Dialog.Close
            className="absolute right-3 top-3 rounded p-1 text-text-faint transition-colors hover:bg-hover hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const KIND_ICON: Record<ResultKind, React.ComponentType<{ className?: string }>> = {
  task: CheckSquare,
  project: FolderKanban,
  registry: BookOpen,
  member: UserIcon,
  standup: ClipboardCheck,
  navigation: ChevronRight,
};

function ResultGroup({
  kind, title, results, highlight, setHighlight, onSelect,
}: {
  kind: ResultKind;
  title: string;
  results: PaletteResult[];
  highlight: number;
  setHighlight: (n: number) => void;
  onSelect: (r: PaletteResult) => void;
}) {
  const items = results.filter((r) => r.kind === kind);
  if (items.length === 0) return null;

  return (
    <>
      <p className="px-3 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-wider text-text-faint">
        {title}
      </p>
      {items.map((r) => {
        const flatIndex = results.indexOf(r);
        const active = flatIndex === highlight;
        const IconComponent = KIND_ICON[r.kind];
        return (
          <button
            key={r.id}
            type="button"
            onMouseEnter={() => setHighlight(flatIndex)}
            onClick={() => onSelect(r)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13.5px] text-text transition-colors',
              active ? 'bg-hover' : 'bg-transparent',
            )}
          >
            {r.avatar ? (
              <Avatar fullName={r.avatar.fullName} src={r.avatar.src} size="xs" />
            ) : (
              <IconComponent className="h-3.5 w-3.5 shrink-0 text-text-muted" />
            )}
            <span className="flex-1 truncate">{r.label}</span>
            {r.sublabel && (
              <span className="ml-2 truncate text-[11.5px] text-text-faint">{r.sublabel}</span>
            )}
          </button>
        );
      })}
    </>
  );
}
