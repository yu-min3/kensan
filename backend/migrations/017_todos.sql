-- todos: 単発タスク（雑務）と繰り返しタスク（定期）を統合
CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,

    -- 繰り返し設定（NULLなら単発タスク）
    frequency VARCHAR(20) CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom')),
    days_of_week INTEGER[],           -- 曜日指定（0=日, 1=月, ..., 6=土）

    -- 単発タスク用
    due_date DATE,                    -- 期日（任意）

    -- 共通
    estimated_minutes INTEGER,
    tag_ids UUID[] DEFAULT '{}',
    enabled BOOLEAN DEFAULT TRUE,     -- 繰り返しタスクの有効/無効、単発は削除で対応

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_enabled ON todos(enabled);
CREATE INDEX idx_todos_due_date ON todos(due_date);
CREATE INDEX idx_todos_frequency ON todos(frequency);

-- 完了記録（繰り返し・単発両方で使用）
CREATE TABLE todo_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,      -- 完了した日付
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(todo_id, completed_date)    -- 1日1回のみ
);

CREATE INDEX idx_todo_completions_todo_id ON todo_completions(todo_id);
CREATE INDEX idx_todo_completions_date ON todo_completions(completed_date);

-- routine_tasks から todos への移行
INSERT INTO todos (id, user_id, name, frequency, days_of_week, estimated_minutes, tag_ids, enabled, created_at, updated_at)
SELECT id, user_id, name, frequency, days_of_week, estimated_minutes, tag_ids, enabled, created_at, updated_at
FROM routine_tasks;

-- updated_at トリガー
CREATE TRIGGER update_todos_updated_at
    BEFORE UPDATE ON todos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
