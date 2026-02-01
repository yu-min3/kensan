-- Create read-only views for analytics service.
-- This isolates analytics queries from direct cross-service table access,
-- making service boundaries explicit and enabling future migration to
-- separate databases or API-based data access.

CREATE OR REPLACE VIEW analytics_time_blocks AS
SELECT
    user_id,
    start_datetime,
    end_datetime,
    goal_id,
    goal_name,
    goal_color,
    milestone_id,
    milestone_name,
    tag_ids
FROM time_blocks;

CREATE OR REPLACE VIEW analytics_time_entries AS
SELECT
    user_id,
    start_datetime,
    end_datetime,
    goal_id,
    goal_name,
    goal_color,
    milestone_id,
    milestone_name,
    tag_ids
FROM time_entries;

CREATE OR REPLACE VIEW analytics_tasks AS
SELECT
    user_id,
    id,
    completed,
    updated_at
FROM tasks;

CREATE OR REPLACE VIEW analytics_goals AS
SELECT
    user_id,
    id,
    name,
    color,
    (status = 'archived') AS is_archived
FROM goals;

COMMENT ON VIEW analytics_time_blocks IS 'Read-only view for analytics service. Source: time_blocks table (timeblock-service domain).';
COMMENT ON VIEW analytics_time_entries IS 'Read-only view for analytics service. Source: time_entries table (timeblock-service domain).';
COMMENT ON VIEW analytics_tasks IS 'Read-only view for analytics service. Source: tasks table (task-service domain).';
COMMENT ON VIEW analytics_goals IS 'Read-only view for analytics service. Source: goals table (task-service domain).';
