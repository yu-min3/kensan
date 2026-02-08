-- Add category column to tags for AI personalization
ALTER TABLE tags ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'general';

-- Add CHECK constraint for valid categories
ALTER TABLE tags ADD CONSTRAINT chk_tags_category
    CHECK (category IN ('general', 'trait', 'tech', 'project'));

-- Index for filtering by category per user
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(user_id, category);
