-- Migration: Change tag uniqueness to per-type scope
-- Previously: UNIQUE(user_id, name) prevented same name across task and note tags
-- Now: UNIQUE(user_id, name, type) allows "振り返り" as both task tag and note tag

-- Drop the old constraint (created in 001_init.sql)
ALTER TABLE tags DROP CONSTRAINT IF EXISTS tags_user_id_name_key;

-- Add new constraint scoped by type
ALTER TABLE tags ADD CONSTRAINT tags_user_id_name_type_key UNIQUE (user_id, name, type);
