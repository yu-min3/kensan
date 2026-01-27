-- Migration 020: Remove note categories (merged into Tags)
-- Keep note_metadata table for key-value storage
-- Keep learning unique index

-- ========================================
-- 1. Drop Note Category Assignments
-- ========================================

DROP TABLE IF EXISTS note_category_assignments;

-- ========================================
-- 2. Drop Note Categories
-- ========================================

DROP TRIGGER IF EXISTS update_note_categories_updated_at ON note_categories;
DROP TABLE IF EXISTS note_categories;

-- ========================================
-- Note: Keeping the following from migration 019:
-- - note_metadata table (useful for key-value storage)
-- - idx_notes_learning_unique index (1-day-1-note for learning)
-- ========================================
