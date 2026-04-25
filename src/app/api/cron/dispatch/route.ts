// Cron dispatcher — single endpoint for all five scheduled jobs.
//
// Invoked by Vercel Cron every 30 minutes. The endpoint reads the current
// IST time and only runs the job whose scheduled minute matches. This
// keeps us within Vercel Hobby's 2-cron-job limit while still hitting
// each business-hour slot precisely.
//
// Auth: requires either Vercel's automatic `Authorization: Bearer
// VERCEL_CRON_SIG` header (only present in real cron invocations) or a
// `?secret=CRON_SECRET` query for manual / curl testing.
//
// Manual invocation patterns:
//   GET /api/cron/dispatch?secret=...&dry=1            // health + plan only
//   GET /api/cron/dispatch?secret=...&job=morning      // force a specific job
//   GET /api/cron/dispatch?secret=...&job=eta&user=ID  // target one user

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import {
  sendEmail,
  verifySmtp,
} from '@/lib/email';
import {
  morningStandupNudge,
  eveningClosureNudge,
  etaNudge,
  adminDefaulterDigest,
  adminEveningDigest,
} from '@/lib/email-templates';

export const runtime = 'nodejs';   // nodemailer needs Node, not Edge
export const maxDuration = 60;

type JobName =
  | 'morning_standup_nudge'
  | 'eta_nudge'
  | 'admin_defaulter_digest'
  | 'evening_closure_nudge'
  | 'admin_evening_digest';

interface JobReport {
  job: JobName;
  attempted: number;
  sent: number;
  errors: { recipient?: string; error: string }[];
}

// ─── IST helpers ────────────────────────────────────────────────────────────
function nowIST(): { date: string; hour: number; minute: number } {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(Date.now() + istOffsetMs);
  return {
    date:   `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`,
    hour:   ist.getUTCHours(),
    minute: ist.getUTCMinutes(),
  };
}

// Schedule: which jobs run at which IST time. Bucket within ±5 min so the
// cron firing isn't tied to exact minute-edge.
function jobsForTime(hour: number, minute: number): JobName[] {
  const matches: JobName[] = [];
  const within = (h: number, m: number) =>
    hour === h && Math.abs(minute - m) <= 5;

  if (within(10, 30)) matches.push('morning_standup_nudge');
  if (within(11, 0))  matches.push('eta_nudge', 'admin_defaulter_digest');
  if (within(18, 0)) matches.push('evening_closure_nudge');
  if (within(18, 30)) matches.push('admin_evening_digest');

  return matches;
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function isAuthorized(req: Request): boolean {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const querySecret = url.searchParams.get('secret');
  if (querySecret === secret) return true;

  // Vercel Cron sets this header automatically on real cron firings.
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${secret}`) return true;

  return false;
}

// ─── Quality flagger (heuristic — no LLM call needed for this simple check) ──
const VAGUE_STARTERS = [
  'work on', 'follow up', 'look into', 'continue', 'check',
  'try to', 'explore', 'think about', 'help with', 'do',
];
function flagOutcomeQuality(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length < 10) return 'Too short — be specific about deliverable + quantity';
  const lower = trimmed.toLowerCase();
  for (const v of VAGUE_STARTERS) {
    if (lower.startsWith(v)) return `Starts with "${v}…" — write as a verifiable outcome`;
  }
  return null;
}

// ─── Job: morning standup nudge ────────────────────────────────────────────
async function runMorningStandupNudge(targetUserId?: string): Promise<JobReport> {
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
      sent++;
    } catch (e) {
      errors.push({ recipient: m.email as string, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { job: 'morning_standup_nudge', attempted: targets.length, sent, errors };
}

// ─── Job: evening closure nudge ────────────────────────────────────────────
async function runEveningClosureNudge(targetUserId?: string): Promise<JobReport> {
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
      sent++;
    } catch (e) {
      errors.push({ recipient: u.email as string, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { job: 'evening_closure_nudge', attempted: standupRows.length, sent, errors };
}

// ─── Job: ETA nudge — in-progress tasks without an ETA ─────────────────────
async function runEtaNudge(targetUserId?: string): Promise<JobReport> {
  const sb = admin();

  let q = sb
    .from('tasks')
    .select('id, title, owner_id, project_id')
    .eq('status', 'in_progress')
    .is('eta', null);
  if (targetUserId) q = q.eq('owner_id', targetUserId);
  const { data: tasks, error } = await q;
  if (error) throw error;

  const taskList = tasks ?? [];
  if (taskList.length === 0) {
    return { job: 'eta_nudge', attempted: 0, sent: 0, errors: [] };
  }

  const ownerIds = Array.from(new Set(taskList.map(t => t.owner_id as string).filter(Boolean)));
  const projectIds = Array.from(new Set(taskList.map(t => t.project_id as string).filter(Boolean)));

  const [usersRes, projectsRes] = await Promise.all([
    sb.from('users').select('id, full_name, email').in('id', ownerIds.length ? ownerIds : ['__none__']),
    sb.from('projects').select('id, name').in('id', projectIds.length ? projectIds : ['__none__']),
  ]);
  const userMap = Object.fromEntries((usersRes.data ?? []).map(u => [u.id, u]));
  const projectMap = Object.fromEntries((projectsRes.data ?? []).map(p => [p.id, p.name]));

  // Group tasks by owner, send one digest per owner.
  const byOwner = new Map<string, { title: string; projectName: string | null }[]>();
  for (const t of taskList) {
    const ownerId = t.owner_id as string;
    if (!ownerId) continue;
    if (!byOwner.has(ownerId)) byOwner.set(ownerId, []);
    byOwner.get(ownerId)!.push({
      title: t.title as string,
      projectName: (projectMap[t.project_id as string] as string | undefined) ?? null,
    });
  }

  const errors: JobReport['errors'] = [];
  let sent = 0;
  for (const [ownerId, ownerTasks] of byOwner) {
    const u = userMap[ownerId];
    if (!u?.email) continue;
    try {
      const { subject, text, html } = etaNudge({
        fullName: (u.full_name as string) ?? 'there',
        tasks: ownerTasks,
      });
      await sendEmail({ to: u.email as string, subject, text, html, tag: 'eta_nudge' });
      sent++;
    } catch (e) {
      errors.push({ recipient: u.email as string, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { job: 'eta_nudge', attempted: byOwner.size, sent, errors };
}

// ─── Job: admin defaulter digest ───────────────────────────────────────────
async function runAdminDefaulterDigest(): Promise<JobReport> {
  const sb = admin();
  const today = nowIST().date;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return { job: 'admin_defaulter_digest', attempted: 0, sent: 0,
      errors: [{ error: 'ADMIN_EMAIL env not set' }] };
  }

  const [membersRes, standupsRes] = await Promise.all([
    sb.from('users').select('id, full_name, department').eq('role', 'member'),
    sb.from('daily_standups').select('user_id, morning_submitted_at, morning_is_late')
      .eq('standup_date', today),
  ]);

  const members = membersRes.data ?? [];
  const standups = standupsRes.data ?? [];
  const standupMap = Object.fromEntries(standups.map(s => [s.user_id, s]));

  const defaulters: { name: string; department: string; status: 'not_submitted' | 'late' }[] = [];
  let submittedCount = 0;
  for (const m of members) {
    const st = standupMap[m.id as string];
    if (!st || !st.morning_submitted_at) {
      defaulters.push({
        name: m.full_name as string,
        department: (m.department as string) ?? '—',
        status: 'not_submitted',
      });
    } else if (st.morning_is_late) {
      defaulters.push({
        name: m.full_name as string,
        department: (m.department as string) ?? '—',
        status: 'late',
      });
      submittedCount++;
    } else {
      submittedCount++;
    }
  }

  try {
    const { subject, text, html } = adminDefaulterDigest({
      defaulters,
      totalMembers: members.length,
      submittedCount,
    });
    await sendEmail({ to: adminEmail, subject, text, html, tag: 'admin_defaulter_digest' });
    return { job: 'admin_defaulter_digest', attempted: 1, sent: 1, errors: [] };
  } catch (e) {
    return { job: 'admin_defaulter_digest', attempted: 1, sent: 0,
      errors: [{ recipient: adminEmail, error: e instanceof Error ? e.message : String(e) }] };
  }
}

// ─── Job: admin evening digest ─────────────────────────────────────────────
async function runAdminEveningDigest(): Promise<JobReport> {
  const sb = admin();
  const today = nowIST().date;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return { job: 'admin_evening_digest', attempted: 0, sent: 0,
      errors: [{ error: 'ADMIN_EMAIL env not set' }] };
  }

  const [membersRes, standupsRes] = await Promise.all([
    sb.from('users').select('id, full_name').eq('role', 'member'),
    sb.from('daily_standups').select(`id, user_id, morning_submitted_at,
        evening_submitted_at,
        standup_outcomes(outcome_text, evening_status, is_carried, carry_streak)`)
      .eq('standup_date', today),
  ]);
  const members = membersRes.data ?? [];
  const standups = standupsRes.data ?? [];
  const memberMap = Object.fromEntries(members.map(m => [m.id, m]));

  let totalOutcomes = 0;
  let doneCount = 0;
  let notDoneCount = 0;
  let pendingCount = 0;
  let carriedCount = 0;
  let submittedCount = 0;
  let closedCount = 0;
  const stuckMembers: { name: string; carryStreak: number; outcomeText: string }[] = [];
  const flaggedOutcomes: { name: string; outcomeText: string; reason: string }[] = [];

  for (const s of standups) {
    if (s.morning_submitted_at) submittedCount++;
    if (s.evening_submitted_at) closedCount++;
    const outcomes = (s.standup_outcomes as
      { outcome_text: string; evening_status: string; is_carried: boolean; carry_streak: number }[]
      | null) ?? [];
    for (const o of outcomes) {
      totalOutcomes++;
      if (o.evening_status === 'done') doneCount++;
      else if (o.evening_status === 'not_done') notDoneCount++;
      else pendingCount++;
      if (o.is_carried) carriedCount++;
      if (o.carry_streak >= 3) {
        const m = memberMap[s.user_id as string];
        if (m) stuckMembers.push({
          name: (m.full_name as string) ?? 'Unknown',
          carryStreak: o.carry_streak,
          outcomeText: o.outcome_text,
        });
      }
      const flag = flagOutcomeQuality(o.outcome_text);
      if (flag) {
        const m = memberMap[s.user_id as string];
        if (m) flaggedOutcomes.push({
          name: (m.full_name as string) ?? 'Unknown',
          outcomeText: o.outcome_text,
          reason: flag,
        });
      }
    }
  }

  try {
    const { subject, text, html } = adminEveningDigest({
      totalMembers: members.length,
      submittedCount,
      closedCount,
      totalOutcomes,
      doneCount,
      notDoneCount,
      pendingCount,
      carriedCount,
      stuckMembers: stuckMembers.slice(0, 20),
      flaggedOutcomes: flaggedOutcomes.slice(0, 20),
    });
    await sendEmail({ to: adminEmail, subject, text, html, tag: 'admin_evening_digest' });
    return { job: 'admin_evening_digest', attempted: 1, sent: 1, errors: [] };
  } catch (e) {
    return { job: 'admin_evening_digest', attempted: 1, sent: 0,
      errors: [{ recipient: adminEmail, error: e instanceof Error ? e.message : String(e) }] };
  }
}

// ─── Handler ───────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const dry = url.searchParams.get('dry') === '1';
  const forceJob = url.searchParams.get('job');
  const userId = url.searchParams.get('user') ?? undefined;

  const ist = nowIST();
  const scheduled = forceJob ? null : jobsForTime(ist.hour, ist.minute);

  // Map short query forms → job names
  const aliasMap: Record<string, JobName> = {
    morning: 'morning_standup_nudge',
    evening: 'evening_closure_nudge',
    eta: 'eta_nudge',
    defaulter: 'admin_defaulter_digest',
    'evening-digest': 'admin_evening_digest',
  };
  const forced = forceJob ? (aliasMap[forceJob] ?? (forceJob as JobName)) : null;
  const jobs = forced ? [forced] : (scheduled ?? []);

  if (dry) {
    const smtpOk = await verifySmtp();
    return NextResponse.json({
      now_ist: `${ist.date} ${String(ist.hour).padStart(2, '0')}:${String(ist.minute).padStart(2, '0')}`,
      smtp_verified: smtpOk,
      forced,
      scheduled: scheduled ?? [],
      would_run: jobs,
      target_user: userId,
    });
  }

  if (jobs.length === 0) {
    return NextResponse.json({
      now_ist: `${ist.date} ${String(ist.hour).padStart(2, '0')}:${String(ist.minute).padStart(2, '0')}`,
      message: 'No jobs scheduled for this time slot',
      scheduled: [],
    });
  }

  const reports: JobReport[] = [];
  for (const job of jobs) {
    try {
      let report: JobReport;
      switch (job) {
        case 'morning_standup_nudge':
          report = await runMorningStandupNudge(userId); break;
        case 'evening_closure_nudge':
          report = await runEveningClosureNudge(userId); break;
        case 'eta_nudge':
          report = await runEtaNudge(userId); break;
        case 'admin_defaulter_digest':
          report = await runAdminDefaulterDigest(); break;
        case 'admin_evening_digest':
          report = await runAdminEveningDigest(); break;
        default:
          report = { job, attempted: 0, sent: 0,
            errors: [{ error: `Unknown job: ${job}` }] };
      }
      reports.push(report);
    } catch (e) {
      reports.push({ job, attempted: 0, sent: 0,
        errors: [{ error: e instanceof Error ? e.message : String(e) }] });
    }
  }

  return NextResponse.json({
    now_ist: `${ist.date} ${String(ist.hour).padStart(2, '0')}:${String(ist.minute).padStart(2, '0')}`,
    reports,
  });
}
