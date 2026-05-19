// Server-only — shared standup nudge runners. Used by both the cron
// dispatcher (/api/cron/dispatch) and the admin one-shot nudge endpoint
// (/api/standups/nudge). Pulling them out of the cron route lets the
// nudge endpoint call them directly instead of HTTP-bouncing through
// the dispatcher (which broke under Vercel's cross-route auth/env
// resolution and returned 401).

import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from '@/lib/email';
import {
  morningStandupNudge,
  eveningClosureNudge,
  carriedTaskNudge,
} from '@/lib/email-templates';

export interface JobReport {
  job: string;
  attempted: number;
  sent: number;
  errors: { recipient?: string; error: string }[];
}

function admin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function nowIST(): { date: string; hour: number; minute: number } {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(Date.now() + istOffsetMs);
  return {
    date:   `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`,
    hour:   ist.getUTCHours(),
    minute: ist.getUTCMinutes(),
  };
}

// Best-effort in-app notification insert. Nudges land both in inbox
// (email) and the in-app bell so users see them whether they're online
// or not. Failures here are silent — never block the email send.
async function insertNudgeNotification(
  sb: SupabaseClient,
  userId: string,
  title: string,
  body: string,
): Promise<void> {
  try {
    await sb.from('notifications').insert({
      id: uuidv4(),
      user_id: userId,
      type: 'status_change',
      title,
      body,
      task_id: null,
      project_id: null,
    });
  } catch {
    /* notifications table outage — swallow */
  }
}

// ─── Morning standup nudge ──────────────────────────────────────────────
export async function runMorningStandupNudge(targetUserId?: string): Promise<JobReport> {
  const sb = admin();
  const today = nowIST().date;

  const usersQuery = sb
    .from('users')
    .select('id, email, full_name, role')
    .eq('role', 'member');
  const { data: members, error: memberErr } = targetUserId
    ? await usersQuery.eq('id', targetUserId)
    : await usersQuery;
  if (memberErr) throw memberErr;

  const { data: standups, error: stErr } = await sb
    .from('daily_standups')
    .select('user_id, morning_submitted_at')
    .eq('standup_date', today);
  if (stErr) throw stErr;

  const submittedIds = new Set(
    (standups ?? [])
      .filter(s => s.morning_submitted_at)
      .map(s => s.user_id as string),
  );

  const targets = (members ?? []).filter(u => !submittedIds.has(u.id as string) && u.email);

  const errors: JobReport['errors'] = [];
  let sent = 0;
  for (const m of targets) {
    try {
      const { subject, text, html } = morningStandupNudge({
        fullName: (m.full_name as string) ?? 'there',
      });
      await sendEmail({ to: m.email as string, subject, text, html, tag: 'morning_standup_nudge' });
      await insertNudgeNotification(
        sb,
        m.id as string,
        'Submit your morning standup',
        'Your daily standup for today isn\'t in yet. Take a minute to log it.',
      );
      sent++;
    } catch (e) {
      errors.push({ recipient: m.email as string, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { job: 'morning_standup_nudge', attempted: targets.length, sent, errors };
}

// ─── Evening closure nudge ──────────────────────────────────────────────
export async function runEveningClosureNudge(targetUserId?: string): Promise<JobReport> {
  const sb = admin();
  const today = nowIST().date;

  const { data: standups, error } = await sb
    .from('daily_standups')
    .select(`id, user_id, evening_submitted_at,
             standup_outcomes(outcome_text, evening_status, is_carried)`)
    .eq('standup_date', today)
    .is('evening_submitted_at', null);
  if (error) throw error;

  const standupRows = (standups ?? []).filter(s =>
    !targetUserId || s.user_id === targetUserId,
  );
  if (standupRows.length === 0) {
    return { job: 'evening_closure_nudge', attempted: 0, sent: 0, errors: [] };
  }

  const userIds = standupRows.map(s => s.user_id as string);
  const { data: users } = await sb
    .from('users')
    .select('id, full_name, email')
    .in('id', userIds);
  const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u]));

  const errors: JobReport['errors'] = [];
  let sent = 0;
  for (const s of standupRows) {
    const u = userMap[s.user_id as string];
    if (!u?.email) continue;
    const outcomes = (s.standup_outcomes as { outcome_text: string; evening_status: string }[] | null) ?? [];
    const pending = outcomes
      .filter(o => o.evening_status === 'pending')
      .map(o => ({ title: o.outcome_text }));
    if (pending.length === 0) continue;
    try {
      const { subject, text, html } = eveningClosureNudge({
        fullName: (u.full_name as string) ?? 'there',
        pendingOutcomes: pending,
      });
      await sendEmail({ to: u.email as string, subject, text, html, tag: 'evening_closure_nudge' });
      await insertNudgeNotification(
        sb,
        u.id as string,
        `Close your standup — ${pending.length} pending`,
        `${pending.length} outcome${pending.length === 1 ? '' : 's'} still open. Mark done or push back.`,
      );
      sent++;
    } catch (e) {
      errors.push({ recipient: u.email as string, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { job: 'evening_closure_nudge', attempted: standupRows.length, sent, errors };
}

// ─── Carried-task closure nudge (11 AM + 6 PM IST) ──────────────────────
// Slot is derived from current IST hour: hour < 14 → 'morning' (soft),
// otherwise 'evening' (firm "close before EOD"). Skips members with no
// today's standup — that's covered by the morning standup nudge.
export async function runCarriedTaskNudge(targetUserId?: string): Promise<JobReport> {
  const sb = admin();
  const ist = nowIST();
  const today = ist.date;
  const slot: 'morning' | 'evening' = ist.hour < 14 ? 'morning' : 'evening';

  const standupsQuery = sb
    .from('daily_standups')
    .select('id, user_id')
    .eq('standup_date', today);
  const { data: todayStandups, error: stErr } = targetUserId
    ? await standupsQuery.eq('user_id', targetUserId)
    : await standupsQuery;
  if (stErr) throw stErr;
  if (!todayStandups || todayStandups.length === 0) {
    return { job: 'carried_task_nudge', attempted: 0, sent: 0, errors: [] };
  }

  const standupIdToUser = new Map<string, string>(
    todayStandups.map(s => [s.id as string, s.user_id as string]),
  );

  const { data: outcomes, error: oErr } = await sb
    .from('standup_outcomes')
    .select('standup_id, outcome_text, is_carried, carry_streak, reason_not_done, evening_status')
    .in('standup_id', Array.from(standupIdToUser.keys()))
    .eq('is_carried', true);
  if (oErr) throw oErr;

  const byUser = new Map<string, { title: string; carry_streak: number; reason_not_done: string | null }[]>();
  for (const o of outcomes ?? []) {
    if (o.evening_status === 'done') continue;
    const uid = standupIdToUser.get(o.standup_id as string);
    if (!uid) continue;
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid)!.push({
      title: o.outcome_text as string,
      carry_streak: (o.carry_streak as number) ?? 1,
      reason_not_done: (o.reason_not_done as string | null) ?? null,
    });
  }
  if (byUser.size === 0) {
    return { job: 'carried_task_nudge', attempted: 0, sent: 0, errors: [] };
  }

  const { data: users, error: uErr } = await sb
    .from('users')
    .select('id, email, full_name')
    .in('id', Array.from(byUser.keys()));
  if (uErr) throw uErr;

  const errors: JobReport['errors'] = [];
  let sent = 0;
  for (const u of users ?? []) {
    const items = byUser.get(u.id as string);
    if (!items || items.length === 0) continue;
    try {
      const { subject, text, html } = carriedTaskNudge({
        fullName: u.full_name as string,
        slot,
        carriedItems: items,
      });
      await sendEmail({ to: u.email as string, subject, text, html, tag: 'carried_task_nudge' });
      const stuckCount = items.filter(i => i.carry_streak >= 3).length;
      await insertNudgeNotification(
        sb,
        u.id as string,
        slot === 'morning'
          ? `Carry-over: ${items.length} task${items.length === 1 ? '' : 's'} from yesterday`
          : `Close before EOD — ${items.length} carried task${items.length === 1 ? '' : 's'} open`,
        stuckCount > 0
          ? `${stuckCount} stuck for 3+ days. Open standup to update or close.`
          : 'Open standup to update or close.',
      );
      sent++;
    } catch (e) {
      errors.push({ recipient: u.email as string, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { job: 'carried_task_nudge', attempted: users?.length ?? 0, sent, errors };
}
