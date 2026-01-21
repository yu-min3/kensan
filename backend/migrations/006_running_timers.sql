-- Migration: 006_running_timers
-- Description: Create running_timers table for active time tracking

CREATE TABLE IF NOT EXISTS running_timers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    project_name VARCHAR(255),
    goal_tag VARCHAR(20) CHECK (goal_tag IN ('GK', 'OSS', 'Output', 'Other')),
    description TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient user lookup
CREATE INDEX idx_running_timers_user_id ON running_timers(user_id);

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_running_timers_updated_at
    BEFORE UPDATE ON running_timers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
