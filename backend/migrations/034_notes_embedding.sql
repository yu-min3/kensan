-- Add embedding column to notes table for semantic search.
-- Requires pgvector extension (already enabled by 015_documents_pgvector.sql).

ALTER TABLE notes ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create HNSW index for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_notes_embedding
    ON notes USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Full-text search index (if not already present)
CREATE INDEX IF NOT EXISTS idx_notes_fts
    ON notes USING gin (to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(content, '')));
