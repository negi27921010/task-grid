import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const SETTINGS_LABEL_NAME = '__system_member_permissions';

async function getAdminClient() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: profile } = await adminClient
    .from('users')
    .select('role')
    .eq('email', user.email)
    .single();

  if (profile?.role !== 'admin') return null;
  return adminClient;
}

function getPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// GET /api/admin/permissions — read member permissions (public, no auth needed)
export async function GET() {
  try {
    const sb = getPublicClient();
    const { data } = await sb
      .from('labels')
      .select('color')
      .eq('name', SETTINGS_LABEL_NAME)
      .maybeSingle();

    if (data?.color) {
      try {
        const permissions = JSON.parse(data.color);
        return NextResponse.json({ permissions });
      } catch {
        return NextResponse.json({ permissions: null });
      }
    }

    return NextResponse.json({ permissions: null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

// POST /api/admin/permissions — save member permissions (admin only)
export async function POST(request: Request) {
  try {
    const adminClient = await getAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { permissions } = await request.json();
    if (!permissions || typeof permissions !== 'object') {
      return NextResponse.json({ error: 'Invalid permissions object' }, { status: 400 });
    }

    const jsonStr = JSON.stringify(permissions);

    // Check if the settings row exists
    const { data: existing } = await adminClient
      .from('labels')
      .select('id')
      .eq('name', SETTINGS_LABEL_NAME)
      .maybeSingle();

    if (existing) {
      // Update existing
      const { error } = await adminClient
        .from('labels')
        .update({ color: jsonStr })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      // Insert new
      const { randomUUID } = await import('crypto');
      const { error } = await adminClient
        .from('labels')
        .insert({
          id: randomUUID(),
          name: SETTINGS_LABEL_NAME,
          color: jsonStr,
        });
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
