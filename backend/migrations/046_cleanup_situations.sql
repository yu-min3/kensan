-- 046: evening/briefing コンテキスト無効化 + weekly に user_patterns 追加
-- AIPlanningCard で Daily に統合済みのため、evening/briefing は不要

-- evening, briefing, morning コンテキストを無効化（削除はしない、履歴保持）
UPDATE ai_contexts SET is_active = false, is_default = false
WHERE situation IN ('evening', 'briefing', 'morning') AND is_active = true;

-- system_prompt 内のハードコードされた例（CKA等）を汎用表現に変更
UPDATE ai_contexts
SET system_prompt = REPLACE(
    system_prompt,
    E'- 「CKAの進捗」→ CKA関連の目標・タスクの完了状況を確認',
    E'- 「資格の進捗」→ 関連する目標・タスクの完了状況を確認'
)
WHERE system_prompt LIKE '%CKA%';

-- weekly の system_prompt に {user_patterns} セクションを追加
UPDATE ai_contexts
SET
    system_prompt = REPLACE(
        system_prompt,
        E'## 目標進捗\n{goal_progress}',
        E'## 目標進捗\n{goal_progress}\n\n## 行動パターン（過去数週間の統計）\n{user_patterns}'
    ),
    allowed_tools = array_append(allowed_tools, 'get_user_patterns')
WHERE situation = 'weekly' AND is_active = true;

-- planning コンテキストを is_default = true に設定
UPDATE ai_contexts SET is_default = true
WHERE situation = 'planning' AND is_active = true;
