// Server-only module. DB ops + LLM-driven memory extraction for Bolt.
//
// This file MUST NEVER be imported from client components — it pulls the
// service-role Supabase key. The /api/chat/* route handlers are the only
// callers.

import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { BoltConversation, BoltMessage, BoltMemory, BoltMemoryKind } from '@/lib/types/bolt';

// Cap on how many active memories we keep per user. Beyond this, we LRU-
// evict (deactivate the oldest last_used_at). 50 is enough for ~3-5
// turns of memory-relevant signal per session over many sessions while
// keeping the injected prompt small.
const ACTIVE_MEMORY_CAP = 50;
// How many memories we inject into the system prompt of a turn.
const MEMORY_INJECT_TOP_N = 20;
// History length sent to Groq (prevents context blowup; older turns are
// represented by curated memory instead).
const HISTORY_TURNS_FOR_PROMPT = 12;

function getAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// ─── Conversations ──────────────────────────────────────────────────────

export async function getOrCreateActiveConversation(userId: string): Promise<BoltConversation> {
  const sb = getAdmin();
  const { data: existing } = await sb
    .from('bolt_conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (existing) return existing as BoltConversation;

  const { data: created, error } = await sb
    .from('bolt_conversations')
    .insert({ user_id: userId, is_active: true })
    .select()
    .single();
  if (error || !created) throw new Error(`Could not create conversation: ${error?.message}`);
  return created as BoltConversation;
}

// Archive the current active conversation and return a fresh one. Used by
// the "New conversation" button. Atomic-ish: the unique partial index on
// is_active prevents two active rows for the same user, so we archive
// first, then insert.
export async function archiveAndStartNew(userId: string): Promise<BoltConversation> {
  const sb = getAdmin();
  await sb
    .from('bolt_conversations')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_active', true);
  return getOrCreateActiveConversation(userId);
}

// Best-effort: only set the title once, on the first user message. Avoids
// overwriting if the user themselves edited it later (future feature).
export async function setConversationTitleIfMissing(conversationId: string, firstUserMessage: string): Promise<void> {
  const sb = getAdmin();
  const title = firstUserMessage.length > 60
    ? firstUserMessage.slice(0, 57).trimEnd() + '…'
    : firstUserMessage;
  await sb
    .from('bolt_conversations')
    .update({ title })
    .eq('id', conversationId)
    .is('title', null);
}

// ─── Messages ───────────────────────────────────────────────────────────

export async function appendMessage(
  conversationId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<BoltMessage> {
  const sb = getAdmin();
  const { data, error } = await sb
    .from('bolt_messages')
    .insert({ conversation_id: conversationId, user_id: userId, role, content })
    .select()
    .single();
  if (error || !data) throw new Error(`Could not save message: ${error?.message}`);
  return data as BoltMessage;
}

// Load messages for the current active conversation, ordered oldest-first.
// Caps at the most recent N to keep payloads bounded — older context is
// represented in bolt_memory.
export async function loadActiveHistory(userId: string, limit: number = 50): Promise<{
  conversation: BoltConversation;
  messages: BoltMessage[];
}> {
  const conversation = await getOrCreateActiveConversation(userId);
  const sb = getAdmin();
  const { data, error } = await sb
    .from('bolt_messages')
    .select('*')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load history: ${error.message}`);
  // Re-sort to oldest-first for chat UI.
  const messages = (data as BoltMessage[]).slice().reverse();
  return { conversation, messages };
}

// History formatted for the LLM call — recent turns only, role/content
// pairs. The system prompt + memory carry the rest of the context.
export function formatHistoryForPrompt(messages: BoltMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter(m => m.role !== 'system')
    .slice(-HISTORY_TURNS_FOR_PROMPT)
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
}

// ─── Memory ─────────────────────────────────────────────────────────────

export async function getActiveMemories(userId: string): Promise<BoltMemory[]> {
  const sb = getAdmin();
  const { data, error } = await sb
    .from('bolt_memory')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('last_used_at', { ascending: false })
    .limit(MEMORY_INJECT_TOP_N);
  if (error) throw new Error(`Could not load memory: ${error.message}`);
  return (data ?? []) as BoltMemory[];
}

// Format memories for prompt injection. Returns empty string if none —
// caller can decide whether to include the heading.
export function formatMemoriesForPrompt(memories: BoltMemory[]): string {
  if (memories.length === 0) return '';
  // Group by kind to make the prompt scannable.
  const byKind: Record<BoltMemoryKind, string[]> = {
    fact: [], preference: [], goal: [], constraint: [],
  };
  for (const m of memories) byKind[m.kind].push(m.content);
  const sections: string[] = [];
  if (byKind.fact.length)        sections.push(`Facts:\n${byKind.fact.map(c => `  - ${c}`).join('\n')}`);
  if (byKind.preference.length)  sections.push(`Preferences:\n${byKind.preference.map(c => `  - ${c}`).join('\n')}`);
  if (byKind.goal.length)        sections.push(`Goals:\n${byKind.goal.map(c => `  - ${c}`).join('\n')}`);
  if (byKind.constraint.length)  sections.push(`Constraints:\n${byKind.constraint.map(c => `  - ${c}`).join('\n')}`);
  return sections.join('\n');
}

// Bump last_used_at for the memories we just injected so LRU-eviction
// targets stale ones. Fire-and-forget; failures are non-fatal.
export async function markMemoriesUsed(memoryIds: string[]): Promise<void> {
  if (memoryIds.length === 0) return;
  const sb = getAdmin();
  await sb
    .from('bolt_memory')
    .update({ last_used_at: new Date().toISOString() })
    .in('id', memoryIds);
}

interface ExtractedMemoryItem {
  kind: BoltMemoryKind;
  content: string;
}

// Run a small Groq call to extract durable user-facts from the latest
// turn. Uses temperature 0.1 for stable JSON. Returns [] on any error
// (extraction is best-effort — never blocks the user response).
async function callGroqExtraction(
  groqKey: string,
  userMessage: string,
  assistantMessage: string,
  existingMemoryHints: string,
): Promise<ExtractedMemoryItem[]> {
  const system = `You extract DURABLE FACTS about the USER from a chat exchange — things that would be useful to remember in future, unrelated conversations.

EXTRACT (write each as a 3rd-person statement about the user):
  - preference   — how they like to work, communicate, receive answers
  - fact         — durable info about their role, team, project, tools, environment
  - goal         — what they're trying to accomplish over weeks/months (NOT today's task)
  - constraint   — rules, limits, deadlines, things they've said to avoid

DO NOT EXTRACT:
  - One-off task details ("user wants to know how many overdue tasks today")
  - Information about other people, the system, or general knowledge
  - Inferences from a single ambiguous turn — only what the user clearly stated
  - Facts already in EXISTING MEMORY (don't re-emit duplicates)

Output a JSON array of {"kind","content"} objects. If nothing notable, output [].
Output ONLY valid JSON — no markdown fences, no commentary.

EXISTING MEMORY (do not duplicate):
${existingMemoryHints || '(none)'}`;

  const user = `USER said: ${userMessage}

ASSISTANT replied: ${assistantMessage.slice(0, 1500)}

Extract durable facts about the user now. JSON array only.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) return [];
    const body = await res.json();
    const raw = body.choices?.[0]?.message?.content ?? '';
    // Some models wrap the array in an object like {"items": [...]} when
    // response_format=json_object is forced. Handle both shapes.
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed
              : Array.isArray(parsed?.items) ? parsed.items
              : Array.isArray(parsed?.memories) ? parsed.memories
              : [];
    return arr
      .filter((x: unknown): x is ExtractedMemoryItem => {
        if (!x || typeof x !== 'object') return false;
        const obj = x as Record<string, unknown>;
        return ['preference','fact','goal','constraint'].includes(obj.kind as string)
          && typeof obj.content === 'string'
          && (obj.content as string).trim().length > 0;
      })
      .slice(0, 8); // hard cap per turn
  } catch {
    return [];
  }
}

// LRU-evict oldest memories beyond the cap. Called after a save so users
// who hit 50 memories naturally lose the oldest ones.
async function evictExcessMemories(userId: string): Promise<void> {
  const sb = getAdmin();
  const { data: active } = await sb
    .from('bolt_memory')
    .select('id, last_used_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('last_used_at', { ascending: false });
  if (!active || active.length <= ACTIVE_MEMORY_CAP) return;
  const toEvict = active.slice(ACTIVE_MEMORY_CAP).map(m => m.id);
  if (toEvict.length === 0) return;
  await sb.from('bolt_memory').update({ is_active: false }).in('id', toEvict);
}

// Public entry point: extract + persist memories from the just-completed
// turn. Called after the assistant response is fully streamed. Catches
// all errors internally — extraction MUST NOT fail the chat turn.
export async function extractAndSaveMemories(opts: {
  userId: string;
  userMessage: string;
  assistantMessage: string;
  sourceMessageId: string | null;
  existingMemories: BoltMemory[];
}): Promise<number> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return 0;
  if (!opts.userMessage.trim() || !opts.assistantMessage.trim()) return 0;

  const hints = opts.existingMemories.slice(0, 30).map(m => `  - [${m.kind}] ${m.content}`).join('\n');
  const items = await callGroqExtraction(groqKey, opts.userMessage, opts.assistantMessage, hints);
  if (items.length === 0) return 0;

  const sb = getAdmin();
  let saved = 0;
  for (const item of items) {
    // Upsert on (user_id, content) — bumps last_used_at if the same fact
    // is re-extracted, otherwise inserts. The unique partial index on
    // is_active=true backs this. We don't use ON CONFLICT directly via
    // PostgREST because the index is partial; do a manual check.
    const { data: existing } = await sb
      .from('bolt_memory')
      .select('id')
      .eq('user_id', opts.userId)
      .eq('content', item.content)
      .eq('is_active', true)
      .maybeSingle();
    if (existing) {
      await sb
        .from('bolt_memory')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', existing.id);
      continue;
    }
    const { error } = await sb.from('bolt_memory').insert({
      user_id: opts.userId,
      kind: item.kind,
      content: item.content,
      source_message_id: opts.sourceMessageId,
    });
    if (!error) saved++;
  }

  if (saved > 0) {
    // Don't await — eviction is a cleanup tax, not on the response path.
    void evictExcessMemories(opts.userId);
  }
  return saved;
}

// Forget endpoint helper — used by future "forget that" UX. Not exposed
// in v1 UI but the API is here so we don't have to schema-change later.
export async function deactivateMemory(userId: string, memoryId: string): Promise<void> {
  const sb = getAdmin();
  await sb
    .from('bolt_memory')
    .update({ is_active: false })
    .eq('id', memoryId)
    .eq('user_id', userId);
}

// Forget every memory derived from a specific message. Used by the
// per-message "forget" button — undoes whatever Bolt learned from that
// turn in one click.
export async function deactivateMemoriesFromMessage(userId: string, messageId: string): Promise<number> {
  const sb = getAdmin();
  const { data, error } = await sb
    .from('bolt_memory')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('source_message_id', messageId)
    .eq('is_active', true)
    .select('id');
  if (error) throw new Error(`Could not forget: ${error.message}`);
  return data?.length ?? 0;
}

// Full memory list for the management panel — distinct from
// getActiveMemories() (which caps at 20 for prompt injection).
export async function listAllActiveMemories(userId: string): Promise<BoltMemory[]> {
  const sb = getAdmin();
  const { data, error } = await sb
    .from('bolt_memory')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('last_used_at', { ascending: false });
  if (error) throw new Error(`Could not list memories: ${error.message}`);
  return (data ?? []) as BoltMemory[];
}

// Full-text search over the user's own messages (both their turns and
// Bolt's replies). Returns top N matches, newest first within ties.
export async function searchMessages(userId: string, query: string, limit: number = 20): Promise<{
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  snippet: string;
  created_at: string;
}[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const sb = getAdmin();
  // RPC would be cleaner for ts_headline, but Supabase's PostgREST allows
  // raw `or` and `match` filters. We use a simple `to_tsquery` via the
  // textSearch operator, then format snippets in JS.
  const { data, error } = await sb
    .from('bolt_messages')
    .select('id, conversation_id, role, content, created_at')
    .eq('user_id', userId)
    .textSearch('fts', trimmed, { type: 'plain', config: 'english' })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Search failed: ${error.message}`);
  // Build a basic snippet around the first match. Keeps payload small.
  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  const buildSnippet = (content: string): string => {
    const lower = content.toLowerCase();
    let bestIdx = -1;
    for (const t of tokens) {
      const i = lower.indexOf(t);
      if (i >= 0 && (bestIdx === -1 || i < bestIdx)) bestIdx = i;
    }
    if (bestIdx === -1) return content.slice(0, 160);
    const start = Math.max(0, bestIdx - 60);
    const end = Math.min(content.length, bestIdx + 100);
    return (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '');
  };
  return (data ?? []).map(m => ({
    id: m.id as string,
    conversation_id: m.conversation_id as string,
    role: m.role as 'user' | 'assistant',
    content: m.content as string,
    snippet: buildSnippet(m.content as string),
    created_at: m.created_at as string,
  }));
}
