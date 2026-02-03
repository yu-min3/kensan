-- ============================================================================
-- Demo Seed: Notes (日記 ~25件 + 学習記録 ~10件)
-- ============================================================================

-- ==============================================================================
-- 日記 (diary type) — 育児エンジニアのリアルな日記
-- ==============================================================================

-- Week 1
INSERT INTO notes (id, user_id, type, title, content, date, created_at, updated_at) VALUES
('dd400001-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 '個人開発始動',
 E'# 個人開発始動\n\n家計簿アプリの開発を本格的に始めた。GoでバックエンドAPIを書く。\nSIer時代のDB設計スキルが活きそう。テーブル設計から着手。\n\n子どもを寝かしつけた後の21時からが勝負時間。\n今日は23時まで集中できた。いいスタート。',
 CURRENT_DATE - 54, CURRENT_DATE - 54, CURRENT_DATE - 54),

('dd400002-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 '朝活チャレンジ開始',
 E'# 朝活チャレンジ開始\n\n6時起きでAWSの勉強を始めてみた。子どもが起きる前の45分が意外と集中できる。\nWell-Architectedフレームワークの概要を読み始めた。\n\n問題は継続できるかどうか...',
 CURRENT_DATE - 52, CURRENT_DATE - 52, CURRENT_DATE - 52),

('dd400003-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 '子どもが熱出した',
 E'# 子どもが熱出した\n\n保育園から呼び出し。午後半休取って病院へ。\n夜の勉強時間ゼロ。こういう日は仕方ない。\n\n明日は妻が在宅なので、夜は予定通り開発できるはず。\n育児してるとスケジュール通りにいかないことが多いけど、\n週単位で帳尻を合わせればいいと割り切ることにした。',
 CURRENT_DATE - 50, CURRENT_DATE - 50, CURRENT_DATE - 50);

-- Week 2
INSERT INTO notes (id, user_id, type, title, content, date, created_at, updated_at) VALUES
('dd400004-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'DB設計完了！',
 E'# DB設計完了！\n\n家計簿アプリのDB設計がほぼ固まった。\n\n## テーブル構成\n- users\n- accounts（銀行口座・クレカ）\n- transactions\n- categories\n- budgets\n\nSIer時代に設計書を散々書いたおかげで、ここはスムーズだった。\n正規化と非正規化のバランスは悩ましいけど、\n個人開発なのでシンプルに正規化寄りで進める。',
 CURRENT_DATE - 47, CURRENT_DATE - 47, CURRENT_DATE - 47),

('dd400005-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 '朝活1週間続いた',
 E'# 朝活1週間続いた\n\n6時起きが1週間続いた。自分でもびっくり。\nコツは「前日夜に何を勉強するか決めておく」こと。\n\n朝はAWS、夜は個人開発と分けるとリズムが良い。\n子どもが早起きした日（2回）はスキップしたけど、\n5/7日達成なら十分。',
 CURRENT_DATE - 45, CURRENT_DATE - 45, CURRENT_DATE - 45);

-- Week 3
INSERT INTO notes (id, user_id, type, title, content, date, created_at, updated_at) VALUES
('dd400006-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'API実装が楽しい',
 E'# API実装が楽しい\n\nGoでREST API書くのが楽しい。chi routerシンプルで良い。\n\nミドルウェアでJWT認証を入れた。SIer時代はSpring Securityと格闘してたけど、\nGoだと自分で書ける範囲が広くて理解しやすい。\n\n今日はCRUDの半分くらい実装できた。',
 CURRENT_DATE - 40, CURRENT_DATE - 40, CURRENT_DATE - 40),

('dd400007-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'AWS模擬試験60%...焦る',
 E'# AWS模擬試験60%...焦る\n\n初めてのSAP模擬試験。結果は60%。合格ラインは75%。\n\n## 弱い分野\n- ネットワーク設計（VPCピアリング、Transit Gateway周り）\n- セキュリティ（IAMポリシーの複雑なケース）\n- コスト最適化\n\n正直焦った。でもまだ時間はある。\n弱点を集中的に潰していく戦略に切り替える。',
 CURRENT_DATE - 38, CURRENT_DATE - 38, CURRENT_DATE - 38),

('dd400008-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 '朝活3週間達成',
 E'# 朝活3週間達成\n\n朝活が3週間続いた。もう習慣になりつつある。\n自信がついてきた。\n\n最近は5:50に自然に目が覚める。体内時計が調整された感じ。\n\n会社の同僚にも「最近元気ですね」と言われた。\n朝型生活、合ってるのかもしれない。',
 CURRENT_DATE - 36, CURRENT_DATE - 36, CURRENT_DATE - 36);

-- Week 4
INSERT INTO notes (id, user_id, type, title, content, date, created_at, updated_at) VALUES
('dd400009-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'Go並行処理が面白い',
 E'# Go並行処理が面白い\n\n会社のコードレビューで並行処理のバグを見つけた。\ngoroutineリーク。contextでキャンセル伝播するパターンを提案した。\n\n自分の勉強がチームに還元できてる実感がある。\nテックリード、遠くないかもしれない。',
 CURRENT_DATE - 33, CURRENT_DATE - 33, CURRENT_DATE - 33),

('dd400010-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'CI/CD改善提案が通った',
 E'# CI/CD改善提案が通った\n\nチームのCI/CDパイプラインの改善提案を出した。\n\n## 提案内容\n- テストの並列実行（CI時間 8分→3分）\n- キャッシュ戦略の見直し\n- ステージング環境の自動デプロイ\n\nテックリードの佐藤さんが「いい提案だね」と言ってくれた。\n次はアーキテクチャ周りでも提案を出したい。',
 CURRENT_DATE - 31, CURRENT_DATE - 31, CURRENT_DATE - 31);

-- Week 5
INSERT INTO notes (id, user_id, type, title, content, date, created_at, updated_at) VALUES
('dd400011-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'React難しい...',
 E'# React難しい...\n\nフロントエンド実装に入ったけど、Reactのstate管理が難しい。\nuseEffectの依存配列で無限ループにハマった。\n\nバックエンドエンジニアからすると、宣言的UIの考え方がまだ馴染まない。\nでもフロントわかると個人開発の幅が広がるので頑張る。\n\n今日は3時間溶かしてやっとログイン画面ができた。',
 CURRENT_DATE - 26, CURRENT_DATE - 26, CURRENT_DATE - 26),

('dd400012-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'AWSの勉強が後回しに',
 E'# AWSの勉強が後回しに\n\n個人開発のReact実装に時間を取られて、AWSの勉強が2週間ほぼできてない。\n英語のリーディングもサボりがち。\n\n手を広げすぎてる自覚はある。\nでもMVP完成が見えてきてるから、ここは個人開発を優先したい。\nAWSは来月から巻き返す...と毎回言ってる気がする。',
 CURRENT_DATE - 24, CURRENT_DATE - 24, CURRENT_DATE - 24),

('dd400013-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'useStateとuseReducerの使い分け',
 E'# useStateとuseReducerの使い分け\n\n今日やっとReactのstate管理が少しわかってきた。\n\n- 単純な値: useState\n- 複雑なオブジェクト/関連する複数の状態: useReducer\n- グローバル状態: Zustand（Context APIより使いやすい）\n\nバックエンドの設計パターンと似てる部分もあって、\n慣れてきたら意外とスムーズかもしれない。',
 CURRENT_DATE - 22, CURRENT_DATE - 22, CURRENT_DATE - 22);

-- Week 6
INSERT INTO notes (id, user_id, type, title, content, date, created_at, updated_at) VALUES
('dd400014-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'チーム改善提案2件目',
 E'# チーム改善提案2件目\n\nエラーハンドリングの標準化を提案した。\n\n## 内容\n- カスタムエラー型の導入\n- エラーラッピングのルール統一\n- ログレベルの基準策定\n\nGo特有の「errors.Is/As」の使い方をチームに共有した。\nSIer時代はJavaのException階層に苦しめられたけど、\nGoのエラーハンドリングはシンプルで好き。',
 CURRENT_DATE - 19, CURRENT_DATE - 19, CURRENT_DATE - 19),

('dd400015-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 '家族の時間を大切に',
 E'# 家族の時間を大切に\n\n日曜日。子どもと公園で遊んだ。\n最近は個人開発に夢中で、週末も子どもと遊ぶ時間が減ってた。\n\n妻に「最近パソコンばっかりだね」と言われてハッとした。\n目標達成も大事だけど、家族の時間を犠牲にしてはダメだ。\n\n来週から週末の午後は家族時間として確保する。',
 CURRENT_DATE - 17, CURRENT_DATE - 17, CURRENT_DATE - 17);

-- Week 7
INSERT INTO notes (id, user_id, type, title, content, date, created_at, updated_at) VALUES
('dd400016-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'MVP完成が見えてきた',
 E'# MVP完成が見えてきた\n\n家計簿アプリのMVP、あと少しで完成。\n\n## 完了\n- 認証（JWT）\n- CRUD API 全部\n- ログイン/ダッシュボード画面\n\n## 残り\n- 取引一覧画面\n- グラフ表示\n- CI/CDパイプライン\n\n週末にまとまった時間取れれば、来週中にはMVP完成できそう。',
 CURRENT_DATE - 12, CURRENT_DATE - 12, CURRENT_DATE - 12),

('dd400017-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'ジムが減ってる',
 E'# ジムが減ってる\n\n今月のジム回数を数えたら、先月の半分しか行けてない。\n個人開発の追い込みで「今日はいいか」が続いた結果。\n\n体が資本なのは分かってるのに。\n来週から火木のジムは最優先にする。\n1時間のジムで残りの生産性が上がるはず。',
 CURRENT_DATE - 10, CURRENT_DATE - 10, CURRENT_DATE - 10),

('dd400018-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'AWS模擬試験2回目: 72%',
 E'# AWS模擬試験2回目: 72%\n\n2回目の模擬試験。72%。前回の60%から12ポイント改善。\n\n## 改善した分野\n- ネットワーク: 55%→70%\n- セキュリティ: 60%→75%\n\n## まだ弱い\n- コスト最適化: 50%（変わらず）\n\n合格ラインの75%まであと3ポイント。\nコスト最適化を集中的にやれば届きそう。\nでも個人開発のデプロイも控えてて、時間配分が難しい。',
 CURRENT_DATE - 8, CURRENT_DATE - 8, CURRENT_DATE - 8);

-- Week 8
INSERT INTO notes (id, user_id, type, title, content, date, created_at, updated_at) VALUES
('dd400019-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'Zenn記事の下書き開始',
 E'# Zenn記事の下書き開始\n\n個人開発の技術選定をZenn記事にまとめ始めた。\n\n## 記事構成案\n1. なぜGoとReactを選んだか\n2. Clean Architectureの実践\n3. 個人開発でのDB設計の考え方\n\nアウトプットすると自分の理解も整理される。\n記事を書きながら「ここの設計イマイチだな」と気づくこともあって面白い。',
 CURRENT_DATE - 5, CURRENT_DATE - 5, CURRENT_DATE - 5),

('dd400020-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'バランスの大切さ',
 E'# バランスの大切さ\n\n8週間を振り返って思うこと。\n\n## 良かったこと\n- 朝活が習慣化した\n- 個人開発のMVPがほぼ完成\n- チーム改善提案2件達成\n- Go並行処理の知識がチームに還元できた\n\n## 反省\n- AWSの勉強が後回しになりがち\n- ジムの頻度が下がった\n- 英語のリーディングが不安定\n\n完璧主義を捨てて、週単位でバランスを取ることが大事。\n来月はAWSに力を入れる月にする。',
 CURRENT_DATE - 3, CURRENT_DATE - 3, CURRENT_DATE - 3),

('dd400021-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 '寝かしつけで寝落ち',
 E'# 寝かしつけで寝落ち\n\n子どもの寝かしつけで一緒に寝落ちした。\n21時に寝て、気づいたら朝5時。\n\n予定してた個人開発の時間がゼロに。\nでも8時間寝たおかげで体調はすごく良い。\n\nたまにはこういう日も必要だと思うことにする。',
 CURRENT_DATE - 1, CURRENT_DATE - 1, CURRENT_DATE - 1);

-- More diary entries to fill gaps
INSERT INTO notes (id, user_id, type, title, content, date, created_at, updated_at) VALUES
('dd400022-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'Clean Architecture読了',
 E'# Clean Architecture読了\n\n2週間かけてClean Architectureを読み終えた。\n\nSIer時代のレイヤードアーキテクチャの経験があるから、\n依存性の方向の話はすんなり理解できた。\n\n「ビジネスルールが外部に依存しない」という原則は、\n今の会社のマイクロサービスにもそのまま適用できる。\n\n次はDDDの入門書を読む。',
 CURRENT_DATE - 43, CURRENT_DATE - 43, CURRENT_DATE - 43),

('dd400023-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'Go contextの奥深さ',
 E'# Go contextの奥深さ\n\ncontext.Contextの使い方を整理した。\n\n## 使い分け\n- `context.Background()`: メインや初期化\n- `context.TODO()`: 後でリファクタする箇所\n- `context.WithCancel()`: 明示的なキャンセル\n- `context.WithTimeout()`: タイムアウト制御\n- `context.WithValue()`: リクエストスコープの値（乱用注意）\n\n記事にまとめたら需要ありそう。',
 CURRENT_DATE - 29, CURRENT_DATE - 29, CURRENT_DATE - 29),

('dd400024-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'diary',
 'Tailwind CSSに慣れてきた',
 E'# Tailwind CSSに慣れてきた\n\nReact実装でTailwind CSSを使ってるけど、最初は違和感しかなかった。\nクラス名長すぎだろ...と思ってたけど、慣れるとめちゃくちゃ速い。\n\nCSSファイルを行き来しなくていいのがバックエンドエンジニアには助かる。\nshadcn/uiとの組み合わせで、見た目もそれなりになる。',
 CURRENT_DATE - 15, CURRENT_DATE - 15, CURRENT_DATE - 15);

-- ==============================================================================
-- 学習記録 (learning type) — ~10件
-- ==============================================================================
INSERT INTO notes (id, user_id, type, title, content, date,
    task_id, milestone_id, milestone_name, goal_id, goal_name, goal_color,
    created_at, updated_at) VALUES

('dd500001-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'learning',
 'Go並行処理パターンまとめ',
 E'# Go並行処理パターンまとめ\n\n## 1. Fan-out / Fan-in\n```go\nfunc fanOut(in <-chan int, workers int) []<-chan int {\n    channels := make([]<-chan int, workers)\n    for i := 0; i < workers; i++ {\n        channels[i] = worker(in)\n    }\n    return channels\n}\n```\n\n## 2. Pipeline\nステージを連結してデータを流す。各ステージはgoroutine。\n\n## 3. Context Cancellation\nparent contextがキャンセルされたら子もキャンセル。\ngoroutineリーク防止の基本。\n\n## 4. errgroup\n複数のgoroutineのエラーハンドリングを統一。\n`golang.org/x/sync/errgroup` が便利。',
 CURRENT_DATE - 35,
 'dd100003-0000-0000-0000-000000000000', 'dd010003-0000-0000-0000-000000000000', 'Go並行処理マスター',
 'dd000001-0000-0000-0000-000000000000', 'テックリード昇格', '#3B82F6',
 CURRENT_DATE - 35, CURRENT_DATE - 35),

('dd500002-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'learning',
 'Clean Architecture読書メモ',
 E'# Clean Architecture読書メモ\n\n## 核心\n- ビジネスルール（Entity, UseCase）が最も重要\n- フレームワークやDBは「詳細」であり、交換可能にする\n- 依存性は外側から内側に向かう（Dependency Rule）\n\n## レイヤー\n1. Entities: ビジネスルール\n2. Use Cases: アプリケーション固有のビジネスルール\n3. Interface Adapters: Controller, Presenter, Gateway\n4. Frameworks & Drivers: DB, Web, UI\n\n## 個人開発への適用\n- handler/ = Interface Adapter\n- service/ = Use Case\n- model/ = Entity\n- repository/ = Interface Adapter (DB側)',
 CURRENT_DATE - 43,
 'dd100001-0000-0000-0000-000000000000', 'dd010001-0000-0000-0000-000000000000', '設計レビュー力向上',
 'dd000001-0000-0000-0000-000000000000', 'テックリード昇格', '#3B82F6',
 CURRENT_DATE - 43, CURRENT_DATE - 43),

('dd500003-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'learning',
 'AWS SAP模擬試験振り返り（1回目）',
 E'# AWS SAP模擬試験振り返り（1回目）\n\n## 結果: 60%（不合格ライン）\n\n## 分野別スコア\n| 分野 | スコア |\n|------|--------|\n| 組織の複雑さに対する設計 | 65% |\n| 新しいソリューションの設計 | 70% |\n| 移行の計画 | 55% |\n| コスト管理 | 50% |\n| 既存ソリューションの継続的改善 | 60% |\n\n## 弱点分析\n- VPCピアリング vs Transit Gateway の使い分け\n- IAMポリシーの評価ロジック（明示的Deny > Allow）\n- リザーブドインスタンス vs Savings Plans の計算',
 CURRENT_DATE - 38,
 'dd100013-0000-0000-0000-000000000000', 'dd030001-0000-0000-0000-000000000000', '模擬試験80%以上',
 'dd000003-0000-0000-0000-000000000000', 'AWS SAP取得', '#F59E0B',
 CURRENT_DATE - 38, CURRENT_DATE - 38),

('dd500004-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'learning',
 'React hooks使い方メモ',
 E'# React hooks使い方メモ\n\n## useState\n- シンプルな状態管理\n- オブジェクトの場合はスプレッド構文で更新\n\n## useEffect\n- 副作用の管理（API呼び出し、DOM操作）\n- 依存配列を正しく設定しないと無限ループ\n- cleanup関数でメモリリーク防止\n\n## useCallback / useMemo\n- useCallback: 関数の再生成を防ぐ\n- useMemo: 計算結果のキャッシュ\n- 過度な最適化は逆効果（測定してから使う）\n\n## useRef\n- DOMへの直接アクセス\n- レンダリングをトリガーしない値の保持\n\n## カスタムhooks\n- ロジックの再利用に最適\n- `use` プレフィックスが必須',
 CURRENT_DATE - 22,
 'dd100015-0000-0000-0000-000000000000', 'dd010001-0000-0000-0000-000000000000', '設計レビュー力向上',
 'dd000001-0000-0000-0000-000000000000', 'テックリード昇格', '#3B82F6',
 CURRENT_DATE - 22, CURRENT_DATE - 22),

('dd500005-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'learning',
 'DDD入門メモ',
 E'# DDD入門メモ\n\n## 戦略的設計\n- Bounded Context: ドメインの境界を明確にする\n- Ubiquitous Language: チーム共通の言語\n- Context Map: BC間の関係を可視化\n\n## 戦術的設計\n- Entity: 同一性で区別されるオブジェクト\n- Value Object: 値で区別されるオブジェクト（不変）\n- Aggregate: 整合性の単位\n- Repository: 永続化の抽象\n- Domain Service: Entity/VOに属さないドメインロジック\n\n## 気づき\nClean Architectureと併用するとEntity/UseCaseの分離がより明確になる。\n個人開発の家計簿アプリでもAccount（Entity）とMoney（Value Object）で実践できそう。',
 CURRENT_DATE - 30,
 'dd100002-0000-0000-0000-000000000000', 'dd010001-0000-0000-0000-000000000000', '設計レビュー力向上',
 'dd000001-0000-0000-0000-000000000000', 'テックリード昇格', '#3B82F6',
 CURRENT_DATE - 30, CURRENT_DATE - 30),

('dd500006-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'learning',
 'AWS SAP模擬試験振り返り（2回目）',
 E'# AWS SAP模擬試験振り返り（2回目）\n\n## 結果: 72%（合格ラインまであと3%）\n\n## 分野別スコア\n| 分野 | 1回目 | 2回目 | 変化 |\n|------|-------|-------|------|\n| 組織の複雑さに対する設計 | 65% | 78% | +13 |\n| 新しいソリューションの設計 | 70% | 80% | +10 |\n| 移行の計画 | 55% | 68% | +13 |\n| コスト管理 | 50% | 52% | +2 |\n| 既存ソリューションの継続的改善 | 60% | 72% | +12 |\n\n## 改善点\n- Transit Gatewayの理解が深まった\n- IAMポリシー評価は確実に解けるように\n\n## 残課題\n- コスト最適化がほぼ変わらず → ここを集中的にやる',
 CURRENT_DATE - 8,
 'dd100013-0000-0000-0000-000000000000', 'dd030001-0000-0000-0000-000000000000', '模擬試験80%以上',
 'dd000003-0000-0000-0000-000000000000', 'AWS SAP取得', '#F59E0B',
 CURRENT_DATE - 8, CURRENT_DATE - 8),

('dd500007-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'learning',
 'Goエラーハンドリングベストプラクティス',
 E'# Goエラーハンドリングベストプラクティス\n\n## チーム提案用にまとめた内容\n\n### 1. カスタムエラー型\n```go\ntype AppError struct {\n    Code    string\n    Message string\n    Err     error\n}\nfunc (e *AppError) Error() string { return e.Message }\nfunc (e *AppError) Unwrap() error { return e.Err }\n```\n\n### 2. errors.Is / errors.As\n- `errors.Is`: 特定のエラー値との比較\n- `errors.As`: 特定のエラー型へのキャスト\n\n### 3. fmt.Errorf + %w\nエラーをラップしてコンテキストを追加。\nチェーンを辿れるようにする。\n\n### 4. ログレベル基準\n- ERROR: ユーザー影響あり、即対応必要\n- WARN: 潜在的問題、監視対象\n- INFO: 正常系の重要イベント\n- DEBUG: 開発時のみ',
 CURRENT_DATE - 19,
 'dd100005-0000-0000-0000-000000000000', 'dd010002-0000-0000-0000-000000000000', 'チーム改善提案3件',
 'dd000001-0000-0000-0000-000000000000', 'テックリード昇格', '#3B82F6',
 CURRENT_DATE - 19, CURRENT_DATE - 19),

('dd500008-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'learning',
 'AWS VPC設計パターン',
 E'# AWS VPC設計パターン\n\n## 弱点克服ノート\n\n### VPC Peering vs Transit Gateway\n| 項目 | VPC Peering | Transit Gateway |\n|------|-------------|------------------|\n| 接続数 | 1対1 | ハブ&スポーク |\n| スケール | 125ピアリング/VPC | 5000アタッチメント |\n| 推移的ルーティング | 不可 | 可能 |\n| コスト | データ転送のみ | 時間課金+データ転送 |\n\n### 使い分け\n- VPC数が少ない（~5個）: VPC Peering\n- VPC数が多い or 将来増える: Transit Gateway\n- オンプレ接続: Transit Gateway + Direct Connect Gateway\n\n### PrivateLink\n- 特定サービスへのプライベートアクセス\n- VPC Peeringの代替として使える場面もある',
 CURRENT_DATE - 40,
 'dd100012-0000-0000-0000-000000000000', 'dd030001-0000-0000-0000-000000000000', '模擬試験80%以上',
 'dd000003-0000-0000-0000-000000000000', 'AWS SAP取得', '#F59E0B',
 CURRENT_DATE - 40, CURRENT_DATE - 40),

('dd500009-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'learning',
 '個人開発DB設計ドキュメント',
 E'# 個人開発DB設計ドキュメント\n\n## 家計簿アプリ ER図メモ\n\n### テーブル一覧\n- users: ユーザー\n- accounts: 口座（銀行/クレカ/電子マネー）\n- transactions: 取引\n- categories: カテゴリ（収入/支出）\n- budgets: 予算\n- recurring_transactions: 定期取引\n\n### 設計判断\n1. **金額**: DECIMAL(12,2) — 浮動小数点は使わない\n2. **通貨**: 今はJPYのみ。将来の多通貨対応を見据えてcurrencyカラムは入れておく\n3. **カテゴリ**: ユーザーカスタムを許可。デフォルトカテゴリはseedで投入\n4. **取引日**: DATE型。時刻は不要と判断\n5. **ソフトデリート**: deleted_at方式。物理削除はバッチで',
 CURRENT_DATE - 48,
 'dd100006-0000-0000-0000-000000000000', 'dd020001-0000-0000-0000-000000000000', 'MVP完成',
 'dd000002-0000-0000-0000-000000000000', '個人開発アプリリリース', '#10B981',
 CURRENT_DATE - 48, CURRENT_DATE - 48),

('dd500010-0000-0000-0000-000000000000', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'learning',
 'AWSコスト最適化まとめ',
 E'# AWSコスト最適化まとめ\n\n## 模擬試験の弱点分野を集中対策\n\n### リザーブドインスタンス vs Savings Plans\n| 項目 | RI | Savings Plans |\n|------|-----|---------------|\n| 柔軟性 | 低い（インスタンスタイプ固定） | 高い（ファミリー/リージョン跨ぎ） |\n| 割引率 | 最大72% | 最大66% |\n| 推奨場面 | 安定したワークロード | 変動するワークロード |\n\n### Spot Instances\n- 最大90%割引\n- 中断あり → ステートレスなワークロード向き\n- Spot Fleet / EC2 Auto Scaling Group と組み合わせ\n\n### その他のコスト削減\n- S3 Intelligent-Tiering: アクセスパターン不明な場合\n- Graviton: ARM移行で20-40%のコスト削減\n- Right Sizing: CloudWatch + Compute Optimizer',
 CURRENT_DATE - 6,
 'dd100014-0000-0000-0000-000000000000', 'dd030001-0000-0000-0000-000000000000', '模擬試験80%以上',
 'dd000003-0000-0000-0000-000000000000', 'AWS SAP取得', '#F59E0B',
 CURRENT_DATE - 6, CURRENT_DATE - 6);
