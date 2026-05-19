// Supabase Edge Function: cron-dispatch
//
// Bridges Supabase pg_cron → existing Vercel /api/cron/dispatch endpoint.
//
// Why this exists: pg_cron + pg_net could call Vercel directly, but then
// the Vercel CRON_SECRET would have to live in cron.job rows. This function
// hides that secret in Edge Function env, validates an EDGE_SHARED_SECRET
// from the caller (so only our pg_cron can invoke it), and loops the
// 11:00 AM IST slot (eta + defaulter) into two sequential calls.
//
// Auth: caller must pass ?secret=<EDGE_SHARED_SECRET>. Job is selected via
// ?job=<morning|eta|defaulter|evening|evening-digest>, or ?job=eta,defaulter
// for multi-job slots.
//
// Required Edge Function secrets (set in Supabase dashboard):
//   PROD_URL             - https://taskflow-puce-nine.vercel.app
//   CRON_SECRET          - same value as Vercel env var
//   EDGE_SHARED_SECRET   - random string, also baked into pg_cron migration

// deno-lint-ignore-file no-explicit-any
// @ts-ignore Deno-only import resolved at deploy time
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const VALID_JOBS = new Set([
  'morning',
  'evening',
  'eta',
  'defaulter',
  'evening-digest',
]);

serve(async (req) => {
  const url = new URL(req.url);
  const sharedSecret = url.searchParams.get('secret');
  const jobParam = url.searchParams.get('job') ?? '';

  const expectedSecret = Deno.env.get('EDGE_SHARED_SECRET');
  const prodUrl = Deno.env.get('PROD_URL');
  const cronSecret = Deno.env.get('CRON_SECRET');

  if (!expectedSecret || !prodUrl || !cronSecret) {
    return json({ ok: false, error: 'Edge Function env not configured' }, 500);
  }
  if (sharedSecret !== expectedSecret) {
    return json({ ok: false, error: 'unauthorized' }, 401);
  }

  const jobs = jobParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (jobs.length === 0) {
    return json({ ok: false, error: 'missing ?job=' }, 400);
  }
  for (const j of jobs) {
    if (!VALID_JOBS.has(j)) {
      return json({ ok: false, error: `unknown job: ${j}` }, 400);
    }
  }

  const results: Array<{ job: string; status: number; body: string }> = [];
  for (const job of jobs) {
    const target = `${prodUrl}/api/cron/dispatch?secret=${encodeURIComponent(
      cronSecret,
    )}&job=${encodeURIComponent(job)}`;

    try {
      const res = await fetch(target, {
        method: 'GET',
        signal: AbortSignal.timeout(60_000),
      });
      const body = await res.text();
      results.push({ job, status: res.status, body: body.slice(0, 500) });
    } catch (err: any) {
      results.push({ job, status: 0, body: `fetch error: ${err?.message ?? err}` });
    }
  }

  const anyFailed = results.some((r) => r.status === 0 || r.status >= 400);
  return json({ ok: !anyFailed, results }, anyFailed ? 502 : 200);
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
