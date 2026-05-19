-- 010_bolt_search.sql
--
-- Postgres full-text search over bolt_messages.content. Lets users find
-- "what did Bolt say about X last week" without re-running expensive
-- queries against tasks/standups.
--
-- Generated tsvector column + GIN index. Generated columns auto-update
-- on insert/update of `content`, so no app-level work needed.

-- Add the FTS column. Idempotent — uses if not exists pattern via DO.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'bolt_messages'
       and column_name  = 'fts'
  ) then
    alter table bolt_messages
      add column fts tsvector
      generated always as (to_tsvector('english', coalesce(content, ''))) stored;
  end if;
end $$;

create index if not exists bolt_messages_fts_idx
  on bolt_messages using gin(fts);

-- ─── Verification ──────────────────────────────────────────────────────
-- After running, try:
--   select id, role, ts_headline('english', content, plainto_tsquery('english','task')) as snippet
--     from bolt_messages
--    where fts @@ plainto_tsquery('english', 'task')
--    order by created_at desc limit 10;
