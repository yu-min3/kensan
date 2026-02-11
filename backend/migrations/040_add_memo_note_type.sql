-- Migration 040: Add missing 'memo' note type
--
-- Migration 010 migrated memos from the `memos` table into `notes` with type='memo'.
-- Migration 028 added FK constraint notes.type -> note_types.slug, but did not
-- seed the 'memo' slug into note_types. This causes FK violation on fresh setups.
--
-- This migration adds the missing 'memo' note type to resolve the constraint issue.

INSERT INTO note_types (slug, display_name, display_name_en, description, icon, color, constraints, metadata_schema, sort_order, is_system, is_active)
VALUES (
    'memo',
    'メモ',
    'Memo',
    'クイックメモ（memos テーブルから移行されたデータ用）',
    'sticky-note',
    '#F59E0B',
    '{"dateRequired": false, "titleRequired": false, "contentRequired": true, "dailyUnique": false}',
    '[]',
    10,
    TRUE,
    TRUE
)
ON CONFLICT (slug) DO NOTHING;
