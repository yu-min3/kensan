-- Migration: Add start_date to milestones
-- This allows milestones to have a date range (start_date to target_date)

ALTER TABLE milestones ADD COLUMN start_date DATE;

-- Index for efficient queries
CREATE INDEX idx_milestones_start_date ON milestones(start_date);
