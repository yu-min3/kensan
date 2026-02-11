-- 063: プロンプト自己最適化システム
-- prompt_evaluations: コンテキストごとの定期評価結果
-- prompt_experiments: 改善プロンプトのチャレンジ実験

-- =============================================================================
-- prompt_evaluations: 定量・定性評価
-- =============================================================================
CREATE TABLE IF NOT EXISTS prompt_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    context_id UUID NOT NULL REFERENCES ai_contexts(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    interaction_count INT NOT NULL DEFAULT 0,
    avg_rating FLOAT,
    rated_count INT NOT NULL DEFAULT 0,
    tool_success_rate FLOAT,
    avg_turns FLOAT,
    avg_tokens FLOAT,
    strengths TEXT[] DEFAULT '{}',
    weaknesses TEXT[] DEFAULT '{}',
    improvement_suggestions TEXT[] DEFAULT '{}',
    sample_analysis JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(context_id, period_start)
);

CREATE INDEX idx_prompt_evaluations_context_id ON prompt_evaluations(context_id);

-- =============================================================================
-- prompt_experiments: チャレンジ実験管理
-- =============================================================================
CREATE TABLE IF NOT EXISTS prompt_experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    situation TEXT NOT NULL,
    evaluation_id UUID NOT NULL REFERENCES prompt_evaluations(id) ON DELETE CASCADE,
    control_context_id UUID NOT NULL REFERENCES ai_contexts(id) ON DELETE CASCADE,
    variant_context_id UUID NOT NULL REFERENCES ai_contexts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending_review'
        CHECK (status IN ('pending_review', 'in_challenge', 'promoted', 'rejected')),
    challenge_type TEXT NOT NULL DEFAULT 'side_by_side',
    challenge_config JSONB NOT NULL DEFAULT '{}',
    challenge_results JSONB NOT NULL DEFAULT '[]',
    win_rate FLOAT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prompt_experiments_status ON prompt_experiments(status);
CREATE INDEX idx_prompt_experiments_situation ON prompt_experiments(situation);
