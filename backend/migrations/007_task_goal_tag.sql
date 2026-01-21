-- Migration: 007_task_goal_tag
-- Description: Add goal_tag column to tasks table for tag inheritance

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS goal_tag VARCHAR(20)
CHECK (goal_tag IN ('GK', 'OSS', 'Output', 'Other'));

-- Comment explaining the tag cascade logic
COMMENT ON COLUMN tasks.goal_tag IS 'Goal tag for this task. Cascade priority: time_entry > task > project';
