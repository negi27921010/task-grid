-- 008_pg_cron_standup_jobs.sql
--
-- Move scheduled standup nudges from GitHub Actions (unreliable: 2.5h+
-- delays, occasional skips) to Supabase pg_cron + pg_net, which calls our
-- Edge Function `cron-dispatch`, which then hits Vercel's
-- /api/cron/dispatch with the existing CRON_SECRET.
--
-- Schedule (UTC; Mon-Sat only — pg_cron uses standard cron, dow 1-6):
--   10:30 AM IST → 05:00 UTC → morning
--   11:00 AM IST → 05:30 UTC → eta + defaulter (one Edge call, two jobs)
--   06:00 PM IST → 12:30 UTC → evening
--   06:30 PM IST → 13:00 UTC → evening-digest
--
-- BEFORE APPLYING: replace EDGE_SHARED_SECRET_PLACEHOLDER below with the
-- actual EDGE_SHARED_SECRET value (also set as a Supabase Edge Function
-- secret of the same name). The placeholder string is intentionally
-- obvious so an unfilled migration fails the auth check loudly.

-- ─── Extensions ────────────────────────────────────────────────────────
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net  with schema extensions;

-- ─── Idempotent unschedule (so this migration can be re-run) ───────────
do $$
declare
  jobname text;
begin
  for jobname in
    select unnest(array[
      'standup_morning_nudge',
      'standup_eta_defaulter',
      'standup_evening_nudge',
      'standup_evening_digest'
    ])
  loop
    if exists (select 1 from cron.job where jobname = jobname) then
      perform cron.unschedule(jobname);
    end if;
  end loop;
end $$;

-- ─── Helper: build the Edge Function URL ───────────────────────────────
-- Hardcoded project ref keeps the migration self-contained. If the
-- project ref ever changes, update this string in one place.
--
-- EDGE_URL = https://wuxkcrbarsutnvxzzmly.supabase.co/functions/v1/cron-dispatch

-- ─── Schedule the four slots ───────────────────────────────────────────
-- Each cron job calls pg_net.http_post asynchronously; pg_net stores the
-- response in net._http_response, queryable for debugging:
--   select * from net._http_response order by created desc limit 20;

select cron.schedule(
  'standup_morning_nudge',
  '0 5 * * 1-6',
  $$
  select net.http_post(
    url := 'https://wuxkcrbarsutnvxzzmly.supabase.co/functions/v1/cron-dispatch?job=morning&secret=EDGE_SHARED_SECRET_PLACEHOLDER',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

select cron.schedule(
  'standup_eta_defaulter',
  '30 5 * * 1-6',
  $$
  select net.http_post(
    url := 'https://wuxkcrbarsutnvxzzmly.supabase.co/functions/v1/cron-dispatch?job=eta,defaulter&secret=EDGE_SHARED_SECRET_PLACEHOLDER',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

select cron.schedule(
  'standup_evening_nudge',
  '30 12 * * 1-6',
  $$
  select net.http_post(
    url := 'https://wuxkcrbarsutnvxzzmly.supabase.co/functions/v1/cron-dispatch?job=evening&secret=EDGE_SHARED_SECRET_PLACEHOLDER',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

select cron.schedule(
  'standup_evening_digest',
  '0 13 * * 1-6',
  $$
  select net.http_post(
    url := 'https://wuxkcrbarsutnvxzzmly.supabase.co/functions/v1/cron-dispatch?job=evening-digest&secret=EDGE_SHARED_SECRET_PLACEHOLDER',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- ─── Verification queries (run manually after apply) ───────────────────
--
-- 1. Confirm jobs exist:
--      select jobid, schedule, jobname, active from cron.job
--      where jobname like 'standup_%' order by schedule;
--
-- 2. After a fire, check pg_cron's run history:
--      select runid, jobid, status, return_message, start_time, end_time
--      from cron.job_run_details
--      where start_time > now() - interval '2 days'
--      order by start_time desc limit 20;
--
-- 3. Check pg_net's response capture (Edge Function HTTP results):
--      select id, status_code, content::text, created
--      from net._http_response
--      order by created desc limit 20;
