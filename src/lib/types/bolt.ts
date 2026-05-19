// Types for Bolt's persistent chat history + curated memory.
// Mirrors the schema in supabase/migrations/009_bolt_memory.sql.

export type BoltMessageRole = 'user' | 'assistant' | 'system';

export interface BoltMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: BoltMessageRole;
  content: string;
  created_at: string;
  // Phase 3: agent-initiated nudges (cron-driven). is_proactive=true rows
  // are also unread=true at insert; UI flips unread when the widget opens.
  is_proactive?: boolean;
  unread?: boolean;
}

export interface BoltConversation {
  id: string;
  user_id: string;
  title: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BoltMemoryKind = 'preference' | 'fact' | 'goal' | 'constraint';

export interface BoltMemory {
  id: string;
  user_id: string;
  kind: BoltMemoryKind;
  content: string;
  source_message_id: string | null;
  last_used_at: string;
  is_active: boolean;
  created_at: string;
}
