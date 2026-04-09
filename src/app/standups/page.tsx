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
  Plus,
  Send,
  MessageSquare,
  Search,
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
  useUpdateOutcomeStatus,
  useAddStandupComment,
  usePushBackOutcome,
} from '@/lib/hooks/use-standups';
import { getTodayIST, getISTHour } from '@/lib/api/standups';
import { cn } from '@/lib/utils/cn';
import { formatDistanceToNow } from 'date-fns';
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
  const [outcomes, setOutcomes] = useState<string[]>(['']);
  const [effortHours, setEffortHours] = useState<(number | null)[]>([null]);
  const [deps, setDeps] = useState('');
  const [errors, setErrors] = useState<(string | null)[]>([null]);
  const createStandup = useCreateMorningStandup();
  const updateStandup = useUpdateMorningStandup();

  const isSubmitted = !!standup?.morning_submitted_at;
  const canEdit = isSubmitted; // Members can edit anytime
  const showForm = !isSubmitted || isEditing;

  // Pre-fill when editing
  const handleStartEdit = useCallback(() => {
    if (standup) {
      const newOutcomes = standup.outcomes
        .filter(o => !o.is_carried)
        .map(o => o.outcome_text);
      if (newOutcomes.length === 0) newOutcomes.push('');
      setOutcomes(newOutcomes);
      setDeps(standup.dependencies_risks ?? '');
      setErrors(newOutcomes.map(() => null));
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

  const handleAddOutcome = () => {
    setOutcomes(prev => [...prev, '']);
    setEffortHours(prev => [...prev, null]);
    setErrors(prev => [...prev, null]);
  };

  const handleRemoveOutcome = (idx: number) => {
    if (outcomes.length <= 1) return;
    setOutcomes(prev => prev.filter((_, i) => i !== idx));
    setEffortHours(prev => prev.filter((_, i) => i !== idx));
    setErrors(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    const filledOutcomes = outcomes.filter(o => o.trim());
    if (filledOutcomes.length === 0) return;

    // Validate all
    const newErrors = outcomes.map(o => (o.trim() ? validateOutcome(o) : null));
    const hasError = filledOutcomes.some((o) => validateOutcome(o) !== null);
    setErrors(newErrors);
    if (hasError) return;

    // Map effort hours to filled outcomes (preserve index mapping)
    const filledWithHours = outcomes
      .map((text, idx) => ({ text, hours: effortHours[idx] }))
      .filter(o => o.text.trim());

    if (isEditing && standup) {
      updateStandup.mutate({
        id: standup.id,
        input: {
          outcomes: filledWithHours.map((o, i) => ({
            outcome_text: o.text.trim(),
            priority_order: i + 1,
            effort_hours: o.hours,
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
        outcomes: filledWithHours.map((o, i) => ({
          outcome_text: o.text.trim(),
          priority_order: i + 1,
          effort_hours: o.hours,
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
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Today&apos;s Outcomes (at least 1 required)
              </p>
              <button
                type="button"
                onClick={handleAddOutcome}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" /> Add Outcome
              </button>
            </div>
            {outcomes.map((text, idx) => (
              <div key={idx}>
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs font-semibold text-slate-400 w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={text}
                    onChange={e => handleOutcomeChange(idx, e.target.value)}
                    maxLength={500}
                    placeholder={idx === 0 ? 'e.g. Complete 10 school registrations for Gujarat' : 'Next measurable outcome...'}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                      errors[idx] ? 'border-red-300 bg-red-50/50 focus:border-red-400' : 'border-slate-300 focus:border-blue-500'
                    )}
                    disabled={isPending}
                  />
                  <input
                    type="number"
                    value={effortHours[idx] ?? ''}
                    onChange={e => {
                      const val = e.target.value ? parseFloat(e.target.value) : null;
                      setEffortHours(prev => { const n = [...prev]; n[idx] = val; return n; });
                    }}
                    placeholder="Hrs"
                    min={0}
                    max={24}
                    step={0.5}
                    className="w-16 shrink-0 rounded-lg border border-slate-300 px-2 py-2 text-xs text-center focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    disabled={isPending}
                  />
                  {outcomes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOutcome(idx)}
                      className="shrink-0 rounded p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                      disabled={isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
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
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      {outcome.comments.length > 0 && (
        <div className="space-y-2">
          {outcome.comments.map((c) => {
            const author = (allUsers ?? []).find(u => u.id === c.author_id);
            return (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar fullName={author?.full_name ?? '?'} src={author?.avatar_url ?? null} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700">{author?.full_name ?? 'Unknown'}</span>
                    <span className="text-[10px] text-slate-400">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                  </div>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">{c.content}</p>
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
      isClosed && outcome.evening_status === 'done' && 'border-green-200 bg-green-50/30',
      isClosed && outcome.evening_status === 'not_done' && 'border-red-200 bg-red-50/30',
      !isClosed && 'border-slate-200',
    )}>
      {/* Outcome text + status controls */}
      <div className="flex items-start gap-3">
        {outcome.is_carried && <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-800">{outcome.outcome_text}</p>
          {outcome.is_carried && outcome.carry_streak >= 3 && (
            <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
              <Flame className="h-3 w-3" /> STUCK {outcome.carry_streak} days
            </span>
          )}
        </div>

        {/* Status controls */}
        {isClosed ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              'rounded-full px-2.5 py-1 text-xs font-semibold',
              outcome.evening_status === 'done' && 'bg-green-100 text-green-700',
              outcome.evening_status === 'not_done' && 'bg-red-100 text-red-700',
            )}>
              {outcome.evening_status === 'done' ? 'Done' : 'Not Done'}
            </span>
            {outcome.closed_at && (
              <span className="text-[10px] text-slate-400">
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
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
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
            className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm resize-none focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowReasonForm(false); setReason(''); }}
              className="rounded-md px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
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
        <p className="mt-2 text-xs text-red-600 italic">Reason: {outcome.reason_not_done}</p>
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
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-2">
            <Moon className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Evening Closure</h2>
            <p className="text-xs text-slate-500">
              {allClosed
                ? `All ${totalCount} outcomes resolved`
                : `${closedCount}/${totalCount} outcomes resolved — mark each individually`}
            </p>
          </div>
        </div>
        {allClosed && <Badge variant="success">Day Closed</Badge>}
        {!allClosed && closedCount > 0 && (
          <span className="text-xs font-medium text-amber-600">{closedCount}/{totalCount}</span>
        )}
      </div>

      <div className="px-6 py-5 space-y-4">
        {allOutcomes.map((o) => (
          <OutcomeCard key={o.id} outcome={o} currentUserId={currentUserId} />
        ))}

        {/* Evening notes / dependencies */}
        {standup.dependencies_risks && (
          <div className="rounded-lg border border-amber-100 bg-amber-50/50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1">Dependencies / Risks</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{standup.dependencies_risks}</p>
          </div>
        )}
        {standup.evening_notes && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 mb-1">Evening Remarks</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{standup.evening_notes}</p>
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
      hasClosed && o.evening_status === 'done' && 'border-green-200 bg-green-50/50',
      hasClosed && o.evening_status === 'not_done' && 'border-red-200 bg-red-50/50',
      !hasClosed && 'border-red-100 bg-red-50/30',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <div className="flex-1 min-w-0">
            <span className="text-slate-800">{o.outcome_text}</span>
            {o.carry_streak >= 3 && (
              <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-700">
                <Flame className="h-2.5 w-2.5" /> STUCK {o.carry_streak}d
              </span>
            )}
            {o.carry_streak > 0 && o.carry_streak < 3 && (
              <span className="ml-2 text-[10px] text-red-400">Carried {o.carry_streak}d</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            o.evening_status === 'done' && 'bg-green-100 text-green-700',
            o.evening_status === 'not_done' && 'bg-red-100 text-red-700',
            o.evening_status === 'pending' && 'bg-amber-100 text-amber-700',
          )}>
            {o.evening_status === 'done' ? 'Done' : o.evening_status === 'not_done' ? 'Not Done' : 'Pending'}
          </span>
          {/* Expand reason toggle */}
          {(o.reason_not_done || o.carry_streak > 0) && (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="rounded px-1.5 py-0.5 text-[10px] text-slate-500 border border-slate-200 hover:bg-slate-50"
            >
              {expanded ? 'Hide' : 'Details'}
            </button>
          )}
          {/* Push back button — available on all outcomes */}
          <button
            type="button"
            onClick={() => { setPushBackId(o.id); setPushBackReason(''); }}
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-600 border border-amber-200 hover:bg-amber-50"
          >
              Push Back
            </button>
        </div>
      </div>

      {/* Expandable reason */}
      {expanded && o.reason_not_done && (
        <p className="ml-5 mt-2 text-xs text-red-600 italic border-l-2 border-red-200 pl-2">
          {o.reason_not_done}
        </p>
      )}

      {/* Push back form */}
      {pushBackId === o.id && (
        <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2">
          <textarea
            value={pushBackReason}
            onChange={e => setPushBackReason(e.target.value)}
            placeholder="Why are you pushing this back?"
            rows={2}
            autoFocus
            className="w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-xs resize-none focus:border-amber-400 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPushBackId(null)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
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
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!standup || !standup.morning_submitted_at) {
    return (
      <p className="py-4 text-center text-sm text-slate-400 italic">No standup submitted for this day.</p>
    );
  }

  const carriedOutcomes = standup.outcomes.filter(o => o.is_carried);
  const newOutcomes = standup.outcomes.filter(o => !o.is_carried);
  const hasClosed = !!standup.evening_submitted_at;

  return (
    <div className="space-y-4">
      {/* Morning submission info */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Sun className="h-3.5 w-3.5 text-amber-500" />
          Morning: {standup.morning_submitted_at ? format(new Date(standup.morning_submitted_at), 'h:mm a') : '—'}
          {standup.morning_is_late && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">LATE</span>}
        </span>
        {hasClosed && (
          <span className="flex items-center gap-1">
            <Moon className="h-3.5 w-3.5 text-indigo-500" />
            Evening: {standup.evening_submitted_at ? format(new Date(standup.evening_submitted_at), 'h:mm a') : '—'}
            {standup.evening_is_late && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">LATE</span>}
          </span>
        )}
      </div>

      {/* Carried outcomes */}
      {carriedOutcomes.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-red-500 flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Carried ({carriedOutcomes.length})
          </p>
          {carriedOutcomes.map((o) => (
            <CarriedOutcomeCard key={o.id} outcome={o} pushBack={pushBack} pushBackId={pushBackId} setPushBackId={setPushBackId} pushBackReason={pushBackReason} setPushBackReason={setPushBackReason} />
          ))}
        </div>
      )}

      {/* New outcomes */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Outcomes ({newOutcomes.length})
        </p>
        {newOutcomes.map((o, idx) => (
          <div key={o.id} className={cn(
            'rounded-lg border px-3 py-2 text-sm',
            hasClosed && o.evening_status === 'done' && 'border-green-200 bg-green-50/50',
            hasClosed && o.evening_status === 'not_done' && 'border-red-200 bg-red-50/50',
            !hasClosed && 'border-slate-100',
          )}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1">
                <span className="mt-0.5 shrink-0 text-xs font-semibold text-slate-400">{idx + 1}.</span>
                <span className="text-slate-800">{o.outcome_text}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  o.evening_status === 'done' && 'bg-green-100 text-green-700',
                  o.evening_status === 'not_done' && 'bg-red-100 text-red-700',
                  o.evening_status === 'pending' && 'bg-amber-100 text-amber-700',
                )}>
                  {o.evening_status === 'done' ? 'Done' : o.evening_status === 'not_done' ? 'Not Done' : 'Pending'}
                </span>
                <button
                  type="button"
                  onClick={() => { setPushBackId(o.id); setPushBackReason(''); }}
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-600 border border-amber-200 hover:bg-amber-50 transition-colors"
                >
                  Push Back
                </button>
              </div>
            </div>
            {o.evening_status === 'not_done' && o.reason_not_done && (
              <p className="ml-5 mt-1 text-xs text-red-600 italic">Reason: {o.reason_not_done}</p>
            )}
            {/* Push back form */}
            {pushBackId === o.id && (
              <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-2">
                <textarea
                  value={pushBackReason}
                  onChange={e => setPushBackReason(e.target.value)}
                  placeholder="Why are you pushing this back? (e.g. 'Too generic — add specific numbers')"
                  rows={2}
                  autoFocus
                  className="w-full rounded border border-amber-200 bg-white px-2 py-1.5 text-xs resize-none focus:border-amber-400 focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setPushBackId(null)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 mb-1">Dependencies / Risks</p>
          <p className="text-sm text-slate-600 rounded-lg bg-amber-50/50 border border-amber-100 px-3 py-2">
            {standup.dependencies_risks}
          </p>
        </div>
      )}

      {/* Evening notes */}
      {standup.evening_notes && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 mb-1">Evening Notes</p>
          <p className="text-sm text-slate-600 rounded-lg bg-indigo-50/50 border border-indigo-100 px-3 py-2">
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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
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
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 flex-1 min-w-[200px] max-w-xs">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or department..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Departments</option>
          {departments.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        {(searchQuery || deptFilter !== 'all') && (
          <span className="text-xs text-slate-500">{summaries.length} of {allSummaries.length} members</span>
        )}
      </div>

      {/* Team stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-2xl font-bold text-slate-900">{morningDone}/{summaries.length}</p>
          <p className="text-xs text-slate-500">Morning Done</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-2xl font-bold text-slate-900">{eveningDone}/{summaries.length}</p>
          <p className="text-xs text-slate-500">Evening Closed</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className={cn('text-2xl font-bold', teamRate >= 70 ? 'text-green-600' : teamRate >= 40 ? 'text-amber-600' : 'text-red-600')}>{teamRate}%</p>
          <p className="text-xs text-slate-500">Completion Rate</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className={cn('text-2xl font-bold', totalStuck > 0 ? 'text-red-600' : 'text-slate-900')}>{totalStuck}</p>
          <p className="text-xs text-slate-500">Stuck Items</p>
        </div>
      </div>

      {/* Team table with expandable rows */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="rounded-lg bg-blue-50 p-2">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Team Standups</h2>
            <p className="text-xs text-slate-500">Click a row to see full details</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
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
                    'w-full flex items-center gap-4 px-6 py-3.5 text-left transition-colors',
                    isExpanded ? 'bg-blue-50/50' : 'hover:bg-slate-50/50',
                    !hasSubmitted && 'opacity-60',
                  )}
                >
                  {/* Member */}
                  <div className="flex items-center gap-2.5 min-w-[160px]">
                    <Avatar fullName={s.user_name} src={user?.avatar_url ?? null} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{s.user_name}</p>
                      <p className="text-[10px] text-slate-400">{s.department}</p>
                    </div>
                  </div>

                  {/* Morning status */}
                  <div className="w-20">
                    <Badge variant={s.morning_status === 'submitted' ? 'success' : s.morning_status === 'late' ? 'warning' : 'default'}>
                      {s.morning_status === 'submitted' ? 'Done' : s.morning_status === 'late' ? 'Late' : 'Pending'}
                    </Badge>
                  </div>

                  {/* Evening status */}
                  <div className="w-20">
                    <Badge variant={s.evening_status === 'submitted' ? 'success' : s.evening_status === 'late' ? 'warning' : 'default'}>
                      {s.evening_status === 'submitted' ? 'Closed' : s.evening_status === 'late' ? 'Late' : 'Pending'}
                    </Badge>
                  </div>

                  {/* Outcomes */}
                  <div className="w-16 text-center">
                    {s.total_outcomes > 0 ? (
                      <span className="text-sm">
                        <span className="font-semibold text-green-600">{s.done_count}</span>
                        <span className="text-slate-400">/{s.total_outcomes}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>

                  {/* Carried */}
                  <div className="w-12 text-center">
                    {s.carried_count > 0 ? (
                      <span className="text-sm font-medium text-amber-600">{s.carried_count}</span>
                    ) : (
                      <span className="text-xs text-slate-300">0</span>
                    )}
                  </div>

                  {/* Stuck */}
                  <div className="w-12 text-center">
                    {s.stuck_count > 0 ? (
                      <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-red-600">
                        <Flame className="h-3.5 w-3.5" />{s.stuck_count}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">0</span>
                    )}
                  </div>

                  {/* Rate */}
                  <div className="w-14 text-center">
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
                  </div>

                  {/* Expand indicator */}
                  <div className="ml-auto">
                    <ChevronRight className={cn(
                      'h-4 w-4 text-slate-400 transition-transform',
                      isExpanded && 'rotate-90',
                    )} />
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/30 px-6 py-4">
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
