// GET  /api/chat/memory          — list all active memories for the user
// POST /api/chat/memory/forget   — see ./forget/route.ts

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { listAllActiveMemories } from '@/lib/api/bolt-memory';

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

export async function GET() {
  try {
    const userId = await resolveUserId();
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    const items = await listAllActiveMemories(userId);
    return NextResponse.json({
      items: items.map(m => ({
        id: m.id,
        kind: m.kind,
        content: m.content,
        last_used_at: m.last_used_at,
        created_at: m.created_at,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'unknown' }, { status: 500 });
  }
}
