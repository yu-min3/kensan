-- ============================================================================
-- Demo Seed: User & Master Data
-- ============================================================================
-- Persona: 田中翔太 (Tanaka Shota) — 32歳バックエンドエンジニア
-- Email: demo@kensan.dev / Password: demo1234

-- ==============================================================================
-- Demo User
-- ==============================================================================
-- Password hash for 'demo1234' (bcrypt cost 12, $2a$ prefix for Go compatibility)
INSERT INTO users (id, email, name, password_hash) VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'demo@kensan.dev', '田中翔太',
     '$2a$12$DCYla1Nq7wClb/5ycI4aHuz2Hynp9VLXvBjH38heLdNlTishoa3rm');

INSERT INTO user_settings (user_id, timezone, theme, is_configured, ai_enabled, ai_consent_given, ai_consented_at) VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Asia/Tokyo', 'system', true, true, true, NOW() - INTERVAL '60 days');

-- ==============================================================================
-- Goals (3つ)
-- ==============================================================================
INSERT INTO goals (id, user_id, name, description, color, status) VALUES
    ('dd000001-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'テックリード昇格', '技術力＋チーム貢献で、来年度のテックリード昇格を目指す', '#3B82F6', 'active'),
    ('dd000002-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     '個人開発アプリリリース', 'Go + Reactで家計簿アプリを作ってリリースする', '#10B981', 'active'),
    ('dd000003-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'AWS SAP取得', 'AWS Solutions Architect Professional を今年中に取得する', '#F59E0B', 'active');

-- ==============================================================================
-- Milestones (8つ)
-- ==============================================================================
INSERT INTO milestones (id, user_id, goal_id, name, description, target_date, status) VALUES
    -- テックリード昇格
    ('dd010001-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd000001-0000-0000-0000-000000000000', '設計レビュー力向上',
     'Clean ArchitectureとDDDの理解を深め、チームの設計レビューで的確なフィードバックを出す',
     (CURRENT_DATE + INTERVAL '60 days')::DATE, 'active'),
    ('dd010002-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd000001-0000-0000-0000-000000000000', 'チーム改善提案3件',
     '開発プロセス・ツール・文化に関する改善提案を3件出す',
     (CURRENT_DATE + INTERVAL '90 days')::DATE, 'active'),
    -- 個人開発アプリリリース
    ('dd020001-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd000002-0000-0000-0000-000000000000', 'MVP完成',
     'バックエンドAPI＋フロントエンド最低限のUIでMVPを完成させる',
     (CURRENT_DATE + INTERVAL '30 days')::DATE, 'active'),
    ('dd020002-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd000002-0000-0000-0000-000000000000', 'Zennで技術記事公開',
     '個人開発の技術選定や設計判断をZenn記事にまとめる',
     (CURRENT_DATE + INTERVAL '45 days')::DATE, 'active'),
    ('dd020003-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd000002-0000-0000-0000-000000000000', '本番デプロイ',
     'AWSにデプロイしてユーザーが使える状態にする',
     (CURRENT_DATE + INTERVAL '75 days')::DATE, 'active'),
    -- AWS SAP取得
    ('dd030001-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd000003-0000-0000-0000-000000000000', '模擬試験80%以上',
     '公式模擬試験で安定して80%以上取れるようになる',
     (CURRENT_DATE + INTERVAL '50 days')::DATE, 'active'),
    ('dd030002-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd000003-0000-0000-0000-000000000000', '本番受験',
     'AWS SAP本番試験を受験して合格する',
     (CURRENT_DATE + INTERVAL '80 days')::DATE, 'active'),
    -- テックリード昇格（追加）
    ('dd010003-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd000001-0000-0000-0000-000000000000', 'Go並行処理マスター',
     'goroutine, channel, contextパターンを完全に理解してチームに共有する',
     (CURRENT_DATE + INTERVAL '40 days')::DATE, 'active');

-- ==============================================================================
-- Tags (5つ)
-- ==============================================================================
INSERT INTO tags (id, user_id, name, color, type) VALUES
    ('dd0a0001-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '開発', '#8B5CF6', 'task'),
    ('dd0a0002-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '学習', '#06B6D4', 'task'),
    ('dd0a0003-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '資格', '#F59E0B', 'task'),
    ('dd0a0004-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '運動', '#EF4444', 'task'),
    ('dd0a0005-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '読書', '#84CC16', 'task');

-- ==============================================================================
-- Tasks (~15個)
-- ==============================================================================
INSERT INTO tasks (id, user_id, milestone_id, name, estimated_minutes, completed) VALUES
    -- 設計レビュー力向上
    ('dd100001-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd010001-0000-0000-0000-000000000000', 'Clean Architecture読了', 120, true),
    ('dd100002-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd010001-0000-0000-0000-000000000000', 'DDD入門まとめ', 90, false),
    -- Go並行処理マスター
    ('dd100003-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd010003-0000-0000-0000-000000000000', 'Go並行処理パターン整理', 120, true),
    ('dd100004-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd010003-0000-0000-0000-000000000000', 'context.Contextの使い分け記事', 60, false),
    -- チーム改善提案
    ('dd100005-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd010002-0000-0000-0000-000000000000', 'CI/CDパイプライン改善提案', 60, true),
    -- MVP完成
    ('dd100006-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd020001-0000-0000-0000-000000000000', 'DB設計', 180, true),
    ('dd100007-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd020001-0000-0000-0000-000000000000', 'API設計・実装', 300, true),
    ('dd100008-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd020001-0000-0000-0000-000000000000', 'React フロント実装', 240, false),
    ('dd100009-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd020001-0000-0000-0000-000000000000', 'CI/CD構築', 120, false),
    -- Zennで技術記事公開
    ('dd100010-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd020002-0000-0000-0000-000000000000', 'Zenn記事：技術選定編', 90, false),
    -- 本番デプロイ
    ('dd100011-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd020003-0000-0000-0000-000000000000', 'AWS環境構築', 180, false),
    -- 模擬試験80%以上
    ('dd100012-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd030001-0000-0000-0000-000000000000', 'AWS Well-Architected学習', 120, false),
    ('dd100013-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd030001-0000-0000-0000-000000000000', '模擬試験1回目', 120, true),
    ('dd100014-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd030001-0000-0000-0000-000000000000', '弱点分野復習', 90, false),
    -- React hooks理解（テックリード系）
    ('dd100015-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'dd010001-0000-0000-0000-000000000000', 'React hooks理解', 90, false);

-- ==============================================================================
-- Task-Tags
-- ==============================================================================
INSERT INTO task_tags (task_id, tag_id) VALUES
    -- 開発タグ
    ('dd100006-0000-0000-0000-000000000000', 'dd0a0001-0000-0000-0000-000000000000'),
    ('dd100007-0000-0000-0000-000000000000', 'dd0a0001-0000-0000-0000-000000000000'),
    ('dd100008-0000-0000-0000-000000000000', 'dd0a0001-0000-0000-0000-000000000000'),
    ('dd100009-0000-0000-0000-000000000000', 'dd0a0001-0000-0000-0000-000000000000'),
    ('dd100011-0000-0000-0000-000000000000', 'dd0a0001-0000-0000-0000-000000000000'),
    -- 学習タグ
    ('dd100001-0000-0000-0000-000000000000', 'dd0a0002-0000-0000-0000-000000000000'),
    ('dd100002-0000-0000-0000-000000000000', 'dd0a0002-0000-0000-0000-000000000000'),
    ('dd100003-0000-0000-0000-000000000000', 'dd0a0002-0000-0000-0000-000000000000'),
    ('dd100004-0000-0000-0000-000000000000', 'dd0a0002-0000-0000-0000-000000000000'),
    ('dd100015-0000-0000-0000-000000000000', 'dd0a0002-0000-0000-0000-000000000000'),
    -- 資格タグ
    ('dd100012-0000-0000-0000-000000000000', 'dd0a0003-0000-0000-0000-000000000000'),
    ('dd100013-0000-0000-0000-000000000000', 'dd0a0003-0000-0000-0000-000000000000'),
    ('dd100014-0000-0000-0000-000000000000', 'dd0a0003-0000-0000-0000-000000000000'),
    -- 読書タグ
    ('dd100001-0000-0000-0000-000000000000', 'dd0a0005-0000-0000-0000-000000000000');

-- ==============================================================================
-- Todos (ルーティン4つ)
-- ==============================================================================
INSERT INTO todos (id, user_id, name, frequency, days_of_week, estimated_minutes, tag_ids, enabled) VALUES
    ('dd0b0001-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     '技術ニュース読む', 'daily', NULL, 15,
     ARRAY['dd0a0002-0000-0000-0000-000000000000']::UUID[], true),
    ('dd0b0002-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     '英語リーディング', 'daily', NULL, 20,
     ARRAY['dd0a0002-0000-0000-0000-000000000000']::UUID[], true),
    ('dd0b0003-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'AWS問題集', 'daily', NULL, 30,
     ARRAY['dd0a0003-0000-0000-0000-000000000000']::UUID[], true),
    ('dd0b0004-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
     'ジム', 'custom', ARRAY[2, 4], 60,
     ARRAY['dd0a0004-0000-0000-0000-000000000000']::UUID[], true);
