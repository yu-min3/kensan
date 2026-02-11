-- +migrate Up
-- Add description column to ai_contexts for UI display

ALTER TABLE ai_contexts ADD COLUMN description TEXT;

-- Set descriptions for active contexts
UPDATE ai_contexts SET description = '全エージェント共通の性格・口調を定義。ここで設定した内容が、チャット・レビュー・デイリーすべてに反映されます'
WHERE name = 'shared-persona' AND is_active = true;

UPDATE ai_contexts SET description = 'チャット画面のAIエージェント。目標・タスク・スケジュールの管理や質問応答を担当します'
WHERE name = 'improved-chat' AND is_active = true;

UPDATE ai_contexts SET description = '分析・レポート画面のAIエージェント。週次レビューの生成と振り返り分析を行います'
WHERE name = 'improved-weekly' AND is_active = true;

UPDATE ai_contexts SET description = 'デイリー画面のAIエージェント。毎日のスケジュール提案・進捗チェック・振り返りを自動生成します'
WHERE name = 'planning-agent' AND is_active = true;

-- +migrate Down
ALTER TABLE ai_contexts DROP COLUMN description;
