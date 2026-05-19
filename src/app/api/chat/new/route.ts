// POST /api/chat/new
// Archives the user's active conversation and starts a fresh one. Called
// when the user clicks "New conversation" / "Clear" in ChatWidget.

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { archiveAndStartNew } from '@/lib/api/bolt-memory';

export const runtime = 'nodejs';

async function getAuthEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email ?? null;
}

export async function POST() {
  try {
    const email = await getAuthEmail();
    if (!email) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { data: profile } = await admin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const fresh = await archiveAndStartNew(profile.id as string);
    return NextResponse.json({
      conversation_id: fresh.id,
      title: fresh.title,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
