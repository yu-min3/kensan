-- 065: Remove {routine_tasks} variable from daily_advice system prompt
-- routine_tasks was migrated to todos (017) and the table was dropped (064).
-- The daily_advice prompt still references {routine_tasks} which is no longer a supported variable.

UPDATE ai_contexts
SET system_prompt = REPLACE(
    system_prompt,
    E'## 今日の繰り返しタスク\n{routine_tasks}\n\n',
    ''
)
WHERE situation = 'daily_advice'
  AND system_prompt LIKE '%{routine_tasks}%';
