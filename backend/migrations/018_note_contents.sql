-- Migration 018: Create note_contents and note_content_chunks tables
-- Enables multiple content types per note (markdown + drawio + images)

-- ============================================
-- Note Contents (複数コンテンツ対応)
-- ============================================
CREATE TABLE note_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,

    -- コンテンツタイプ
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('markdown', 'drawio', 'image', 'pdf', 'code')),

    -- インラインコンテンツ（小さい場合、閾値: 100KB）
    content TEXT,

    -- ストレージ参照（大きい場合）
    storage_provider VARCHAR(20) CHECK (storage_provider IN ('minio', 'r2', 's3', 'local')),
    storage_key TEXT,  -- 'notes/{note_id}/{content_id}.md'

    -- ファイルメタデータ
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size_bytes BIGINT,
    checksum VARCHAR(64),  -- SHA-256 for dedup/integrity

    -- 画像のサムネイル（インライン表示用、Base64）
    thumbnail_base64 TEXT,

    -- 表示順
    sort_order INT DEFAULT 0,

    -- 拡張用メタデータ（drawioのページ情報など）
    metadata JSONB DEFAULT '{}',

    -- タイムスタンプ
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_note_contents_note_id ON note_contents(note_id);
CREATE INDEX idx_note_contents_type ON note_contents(content_type);
CREATE INDEX idx_note_contents_storage ON note_contents(storage_provider, storage_key) WHERE storage_key IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER update_note_contents_updated_at BEFORE UPDATE ON note_contents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Note Content Chunks (AI/検索用)
-- ============================================
CREATE TABLE note_content_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    note_content_id UUID NOT NULL REFERENCES note_contents(id) ON DELETE CASCADE,

    -- チャンク情報
    chunk_index INT NOT NULL,
    chunk_text TEXT NOT NULL,
    token_count INT,

    -- ベクトル埋め込み（pgvector拡張使用）
    -- 1536次元: OpenAI text-embedding-3-small
    -- 1024次元: Cohere embed-v3
    embedding vector(1536),

    -- 処理メタデータ
    embedding_model VARCHAR(50),  -- 'text-embedding-3-small', 'claude-3', etc.
    processed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_chunks_note_id ON note_content_chunks(note_id);
CREATE INDEX idx_chunks_content_id ON note_content_chunks(note_content_id);

-- 全文検索インデックス
CREATE INDEX idx_chunks_fts ON note_content_chunks
    USING GIN (to_tsvector('simple', chunk_text));

-- ベクトル類似検索インデックス（HNSW - 高速な近似最近傍探索）
CREATE INDEX idx_chunks_embedding ON note_content_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ============================================
-- Notes テーブル更新
-- ============================================

-- インデックス状態追跡用カラム追加
ALTER TABLE notes
    ADD COLUMN IF NOT EXISTS index_status VARCHAR(20) DEFAULT 'pending'
        CHECK (index_status IN ('pending', 'processing', 'indexed', 'failed')),
    ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMPTZ;

-- ============================================
-- 既存データのマイグレーション
-- ============================================

-- 既存のnotes.contentをnote_contentsに移行
INSERT INTO note_contents (note_id, content_type, content, sort_order, created_at, updated_at)
SELECT
    id,
    format,  -- 'markdown' or 'drawio'
    content,
    0,
    created_at,
    updated_at
FROM notes
WHERE content IS NOT NULL AND content != '';

-- file_urlがある場合はストレージ参照として追加
UPDATE note_contents nc
SET
    storage_provider = 'local',
    storage_key = n.file_url
FROM notes n
WHERE nc.note_id = n.id
  AND n.file_url IS NOT NULL
  AND n.file_url != '';

-- ============================================
-- 古いカラムの削除（コメントアウト - 確認後に実行）
-- ============================================
-- 注意: 既存アプリケーションとの互換性のため、移行完了後に手動で実行
-- ALTER TABLE notes DROP COLUMN IF EXISTS content;
-- ALTER TABLE notes DROP COLUMN IF EXISTS format;
-- ALTER TABLE notes DROP COLUMN IF EXISTS file_url;
