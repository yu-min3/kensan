-- Add conversation_id to ai_interactions for grouping messages into conversations
ALTER TABLE ai_interactions ADD COLUMN IF NOT EXISTS conversation_id UUID;

CREATE INDEX IF NOT EXISTS idx_ai_interactions_conversation_id
    ON ai_interactions (conversation_id)
    WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_conversation
    ON ai_interactions (user_id, conversation_id, created_at DESC)
    WHERE conversation_id IS NOT NULL;
