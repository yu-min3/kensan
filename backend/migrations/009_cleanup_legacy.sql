-- Migration 009: Cleanup legacy columns and tables
-- This migration removes deprecated columns from the old project-based model
-- Run this AFTER 001_init.sql has been updated with the new schema

-- ============================================
-- Drop legacy columns from tasks
-- ============================================
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_user_id_clockify_id_key;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_goal_tag_check;
DROP INDEX IF EXISTS idx_tasks_project_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS project_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS clockify_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS goal_tag;

-- ============================================
-- Drop legacy columns from time_blocks
-- ============================================
ALTER TABLE time_blocks DROP CONSTRAINT IF EXISTS time_blocks_project_id_fkey;
ALTER TABLE time_blocks DROP CONSTRAINT IF EXISTS time_blocks_goal_tag_check;
DROP INDEX IF EXISTS idx_time_blocks_project_id;
ALTER TABLE time_blocks DROP COLUMN IF EXISTS project_id;
ALTER TABLE time_blocks DROP COLUMN IF EXISTS project_name;
ALTER TABLE time_blocks DROP COLUMN IF EXISTS goal_tag;

-- ============================================
-- Drop legacy columns from time_entries
-- ============================================
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_project_id_fkey;
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_user_id_clockify_id_key;
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_goal_tag_check;
DROP INDEX IF EXISTS idx_time_entries_project_id;
ALTER TABLE time_entries DROP COLUMN IF EXISTS project_id;
ALTER TABLE time_entries DROP COLUMN IF EXISTS project_name;
ALTER TABLE time_entries DROP COLUMN IF EXISTS goal_tag;
ALTER TABLE time_entries DROP COLUMN IF EXISTS clockify_id;

-- ============================================
-- Drop legacy columns from learning_records
-- ============================================
ALTER TABLE learning_records DROP CONSTRAINT IF EXISTS learning_records_project_id_fkey;
ALTER TABLE learning_records DROP CONSTRAINT IF EXISTS learning_records_goal_tag_check;
DROP INDEX IF EXISTS idx_learning_records_project_id;
DROP INDEX IF EXISTS idx_learning_records_goal_tag;
ALTER TABLE learning_records DROP COLUMN IF EXISTS project_id;
ALTER TABLE learning_records DROP COLUMN IF EXISTS project_name;
ALTER TABLE learning_records DROP COLUMN IF EXISTS goal_tag;

-- ============================================
-- Drop legacy columns from running_timers
-- ============================================
ALTER TABLE running_timers DROP COLUMN IF EXISTS project_id;
ALTER TABLE running_timers DROP COLUMN IF EXISTS goal_tag;

-- ============================================
-- Drop legacy projects table
-- ============================================
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP INDEX IF EXISTS idx_projects_user_id;
DROP INDEX IF EXISTS idx_projects_goal_tag;
DROP TABLE IF EXISTS projects CASCADE;

-- ============================================
-- Drop legacy sync_status table (Clockify sync removed)
-- ============================================
DROP TRIGGER IF EXISTS update_sync_status_updated_at ON sync_status;
DROP TABLE IF EXISTS sync_status CASCADE;

-- ============================================
-- Drop Clockify-related columns from user_settings
-- ============================================
ALTER TABLE user_settings DROP COLUMN IF EXISTS clockify_api_key_encrypted;
ALTER TABLE user_settings DROP COLUMN IF EXISTS workspace_id;
ALTER TABLE user_settings DROP COLUMN IF EXISTS workspace_name;
