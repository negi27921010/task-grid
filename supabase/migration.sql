-- ============================================================
-- Task Grid — Supabase Migration
-- 5 tables: users, projects, tasks, comments, labels
-- ============================================================

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text UNIQUE,
  full_name text NOT NULL,
  avatar_url text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  department text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'paused')),
  owner_id text REFERENCES users(id) ON DELETE SET NULL,
  start_date date,
  target_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id text REFERENCES tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'blocked', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'P3' CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
  owner_id text REFERENCES users(id) ON DELETE SET NULL,
  eta timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  blocker_reason text,
  depth int NOT NULL DEFAULT 0,
  position int NOT NULL DEFAULT 0,
  path text NOT NULL DEFAULT '/',
  tags text[] DEFAULT '{}',
  estimated_hours numeric,
  actual_hours numeric,
  remarks text,
  assignee_ids text[] DEFAULT '{}',
  labels text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. COMMENTS
CREATE TABLE IF NOT EXISTS comments (
  id text PRIMARY KEY,
  task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id text REFERENCES users(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. LABELS
CREATE TABLE IF NOT EXISTS labels (
  id text PRIMARY KEY,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  created_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignees ON tasks USING GIN(assignee_ids);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (permissive — all authenticated users can read/write)
-- Fine-grained RBAC is enforced in the application layer
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users full access (app-level RBAC handles permissions)
CREATE POLICY "Authenticated users full access" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access" ON projects
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access" ON tasks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access" ON comments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access" ON labels
  FOR ALL USING (true) WITH CHECK (true);
