import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

async function verifyAdmin() {
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

// POST /api/admin/users — create user (DB + Auth)
export async function POST(request: Request) {
  try {
    const adminClient = await verifyAdmin();
    if (!adminClient) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { full_name, email, role, department, password } = await request.json();

    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    const userId = uuidv4();

    // If email + password provided, create Supabase Auth account
    let authUserId: string | null = null;
    if (email?.trim() && password) {
      if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      }

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
      });

      if (authError) {
        return NextResponse.json({ error: `Auth error: ${authError.message}` }, { status: 400 });
      }
      authUserId = authData.user.id;
    }

    // Create row in public.users
    const { data, error } = await adminClient
      .from('users')
      .insert({
        id: userId,
        email: email?.trim() || '',
        full_name: full_name.trim(),
        avatar_url: null,
        role: role || 'member',
        department: department?.trim() || '',
      })
      .select()
      .single();

    if (error) {
      // Roll back auth user if DB insert failed
      if (authUserId) {
        await adminClient.auth.admin.deleteUser(authUserId);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data, password: password || null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

// PATCH /api/admin/users — update user (DB + Auth)
export async function PATCH(request: Request) {
  try {
    const adminClient = await verifyAdmin();
    if (!adminClient) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id, full_name, email, role, department } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'User id is required' }, { status: 400 });
    }

    // Get old user to check if email changed
    const { data: oldUser } = await adminClient
      .from('users')
      .select('email')
      .eq('id', id)
      .single();

    // Update public.users
    const updates: Record<string, unknown> = {};
    if (full_name !== undefined) updates.full_name = full_name.trim();
    if (email !== undefined) updates.email = email.trim();
    if (role !== undefined) updates.role = role;
    if (department !== undefined) updates.department = department.trim();

    const { data, error } = await adminClient
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If email changed and old email had an auth account, update auth email
    if (email && oldUser?.email && email.trim() !== oldUser.email) {
      const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const authUser = authUsers.find(u => u.email === oldUser.email);
      if (authUser) {
        await adminClient.auth.admin.updateUserById(authUser.id, {
          email: email.trim(),
        });
      }
    }

    return NextResponse.json({ user: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/users — delete user (DB + Auth)
export async function DELETE(request: Request) {
  try {
    const adminClient = await verifyAdmin();
    if (!adminClient) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'User id is required' }, { status: 400 });
    }

    // Get user email to find auth account
    const { data: user } = await adminClient
      .from('users')
      .select('email')
      .eq('id', id)
      .single();

    // Delete from public.users
    const { error } = await adminClient.from('users').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Delete auth account if exists
    if (user?.email) {
      const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const authUser = authUsers.find(u => u.email === user.email);
      if (authUser) {
        await adminClient.auth.admin.deleteUser(authUser.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
