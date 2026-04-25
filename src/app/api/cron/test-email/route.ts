// One-shot SMTP smoke test. Hit GET /api/cron/test-email?secret=...&to=foo@bar
// to verify the SMTP pipeline end-to-end before relying on the cron jobs.

import { NextResponse } from 'next/server';
import { sendEmail, verifySmtp } from '@/lib/email';
import { testEmail } from '@/lib/email-templates';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.CRON_SECRET;
  if (!secret || url.searchParams.get('secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const to = url.searchParams.get('to') ?? process.env.ADMIN_EMAIL;
  if (!to) {
    return NextResponse.json(
      { error: 'No recipient — pass ?to=address@example.com or set ADMIN_EMAIL' },
      { status: 400 },
    );
  }

  const verified = await verifySmtp();
  if (!verified) {
    return NextResponse.json(
      { error: 'SMTP verification failed — check SMTP_USER / SMTP_PASS' },
      { status: 502 },
    );
  }

  try {
    const { subject, text, html } = testEmail({ recipientName: 'tester' });
    const result = await sendEmail({ to, subject, text, html, tag: 'smtp_test' });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
