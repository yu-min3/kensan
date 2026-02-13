-- ============================================================================
-- Demo Seed: AI Challenges & Ratings — 田中翔太
-- ============================================================================
-- per-user ai_contexts, ai_context_versions (v1 + v2 basic + v3 AI-optimized for chat),
-- ai_interactions rating/context_id updates, prompt_evaluations
-- Persona: 30歳バックエンドエンジニア, Go + Google Cloud, 夜型, ブログ・LT・SaaS
--
-- A/B テストデモ用:
--   v2 (active) = 基本版プロンプト（パーソナライズ変数少ない）
--   v3 (candidate) = AI最適化版（全変数＋エネルギーベース・スケジューリング）
-- → 「来週の予定を作成して」で v2=汎用的 / v3=パーソナライズ済み の差が出る

-- ==============================================================================
-- Section A: Per-user ai_contexts (copy all system templates)
-- ==============================================================================

-- chat context (starts with full template, will be overwritten to v2 basic later)
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
-- Section B: ai_context_versions
-- ==============================================================================
-- ORDER: v1 (template) → v3 (AI-optimized, from full template) → update to v2 → v2 (basic)
-- v3 must be created BEFORE the ai_contexts row is overwritten with the basic v2 prompt.

-- v1: exact copy of template prompt (manual)
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog,
    source, candidate_status, eval_summary
)
SELECT
    'ddc10001-0000-0000-0000-000000000000'::uuid,
    'ddc00001-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー',
    'manual', NULL, NULL
FROM ai_contexts WHERE id = 'ddc00001-0000-0000-0000-000000000000'::uuid;

-- v3: AI-optimized version (full template + energy scheduling + emotional follow-up)
-- IMPORTANT: must be inserted while ai_contexts still has the full template prompt
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog,
    source, candidate_status, eval_summary
)
SELECT
    'ddc40001-0000-0000-0000-000000000000'::uuid,
    'ddc00001-0000-0000-0000-000000000000'::uuid,
    3,
    system_prompt || E'\n\n## AI最適化: エネルギーベース・スケジューリング\nスケジュール提案時は {user_patterns} の生産性データを**必ず**活用し、テキストでも理由として言及する:\n- 集中力が必要なタスク（開発、学習、資格勉強、執筆）→ 生産性ピーク時間帯に配置し、「○時台が集中力のピークなので」と理由を明記\n- ルーチン作業（MTG準備、メール確認、整理）→ 低エネルギー時間帯に配置\n- 90分以上の集中ブロックの後には30分の休憩 or 軽作業を入れる\n- 1日のブロック数は4〜5個以内。詰め込みすぎず余白を残す\n- 既に入っている予定を確認し、空きスロットだけに提案する\n\n## AI最適化: 目標整合性チェック\n{goal_progress} と {weekly_summary} を参照し、以下を考慮する:\n- 時間配分の偏りがあれば「今週は○○に偏っているので△△の時間も確保」と提案\n- 期限が近いマイルストーンがあれば優先的にスケジューリング\n- {recent_learning_notes} の学習記録から、学習の継続性を考慮した提案を行う\n\n## AI最適化: 感情フォロー\n- スケジュール提案や振り返りの冒頭で、最近の達成や前向きな変化に1文だけ触れる\n- 例: 「先週ブログを1本公開できた勢いで」「ACE模擬試験のスコアが上がっている流れを活かして」\n- 過度な励ましは不要。事実ベースで自然に触れる程度にする\n- ユーザーが困っている・落ち込んでいるときは、まず共感してから提案に移る\n\n## AI最適化: 日時範囲の厳密化\nスケジュール提案時、ユーザーが指定した期間を厳密に守ること:\n- 「今週」= {current_datetime} が含まれる週の月曜〜日曜のみ\n- 「来週」= 翌週の月曜〜日曜のみ\n- 期間が曖昧な場合は「今週の残り」（今日〜日曜）として解釈する\n- create_time_block の date が指定期間外になっていないか、呼ぶ前に確認する\n\n## AI最適化: 提案根拠の明示（必須）\nスケジュールを提案する際は、タイムブロックを提示する**前に**、以下のような根拠を具体的なデータとともに箇条書きで示すこと:\n- {user_patterns} のピーク時間帯を引用し、「○時台が集中力のピークなので○○をここに配置」と具体的に説明\n- {goal_progress} の期限や進捗を引用し、「○○の期限が△週間後なので優先」と説明\n- {weekly_summary} の時間配分を引用し、「先週は○○にN時間偏っていたので△△の時間を確保」と説明\n\n**例:**\n「ポイントは3つです:\n- **19時台が集中力のピーク**なので、Next.jsフロント実装をこの時間帯に配置しました\n- **ACE受験が3週間後**に迫っているので、毎日19:00-19:30のACE対策枠を確保\n- **先週はSaaS開発に15h偏っていた**ので、ブログ執筆の時間を意識的に増やしました」\n\n「集中しやすい時間帯を考慮して」のような抽象的な表現は**禁止**。具体的なデータ・数字・期限に基づく根拠を必ず示す。',
    allowed_tools, max_turns, temperature,
    'AI最適化: エネルギーベース・スケジューリング、目標整合性チェック、感情フォロー、日時範囲の厳密化、提案根拠の明示',
    'ai', 'pending',
    '{"interaction_count": 17, "avg_rating": 4.1, "strengths": ["技術的な質問への回答精度が高い", "コード例を活用した説明が分かりやすい"], "weaknesses": ["行動パターンデータを活用したスケジューリングが不十分", "感情面へのフォローが不足", "目標の時間配分バランスへの言及がない"]}'::jsonb
FROM ai_contexts WHERE id = 'ddc00001-0000-0000-0000-000000000000'::uuid;

-- Now overwrite chat context with basic v2 prompt (fewer variables, simpler rules)
UPDATE ai_contexts
SET system_prompt = E'## 現在の日時\n{current_datetime}\n\n## ユーザー情報\n{user_memory}\n\n## 未完了タスク\n{pending_tasks}\n\n## 今日の予定\n{today_schedule}\n\n## 思考プロセス\n\nユーザーの発言を受けたら、以下の手順で考えること：\n\n1. データを確認する — 「未完了タスク」「今日の予定」のデータで回答できるか確認する\n2. 不足データだけを特定する — 上記にない情報（特定日のスケジュール等）が必要な場合のみツールを使う\n3. ツールが必要なら1回で全て呼ぶ\n4. 分析したら具体的に提案する — 質問で返すのではなく、データに基づいた提案を先に出す\n\n**例:**\n- 「来週の予定は？」→ get_time_blocks を呼ぶ\n- 「予定立てて」→ get_time_blocks + get_tasks で現状を把握 → create_time_block をまとめて呼ぶ\n- 「タスクの進捗は？」→ 未完了タスクセクションで回答可能\n\n## 回答ルール\n- 日本語で応答する\n- 書き込み操作はツール呼び出しで提案する。UIが承認フローを表示するので、テキストで「実行してよいですか？」と聞かない\n- 読み取り操作は即実行してよい\n- 日付は JST 基準。「今日」「明日」等は JST で解釈する\n- スケジュール提案の日付範囲: 「今週」→ 月曜〜日曜。「来週」→ 翌週の月曜〜日曜\n- 意図が明確ならそのまま実行する。曖昧な場合のみ短く確認する\n- 短い質問には短く答える'
WHERE id = 'ddc00001-0000-0000-0000-000000000000'::uuid;

-- v2: basic prompt (manual) — now created from the updated (basic) ai_contexts row
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog,
    source, candidate_status, eval_summary
)
SELECT
    'ddc10002-0000-0000-0000-000000000000'::uuid,
    'ddc00001-0000-0000-0000-000000000000'::uuid,
    2,
    system_prompt, allowed_tools, max_turns, temperature,
    'プロンプト簡素化: コア機能に集中',
    'manual', NULL, NULL
FROM ai_contexts WHERE id = 'ddc00001-0000-0000-0000-000000000000'::uuid;

-- v1 for review context (manual)
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog,
    source, candidate_status, eval_summary
)
SELECT
    'ddc10003-0000-0000-0000-000000000000'::uuid,
    'ddc00002-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー',
    'manual', NULL, NULL
FROM ai_contexts WHERE id = 'ddc00002-0000-0000-0000-000000000000'::uuid;

-- v1 for daily_advice context (manual)
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog,
    source, candidate_status, eval_summary
)
SELECT
    'ddc10004-0000-0000-0000-000000000000'::uuid,
    'ddc00003-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー',
    'manual', NULL, NULL
FROM ai_contexts WHERE id = 'ddc00003-0000-0000-0000-000000000000'::uuid;

-- v1 for persona context (manual)
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog,
    source, candidate_status, eval_summary
)
SELECT
    'ddc10005-0000-0000-0000-000000000000'::uuid,
    'ddc00004-0000-0000-0000-000000000000'::uuid,
    1,
    system_prompt, allowed_tools, max_turns, temperature,
    'テンプレートからコピー',
    'manual', NULL, NULL
FROM ai_contexts WHERE id = 'ddc00004-0000-0000-0000-000000000000'::uuid;

-- review v2 (AI optimization candidate; v1=template)
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog,
    source, candidate_status, eval_summary
)
SELECT
    'ddc40002-0000-0000-0000-000000000000'::uuid,
    'ddc00002-0000-0000-0000-000000000000'::uuid,
    2,
    system_prompt || E'\n\n## AI最適化ガイドライン\n- 週次レビューでは具体的な数値目標を提示する\n- 前週との比較で進捗を可視化する\n- 達成できなかった項目には代替案を提案する',
    allowed_tools, max_turns, temperature,
    'AI最適化: 数値目標と前週比較の強化',
    'ai', 'pending',
    '{"interaction_count": 12, "avg_rating": 3.8, "strengths": ["週次の振り返り構成が体系的", "データに基づいた分析が正確"], "weaknesses": ["改善提案が抽象的になりがち", "数値目標の提示が少ない"]}'::jsonb
FROM ai_contexts WHERE id = 'ddc00002-0000-0000-0000-000000000000'::uuid;

-- daily_advice v2 (AI optimization candidate; v1=template)
INSERT INTO ai_context_versions (
    id, context_id, version_number,
    system_prompt, allowed_tools, max_turns, temperature, changelog,
    source, candidate_status, eval_summary
)
SELECT
    'ddc40003-0000-0000-0000-000000000000'::uuid,
    'ddc00003-0000-0000-0000-000000000000'::uuid,
    2,
    system_prompt || E'\n\n## AI最適化ガイドライン\n- 朝のアドバイスは3つ以内に絞る\n- 前日の振り返りを踏まえた提案をする\n- 体調やモチベーションに配慮したスケジュール提案',
    allowed_tools, max_turns, temperature,
    'AI最適化: 提案数の絞り込みと体調配慮',
    'ai', 'pending',
    '{"interaction_count": 22, "avg_rating": 4.3, "strengths": ["スケジュール提案の精度が高い", "ユーザーの習慣パターンを反映"], "weaknesses": ["提案数が多すぎることがある", "体調面への配慮が不足"]}'::jsonb
FROM ai_contexts WHERE id = 'ddc00003-0000-0000-0000-000000000000'::uuid;

-- Set active_version for each context
UPDATE ai_contexts SET active_version = 2 WHERE id = 'ddc00001-0000-0000-0000-000000000000'::uuid;  -- chat (v2 basic is active)
UPDATE ai_contexts SET active_version = 1 WHERE id = 'ddc00002-0000-0000-0000-000000000000'::uuid;  -- review
UPDATE ai_contexts SET active_version = 1 WHERE id = 'ddc00003-0000-0000-0000-000000000000'::uuid;  -- daily_advice
UPDATE ai_contexts SET active_version = 1 WHERE id = 'ddc00004-0000-0000-0000-000000000000'::uuid;  -- persona

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
-- Section E: Prompt Evaluations
-- ==============================================================================

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
    ARRAY['行動パターンデータを活用したスケジューリングが不十分', '感情面へのフォローが不足', '目標の時間配分バランスへの言及がない'],
    ARRAY['行動パターン・生産性ピークに基づくスケジュール最適化', 'ユーザーの達成に触れる感情フォローの追加', '目標別の時間配分チェック'],
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
