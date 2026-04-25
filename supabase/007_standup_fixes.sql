-- ============================================================
-- Standup Fixes
--   1. Add effort_hours column (required going forward; column
--      stays nullable so the API can keep accepting historical
--      submissions, but the UI/API enforce required for
--      standup_date >= tomorrow IST).
--   2. Backfill existing rows with the default 1.0h so prior
--      standups don't render as "missing" in the team view.
--   3. Relax priority_order CHECK so carried + new outcomes can
--      together exceed 6 (root cause of submission failures when
--      a member had several carried items).
-- ============================================================

ALTER TABLE standup_outcomes
  ADD COLUMN IF NOT EXISTS effort_hours numeric(4,1);

UPDATE standup_outcomes
  SET effort_hours = 1.0
  WHERE effort_hours IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'standup_outcomes'
      AND constraint_name = 'standup_outcomes_priority_order_check'
  ) THEN
    ALTER TABLE standup_outcomes
      DROP CONSTRAINT standup_outcomes_priority_order_check;
  END IF;
END $$;

ALTER TABLE standup_outcomes
  ADD CONSTRAINT standup_outcomes_priority_order_check
  CHECK (priority_order BETWEEN 1 AND 30);
