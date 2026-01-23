-- Migration 010: Create unified notes table
-- Merges diary_entries, learning_records, and memos into a single table

-- ============================================
-- Notes (統一ノート)
-- ============================================
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 識別
    type VARCHAR(20) NOT NULL CHECK (type IN ('diary', 'learning', 'memo')),

    -- 基本情報
    title VARCHAR(255),  -- memo以外は必須（アプリ側でバリデーション）
    content TEXT,
    format VARCHAR(20) NOT NULL DEFAULT 'markdown' CHECK (format IN ('markdown', 'drawio')),

    -- 日付（diary: 必須、learning/memo: 任意）
    date DATE,

    -- Task連携（任意）
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

    -- Goal/Milestone連携（任意）
    milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
    goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
    -- 非正規化フィールド（表示用）
    milestone_name VARCHAR(255),
    goal_name VARCHAR(255),
    goal_color VARCHAR(7),

    -- TimeEntry連携
    related_time_entry_ids UUID[] DEFAULT '{}',

    -- ファイルURL（将来のR2連携用）
    file_url TEXT,

    -- ステータス
    archived BOOLEAN DEFAULT FALSE,

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_type ON notes(type);
CREATE INDEX idx_notes_date ON notes(date);
CREATE INDEX idx_notes_user_type ON notes(user_id, type);
CREATE INDEX idx_notes_task_id ON notes(task_id);
CREATE INDEX idx_notes_milestone_id ON notes(milestone_id);
CREATE INDEX idx_notes_goal_id ON notes(goal_id);
CREATE INDEX idx_notes_archived ON notes(archived);

-- 全文検索インデックス
CREATE INDEX idx_notes_search ON notes
    USING GIN (to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(content, '')));

-- 日記の一意制約（1ユーザー1日1エントリ）
CREATE UNIQUE INDEX idx_notes_diary_unique
    ON notes(user_id, date)
    WHERE type = 'diary';

-- ============================================
-- Note-Tags junction table (多対多)
-- ============================================
CREATE TABLE note_tags (
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);

-- ============================================
-- Updated_at trigger
-- ============================================
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Data Migration
-- ============================================

-- 1. Migrate diary_entries
INSERT INTO notes (id, user_id, type, title, content, format, date, archived, created_at, updated_at)
SELECT id, user_id, 'diary', title, content, 'markdown', date, FALSE, created_at, updated_at
FROM diary_entries;

-- Note: diary_entries.tags (TEXT[]) are free-form text, not Tag references
-- These need manual mapping or can be ignored for now

-- 2. Migrate learning_records
INSERT INTO notes (id, user_id, type, title, content, format, date, task_id,
                   milestone_id, milestone_name, goal_id, goal_name, goal_color,
                   related_time_entry_ids, file_url, archived, created_at, updated_at)
SELECT id, user_id, 'learning', title, content, format, NULL, NULL,
       milestone_id, milestone_name, goal_id, goal_name, goal_color,
       related_time_entry_ids, file_url, FALSE, created_at, updated_at
FROM learning_records;

-- Migrate learning_records.tag_ids to note_tags
INSERT INTO note_tags (note_id, tag_id)
SELECT lr.id, unnest(lr.tag_ids)
FROM learning_records lr
WHERE lr.tag_ids IS NOT NULL AND array_length(lr.tag_ids, 1) > 0;

-- 3. Migrate memos
INSERT INTO notes (id, user_id, type, title, content, format, archived, created_at, updated_at)
SELECT id, user_id, 'memo', NULL, content, 'markdown', archived, created_at, updated_at
FROM memos;
