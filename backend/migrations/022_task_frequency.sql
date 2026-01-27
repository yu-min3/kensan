-- Migration: Add frequency and days_of_week to tasks table
-- This enables recurring tasks functionality

-- Add frequency column (daily, weekly, custom)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS frequency VARCHAR(20);

-- Add days_of_week column (array of integers: 0=Sun, 1=Mon, ..., 6=Sat)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS days_of_week INTEGER[];

-- Add sort_order column if not exists (needed for task reordering)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add index for filtering recurring tasks
CREATE INDEX IF NOT EXISTS idx_tasks_frequency ON tasks(frequency) WHERE frequency IS NOT NULL;
