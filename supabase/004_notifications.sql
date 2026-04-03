-- ============================================================
-- Notifications Module
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('mention', 'assignment', 'status_change')),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  task_id text REFERENCES tasks(id) ON DELETE CASCADE,
  project_id text REFERENCES projects(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_task ON notifications(task_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access" ON notifications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
