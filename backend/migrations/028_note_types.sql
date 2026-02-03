-- 028_note_types.sql
-- Data-driven note types: move note type definitions from code to database

BEGIN;

-- ============================================
-- 1. Create note_types table
-- ============================================
CREATE TABLE note_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    display_name_en VARCHAR(100),
    description TEXT,
    icon VARCHAR(50) NOT NULL DEFAULT 'file-text',
    color VARCHAR(7) DEFAULT '#6B7280',
    constraints JSONB NOT NULL DEFAULT '{}',
    metadata_schema JSONB NOT NULL DEFAULT '[]',
    sort_order INT DEFAULT 0,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_note_types_updated_at
    BEFORE UPDATE ON note_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. Seed initial note types
-- ============================================
INSERT INTO note_types (slug, display_name, display_name_en, description, icon, color, constraints, metadata_schema, sort_order, is_system) VALUES
(
    'diary',
    '日記',
    'Diary',
    '日々の振り返りや気づきを記録します',
    'calendar-days',
    '#3B82F6',
    '{"dateRequired": true, "titleRequired": true, "contentRequired": true, "dailyUnique": true}',
    '[]',
    0,
    TRUE
),
(
    'learning',
    '学習記録',
    'Learning Record',
    '技術的な学びやナレッジを記録します',
    'book-open',
    '#10B981',
    '{"dateRequired": true, "titleRequired": true, "contentRequired": true, "dailyUnique": true}',
    '[]',
    1,
    TRUE
),
(
    'general',
    '一般ノート',
    'General Note',
    '自由形式のノートです',
    'file-text',
    '#6B7280',
    '{"dateRequired": false, "titleRequired": true, "contentRequired": true, "dailyUnique": false}',
    '[]',
    2,
    FALSE
),
(
    'book_review',
    '読書レビュー',
    'Book Review',
    '読んだ本のレビューや感想を記録します',
    'book-open-check',
    '#8B5CF6',
    '{"dateRequired": false, "titleRequired": true, "contentRequired": true, "dailyUnique": false}',
    '[
        {"key": "author", "label": "著者", "labelEn": "Author", "type": "string", "required": true, "constraints": {}},
        {"key": "rating", "label": "評価", "labelEn": "Rating", "type": "integer", "required": false, "constraints": {"min": 1, "max": 5}},
        {"key": "isbn", "label": "ISBN", "labelEn": "ISBN", "type": "string", "required": false, "constraints": {}},
        {"key": "publisher", "label": "出版社", "labelEn": "Publisher", "type": "string", "required": false, "constraints": {}},
        {"key": "finished_date", "label": "読了日", "labelEn": "Finished Date", "type": "date", "required": false, "constraints": {}},
        {"key": "category", "label": "カテゴリ", "labelEn": "Category", "type": "enum", "required": false, "constraints": {"values": ["技術書", "ビジネス", "自己啓発", "小説", "その他"]}}
    ]',
    3,
    FALSE
),
(
    'memo',
    'メモ',
    'Memo',
    'クイックメモ（migration 010 で memos テーブルから移行されたデータ用）',
    'sticky-note',
    '#F59E0B',
    '{"dateRequired": false, "titleRequired": false, "contentRequired": true, "dailyUnique": false}',
    '[]',
    10,
    TRUE
);

-- ============================================
-- 3. Drop existing CHECK constraint on notes.type, add FK
-- ============================================
-- Drop the CHECK constraint if it exists
DO $$
BEGIN
    -- Try to drop CHECK constraint (name may vary)
    EXECUTE (
        SELECT 'ALTER TABLE notes DROP CONSTRAINT ' || quote_ident(conname)
        FROM pg_constraint
        WHERE conrelid = 'notes'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%type%'
        LIMIT 1
    );
EXCEPTION
    WHEN undefined_object THEN NULL;
    WHEN others THEN NULL;
END $$;

-- Add FK constraint: notes.type -> note_types.slug
ALTER TABLE notes
    ADD CONSTRAINT fk_notes_type_note_types
    FOREIGN KEY (type) REFERENCES note_types(slug);

COMMIT;
