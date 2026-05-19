// POST /api/standups/nudge
// Body: { user_id: string, kind: 'morning' | 'evening' | 'carried' }
//
// Admin-only single-user nudge trigger. Imports the runners directly
// from the shared lib — used to HTTP-bounce through /api/cron/dispatch
// but Vercel cross-route auth was returning 401 inconsistently.

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  runMorningStandupNudge,
  runEveningClosureNudge,
  runCarriedTaskNudge,
} from '@/lib/api/standup-runners';

export const runtime = 'nodejs';
export const maxDuration = 30;

const VALID_KINDS = new Set(['morning', 'evening', 'carried']);

async function resolveAdminUserId(): Promise<{ id: string } | { error: string; status: number }> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: 'Sign in required', status: 401 };
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: profile } = await admin
    .from('users')
    .select('id, role')
    .eq('email', user.email)
    .single();
  if (!profile) return { error: 'User not found', status: 404 };
  if (profile.role !== 'admin') return { error: 'Admins only', status: 403 };
  return { id: profile.id as string };
}

export async function POST(request: Request) {
  const auth = await resolveAdminUserId();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const userId = typeof body.user_id === 'string' ? body.user_id : '';
  const kind = typeof body.kind === 'string' ? body.kind : '';
  if (!userId || !VALID_KINDS.has(kind)) {
    return NextResponse.json({ error: 'user_id and valid kind required' }, { status: 400 });
  }

  try {
    const report =
      kind === 'morning'  ? await runMorningStandupNudge(userId) :
      kind === 'evening'  ? await runEveningClosureNudge(userId) :
      /* carried */         await runCarriedTaskNudge(userId);

    // The runner returns attempted=0 sent=0 if the user has nothing to
    // be nudged about (e.g. already submitted morning, no carried items).
    // Surface that explicitly so the UI can show "no nudge needed"
    // instead of a vague success.
    if (report.attempted === 0) {
      return NextResponse.json({
        ok: true,
        nothing_to_send: true,
        reason:
          kind === 'morning'
            ? 'Already submitted morning standup, or no member found.'
          : kind === 'evening'
            ? 'No pending outcomes to close, or no member found.'
            : 'No carried tasks open today, or member has no standup yet.',
      });
    }

    return NextResponse.json({
      ok: true,
      sent: report.sent,
      errors: report.errors,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Nudge failed' },
      { status: 500 },
    );
  }
}
