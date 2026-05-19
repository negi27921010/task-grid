// Diagnostic endpoint — smoke-tests the full email pipeline for a given job.
//
// GET /api/cron/test-email?secret=...                  → SMTP smoke-test only
// GET /api/cron/test-email?secret=...&to=addr          → SMTP smoke-test + send raw test mail
// GET /api/cron/test-email?secret=...&job=morning      → full diagnostic: SMTP verify,
//       recipients resolved, template rendered, dry-run (no actual send unless &send=1)
// GET /api/cron/test-email?secret=...&job=morning&send=1  → same but actually sends
//
// Supported job values: morning | evening | carried | eta | defaulter | evening-digest
//
// Response shape (all paths):
// {
//   smtp_verified: boolean,
//   smtp_error?: string,
//   job?: string,
//   recipients_resolved: number,      // only for job mode
//   recipient_emails: string[],       // only for job mode (truncated to 20)
//   template_subject?: string,
//   template_html_length?: number,
//   template_text_length?: number,
//   send_attempted: boolean,
//   send_results?: { recipient: string; ok: boolean; error?: string }[],
//   errors?: string[],
// }

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendEmail, verifySmtp } from '@/lib/email';
import {
  testEmail,
  morningStandupNudge,
  eveningClosureNudge,
  etaNudge,
  adminDefaulterDigest,
  adminEveningDigest,
  carriedTaskNudge,
} from '@/lib/email-templates';

export const runtime = 'nodejs';
export const maxDuration = 30;

function nowIST(): { date: string; hour: number } {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(Date.now() + istOffsetMs);
  return {
    date: `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`,
    hour: ist.getUTCHours(),
  };
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ─── Per-job recipient resolution (dry-run safe — read-only queries) ────────

async function resolveMorning(): Promise<{ email: string; fullName: string }[]> {
  const sb = adminClient();
  const today = nowIST().date;
  const { data: members } = await sb
    .from('users')
    .select('id, email, full_name')
    .eq('role', 'member');
  const { data: standups } = await sb
    .from('daily_standups')
    .select('user_id, morning_submitted_at')
    .eq('standup_date', today);
  const submittedIds = new Set(
    (standups ?? []).filter(s => s.morning_submitted_at).map(s => s.user_id as string),
  );
  return (members ?? [])
    .filter(u => !submittedIds.has(u.id as string) && u.email)
    .map(u => ({ email: u.email as string, fullName: (u.full_name as string) ?? 'there' }));
}

async function resolveEvening(): Promise<{ email: string; fullName: string; pendingCount: number }[]> {
  const sb = adminClient();
  const today = nowIST().date;
  const { data: standups } = await sb
    .from('daily_standups')
    .select(`id, user_id, evening_submitted_at,
             standup_outcomes(outcome_text, evening_status)`)
    .eq('standup_date', today)
    .is('evening_submitted_at', null);
  const rows = standups ?? [];
  if (rows.length === 0) return [];
  const userIds = rows.map(s => s.user_id as string);
  const { data: users } = await sb
    .from('users')
    .select('id, full_name, email')
    .in('id', userIds);
  const userMap = Object.fromEntries((users ?? []).map(u => [u.id, u]));
  return rows.flatMap(s => {
    const u = userMap[s.user_id as string];
    if (!u?.email) return [];
    const outcomes = (s.standup_outcomes as { outcome_text: string; evening_status: string }[] | null) ?? [];
    const pending = outcomes.filter(o => o.evening_status === 'pending').length;
    if (pending === 0) return [];
    return [{ email: u.email as string, fullName: (u.full_name as string) ?? 'there', pendingCount: pending }];
  });
}

async function resolveEta(): Promise<{ email: string; fullName: string; taskCount: number }[]> {
  const sb = adminClient();
  const { data: tasks } = await sb
    .from('tasks')
    .select('id, owner_id')
    .eq('status', 'in_progress')
    .is('eta', null);
  const ownerIds = Array.from(new Set((tasks ?? []).map(t => t.owner_id as string).filter(Boolean)));
  if (ownerIds.length === 0) return [];
  const { data: users } = await sb.from('users').select('id, email, full_name').in('id', ownerIds);
  const counts = new Map<string, number>();
  for (const t of tasks ?? []) if (t.owner_id) counts.set(t.owner_id as string, (counts.get(t.owner_id as string) ?? 0) + 1);
  return (users ?? [])
    .filter(u => u.email)
    .map(u => ({ email: u.email as string, fullName: (u.full_name as string) ?? 'there', taskCount: counts.get(u.id as string) ?? 0 }));
}

async function resolveDefaulter(): Promise<{ adminEmail: string; defaulterCount: number; totalMembers: number }> {
  const sb = adminClient();
  const today = nowIST().date;
  const adminEmail = process.env.ADMIN_EMAIL ?? '';
  const { data: members } = await sb.from('users').select('id').eq('role', 'member');
  const { data: standups } = await sb
    .from('daily_standups')
    .select('user_id, morning_submitted_at')
    .eq('standup_date', today);
  const submittedIds = new Set(
    (standups ?? []).filter(s => s.morning_submitted_at).map(s => s.user_id as string),
  );
  const totalMembers = (members ?? []).length;
  const defaulterCount = (members ?? []).filter(m => !submittedIds.has(m.id as string)).length;
  return { adminEmail, defaulterCount, totalMembers };
}

async function resolveCarried(): Promise<{ email: string; fullName: string; itemCount: number }[]> {
  const sb = adminClient();
  const today = nowIST().date;
  const { data: standups } = await sb
    .from('daily_standups')
    .select('id, user_id')
    .eq('standup_date', today);
  if (!standups || standups.length === 0) return [];
  const standupIdToUser = new Map(standups.map(s => [s.id as string, s.user_id as string]));
  const { data: outcomes } = await sb
    .from('standup_outcomes')
    .select('standup_id, evening_status')
    .in('standup_id', Array.from(standupIdToUser.keys()))
    .eq('is_carried', true);
  const byUser = new Map<string, number>();
  for (const o of outcomes ?? []) {
    if (o.evening_status === 'done') continue;
    const uid = standupIdToUser.get(o.standup_id as string);
    if (!uid) continue;
    byUser.set(uid, (byUser.get(uid) ?? 0) + 1);
  }
  if (byUser.size === 0) return [];
  const { data: users } = await sb
    .from('users')
    .select('id, email, full_name')
    .in('id', Array.from(byUser.keys()));
  return (users ?? [])
    .filter(u => u.email)
    .map(u => ({ email: u.email as string, fullName: (u.full_name as string) ?? 'there', itemCount: byUser.get(u.id as string) ?? 0 }));
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.CRON_SECRET;
  if (!secret || url.searchParams.get('secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const job = url.searchParams.get('job');         // optional: morning | evening | carried | eta | defaulter | evening-digest
  const shouldSend = url.searchParams.get('send') === '1';
  const to = url.searchParams.get('to') ?? process.env.ADMIN_EMAIL;

  // ── SMTP verification (always runs) ─────────────────────────────────────
  let smtpVerified = false;
  let smtpError: string | undefined;
  try {
    smtpVerified = await verifySmtp();
    if (!smtpVerified) smtpError = 'verifySmtp() returned false — check SMTP_USER / SMTP_PASS / SMTP_HOST / SMTP_PORT';
  } catch (e) {
    smtpError = e instanceof Error ? e.message : String(e);
  }

  // ── No job param → simple SMTP test (backward-compatible) ───────────────
  if (!job) {
    if (!smtpVerified) {
      return NextResponse.json({ smtp_verified: false, smtp_error: smtpError, send_attempted: false }, { status: 502 });
    }
    if (!to) {
      return NextResponse.json({ error: 'No recipient — pass ?to=address or set ADMIN_EMAIL' }, { status: 400 });
    }
    try {
      const { subject, text, html } = testEmail({ recipientName: 'tester' });
      const result = await sendEmail({ to, subject, text, html, tag: 'smtp_test' });
      return NextResponse.json({ smtp_verified: true, send_attempted: true, ok: true, ...result });
    } catch (e) {
      return NextResponse.json(
        { smtp_verified: true, send_attempted: true, ok: false, error: e instanceof Error ? e.message : String(e) },
        { status: 500 },
      );
    }
  }

  // ── Job diagnostic mode ──────────────────────────────────────────────────
  const report: Record<string, unknown> = {
    smtp_verified: smtpVerified,
    smtp_error: smtpError,
    job,
    send_attempted: false,
    recipients_resolved: 0,
    recipient_emails: [] as string[],
  };

  if (!smtpVerified) {
    return NextResponse.json({ ...report, error: smtpError }, { status: 502 });
  }

  try {
    // ── Resolve recipients per job ─────────────────────────────────────
    type SendItem = { to: string; subject: string; text: string; html: string };
    const sendQueue: SendItem[] = [];

    if (job === 'morning') {
      const recipients = await resolveMorning();
      report.recipients_resolved = recipients.length;
      report.recipient_emails = recipients.slice(0, 20).map(r => r.email);
      if (recipients.length > 0) {
        const sample = morningStandupNudge({ fullName: recipients[0].fullName });
        report.template_subject = sample.subject;
        report.template_html_length = sample.html.length;
        report.template_text_length = sample.text.length;
        for (const r of recipients) {
          const t = morningStandupNudge({ fullName: r.fullName });
          sendQueue.push({ to: r.email, subject: t.subject, text: t.text, html: t.html });
        }
      }
    } else if (job === 'evening') {
      const recipients = await resolveEvening();
      report.recipients_resolved = recipients.length;
      report.recipient_emails = recipients.slice(0, 20).map(r => r.email);
      if (recipients.length > 0) {
        const sample = eveningClosureNudge({
          fullName: recipients[0].fullName,
          pendingOutcomes: Array.from({ length: recipients[0].pendingCount }, (_, i) => ({ title: `Outcome ${i + 1}` })),
        });
        report.template_subject = sample.subject;
        report.template_html_length = sample.html.length;
        report.template_text_length = sample.text.length;
        for (const r of recipients) {
          const t = eveningClosureNudge({
            fullName: r.fullName,
            pendingOutcomes: Array.from({ length: r.pendingCount }, (_, i) => ({ title: `Outcome ${i + 1}` })),
          });
          sendQueue.push({ to: r.email, subject: t.subject, text: t.text, html: t.html });
        }
      }
    } else if (job === 'eta') {
      const recipients = await resolveEta();
      report.recipients_resolved = recipients.length;
      report.recipient_emails = recipients.slice(0, 20).map(r => r.email);
      if (recipients.length > 0) {
        const sample = etaNudge({
          fullName: recipients[0].fullName,
          tasks: Array.from({ length: recipients[0].taskCount }, (_, i) => ({ title: `Task ${i + 1}`, projectName: null })),
        });
        report.template_subject = sample.subject;
        report.template_html_length = sample.html.length;
        report.template_text_length = sample.text.length;
        for (const r of recipients) {
          const t = etaNudge({
            fullName: r.fullName,
            tasks: Array.from({ length: r.taskCount }, (_, i) => ({ title: `Task ${i + 1}`, projectName: null })),
          });
          sendQueue.push({ to: r.email, subject: t.subject, text: t.text, html: t.html });
        }
      }
    } else if (job === 'defaulter') {
      const { adminEmail, defaulterCount, totalMembers } = await resolveDefaulter();
      report.recipients_resolved = adminEmail ? 1 : 0;
      report.recipient_emails = adminEmail ? [adminEmail] : [];
      report.defaulter_count = defaulterCount;
      report.total_members = totalMembers;
      if (adminEmail) {
        const sample = adminDefaulterDigest({
          defaulters: Array.from({ length: defaulterCount }, (_, i) => ({
            name: `Member ${i + 1}`, department: 'Engineering', status: 'not_submitted' as const,
          })),
          totalMembers,
          submittedCount: totalMembers - defaulterCount,
        });
        report.template_subject = sample.subject;
        report.template_html_length = sample.html.length;
        report.template_text_length = sample.text.length;
        sendQueue.push({ to: adminEmail, subject: sample.subject, text: sample.text, html: sample.html });
      }
    } else if (job === 'evening-digest') {
      const adminEmail = process.env.ADMIN_EMAIL;
      report.recipients_resolved = adminEmail ? 1 : 0;
      report.recipient_emails = adminEmail ? [adminEmail] : [];
      if (adminEmail) {
        const sample = adminEveningDigest({
          totalMembers: 0, submittedCount: 0, closedCount: 0,
          totalOutcomes: 0, doneCount: 0, notDoneCount: 0, pendingCount: 0, carriedCount: 0,
          stuckMembers: [], flaggedOutcomes: [],
        });
        report.template_subject = sample.subject;
        report.template_html_length = sample.html.length;
        report.template_text_length = sample.text.length;
        sendQueue.push({ to: adminEmail, subject: sample.subject, text: sample.text, html: sample.html });
      }
    } else if (job === 'carried') {
      const recipients = await resolveCarried();
      report.recipients_resolved = recipients.length;
      report.recipient_emails = recipients.slice(0, 20).map(r => r.email);
      const ist = nowIST();
      const slot: 'morning' | 'evening' = ist.hour < 14 ? 'morning' : 'evening';
      report.carried_slot = slot;
      if (recipients.length > 0) {
        const sample = carriedTaskNudge({
          fullName: recipients[0].fullName,
          slot,
          carriedItems: Array.from({ length: recipients[0].itemCount }, (_, i) => ({ title: `Item ${i + 1}`, carry_streak: 1, reason_not_done: null })),
        });
        report.template_subject = sample.subject;
        report.template_html_length = sample.html.length;
        report.template_text_length = sample.text.length;
        for (const r of recipients) {
          const t = carriedTaskNudge({
            fullName: r.fullName,
            slot,
            carriedItems: Array.from({ length: r.itemCount }, (_, i) => ({ title: `Item ${i + 1}`, carry_streak: 1, reason_not_done: null })),
          });
          sendQueue.push({ to: r.email, subject: t.subject, text: t.text, html: t.html });
        }
      }
    } else {
      return NextResponse.json(
        { error: `Unknown job "${job}". Valid values: morning, evening, carried, eta, defaulter, evening-digest` },
        { status: 400 },
      );
    }

    // ── Send (only if ?send=1) ─────────────────────────────────────────
    if (shouldSend && sendQueue.length > 0) {
      report.send_attempted = true;
      const sendResults: { recipient: string; ok: boolean; messageId?: string; error?: string }[] = [];
      for (const item of sendQueue) {
        try {
          const result = await sendEmail({ to: item.to, subject: item.subject, text: item.text, html: item.html, tag: `diag_${job}` });
          sendResults.push({ recipient: item.to, ok: true, messageId: result.messageId });
        } catch (e) {
          sendResults.push({ recipient: item.to, ok: false, error: e instanceof Error ? e.message : String(e) });
        }
      }
      report.send_results = sendResults;
    } else if (!shouldSend) {
      report.dry_run_note = 'Add &send=1 to actually send the emails to resolved recipients.';
    }

    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json(
      { ...report, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
