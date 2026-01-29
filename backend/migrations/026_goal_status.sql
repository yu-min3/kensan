-- Migration: 026_goal_status
-- Description: Replace is_archived with status field for goals (matching milestones)

-- 1. Add status column with default 'active'
ALTER TABLE goals ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';

-- 2. Add check constraint for valid status values
ALTER TABLE goals ADD CONSTRAINT goals_status_check CHECK (status IN ('active', 'completed', 'archived'));

-- 3. Migrate existing data: archived goals get 'archived' status
UPDATE goals SET status = 'archived' WHERE is_archived = true;

-- 4. Drop the is_archived column
ALTER TABLE goals DROP COLUMN is_archived;
