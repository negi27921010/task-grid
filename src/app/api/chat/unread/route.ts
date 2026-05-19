// GET /api/chat/unread
// Cheap polled endpoint for the chat-widget badge. Returns the count of
// unread proactive messages for the signed-in user. Polled every ~60s
// while a tab is open; cheap because it's a head-only count query.

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { countUnreadProactive } from '@/lib/api/bolt-proactive';

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
    if (!userId) {
      // Don't 401 the badge endpoint — it's polled silently. Return 0
      // so the UI doesn't render a misleading dot on the login page.
      return NextResponse.json({ count: 0 });
    }
    const count = await countUnreadProactive(userId);
    return NextResponse.json({ count });
  } catch (err) {
    return NextResponse.json({ count: 0, error: err instanceof Error ? err.message : 'unknown' }, { status: 200 });
  }
}
