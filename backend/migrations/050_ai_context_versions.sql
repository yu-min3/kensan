-- AI Context Versions table for prompt version history
-- Migration 050: AI context versions

CREATE TABLE ai_context_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    context_id UUID NOT NULL REFERENCES ai_contexts(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    system_prompt TEXT NOT NULL,
    allowed_tools TEXT[] NOT NULL DEFAULT '{}',
    max_turns INTEGER NOT NULL,
    temperature FLOAT NOT NULL,
    changelog TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_ai_context_versions_unique
    ON ai_context_versions(context_id, version_number);
CREATE INDEX idx_ai_context_versions_context
    ON ai_context_versions(context_id, version_number DESC);

-- Seed initial versions (version_number=1) from current ai_contexts data
INSERT INTO ai_context_versions (context_id, version_number, system_prompt, allowed_tools, max_turns, temperature, changelog)
SELECT id, 1, system_prompt, allowed_tools, max_turns, temperature, '初期バージョン'
FROM ai_contexts
WHERE is_active = true;
