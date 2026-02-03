-- ============================================================================
-- Demo Seed: Entity Memos (~15件)
-- ============================================================================
-- ゴール・マイルストーン・タスクに紐づくメモ

INSERT INTO entity_memos (id, user_id, entity_type, entity_id, content, pinned, created_at, updated_at) VALUES

-- Goal: テックリード昇格
('dd600001-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'goal', 'dd000001-0000-0000-0000-000000000000',
 '佐藤さんから「設計レビューのフィードバックが的確になった」と言われた。成長を実感。',
 true, CURRENT_DATE - 30, CURRENT_DATE - 30),

('dd600002-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'goal', 'dd000001-0000-0000-0000-000000000000',
 '来期の目標設定面談で、テックリード昇格の意思を伝えた。上長は前向きな反応。',
 false, CURRENT_DATE - 20, CURRENT_DATE - 20),

-- Goal: 個人開発アプリリリース
('dd600003-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'goal', 'dd000002-0000-0000-0000-000000000000',
 'MVP完成まであとAPIが3本とフロント2画面。来週末には行けそう。',
 true, CURRENT_DATE - 12, CURRENT_DATE - 12),

('dd600004-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'goal', 'dd000002-0000-0000-0000-000000000000',
 'リポジトリ名は「kakeibo」に決定。Go + React + PostgreSQL。',
 false, CURRENT_DATE - 50, CURRENT_DATE - 50),

-- Goal: AWS SAP取得
('dd600005-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'goal', 'dd000003-0000-0000-0000-000000000000',
 '模擬試験の点数が上がらない...コスト最適化が苦手。実務で触る機会が少ないから仕方ないけど。',
 false, CURRENT_DATE - 8, CURRENT_DATE - 8),

('dd600006-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'goal', 'dd000003-0000-0000-0000-000000000000',
 '受験日を来月末に仮予約した。逃げ道を断つ作戦。',
 true, CURRENT_DATE - 5, CURRENT_DATE - 5),

-- Milestone: MVP完成
('dd600007-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'milestone', 'dd020001-0000-0000-0000-000000000000',
 'DB設計はSIer時代の経験で順調だった。APIもGoなのでサクサク書ける。問題はフロント。',
 false, CURRENT_DATE - 45, CURRENT_DATE - 45),

('dd600008-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'milestone', 'dd020001-0000-0000-0000-000000000000',
 'React苦戦中。でもshadcn/uiのおかげでUIは見た目が良くなった。CSSに時間を取られなくて助かる。',
 false, CURRENT_DATE - 22, CURRENT_DATE - 22),

-- Milestone: 模擬試験80%以上
('dd600009-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'milestone', 'dd030001-0000-0000-0000-000000000000',
 '1回目60% → 2回目72%。あと3%で合格ライン。コスト最適化を集中的にやる。',
 true, CURRENT_DATE - 8, CURRENT_DATE - 8),

-- Task: Go並行処理パターン整理
('dd600010-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'task', 'dd100003-0000-0000-0000-000000000000',
 '会社のコードレビューでgoroutineリークを発見。自分の勉強が活きた！',
 true, CURRENT_DATE - 33, CURRENT_DATE - 33),

-- Task: CI/CD改善提案
('dd600011-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'task', 'dd100005-0000-0000-0000-000000000000',
 'テスト並列実行の提案が採用された。CI時間8分→3分に短縮。チームから感謝された。',
 true, CURRENT_DATE - 31, CURRENT_DATE - 31),

-- Task: React フロント実装
('dd600012-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'task', 'dd100008-0000-0000-0000-000000000000',
 'useEffectの無限ループにハマった。依存配列にオブジェクトを入れてはダメ。useMemoで解決。',
 false, CURRENT_DATE - 26, CURRENT_DATE - 26),

('dd600013-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'task', 'dd100008-0000-0000-0000-000000000000',
 'ログイン画面とダッシュボードは完成。取引一覧とグラフが残り。',
 false, CURRENT_DATE - 14, CURRENT_DATE - 14),

-- Task: Zenn記事
('dd600014-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'task', 'dd100010-0000-0000-0000-000000000000',
 '記事の構成案：1.技術選定の理由 2.Clean Architectureの実践 3.DB設計の判断',
 false, CURRENT_DATE - 5, CURRENT_DATE - 5),

-- Milestone: 設計レビュー力向上
('dd600015-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
 'milestone', 'dd010001-0000-0000-0000-000000000000',
 'Clean Architecture + DDD の知識で、PRレビューのコメントの質が上がった気がする。',
 false, CURRENT_DATE - 25, CURRENT_DATE - 25);
