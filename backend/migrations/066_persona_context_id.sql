-- Add persona_context_id to ai_interactions
-- Tracks which persona context was active when the interaction occurred,
-- enabling accurate evaluation that includes the persona layer.

ALTER TABLE ai_interactions
    ADD COLUMN persona_context_id UUID REFERENCES ai_contexts(id);

CREATE INDEX idx_ai_interactions_persona ON ai_interactions(persona_context_id)
    WHERE persona_context_id IS NOT NULL;
