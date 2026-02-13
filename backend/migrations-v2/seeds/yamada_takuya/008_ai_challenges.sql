-- ============================================================================
-- Demo Seed: AI Challenges & Ratings — 山田拓也
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
    'd2c00001-0000-0000-0000-000000000000'::uuid,
    name, situation, version, true, true,
    system_prompt, allowed_tools, max_turns, temperature,
    description,
    'd2222222-2222-2222-2222-222222222222'::uuid,
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
    'd2c00002-0000-0000-0000-000000000000'::uuid,
    name, situation, version, true, true,
    system_prompt, allowed_tools, max_turns, temperature,
    description,
    'd2222222-2222-2222-2222-222222222222'::uuid,
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
    'd2c00003-0000-0000-0000-000000000000'::uuid,
    name, situation, version, true, true,
    system_prompt, allowed_tools, max_turns, temperature,
    description,
    'd2222222-2222-2222-2222-222222222222'::uuid,
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
    'd2c00004-0000-0000-0000-000000000000'::uuid,
    name, situation, version, true, true,
    system_prompt, allowed_tools, max_turns, temperature,
    description,
    'd2222222-2222-2222-2222-222222222222'::uuid,
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
    'd2c10001-0000-0000-0000-000000000000'::uuid,
    'd2c00001-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー'
FROM ai_contexts WHERE id = 'd2c00001-0000-0000-0000-000000000000'::uuid;

-- chat v2: 初心者向けの丁寧な説明強化
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'd2c10002-0000-0000-0000-000000000000'::uuid,
    'd2c00001-0000-0000-0000-000000000000'::uuid,
    2,
    system_prompt || E'\n\n## 追加ガイドライン\n- 専門用語は必ず噛み砕いて説明する\n- ステップバイステップの手順を示す\n- 「なぜそうするか」の理由を添える',
    allowed_tools, max_turns, temperature,
    '初心者フレンドリー: 噛み砕いた説明とステップバイステップ'
FROM ai_contexts WHERE id = 'd2c00001-0000-0000-0000-000000000000'::uuid;

-- Update chat context prompt to v2
UPDATE ai_contexts
SET system_prompt = system_prompt || E'\n\n## 追加ガイドライン\n- 専門用語は必ず噛み砕いて説明する\n- ステップバイステップの手順を示す\n- 「なぜそうするか」の理由を添える'
WHERE id = 'd2c00001-0000-0000-0000-000000000000'::uuid;

-- review v1
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'd2c10003-0000-0000-0000-000000000000'::uuid,
    'd2c00002-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー'
FROM ai_contexts WHERE id = 'd2c00002-0000-0000-0000-000000000000'::uuid;

-- daily_advice v1
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'd2c10004-0000-0000-0000-000000000000'::uuid,
    'd2c00003-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー'
FROM ai_contexts WHERE id = 'd2c00003-0000-0000-0000-000000000000'::uuid;

-- persona v1
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'd2c10005-0000-0000-0000-000000000000'::uuid,
    'd2c00004-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー'
FROM ai_contexts WHERE id = 'd2c00004-0000-0000-0000-000000000000'::uuid;

-- ==============================================================================
-- Section C: Update ai_interactions with context_id and rating
-- ==============================================================================

-- chat interactions
UPDATE ai_interactions SET context_id = 'd2c00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'd2800001-0000-0000-0000-000000000000'::uuid;  -- AWS SAA勉強開始

UPDATE ai_interactions SET context_id = 'd2c00001-0000-0000-0000-000000000000'::uuid, rating = 3
WHERE id = 'd2800002-0000-0000-0000-000000000000'::uuid;  -- 勉強が続かない

UPDATE ai_interactions SET context_id = 'd2c00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'd2800003-0000-0000-0000-000000000000'::uuid;  -- SAA模擬試験52%

UPDATE ai_interactions SET context_id = 'd2c00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'd2800004-0000-0000-0000-000000000000'::uuid;  -- 毎日30分1週間達成

UPDATE ai_interactions SET context_id = 'd2c00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'd2800005-0000-0000-0000-000000000000'::uuid;  -- SAA模擬試験68%

-- evening interaction → daily_advice context
UPDATE ai_interactions SET context_id = 'd2c00003-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'd2800006-0000-0000-0000-000000000000'::uuid;  -- 8週間振り返り

-- ==============================================================================
-- Section D: prompt_comparisons (chat v1 vs v2, 3 rounds, v2 wins)
-- ==============================================================================

INSERT INTO prompt_comparisons (
    id, context_id, version_a, version_b, status,
    rounds, win_rate_b, user_id, created_at
) VALUES (
    'd2c20001-0000-0000-0000-000000000000'::uuid,
    'd2c00001-0000-0000-0000-000000000000'::uuid,
    1, 2, 'active',
    '[
      {"round_id": "d2c30001-0000-0000-0000-000000000000", "mapping": {"A": 1, "B": 2}, "winner": "B"},
      {"round_id": "d2c30002-0000-0000-0000-000000000000", "mapping": {"A": 2, "B": 1}, "winner": "A"},
      {"round_id": "d2c30003-0000-0000-0000-000000000000", "mapping": {"A": 1, "B": 2}, "winner": "B"}
    ]'::jsonb,
    0.67,
    'd2222222-2222-2222-2222-222222222222'::uuid,
    NOW() - INTERVAL '3 days'
);
