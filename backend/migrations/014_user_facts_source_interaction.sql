-- Add source_interaction_id to user_facts table to track which interaction led to the fact extraction

ALTER TABLE user_facts
ADD COLUMN source_interaction_id UUID REFERENCES ai_interactions(id) ON DELETE SET NULL;

-- Add index for efficient lookups
CREATE INDEX idx_user_facts_source_interaction ON user_facts(source_interaction_id);

COMMENT ON COLUMN user_facts.source_interaction_id IS 'The AI interaction that this fact was extracted from';
