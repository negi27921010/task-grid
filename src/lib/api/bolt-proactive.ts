// Server-only — Phase 3. Generates and persists agent-initiated nudges.
//
// Two trigger types in v1:
//   - missing_standup: user hasn't filled morning standup by 11 AM IST
//   - overdue_p1p2:    user has overdue P1/P2 tasks at end of day
//
// Both use the same skeleton:
//   1. Find candidate users matching the condition
//   2. Skip anyone already nudged today (bolt_proactive_log dedupe)
//   3. Generate a personalized message via Groq, fed with the user's
//      memory + the specific data that triggered the nudge
//   4. Persist as bolt_messages row (is_proactive=true, unread=true) in
//      the user's active conversation
//   5. Insert dedupe row to prevent re-firing
//
// Errors per-user are caught and logged — one failure must not block
// nudging the rest of the team.

import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  getOrCreateActiveConversation,
  appendMessage,
  getActiveMemories,
  formatMemoriesForPrompt,
} from './bolt-memory';

function getAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function todayIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`;
}

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string;
}

async function listActiveUsers(sb: SupabaseClient): Promise<UserRow[]> {
  const { data } = await sb.from('users').select('id, full_name, email, role, department');
  return (data ?? []) as UserRow[];
}

// Insert a dedupe row. Returns true if claimed (we should send), false if
// already exists (someone/some prior run already handled this scope).
async function claimNudge(
  sb: SupabaseClient,
  userId: string,
  triggerKind: string,
  scopeKey: string,
): Promise<boolean> {
  // Use upsert with ignoreDuplicates: the unique constraint on
  // (user_id, trigger_kind, scope_key) makes this race-safe.
  const { data, error } = await sb
    .from('bolt_proactive_log')
    .insert({ user_id: userId, trigger_kind: triggerKind, scope_key: scopeKey })
    .select('id')
    .maybeSingle();
  if (error) {
    // 23505 = unique_violation — expected dedupe path.
    if ((error as { code?: string }).code === '23505') return false;
    throw error;
  }
  return !!data;
}

// Persist a generated proactive message into the user's active conversation
// and link it back from the dedupe log.
async function persistProactive(
  sb: SupabaseClient,
  userId: string,
  triggerKind: string,
  scopeKey: string,
  content: string,
): Promise<string> {
  const conv = await getOrCreateActiveConversation(userId);
  const msg = await appendMessage(conv.id, userId, 'assistant', content);
  // Mark as proactive + unread.
  await sb
    .from('bolt_messages')
    .update({ is_proactive: true, unread: true })
    .eq('id', msg.id);
  // Link from the log row so we can audit later.
  await sb
    .from('bolt_proactive_log')
    .update({ message_id: msg.id })
    .eq('user_id', userId)
    .eq('trigger_kind', triggerKind)
    .eq('scope_key', scopeKey);
  return msg.id;
}

// ─── Groq generation ────────────────────────────────────────────────────

async function generateMessage(opts: {
  user: UserRow;
  triggerSystemPrompt: string;
  triggerData: string;
}): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return null;

  const memories = await getActiveMemories(opts.user.id);
  const memoryBlock = formatMemoriesForPrompt(memories);

  const system = `You are **Bolt**, the in-app AI assistant for Task Grid (PW Academy).

You are reaching out PROACTIVELY — the user did not ask. Keep the message:
  - Short (2–4 sentences max)
  - Warm but not gushing — match the tone you'd use with a teammate
  - Specific: name the actual task / standup / data point
  - Action-oriented: end with one concrete next step
  - Plain text, no markdown formatting

User: ${opts.user.full_name} (${opts.user.role}, ${opts.user.department})

${opts.triggerSystemPrompt}

${memoryBlock ? `What you remember about this user (use lightly to personalize tone):\n${memoryBlock}\n` : ''}
Output ONLY the message body — no preamble like "Hi Bolt here", no sign-off.`;

  const userPrompt = `TRIGGER DATA:\n${opts.triggerData}\n\nWrite the message now.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 250,
      }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const text = (body.choices?.[0]?.message?.content ?? '').trim();
    return text || null;
  } catch {
    return null;
  }
}

// ─── Trigger A: Missing standup ────────────────────────────────────────
// At ~11 AM IST, anyone without a morning_submitted_at for today gets a
// personalized in-app nudge. Existing email nudge already fires earlier;
// this is the in-app reinforcement.
export async function runMissingStandupNudge(): Promise<{
  considered: number;
  nudged: number;
  skipped_dedupe: number;
  errors: number;
}> {
  const sb = getAdmin();
  const today = todayIST();
  let considered = 0, nudged = 0, skippedDedupe = 0, errors = 0;

  const users = await listActiveUsers(sb);
  const userIds = users.map(u => u.id);
  const { data: standups } = await sb
    .from('daily_standups')
    .select('user_id, morning_submitted_at')
    .eq('standup_date', today)
    .in('user_id', userIds.length > 0 ? userIds : ['__none__']);
  const submittedSet = new Set(
    (standups ?? []).filter(s => s.morning_submitted_at).map(s => s.user_id as string),
  );

  for (const u of users) {
    if (submittedSet.has(u.id)) continue;
    considered++;
    try {
      const claimed = await claimNudge(sb, u.id, 'missing_standup', today);
      if (!claimed) { skippedDedupe++; continue; }

      const content = await generateMessage({
        user: u,
        triggerSystemPrompt: `Trigger: it's late morning (IST) and the user has NOT submitted today's morning standup.
Goal: nudge them gently to fill it. Don't lecture. Mention "morning standup" by name.`,
        triggerData: `Date: ${today} (IST)\nMorning standup submitted today: NO\nLatest possible action: open the standup form in Task Grid.`,
      });
      if (!content) { errors++; continue; }

      await persistProactive(sb, u.id, 'missing_standup', today, content);
      nudged++;
    } catch (err) {
      console.error('[bolt-proactive missing_standup]', u.id, err);
      errors++;
    }
  }

  return { considered, nudged, skipped_dedupe: skippedDedupe, errors };
}

// ─── Trigger B: Overdue P1/P2 ──────────────────────────────────────────
// At ~6 PM IST, anyone with overdue P1 or P2 tasks (eta < today AND
// status not in completed/cancelled) gets a list with a suggestion to
// reset ETAs or escalate.
export async function runOverdueP1P2Nudge(): Promise<{
  considered: number;
  nudged: number;
  skipped_dedupe: number;
  errors: number;
}> {
  const sb = getAdmin();
  const today = todayIST();
  let considered = 0, nudged = 0, skippedDedupe = 0, errors = 0;

  // Single query for all candidate tasks; bucket by owner client-side
  // to avoid N+1.
  const { data: tasks } = await sb
    .from('tasks')
    .select('id, title, status, priority, owner_id, eta')
    .in('priority', ['P1', 'P2'])
    .not('status', 'in', '(completed,cancelled)')
    .lt('eta', today)
    .order('priority', { ascending: true });

  const byOwner = new Map<string, typeof tasks>();
  for (const t of tasks ?? []) {
    const k = t.owner_id as string;
    if (!byOwner.has(k)) byOwner.set(k, []);
    byOwner.get(k)!.push(t);
  }
  if (byOwner.size === 0) return { considered: 0, nudged: 0, skipped_dedupe: 0, errors: 0 };

  const { data: users } = await sb
    .from('users')
    .select('id, full_name, email, role, department')
    .in('id', Array.from(byOwner.keys()));
  const userById = new Map<string, UserRow>();
  for (const u of (users ?? []) as UserRow[]) userById.set(u.id, u);

  for (const [ownerId, ownerTasks] of byOwner.entries()) {
    const u = userById.get(ownerId);
    if (!u || !ownerTasks || ownerTasks.length === 0) continue;
    considered++;
    try {
      const claimed = await claimNudge(sb, ownerId, 'overdue_p1p2', today);
      if (!claimed) { skippedDedupe++; continue; }

      const taskList = ownerTasks
        .slice(0, 8)
        .map(t => `  - [${t.priority}] "${t.title}" — ETA was ${t.eta} (status: ${t.status})`)
        .join('\n');

      const content = await generateMessage({
        user: u,
        triggerSystemPrompt: `Trigger: at end of day (IST), this user has overdue P1/P2 tasks.
Goal: list them concisely and suggest one of: (a) update the ETA, (b) move status to blocked with a reason, or (c) escalate to lead. Be a teammate, not a manager.`,
        triggerData: `Today: ${today}\nOverdue P1/P2 tasks (${ownerTasks.length} total${ownerTasks.length > 8 ? `, showing 8` : ''}):\n${taskList}`,
      });
      if (!content) { errors++; continue; }

      await persistProactive(sb, ownerId, 'overdue_p1p2', today, content);
      nudged++;
    } catch (err) {
      console.error('[bolt-proactive overdue_p1p2]', ownerId, err);
      errors++;
    }
  }

  return { considered, nudged, skipped_dedupe: skippedDedupe, errors };
}

// ─── Read counters / mark-as-read ───────────────────────────────────────

export async function countUnreadProactive(userId: string): Promise<number> {
  const sb = getAdmin();
  const { count } = await sb
    .from('bolt_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('unread', true);
  return count ?? 0;
}

export async function markAllReadForUser(userId: string): Promise<void> {
  const sb = getAdmin();
  await sb
    .from('bolt_messages')
    .update({ unread: false })
    .eq('user_id', userId)
    .eq('unread', true);
}
