-- Migration: Change clockify_api_key from BYTEA to TEXT (plaintext storage for development)
-- ADR-0003: サードパーティAPIキーの保存方法

-- Drop the encrypted column and add plaintext column
ALTER TABLE user_settings DROP COLUMN IF EXISTS clockify_api_key_encrypted;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS clockify_api_key TEXT;

-- Add clockify_user_id column (needed for sync-service)
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS clockify_user_id VARCHAR(100);
