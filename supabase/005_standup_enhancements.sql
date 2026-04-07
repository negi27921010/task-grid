-- ============================================================
-- Standup Enhancements: per-outcome timestamps + comments
-- ============================================================

-- Add individual completion timestamp to outcomes
ALTER TABLE standup_outcomes ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Comments on standup outcomes (admin feedback thread)
CREATE TABLE IF NOT EXISTS standup_comments (
  id text PRIMARY KEY,
  outcome_id text NOT NULL REFERENCES standup_outcomes(id) ON DELETE CASCADE,
  author_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_standup_comments_outcome ON standup_comments(outcome_id);

ALTER TABLE standup_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access" ON standup_comments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
