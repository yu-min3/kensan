-- Migration 019: Add note categories and metadata
-- Also add 1-day-1-note constraint for learning type

-- ========================================
-- 1. Note Categories (ノートカテゴリ)
-- ========================================

CREATE TABLE note_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    icon VARCHAR(50),  -- emoji or icon name (optional)
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX idx_note_categories_user ON note_categories(user_id);
CREATE INDEX idx_note_categories_sort ON note_categories(user_id, sort_order);

-- Updated_at trigger
CREATE TRIGGER update_note_categories_updated_at BEFORE UPDATE ON note_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE note_categories IS 'ノートのカテゴリタグ（学習記録、読書評、技術まとめなど）';
COMMENT ON COLUMN note_categories.icon IS 'アイコン（emoji or icon name）';

-- ========================================
-- 2. Note Category Assignments (カテゴリ割り当て)
-- ========================================

CREATE TABLE note_category_assignments (
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES note_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (note_id, category_id)
);

CREATE INDEX idx_note_category_assignments_category ON note_category_assignments(category_id);

COMMENT ON TABLE note_category_assignments IS 'ノートとカテゴリの多対多関連';

-- ========================================
-- 3. Note Metadata (メタデータ)
-- ========================================

CREATE TABLE note_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(note_id, key)
);

CREATE INDEX idx_note_metadata_note ON note_metadata(note_id);
CREATE INDEX idx_note_metadata_key ON note_metadata(key);

-- Updated_at trigger
CREATE TRIGGER update_note_metadata_updated_at BEFORE UPDATE ON note_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE note_metadata IS 'ノートの任意メタデータ（key-value形式）';

-- ========================================
-- 4. Learning type: 1日1件制約 + 日付必須
-- ========================================

-- Add unique constraint for learning type (same as diary)
CREATE UNIQUE INDEX idx_notes_learning_unique
    ON notes(user_id, date)
    WHERE type = 'learning';

COMMENT ON INDEX idx_notes_learning_unique IS '学習記録も1日1件制約';

-- Note: 日付必須はアプリケーションレベルで強制する
-- (既存データがあるためDB制約は追加しない)

-- ========================================
-- 5. Seed default categories
-- ========================================

-- デフォルトカテゴリはユーザー作成時に追加するため、ここではスキップ
-- フロントエンドまたはバックエンドで初回ログイン時に作成

-- ========================================
-- 6. Migrate existing note_tags to categories (optional)
-- ========================================

-- 既存のnote_tagsはそのまま残す（検索用タグとして利用可能）
-- 必要に応じて手動でカテゴリに移行
