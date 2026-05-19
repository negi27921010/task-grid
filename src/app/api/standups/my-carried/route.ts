// GET /api/standups/my-carried
// Returns the signed-in user's currently-open carried outcomes for today.
// Polled every ~5 min by CarriedTaskAlerter to drive the in-app
// notification + sound. Cheap query (today's row only).

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

function todayIST(): string {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`;
}

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
      // Don't 401 the polled endpoint — return empty so the alerter
      // doesn't fire on the login page.
      return NextResponse.json({ items: [] });
    }
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const today = todayIST();
    const { data: standup } = await admin
      .from('daily_standups')
      .select('id')
      .eq('user_id', userId)
      .eq('standup_date', today)
      .maybeSingle();
    if (!standup) return NextResponse.json({ items: [], standup_exists: false });

    const { data: outcomes } = await admin
      .from('standup_outcomes')
      .select('id, outcome_text, carry_streak, reason_not_done, evening_status')
      .eq('standup_id', standup.id as string)
      .eq('is_carried', true);

    const items = (outcomes ?? [])
      .filter(o => o.evening_status !== 'done')
      .map(o => ({
        id: o.id as string,
        title: o.outcome_text as string,
        carry_streak: (o.carry_streak as number) ?? 1,
        reason: (o.reason_not_done as string | null) ?? null,
      }));

    return NextResponse.json({ items, standup_exists: true });
  } catch (err) {
    return NextResponse.json({ items: [], error: err instanceof Error ? err.message : 'unknown' }, { status: 200 });
  }
}
