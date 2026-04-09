-- ============================================================
-- Workstream Registry — Admin-controlled ownership directory
-- ============================================================

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
CREATE INDEX IF NOT EXISTS idx_registry_category ON workstream_registry(category);

ALTER TABLE workstream_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access" ON workstream_registry
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also add effort_hours to standup outcomes
ALTER TABLE standup_outcomes ADD COLUMN IF NOT EXISTS effort_hours numeric DEFAULT NULL;
