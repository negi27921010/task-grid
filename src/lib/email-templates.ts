// Plain-string email templates — no JSX runtime, no extra deps.
// Each template returns { subject, text, html } for use with sendEmail().
// HTML uses inline styles + table layouts so it renders consistently
// across Gmail / Outlook / Apple Mail.

const BRAND = 'Task Grid';
const ACCENT = '#0073ea';
const TEXT = '#0f172a';
const MUTED = '#64748b';
const BG = '#f6f7f9';
const SURFACE = '#ffffff';
const BORDER = '#e5e7eb';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.VERCEL_URL ??
  'https://app.taskgrid.local';

function appUrl(path: string): string {
  const base = APP_URL.startsWith('http') ? APP_URL : `https://${APP_URL}`;
  return base.replace(/\/+$/, '') + path;
}

function shell(title: string, bodyHtml: string, ctaLabel?: string, ctaPath?: string): string {
  const cta = ctaLabel && ctaPath
    ? `<tr><td style="padding:8px 32px 32px">
        <a href="${appUrl(ctaPath)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;font-size:14px;font-family:Inter,Arial,sans-serif">${ctaLabel}</a>
       </td></tr>`
    : '';
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${BG};font-family:Inter,Arial,sans-serif;color:${TEXT}">
  <div style="display:none;visibility:hidden;font-size:0;line-height:0;color:${BG};max-height:0;overflow:hidden">${title}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:${SURFACE};border:1px solid ${BORDER};border-radius:12px;overflow:hidden">
        <tr><td style="padding:24px 32px 16px;border-bottom:1px solid ${BORDER}">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:linear-gradient(135deg,${ACCENT},#005bb5);color:#fff;width:32px;height:32px;text-align:center;font-weight:700;font-size:14px;border-radius:8px;font-family:Inter,Arial,sans-serif">⚡</td>
              <td style="padding-left:10px;font-weight:600;font-size:15px;color:${TEXT}">${BRAND} <span style="color:${MUTED};font-weight:400">· PW Academy</span></td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 32px 8px">
          <h1 style="margin:0 0 6px;font-size:20px;font-weight:600;color:${TEXT}">${title}</h1>
        </td></tr>
        <tr><td style="padding:0 32px 16px;font-size:14px;line-height:1.6;color:${TEXT}">${bodyHtml}</td></tr>
        ${cta}
        <tr><td style="padding:16px 32px;border-top:1px solid ${BORDER};font-size:12px;color:${MUTED};line-height:1.5">
          You're receiving this because you're on the Task Grid team. To stop these reminders, ask your admin to update your notification preferences.<br>
          <span style="color:#94a3b8">© ${new Date().getFullYear()} PW Academy. All rights reserved.</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function table(rows: string[][], headers: string[]): string {
  const head = headers.map(h =>
    `<th style="text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${MUTED};border-bottom:1px solid ${BORDER};padding:8px 12px">${h}</th>`
  ).join('');
  const body = rows.map((r) =>
    `<tr>${r.map(c => `<td style="padding:10px 12px;border-bottom:1px solid ${BORDER};font-size:13px;color:${TEXT}">${c}</td>`).join('')}</tr>`
  ).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:8px;overflow:hidden;margin:8px 0">
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function statusPill(label: string, tone: 'green' | 'amber' | 'red' | 'gray'): string {
  const map = {
    green: { bg: '#dcfce7', fg: '#15803d' },
    amber: { bg: '#fef3c7', fg: '#b45309' },
    red:   { bg: '#fee2e2', fg: '#b91c1c' },
    gray:  { bg: '#f1f5f9', fg: '#475569' },
  } as const;
  const c = map[tone];
  return `<span style="display:inline-block;background:${c.bg};color:${c.fg};font-size:11px;font-weight:600;padding:2px 8px;border-radius:9999px">${label}</span>`;
}

/* ─────────────────────────── 1. Standup morning nudge ─────────────────────── */
export function morningStandupNudge(input: { fullName: string }): {
  subject: string; text: string; html: string;
} {
  const subject = `Morning standup is due — please submit before 11:00 AM IST`;
  const greeting = `Hi ${input.fullName.split(' ')[0]},`;
  const text = `${greeting}

You haven't submitted your Daily Standup for today yet. The cutoff is 11:00 AM IST — submissions after that are marked as "Late" in the team overview.

Submit now: ${appUrl('/standups')}

— ${BRAND}`;
  const html = shell(
    'Submit your Daily Standup',
    `<p>${greeting}</p>
     <p>You haven't submitted your <strong>Daily Standup</strong> for today yet.</p>
     <p>The cutoff is <strong>11:00 AM IST</strong> — submissions after that are marked ${statusPill('Late', 'amber')} in the Team Overview.</p>
     <p>Take 60 seconds to write down 1–3 measurable outcomes for the day.</p>`,
    'Submit standup',
    '/standups',
  );
  return { subject, text, html };
}

/* ─────────────────────────── 2. Evening closure nudge ─────────────────────── */
export function eveningClosureNudge(input: {
  fullName: string;
  pendingOutcomes: { title: string }[];
}): { subject: string; text: string; html: string } {
  const subject = `Close your standup — ${input.pendingOutcomes.length} outcome${input.pendingOutcomes.length !== 1 ? 's' : ''} pending`;
  const greeting = `Hi ${input.fullName.split(' ')[0]},`;
  const list = input.pendingOutcomes.map(o => `  • ${o.title}`).join('\n');
  const text = `${greeting}

It's evening closure time. You have ${input.pendingOutcomes.length} outcome${input.pendingOutcomes.length !== 1 ? 's' : ''} still marked as pending:

${list}

Mark each as Done or Not Done (with a reason): ${appUrl('/standups')}

— ${BRAND}`;
  const rows = input.pendingOutcomes.map(o => [o.title, statusPill('Pending', 'gray')]);
  const html = shell(
    'Time to close today\'s outcomes',
    `<p>${greeting}</p>
     <p>It's evening closure time. You have <strong>${input.pendingOutcomes.length}</strong> outcome${input.pendingOutcomes.length !== 1 ? 's' : ''} still marked as pending:</p>
     ${table(rows, ['Outcome', 'Status'])}
     <p>Mark each as <strong>Done</strong> or <strong>Not Done</strong> (with a brief reason). The day's view stays open until you close everything.</p>`,
    'Close outcomes',
    '/standups',
  );
  return { subject, text, html };
}

/* ─────────────────────────── 3. ETA nudge for in-progress tasks ────────────── */
export function etaNudge(input: {
  fullName: string;
  tasks: { title: string; projectName?: string | null }[];
}): { subject: string; text: string; html: string } {
  const n = input.tasks.length;
  const subject = `${n} in-progress task${n !== 1 ? 's' : ''} need${n === 1 ? 's' : ''} an ETA`;
  const greeting = `Hi ${input.fullName.split(' ')[0]},`;
  const list = input.tasks
    .map(t => `  • ${t.title}${t.projectName ? ` (${t.projectName})` : ''}`)
    .join('\n');
  const text = `${greeting}

You have ${n} task${n !== 1 ? 's' : ''} marked as "Working" without an ETA. Setting an ETA helps the team plan and protects you from being chased on it later.

${list}

Open each task and set an ETA: ${appUrl('/dashboard?view=table')}

— ${BRAND}`;
  const rows = input.tasks.map(t => [
    t.title,
    t.projectName ?? '<span style="color:#94a3b8">—</span>',
    statusPill('Set ETA', 'amber'),
  ]);
  const html = shell(
    `Set ETAs on ${n} in-progress task${n !== 1 ? 's' : ''}`,
    `<p>${greeting}</p>
     <p>You have <strong>${n}</strong> task${n !== 1 ? 's' : ''} marked as <strong>Working</strong> without an ETA. Setting one helps the team plan and protects you from being chased on it later.</p>
     ${table(rows, ['Task', 'Project', ''])}
     <p>Click any row in the dashboard to set an ETA.</p>`,
    'Open dashboard',
    '/dashboard?view=table',
  );
  return { subject, text, html };
}

/* ─────────────────────────── 4. Admin defaulter digest (morning) ───────────── */
export function adminDefaulterDigest(input: {
  defaulters: { name: string; department: string; status: 'not_submitted' | 'late' }[];
  totalMembers: number;
  submittedCount: number;
}): { subject: string; text: string; html: string } {
  const n = input.defaulters.length;
  const subject = `Daily Standup defaulters — ${n} of ${input.totalMembers} not on time`;
  const text = `Daily Standup status as of 11:00 AM IST:

${input.submittedCount} of ${input.totalMembers} members submitted on time.
${n} pending or late:

${input.defaulters.map(d => `  • ${d.name} (${d.department}) — ${d.status === 'not_submitted' ? 'Not submitted' : 'Late'}`).join('\n')}

View Team Overview: ${appUrl('/standups')}

— ${BRAND}`;
  const rows = input.defaulters.map(d => [
    `<strong>${d.name}</strong>`,
    d.department,
    d.status === 'not_submitted' ? statusPill('Not submitted', 'red') : statusPill('Late', 'amber'),
  ]);
  const html = shell(
    `Daily Standup defaulters — ${n} pending`,
    `<p>Status as of <strong>11:00 AM IST</strong>:</p>
     <p style="background:${BG};border:1px solid ${BORDER};border-radius:8px;padding:12px 16px;margin:8px 0">
       <strong style="color:#16a34a">${input.submittedCount}</strong> of <strong>${input.totalMembers}</strong> submitted on time
       &nbsp;·&nbsp;
       <strong style="color:#dc2626">${n}</strong> pending or late
     </p>
     ${n === 0 ? '<p>🎉 Everyone is on time today.</p>' : table(rows, ['Member', 'Department', 'Status'])}`,
    'Open Team Overview',
    '/standups',
  );
  return { subject, text, html };
}

/* ─────────────────────────── 5. Admin evening digest ──────────────────────── */
export function adminEveningDigest(input: {
  totalMembers: number;
  submittedCount: number;
  closedCount: number;
  totalOutcomes: number;
  doneCount: number;
  notDoneCount: number;
  pendingCount: number;
  carriedCount: number;
  stuckMembers: { name: string; carryStreak: number; outcomeText: string }[];
  flaggedOutcomes: { name: string; outcomeText: string; reason: string }[];
}): { subject: string; text: string; html: string } {
  const completionRate = input.totalOutcomes > 0
    ? Math.round((input.doneCount / input.totalOutcomes) * 100)
    : 0;
  const subject = `Daily Standup wrap — ${completionRate}% completion · ${input.stuckMembers.length} stuck`;

  const stuckRows = input.stuckMembers.map(s => [
    `<strong>${s.name}</strong>`,
    `${s.carryStreak} day${s.carryStreak === 1 ? '' : 's'}`,
    s.outcomeText,
  ]);
  const flaggedRows = input.flaggedOutcomes.map(f => [
    `<strong>${f.name}</strong>`,
    f.outcomeText,
    `<span style="color:${MUTED};font-style:italic">${f.reason}</span>`,
  ]);

  const text = `Daily Standup wrap — ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}

Completion rate: ${completionRate}% (${input.doneCount}/${input.totalOutcomes})
Submitted morning: ${input.submittedCount}/${input.totalMembers}
Closed evening: ${input.closedCount}/${input.totalMembers}
Carried items: ${input.carriedCount}
Stuck (3+ day carry): ${input.stuckMembers.length}

${input.stuckMembers.length > 0 ? 'STUCK MEMBERS:\n' + input.stuckMembers.map(s => `  • ${s.name} — ${s.carryStreak}d — "${s.outcomeText}"`).join('\n') : ''}

${input.flaggedOutcomes.length > 0 ? '\nFLAGGED LOW-QUALITY OUTCOMES:\n' + input.flaggedOutcomes.map(f => `  • ${f.name}: "${f.outcomeText}" — ${f.reason}`).join('\n') : ''}

Open Team Overview: ${appUrl('/standups')}

— ${BRAND}`;

  const html = shell(
    `Daily Standup wrap — ${completionRate}% completion`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px">
       <tr>
         <td style="background:${BG};border:1px solid ${BORDER};border-radius:8px;padding:12px;text-align:center;width:25%">
           <div style="font-size:24px;font-weight:700;color:${TEXT};font-family:Inter,Arial,sans-serif">${completionRate}%</div>
           <div style="font-size:11px;color:${MUTED};margin-top:4px">Completion</div>
         </td>
         <td style="width:8px"></td>
         <td style="background:${BG};border:1px solid ${BORDER};border-radius:8px;padding:12px;text-align:center;width:25%">
           <div style="font-size:24px;font-weight:700;color:${TEXT};font-family:Inter,Arial,sans-serif">${input.submittedCount}/${input.totalMembers}</div>
           <div style="font-size:11px;color:${MUTED};margin-top:4px">Submitted</div>
         </td>
         <td style="width:8px"></td>
         <td style="background:${BG};border:1px solid ${BORDER};border-radius:8px;padding:12px;text-align:center;width:25%">
           <div style="font-size:24px;font-weight:700;color:${TEXT};font-family:Inter,Arial,sans-serif">${input.carriedCount}</div>
           <div style="font-size:11px;color:${MUTED};margin-top:4px">Carried</div>
         </td>
         <td style="width:8px"></td>
         <td style="background:${BG};border:1px solid ${BORDER};border-radius:8px;padding:12px;text-align:center;width:25%">
           <div style="font-size:24px;font-weight:700;color:${input.stuckMembers.length > 0 ? '#dc2626' : TEXT};font-family:Inter,Arial,sans-serif">${input.stuckMembers.length}</div>
           <div style="font-size:11px;color:${MUTED};margin-top:4px">Stuck</div>
         </td>
       </tr>
     </table>
     ${input.stuckMembers.length > 0 ? `
       <h2 style="font-size:14px;font-weight:600;color:${TEXT};margin:16px 0 4px">Stuck members (3+ day carry)</h2>
       ${table(stuckRows, ['Member', 'Stuck for', 'Outcome'])}
     ` : ''}
     ${input.flaggedOutcomes.length > 0 ? `
       <h2 style="font-size:14px;font-weight:600;color:${TEXT};margin:16px 0 4px">Outcomes flagged for quality</h2>
       <p style="font-size:12px;color:${MUTED};margin:0 0 8px">These outcomes are vague or non-measurable — consider asking the owner to rewrite.</p>
       ${table(flaggedRows, ['Member', 'Outcome as written', 'Why flagged'])}
     ` : ''}`,
    'Open Team Overview',
    '/standups',
  );

  return { subject, text, html };
}

/* ─────────────────────────── 6. Generic test email ────────────────────────── */
export function testEmail(input: { recipientName?: string }): {
  subject: string; text: string; html: string;
} {
  const name = input.recipientName ?? 'there';
  const subject = `Task Grid SMTP test — looking good`;
  const text = `Hi ${name},

This is a test email from Task Grid's Gmail SMTP integration. If you're reading this, the pipeline works:

  1. .env.local has the SMTP_USER + SMTP_PASS
  2. nodemailer connected to smtp.gmail.com:465
  3. Gmail accepted the App Password
  4. The recipient address received this within seconds

Sent at ${new Date().toISOString()}

— Task Grid`;
  const html = shell(
    'SMTP test — pipeline is live',
    `<p>Hi ${name},</p>
     <p>This is a test email from Task Grid's <strong>Gmail SMTP integration</strong>. If you're reading this, the pipeline works end-to-end:</p>
     <ol style="padding-left:20px;line-height:1.7">
       <li><code style="background:${BG};padding:1px 6px;border-radius:3px;font-size:12px">.env.local</code> has the SMTP_USER + SMTP_PASS</li>
       <li>nodemailer connected to <code style="background:${BG};padding:1px 6px;border-radius:3px;font-size:12px">smtp.gmail.com:465</code></li>
       <li>Gmail accepted the App Password</li>
       <li>This message landed in your inbox within seconds</li>
     </ol>
     <p style="color:${MUTED};font-size:12px">Sent ${new Date().toISOString()}</p>`,
  );
  return { subject, text, html };
}
