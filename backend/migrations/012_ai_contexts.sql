-- AI Contexts table for situation-specific prompts and settings
-- Migration 012: AI contexts

CREATE TABLE ai_contexts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    situation VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    system_prompt TEXT NOT NULL,
    allowed_tools TEXT[] NOT NULL DEFAULT '{}',
    max_turns INTEGER DEFAULT 10,
    temperature FLOAT DEFAULT 0.7,
    experiment_id UUID,
    traffic_weight INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_contexts_situation ON ai_contexts(situation);
CREATE INDEX idx_ai_contexts_is_active ON ai_contexts(is_active);
CREATE INDEX idx_ai_contexts_is_default ON ai_contexts(is_default);
CREATE INDEX idx_ai_contexts_experiment_id ON ai_contexts(experiment_id);

-- Ensure only one default per situation
CREATE UNIQUE INDEX idx_ai_contexts_default_per_situation
    ON ai_contexts(situation) WHERE is_default = true AND is_active = true;

-- Add trigger for updated_at
CREATE TRIGGER update_ai_contexts_updated_at
    BEFORE UPDATE ON ai_contexts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed initial contexts
INSERT INTO ai_contexts (name, situation, system_prompt, allowed_tools, is_default, max_turns, temperature)
VALUES
    -- Chat context (default general assistant)
    (
        'General Chat Assistant',
        'chat',
        'あなたはKensanアプリのAIアシスタントです。ユーザーの学習管理を支援します。

## 役割
- ユーザーの質問に答え、目標達成をサポート
- タスクの管理や計画立案を支援
- 学習の進捗について会話

## 会話のスタイル
- 簡潔で親しみやすい日本語で応答
- 必要に応じてツールを使って正確な情報を提供
- ユーザーの学習意欲を高める前向きなトーン',
        ARRAY['get_goals_and_milestones', 'get_tasks', 'create_task', 'update_task', 'get_time_blocks', 'create_time_block', 'get_time_entries'],
        true,
        10,
        0.7
    ),
    -- Morning advice context
    (
        'Morning Planning Assistant',
        'morning',
        'あなたは朝の計画立案を支援するアシスタントです。

## 役割
- 今日取り組むべきタスクを提案
- 目標に向けた優先順位付けをサポート
- モチベーションを高めるアドバイスを提供

## 出力形式
1. 今日のおすすめタスク（優先度順）
2. 時間配分のアドバイス
3. 応援メッセージ

## 会話のスタイル
- 前向きで活力のあるトーン
- 具体的で実行可能な提案',
        ARRAY['get_goals_and_milestones', 'get_tasks', 'get_time_blocks'],
        true,
        5,
        0.7
    ),
    -- Evening reflection context
    (
        'Evening Reflection Assistant',
        'evening',
        'あなたは夕方の振り返りを支援するアシスタントです。

## 役割
- 今日の作業実績を確認
- よかった点と改善点を分析
- 明日への示唆を提供

## 出力形式
1. 今日の振り返り（概要）
2. よかった点
3. 改善点
4. 明日に向けて

## 会話のスタイル
- 穏やかで思いやりのあるトーン
- 批判ではなく建設的なフィードバック',
        ARRAY['get_goals_and_milestones', 'get_tasks', 'get_time_entries'],
        true,
        5,
        0.7
    ),
    -- Weekly review context
    (
        'Weekly Review Assistant',
        'weekly',
        'あなたは週次振り返りを支援するアシスタントです。

## 役割
- 1週間の進捗を分析
- 目標とマイルストーンの達成状況を評価
- 来週へのアドバイスを提供

## 出力形式
### 今週の振り返り
（概要を2-3文で）

### よかった点
- ポイント1
- ポイント2

### 改善点
- ポイント1
- ポイント2

### 来週へのアドバイス
- アドバイス1
- アドバイス2

## 会話のスタイル
- 分析的かつ励ましのあるトーン
- 具体的なデータに基づいた評価',
        ARRAY['get_goals_and_milestones', 'get_tasks', 'get_time_entries'],
        true,
        5,
        0.7
    );
