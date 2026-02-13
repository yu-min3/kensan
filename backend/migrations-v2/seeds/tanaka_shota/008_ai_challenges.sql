-- ============================================================================
-- Demo Seed: AI Challenges & Ratings — 田中翔太
-- ============================================================================
-- per-user ai_contexts, ai_context_versions (v1 + v2 for chat),
-- ai_interactions rating/context_id updates, prompt_comparisons

-- ==============================================================================
-- Section A: Per-user ai_contexts (copy all system templates)
-- ==============================================================================

-- chat context (will get v2 with improved guidelines)
INSERT INTO ai_contexts (
    id, name, situation, version, is_active, is_default,
    system_prompt, allowed_tools, max_turns, temperature,
    description, user_id, source_template_id
)
SELECT
    'ddc00001-0000-0000-0000-000000000000'::uuid,
    name, situation, version, true, true,
    system_prompt, allowed_tools, max_turns, temperature,
    description,
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
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
    'ddc00002-0000-0000-0000-000000000000'::uuid,
    name, situation, version, true, true,
    system_prompt, allowed_tools, max_turns, temperature,
    description,
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
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
    'ddc00003-0000-0000-0000-000000000000'::uuid,
    name, situation, version, true, true,
    system_prompt, allowed_tools, max_turns, temperature,
    description,
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
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
    'ddc00004-0000-0000-0000-000000000000'::uuid,
    name, situation, version, true, true,
    system_prompt, allowed_tools, max_turns, temperature,
    description,
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
    id
FROM ai_contexts
WHERE situation = 'persona' AND user_id IS NULL AND is_default = true AND is_active = true
LIMIT 1;

-- ==============================================================================
-- Section B: ai_context_versions (chat v1 = template, v2 = improved)
-- ==============================================================================

-- v1: exact copy of template prompt
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'ddc10001-0000-0000-0000-000000000000'::uuid,
    'ddc00001-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー'
FROM ai_contexts WHERE id = 'ddc00001-0000-0000-0000-000000000000'::uuid;

-- v2: improved guidelines appended
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'ddc10002-0000-0000-0000-000000000000'::uuid,
    'ddc00001-0000-0000-0000-000000000000'::uuid,
    2,
    system_prompt || E'\n\n## 追加ガイドライン\n- 回答は簡潔に、要点を先に述べる\n- コード例を積極的に使う\n- ユーザーの成長段階に合わせた説明レベルを調整する',
    allowed_tools, max_turns, temperature,
    '回答品質の改善: 簡潔さとコード例の重視'
FROM ai_contexts WHERE id = 'ddc00001-0000-0000-0000-000000000000'::uuid;

-- Also update the chat context's system_prompt to match v2 (latest version)
UPDATE ai_contexts
SET system_prompt = system_prompt || E'\n\n## 追加ガイドライン\n- 回答は簡潔に、要点を先に述べる\n- コード例を積極的に使う\n- ユーザーの成長段階に合わせた説明レベルを調整する'
WHERE id = 'ddc00001-0000-0000-0000-000000000000'::uuid;

-- v1 for review context
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'ddc10003-0000-0000-0000-000000000000'::uuid,
    'ddc00002-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー'
FROM ai_contexts WHERE id = 'ddc00002-0000-0000-0000-000000000000'::uuid;

-- v1 for daily_advice context
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'ddc10004-0000-0000-0000-000000000000'::uuid,
    'ddc00003-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー'
FROM ai_contexts WHERE id = 'ddc00003-0000-0000-0000-000000000000'::uuid;

-- v1 for persona context
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog
)
SELECT
    'ddc10005-0000-0000-0000-000000000000'::uuid,
    'ddc00004-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー'
FROM ai_contexts WHERE id = 'ddc00004-0000-0000-0000-000000000000'::uuid;

-- ==============================================================================
-- Section C: Update ai_interactions with context_id and rating
-- ==============================================================================

-- chat interactions → chat context
UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800001-0000-0000-0000-000000000000'::uuid;  -- DB設計レビュー（高評価）

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800003-0000-0000-0000-000000000000'::uuid;  -- context.Context解説

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 3
WHERE id = 'dd800005-0000-0000-0000-000000000000'::uuid;  -- AWS勉強できてない

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800006-0000-0000-0000-000000000000'::uuid;  -- AWS模擬試験60%

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800008-0000-0000-0000-000000000000'::uuid;  -- goroutineリーク発見

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800009-0000-0000-0000-000000000000'::uuid;  -- useEffect無限ループ

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800011-0000-0000-0000-000000000000'::uuid;  -- エラーハンドリング標準化

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 3
WHERE id = 'dd800012-0000-0000-0000-000000000000'::uuid;  -- Zustand

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800014-0000-0000-0000-000000000000'::uuid;  -- AWS模擬試験72%

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800016-0000-0000-0000-000000000000'::uuid;  -- chi router

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800017-0000-0000-0000-000000000000'::uuid;  -- Zenn記事構成

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800020-0000-0000-0000-000000000000'::uuid;  -- 家族時間

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800021-0000-0000-0000-000000000000'::uuid;  -- PostgreSQLインデックス

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 3
WHERE id = 'dd800023-0000-0000-0000-000000000000'::uuid;  -- Tailwind CSS

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800025-0000-0000-0000-000000000000'::uuid;  -- MVP完成間近

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800026-0000-0000-0000-000000000000'::uuid;  -- 受験日仮予約

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800028-0000-0000-0000-000000000000'::uuid;  -- 来月の目標設定

-- morning interactions → daily_advice context (morning は inactive なので daily_advice を使用)
UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800002-0000-0000-0000-000000000000'::uuid;  -- 朝の計画確認

UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800007-0000-0000-0000-000000000000'::uuid;  -- 朝活3週間達成

UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 3
WHERE id = 'dd800018-0000-0000-0000-000000000000'::uuid;  -- 寝落ち朝5時起き

UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800024-0000-0000-0000-000000000000'::uuid;  -- AWS学習計画

-- evening interactions → daily_advice context
UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800004-0000-0000-0000-000000000000'::uuid;  -- 子ども体調不良

UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800010-0000-0000-0000-000000000000'::uuid;  -- バランス崩れ

UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800015-0000-0000-0000-000000000000'::uuid;  -- 8週間振り返り

UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800022-0000-0000-0000-000000000000'::uuid;  -- CI/CD改善成功

-- briefing interactions → daily_advice context
UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800013-0000-0000-0000-000000000000'::uuid;  -- ブリーフィング

UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 3
WHERE id = 'dd800019-0000-0000-0000-000000000000'::uuid;  -- ブリーフィング

UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800027-0000-0000-0000-000000000000'::uuid;  -- 週末ブリーフィング

-- ==============================================================================
-- Section D: prompt_comparisons (chat context v1 vs v2, 3 rounds completed)
-- ==============================================================================

INSERT INTO prompt_comparisons (
    id, context_id, version_a, version_b, status,
    rounds, win_rate_b, user_id, created_at
) VALUES (
    'ddc20001-0000-0000-0000-000000000000'::uuid,
    'ddc00001-0000-0000-0000-000000000000'::uuid,
    1, 2, 'active',
    '[
      {"round_id": "ddc30001-0000-0000-0000-000000000000", "mapping": {"A": 2, "B": 1}, "winner": "A"},
      {"round_id": "ddc30002-0000-0000-0000-000000000000", "mapping": {"A": 1, "B": 2}, "winner": "B"},
      {"round_id": "ddc30003-0000-0000-0000-000000000000", "mapping": {"A": 2, "B": 1}, "winner": "A"}
    ]'::jsonb,
    0.67,
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
    NOW() - INTERVAL '2 days'
);
