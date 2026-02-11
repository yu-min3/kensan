-- 069: Add {weekly_summary} and {recent_learning_notes} context sections to chat prompt
-- Also adds thinking process examples for schedule planning and learning review.
-- Source of truth: kensan-ai/src/kensan_ai/agents/chat.py

-- Step 1: Insert weekly_summary and recent_learning_notes sections
-- after {recent_context} and before ## 思考プロセス
UPDATE ai_contexts
SET system_prompt = REPLACE(
    system_prompt,
    E'## 思考プロセス（最重要）',
    E'## 今週の稼働サマリー\n{weekly_summary}\n\n## 直近の学習記録・日記\n{recent_learning_notes}\n\n## 思考プロセス（最重要）'
)
WHERE situation = 'chat'
  AND system_prompt LIKE '%{recent_context}%'
  AND system_prompt NOT LIKE '%{weekly_summary}%';

-- Step 2: Add thinking examples for weekly planning and learning review
UPDATE ai_contexts
SET system_prompt = REPLACE(
    system_prompt,
    E'- 「スケジュールを組んで」「予定を立てて」→ **最終ゴールはタイムブロックの作成**。タスクの細分化が必要な場合でも、create_task と create_time_block を同じターンでまとめて提案する。タスク作成だけで終わらない',
    E'- 「スケジュールを組んで」「予定を立てて」→ **最終ゴールはタイムブロックの作成**。タスクの細分化が必要な場合でも、create_task と create_time_block を同じターンでまとめて提案する。タスク作成だけで終わらない\n- 「今週の予定を立てて」→ {weekly_summary}で今週の時間配分を把握済み。get_time_blocks + get_tasks で既存の予定と未消化タスクを取得 → 生産性ピーク時間帯({user_patterns})を活かして create_time_block をまとめて提案\n- 「学習記録を振り返って」→ {recent_learning_notes}に直近の学習データあり。目標({goal_progress})との関連性、学習の深さ、パターンを分析して洞察を伝える。ツール不要'
)
WHERE situation = 'chat'
  AND system_prompt LIKE '%{weekly_summary}%';
