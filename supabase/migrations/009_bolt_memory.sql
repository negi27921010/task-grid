-- 009_bolt_memory.sql
--
-- Persistent chat history + agent-curated memory for Bolt (the in-app
-- AI assistant). Phase 1 of the Hermes-inspired upgrades.
--
-- Three tables:
--   bolt_conversations  — one row per chat session. Each user has at most
--                         one *active* conversation; older ones are
--                         soft-archived and kept for history/search.
--   bolt_messages       — every user/assistant turn, stored verbatim.
--   bolt_memory         — durable facts about the user, extracted from
--                         conversation by a small LLM call after each
--                         turn. Injected into future turns' system prompt.
--
-- RLS: enabled but permissive (matches existing app pattern). The /api/chat
-- routes always use the service-role key and filter by user_id explicitly,
-- so browser clients never hit these tables directly.

-- ─── Tables ────────────────────────────────────────────────────────────

create table if not exists bolt_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references users(id) on delete cascade,
  -- Auto-generated short title from the first user message (set after
  -- the first response). Null until that point.
  title       text,
  -- Soft archive — when a user clicks "New conversation" we set this so
  -- the old chat stays searchable but a fresh history loads.
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- At most one active conversation per user. Race-safe under concurrent
-- inserts because of the unique partial index.
create unique index if not exists bolt_conversations_one_active_per_user
  on bolt_conversations(user_id) where is_active;

create index if not exists bolt_conversations_user_idx
  on bolt_conversations(user_id, updated_at desc);

create table if not exists bolt_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references bolt_conversations(id) on delete cascade,
  user_id         text not null references users(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null,
  -- Optional: tokens used / model / cost fields for observability later.
  -- Left out in v1 to keep the surface small.
  created_at      timestamptz not null default now()
);

create index if not exists bolt_messages_conv_idx
  on bolt_messages(conversation_id, created_at);
create index if not exists bolt_messages_user_idx
  on bolt_messages(user_id, created_at desc);

create table if not exists bolt_memory (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null references users(id) on delete cascade,
  -- Coarse category to help the prompt-injection step group memories.
  -- 'preference' (likes/dislikes), 'fact' (durable info about the user),
  -- 'goal' (what they're working toward), 'constraint' (limits/rules they've stated).
  kind              text not null check (kind in ('preference','fact','goal','constraint')),
  -- The memory itself, written in 3rd person ("User prefers concise answers").
  content           text not null,
  -- Origin trace — null if extraction lost the source pointer.
  source_message_id uuid references bolt_messages(id) on delete set null,
  -- Last time the memory was injected into a prompt; used for LRU eviction
  -- when a user accumulates more than the cap (50).
  last_used_at      timestamptz not null default now(),
  -- Soft-delete: set false when user says "forget that". Kept around so we
  -- can debug extraction quality without losing history.
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

create index if not exists bolt_memory_user_idx
  on bolt_memory(user_id, is_active, last_used_at desc);
-- Dedupe guard: the extractor occasionally re-emits the same fact. Unique
-- on (user_id, content) prevents row spam; updates bump last_used_at via
-- ON CONFLICT in the API code.
create unique index if not exists bolt_memory_user_content_uniq
  on bolt_memory(user_id, content) where is_active;

-- ─── RLS ───────────────────────────────────────────────────────────────
-- Permissive — matches the existing tasks/projects RLS. API routes guard
-- with user_id filters using the service role.

alter table bolt_conversations enable row level security;
alter table bolt_messages      enable row level security;
alter table bolt_memory        enable row level security;

drop policy if exists "bolt_conv_all" on bolt_conversations;
create policy "bolt_conv_all" on bolt_conversations
  for all using (true) with check (true);

drop policy if exists "bolt_msg_all" on bolt_messages;
create policy "bolt_msg_all" on bolt_messages
  for all using (true) with check (true);

drop policy if exists "bolt_mem_all" on bolt_memory;
create policy "bolt_mem_all" on bolt_memory
  for all using (true) with check (true);

-- ─── Touch updated_at on conversations when a message is added ─────────
create or replace function bolt_touch_conversation()
returns trigger language plpgsql as $$
begin
  update bolt_conversations
     set updated_at = now()
   where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists bolt_messages_touch_conv on bolt_messages;
create trigger bolt_messages_touch_conv
  after insert on bolt_messages
  for each row execute function bolt_touch_conversation();
