-- ============================================================================
-- Demo Seed: Cleanup
-- ============================================================================
-- Deletes all demo users. All related data is removed via ON DELETE CASCADE.
-- Safe to run multiple times (idempotent).

DELETE FROM users WHERE id IN (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',  -- 田中翔太
    'd1111111-1111-1111-1111-111111111111',    -- 鈴木美咲
    'd2222222-2222-2222-2222-222222222222',    -- 山田拓也
    'd3333333-3333-3333-3333-333333333333'     -- 高橋彩
);
