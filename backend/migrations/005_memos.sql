-- 005_memos.sql
-- Create memos table for quick notes/scratch pad feature

CREATE TABLE IF NOT EXISTS memos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for listing user's memos
CREATE INDEX IF NOT EXISTS idx_memos_user_id ON memos(user_id);

-- Index for filtering by archived status
CREATE INDEX IF NOT EXISTS idx_memos_user_archived ON memos(user_id, archived);

-- Index for filtering by date
CREATE INDEX IF NOT EXISTS idx_memos_user_created_at ON memos(user_id, created_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER set_memos_updated_at
    BEFORE UPDATE ON memos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
