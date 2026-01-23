-- AI Interactions table for logging all AI conversations
-- Migration 011: AI interactions

CREATE TABLE ai_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    situation VARCHAR(50) NOT NULL DEFAULT 'chat',
    context_id UUID,
    user_input TEXT NOT NULL,
    ai_output TEXT NOT NULL,
    tool_calls JSONB DEFAULT '[]',
    tokens_input INTEGER,
    tokens_output INTEGER,
    latency_ms INTEGER,
    rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_interactions_user_id ON ai_interactions(user_id);
CREATE INDEX idx_ai_interactions_session_id ON ai_interactions(session_id);
CREATE INDEX idx_ai_interactions_situation ON ai_interactions(situation);
CREATE INDEX idx_ai_interactions_created_at ON ai_interactions(created_at);
CREATE INDEX idx_ai_interactions_context_id ON ai_interactions(context_id);
