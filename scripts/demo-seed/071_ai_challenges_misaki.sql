-- ============================================================================
-- Demo Seed: AI Challenges & Ratings — 鈴木美咲
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
    'd1c00001-0000-0000-0000-000000000000'::uuid,
    name, situation, version, true, true,
    system_prompt, allowed_tools, max_turns, temperature,
    description,
    'd1111111-1111-1111-1111-111111111111'::uuid,
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
    'd1c00002-0000-0000-0000-000000000000'::uuid,
    name, situation, version, true, true,
    system_prompt, allowed_tools, max_turns, temperature,
    description,
    'd1111111-1111-1111-1111-111111111111'::uuid,
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
    'd1c00003-0000-0000-0000-000000000000'::uuid,
    name, situation, version, true, true,
    system_prompt, allowed_tools, max_turns, temperature,
    description,
    'd1111111-1111-1111-1111-111111111111'::uuid,
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
    'd1c00004-0000-0000-0000-000000000000'::uuid,
    name, situation, version, true, true,
    system_prompt, allowed_tools, max_turns, temperature,
    description,
    'd1111111-1111-1111-1111-111111111111'::uuid,
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
    'd1c10001-0000-0000-0000-000000000000'::uuid,
    'd1c00001-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー'
FROM ai_contexts WHERE id = 'd1c00001-0000-0000-0000-000000000000'::uuid;

-- chat v2: カジュアルなコミュニケーション強化
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'd1c10002-0000-0000-0000-000000000000'::uuid,
    'd1c00001-0000-0000-0000-000000000000'::uuid,
    2,
    system_prompt || E'\n\n## 追加ガイドライン\n- カジュアルなトーンで親しみやすく\n- 実践的なコード例を多く含める\n- 学習のモチベーションを高める声かけを意識する',
    allowed_tools, max_turns, temperature,
    'カジュアルなトーンと実践コード例の強化'
FROM ai_contexts WHERE id = 'd1c00001-0000-0000-0000-000000000000'::uuid;

-- Update chat context prompt to v2
UPDATE ai_contexts
SET system_prompt = system_prompt || E'\n\n## 追加ガイドライン\n- カジュアルなトーンで親しみやすく\n- 実践的なコード例を多く含める\n- 学習のモチベーションを高める声かけを意識する'
WHERE id = 'd1c00001-0000-0000-0000-000000000000'::uuid;

-- review v1
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'd1c10003-0000-0000-0000-000000000000'::uuid,
    'd1c00002-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー'
FROM ai_contexts WHERE id = 'd1c00002-0000-0000-0000-000000000000'::uuid;

-- daily_advice v1
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'd1c10004-0000-0000-0000-000000000000'::uuid,
    'd1c00003-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー'
FROM ai_contexts WHERE id = 'd1c00003-0000-0000-0000-000000000000'::uuid;

-- persona v1
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'd1c10005-0000-0000-0000-000000000000'::uuid,
    'd1c00004-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー'
FROM ai_contexts WHERE id = 'd1c00004-0000-0000-0000-000000000000'::uuid;

-- ==============================================================================
-- Section C: Update ai_interactions with context_id and rating
-- ==============================================================================

-- chat interactions
UPDATE ai_interactions SET context_id = 'd1c00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'd1800001-0000-0000-0000-000000000000'::uuid;  -- jQueryからReact

UPDATE ai_interactions SET context_id = 'd1c00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'd1800002-0000-0000-0000-000000000000'::uuid;  -- useEffect無限ループ

UPDATE ai_interactions SET context_id = 'd1c00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'd1800003-0000-0000-0000-000000000000'::uuid;  -- App Router

UPDATE ai_interactions SET context_id = 'd1c00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'd1800004-0000-0000-0000-000000000000'::uuid;  -- 副業応募

UPDATE ai_interactions SET context_id = 'd1c00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'd1800006-0000-0000-0000-000000000000'::uuid;  -- テスト書き方

-- evening/briefing interactions → daily_advice context
UPDATE ai_interactions SET context_id = 'd1c00003-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'd1800005-0000-0000-0000-000000000000'::uuid;  -- 時間が足りない

UPDATE ai_interactions SET context_id = 'd1c00003-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'd1800007-0000-0000-0000-000000000000'::uuid;  -- ブリーフィング

UPDATE ai_interactions SET context_id = 'd1c00003-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'd1800008-0000-0000-0000-000000000000'::uuid;  -- 8週間振り返り

-- ==============================================================================
-- Section D: prompt_comparisons (chat v1 vs v2, 2 rounds completed)
-- ==============================================================================

INSERT INTO prompt_comparisons (
    id, context_id, version_a, version_b, status,
    rounds, win_rate_b, user_id, created_at
) VALUES (
    'd1c20001-0000-0000-0000-000000000000'::uuid,
    'd1c00001-0000-0000-0000-000000000000'::uuid,
    1, 2, 'active',
    '[
      {"round_id": "d1c30001-0000-0000-0000-000000000000", "mapping": {"A": 2, "B": 1}, "winner": "A"},
      {"round_id": "d1c30002-0000-0000-0000-000000000000", "mapping": {"A": 1, "B": 2}, "winner": "B"}
    ]'::jsonb,
    0.50,
    'd1111111-1111-1111-1111-111111111111'::uuid,
    NOW() - INTERVAL '1 day'
);
