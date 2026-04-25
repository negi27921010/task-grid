'use client';

import { Suspense, useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import {
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
  Plus,
  Search,
} from 'lucide-react';
import { RefinedAppShell, RefinedPageHeader, type PageTab } from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/design-system/avatar';
import { Tooltip } from '@/components/ui/tooltip';
import * as Dialog from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useUsers } from '@/lib/hooks/use-users';
import { isAdmin } from '@/lib/utils/permissions';
import {
  useStandupByDate,
  useCarriedOutcomes,
  useCreateMorningStandup,
  useUpdateMorningStandup,
  useSubmitEveningClosure,
  useTeamStandups,
  useUpdateOutcomeStatus,
  useAddStandupComment,
  usePushBackOutcome,
} from '@/lib/hooks/use-standups';
import { getTodayIST, getISTHour, isEffortRequired } from '@/lib/api/standups';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow } from 'date-fns';
import type { StandupOutcome, OutcomeEveningStatus, CreateMorningStandupInput } from '@/lib/types';

/* ---- Layout constants ---- */

// One source of truth so the team table header and rows stay in lockstep.
const TEAM_TABLE_GRID =
  'grid items-center gap-3 grid-cols-[minmax(180px,1fr)_84px_84px_72px_60px_60px_60px_24px]';

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

function validateEffortHours(hours: number | null): string | null {
  if (hours == null || Number.isNaN(hours)) return 'Hours required';
  if (hours <= 0) return 'Must be > 0';
  if (hours > 24) return 'Max 24';
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
  // Hours are mandatory for standups dated tomorrow IST onwards.
  // Today and earlier remain lenient — empty hours default to 1.
  const effortRequired = isEffortRequired(date);
  const [outcomes, setOutcomes] = useState<string[]>(['']);
  const [effortHours, setEffortHours] = useState<(number | null)[]>([null]);
  const [deps, setDeps] = useState('');
  const [errors, setErrors] = useState<(string | null)[]>([null]);
  const [hourErrors, setHourErrors] = useState<(string | null)[]>([null]);
  const [lateConfirmPayload, setLateConfirmPayload] = useState<CreateMorningStandupInput | null>(null);
  const createStandup = useCreateMorningStandup();
  const updateStandup = useUpdateMorningStandup();

  const isSubmitted = !!standup?.morning_submitted_at;
  const canEdit = isSubmitted; // Members can edit anytime
  const showForm = !isSubmitted || isEditing;

  // Pre-fill when editing
  const handleStartEdit = useCallback(() => {
    if (standup) {
      const editable = standup.outcomes.filter(o => !o.is_carried);
      const newOutcomes = editable.map(o => o.outcome_text);
      const newHours = editable.map(o => o.effort_hours);
      if (newOutcomes.length === 0) {
        newOutcomes.push('');
        newHours.push(null);
      }
      setOutcomes(newOutcomes);
      setEffortHours(newHours);
      setDeps(standup.dependencies_risks ?? '');
      setErrors(newOutcomes.map(() => null));
      setHourErrors(newOutcomes.map(() => null));
    }
    onStartEdit();
  }, [standup, onStartEdit]);

  const handleOutcomeChange = (idx: number, value: string) => {
    const next = [...outcomes];
    next[idx] = value;
    setOutcomes(next);
    const nextErrors = [...errors];
    nextErrors[idx] = value.trim() ? validateOutcome(value) : null;
    setErrors(nextErrors);
  };

  const handleHoursChange = (idx: number, raw: string) => {
    const val = raw === '' ? null : parseFloat(raw);
    setEffortHours(prev => {
      const n = [...prev];
      n[idx] = val;
      return n;
    });
    setHourErrors(prev => {
      const n = [...prev];
      // Skip validation for non-required dates so the user can leave blank.
      n[idx] = effortRequired && outcomes[idx]?.trim() ? validateEffortHours(val) : null;
      return n;
    });
  };

  const handleAddOutcome = () => {
    setOutcomes(prev => [...prev, '']);
    setEffortHours(prev => [...prev, null]);
    setErrors(prev => [...prev, null]);
    setHourErrors(prev => [...prev, null]);
  };

  const handleRemoveOutcome = (idx: number) => {
    if (outcomes.length <= 1) return;
    setOutcomes(prev => prev.filter((_, i) => i !== idx));
    setEffortHours(prev => prev.filter((_, i) => i !== idx));
    setErrors(prev => prev.filter((_, i) => i !== idx));
    setHourErrors(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    const filledIndices = outcomes
      .map((o, i) => (o.trim() ? i : -1))
      .filter(i => i >= 0);
    if (filledIndices.length === 0) return;

    const newErrors = outcomes.map(o => (o.trim() ? validateOutcome(o) : null));
    const newHourErrors = outcomes.map((o, i) =>
      effortRequired && o.trim() ? validateEffortHours(effortHours[i]) : null,
    );
    setErrors(newErrors);
    setHourErrors(newHourErrors);

    const hasTextError = filledIndices.some(i => newErrors[i] !== null);
    const hasHourError = filledIndices.some(i => newHourErrors[i] !== null);
    if (hasTextError || hasHourError) return;

    const payload = filledIndices.map((i, position) => ({
      outcome_text: outcomes[i].trim(),
      priority_order: position + 1,
      effort_hours: effortHours[i],
    }));

    if (isEditing && standup) {
      updateStandup.mutate(
        {
          id: standup.id,
          input: {
            outcomes: payload,
            dependencies_risks: deps.trim() || undefined,
          },
        },
        { onSuccess: onCancelEdit },
      );
    } else {
      const createInput: CreateMorningStandupInput = {
        user_id: userId,
        standup_date: date,
        outcomes: payload,
        carried_outcome_ids: carriedOutcomes.map(o => o.id),
        dependencies_risks: deps.trim() || undefined,
      };
      // Past the 11:00 AM IST cutoff — confirm before submitting.
      if (getISTHour() >= 11) {
        setLateConfirmPayload(createInput);
      } else {
        createStandup.mutate(createInput);
      }
    }
  };

  const confirmLateSubmit = () => {
    if (lateConfirmPayload) {
      createStandup.mutate(lateConfirmPayload);
      setLateConfirmPayload(null);
    }
  };

  const isPending = createStandup.isPending || updateStandup.isPending;
  const submitDisabled =
    isPending ||
    outcomes.filter(o => o.trim()).length === 0 ||
    (effortRequired &&
      outcomes.some((o, i) => o.trim() && validateEffortHours(effortHours[i]) !== null));

  return (
    <div className="rounded-xl border border-border-color bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border-color px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-500/15">
            <Sun className="h-5 w-5 text-amber-600 dark:text-amber-300" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text">Morning Standup</h2>
            <p className="text-xs text-text-muted">
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
            <p className="text-xs font-semibold uppercase tracking-wider text-red-500 dark:text-red-300 flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Carried from yesterday
            </p>
            {carriedOutcomes.map((o) => (
              <div
                key={o.id}
                className="flex items-start gap-3 rounded-lg border border-red-100 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/12 px-4 py-3"
              >
                <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div className="flex-1">
                  <p className="text-sm text-text">{o.outcome_text}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {o.carry_streak >= 3 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-300">
                        <Flame className="h-3 w-3" /> STUCK {o.carry_streak} days
                      </span>
                    )}
                    {o.carry_streak > 0 && o.carry_streak < 3 && (
                      <span className="text-[10px] text-red-400">Carried {o.carry_streak} day{o.carry_streak > 1 ? 's' : ''}</span>
                    )}
                    {o.reason_not_done && (
                      <span className="text-[10px] text-text-faint italic">Prev reason: {o.reason_not_done}</span>
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
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Today&apos;s Outcomes (at least 1 required)
              </p>
              <button
                type="button"
                onClick={handleAddOutcome}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-text-muted transition-colors hover:bg-neutral-200 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" /> Add Outcome
              </button>
            </div>
            {/* Column labels — single source of truth for the required marker */}
            <div className="flex items-center gap-2 px-1 pb-1">
              <span className="w-4 shrink-0" />
              <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                Outcome
              </span>
              <span className="w-16 shrink-0 text-center text-[10px] font-semibold uppercase tracking-wider text-text-faint">
                Hrs
                {effortRequired ? (
                  <span className="ml-0.5 text-red-500 dark:text-red-300">*</span>
                ) : (
                  <span className="ml-0.5 text-text-faint">(opt)</span>
                )}
              </span>
              {outcomes.length > 1 && <span className="w-6 shrink-0" />}
            </div>
            {outcomes.map((text, idx) => (
              <div key={idx}>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs font-semibold text-text-faint w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={text}
                    onChange={e => handleOutcomeChange(idx, e.target.value)}
                    maxLength={500}
                    placeholder={idx === 0 ? 'e.g. Complete 10 school registrations for Gujarat' : 'Next measurable outcome...'}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20',
                      errors[idx] ? 'border-red-300 bg-red-50/50 dark:bg-red-500/12 focus:border-red-400' : 'border-border-color focus:border-[var(--accent)]'
                    )}
                    disabled={isPending}
                  />
                  <input
                    type="number"
                    value={effortHours[idx] ?? ''}
                    onChange={e => handleHoursChange(idx, e.target.value)}
                    placeholder="Hrs"
                    min={0.5}
                    max={24}
                    step={0.5}
                    aria-label="Effort hours (required)"
                    aria-required="true"
                    aria-invalid={!!hourErrors[idx]}
                    className={cn(
                      'w-16 shrink-0 rounded-lg border px-2 py-2 text-xs text-center focus:outline-none focus:ring-2',
                      hourErrors[idx]
                        ? 'border-red-300 bg-red-50/50 dark:bg-red-500/12 focus:border-red-400 focus:ring-red-500/20'
                        : 'border-border-color focus:border-[var(--accent)] focus:ring-[var(--accent)]/20',
                    )}
                    disabled={isPending}
                  />
                  {outcomes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOutcome(idx)}
                      className="shrink-0 rounded p-1 text-text-faint transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/15 dark:text-red-300"
                      disabled={isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {(errors[idx] || hourErrors[idx]) && (
                  <p className="mt-1 ml-6 text-xs text-red-500 dark:text-red-300 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors[idx] ?? hourErrors[idx]}
                  </p>
                )}
              </div>
            ))}
            <p className="text-[11px] text-text-faint ml-6">
              Tip: Write an outcome, not a task. Example: &quot;Submit 5 verified order forms to ops team&quot; instead of &quot;Work on order forms&quot;.{' '}
              {effortRequired ? (
                <span className="text-text-muted">Effort hours are required.</span>
              ) : (
                <span className="text-text-muted">Effort hours optional for this date — left blank entries default to 1h.</span>
              )}
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Dependencies / Risks (optional)
              </label>
              <textarea
                value={deps}
                onChange={e => setDeps(e.target.value)}
                placeholder="Any blockers, dependencies, or risks for today..."
                rows={2}
                className="w-full rounded-lg border border-border-color px-3 py-2 text-sm resize-none focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                disabled={isPending}
              />
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={submitDisabled}
              >
                {isPending ? 'Submitting...' : isEditing ? 'Update Standup' : 'Submit Morning Standup'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Today&apos;s Outcomes
            </p>
            {standup?.outcomes.filter(o => !o.is_carried).map((o, idx) => (
              <div key={o.id} className="flex items-start gap-3 rounded-lg border border-border-color px-4 py-3">
                <span className="mt-0.5 shrink-0 text-xs font-semibold text-text-faint">{idx + 1}.</span>
                <p className="flex-1 text-sm text-text">{o.outcome_text}</p>
                {o.effort_hours != null && (
                  <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-text-muted">
                    {o.effort_hours}h
                  </span>
                )}
              </div>
            ))}
            {standup?.dependencies_risks && (
              <div className="mt-2">
                <p className="text-xs font-medium text-text-muted mb-1">Dependencies / Risks</p>
                <p className="text-sm text-text-muted bg-amber-50/50 dark:bg-amber-500/12 rounded-lg px-4 py-2 border border-amber-100 dark:border-amber-500/30">
                  {standup.dependencies_risks}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog.Root
        open={!!lateConfirmPayload}
        onOpenChange={(open) => { if (!open) setLateConfirmPayload(null); }}
      >
        <Dialog.Content>
          <Dialog.Title className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Delayed Submission
          </Dialog.Title>
          <Dialog.Description>
            It&apos;s past the 11:00 AM IST cutoff. This standup will be marked
            as a <span className="font-semibold text-amber-600 dark:text-amber-300">delayed submission</span> and
            shown as <span className="font-semibold">Late</span> in the team
            overview. Continue?
          </Dialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLateConfirmPayload(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={confirmLateSubmit}
              disabled={isPending}
            >
              {isPending ? 'Submitting...' : 'Submit as Late'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
}

/* ---- Outcome Comment Thread ---- */

function OutcomeComments({
  outcome,
  currentUserId,
}: {
  outcome: StandupOutcome;
  currentUserId: string;
}) {
  const [text, setText] = useState('');
  const addComment = useAddStandupComment();
  const { data: allUsers } = useUsers();

  const handlePost = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addComment.mutate(
      { outcomeId: outcome.id, authorId: currentUserId, content: trimmed },
      { onSuccess: () => setText('') },
    );
  };

  // Don't show comments section if no comments exist and outcome is pending
  // Comments only shown for resolved outcomes that have existing comments
  if (outcome.comments.length === 0) return null;

  return (
    <div className="mt-3 space-y-2 border-t border-border-color pt-3">
      {outcome.comments.length > 0 && (
        <div className="space-y-2">
          {outcome.comments.map((c) => {
            const author = (allUsers ?? []).find(u => u.id === c.author_id);
            return (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar fullName={author?.full_name ?? '?'} src={author?.avatar_url ?? null} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-text">{author?.full_name ?? 'Unknown'}</span>
                    <span className="text-[10px] text-text-faint">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="text-xs text-text-muted whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Comment input — only shown when standup_comments table exists */}
    </div>
  );
}

/* ---- Single Outcome Card ---- */

function OutcomeCard({
  outcome,
  currentUserId,
}: {
  outcome: StandupOutcome;
  currentUserId: string;
}) {
  const [showReasonForm, setShowReasonForm] = useState(false);
  const [reason, setReason] = useState(outcome.reason_not_done ?? '');
  const updateStatus = useUpdateOutcomeStatus();
  const { toast } = useToast();

  const isClosed = outcome.evening_status !== 'pending';

  // Click Done → save immediately
  const handleDone = () => {
    updateStatus.mutate({ outcomeId: outcome.id, status: 'done' });
  };

  // Click Not Done → show reason form
  const handleNotDone = () => {
    setShowReasonForm(true);
  };

  // Submit reason → save not_done
  const handleSubmitReason = () => {
    if (reason.trim().length < 10) {
      toast('Provide a reason (min 10 chars)', 'warning');
      return;
    }
    updateStatus.mutate({
      outcomeId: outcome.id,
      status: 'not_done',
      reason: reason.trim(),
    }, {
      onSuccess: () => setShowReasonForm(false),
    });
  };

  return (
    <div className={cn(
      'rounded-lg border px-4 py-3 transition-colors',
      isClosed && outcome.evening_status === 'done' && 'border-green-200 dark:border-green-500/30 bg-green-50/30 dark:bg-green-500/10',
      isClosed && outcome.evening_status === 'not_done' && 'border-red-200 dark:border-red-500/30 bg-red-50/30 dark:bg-red-500/10',
      !isClosed && 'border-border-color',
    )}>
      {/* Outcome text + status controls */}
      <div className="flex items-start gap-3">
        {outcome.is_carried && <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm text-text">{outcome.outcome_text}</p>
            {outcome.effort_hours != null && (
              <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-text-muted">
                {outcome.effort_hours}h
              </span>
            )}
          </div>
          {outcome.is_carried && outcome.carry_streak >= 3 && (
            <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-red-100 dark:bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-300">
              <Flame className="h-3 w-3" /> STUCK {outcome.carry_streak} days
            </span>
          )}
        </div>

        {/* Status controls */}
        {isClosed ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              'rounded-full px-2.5 py-1 text-xs font-semibold',
              outcome.evening_status === 'done' && 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300',
              outcome.evening_status === 'not_done' && 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
            )}>
              {outcome.evening_status === 'done' ? 'Done' : 'Not Done'}
            </span>
            {outcome.closed_at && (
              <span className="text-[10px] text-text-faint">
                {format(new Date(outcome.closed_at), 'h:mm a')}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleDone}
              disabled={updateStatus.isPending}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-green-700 disabled:opacity-50"
            >
              {updateStatus.isPending ? '...' : <><Check className="inline h-3.5 w-3.5 mr-1" />Done</>}
            </button>
            <button
              type="button"
              onClick={handleNotDone}
              disabled={updateStatus.isPending || showReasonForm}
              className="rounded-lg border border-border-color px-3 py-1.5 text-xs font-medium text-text-muted transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/15 dark:text-red-300 disabled:opacity-50"
            >
              <X className="inline h-3.5 w-3.5 mr-1" />Not Done
            </button>
          </div>
        )}
      </div>

      {/* Reason form for not_done — appears inline after clicking "Not Done" */}
      {!isClosed && showReasonForm && (
        <div className="mt-3 space-y-2">
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Why wasn't this completed? (min 10 characters)"
            rows={2}
            maxLength={500}
            autoFocus
            className="w-full rounded-lg border border-red-200 dark:border-red-500/30 bg-surface px-3 py-2 text-sm resize-none focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowReasonForm(false); setReason(''); }}
              className="rounded-md px-3 py-1 text-xs text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleSubmitReason}
              disabled={reason.trim().length < 10 || updateStatus.isPending}
            >
              {updateStatus.isPending ? 'Saving...' : 'Mark Not Done'}
            </Button>
          </div>
        </div>
      )}
      {isClosed && outcome.evening_status === 'not_done' && outcome.reason_not_done && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-300 italic">Reason: {outcome.reason_not_done}</p>
      )}

      {/* Comment thread */}
      <OutcomeComments outcome={outcome} currentUserId={currentUserId} />
    </div>
  );
}

/* ---- Evening Section ---- */

function EveningSection({
  standup,
  currentUserId,
  carriedOutcomes = [],
}: {
  standup: NonNullable<ReturnType<typeof useStandupByDate>['data']>;
  currentUserId: string;
  carriedOutcomes?: StandupOutcome[];
}) {
  // Merge: standup outcomes + any carried items NOT already in the standup
  const standupOutcomeIds = new Set(standup.outcomes.map(o => o.carried_from_outcome_id).filter(Boolean));
  const missingCarried = carriedOutcomes.filter(o => !standupOutcomeIds.has(o.id));
  const allOutcomes = [...standup.outcomes, ...missingCarried];

  const allClosed = allOutcomes.every(o => o.evening_status !== 'pending');
  const closedCount = allOutcomes.filter(o => o.evening_status !== 'pending').length;
  const totalCount = allOutcomes.length;

  return (
    <div className="rounded-xl border border-border-color bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border-color px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-2 dark:bg-indigo-500/15">
            <Moon className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text">Evening Closure</h2>
            <p className="text-xs text-text-muted">
              {allClosed
                ? `All ${totalCount} outcomes resolved`
                : `${closedCount}/${totalCount} outcomes resolved — mark each individually`}
            </p>
          </div>
        </div>
        {allClosed && <Badge variant="success">Day Closed</Badge>}
        {!allClosed && closedCount > 0 && (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-300">{closedCount}/{totalCount}</span>
        )}
      </div>

      <div className="px-6 py-5 space-y-4">
        {allOutcomes.map((o) => (
          <OutcomeCard key={o.id} outcome={o} currentUserId={currentUserId} />
        ))}

        {/* Evening notes / dependencies */}
        {standup.dependencies_risks && (
          <div className="rounded-lg border border-amber-100 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/12 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300 mb-1">Dependencies / Risks</p>
            <p className="text-sm text-text whitespace-pre-wrap">{standup.dependencies_risks}</p>
          </div>
        )}
        {standup.evening_notes && (
          <div className="rounded-lg border border-indigo-100 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/12 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 mb-1">Evening Remarks</p>
            <p className="text-sm text-text whitespace-pre-wrap">{standup.evening_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Carried Outcome Card (admin detail with push-back + expandable reason) ---- */

function CarriedOutcomeCard({
  outcome: o,
  pushBack,
  pushBackId,
  setPushBackId,
  pushBackReason,
  setPushBackReason,
}: {
  outcome: StandupOutcome;
  pushBack: ReturnType<typeof usePushBackOutcome>;
  pushBackId: string | null;
  setPushBackId: (id: string | null) => void;
  pushBackReason: string;
  setPushBackReason: (v: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasClosed = o.evening_status !== 'pending';

  return (
    <div className={cn(
      'rounded-lg border px-3 py-2 text-sm',
      hasClosed && o.evening_status === 'done' && 'border-green-200 dark:border-green-500/30 bg-green-50/50 dark:bg-green-500/12',
      hasClosed && o.evening_status === 'not_done' && 'border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/12',
      !hasClosed && 'border-red-100 dark:border-red-500/30 bg-red-50/30 dark:bg-red-500/10',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <div className="flex-1 min-w-0">
            <span className="text-text">{o.outcome_text}</span>
            {o.carry_streak >= 3 && (
              <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-red-100 dark:bg-red-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-red-700 dark:text-red-300">
                <Flame className="h-2.5 w-2.5" /> STUCK {o.carry_streak}d
              </span>
            )}
            {o.carry_streak > 0 && o.carry_streak < 3 && (
              <span className="ml-2 text-[10px] text-red-400">Carried {o.carry_streak}d</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {o.effort_hours != null && (
            <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
              {o.effort_hours}h
            </span>
          )}
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            o.evening_status === 'done' && 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300',
            o.evening_status === 'not_done' && 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
            o.evening_status === 'pending' && 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
          )}>
            {o.evening_status === 'done' ? 'Done' : o.evening_status === 'not_done' ? 'Not Done' : 'Pending'}
          </span>
          {/* Expand reason toggle */}
          {(o.reason_not_done || o.carry_streak > 0) && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="rounded px-1.5 py-0.5 text-[10px] text-text-muted border border-border-color hover:bg-hover"
            >
              {expanded ? 'Hide' : 'Details'}
            </button>
          )}
          {/* Push back button — available on all outcomes */}
          <button
            type="button"
            onClick={() => { setPushBackId(o.id); setPushBackReason(''); }}
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-500/15"
          >
              Push Back
            </button>
        </div>
      </div>

      {/* Expandable reason */}
      {expanded && o.reason_not_done && (
        <p className="ml-5 mt-2 text-xs text-red-600 dark:text-red-300 italic border-l-2 border-red-200 dark:border-red-500/30 pl-2">
          {o.reason_not_done}
        </p>
      )}

      {/* Push back form */}
      {pushBackId === o.id && (
        <div className="mt-2 space-y-2 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/12 p-2">
          <textarea
            value={pushBackReason}
            onChange={e => setPushBackReason(e.target.value)}
            placeholder="Why are you pushing this back?"
            rows={2}
            autoFocus
            className="w-full rounded border border-amber-200 dark:border-amber-500/30 bg-surface px-2 py-1.5 text-xs resize-none focus:border-amber-400 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPushBackId(null)} className="text-xs text-text-muted hover:text-text">Cancel</button>
            <button
              type="button"
              disabled={!pushBackReason.trim() || pushBack.isPending}
              onClick={() => {
                pushBack.mutate({ outcomeId: o.id, reason: pushBackReason.trim() }, {
                  onSuccess: () => setPushBackId(null),
                });
              }}
              className="rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {pushBack.isPending ? 'Sending...' : 'Push Back'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Member Detail Card (expanded view in admin) ---- */

function MemberStandupDetail({ userId, date }: { userId: string; date: string }) {
  const { data: standup, isLoading } = useStandupByDate(userId, date);
  const pushBack = usePushBackOutcome();
  const [pushBackId, setPushBackId] = useState<string | null>(null);
  const [pushBackReason, setPushBackReason] = useState('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!standup || !standup.morning_submitted_at) {
    return (
      <p className="py-4 text-center text-sm text-text-faint italic">No standup submitted for this day.</p>
    );
  }

  const carriedOutcomes = standup.outcomes.filter(o => o.is_carried);
  const newOutcomes = standup.outcomes.filter(o => !o.is_carried);
  const hasClosed = !!standup.evening_submitted_at;
  const totalCommittedHours = standup.outcomes.reduce(
    (sum, o) => sum + (o.effort_hours ?? 0),
    0,
  );

  return (
    <div className="space-y-4">
      {/* Morning submission info */}
      <div className="flex items-center gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <Sun className="h-3.5 w-3.5 text-amber-500" />
          Morning: {standup.morning_submitted_at ? format(new Date(standup.morning_submitted_at), 'h:mm a') : '—'}
          {standup.morning_is_late && <span className="ml-1 rounded bg-amber-100 dark:bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">LATE</span>}
        </span>
        {hasClosed && (
          <span className="flex items-center gap-1">
            <Moon className="h-3.5 w-3.5 text-indigo-500" />
            Evening: {standup.evening_submitted_at ? format(new Date(standup.evening_submitted_at), 'h:mm a') : '—'}
            {standup.evening_is_late && <span className="ml-1 rounded bg-amber-100 dark:bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">LATE</span>}
          </span>
        )}
        {totalCommittedHours > 0 && (
          <span
            className="ml-auto rounded-md px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            Committed: {totalCommittedHours}h
          </span>
        )}
      </div>

      {/* Carried outcomes */}
      {carriedOutcomes.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-red-500 dark:text-red-300 flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Carried ({carriedOutcomes.length})
          </p>
          {carriedOutcomes.map((o) => (
            <CarriedOutcomeCard key={o.id} outcome={o} pushBack={pushBack} pushBackId={pushBackId} setPushBackId={setPushBackId} pushBackReason={pushBackReason} setPushBackReason={setPushBackReason} />
          ))}
        </div>
      )}

      {/* New outcomes */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Outcomes ({newOutcomes.length})
        </p>
        {newOutcomes.map((o, idx) => (
          <div key={o.id} className={cn(
            'rounded-lg border px-3 py-2 text-sm',
            hasClosed && o.evening_status === 'done' && 'border-green-200 dark:border-green-500/30 bg-green-50/50 dark:bg-green-500/12',
            hasClosed && o.evening_status === 'not_done' && 'border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/12',
            !hasClosed && 'border-border-color',
          )}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1">
                <span className="mt-0.5 shrink-0 text-xs font-semibold text-text-faint">{idx + 1}.</span>
                <span className="text-text">{o.outcome_text}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {o.effort_hours != null && (
                  <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                    {o.effort_hours}h
                  </span>
                )}
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  o.evening_status === 'done' && 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300',
                  o.evening_status === 'not_done' && 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
                  o.evening_status === 'pending' && 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
                )}>
                  {o.evening_status === 'done' ? 'Done' : o.evening_status === 'not_done' ? 'Not Done' : 'Pending'}
                </span>
                <button
                  type="button"
                  onClick={() => { setPushBackId(o.id); setPushBackReason(''); }}
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-500/15 transition-colors"
                >
                  Push Back
                </button>
              </div>
            </div>
            {o.evening_status === 'not_done' && o.reason_not_done && (
              <p className="ml-5 mt-1 text-xs text-red-600 dark:text-red-300 italic">Reason: {o.reason_not_done}</p>
            )}
            {/* Push back form */}
            {pushBackId === o.id && (
              <div className="mt-2 space-y-2 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/12 p-2">
                <textarea
                  value={pushBackReason}
                  onChange={e => setPushBackReason(e.target.value)}
                  placeholder="Why are you pushing this back? (e.g. 'Too generic — add specific numbers')"
                  rows={2}
                  autoFocus
                  className="w-full rounded border border-amber-200 dark:border-amber-500/30 bg-surface px-2 py-1.5 text-xs resize-none focus:border-amber-400 focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setPushBackId(null)} className="text-xs text-text-muted hover:text-text">Cancel</button>
                  <button
                    type="button"
                    disabled={!pushBackReason.trim() || pushBack.isPending}
                    onClick={() => {
                      pushBack.mutate({ outcomeId: o.id, reason: pushBackReason.trim() }, {
                        onSuccess: () => setPushBackId(null),
                      });
                    }}
                    className="rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {pushBack.isPending ? 'Sending...' : 'Push Back'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dependencies */}
      {standup.dependencies_risks && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300 mb-1">Dependencies / Risks</p>
          <p className="text-sm text-text-muted rounded-lg bg-amber-50/50 dark:bg-amber-500/12 border border-amber-100 dark:border-amber-500/30 px-3 py-2">
            {standup.dependencies_risks}
          </p>
        </div>
      )}

      {/* Evening notes */}
      {standup.evening_notes && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 mb-1">Evening Notes</p>
          <p className="text-sm text-text-muted rounded-lg bg-indigo-50/50 dark:bg-indigo-500/12 border border-indigo-100 dark:border-indigo-500/30 px-3 py-2">
            {standup.evening_notes}
          </p>
        </div>
      )}
    </div>
  );
}

/* ---- Admin Team Overview ---- */

function TeamOverviewSection({ date }: { date: string }) {
  const { data: team, isLoading } = useTeamStandups(date);
  const { data: allUsers } = useUsers();
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  const allSummaries = team ?? [];

  // Get unique departments for filter
  const departments = [...new Set(allSummaries.map(s => s.department).filter(Boolean))].sort();

  // Apply filters
  const summaries = allSummaries.filter(s => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!s.user_name.toLowerCase().includes(q) && !s.department.toLowerCase().includes(q)) return false;
    }
    if (deptFilter !== 'all' && s.department !== deptFilter) return false;
    return true;
  });

  const totalOutcomes = summaries.reduce((s, m) => s + m.total_outcomes, 0);
  const totalDone = summaries.reduce((s, m) => s + m.done_count, 0);
  const totalCarried = summaries.reduce((s, m) => s + m.carried_count, 0);
  const totalStuck = summaries.reduce((s, m) => s + m.stuck_count, 0);
  const morningDone = summaries.filter(s => s.morning_status !== 'not_submitted').length;
  const eveningDone = summaries.filter(s => s.evening_status !== 'not_submitted').length;
  const teamRate = totalOutcomes > 0 ? Math.round((totalDone / totalOutcomes) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Search + Department Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-lg border border-border-color bg-surface px-3 py-1.5 flex-1 min-w-[200px] max-w-xs">
          <Search className="h-3.5 w-3.5 text-text-faint" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or department..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-faint"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="text-text-faint hover:text-text-muted">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="rounded-lg border border-border-color bg-surface px-3 py-1.5 text-sm text-text focus:border-[var(--accent)] focus:outline-none"
        >
          <option value="all">All Departments</option>
          {departments.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        {(searchQuery || deptFilter !== 'all') && (
          <span className="text-xs text-text-muted">{summaries.length} of {allSummaries.length} members</span>
        )}
      </div>

      {/* Team stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border-color bg-surface p-3">
          <p className="text-2xl font-bold text-text">{morningDone}/{summaries.length}</p>
          <p className="text-xs text-text-muted">Morning Done</p>
        </div>
        <div className="rounded-xl border border-border-color bg-surface p-3">
          <p className="text-2xl font-bold text-text">{eveningDone}/{summaries.length}</p>
          <p className="text-xs text-text-muted">Evening Closed</p>
        </div>
        <div className="rounded-xl border border-border-color bg-surface p-3">
          <p className={cn('text-2xl font-bold', teamRate >= 70 ? 'text-green-600 dark:text-green-300' : teamRate >= 40 ? 'text-amber-600 dark:text-amber-300' : 'text-red-600 dark:text-red-300')}>{teamRate}%</p>
          <p className="text-xs text-text-muted">Completion Rate</p>
        </div>
        <div className="rounded-xl border border-border-color bg-surface p-3">
          <p className={cn('text-2xl font-bold', totalStuck > 0 ? 'text-red-600 dark:text-red-300' : 'text-text')}>{totalStuck}</p>
          <p className="text-xs text-text-muted">Stuck Items</p>
        </div>
      </div>

      {/* Team table with expandable rows */}
      <div className="rounded-xl border border-border-color bg-surface shadow-sm">
        <div className="flex items-center gap-3 border-b border-border-color px-6 py-4">
          <div className="rounded-lg p-2" style={{ background: 'var(--accent-soft)' }}>
            <Users className="h-5 w-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text">Team Standups</h2>
            <p className="text-xs text-text-muted">Click a row to see full details</p>
          </div>
        </div>

        {/* Column headers (aligned with row widths below — same grid template) */}
        <div className={cn(TEAM_TABLE_GRID, 'border-b border-border-color bg-hover px-6 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted')}>
          <div className="truncate">Member</div>
          <Tooltip content="Morning standup status. Submissions after 11:00 AM IST are marked Late.">
            <div className="cursor-help">Morning</div>
          </Tooltip>
          <Tooltip content="Evening closure status. Closures after 8:00 PM IST are marked Late.">
            <div className="cursor-help">Evening</div>
          </Tooltip>
          <Tooltip content="Outcomes completed today vs. total committed (done / total).">
            <div className="cursor-help text-center">Outcomes</div>
          </Tooltip>
          <Tooltip content="Outcomes carried over from previous days.">
            <div className="cursor-help text-center">Carried</div>
          </Tooltip>
          <Tooltip content="Outcomes carried for 3 or more days — flagged as stuck.">
            <div className="cursor-help text-center">Stuck</div>
          </Tooltip>
          <Tooltip content="Completion rate: done outcomes ÷ total outcomes for today.">
            <div className="cursor-help text-center">Rate</div>
          </Tooltip>
          <div aria-hidden="true" />
        </div>

        <div className="divide-y divide-border-color">
          {summaries.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-text-faint">
              No team members match the current filter.
            </div>
          )}
          {summaries.map((s) => {
            const user = (allUsers ?? []).find(u => u.id === s.user_id);
            const isExpanded = expandedUserId === s.user_id;
            const hasSubmitted = s.morning_status !== 'not_submitted';

            return (
              <div key={s.user_id}>
                {/* Summary row */}
                <button
                  type="button"
                  onClick={() => setExpandedUserId(isExpanded ? null : s.user_id)}
                  className={cn(
                    TEAM_TABLE_GRID,
                    'w-full px-6 py-3.5 text-left transition-colors',
                    isExpanded ? 'bg-accent-soft' : 'hover:bg-hover',
                    !hasSubmitted && 'opacity-60',
                  )}
                >
                  {/* Member */}
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar fullName={s.user_name} src={user?.avatar_url ?? null} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Tooltip content={s.user_name}>
                        <p className="truncate text-sm font-medium text-text">{s.user_name}</p>
                      </Tooltip>
                      <p className="truncate text-[10px] text-text-faint">{s.department || '—'}</p>
                    </div>
                  </div>

                  {/* Morning status */}
                  <div className="flex items-center">
                    <Badge variant={s.morning_status === 'submitted' ? 'success' : s.morning_status === 'late' ? 'warning' : 'default'}>
                      {s.morning_status === 'submitted' ? 'Done' : s.morning_status === 'late' ? 'Late' : 'Pending'}
                    </Badge>
                  </div>

                  {/* Evening status */}
                  <div className="flex items-center">
                    <Badge variant={s.evening_status === 'submitted' ? 'success' : s.evening_status === 'late' ? 'warning' : 'default'}>
                      {s.evening_status === 'submitted' ? 'Closed' : s.evening_status === 'late' ? 'Late' : 'Pending'}
                    </Badge>
                  </div>

                  {/* Outcomes */}
                  <div className="flex items-center justify-center">
                    {s.total_outcomes > 0 ? (
                      <span className="text-sm">
                        <span className="font-semibold text-green-600 dark:text-green-300">{s.done_count}</span>
                        <span className="text-text-faint">/{s.total_outcomes}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-text-faint">—</span>
                    )}
                  </div>

                  {/* Carried */}
                  <div className="flex items-center justify-center">
                    {s.carried_count > 0 ? (
                      <span className="text-sm font-medium text-amber-600 dark:text-amber-300">{s.carried_count}</span>
                    ) : (
                      <span className="text-xs text-text-faint">0</span>
                    )}
                  </div>

                  {/* Stuck */}
                  <div className="flex items-center justify-center">
                    {s.stuck_count > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-red-600 dark:text-red-300">
                        <Flame className="h-3.5 w-3.5" />{s.stuck_count}
                      </span>
                    ) : (
                      <span className="text-xs text-text-faint">0</span>
                    )}
                  </div>

                  {/* Rate */}
                  <div className="flex items-center justify-center">
                    {s.total_outcomes > 0 ? (
                      <span className={cn(
                        'text-sm font-semibold',
                        s.completion_rate >= 80 && 'text-green-600 dark:text-green-300',
                        s.completion_rate >= 50 && s.completion_rate < 80 && 'text-amber-600 dark:text-amber-300',
                        s.completion_rate < 50 && 'text-red-600 dark:text-red-300',
                      )}>
                        {s.completion_rate}%
                      </span>
                    ) : (
                      <span className="text-xs text-text-faint">—</span>
                    )}
                  </div>

                  {/* Expand indicator */}
                  <div className="flex items-center justify-end">
                    <ChevronRight className={cn(
                      'h-4 w-4 text-text-faint transition-transform',
                      isExpanded && 'rotate-90',
                    )} />
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border-color bg-canvas px-6 py-4">
                    <MemberStandupDetail userId={s.user_id} date={date} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---- Main Page Content ---- */

function StandupsContent() {
  const { currentUser, isLoading: userLoading } = useCurrentUser();
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

  // Pass an empty userId on the Team tab so the My-Standup queries
  // skip (their `enabled` flag drops to false). Saves two round-trips
  // for admins who only ever look at Team Overview.
  const myStandupUserId = tab === 'my' ? currentUser.id : '';
  const { data: standup, isLoading: standupLoading } = useStandupByDate(
    myStandupUserId,
    viewDate,
  );
  const { data: carriedOutcomes } = useCarriedOutcomes(myStandupUserId);

  const formattedDate = useMemo(() => {
    try {
      return format(new Date(viewDate + 'T00:00:00'), 'EEEE, dd MMM yyyy');
    } catch {
      return viewDate;
    }
  }, [viewDate]);

  if (userLoading) {
    return (
      <RefinedAppShell>
        <div className="flex h-full items-center justify-center bg-canvas">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      </RefinedAppShell>
    );
  }

  const adminTabs: PageTab[] | undefined = userIsAdmin
    ? [{ id: 'my', label: 'My Standup' }, { id: 'team', label: 'Team Overview' }]
    : undefined;

  // Date navigator + Today chip rendered inside the page header right slot
  // so the title/subtitle live in their canonical zone.
  const headerRight = (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setDateOffset(d => d - 1)}
        disabled={dateOffset <= -30}
        aria-label="Previous day"
        className="rounded-md p-1 text-text-faint transition-colors hover:bg-hover hover:text-text disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <p className="min-w-[170px] text-center text-[12.5px] text-text-muted">{formattedDate}</p>
      <button
        type="button"
        onClick={() => setDateOffset(d => d + 1)}
        disabled={dateOffset >= 0}
        aria-label="Next day"
        className="rounded-md p-1 text-text-faint transition-colors hover:bg-hover hover:text-text disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {!isToday && (
        <button
          type="button"
          onClick={() => setDateOffset(0)}
          className="ml-1 rounded-md bg-accent-soft px-2 py-0.5 text-[11.5px] font-semibold text-[var(--accent)] transition-colors hover:bg-[color:rgba(0,115,234,0.18)]"
        >
          Today
        </button>
      )}
    </div>
  );

  return (
    <RefinedAppShell>
      <RefinedPageHeader
        title="Daily Standup"
        subtitle="Commit each morning, close each evening"
        tabs={adminTabs}
        activeTab={tab}
        onTabChange={(id) => setTab(id as 'my' | 'team')}
        rightSlot={headerRight}
      />

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {tab === 'my' ? (
          standupLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
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
                <EveningSection
                  standup={standup}
                  currentUserId={currentUser.id}
                  carriedOutcomes={isToday ? (carriedOutcomes ?? []) : []}
                />
              )}
            </div>
          )
        ) : (
          <TeamOverviewSection date={viewDate} />
        )}
      </div>
    </RefinedAppShell>
  );
}

export default function StandupsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      }
    >
      <StandupsContent />
    </Suspense>
  );
}
