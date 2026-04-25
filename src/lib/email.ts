// Gmail SMTP email helper.
// Uses nodemailer over SSL on 465. Requires SMTP_USER / SMTP_PASS env
// vars (Gmail App Password — generate at myaccount.google.com/apppasswords).
//
// Single transport instance is reused across cron invocations to keep the
// TLS handshake cost down on warm Vercel functions.

import nodemailer, { type Transporter } from 'nodemailer';

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST ?? 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error(
      'SMTP not configured — set SMTP_USER and SMTP_PASS (Gmail App Password) in env',
    );
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,           // SSL for 465, STARTTLS for 587
    auth: { user, pass },
    pool: true,                     // reuse connections within a single
    maxConnections: 3,              // function invocation
    maxMessages: 50,
  });

  return cachedTransporter;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  // Provide either text, html, or both. Gmail prefers multipart (both) for
  // best deliverability — most templates render an HTML version + a plain
  // text fallback.
  text?: string;
  html?: string;
  // Optional `replyTo` (rare — usually From handles it).
  replyTo?: string;
  // Optional tag for logs / future analytics.
  tag?: string;
}

export interface SendEmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!input.text && !input.html) {
    throw new Error('sendEmail: either text or html must be provided');
  }

  const fromName = process.env.SMTP_FROM_NAME ?? 'Task Grid';
  const fromEmail = process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER!;
  const from = `"${fromName}" <${fromEmail}>`;

  const transporter = getTransporter();

  // Single retry on transient failures — Gmail SMTP occasionally hiccups
  // on the first send after a cold start (TLS handshake races).
  const attempt = async () =>
    transporter.sendMail({
      from,
      to: Array.isArray(input.to) ? input.to.join(', ') : input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
      headers: input.tag ? { 'X-Task-Grid-Tag': input.tag } : undefined,
    });

  try {
    const info = await attempt();
    return {
      messageId: info.messageId,
      accepted: (info.accepted ?? []).map(String),
      rejected: (info.rejected ?? []).map(String),
    };
  } catch (firstErr) {
    // Tear down the cached transport and retry once with a fresh one —
    // covers stale-connection edge cases.
    cachedTransporter?.close?.();
    cachedTransporter = null;
    const info = await getTransporter().sendMail({
      from,
      to: Array.isArray(input.to) ? input.to.join(', ') : input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
      headers: input.tag ? { 'X-Task-Grid-Tag': input.tag } : undefined,
    });
    return {
      messageId: info.messageId,
      accepted: (info.accepted ?? []).map(String),
      rejected: (info.rejected ?? []).map(String),
    };
  }
}

// Verifier — handy for /api/cron/dispatch?dry=1 health checks.
export async function verifySmtp(): Promise<boolean> {
  try {
    await getTransporter().verify();
    return true;
  } catch {
    return false;
  }
}
