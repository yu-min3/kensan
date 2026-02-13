-- ============================================================================
-- Demo Seed: AI Challenges & Ratings — 田中翔太
-- ============================================================================
-- per-user ai_contexts, ai_context_versions (v1 + v2 for chat),
-- ai_interactions rating/context_id updates, prompt_comparisons
-- Persona: 30歳バックエンドエンジニア, Go + Google Cloud, 夜型, ブログ・LT・SaaS

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
WHERE id = 'dd800001-0000-0000-0000-000000000000'::uuid;  -- SaaS DB設計レビュー（高評価）

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800003-0000-0000-0000-000000000000'::uuid;  -- Cloud Runデプロイ

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 3
WHERE id = 'dd800005-0000-0000-0000-000000000000'::uuid;  -- Google Cloud勉強できてない

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800006-0000-0000-0000-000000000000'::uuid;  -- ACE模擬試験65%

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800008-0000-0000-0000-000000000000'::uuid;  -- Go Conference CFP提出

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800009-0000-0000-0000-000000000000'::uuid;  -- ブログ公開できない（完璧主義）

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800011-0000-0000-0000-000000000000'::uuid;  -- 12日連続学習

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 3
WHERE id = 'dd800012-0000-0000-0000-000000000000'::uuid;  -- Firestore設計パターン

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800014-0000-0000-0000-000000000000'::uuid;  -- ブログ1本公開！

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800016-0000-0000-0000-000000000000'::uuid;  -- Cloud Run vs App Engine

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800017-0000-0000-0000-000000000000'::uuid;  -- LTスライド構成

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800020-0000-0000-0000-000000000000'::uuid;  -- 木曜MTGが辛い

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800021-0000-0000-0000-000000000000'::uuid;  -- GoのHTTPミドルウェア

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 3
WHERE id = 'dd800023-0000-0000-0000-000000000000'::uuid;  -- Next.js App Router

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800025-0000-0000-0000-000000000000'::uuid;  -- SaaS MVP残りタスク

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800026-0000-0000-0000-000000000000'::uuid;  -- ACE最終対策

UPDATE ai_interactions SET context_id = 'ddc00001-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800028-0000-0000-0000-000000000000'::uuid;  -- 来月の目標設定

-- morning interactions → daily_advice context
UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800002-0000-0000-0000-000000000000'::uuid;  -- 今週の計画確認

UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800007-0000-0000-0000-000000000000'::uuid;  -- 夜型学習3週間達成

UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800018-0000-0000-0000-000000000000'::uuid;  -- ACE模擬試験78%

UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800024-0000-0000-0000-000000000000'::uuid;  -- ACE受験日仮予約

-- evening interactions → daily_advice context
UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800004-0000-0000-0000-000000000000'::uuid;  -- ACE問題集進捗

UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800010-0000-0000-0000-000000000000'::uuid;  -- Next.js苦戦

UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 5
WHERE id = 'dd800015-0000-0000-0000-000000000000'::uuid;  -- 8週間振り返り

UPDATE ai_interactions SET context_id = 'ddc00003-0000-0000-0000-000000000000'::uuid, rating = 4
WHERE id = 'dd800022-0000-0000-0000-000000000000'::uuid;  -- CFP通過！

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

-- ==============================================================================
-- Section E: Prompt Experiments (3 pending_review for sidebar badge on login)
-- ==============================================================================

-- E-1: Variant ai_contexts (AI-optimized prompt proposals)

-- chat variant
INSERT INTO ai_contexts (
    id, name, situation, version, is_active, is_default,
    system_prompt, allowed_tools, max_turns, temperature,
    description, user_id
)
SELECT
    'ddc40001-0000-0000-0000-000000000000'::uuid,
    'improved-chat (AI最適化案)', situation, version, false, false,
    system_prompt || E'\n\n## AI最適化ガイドライン\n- ユーザーの感情に寄り添った応答を心がける\n- 具体的なアクションプランを提示する\n- 過去の成功体験を参照して動機づけを行う',
    allowed_tools, max_turns, temperature,
    description,
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid
FROM ai_contexts WHERE id = 'ddc00001-0000-0000-0000-000000000000'::uuid;

-- review variant
INSERT INTO ai_contexts (
    id, name, situation, version, is_active, is_default,
    system_prompt, allowed_tools, max_turns, temperature,
    description, user_id
)
SELECT
    'ddc40002-0000-0000-0000-000000000000'::uuid,
    'improved-weekly (AI最適化案)', situation, version, false, false,
    system_prompt || E'\n\n## AI最適化ガイドライン\n- 週次レビューでは具体的な数値目標を提示する\n- 前週との比較で進捗を可視化する\n- 達成できなかった項目には代替案を提案する',
    allowed_tools, max_turns, temperature,
    description,
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid
FROM ai_contexts WHERE id = 'ddc00002-0000-0000-0000-000000000000'::uuid;

-- daily_advice variant
INSERT INTO ai_contexts (
    id, name, situation, version, is_active, is_default,
    system_prompt, allowed_tools, max_turns, temperature,
    description, user_id
)
SELECT
    'ddc40003-0000-0000-0000-000000000000'::uuid,
    'planning-agent (AI最適化案)', situation, version, false, false,
    system_prompt || E'\n\n## AI最適化ガイドライン\n- 朝のアドバイスは3つ以内に絞る\n- 前日の振り返りを踏まえた提案をする\n- 体調やモチベーションに配慮したスケジュール提案',
    allowed_tools, max_turns, temperature,
    description,
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid
FROM ai_contexts WHERE id = 'ddc00003-0000-0000-0000-000000000000'::uuid;

-- E-2: Prompt evaluations (one per context)

INSERT INTO prompt_evaluations (
    id, context_id, period_start, period_end,
    interaction_count, avg_rating, rated_count,
    strengths, weaknesses, improvement_suggestions,
    user_id
) VALUES
(
    'ddc50001-0000-0000-0000-000000000000'::uuid,
    'ddc00001-0000-0000-0000-000000000000'::uuid,
    CURRENT_DATE - 7, CURRENT_DATE,
    17, 4.1, 17,
    ARRAY['技術的な質問への回答精度が高い', 'コード例を活用した説明が分かりやすい'],
    ARRAY['感情面へのフォローが不足', '長文回答になりがち'],
    ARRAY['ユーザーの感情に寄り添う応答の追加', '回答の簡潔化'],
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid
),
(
    'ddc50002-0000-0000-0000-000000000000'::uuid,
    'ddc00002-0000-0000-0000-000000000000'::uuid,
    CURRENT_DATE - 7, CURRENT_DATE,
    12, 3.8, 10,
    ARRAY['週次の振り返り構成が体系的', 'データに基づいた分析が正確'],
    ARRAY['改善提案が抽象的になりがち', '数値目標の提示が少ない'],
    ARRAY['具体的な数値目標の提示', '前週比較の自動化'],
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid
),
(
    'ddc50003-0000-0000-0000-000000000000'::uuid,
    'ddc00003-0000-0000-0000-000000000000'::uuid,
    CURRENT_DATE - 7, CURRENT_DATE,
    22, 4.3, 20,
    ARRAY['スケジュール提案の精度が高い', 'ユーザーの習慣パターンを反映'],
    ARRAY['提案数が多すぎることがある', '体調面への配慮が不足'],
    ARRAY['提案を3つ以内に絞る', '体調・モチベーション考慮の追加'],
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid
);

-- E-3: Prompt experiments (pending_review → sidebar badge)

INSERT INTO prompt_experiments (
    id, situation, evaluation_id,
    control_context_id, variant_context_id,
    status, user_id, created_at
) VALUES
(
    'ddc60001-0000-0000-0000-000000000000'::uuid,
    'chat',
    'ddc50001-0000-0000-0000-000000000000'::uuid,
    'ddc00001-0000-0000-0000-000000000000'::uuid,
    'ddc40001-0000-0000-0000-000000000000'::uuid,
    'pending_review',
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
    NOW() - INTERVAL '1 day'
),
(
    'ddc60002-0000-0000-0000-000000000000'::uuid,
    'review',
    'ddc50002-0000-0000-0000-000000000000'::uuid,
    'ddc00002-0000-0000-0000-000000000000'::uuid,
    'ddc40002-0000-0000-0000-000000000000'::uuid,
    'pending_review',
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
    NOW() - INTERVAL '1 day'
),
(
    'ddc60003-0000-0000-0000-000000000000'::uuid,
    'daily_advice',
    'ddc50003-0000-0000-0000-000000000000'::uuid,
    'ddc00003-0000-0000-0000-000000000000'::uuid,
    'ddc40003-0000-0000-0000-000000000000'::uuid,
    'pending_review',
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
    NOW() - INTERVAL '1 day'
);
