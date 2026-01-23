-- User Memory tables for AI personalization
-- Migration 013: User memory and facts

-- User memory summary (aggregated profile)
CREATE TABLE user_memory (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    profile_summary TEXT,
    preferences JSONB DEFAULT '{}',
    strengths TEXT[] DEFAULT '{}',
    growth_areas TEXT[] DEFAULT '{}',
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Individual facts learned about users
CREATE TABLE user_facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fact_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'conversation',
    confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_facts_user_id ON user_facts(user_id);
CREATE INDEX idx_user_facts_fact_type ON user_facts(fact_type);
CREATE INDEX idx_user_facts_created_at ON user_facts(created_at);
CREATE INDEX idx_user_facts_expires_at ON user_facts(expires_at) WHERE expires_at IS NOT NULL;

-- Add trigger for updated_at on user_memory
CREATE TRIGGER update_user_memory_updated_at
    BEFORE UPDATE ON user_memory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fact types:
-- - 'preference': User preferences (e.g., "prefers morning study", "likes Kubernetes")
-- - 'goal': Goals and aspirations
-- - 'strength': Things user is good at
-- - 'challenge': Areas user struggles with
-- - 'schedule': Schedule-related info (e.g., "works 9-6")
-- - 'context': Contextual info (e.g., "preparing for CKA exam")
