-- Kensan Seed Data
-- Migration 002: Test data for development

-- ==============================================================================
-- Test User (email: test@kensan.dev, password: password123)
-- ==============================================================================
-- Password hash is bcrypt of 'password123'
INSERT INTO users (id, email, name, password_hash) VALUES
    ('11111111-1111-1111-1111-111111111111', 'test@kensan.dev', 'Yu', '$2a$10$RrkXDfsDcA1ZC/tRZ4s6Qua1ymkwFRhwH0dLCMGIdqTEMbgqMplL6');

-- User settings
INSERT INTO user_settings (user_id, workspace_id, workspace_name, timezone, theme, is_configured, ai_enabled) VALUES
    ('11111111-1111-1111-1111-111111111111', 'ws-12345', 'Personal Workspace', 'Asia/Tokyo', 'system', true, true);

-- Sync status
INSERT INTO sync_status (user_id, status, pending_changes) VALUES
    ('11111111-1111-1111-1111-111111111111', 'healthy', 0);

-- ==============================================================================
-- Projects
-- ==============================================================================
INSERT INTO projects (id, user_id, name, goal_tag, color, is_archived) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Certification', 'GK', '#ecc94b', false),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Kensan', 'OSS', '#48bb78', false),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'ブログ執筆', 'Output', '#4299e1', false),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '読書', 'Other', '#a0aec0', false);

-- ==============================================================================
-- Tasks
-- ==============================================================================
-- Certification tasks
INSERT INTO tasks (id, user_id, project_id, name, completed) VALUES
    ('11111111-0001-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ICA試験勉強', false),
    ('11111111-0001-0001-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Traffic Management', false),
    ('11111111-0001-0002-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Security', false),
    ('11111111-0001-0003-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Observability', false),
    ('11111111-0002-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PCA試験勉強', false),
    ('11111111-0002-0001-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PromQL', false),
    ('11111111-0002-0002-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Alerting', false),
    ('11111111-0003-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CCA試験勉強', false);

-- Update parent task references for Certification
UPDATE tasks SET parent_task_id = '11111111-0001-0000-0000-000000000000' WHERE id IN (
    '11111111-0001-0001-0000-000000000000',
    '11111111-0001-0002-0000-000000000000',
    '11111111-0001-0003-0000-000000000000'
);
UPDATE tasks SET parent_task_id = '11111111-0002-0000-0000-000000000000' WHERE id IN (
    '11111111-0002-0001-0000-000000000000',
    '11111111-0002-0002-0000-000000000000'
);

-- Kensan tasks
INSERT INTO tasks (id, user_id, project_id, name, completed) VALUES
    ('22222222-0001-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'フロントエンド開発', false),
    ('22222222-0001-0001-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '画面設計', true),
    ('22222222-0001-0002-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'コンポーネント実装', false),
    ('22222222-0001-0003-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Clockify連携', false),
    ('22222222-0002-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'バックエンド開発', false);

UPDATE tasks SET parent_task_id = '22222222-0001-0000-0000-000000000000' WHERE id IN (
    '22222222-0001-0001-0000-000000000000',
    '22222222-0001-0002-0000-000000000000',
    '22222222-0001-0003-0000-000000000000'
);

-- Blog tasks
INSERT INTO tasks (id, user_id, project_id, name, completed) VALUES
    ('33333333-0001-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Istio記事執筆', false),
    ('33333333-0002-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Cilium記事執筆', false);

-- ==============================================================================
-- Routine Tasks
-- ==============================================================================
INSERT INTO routine_tasks (id, user_id, name, frequency, days_of_week, estimated_minutes, default_start_time, enabled) VALUES
    ('eeee0000-0001-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', '技術ニュースチェック', 'daily', NULL, 15, '16:30', true),
    ('eeee0000-0002-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', '英語学習', 'daily', NULL, 30, '17:00', true),
    ('eeee0000-0003-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', '筋トレ', 'custom', ARRAY[1, 3, 5], 30, '18:00', true),
    ('eeee0000-0004-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', '週次振り返り', 'weekly', ARRAY[0], 60, '20:00', true);

-- ==============================================================================
-- Time Blocks and Time Entries
-- ==============================================================================
-- NOTE: Time blocks (plans) and time entries (actuals) are not seeded.
-- These will be created by:
--   - Time blocks: User creates manually or from routine tasks
--   - Time entries: Synced from Clockify via sync-service

-- ==============================================================================
-- Learning Records
-- ==============================================================================
INSERT INTO learning_records (id, user_id, title, content, format, project_id, project_name, goal_tag, created_at, updated_at) VALUES
    ('00000001-0001-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
     'Istio Traffic Management まとめ',
     E'# Istio Traffic Management\n\n## VirtualService\n\nVirtualServiceは、Istioにおけるトラフィックルーティングの中核となるリソースである。\n\n```yaml\napiVersion: networking.istio.io/v1beta1\nkind: VirtualService\nmetadata:\n  name: reviews\nspec:\n  hosts:\n  - reviews\n  http:\n  - match:\n    - headers:\n        end-user:\n          exact: jason\n    route:\n    - destination:\n        host: reviews\n        subset: v2\n  - route:\n    - destination:\n        host: reviews\n        subset: v1\n```\n\n## DestinationRule\n\nDestinationRuleは、トラフィックが特定のサービスに到達した後のポリシーを定義する。\n\n- サブセット定義\n- ロードバランシング設定\n- コネクションプール設定\n- 外れ値検出設定',
     'markdown', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Certification', 'GK',
     CURRENT_DATE - 1, CURRENT_DATE - 1),

    ('00000001-0002-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
     'Kensan アーキテクチャ図',
     '[drawio content placeholder]',
     'drawio', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Kensan', 'OSS',
     CURRENT_DATE - 2, CURRENT_DATE - 2),

    ('00000001-0003-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
     'Cilium eBPF 動作原理',
     E'# Cilium eBPF 動作原理\n\n## eBPFとは\n\neBPF (extended Berkeley Packet Filter) は、Linuxカーネル内でサンドボックス化されたプログラムを実行するための技術。\n\n## XDP (eXpress Data Path)\n\n- ネットワークドライバの直後でパケット処理\n- 高速なパケット処理を実現\n- ドロップ、転送、リダイレクト、通常処理への受け渡しが可能\n\n## TC (Traffic Control)\n\n- より高レベルなパケット処理\n- L7ポリシーの適用が可能',
     'markdown', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Certification', 'GK',
     CURRENT_DATE - 3, CURRENT_DATE - 3),

    ('00000001-0004-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
     'Prometheus PromQL基礎',
     E'# Prometheus PromQL基礎\n\n## 基本的なクエリ\n\n### インスタントベクター\n```\nhttp_requests_total{job="api-server"}\n```\n\n### レンジベクター\n```\nhttp_requests_total{job="api-server"}[5m]\n```\n\n## 集約関数\n\n- sum() - 合計\n- avg() - 平均\n- rate() - 増加率\n- increase() - 増加量',
     'markdown', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Certification', 'GK',
     CURRENT_DATE - 5, CURRENT_DATE - 5);

-- ==============================================================================
-- Diary Entries
-- ==============================================================================
INSERT INTO diary_entries (id, user_id, date, title, content, tags) VALUES
    ('ddd00000-0001-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
     CURRENT_DATE,
     '新年の抱負と計画',
     E'# 新年の抱負と計画\n\n2025年の目標を整理した。\n\n## 技術目標\n- Golden Kubestronaut 完走\n- Kensanを完成させてOSS公開\n- 技術ブログ月2本\n\n## プライベート\n- 家族との時間を大切に\n- 健康管理（週3運動）\n\n今年も頑張ろう。',
     ARRAY['振り返り', '目標']),

    ('ddd00000-0002-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
     CURRENT_DATE - 1,
     '育児と学習の両立について',
     E'# 育児と学習の両立について\n\n最近、子どもが夜泣きで睡眠時間が減っている。\nそれでも少しずつ学習時間を確保できているのは、タイムブロック管理のおかげ。\n\n朝の時間を有効活用することが大事だと実感した。',
     ARRAY['育児', '日常']);

-- ==============================================================================
-- AI Review Reports
-- ==============================================================================
INSERT INTO ai_review_reports (id, user_id, week_start, week_end, summary, good_points, improvement_points, advice, created_at) VALUES
    ('aaa00000-0001-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
     CURRENT_DATE - 7,
     CURRENT_DATE - 1,
     '今週は合計32時間の学習を達成しました。Golden Kubestronaut目標に対して、ICA試験勉強に重点的に取り組み、Traffic Managementの理解が深まりました。',
     ARRAY['ICA勉強を計画通り18時間実施', 'Kensanの画面設計が完了', '毎日の定期タスクを90%達成'],
     ARRAY['ブログ執筆が2回先送りになった', '週後半に学習時間が減少傾向'],
     ARRAY['ブログ執筆は朝の集中時間に固定してみては？', 'ICAは残り2週間、Security分野に注力を', '週後半の疲れに備えて、木曜に軽めのタスクを配置することを検討'],
     CURRENT_DATE - 1);
