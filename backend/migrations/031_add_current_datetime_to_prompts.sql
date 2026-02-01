-- Migration 031: Add {current_datetime} variable to all AI context prompts
-- This ensures the AI agent knows the current date and time.

-- Add {current_datetime} section right after the first line of the system prompt
-- for all active contexts that don't already have it.
UPDATE ai_contexts
SET system_prompt = regexp_replace(
    system_prompt,
    '(ユーザーのタスク管理・時間計画・目標管理・学習記録・振り返りを支援します。)\n',
    E'\\1\n\n## 現在の日時\n{current_datetime}\n',
    'g'
),
    updated_at = now()
WHERE system_prompt NOT LIKE '%{current_datetime}%'
  AND is_active = true;
