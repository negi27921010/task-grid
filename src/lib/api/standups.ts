import { v4 as uuidv4 } from 'uuid';
import { createClient } from '../supabase';
import type {
  DailyStandup,
  StandupOutcome,
  StandupComment,
  CreateMorningStandupInput,
  UpdateMorningStandupInput,
  EveningClosureInput,
  TeamStandupSummary,
  OutcomeEveningStatus,
} from '../types';

function sb() {
  return createClient();
}

/* ---- IST helpers ---- */

function getCurrentIST(): Date {
  const now = new Date();
  // UTC offset for IST is +5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset);
}

export function getTodayIST(): string {
  const ist = getCurrentIST();
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getISTHour(): number {
  return getCurrentIST().getUTCHours();
}

/* ---- Row mappers ---- */

function mapOutcomeRow(
  row: Record<string, unknown>,
  comments: StandupComment[] = [],
): StandupOutcome {
  return {
    id: row.id as string,
    standup_id: row.standup_id as string,
    outcome_text: row.outcome_text as string,
    priority_order: row.priority_order as number,
    is_carried: row.is_carried as boolean,
    carried_from_outcome_id: (row.carried_from_outcome_id as string) ?? null,
    carry_streak: row.carry_streak as number,
    evening_status: row.evening_status as OutcomeEveningStatus,
    reason_not_done: (row.reason_not_done as string) ?? null,
    closed_at: (row.closed_at as string) ?? null,
    effort_hours: (row.effort_hours as number) ?? null,
    created_at: row.created_at as string,
    comments,
  };
}

function mapStandupRow(
  row: Record<string, unknown>,
  outcomes: StandupOutcome[] = [],
): DailyStandup {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    standup_date: row.standup_date as string,
    morning_submitted_at: (row.morning_submitted_at as string) ?? null,
    morning_is_late: row.morning_is_late as boolean,
    dependencies_risks: (row.dependencies_risks as string) ?? null,
    evening_submitted_at: (row.evening_submitted_at as string) ?? null,
    evening_is_late: row.evening_is_late as boolean,
    evening_notes: (row.evening_notes as string) ?? null,
    evening_auto_closed: row.evening_auto_closed as boolean,
    created_at: row.created_at as string,
    outcomes,
  };
}

/* ---- Queries ---- */

function mapCommentRow(row: Record<string, unknown>): StandupComment {
  return {
    id: row.id as string,
    outcome_id: row.outcome_id as string,
    author_id: row.author_id as string,
    content: row.content as string,
    created_at: row.created_at as string,
  };
}

async function fetchOutcomes(standupId: string): Promise<StandupOutcome[]> {
  const { data, error } = await sb()
    .from('standup_outcomes')
    .select('*')
    .eq('standup_id', standupId)
    .order('is_carried', { ascending: false })
    .order('priority_order', { ascending: true });
  if (error) throw error;

  const outcomeIds = (data ?? []).map(r => r.id as string);
  let commentsMap: Record<string, StandupComment[]> = {};

  if (outcomeIds.length > 0) {
    try {
      const { data: commentRows } = await sb()
        .from('standup_comments')
        .select('*')
        .in('outcome_id', outcomeIds)
        .order('created_at', { ascending: true });

      for (const row of commentRows ?? []) {
        const oid = row.outcome_id as string;
        if (!commentsMap[oid]) commentsMap[oid] = [];
        commentsMap[oid].push(mapCommentRow(row));
      }
    } catch {
      // standup_comments table may not exist yet — graceful fallback
    }
  }

  return (data ?? []).map(r => mapOutcomeRow(r, commentsMap[r.id as string] ?? []));
}

export async function getStandupByDate(
  userId: string,
  date: string,
): Promise<DailyStandup | null> {
  const { data, error } = await sb()
    .from('daily_standups')
    .select('*')
    .eq('user_id', userId)
    .eq('standup_date', date)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const outcomes = await fetchOutcomes(data.id as string);
  return mapStandupRow(data, outcomes);
}

export async function getCarriedOutcomes(
  userId: string,
): Promise<StandupOutcome[]> {
  const today = getTodayIST();

  // Find most recent standup before today
  const { data: prevStandup, error: psErr } = await sb()
    .from('daily_standups')
    .select('id')
    .eq('user_id', userId)
    .lt('standup_date', today)
    .order('standup_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (psErr) throw psErr;
  if (!prevStandup) return [];

  // Get outcomes that were not completed (not_done OR still pending)
  const { data, error } = await sb()
    .from('standup_outcomes')
    .select('*')
    .eq('standup_id', prevStandup.id as string)
    .in('evening_status', ['not_done', 'pending'])
    .order('priority_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(r => mapOutcomeRow(r));
}

/* ---- Mutations ---- */

export async function createMorningStandup(
  input: CreateMorningStandupInput,
): Promise<DailyStandup> {
  const standupId = uuidv4();
  const now = new Date().toISOString();
  const istHour = getISTHour();
  const isLate = istHour >= 10;

  // Insert standup row
  const { data: standupRow, error: sErr } = await sb()
    .from('daily_standups')
    .insert({
      id: standupId,
      user_id: input.user_id,
      standup_date: input.standup_date,
      morning_submitted_at: now,
      morning_is_late: isLate,
      dependencies_risks: input.dependencies_risks ?? null,
    })
    .select()
    .single();
  if (sErr) throw sErr;

  // Insert carried outcomes first
  let orderCounter = 1;
  for (const carriedId of input.carried_outcome_ids) {
    const { data: origOutcome } = await sb()
      .from('standup_outcomes')
      .select('*')
      .eq('id', carriedId)
      .single();

    if (origOutcome) {
      await sb()
        .from('standup_outcomes')
        .insert({
          id: uuidv4(),
          standup_id: standupId,
          outcome_text: origOutcome.outcome_text as string,
          priority_order: orderCounter,
          is_carried: true,
          carried_from_outcome_id: carriedId,
          carry_streak: ((origOutcome.carry_streak as number) ?? 0) + 1,
          evening_status: 'pending',
        });
      orderCounter++;
    }
  }

  // Insert new outcomes
  for (const outcome of input.outcomes) {
    const row: Record<string, unknown> = {
      id: uuidv4(),
      standup_id: standupId,
      outcome_text: outcome.outcome_text,
      priority_order: orderCounter,
      is_carried: false,
      carry_streak: 0,
      evening_status: 'pending',
    };
    // effort_hours column may not exist yet
    if ('effort_hours' in outcome && outcome.effort_hours != null) {
      row.effort_hours = outcome.effort_hours;
    }
    const { error: insertErr } = await sb().from('standup_outcomes').insert(row);
    if (insertErr) {
      // If effort_hours column doesn't exist, retry without it
      if (insertErr.message?.includes('effort_hours')) {
        delete row.effort_hours;
        await sb().from('standup_outcomes').insert(row);
      } else {
        throw insertErr;
      }
    }
    orderCounter++;
  }

  const outcomes = await fetchOutcomes(standupId);
  return mapStandupRow(standupRow, outcomes);
}

export async function updateMorningStandup(
  standupId: string,
  input: UpdateMorningStandupInput,
): Promise<DailyStandup> {
  // Update dependencies
  const { error: sErr } = await sb()
    .from('daily_standups')
    .update({ dependencies_risks: input.dependencies_risks ?? null })
    .eq('id', standupId);
  if (sErr) throw sErr;

  // Delete existing non-carried outcomes (carried are read-only)
  const { error: dErr } = await sb()
    .from('standup_outcomes')
    .delete()
    .eq('standup_id', standupId)
    .eq('is_carried', false);
  if (dErr) throw dErr;

  // Get current carried outcomes to determine order offset
  const { data: carried } = await sb()
    .from('standup_outcomes')
    .select('id')
    .eq('standup_id', standupId)
    .eq('is_carried', true);
  const carriedCount = (carried ?? []).length;

  // Insert updated new outcomes
  for (const outcome of input.outcomes) {
    const row: Record<string, unknown> = {
      id: outcome.id ?? uuidv4(),
      standup_id: standupId,
      outcome_text: outcome.outcome_text,
      priority_order: carriedCount + outcome.priority_order,
      is_carried: false,
      carry_streak: 0,
      evening_status: 'pending',
    };
    if ('effort_hours' in outcome && outcome.effort_hours != null) {
      row.effort_hours = outcome.effort_hours;
    }
    const { error: iErr } = await sb().from('standup_outcomes').insert(row);
    if (iErr && iErr.message?.includes('effort_hours')) {
      delete row.effort_hours;
      await sb().from('standup_outcomes').insert(row);
    } else if (iErr) {
      throw iErr;
    }
  }

  const { data: standupRow, error: fErr } = await sb()
    .from('daily_standups')
    .select('*')
    .eq('id', standupId)
    .single();
  if (fErr) throw fErr;

  const outcomes = await fetchOutcomes(standupId);
  return mapStandupRow(standupRow, outcomes);
}

export async function submitEveningClosure(
  standupId: string,
  input: EveningClosureInput,
): Promise<DailyStandup> {
  const now = new Date().toISOString();
  const istHour = getISTHour();
  const isLate = istHour >= 20;

  // Update standup row
  const { error: sErr } = await sb()
    .from('daily_standups')
    .update({
      evening_submitted_at: now,
      evening_is_late: isLate,
      evening_notes: input.evening_notes ?? null,
    })
    .eq('id', standupId);
  if (sErr) throw sErr;

  // Update each outcome
  for (const o of input.outcomes) {
    const updates: Record<string, unknown> = {
      evening_status: o.evening_status,
    };
    if (o.evening_status === 'not_done') {
      updates.reason_not_done = o.reason_not_done ?? null;
    } else {
      updates.reason_not_done = null;
    }
    const { error } = await sb()
      .from('standup_outcomes')
      .update(updates)
      .eq('id', o.id);
    if (error) throw error;
  }

  const { data: standupRow, error: fErr } = await sb()
    .from('daily_standups')
    .select('*')
    .eq('id', standupId)
    .single();
  if (fErr) throw fErr;

  const outcomes = await fetchOutcomes(standupId);
  return mapStandupRow(standupRow, outcomes);
}

/* ---- Admin queries ---- */

export async function getTeamStandups(
  date: string,
): Promise<TeamStandupSummary[]> {
  // Get all non-admin users (admins don't fill daily standups)
  const { data: users, error: uErr } = await sb()
    .from('users')
    .select('id, full_name, department, role')
    .eq('role', 'member')
    .order('full_name', { ascending: true });
  if (uErr) throw uErr;

  // Get all standups for the date
  const { data: standups, error: sErr } = await sb()
    .from('daily_standups')
    .select('*')
    .eq('standup_date', date);
  if (sErr) throw sErr;

  const standupIds = (standups ?? []).map(s => s.id as string);
  let allOutcomes: StandupOutcome[] = [];

  if (standupIds.length > 0) {
    const { data: outcomeRows, error: oErr } = await sb()
      .from('standup_outcomes')
      .select('*')
      .in('standup_id', standupIds);
    if (oErr) throw oErr;
    allOutcomes = (outcomeRows ?? []).map(r => mapOutcomeRow(r));
  }

  return (users ?? []).map((u) => {
    const standup = (standups ?? []).find(
      s => (s.user_id as string) === (u.id as string),
    );

    if (!standup) {
      return {
        user_id: u.id as string,
        user_name: u.full_name as string,
        department: (u.department as string) ?? '',
        standup_date: date,
        morning_status: 'not_submitted' as const,
        evening_status: 'not_submitted' as const,
        total_outcomes: 0,
        done_count: 0,
        not_done_count: 0,
        carried_count: 0,
        stuck_count: 0,
        completion_rate: 0,
      };
    }

    const outcomes = allOutcomes.filter(o => o.standup_id === (standup.id as string));
    const doneCount = outcomes.filter(o => o.evening_status === 'done').length;
    const notDoneCount = outcomes.filter(o => o.evening_status === 'not_done').length;
    const carriedCount = outcomes.filter(o => o.is_carried).length;
    const stuckCount = outcomes.filter(o => o.carry_streak >= 3).length;
    const total = outcomes.length;

    let morningStatus: 'not_submitted' | 'submitted' | 'late' = 'not_submitted';
    if (standup.morning_submitted_at) {
      morningStatus = (standup.morning_is_late as boolean) ? 'late' : 'submitted';
    }

    let eveningStatus: 'not_submitted' | 'submitted' | 'late' = 'not_submitted';
    if (standup.evening_submitted_at) {
      eveningStatus = (standup.evening_is_late as boolean) ? 'late' : 'submitted';
    }

    return {
      user_id: u.id as string,
      user_name: u.full_name as string,
      department: (u.department as string) ?? '',
      standup_date: date,
      morning_status: morningStatus,
      evening_status: eveningStatus,
      total_outcomes: total,
      done_count: doneCount,
      not_done_count: notDoneCount,
      carried_count: carriedCount,
      stuck_count: stuckCount,
      completion_rate: total > 0 ? Math.round((doneCount / total) * 100) : 0,
    };
  });
}

export async function getStandupHistory(
  userId: string,
  startDate: string,
  endDate: string,
): Promise<DailyStandup[]> {
  const { data: standups, error: sErr } = await sb()
    .from('daily_standups')
    .select('*')
    .eq('user_id', userId)
    .gte('standup_date', startDate)
    .lte('standup_date', endDate)
    .order('standup_date', { ascending: false });
  if (sErr) throw sErr;

  const results: DailyStandup[] = [];
  for (const s of standups ?? []) {
    const outcomes = await fetchOutcomes(s.id as string);
    results.push(mapStandupRow(s, outcomes));
  }
  return results;
}

/* ---- Per-outcome operations ---- */

// Default false — column doesn't exist until migration 005 is run
let hasClosedAtColumn = false;

export async function updateOutcomeStatus(
  outcomeId: string,
  status: OutcomeEveningStatus,
  reason?: string,
): Promise<void> {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    evening_status: status,
  };
  if (hasClosedAtColumn) {
    updates.closed_at = status !== 'pending' ? now : null;
  }
  if (status === 'not_done') {
    updates.reason_not_done = reason ?? null;
  } else {
    updates.reason_not_done = null;
  }

  const { error } = await sb()
    .from('standup_outcomes')
    .update(updates)
    .eq('id', outcomeId);
  if (error) throw error;

  // Check if all outcomes in this standup are now resolved → auto-set evening_submitted_at
  const { data: outcome } = await sb()
    .from('standup_outcomes')
    .select('standup_id')
    .eq('id', outcomeId)
    .single();
  if (!outcome) return;

  const { data: siblings } = await sb()
    .from('standup_outcomes')
    .select('evening_status')
    .eq('standup_id', outcome.standup_id as string);

  const allResolved = (siblings ?? []).every(
    s => (s.evening_status as string) !== 'pending',
  );

  if (allResolved) {
    await sb()
      .from('daily_standups')
      .update({
        evening_submitted_at: now,
        evening_is_late: getISTHour() >= 20,
      })
      .eq('id', outcome.standup_id as string)
      .is('evening_submitted_at', null);
  }
}

export async function pushBackOutcome(
  outcomeId: string,
  reason: string,
): Promise<void> {
  // Get outcome details for notification
  const { data: outcomeData } = await sb()
    .from('standup_outcomes')
    .select('standup_id, outcome_text')
    .eq('id', outcomeId)
    .single();

  // Reset outcome to pending so member must re-address it
  const { error } = await sb()
    .from('standup_outcomes')
    .update({
      evening_status: 'pending',
      reason_not_done: `[PUSHED BACK] ${reason}`,
    })
    .eq('id', outcomeId);
  if (error) throw error;

  if (outcomeData) {
    // Reset the standup's evening_submitted_at
    await sb()
      .from('daily_standups')
      .update({ evening_submitted_at: null })
      .eq('id', outcomeData.standup_id as string);

    // Send notification to the member
    const { data: standup } = await sb()
      .from('daily_standups')
      .select('user_id')
      .eq('id', outcomeData.standup_id as string)
      .single();

    if (standup) {
      try {
        const { v4: uuidv4_notif } = await import('uuid');
        await sb().from('notifications').insert({
          id: uuidv4_notif(),
          user_id: standup.user_id as string,
          type: 'status_change',
          title: `Outcome pushed back: "${(outcomeData.outcome_text as string).slice(0, 50)}"`,
          body: reason,
          task_id: null,
          project_id: null,
        });
      } catch {
        // Notification creation is best-effort
      }
    }
  }
}

export async function addStandupComment(
  outcomeId: string,
  authorId: string,
  content: string,
): Promise<StandupComment | null> {
  const row = {
    id: uuidv4(),
    outcome_id: outcomeId,
    author_id: authorId,
    content,
  };
  try {
    const { data, error } = await sb()
      .from('standup_comments')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return mapCommentRow(data);
  } catch {
    // standup_comments table may not exist until migration 005 is run
    throw new Error('Comments feature requires a database update. Please contact your admin.');
  }
}
