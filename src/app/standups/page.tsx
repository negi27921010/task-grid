'use client';

import { Suspense, useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import {
  ClipboardCheck,
  Sun,
  Moon,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flame,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/toast';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useUsers } from '@/lib/hooks/use-users';
import { useViewMode } from '@/lib/hooks/use-view-mode';
import { isAdmin } from '@/lib/utils/permissions';
import {
  useStandupByDate,
  useCarriedOutcomes,
  useCreateMorningStandup,
  useUpdateMorningStandup,
  useSubmitEveningClosure,
  useTeamStandups,
} from '@/lib/hooks/use-standups';
import { getTodayIST, getISTHour } from '@/lib/api/standups';
import { cn } from '@/lib/utils/cn';
import type { StandupOutcome, OutcomeEveningStatus } from '@/lib/types';

/* ---- Outcome validation ---- */

const VAGUE_STARTERS = [
  'work on', 'follow up', 'look into', 'continue', 'check',
  'try to', 'explore', 'think about', 'help with', 'do',
];

function validateOutcome(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.length < 10) return 'Too short — be specific about the deliverable and quantity.';
  const lower = trimmed.toLowerCase();
  for (const vague of VAGUE_STARTERS) {
    if (lower.startsWith(vague)) {
      return `"${vague}..." is too vague. Write a verifiable outcome (e.g. "Complete 10 school registrations").`;
    }
  }
  return null;
}

/* ---- Morning Section ---- */

function MorningSection({
  userId,
  date,
  standup,
  carriedOutcomes,
  isEditing,
  onStartEdit,
  onCancelEdit,
}: {
  userId: string;
  date: string;
  standup: ReturnType<typeof useStandupByDate>['data'];
  carriedOutcomes: StandupOutcome[];
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}) {
  const [outcomes, setOutcomes] = useState<string[]>(['', '', '']);
  const [deps, setDeps] = useState('');
  const [errors, setErrors] = useState<(string | null)[]>([null, null, null]);
  const createStandup = useCreateMorningStandup();
  const updateStandup = useUpdateMorningStandup();

  const isSubmitted = !!standup?.morning_submitted_at;
  const canEdit = isSubmitted && getISTHour() < 12;
  const showForm = !isSubmitted || isEditing;

  // Pre-fill when editing
  const handleStartEdit = useCallback(() => {
    if (standup) {
      const newOutcomes = standup.outcomes
        .filter(o => !o.is_carried)
        .map(o => o.outcome_text);
      while (newOutcomes.length < 3) newOutcomes.push('');
      setOutcomes(newOutcomes.slice(0, 3));
      setDeps(standup.dependencies_risks ?? '');
      setErrors([null, null, null]);
    }
    onStartEdit();
  }, [standup, onStartEdit]);

  const handleOutcomeChange = (idx: number, value: string) => {
    const next = [...outcomes];
    next[idx] = value;
    setOutcomes(next);
    // Validate on change
    const nextErrors = [...errors];
    nextErrors[idx] = value.trim() ? validateOutcome(value) : null;
    setErrors(nextErrors);
  };

  const handleSubmit = () => {
    const filledOutcomes = outcomes.filter(o => o.trim());
    if (filledOutcomes.length === 0) return;

    // Validate all
    const newErrors = outcomes.map(o => (o.trim() ? validateOutcome(o) : null));
    const hasError = filledOutcomes.some((o) => validateOutcome(o) !== null);
    setErrors(newErrors);
    if (hasError) return;

    if (isEditing && standup) {
      updateStandup.mutate({
        id: standup.id,
        input: {
          outcomes: filledOutcomes.map((text, i) => ({
            outcome_text: text.trim(),
            priority_order: i + 1,
          })),
          dependencies_risks: deps.trim() || undefined,
        },
      }, {
        onSuccess: onCancelEdit,
      });
    } else {
      createStandup.mutate({
        user_id: userId,
        standup_date: date,
        outcomes: filledOutcomes.map((text, i) => ({
          outcome_text: text.trim(),
          priority_order: i + 1,
        })),
        carried_outcome_ids: carriedOutcomes.map(o => o.id),
        dependencies_risks: deps.trim() || undefined,
      });
    }
  };

  const isPending = createStandup.isPending || updateStandup.isPending;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-50 p-2">
            <Sun className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Morning Standup</h2>
            <p className="text-xs text-slate-500">
              {isSubmitted
                ? `Submitted ${standup?.morning_is_late ? '(late) ' : ''}at ${standup?.morning_submitted_at ? format(new Date(standup.morning_submitted_at), 'h:mm a') : ''}`
                : 'Commit to 1-3 measurable outcomes'}
            </p>
          </div>
        </div>
        {isSubmitted && !isEditing && (
          <div className="flex items-center gap-2">
            <Badge variant="success">Submitted</Badge>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={handleStartEdit}>Edit</Button>
            )}
          </div>
        )}
        {isEditing && (
          <Button variant="ghost" size="sm" onClick={onCancelEdit}>Cancel Edit</Button>
        )}
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Carried items */}
        {carriedOutcomes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Carried from yesterday
            </p>
            {carriedOutcomes.map((o) => (
              <div
                key={o.id}
                className="flex items-start gap-3 rounded-lg border border-red-100 bg-red-50/50 px-4 py-3"
              >
                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div className="flex-1">
                  <p className="text-sm text-slate-800">{o.outcome_text}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {o.carry_streak >= 3 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        <Flame className="h-3 w-3" /> STUCK {o.carry_streak} days
                      </span>
                    )}
                    {o.carry_streak > 0 && o.carry_streak < 3 && (
                      <span className="text-[10px] text-red-400">Carried {o.carry_streak} day{o.carry_streak > 1 ? 's' : ''}</span>
                    )}
                    {o.reason_not_done && (
                      <span className="text-[10px] text-slate-400 italic">Prev reason: {o.reason_not_done}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Outcomes form or read-only */}
        {showForm ? (
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today&apos;s Outcomes (1-3 required)
            </p>
            {outcomes.map((text, idx) => (
              <div key={idx}>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs font-semibold text-slate-400 w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={text}
                    onChange={e => handleOutcomeChange(idx, e.target.value)}
                    placeholder={idx === 0 ? 'e.g. Complete 10 school registrations for Gujarat' : idx === 1 ? 'e.g. Send dispatch emails to 15 distributors' : 'Optional 3rd outcome...'}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                      errors[idx] ? 'border-red-300 bg-red-50/50 focus:border-red-400' : 'border-slate-300 focus:border-blue-500'
                    )}
                    disabled={isPending}
                  />
                </div>
                {errors[idx] && (
                  <p className="mt-1 ml-6 text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors[idx]}
                  </p>
                )}
              </div>
            ))}
            <p className="text-[11px] text-slate-400 ml-6">
              Tip: Write an outcome, not a task. Example: &quot;Submit 5 verified order forms to ops team&quot; instead of &quot;Work on order forms&quot;
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Dependencies / Risks (optional)
              </label>
              <textarea
                value={deps}
                onChange={e => setDeps(e.target.value)}
                placeholder="Any blockers, dependencies, or risks for today..."
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                disabled={isPending}
              />
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={isPending || outcomes.filter(o => o.trim()).length === 0}
              >
                {isPending ? 'Submitting...' : isEditing ? 'Update Standup' : 'Submit Morning Standup'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today&apos;s Outcomes
            </p>
            {standup?.outcomes.filter(o => !o.is_carried).map((o, idx) => (
              <div key={o.id} className="flex items-start gap-3 rounded-lg border border-slate-100 px-4 py-3">
                <span className="mt-0.5 shrink-0 text-xs font-semibold text-slate-400">{idx + 1}.</span>
                <p className="text-sm text-slate-800">{o.outcome_text}</p>
              </div>
            ))}
            {standup?.dependencies_risks && (
              <div className="mt-2">
                <p className="text-xs font-medium text-slate-500 mb-1">Dependencies / Risks</p>
                <p className="text-sm text-slate-600 bg-amber-50/50 rounded-lg px-4 py-2 border border-amber-100">
                  {standup.dependencies_risks}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Evening Section ---- */

function EveningSection({
  standup,
}: {
  standup: NonNullable<ReturnType<typeof useStandupByDate>['data']>;
}) {
  const [statuses, setStatuses] = useState<Record<string, OutcomeEveningStatus>>(() => {
    const map: Record<string, OutcomeEveningStatus> = {};
    for (const o of standup.outcomes) {
      map[o.id] = o.evening_status;
    }
    return map;
  });
  const [reasons, setReasons] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const o of standup.outcomes) {
      if (o.reason_not_done) map[o.id] = o.reason_not_done;
    }
    return map;
  });
  const [notes, setNotes] = useState(standup.evening_notes ?? '');
  const submitClosure = useSubmitEveningClosure();
  const { toast } = useToast();

  const isSubmitted = !!standup.evening_submitted_at;
  const istHour = getISTHour();
  const canSubmit = istHour >= 17;

  const handleToggle = (id: string, status: OutcomeEveningStatus) => {
    setStatuses(prev => ({ ...prev, [id]: status }));
    if (status === 'done') {
      setReasons(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleSubmit = () => {
    // Validate all outcomes have a status set (not pending)
    const allSet = standup.outcomes.every(o => statuses[o.id] !== 'pending');
    if (!allSet) {
      toast('Mark all outcomes as Done or Not Done', 'warning');
      return;
    }

    // Validate reasons for not_done
    const missingReasons = standup.outcomes.filter(
      o => statuses[o.id] === 'not_done' && (!reasons[o.id] || reasons[o.id].trim().length < 10)
    );
    if (missingReasons.length > 0) {
      toast('Provide a reason (min 10 chars) for each outcome not done', 'warning');
      return;
    }

    submitClosure.mutate({
      standupId: standup.id,
      input: {
        outcomes: standup.outcomes.map(o => ({
          id: o.id,
          evening_status: statuses[o.id],
          reason_not_done: statuses[o.id] === 'not_done' ? reasons[o.id]?.trim() : undefined,
        })),
        evening_notes: notes.trim() || undefined,
      },
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-2">
            <Moon className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Evening Closure</h2>
            <p className="text-xs text-slate-500">
              {isSubmitted
                ? `Closed ${standup.evening_is_late ? '(late) ' : ''}at ${standup.evening_submitted_at ? format(new Date(standup.evening_submitted_at), 'h:mm a') : ''}`
                : canSubmit
                  ? 'Mark each outcome as Done or Not Done'
                  : 'Available after 5:00 PM'}
            </p>
          </div>
        </div>
        {isSubmitted && <Badge variant="success">Closed</Badge>}
      </div>

      <div className="px-6 py-5 space-y-4">
        {standup.outcomes.map((o) => {
          const status = statuses[o.id];
          return (
            <div key={o.id} className={cn(
              'rounded-lg border px-4 py-3 transition-colors',
              isSubmitted && status === 'done' && 'border-green-200 bg-green-50/50',
              isSubmitted && status === 'not_done' && 'border-red-200 bg-red-50/50',
              !isSubmitted && 'border-slate-200',
            )}>
              <div className="flex items-start gap-3">
                {o.is_carried && <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />}
                <div className="flex-1">
                  <p className="text-sm text-slate-800">{o.outcome_text}</p>
                  {o.is_carried && o.carry_streak >= 3 && (
                    <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                      <Flame className="h-3 w-3" /> STUCK {o.carry_streak} days
                    </span>
                  )}
                </div>
                {!isSubmitted && canSubmit && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggle(o.id, 'done')}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                        status === 'done'
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'border border-slate-200 text-slate-500 hover:border-green-300 hover:bg-green-50 hover:text-green-700'
                      )}
                    >
                      <Check className="inline h-3.5 w-3.5 mr-1" />Done
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(o.id, 'not_done')}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                        status === 'not_done'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'border border-slate-200 text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-700'
                      )}
                    >
                      <X className="inline h-3.5 w-3.5 mr-1" />Not Done
                    </button>
                  </div>
                )}
                {isSubmitted && (
                  <span className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                    status === 'done' && 'bg-green-100 text-green-700',
                    status === 'not_done' && 'bg-red-100 text-red-700',
                  )}>
                    {status === 'done' ? 'Done' : 'Not Done'}
                  </span>
                )}
              </div>

              {/* Reason field for not_done */}
              {!isSubmitted && status === 'not_done' && (
                <div className="mt-3 ml-0">
                  <textarea
                    value={reasons[o.id] ?? ''}
                    onChange={e => setReasons(prev => ({ ...prev, [o.id]: e.target.value }))}
                    placeholder="Why wasn't this completed? (min 10 characters)"
                    rows={2}
                    className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm resize-none focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  />
                </div>
              )}
              {isSubmitted && status === 'not_done' && o.reason_not_done && (
                <p className="mt-2 text-xs text-red-600 italic">Reason: {o.reason_not_done}</p>
              )}
            </div>
          );
        })}

        {!isSubmitted && canSubmit && (
          <>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                End-of-day notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional notes about today..."
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={submitClosure.isPending}
              >
                {submitClosure.isPending ? 'Submitting...' : 'Submit Evening Closure'}
              </Button>
            </div>
          </>
        )}

        {!isSubmitted && !canSubmit && (
          <p className="text-center text-sm text-slate-400 py-4">
            Evening closure opens at 5:00 PM IST
          </p>
        )}
      </div>
    </div>
  );
}

/* ---- Admin Team Overview ---- */

function TeamOverviewSection({ date }: { date: string }) {
  const { data: team, isLoading } = useTeamStandups(date);
  const { data: allUsers } = useUsers();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const summaries = team ?? [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <div className="rounded-lg bg-blue-50 p-2">
          <Users className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Team Overview</h2>
          <p className="text-xs text-slate-500">{summaries.length} team members</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Member</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Morning</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Evening</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Outcomes</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Carried</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stuck</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Rate</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => {
              const user = (allUsers ?? []).find(u => u.id === s.user_id);
              return (
                <tr key={s.user_id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar fullName={s.user_name} src={user?.avatar_url ?? null} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{s.user_name}</p>
                        <p className="text-[10px] text-slate-400">{s.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={s.morning_status === 'submitted' ? 'success' : s.morning_status === 'late' ? 'warning' : 'default'}>
                      {s.morning_status === 'submitted' ? 'Done' : s.morning_status === 'late' ? 'Late' : 'Pending'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={s.evening_status === 'submitted' ? 'success' : s.evening_status === 'late' ? 'warning' : 'default'}>
                      {s.evening_status === 'submitted' ? 'Closed' : s.evening_status === 'late' ? 'Late' : 'Pending'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.total_outcomes > 0 ? (
                      <span className="text-sm text-slate-700">
                        <span className="font-semibold text-green-600">{s.done_count}</span>
                        <span className="text-slate-400">/{s.total_outcomes}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.carried_count > 0 ? (
                      <span className="text-sm font-medium text-amber-600">{s.carried_count}</span>
                    ) : (
                      <span className="text-xs text-slate-300">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.stuck_count > 0 ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-600">
                        <Flame className="h-3.5 w-3.5" />{s.stuck_count}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.total_outcomes > 0 ? (
                      <span className={cn(
                        'text-sm font-semibold',
                        s.completion_rate >= 80 && 'text-green-600',
                        s.completion_rate >= 50 && s.completion_rate < 80 && 'text-amber-600',
                        s.completion_rate < 50 && 'text-red-600',
                      )}>
                        {s.completion_rate}%
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---- Main Page Content ---- */

function StandupsContent() {
  const { currentUser, isLoading: userLoading } = useCurrentUser();
  const { viewMode, setViewMode } = useViewMode();
  const userIsAdmin = !userLoading && isAdmin(currentUser);

  const [tab, setTab] = useState<'my' | 'team'>('my');
  const [dateOffset, setDateOffset] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  const today = getTodayIST();
  const viewDate = useMemo(() => {
    if (dateOffset === 0) return today;
    const d = new Date(today);
    d.setDate(d.getDate() + dateOffset);
    return d.toISOString().slice(0, 10);
  }, [today, dateOffset]);

  const isToday = viewDate === today;

  const { data: standup, isLoading: standupLoading } = useStandupByDate(
    currentUser.id,
    viewDate,
  );
  const { data: carriedOutcomes } = useCarriedOutcomes(currentUser.id);

  const formattedDate = useMemo(() => {
    try {
      return format(new Date(viewDate + 'T00:00:00'), 'EEEE, dd MMM yyyy');
    } catch {
      return viewDate;
    }
  }, [viewDate]);

  if (userLoading) {
    return (
      <AppShell viewMode={viewMode} onViewModeChange={setViewMode}>
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell viewMode={viewMode} onViewModeChange={setViewMode}>
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Daily Standup</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <button
                  onClick={() => setDateOffset(d => d - 1)}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  disabled={dateOffset <= -30}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-sm text-slate-500">{formattedDate}</p>
                <button
                  onClick={() => setDateOffset(d => d + 1)}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  disabled={dateOffset >= 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                {!isToday && (
                  <button
                    onClick={() => setDateOffset(0)}
                    className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Admin tab toggle */}
          {userIsAdmin && (
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                onClick={() => setTab('my')}
                className={cn(
                  'rounded-md px-4 py-1.5 text-sm font-medium transition-all',
                  tab === 'my' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                My Standup
              </button>
              <button
                onClick={() => setTab('team')}
                className={cn(
                  'rounded-md px-4 py-1.5 text-sm font-medium transition-all',
                  tab === 'team' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                )}
              >
                Team Overview
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {tab === 'my' ? (
          standupLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              <MorningSection
                userId={currentUser.id}
                date={viewDate}
                standup={standup}
                carriedOutcomes={isToday ? (carriedOutcomes ?? []) : []}
                isEditing={isEditing}
                onStartEdit={() => setIsEditing(true)}
                onCancelEdit={() => setIsEditing(false)}
              />

              {standup?.morning_submitted_at && (
                <EveningSection standup={standup} />
              )}
            </div>
          )
        ) : (
          <TeamOverviewSection date={viewDate} />
        )}
      </div>
    </AppShell>
  );
}

export default function StandupsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <StandupsContent />
    </Suspense>
  );
}
