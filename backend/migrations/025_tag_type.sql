-- Migration: Add type to tags for complete separation (task vs note)

-- Add type column with default 'task'
ALTER TABLE tags ADD COLUMN type VARCHAR(10) NOT NULL DEFAULT 'task'
  CHECK (type IN ('task', 'note'));

-- Set type based on actual usage
-- Tags used only in note_tags become 'note', others remain 'task'
UPDATE tags t SET type =
  CASE
    WHEN EXISTS (SELECT 1 FROM note_tags nt WHERE nt.tag_id = t.id)
         AND NOT EXISTS (SELECT 1 FROM task_tags tt WHERE tt.tag_id = t.id) THEN 'note'
    ELSE 'task'
  END;

-- Index for efficient filtering by type
CREATE INDEX idx_tags_type ON tags(user_id, type);
