-- ============================================
-- Smart Tags Enhancement
-- Add pinned flag and usage_count for smart tag features
-- ============================================

-- Add columns to tags table
ALTER TABLE tags
ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN usage_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient querying of pinned tags
CREATE INDEX idx_tags_pinned ON tags(user_id, pinned) WHERE pinned = TRUE;

-- Create index for sorting by usage count
CREATE INDEX idx_tags_usage_count ON tags(user_id, usage_count DESC);

-- Add trigger to update updated_at
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment tag usage count
CREATE OR REPLACE FUNCTION increment_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment usage count when tags are assigned
CREATE TRIGGER increment_task_tag_usage AFTER INSERT ON task_tags
    FOR EACH ROW EXECUTE FUNCTION increment_tag_usage_count();

CREATE TRIGGER increment_note_tag_usage AFTER INSERT ON note_tags
    FOR EACH ROW EXECUTE FUNCTION increment_tag_usage_count();

-- ============================================
-- Initialize usage counts from existing data
-- ============================================
UPDATE tags t SET usage_count = (
    SELECT COUNT(*) FROM (
        SELECT tag_id FROM task_tags WHERE tag_id = t.id
        UNION ALL
        SELECT tag_id FROM note_tags WHERE tag_id = t.id
    ) AS all_uses
);
