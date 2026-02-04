-- Deactivate morning situation context (replaced by briefing)
UPDATE ai_contexts
SET is_active = false
WHERE situation = 'morning';
