-- Migration: Add sort_order to goals for manual ordering

ALTER TABLE goals ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Index for efficient sorting
CREATE INDEX idx_goals_sort_order ON goals(user_id, sort_order);

-- Set initial sort_order based on creation date
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 AS rn
  FROM goals
)
UPDATE goals SET sort_order = ranked.rn FROM ranked WHERE goals.id = ranked.id;
