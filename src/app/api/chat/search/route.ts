// GET /api/chat/search?q=...
// Full-text search over the signed-in user's own bolt_messages history.

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { searchMessages } from '@/lib/api/bolt-memory';

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

export async function GET(request: Request) {
  try {
    const userId = await resolveUserId();
    if (!userId) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

    const url = new URL(request.url);
    const q = url.searchParams.get('q') ?? '';
    if (!q.trim()) return NextResponse.json({ results: [] });

    const results = await searchMessages(userId, q, 20);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'unknown' }, { status: 500 });
  }
}
