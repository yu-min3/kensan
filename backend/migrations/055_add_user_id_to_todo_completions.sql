-- Add user_id to todo_completions for multi-tenancy data isolation
ALTER TABLE todo_completions ADD COLUMN user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Backfill from todos table
UPDATE todo_completions tc SET user_id = t.user_id FROM todos t WHERE tc.todo_id = t.id;

-- Remove the default after backfill
ALTER TABLE todo_completions ALTER COLUMN user_id DROP DEFAULT;

-- Add index for multi-tenancy queries
CREATE INDEX idx_todo_completions_user_id ON todo_completions (user_id);
