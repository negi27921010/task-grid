-- Add multi-assignee support
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_ids text[] DEFAULT '{}';
UPDATE tasks SET assignee_ids = ARRAY[owner_id] WHERE owner_id IS NOT NULL AND (assignee_ids IS NULL OR assignee_ids = '{}');
CREATE INDEX IF NOT EXISTS idx_tasks_assignees ON tasks USING GIN(assignee_ids);
