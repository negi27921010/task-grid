// GET /api/chat/history
// Returns the active conversation's messages for the signed-in user.
// Used by ChatWidget on mount so messages survive page reloads.

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { loadActiveHistory } from '@/lib/api/bolt-memory';
import { markAllReadForUser } from '@/lib/api/bolt-proactive';

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

export async function GET() {
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

    const { conversation, messages } = await loadActiveHistory(profile.id as string);

    // Capture unread status BEFORE marking read so the UI can render a
    // "new" badge on those rows for the current paint. The mark-read
    // happens fire-and-forget so we don't slow down the open.
    const out = messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.content,
      is_proactive: !!m.is_proactive,
      was_unread: !!m.unread,
    }));
    if (messages.some(m => m.unread)) {
      void markAllReadForUser(profile.id as string);
    }

    return NextResponse.json({
      conversation_id: conversation.id,
      title: conversation.title,
      messages: out,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
