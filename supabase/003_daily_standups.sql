-- ============================================================
-- Daily Standup Module — Migration
-- 2 tables: daily_standups, standup_outcomes
-- ============================================================

-- 1. DAILY STANDUPS (one per member per day)
CREATE TABLE IF NOT EXISTS daily_standups (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  standup_date date NOT NULL,

  -- Morning submission
  morning_submitted_at timestamptz,
  morning_is_late boolean NOT NULL DEFAULT false,
  dependencies_risks text,

  -- Evening submission
  evening_submitted_at timestamptz,
  evening_is_late boolean NOT NULL DEFAULT false,
  evening_notes text,
  evening_auto_closed boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(user_id, standup_date)
);

-- 2. STANDUP OUTCOMES (1-6 per standup)
CREATE TABLE IF NOT EXISTS standup_outcomes (
  id text PRIMARY KEY,
  standup_id text NOT NULL REFERENCES daily_standups(id) ON DELETE CASCADE,

  outcome_text text NOT NULL,
  priority_order smallint NOT NULL CHECK (priority_order BETWEEN 1 AND 6),

  -- Carry-forward tracking
  is_carried boolean NOT NULL DEFAULT false,
  carried_from_outcome_id text REFERENCES standup_outcomes(id) ON DELETE SET NULL,
  carry_streak integer NOT NULL DEFAULT 0,

  -- Evening closure
  evening_status text NOT NULL DEFAULT 'pending' CHECK (evening_status IN ('pending', 'done', 'not_done')),
  reason_not_done text,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_standups_user_date ON daily_standups(user_id, standup_date DESC);
CREATE INDEX IF NOT EXISTS idx_standups_date ON daily_standups(standup_date);
CREATE INDEX IF NOT EXISTS idx_outcomes_standup ON standup_outcomes(standup_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_carried_from ON standup_outcomes(carried_from_outcome_id);

-- ============================================================
-- ROW LEVEL SECURITY (permissive — app-level RBAC)
-- ============================================================
ALTER TABLE daily_standups ENABLE ROW LEVEL SECURITY;
ALTER TABLE standup_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access" ON daily_standups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access" ON standup_outcomes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
