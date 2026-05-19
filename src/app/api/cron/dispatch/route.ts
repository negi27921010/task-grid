// Cron dispatcher — single endpoint for all scheduled jobs.
//
// Invoked by Supabase pg_cron → Edge Function `cron-dispatch` → here.
// pg_cron fires at specific IST minutes (see migration 008); the endpoint
// can also fall back to its own time-of-day matcher when called without
// an explicit `?job=` argument.
//
// Auth: `?secret=CRON_SECRET` query (or `Authorization: Bearer <secret>`
// header) — checked by isAuthorized().
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
  etaNudge,
  adminDefaulterDigest,
  adminEveningDigest,
} from '@/lib/email-templates';
import {
  runMissingStandupNudge,
  runOverdueP1P2Nudge,
} from '@/lib/api/bolt-proactive';
// Three runners moved into a shared lib so /api/standups/nudge can call
// them directly (HTTP-bouncing through this route was returning 401
// under Vercel cross-route auth).
import {
  runMorningStandupNudge,
  runEveningClosureNudge,
  runCarriedTaskNudge,
  type JobReport as RunnerJobReport,
} from '@/lib/api/standup-runners';

export const runtime = 'nodejs';   // nodemailer needs Node, not Edge
export const maxDuration = 60;

type JobName =
  | 'morning_standup_nudge'
  | 'eta_nudge'
  | 'admin_defaulter_digest'
  | 'evening_closure_nudge'
  | 'admin_evening_digest'
  // Phase 3: in-app proactive nudges from Bolt (write to bolt_messages,
  // not email). Same dispatcher because pg_cron already targets this URL.
  | 'proactive_missing_standup'
  | 'proactive_overdue_p1p2'
  // Phase 4: nudge members whose carried outcomes are still open. Fires
  // at 11 AM IST (soft "update yesterday's items") and 6 PM IST (firm
  // "close before EOD"). Slot is derived from current IST hour.
  | 'carried_task_nudge';

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
  if (within(11, 0))  matches.push('eta_nudge', 'admin_defaulter_digest', 'carried_task_nudge');
  if (within(11, 30)) matches.push('proactive_missing_standup');
  if (within(14, 30)) matches.push('proactive_overdue_p1p2');
  if (within(18, 0))  matches.push('evening_closure_nudge', 'carried_task_nudge');
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

// Morning + evening standup nudge runners moved to lib/api/standup-runners.ts
// so the admin one-shot nudge endpoint can call them directly without
// HTTP-bouncing through this route (which broke under cross-route auth).

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

// Carried-task nudge runner moved to lib/api/standup-runners.ts (same
// reason as the morning/evening pair above).

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
    // Phase 3 proactive nudges. Long-form names also accepted directly.
    'proactive-missing-standup': 'proactive_missing_standup',
    'proactive-overdue-p1p2':    'proactive_overdue_p1p2',
    'carried':                   'carried_task_nudge',
    'carried-task':              'carried_task_nudge',
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

  // The shared-lib runners type their `job` as plain string (so the lib
  // doesn't have to import the dispatcher's JobName union). Cast their
  // returns into the local JobReport shape — they always set `job` to
  // the right name string.
  const fromRunner = (r: RunnerJobReport): JobReport => ({
    job: r.job as JobName,
    attempted: r.attempted,
    sent: r.sent,
    errors: r.errors,
  });

  const reports: JobReport[] = [];
  for (const job of jobs) {
    try {
      let report: JobReport;
      switch (job) {
        case 'morning_standup_nudge':
          report = fromRunner(await runMorningStandupNudge(userId)); break;
        case 'evening_closure_nudge':
          report = fromRunner(await runEveningClosureNudge(userId)); break;
        case 'eta_nudge':
          report = await runEtaNudge(userId); break;
        case 'admin_defaulter_digest':
          report = await runAdminDefaulterDigest(); break;
        case 'admin_evening_digest':
          report = await runAdminEveningDigest(); break;
        case 'proactive_missing_standup': {
          const r = await runMissingStandupNudge();
          report = {
            job, attempted: r.considered, sent: r.nudged,
            errors: r.errors > 0 ? [{ error: `${r.errors} failures · skipped ${r.skipped_dedupe}` }] : [],
          };
          break;
        }
        case 'proactive_overdue_p1p2': {
          const r = await runOverdueP1P2Nudge();
          report = {
            job, attempted: r.considered, sent: r.nudged,
            errors: r.errors > 0 ? [{ error: `${r.errors} failures · skipped ${r.skipped_dedupe}` }] : [],
          };
          break;
        }
        case 'carried_task_nudge':
          report = fromRunner(await runCarriedTaskNudge(userId)); break;
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
