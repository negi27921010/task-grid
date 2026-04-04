'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Download, AlertTriangle, Check, X, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as Dialog from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useUsers } from '@/lib/hooks/use-users';
import { useProjects } from '@/lib/hooks/use-projects';
import { useCreateTask } from '@/lib/hooks/use-tasks';
import { cn } from '@/lib/utils/cn';
import type { Priority, TaskStatus } from '@/lib/types';

interface ParsedRow {
  title: string;
  description: string;
  project: string;
  priority: string;
  status: string;
  owner: string;
  eta: string;
  tags: string;
  errors: string[];
  resolvedProjectId?: string;
  resolvedOwnerId?: string;
  resolvedPriority?: Priority;
  resolvedStatus?: TaskStatus;
}

const SAMPLE_CSV = `title,description,project,priority,status,owner,eta,tags
"Set up Returns for K8","Establish complete returns workflow and tracking",K8,P2,not_started,Yash,2026-04-15,"returns,k8"
"CN Automation to DB","Build script to auto-fetch CN emails and store in DB",K8,P2,not_started,Yash,,automation
"Test Prep Dashboard","Build dashboard for Test Prep performance tracking",Test Prep,P2,not_started,Yash,2026-04-30,dashboard
"P&L Follow-up March","Ensure closure and reconciliation of March P&L",Business,P1,not_started,Yash,2026-04-10,"finance,p&l"`;

const VALID_PRIORITIES = ['P1', 'P2', 'P3', 'P4'];
const VALID_STATUSES = ['not_started', 'in_progress', 'blocked', 'completed', 'cancelled'];

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(current.trim());
      if (row.some(c => c)) rows.push(row);
      row = [];
      current = '';
    } else {
      current += ch;
    }
  }
  row.push(current.trim());
  if (row.some(c => c)) rows.push(row);
  return rows;
}

export function BulkUploadDialog({
  open,
  onOpenChange,
  defaultProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}) {
  const { currentUser } = useCurrentUser();
  const { data: users } = useUsers();
  const { data: projects } = useProjects();
  const createTask = useCreateTask();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'taskflow_sample_import.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validateAndResolve = useCallback((rows: string[][], headers: string[]): ParsedRow[] => {
    const projectList = projects ?? [];
    const userList = users ?? [];

    const titleIdx = headers.indexOf('title');
    const descIdx = headers.indexOf('description');
    const projIdx = headers.indexOf('project');
    const prioIdx = headers.indexOf('priority');
    const statusIdx = headers.indexOf('status');
    const ownerIdx = headers.indexOf('owner');
    const etaIdx = headers.indexOf('eta');
    const tagsIdx = headers.indexOf('tags');

    return rows.map((cols) => {
      const errors: string[] = [];
      const title = cols[titleIdx] ?? '';
      const description = cols[descIdx] ?? '';
      const project = cols[projIdx] ?? '';
      const priority = (cols[prioIdx] ?? 'P3').toUpperCase();
      const status = cols[statusIdx] ?? 'not_started';
      const owner = cols[ownerIdx] ?? '';
      const eta = cols[etaIdx] ?? '';
      const tags = cols[tagsIdx] ?? '';

      // Validate title
      if (!title) errors.push('Title is required');

      // Resolve project
      let resolvedProjectId = defaultProjectId;
      if (project) {
        const match = projectList.find(p =>
          p.name.toLowerCase() === project.toLowerCase()
        );
        if (match) {
          resolvedProjectId = match.id;
        } else {
          errors.push(`Project "${project}" not found`);
        }
      }
      if (!resolvedProjectId) errors.push('No project specified');

      // Validate priority
      const resolvedPriority = VALID_PRIORITIES.includes(priority) ? priority as Priority : undefined;
      if (priority && !resolvedPriority) errors.push(`Invalid priority "${priority}"`);

      // Validate status
      const resolvedStatus = VALID_STATUSES.includes(status) ? status as TaskStatus : undefined;
      if (status && !resolvedStatus) errors.push(`Invalid status "${status}"`);

      // Resolve owner
      let resolvedOwnerId = currentUser.id;
      if (owner) {
        const match = userList.find(u =>
          u.full_name.toLowerCase() === owner.toLowerCase() ||
          u.email.toLowerCase() === owner.toLowerCase()
        );
        if (match) {
          resolvedOwnerId = match.id;
        } else {
          errors.push(`Owner "${owner}" not found`);
        }
      }

      // Validate ETA
      if (eta && isNaN(Date.parse(eta))) {
        errors.push(`Invalid date "${eta}"`);
      }

      return {
        title, description, project, priority, status, owner, eta, tags,
        errors,
        resolvedProjectId,
        resolvedOwnerId,
        resolvedPriority: resolvedPriority ?? 'P3',
        resolvedStatus: resolvedStatus ?? 'not_started',
      };
    });
  }, [projects, users, currentUser.id, defaultProjectId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const allRows = parseCSV(text);
      if (allRows.length < 2) {
        toast('CSV must have a header row and at least one data row', 'error');
        return;
      }

      const headers = allRows[0].map(h => h.toLowerCase().trim());
      if (!headers.includes('title')) {
        toast('CSV must have a "title" column', 'error');
        return;
      }

      const dataRows = allRows.slice(1);
      const parsed = validateAndResolve(dataRows, headers);
      setParsedRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  const validRows = parsedRows.filter(r => r.errors.length === 0);
  const errorRows = parsedRows.filter(r => r.errors.length > 0);

  const [failedImports, setFailedImports] = useState<{ title: string; error: string }[]>([]);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    let count = 0;
    const failures: { title: string; error: string }[] = [];

    for (const row of validRows) {
      try {
        await new Promise<void>((resolve, reject) => {
          createTask.mutate(
            {
              project_id: row.resolvedProjectId!,
              title: row.title,
              description: row.description || undefined,
              priority: row.resolvedPriority,
              status: row.resolvedStatus,
              owner_id: row.resolvedOwnerId!,
              eta: row.eta || null,
              tags: row.tags ? row.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
            },
            {
              onSuccess: () => { count++; setImportedCount(count); resolve(); },
              onError: (err) => reject(err),
            },
          );
        });
      } catch (err) {
        failures.push({ title: row.title, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    setImportedCount(count);
    setFailedImports(failures);
    setImporting(false);
    setStep('done');
    if (failures.length > 0) {
      toast(`${count} imported, ${failures.length} failed`, 'warning');
    } else {
      toast(`${count} task${count !== 1 ? 's' : ''} imported successfully`, 'success');
    }
  };

  const handleReset = () => {
    setParsedRows([]);
    setStep('upload');
    setImportedCount(0);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <Dialog.Content className="max-w-2xl">
        <Dialog.Title>
          <FileSpreadsheet className="inline h-5 w-5 mr-2 text-blue-600" />
          Bulk Import Tasks
        </Dialog.Title>
        <Dialog.Description>
          Upload a CSV file to create multiple tasks at once.
        </Dialog.Description>

        <div className="mt-4">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Sample download */}
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center">
                <Upload className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-700 mb-1">Upload your CSV file</p>
                <p className="text-xs text-slate-500 mb-4">
                  Required column: <strong>title</strong>. Optional: description, project, priority (P1-P4), status, owner, eta (YYYY-MM-DD), tags
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Choose File
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadSample}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download Sample CSV
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* CSV format guide */}
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">CSV Column Reference</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <div><strong className="text-slate-700">title</strong> <span className="text-red-500">*</span> — Task name</div>
                  <div><strong className="text-slate-700">description</strong> — Details</div>
                  <div><strong className="text-slate-700">project</strong> — Project name (exact match)</div>
                  <div><strong className="text-slate-700">priority</strong> — P1, P2, P3, P4 (default: P3)</div>
                  <div><strong className="text-slate-700">status</strong> — not_started (default)</div>
                  <div><strong className="text-slate-700">owner</strong> — Full name or email</div>
                  <div><strong className="text-slate-700">eta</strong> — YYYY-MM-DD</div>
                  <div><strong className="text-slate-700">tags</strong> — Comma-separated</div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-3">
                <Badge variant="success">{validRows.length} valid</Badge>
                {errorRows.length > 0 && (
                  <Badge variant="error">{errorRows.length} with errors</Badge>
                )}
                <span className="text-xs text-slate-500">{parsedRows.length} rows total</span>
              </div>

              {/* Preview table */}
              <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-3 py-2 text-left font-semibold text-slate-500 w-8">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Title</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Project</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Priority</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">Owner</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500">ETA</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-500 w-8">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => {
                      const hasError = row.errors.length > 0;
                      return (
                        <tr key={idx} className={cn('border-b border-slate-100', hasError && 'bg-red-50/50')}>
                          <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2 text-slate-800 max-w-[200px] truncate">{row.title || '—'}</td>
                          <td className="px-3 py-2 text-slate-600">{row.project || '—'}</td>
                          <td className="px-3 py-2 text-slate-600">{row.priority || 'P3'}</td>
                          <td className="px-3 py-2 text-slate-600 truncate max-w-[100px]">{row.owner || 'You'}</td>
                          <td className="px-3 py-2 text-slate-600">{row.eta || '—'}</td>
                          <td className="px-3 py-2">
                            {hasError ? (
                              <span className="text-red-500" title={row.errors.join('; ')}>
                                <AlertTriangle className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Error details */}
              {errorRows.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Rows with errors (will be skipped):</p>
                  {errorRows.map((row, idx) => (
                    <p key={idx} className="text-xs text-red-600">
                      Row {parsedRows.indexOf(row) + 1}: {row.errors.join(', ')}
                    </p>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <X className="h-3.5 w-3.5 mr-1" /> Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleImport}
                  disabled={validRows.length === 0 || importing}
                >
                  {importing ? `Importing... (${importedCount}/${validRows.length})` : `Import ${validRows.length} Task${validRows.length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="py-6 text-center">
              <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${failedImports.length > 0 ? 'bg-amber-100' : 'bg-green-100'}`}>
                <Check className={`h-6 w-6 ${failedImports.length > 0 ? 'text-amber-600' : 'text-green-600'}`} />
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {importedCount} task{importedCount !== 1 ? 's' : ''} imported
                {failedImports.length > 0 && `, ${failedImports.length} failed`}
              </p>
              <p className="mt-1 text-xs text-slate-500">Tasks are now visible in their respective projects.</p>
              {failedImports.length > 0 && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50/50 p-3 text-left">
                  <p className="text-xs font-semibold text-red-700 mb-1">Failed rows:</p>
                  {failedImports.map((f, i) => (
                    <p key={i} className="text-xs text-red-600 truncate">{f.title}: {f.error}</p>
                  ))}
                </div>
              )}
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => { handleReset(); onOpenChange(false); }}>
                  Close
                </Button>
                <Button variant="primary" size="sm" onClick={handleReset}>
                  Import More
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
