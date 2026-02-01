-- Migration 037: Unified search architecture
-- Adds user_id, content_type to note_content_chunks for JOIN-free queries
-- Drops documents table (search unified to note_content_chunks)

-- ============================================
-- note_content_chunks にカラム追加
-- ============================================

-- user_id: 検索時のJOIN削減
ALTER TABLE note_content_chunks
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- content_type: チャンク元のコンテンツタイプ
ALTER TABLE note_content_chunks
    ADD COLUMN IF NOT EXISTS content_type VARCHAR(50);

-- 既存データのuser_id埋め戻し
UPDATE note_content_chunks ncc
SET user_id = n.user_id
FROM notes n
WHERE ncc.note_id = n.id AND ncc.user_id IS NULL;

-- NOT NULL制約追加
ALTER TABLE note_content_chunks ALTER COLUMN user_id SET NOT NULL;

-- user_idインデックス
CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON note_content_chunks(user_id);

-- ============================================
-- documents テーブル削除
-- ============================================
DROP TABLE IF EXISTS documents;
