-- Migration 016: Create entity_memos table
-- Allows attaching multiple memos to goals, milestones, and tasks

CREATE TABLE entity_memos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- エンティティ参照
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('goal', 'milestone', 'task')),
    entity_id UUID NOT NULL,

    -- メモ内容
    content TEXT NOT NULL,
    pinned BOOLEAN DEFAULT FALSE,

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_entity_memos_user ON entity_memos(user_id);
CREATE INDEX idx_entity_memos_lookup ON entity_memos(entity_type, entity_id);
CREATE INDEX idx_entity_memos_pinned ON entity_memos(entity_type, entity_id, pinned) WHERE pinned = TRUE;

-- Updated_at trigger
CREATE TRIGGER update_entity_memos_updated_at BEFORE UPDATE ON entity_memos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE entity_memos IS 'Goals, Milestones, Tasksに紐づくメモ';
COMMENT ON COLUMN entity_memos.entity_type IS 'goal, milestone, task のいずれか';
COMMENT ON COLUMN entity_memos.pinned IS '重要なメモをピン留めして目立たせる';
