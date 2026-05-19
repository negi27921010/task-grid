-- 014_pg_cron_proactive_jobs.sql
--
-- Adds the two Phase-3 in-app proactive nudges to the pg_cron schedule.
-- These write to bolt_messages (no email cost), so they can fire more
-- liberally than the email jobs in migration 008.
--
-- Schedule (UTC; Mon-Sat only — pg_cron uses dow 1-6):
--   11:30 AM IST → 06:00 UTC → proactive-missing-standup
--   02:30 PM IST → 09:00 UTC → proactive-overdue-p1p2
--
-- BEFORE APPLYING: replace EDGE_SHARED_SECRET_PLACEHOLDER with the same
-- value used in migration 008 (and set as a Supabase Edge Function
-- secret of the same name).

-- ─── Idempotent unschedule ─────────────────────────────────────────────
do $$
declare
  jobname text;
begin
  for jobname in
    select unnest(array[
      'proactive_missing_standup',
      'proactive_overdue_p1p2'
    ])
  loop
    if exists (select 1 from cron.job where jobname = jobname) then
      perform cron.unschedule(jobname);
    end if;
  end loop;
end $$;

-- ─── Schedule the two proactive slots ──────────────────────────────────

select cron.schedule(
  'proactive_missing_standup',
  '0 6 * * 1-6',
  $$
  select net.http_post(
    url := 'https://wuxkcrbarsutnvxzzmly.supabase.co/functions/v1/cron-dispatch?job=proactive-missing-standup&secret=EDGE_SHARED_SECRET_PLACEHOLDER',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

select cron.schedule(
  'proactive_overdue_p1p2',
  '0 9 * * 1-6',
  $$
  select net.http_post(
    url := 'https://wuxkcrbarsutnvxzzmly.supabase.co/functions/v1/cron-dispatch?job=proactive-overdue-p1p2&secret=EDGE_SHARED_SECRET_PLACEHOLDER',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- ─── Verification ──────────────────────────────────────────────────────
-- select jobid, schedule, jobname, active from cron.job
-- where jobname like 'proactive_%' order by schedule;
