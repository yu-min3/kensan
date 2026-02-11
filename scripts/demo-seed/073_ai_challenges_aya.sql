-- ============================================================================
-- Demo Seed: AI Challenges & Ratings — 高橋彩
-- ============================================================================

-- ==============================================================================
-- Section A: Per-user ai_contexts (copy all system templates)
-- ==============================================================================

-- chat context
INSERT INTO ai_contexts (
    id, name, situation, version, is_active, is_default,
    system_prompt, allowed_tools, max_turns, temperature,
    description, user_id, source_template_id
)
SELECT
    'd3c00001-0000-0000-0000-000000000000'::uuid,
    name, situation, version, true, true,
    system_prompt, allowed_tools, max_turns, temperature,
    description,
    'd3333333-3333-3333-3333-333333333333'::uuid,
    id
FROM ai_contexts
WHERE situation = 'chat' AND user_id IS NULL AND is_default = true AND is_active = true
LIMIT 1;

-- review context
INSERT INTO ai_contexts (
    id, name, situation, version, is_active, is_default,
    system_prompt, allowed_tools, max_turns, temperature,
    description, user_id, source_template_id
)
SELECT
    'd3c00002-0000-0000-0000-000000000000'::uuid,
    name, situation, version, true, true,
    system_prompt, allowed_tools, max_turns, temperature,
    description,
    'd3333333-3333-3333-3333-333333333333'::uuid,
    id
FROM ai_contexts
WHERE situation = 'review' AND user_id IS NULL AND is_default = true AND is_active = true
LIMIT 1;

-- daily_advice context
INSERT INTO ai_contexts (
    id, name, situation, version, is_active, is_default,
    system_prompt, allowed_tools, max_turns, temperature,
    description, user_id, source_template_id
)
SELECT
    'd3c00003-0000-0000-0000-000000000000'::uuid,
    name, situation, version, true, true,
    system_prompt, allowed_tools, max_turns, temperature,
    description,
    'd3333333-3333-3333-3333-333333333333'::uuid,
    id
FROM ai_contexts
WHERE situation = 'daily_advice' AND user_id IS NULL AND is_default = true AND is_active = true
LIMIT 1;

-- persona context
INSERT INTO ai_contexts (
    id, name, situation, version, is_active, is_default,
    system_prompt, allowed_tools, max_turns, temperature,
    description, user_id, source_template_id
)
SELECT
    'd3c00004-0000-0000-0000-000000000000'::uuid,
    name, situation, version, true, true,
    system_prompt, allowed_tools, max_turns, temperature,
    description,
    'd3333333-3333-3333-3333-333333333333'::uuid,
    id
FROM ai_contexts
WHERE situation = 'persona' AND user_id IS NULL AND is_default = true AND is_active = true
LIMIT 1;

-- ==============================================================================
-- Section B: ai_context_versions (chat v1 + v2, others v1)
-- ==============================================================================

-- chat v1
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'd3c10001-0000-0000-0000-000000000000'::uuid,
    'd3c00001-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー'
FROM ai_contexts WHERE id = 'd3c00001-0000-0000-0000-000000000000'::uuid;

-- chat v2: 構造化された回答とフレームワーク活用
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'd3c10002-0000-0000-0000-000000000000'::uuid,
    'd3c00001-0000-0000-0000-000000000000'::uuid,
    2,
    system_prompt || E'\n\n## 追加ガイドライン\n- フレームワーク（GROW, SBI等）を積極的に活用する\n- データと数値に基づいた分析を提供する\n- マネジメントと技術の両面からバランスよくアドバイスする',
    allowed_tools, max_turns, temperature,
    'フレームワーク活用とデータドリブンな分析強化'
FROM ai_contexts WHERE id = 'd3c00001-0000-0000-0000-000000000000'::uuid;

-- Update chat context prompt to v2
UPDATE ai_contexts
SET system_prompt = system_prompt || E'\n\n## 追加ガイドライン\n- フレームワーク（GROW, SBI等）を積極的に活用する\n- データと数値に基づいた分析を提供する\n- マネジメントと技術の両面からバランスよくアドバイスする'
WHERE id = 'd3c00001-0000-0000-0000-000000000000'::uuid;

-- review v1
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'd3c10003-0000-0000-0000-000000000000'::uuid,
    'd3c00002-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー'
FROM ai_contexts WHERE id = 'd3c00002-0000-0000-0000-000000000000'::uuid;

-- daily_advice v1
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'd3c10004-0000-0000-0000-000000000000'::uuid,
    'd3c00003-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー'
FROM ai_contexts WHERE id = 'd3c00003-0000-0000-0000-000000000000'::uuid;

-- persona v1
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'd3c10005-0000-0000-0000-000000000000'::uuid,
    'd3c00004-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー'
FROM ai_contexts WHERE id = 'd3c00004-0000-0000-0000-000000000000'::uuid;

-- ==============================================================================
-- Section C: Update ai_interactions with context_id and rating
-- ==============================================================================

-- chat interactions
UPDATE ai_interactions SET context_id = 'd3c00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'd3800001-0000-0000-0000-000000000000'::uuid;  -- 1on1テンプレート

UPDATE ai_interactions SET context_id = 'd3c00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'd3800002-0000-0000-0000-000000000000'::uuid;  -- PRレビュー改善

UPDATE ai_interactions SET context_id = 'd3c00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'd3800003-0000-0000-0000-000000000000'::uuid;  -- 技術力低下不安

-- morning interaction → daily_advice context
UPDATE ai_interactions SET context_id = 'd3c00003-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'd3800004-0000-0000-0000-000000000000'::uuid;  -- 今週の計画確認

-- evening interaction → daily_advice context
UPDATE ai_interactions SET context_id = 'd3c00003-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'd3800005-0000-0000-0000-000000000000'::uuid;  -- 8週間振り返り

-- ==============================================================================
-- Section D: prompt_comparisons (chat v1 vs v2, 2 rounds, tie)
-- ==============================================================================

INSERT INTO prompt_comparisons (
    id, context_id, version_a, version_b, status,
    rounds, win_rate_b, user_id, created_at
) VALUES (
    'd3c20001-0000-0000-0000-000000000000'::uuid,
    'd3c00001-0000-0000-0000-000000000000'::uuid,
    1, 2, 'active',
    '[
      {"round_id": "d3c30001-0000-0000-0000-000000000000", "mapping": {"A": 2, "B": 1}, "winner": "A"},
      {"round_id": "d3c30002-0000-0000-0000-000000000000", "mapping": {"A": 1, "B": 2}, "winner": "A"}
    ]'::jsonb,
    1.00,
    'd3333333-3333-3333-3333-333333333333'::uuid,
    NOW() - INTERVAL '1 day'
);
