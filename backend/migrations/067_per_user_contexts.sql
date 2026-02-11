-- 067: Per-user AI contexts
-- ai_contexts に user_id を追加し、ユーザーごとにプロンプトをカスタマイズ可能にする。
-- user_id = NULL の行はシステムテンプレート（コピー元）として残る。
-- prompt_evaluations, prompt_experiments にも user_id を追加。

-- =============================================================================
-- ai_contexts: user_id + source_template_id 追加
-- =============================================================================
ALTER TABLE ai_contexts ADD COLUMN user_id UUID;
ALTER TABLE ai_contexts ADD COLUMN source_template_id UUID REFERENCES ai_contexts(id);

-- 旧ユニーク制約を差し替え（システムテンプレート用 + ユーザー用）
DROP INDEX IF EXISTS idx_ai_contexts_default_per_situation;
CREATE UNIQUE INDEX idx_ai_contexts_default_per_situation_system
    ON ai_contexts(situation) WHERE user_id IS NULL AND is_default = true AND is_active = true;
CREATE UNIQUE INDEX idx_ai_contexts_default_per_situation_user
    ON ai_contexts(user_id, situation) WHERE user_id IS NOT NULL AND is_default = true AND is_active = true;
CREATE INDEX idx_ai_contexts_user_id ON ai_contexts(user_id) WHERE user_id IS NOT NULL;

-- =============================================================================
-- prompt_evaluations: user_id 追加
-- =============================================================================
ALTER TABLE prompt_evaluations ADD COLUMN user_id UUID;
ALTER TABLE prompt_evaluations DROP CONSTRAINT IF EXISTS prompt_evaluations_context_id_period_start_key;
CREATE UNIQUE INDEX idx_prompt_evaluations_unique
    ON prompt_evaluations(context_id, period_start, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID));

-- =============================================================================
-- prompt_experiments: user_id 追加
-- =============================================================================
ALTER TABLE prompt_experiments ADD COLUMN user_id UUID;
CREATE INDEX idx_prompt_experiments_user_id ON prompt_experiments(user_id) WHERE user_id IS NOT NULL;
