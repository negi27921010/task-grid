-- 011_bolt_proactive.sql
--
-- Phase 3: proactive Bolt nudges. The agent now reaches out to users
-- under specific conditions (no morning standup by 11 AM, overdue
-- P1/P2 tasks at end of day, etc.) instead of waiting to be asked.
--
-- Two schema changes + one new dedupe table + (optional) pg_cron jobs.

-- ─── Columns on bolt_messages ───────────────────────────────────────────
-- is_proactive: marks a message as agent-initiated (cron-driven), not a
-- reply to a user turn. Renders with a "Bolt reached out" badge.
-- unread: true when proactive, flips to false when the user opens the
-- chat widget (auto-marked by /api/chat/history).
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'bolt_messages'
       and column_name = 'is_proactive'
  ) then
    alter table bolt_messages
      add column is_proactive boolean not null default false,
      add column unread       boolean not null default false;
  end if;
end $$;

create index if not exists bolt_messages_unread_idx
  on bolt_messages(user_id, unread) where unread;

-- ─── Dedupe log ─────────────────────────────────────────────────────────
-- Prevents re-sending the same proactive nudge to the same user for the
-- same scope (e.g. same date or same task) during a single trigger window.
-- Composite unique key is the dedupe contract.
create table if not exists bolt_proactive_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null references users(id) on delete cascade,
  -- Trigger that fired ('missing_standup', 'overdue_p1p2', ...).
  trigger_kind text not null,
  -- Scope of the dedupe — usually a date string ('2026-05-04') so a daily
  -- trigger fires exactly once per user per day. For task-scoped triggers
  -- it would be the task id.
  scope_key    text not null,
  -- Message we generated (FK kept loose — message can be deleted by user
  -- via "new conversation" without removing the dedupe row).
  message_id   uuid references bolt_messages(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (user_id, trigger_kind, scope_key)
);

create index if not exists bolt_proactive_log_user_idx
  on bolt_proactive_log(user_id, created_at desc);

-- ─── RLS ────────────────────────────────────────────────────────────────
alter table bolt_proactive_log enable row level security;
drop policy if exists "bolt_proactive_log_all" on bolt_proactive_log;
create policy "bolt_proactive_log_all" on bolt_proactive_log
  for all using (true) with check (true);

-- ─── pg_cron schedules (OPTIONAL — uncomment after verifying manual run)
-- ─────────────────────────────────────────────────────────────────────
-- These schedules call /api/cron/dispatch directly via pg_net. They need
-- the production URL and CRON_SECRET baked in. To activate:
--   1. Replace CRON_SECRET_PLACEHOLDER below with your actual CRON_SECRET
--      (the same value set as a Vercel env var).
--   2. Replace PROD_URL_PLACEHOLDER with your prod URL
--      (e.g. https://taskflow-puce-nine.vercel.app).
--   3. Uncomment the two cron.schedule blocks.
--   4. Verify with: select * from cron.job where jobname like 'bolt_%';
--
-- Schedule (UTC; IST-aligned, Mon-Sat only):
--   11:30 AM IST → 06:00 UTC → proactive-missing-standup
--                  (30 min after the email nudge so users have had a chance)
--   06:00 PM IST → 12:30 UTC → proactive-overdue-p1p2
--
-- Idempotent unschedule first:
-- do $$
-- declare jobname text;
-- begin
--   for jobname in select unnest(array['bolt_missing_standup','bolt_overdue_p1p2'])
--   loop
--     if exists (select 1 from cron.job where jobname = jobname) then
--       perform cron.unschedule(jobname);
--     end if;
--   end loop;
-- end $$;
--
-- select cron.schedule(
--   'bolt_missing_standup',
--   '0 6 * * 1-6',
--   $cron$
--   select net.http_post(
--     url := 'PROD_URL_PLACEHOLDER/api/cron/dispatch?secret=CRON_SECRET_PLACEHOLDER&job=proactive-missing-standup',
--     headers := '{"Content-Type":"application/json"}'::jsonb,
--     timeout_milliseconds := 90000
--   );
--   $cron$
-- );
--
-- select cron.schedule(
--   'bolt_overdue_p1p2',
--   '30 12 * * 1-6',
--   $cron$
--   select net.http_post(
--     url := 'PROD_URL_PLACEHOLDER/api/cron/dispatch?secret=CRON_SECRET_PLACEHOLDER&job=proactive-overdue-p1p2',
--     headers := '{"Content-Type":"application/json"}'::jsonb,
--     timeout_milliseconds := 90000
--   );
--   $cron$
-- );

-- ─── Verification queries (run manually after apply) ───────────────────
--   select count(*) from bolt_proactive_log;        -- 0
--   select column_name from information_schema.columns
--    where table_name='bolt_messages' and column_name in ('is_proactive','unread');
--   -- expect 2 rows
