'use client';

import { Suspense, useState, useMemo, useCallback } from 'react';
import {
  BookOpen, Search, X, Plus, ExternalLink, FileText, User,
  ChevronRight, Pencil, Trash2, Shield, Zap, Cog,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import * as Dialog from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useUsers } from '@/lib/hooks/use-users';
import { useViewMode } from '@/lib/hooks/use-view-mode';
import { isAdmin } from '@/lib/utils/permissions';
import { useRegistries, useCreateRegistry, useUpdateRegistry, useDeleteRegistry } from '@/lib/hooks/use-registry';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow } from 'date-fns';
import type {
  WorkstreamRegistry, CreateRegistryInput, RegistryCategory,
  RegistryPriorityTag, RegistryStatus,
} from '@/lib/types';

const CATEGORIES: RegistryCategory[] = ['Finance', 'Ops', 'Hiring', 'Product', 'Tech', 'Business'];
const PRIORITY_TAGS: RegistryPriorityTag[] = ['Core', 'Strategic', 'Support'];
const STATUSES: RegistryStatus[] = ['Active', 'On Hold', 'Completed', 'Deprecated'];

const STATUS_COLORS: Record<RegistryStatus, string> = {
  Active: 'bg-green-100 text-green-700',
  'On Hold': 'bg-amber-100 text-amber-700',
  Completed: 'bg-blue-100 text-blue-700',
  Deprecated: 'bg-slate-100 text-slate-500',
};

const PRIORITY_ICONS: Record<RegistryPriorityTag, typeof Shield> = {
  Core: Shield,
  Strategic: Zap,
  Support: Cog,
};

const PRIORITY_COLORS: Record<RegistryPriorityTag, string> = {
  Core: 'text-red-600',
  Strategic: 'text-blue-600',
  Support: 'text-slate-500',
};

/* ---- Create/Edit Form ---- */

function RegistryForm({
  entry,
  onSave,
  onCancel,
  isPending,
}: {
  entry?: WorkstreamRegistry;
  onSave: (data: CreateRegistryInput) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { data: users } = useUsers();
  const [name, setName] = useState(entry?.name ?? '');
  const [description, setDescription] = useState(entry?.description ?? '');
  const [category, setCategory] = useState<RegistryCategory>(entry?.category ?? 'Ops');
  const [priorityTag, setPriorityTag] = useState<RegistryPriorityTag>(entry?.priority_tag ?? 'Core');
  const [status, setStatus] = useState<RegistryStatus>(entry?.status ?? 'Active');
  const [primaryOwnerId, setPrimaryOwnerId] = useState(entry?.primary_owner_id ?? '');
  const [secondaryOwnerId, setSecondaryOwnerId] = useState(entry?.secondary_owner_id ?? '');
  const [team, setTeam] = useState(entry?.team ?? '');
  const [sopLinks, setSopLinks] = useState(entry?.sop_links?.join('\n') ?? '');
  const [importantLinks, setImportantLinks] = useState(entry?.important_links?.join('\n') ?? '');
  const [dependencies, setDependencies] = useState(entry?.dependencies ?? '');
  const [notes, setNotes] = useState(entry?.notes ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !primaryOwnerId) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      priority_tag: priorityTag,
      status,
      primary_owner_id: primaryOwnerId,
      secondary_owner_id: secondaryOwnerId || null,
      team: team.trim(),
      sop_links: sopLinks.split('\n').map(s => s.trim()).filter(Boolean),
      important_links: importantLinks.split('\n').map(s => s.trim()).filter(Boolean),
      dependencies: dependencies.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Workstream Name *</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required maxLength={200}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#066fd1] focus:outline-none focus:ring-2 focus:ring-[#066fd1]/20" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={500}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm resize-none focus:border-[#066fd1] focus:outline-none focus:ring-2 focus:ring-[#066fd1]/20" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value as RegistryCategory)}
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm focus:border-[#066fd1] focus:outline-none">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
          <select value={priorityTag} onChange={e => setPriorityTag(e.target.value as RegistryPriorityTag)}
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm focus:border-[#066fd1] focus:outline-none">
            {PRIORITY_TAGS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as RegistryStatus)}
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm focus:border-[#066fd1] focus:outline-none">
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Primary Owner (SPOC) *</label>
          <select value={primaryOwnerId} onChange={e => setPrimaryOwnerId(e.target.value)} required
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm focus:border-[#066fd1] focus:outline-none">
            <option value="">Select owner</option>
            {(users ?? []).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Secondary Owner</label>
          <select value={secondaryOwnerId} onChange={e => setSecondaryOwnerId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm focus:border-[#066fd1] focus:outline-none">
            <option value="">None</option>
            {(users ?? []).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Team / Function</label>
        <input type="text" value={team} onChange={e => setTeam(e.target.value)} maxLength={100}
          placeholder="e.g. Finance, Product & Analytics"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#066fd1] focus:outline-none focus:ring-2 focus:ring-[#066fd1]/20" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">SOP Links (one per line)</label>
        <textarea value={sopLinks} onChange={e => setSopLinks(e.target.value)} rows={2}
          placeholder="https://docs.google.com/..." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm resize-none focus:border-[#066fd1] focus:outline-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Important Links (one per line)</label>
        <textarea value={importantLinks} onChange={e => setImportantLinks(e.target.value)} rows={2}
          placeholder="Dashboards, sheets, trackers..." className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm resize-none focus:border-[#066fd1] focus:outline-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Dependencies</label>
        <input type="text" value={dependencies} onChange={e => setDependencies(e.target.value)} maxLength={300}
          placeholder="Other teams or projects this depends on"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-[#066fd1] focus:outline-none" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Notes / Context</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} maxLength={500}
          placeholder="High-signal info only" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm resize-none focus:border-[#066fd1] focus:outline-none" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" size="sm" disabled={isPending || !name.trim() || !primaryOwnerId}>
          {entry ? 'Save Changes' : 'Add Workstream'}
        </Button>
      </div>
    </form>
  );
}

/* ---- Detail Panel ---- */

function DetailPanel({
  entry,
  onClose,
  onEdit,
}: {
  entry: WorkstreamRegistry;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { data: users } = useUsers();
  const { currentUser } = useCurrentUser();
  const userIsAdmin = isAdmin(currentUser);
  const owner = (users ?? []).find(u => u.id === entry.primary_owner_id);
  const secondaryOwner = entry.secondary_owner_id ? (users ?? []).find(u => u.id === entry.secondary_owner_id) : null;
  const PriorityIcon = PRIORITY_ICONS[entry.priority_tag];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl border-l border-[#e5e7eb] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-[#e5e7eb] px-6 py-4 flex items-center justify-between z-10">
        <h2 className="text-base font-semibold text-[#1f2937] truncate pr-4">{entry.name}</h2>
        <div className="flex items-center gap-2">
          {userIsAdmin && (
            <button onClick={onEdit} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* Status + Priority + Category */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', STATUS_COLORS[entry.status])}>{entry.status}</span>
          <span className="inline-flex items-center gap-1 text-xs font-medium">
            <PriorityIcon className={cn('h-3.5 w-3.5', PRIORITY_COLORS[entry.priority_tag])} />
            <span className={PRIORITY_COLORS[entry.priority_tag]}>{entry.priority_tag}</span>
          </span>
          <span className="rounded-md bg-[#f3f4f6] px-2 py-0.5 text-xs font-medium text-[#4b5563]">{entry.category}</span>
        </div>

        {/* Description */}
        {entry.description && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-1">Description</p>
            <p className="text-sm text-[#374151] whitespace-pre-wrap">{entry.description}</p>
          </div>
        )}

        {/* Ownership */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-2">Ownership</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Avatar fullName={owner?.full_name ?? '?'} src={owner?.avatar_url ?? null} size="sm" />
              <div>
                <p className="text-sm font-medium text-[#1f2937]">{owner?.full_name ?? 'Unknown'}</p>
                <p className="text-[10px] text-[#6b7280]">Primary Owner (SPOC)</p>
              </div>
            </div>
            {secondaryOwner && (
              <div className="flex items-center gap-3">
                <Avatar fullName={secondaryOwner.full_name} src={secondaryOwner.avatar_url} size="sm" />
                <div>
                  <p className="text-sm font-medium text-[#1f2937]">{secondaryOwner.full_name}</p>
                  <p className="text-[10px] text-[#6b7280]">Secondary Owner</p>
                </div>
              </div>
            )}
            {entry.team && <p className="text-xs text-[#6b7280]">Team: {entry.team}</p>}
          </div>
        </div>

        {/* SOP Links */}
        {entry.sop_links.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-2">SOP / Documentation</p>
            <div className="space-y-1.5">
              {entry.sop_links.map((link, i) => (
                <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md border border-[#e5e7eb] px-3 py-2 text-xs text-[#066fd1] hover:bg-[#f9fafb] transition-colors">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{link}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 ml-auto" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Important Links */}
        {entry.important_links.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-2">Important Links</p>
            <div className="space-y-1.5">
              {entry.important_links.map((link, i) => (
                <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md border border-[#e5e7eb] px-3 py-2 text-xs text-[#066fd1] hover:bg-[#f9fafb] transition-colors">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{link}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Dependencies */}
        {entry.dependencies && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-1">Dependencies</p>
            <p className="text-sm text-[#374151]">{entry.dependencies}</p>
          </div>
        )}

        {/* Notes */}
        {entry.notes && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6b7280] mb-1">Notes / Context</p>
            <p className="text-sm text-[#374151] whitespace-pre-wrap">{entry.notes}</p>
          </div>
        )}

        {/* Meta */}
        <div className="border-t border-[#e5e7eb] pt-4 text-xs text-[#9ca3af]">
          <p>Updated {formatDistanceToNow(new Date(entry.updated_at), { addSuffix: true })}</p>
        </div>
      </div>
    </div>
  );
}

/* ---- Main Page ---- */

function RegistryContent() {
  const { currentUser, isLoading: userLoading } = useCurrentUser();
  const { viewMode, setViewMode } = useViewMode();
  const { data: registries, isLoading } = useRegistries();
  const { data: users } = useUsers();
  const createRegistry = useCreateRegistry();
  const updateRegistry = useUpdateRegistry();
  const deleteRegistry = useDeleteRegistry();
  const { toast } = useToast();

  const userIsAdmin = !userLoading && isAdmin(currentUser);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<WorkstreamRegistry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<WorkstreamRegistry | null>(null);

  const filtered = useMemo(() => {
    let items = registries ?? [];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.team.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'all') items = items.filter(r => r.category === categoryFilter);
    if (statusFilter !== 'all') items = items.filter(r => r.status === statusFilter);
    if (ownerFilter !== 'all') items = items.filter(r => r.primary_owner_id === ownerFilter);
    return items;
  }, [registries, search, categoryFilter, statusFilter, ownerFilter]);

  const selectedEntry = (registries ?? []).find(r => r.id === selectedId) ?? null;

  const handleCreate = (data: CreateRegistryInput) => {
    createRegistry.mutate(data, { onSuccess: () => setAddOpen(false) });
  };

  const handleUpdate = (data: CreateRegistryInput) => {
    if (!editEntry) return;
    updateRegistry.mutate({ id: editEntry.id, input: data }, { onSuccess: () => setEditEntry(null) });
  };

  const handleDelete = () => {
    if (!deleteEntry) return;
    deleteRegistry.mutate(deleteEntry.id, { onSuccess: () => { setDeleteEntry(null); setSelectedId(null); } });
  };

  return (
    <AppShell viewMode={viewMode} onViewModeChange={setViewMode}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-[#066fd1]" />
            <div>
              <h1 className="text-xl font-semibold text-[#1f2937]">Function Ownership / Workstream Repo</h1>
              <p className="text-xs text-[#6b7280]">Who owns what, SOPs, knowledge base — your operating system for critical workstreams</p>
            </div>
          </div>
          {userIsAdmin && (
            <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add Workstream
            </Button>
          )}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 flex-1 min-w-[200px] max-w-sm">
            <Search className="h-3.5 w-3.5 text-[#9ca3af]" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search workstreams..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9ca3af]" />
            {search && <button onClick={() => setSearch('')} className="text-[#9ca3af] hover:text-[#4b5563]"><X className="h-3 w-3" /></button>}
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-sm text-[#4b5563] focus:border-[#066fd1] focus:outline-none">
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-sm text-[#4b5563] focus:border-[#066fd1] focus:outline-none">
            <option value="all">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}
            className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-sm text-[#4b5563] focus:border-[#066fd1] focus:outline-none">
            <option value="all">All Owners</option>
            {(users ?? []).map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
          {(search || categoryFilter !== 'all' || statusFilter !== 'all' || ownerFilter !== 'all') && (
            <span className="text-xs text-[#6b7280]">{filtered.length} of {(registries ?? []).length}</span>
          )}
        </div>

        {/* Table */}
        <div className="card-tabler overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#066fd1] border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-[#d1d5db]" />
              <p className="mt-2 text-sm text-[#6b7280]">{(registries ?? []).length === 0 ? 'No workstreams yet' : 'No matches found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e5e7eb] bg-[#f9fafb]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Workstream</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Owner</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Category</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Priority</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Status</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">SOP</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-[#6b7280]">Links</th>
                    <th className="w-10 px-2 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const owner = (users ?? []).find(u => u.id === r.primary_owner_id);
                    const PIcon = PRIORITY_ICONS[r.priority_tag];
                    return (
                      <tr key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        className="border-b border-[#f3f4f6] cursor-pointer transition-colors hover:bg-[#f9fafb]">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-[#1f2937] truncate max-w-[280px]">{r.name}</p>
                          {r.description && <p className="text-xs text-[#6b7280] truncate max-w-[280px]">{r.description.split('\n')[0]}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar fullName={owner?.full_name ?? '?'} src={owner?.avatar_url ?? null} size="sm" />
                            <span className="text-sm text-[#374151]">{owner?.full_name ?? 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-[#f3f4f6] px-2 py-0.5 text-xs font-medium text-[#4b5563]">{r.category}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-medium">
                            <PIcon className={cn('h-3.5 w-3.5', PRIORITY_COLORS[r.priority_tag])} />
                            <span className={PRIORITY_COLORS[r.priority_tag]}>{r.priority_tag}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS_COLORS[r.status])}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.sop_links.length > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-xs text-[#066fd1]">
                              <FileText className="h-3.5 w-3.5" />{r.sop_links.length}
                            </span>
                          ) : <span className="text-xs text-[#d1d5db]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.important_links.length > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-xs text-[#066fd1]">
                              <ExternalLink className="h-3.5 w-3.5" />{r.important_links.length}
                            </span>
                          ) : <span className="text-xs text-[#d1d5db]">—</span>}
                        </td>
                        <td className="px-2 py-3">
                          <ChevronRight className="h-4 w-4 text-[#d1d5db]" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedEntry && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedId(null)} />
          <DetailPanel
            entry={selectedEntry}
            onClose={() => setSelectedId(null)}
            onEdit={() => { setEditEntry(selectedEntry); setSelectedId(null); }}
          />
        </>
      )}

      {/* Add Dialog */}
      <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
        <Dialog.Content className="max-w-lg">
          <Dialog.Title>Add Workstream</Dialog.Title>
          <Dialog.Description>Add a critical workstream to the registry. Admin only.</Dialog.Description>
          <div className="mt-4">
            <RegistryForm onSave={handleCreate} onCancel={() => setAddOpen(false)} isPending={createRegistry.isPending} />
          </div>
        </Dialog.Content>
      </Dialog.Root>

      {/* Edit Dialog */}
      <Dialog.Root open={!!editEntry} onOpenChange={v => { if (!v) setEditEntry(null); }}>
        <Dialog.Content className="max-w-lg">
          <Dialog.Title>Edit Workstream</Dialog.Title>
          <Dialog.Description>Update workstream details.</Dialog.Description>
          <div className="mt-4">
            {editEntry && (
              <RegistryForm entry={editEntry} onSave={handleUpdate} onCancel={() => setEditEntry(null)} isPending={updateRegistry.isPending} />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Root>

      {/* Delete Dialog */}
      <Dialog.Root open={!!deleteEntry} onOpenChange={v => { if (!v) setDeleteEntry(null); }}>
        <Dialog.Content className="max-w-sm">
          <Dialog.Title>Remove Workstream</Dialog.Title>
          <Dialog.Description>
            Are you sure you want to remove <strong>{deleteEntry?.name}</strong>? This cannot be undone.
          </Dialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDeleteEntry(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleteRegistry.isPending}>
              {deleteRegistry.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </AppShell>
  );
}

export default function RegistryPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[#066fd1] border-t-transparent" /></div>}>
      <RegistryContent />
    </Suspense>
  );
}
