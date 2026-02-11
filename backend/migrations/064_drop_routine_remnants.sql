-- Drop routine-service remnants.
-- routine_tasks data was migrated to todos in 017_todos.sql.
-- is_routine / routine_task_id on time_blocks are no longer used by application code.

-- 1. Drop routine_tasks table (trigger goes with it)
DROP TABLE IF EXISTS routine_tasks;

-- 2. Drop unused columns from time_blocks
ALTER TABLE time_blocks
    DROP COLUMN IF EXISTS is_routine,
    DROP COLUMN IF EXISTS routine_task_id;
