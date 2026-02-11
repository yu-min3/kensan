-- Prompt comparisons: version-based A/B comparison sessions
CREATE TABLE prompt_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    context_id UUID NOT NULL REFERENCES ai_contexts(id) ON DELETE CASCADE,
    version_a INTEGER NOT NULL,
    version_b INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'adopted_a', 'adopted_b', 'dismissed')),
    rounds JSONB NOT NULL DEFAULT '[]'::jsonb,
    win_rate_b REAL,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_prompt_comparisons_user_status ON prompt_comparisons (user_id, status);
CREATE INDEX idx_prompt_comparisons_context ON prompt_comparisons (context_id);
