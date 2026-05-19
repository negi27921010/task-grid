// POST /api/chat/memory/forget
// Body: { memory_id?: string, message_id?: string }
//
// Deactivates either a single memory (memory_id) or every memory extracted
// from a specific assistant turn (message_id). At least one must be set.

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { deactivateMemory, deactivateMemoriesFromMessage } from '@/lib/api/bolt-memory';

export const runtime = 'nodejs';

async function resolveUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: profile } = await admin.from('users').select('id').eq('email', user.email).single();
  return (profile?.id as string) ?? null;
}

export async function POST(request: Request) {
  try {
    const userId = await resolveUserId();
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const memoryId = typeof body.memory_id === 'string' ? body.memory_id : null;
    const messageId = typeof body.message_id === 'string' ? body.message_id : null;
    if (!memoryId && !messageId) {
      return NextResponse.json({ error: 'memory_id or message_id required' }, { status: 400 });
    }

    if (memoryId) {
      await deactivateMemory(userId, memoryId);
      return NextResponse.json({ ok: true, count: 1 });
    }
    const count = await deactivateMemoriesFromMessage(userId, messageId!);
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'unknown' }, { status: 500 });
  }
}
