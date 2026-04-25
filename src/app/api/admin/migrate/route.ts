import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Verify admin
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: profile } = await adminClient.from('users').select('role').eq('email', user.email).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    // Return the SQL that needs to be run
    const sql = `
-- Migration 005: Standup enhancements
ALTER TABLE standup_outcomes ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE standup_outcomes ADD COLUMN IF NOT EXISTS effort_hours numeric DEFAULT NULL;

CREATE TABLE IF NOT EXISTS standup_comments (
  id text PRIMARY KEY,
  outcome_id text NOT NULL REFERENCES standup_outcomes(id) ON DELETE CASCADE,
  author_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_standup_comments_outcome ON standup_comments(outcome_id);
ALTER TABLE standup_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='standup_comments') THEN
    CREATE POLICY "auth_full_access" ON standup_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Migration 006: Workstream Registry
CREATE TABLE IF NOT EXISTS workstream_registry (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  category text NOT NULL DEFAULT 'Ops' CHECK (category IN ('Finance', 'Ops', 'Hiring', 'Product', 'Tech', 'Business')),
  priority_tag text NOT NULL DEFAULT 'Core' CHECK (priority_tag IN ('Core', 'Strategic', 'Support')),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'On Hold', 'Completed', 'Deprecated')),
  primary_owner_id text NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  secondary_owner_id text REFERENCES users(id) ON DELETE SET NULL,
  team text DEFAULT '',
  sop_links text[] DEFAULT '{}',
  important_links text[] DEFAULT '{}',
  dependencies text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_registry_owner ON workstream_registry(primary_owner_id);
CREATE INDEX IF NOT EXISTS idx_registry_status ON workstream_registry(status);
ALTER TABLE workstream_registry ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='workstream_registry') THEN
    CREATE POLICY "auth_full_access" ON workstream_registry FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Migration 007: Standup fixes (effort_hours + priority_order relax)
ALTER TABLE standup_outcomes ADD COLUMN IF NOT EXISTS effort_hours numeric(4,1);
UPDATE standup_outcomes SET effort_hours = 1.0 WHERE effort_hours IS NULL;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name='standup_outcomes' AND constraint_name='standup_outcomes_priority_order_check'
  ) THEN
    ALTER TABLE standup_outcomes DROP CONSTRAINT standup_outcomes_priority_order_check;
  END IF;
END $$;
ALTER TABLE standup_outcomes
  ADD CONSTRAINT standup_outcomes_priority_order_check CHECK (priority_order BETWEEN 1 AND 30);
    `.trim();

    return NextResponse.json({
      message: 'Run this SQL in Supabase SQL Editor',
      url: 'https://supabase.com/dashboard/project/wuxkcrbarsutnvxzzmly/sql/new',
      sql,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
