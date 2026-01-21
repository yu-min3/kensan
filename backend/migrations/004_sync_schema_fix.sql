-- Migration 004: Fix schema for Clockify sync
-- Add missing columns required by sync-service

-- Add client_id and client_name to projects for Clockify client info
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id VARCHAR(100);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);

-- Add duration column to time_entries for Clockify duration string (ISO 8601)
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS duration VARCHAR(50);
