'use client';

// Preview route for Phases 1 & 2 — Refined design system tokens,
// typography, theme toggle, and primitive components. Safe to delete once
// Phase 4 finishes the page-by-page reskin.

import { useState } from 'react';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useTheme } from '@/components/theme/theme-provider';
import {
  Avatar,
  AvatarStack,
  Kbd,
  ShortcutKbd,
  StatusPill,
  PriorityTag,
  TimelineBar,
  type StatusOption,
} from '@/components/design-system';
import {
  RefinedSidebar,
  RefinedPageHeader,
  RefinedToolbar,
  CommandPalette,
  BulkBar,
  type BulkAction,
} from '@/components/shell';
import {
  Trash2,
  Archive,
  UserPlus as UserPlusIcon,
  Calendar,
  Flag,
  CheckSquare,
  Kanban,
  PieChart,
} from 'lucide-react';

const SURFACE_TOKENS: Array<{ name: string; var: string }> = [
  { name: 'canvas', var: '--canvas' },
  { name: 'surface', var: '--surface' },
  { name: 'sidebar-bg', var: '--sidebar-bg' },
  { name: 'hover', var: '--hover' },
  { name: 'table-head', var: '--table-head-bg' },
  { name: 'border-color', var: '--border-color' },
];

const TEXT_TOKENS: Array<{ name: string; var: string }> = [
  { name: 'text', var: '--text' },
  { name: 'text-muted', var: '--text-muted' },
  { name: 'text-faint', var: '--text-faint' },
];

const ACCENT_TOKENS: Array<{ name: string; var: string }> = [
  { name: 'accent', var: '--accent' },
  { name: 'accent-soft', var: '--accent-soft' },
  { name: 'accent-hover', var: '--accent-hover' },
  { name: 'selected-bg', var: '--selected-bg' },
];

const STATUS_TOKENS: Array<{ name: string; var: string }> = [
  { name: 'backlog', var: '--status-backlog' },
  { name: 'working', var: '--status-working' },
  { name: 'review', var: '--status-review' },
  { name: 'done', var: '--status-done' },
  { name: 'stuck', var: '--status-stuck' },
];

const PRIORITY_TOKENS: Array<{ name: string; var: string }> = [
  { name: 'low', var: '--priority-low' },
  { name: 'medium', var: '--priority-medium' },
  { name: 'high', var: '--priority-high' },
  { name: 'critical', var: '--priority-critical' },
];

function TokenRow({ tokens, swatchKind = 'fill' }: {
  tokens: Array<{ name: string; var: string }>;
  swatchKind?: 'fill' | 'border';
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {tokens.map((t) => (
        <div
          key={t.var}
          className="flex items-center gap-3 rounded-lg border border-border-color bg-surface px-3 py-2.5"
        >
          <div
            className={
              swatchKind === 'border'
                ? 'h-9 w-9 rounded-md border border-border-color'
                : 'h-9 w-9 rounded-md border border-border-color/40'
            }
            style={{ background: `var(${t.var})` }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text">{t.name}</p>
            <p className="truncate font-mono text-[11px] text-text-faint">{t.var}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DesignPreviewPage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-canvas text-text" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-3xl font-semibold tracking-tight text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Refined Design System — Phase 1
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              Theme tokens, typography, and dark-mode toggle. Existing pages are untouched.
              Current mode: <span className="font-semibold text-text">{theme}</span>.
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Token sections */}
        <section className="mt-10 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-faint">
            Surfaces
          </h2>
          <TokenRow tokens={SURFACE_TOKENS} swatchKind="border" />
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-faint">
            Text
          </h2>
          <TokenRow tokens={TEXT_TOKENS} />
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-faint">
            Accent
          </h2>
          <TokenRow tokens={ACCENT_TOKENS} />
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-faint">
            Status colors (used by StatusPill in Phase 2)
          </h2>
          <TokenRow tokens={STATUS_TOKENS} />
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-faint">
            Priority colors (used by PriorityTag in Phase 2)
          </h2>
          <TokenRow tokens={PRIORITY_TOKENS} />
        </section>

        {/* Typography */}
        <section className="mt-10 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-faint">
            Typography
          </h2>
          <div className="space-y-3 rounded-xl border border-border-color bg-surface p-6">
            <p
              className="text-3xl font-semibold tracking-tight text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Display 32 / Figtree 600 — page titles
            </p>
            <p
              className="text-xl font-semibold text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Display 20 / Figtree 600 — section headers
            </p>
            <p className="text-sm text-text" style={{ fontFamily: 'var(--font-body)' }}>
              Body 14 / Inter 400 — default copy. The quick brown fox jumps over the lazy dog.
              Effort hours, status changes, and standup outcomes will use this style.
            </p>
            <p className="text-xs text-text-muted" style={{ fontFamily: 'var(--font-body)' }}>
              Caption 12 / Inter 400 muted — meta info like timestamps and badge subtext.
            </p>
          </div>
        </section>

        {/* Foundation OK card */}
        <section className="mt-10">
          <div className="rounded-xl border border-border-color bg-accent-soft p-6">
            <h3
              className="text-base font-semibold text-text"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              ✓ Phase 1 foundation ready
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Toggle the sun/moon icon (top right). Watch every surface, border, and text token
              swap live without a page reload. Your selection persists across sessions.
            </p>
            <p className="mt-3 text-xs text-text-faint">
              Existing pages (<code className="rounded bg-hover px-1 py-0.5 font-mono">/standups</code>,{' '}
              <code className="rounded bg-hover px-1 py-0.5 font-mono">/dashboard</code>,{' '}
              <code className="rounded bg-hover px-1 py-0.5 font-mono">/registry</code>,{' '}
              <code className="rounded bg-hover px-1 py-0.5 font-mono">/settings</code>) still
              render against their original Tabler theme — those migrate in Phase 4.
            </p>
          </div>
        </section>

        {/* ─── Phase 2: Primitives ───────────────────────────────────── */}
        <Phase2Section />
      </div>
    </div>
  );
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'backlog', label: 'Backlog', tone: 'gray' },
  { value: 'working', label: 'Working on it', tone: 'amber' },
  { value: 'review', label: 'In review', tone: 'indigo' },
  { value: 'done', label: 'Done', tone: 'green' },
  { value: 'stuck', label: 'Stuck', tone: 'red' },
];

const SAMPLE_USERS = [
  { id: 'sn', fullName: 'Shubham Negi' },
  { id: 'sa', fullName: 'Saksham Agarwal' },
  { id: 'as', fullName: 'Ayush Satyam' },
  { id: 'pk', fullName: 'Pramod Yadav' },
  { id: 'dk', fullName: 'Disha Rajendra Katkhede' },
  { id: 'ag', fullName: 'Ayush Gautam' },
];

function Phase2Section() {
  const [status, setStatus] = useState('working');
  const current = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0];

  // Build a 30-day axis ending today for TimelineBar demos.
  const today = new Date();
  const axisEnd = new Date(today);
  const axisStart = new Date(today);
  axisStart.setDate(axisStart.getDate() - 30);

  const sampleStart = new Date(today);
  sampleStart.setDate(sampleStart.getDate() - 18);
  const sampleEnd = new Date(today);
  sampleEnd.setDate(sampleEnd.getDate() - 4);

  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-faint">{title}</h3>
      <div className="rounded-xl border border-border-color bg-surface p-5">{children}</div>
    </div>
  );

  return (
    <section className="mt-12 space-y-6">
      <h2
        className="text-2xl font-semibold tracking-tight text-text"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        Phase 2 — Primitives
      </h2>

      <Group title="Avatar">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Avatar fullName="Shubham Negi" size="xs" />
            <Avatar fullName="Shubham Negi" size="sm" />
            <Avatar fullName="Shubham Negi" size="md" />
            <Avatar fullName="Shubham Negi" size="lg" />
            <Avatar fullName="Shubham Negi" size="xl" />
          </div>
          <span className="text-xs text-text-muted">xs · sm · md · lg · xl</span>
        </div>
        <div className="mt-5">
          <p className="mb-2 text-xs text-text-muted">AvatarStack (max 3, +N overflow)</p>
          <AvatarStack users={SAMPLE_USERS} size="md" max={3} />
        </div>
      </Group>

      <Group title="Kbd & ShortcutKbd (mac/windows aware)">
        <div className="flex flex-wrap items-center gap-6 text-sm text-text-muted">
          <span className="inline-flex items-center gap-2">
            <Kbd>K</Kbd>
            <span>raw key</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <ShortcutKbd shortcut="cmd+k" />
            <span>open command palette</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <ShortcutKbd shortcut="cmd+shift+enter" />
            <span>submit + close</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <ShortcutKbd shortcut="esc" />
            <span>dismiss</span>
          </span>
        </div>
        <p className="mt-3 text-[11px] text-text-faint">
          Open this page on a Mac vs Windows machine — the modifier glyphs swap automatically
          (⌘ ↔ Ctrl, ⌥ ↔ Alt, ⇧ ↔ Shift).
        </p>
      </Group>

      <Group title="StatusPill — 4 styles × tones">
        <div className="space-y-4">
          {(['solid', 'soft', 'outline', 'dot'] as const).map((style) => (
            <div key={style} className="flex flex-wrap items-center gap-2">
              <span className="w-16 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                {style}
              </span>
              {STATUS_OPTIONS.map((opt) => (
                <StatusPill
                  key={`${style}-${opt.value}`}
                  label={opt.label}
                  tone={opt.tone}
                  style={style}
                  size="sm"
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-border-color pt-5">
          <p className="mb-3 text-xs text-text-muted">
            Interactive — click the pill to change status (Radix dropdown):
          </p>
          <div className="flex items-center gap-3">
            <StatusPill
              label={current.label}
              tone={current.tone}
              style="soft"
              value={current.value}
              options={STATUS_OPTIONS}
              onChange={setStatus}
            />
            <span className="text-xs text-text-faint">
              current: <code className="rounded bg-hover px-1 py-0.5 font-mono">{status}</code>
            </span>
          </div>
        </div>
      </Group>

      <Group title="PriorityTag — bar / soft / solid">
        <div className="space-y-4">
          {([
            { label: 'Critical', tone: 'red', level: 4 },
            { label: 'High', tone: 'orange', level: 3 },
            { label: 'Medium', tone: 'amber', level: 2 },
            { label: 'Low', tone: 'gray', level: 1 },
          ] as const).map((p) => (
            <div key={p.label} className="flex items-center gap-6">
              <span className="w-20 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                {p.label}
              </span>
              <PriorityTag label={p.label} tone={p.tone} style="bar" level={p.level} />
              <PriorityTag label={p.label} tone={p.tone} style="soft" />
              <PriorityTag label={p.label} tone={p.tone} style="solid" />
            </div>
          ))}
        </div>
      </Group>

      <Group title="TimelineBar — proportional date range">
        <div className="space-y-4">
          {([
            { label: 'In progress', tone: 'blue' },
            { label: 'Done', tone: 'green' },
            { label: 'At risk', tone: 'amber' },
            { label: 'Blocked', tone: 'red' },
          ] as const).map((row) => (
            <div key={row.label} className="grid grid-cols-[120px_1fr] items-center gap-4">
              <span className="text-xs text-text-muted">{row.label}</span>
              <TimelineBar
                start={sampleStart}
                end={sampleEnd}
                axisStart={axisStart}
                axisEnd={axisEnd}
                tone={row.tone}
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-text-faint">
          Axis: last 30 days. Sample range: ~18 days ago → ~4 days ago.
        </p>
      </Group>

      <div className="rounded-xl border border-border-color bg-accent-soft p-6">
        <h3
          className="text-base font-semibold text-text"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          ✓ Phase 2 primitives ready
        </h3>
        <p className="mt-1 text-sm text-text-muted">
          All five primitives are TS-typed, themed via tokens, and live alongside the legacy
          components. Nothing in <code className="rounded bg-hover px-1 py-0.5 font-mono">/standups</code>,{' '}
          <code className="rounded bg-hover px-1 py-0.5 font-mono">/dashboard</code>, etc. has
          been touched. They migrate in Phase 4 when the new shell lands.
        </p>
      </div>

      {/* ─── Phase 3: Application shell preview ──────────────────── */}
      <Phase3Section />
    </section>
  );
}

const PAGE_TABS = [
  { id: 'main', label: 'Main table', icon: CheckSquare },
  { id: 'kanban', label: 'Kanban', icon: Kanban },
  { id: 'dashboard', label: 'Dashboard', icon: PieChart },
];

function Phase3Section() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('main');
  const [selectedCount, setSelectedCount] = useState(3);

  const bulkActions: BulkAction[] = [
    { id: 'assign', icon: UserPlusIcon, label: 'Assign', onClick: () => {} },
    { id: 'status', icon: Flag, label: 'Status', onClick: () => {} },
    { id: 'due', icon: Calendar, label: 'Due', onClick: () => {} },
    { id: 'archive', icon: Archive, label: 'Archive', onClick: () => {} },
    { id: 'delete', icon: Trash2, label: 'Delete', onClick: () => {}, destructive: true },
  ];

  return (
    <div className="mt-12 space-y-5">
      <div>
        <h2
          className="text-2xl font-semibold tracking-tight text-text"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Phase 3 — Application shell
        </h2>
        <p className="mt-1.5 text-sm text-text-muted">
          The new sidebar, page header, toolbar, command palette, and bulk-action bar.
          Existing application pages keep using the legacy <code className="rounded bg-hover px-1 py-0.5 font-mono">AppShell</code>{' '}
          — they migrate one by one in Phase 4.
        </p>
      </div>

      {/* Mini frame previewing the sidebar + header + toolbar together */}
      <div className="overflow-hidden rounded-xl border border-border-color shadow-sm">
        <div className="flex h-[520px] bg-canvas">
          {/* Live sidebar (uses real auth/projects/permissions hooks) */}
          <div className="hidden md:flex">
            <RefinedSidebar width={232} />
          </div>

          {/* Mocked page area */}
          <div className="flex min-w-0 flex-1 flex-col">
            <RefinedPageHeader
              title="Task Flow — Refined"
              subtitle="Preview · the chrome that will wrap every page in Phase 4"
              tabs={PAGE_TABS}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onSidekick={() => {}}
              onAutomate={() => {}}
              onInvite={() => {}}
            />
            <RefinedToolbar
              primaryLabel="New task"
              onPrimaryClick={() => {}}
              onSearchClick={() => setPaletteOpen(true)}
              onPersonFilter={() => {}}
              onFilter={() => {}}
              onSort={() => {}}
              onHide={() => {}}
              onGroup={() => {}}
              selectedCount={selectedCount}
              onClearSelection={() => setSelectedCount(0)}
            />
            <div className="flex-1 overflow-auto bg-canvas p-6">
              <div className="rounded-lg border border-border-color bg-surface p-5 text-sm text-text-muted">
                <p>
                  This is where the <strong className="text-text">{activeTab}</strong> view will
                  render in Phase 4. Click <strong className="text-text">Search</strong> in the
                  toolbar (or hit <ShortcutKbd shortcut="cmd+k" />) to open the command palette
                  — it&apos;s wired to your real tasks, projects, registry, and members data.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedCount((c) => (c === 0 ? 3 : 0))}
                  className="mt-4 rounded-md border border-border-color bg-surface px-3 py-1.5 text-[13px] font-medium text-text transition-colors hover:bg-hover"
                >
                  Toggle bulk-bar (currently {selectedCount} selected)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-text-faint">
        The sidebar above pulls from your live <code className="font-mono">useProjects</code>,{' '}
        <code className="font-mono">useCurrentUser</code>, and{' '}
        <code className="font-mono">isAdmin()</code> just like the production shell will — so you&apos;re
        seeing your real workspace + role, not mock data.
      </p>

      {/* Standalone command palette + bulk bar (live, not mocked) */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <BulkBar
        count={selectedCount}
        actions={bulkActions}
        onClear={() => setSelectedCount(0)}
      />

      <div className="rounded-xl border border-border-color bg-accent-soft p-6">
        <h3
          className="text-base font-semibold text-text"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          ✓ Phase 3 shell ready
        </h3>
        <p className="mt-1 text-sm text-text-muted">
          Six new shell components live in{' '}
          <code className="rounded bg-hover px-1 py-0.5 font-mono">src/components/shell/</code>.
          The legacy <code className="rounded bg-hover px-1 py-0.5 font-mono">AppShell</code>{' '}
          and its supporting <code className="rounded bg-hover px-1 py-0.5 font-mono">layout/*</code>{' '}
          components are completely untouched — pages still render through them. Phase 4
          flips pages over one at a time so we can verify each surface independently.
        </p>
      </div>
    </div>
  );
}
