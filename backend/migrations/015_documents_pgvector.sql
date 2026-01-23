-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table for storing searchable content with embeddings
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content TEXT,
    embedding vector(1536),
    file_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX idx_documents_user_id ON documents(user_id);

-- Index for content type filtering
CREATE INDEX idx_documents_content_type ON documents(content_type);

-- HNSW index for vector similarity search (cosine distance)
-- HNSW is faster than IVFFlat for most use cases
CREATE INDEX idx_documents_embedding ON documents
    USING hnsw (embedding vector_cosine_ops);

-- Full-text search index for keyword search
CREATE INDEX idx_documents_content_fts ON documents
    USING gin (to_tsvector('japanese', content));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();

-- Comments
COMMENT ON TABLE documents IS 'Searchable documents with vector embeddings for semantic search';
COMMENT ON COLUMN documents.embedding IS 'OpenAI text-embedding-3-small (1536 dimensions)';
COMMENT ON COLUMN documents.content_type IS 'Type of content (note, diary, learning, etc.)';
COMMENT ON COLUMN documents.file_url IS 'URL to file in R2 storage if this document has an attached file';
COMMENT ON COLUMN documents.metadata IS 'Additional metadata like tags, source, etc.';
