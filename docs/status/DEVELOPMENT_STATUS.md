# Kensan 開発状況

**最終更新: 2026-02-03**

---

## 概要

Kensanは、エンジニアの自己研鑽を支援する統合プラットフォームです。時間トラッキング、タスク管理、学習記録、AI振り返り機能を提供します。

---

## 技術スタック

### フロントエンド
| 技術 | バージョン | 用途 |
|------|-----------|------|
| React | 18.3 | UIフレームワーク |
| TypeScript | 5.6 | 型安全性 |
| Vite | 6.0 | ビルドツール |
| shadcn/ui | - | UIコンポーネント |
| Tailwind CSS | 4.1 | スタイリング |
| Zustand | 5.0 | 状態管理 |
| React Router | 7.11 | ルーティング |
| Tiptap | 3.x | リッチテキストエディタ |
| react-drawio | - | Drawio編集 |
| Recharts | 3.x | グラフ表示 |
| @dnd-kit | - | ドラッグ&ドロップ |
| date-fns | 4.x | 日付操作 |
| MSW | 2.12 | 開発時モック |

### バックエンド (Go)
| 技術 | バージョン | 用途 |
|------|-----------|------|
| Go | 1.24.0 | サーバーサイド |
| chi | v5 | HTTPルーター |
| PostgreSQL | 16 | データベース（+ pgvector） |
| pgx | v5 | DBドライバ |
| slog + otelslog | Go標準 + v0.14.0 | 構造化ログ（OpenTelemetry連携） |

### AIサービス (Python)
| 技術 | 用途 |
|------|------|
| Python + FastAPI | AI APIサーバー |
| asyncpg | DB直接接続 |
| Claude API / Gemini API | AI推論（`AI_PROVIDER`設定で切替） |
| OpenAI API | テキスト埋め込み |
| pgvector | ベクトル検索 |

### インフラ / Observability
| 技術 | 用途 |
|------|------|
| Docker / Docker Compose | コンテナ化・ローカル開発環境 |
| MinIO | S3互換ファイルストレージ |
| OpenTelemetry Collector | テレメトリ収集 |
| Tempo | 分散トレーシング |
| Loki | ログ集約 |
| Prometheus | メトリクス |
| Grafana | ダッシュボード |

---

## プロジェクト構造

```
kensan-mockup/
├── src/                          # フロントエンド (React/TypeScript)
│   ├── api/                      # APIクライアント層
│   │   ├── config.ts             # 環境変数設定
│   │   ├── client.ts             # HTTPクライアント（JWT認証対応）
│   │   └── services/             # 10個のAPIサービス
│   ├── mocks/                    # MSWモック（オプトイン）
│   ├── components/
│   │   ├── ui/                   # shadcn/ui コンポーネント
│   │   ├── layout/               # レイアウト（Header, Sidebar, ChatPanel）
│   │   ├── common/               # 共通コンポーネント
│   │   ├── daily/                # 日次コンポーネント
│   │   ├── task/                 # タスク管理コンポーネント
│   │   ├── editor/               # エディタ（Markdown, Drawio）
│   │   └── note/                 # ノートコンポーネント
│   ├── pages/                    # 8画面
│   ├── stores/                   # 15個のZustandストア
│   ├── hooks/                    # カスタムフック
│   ├── lib/                      # ユーティリティ（timezone等）
│   └── types/                    # 型定義
├── backend/                      # バックエンド (Go)
│   ├── services/                 # 7つのGoマイクロサービス
│   │   ├── user/                 # 認証・設定 (:8081)
│   │   ├── task/                 # 目標・タスク管理 (:8082)
│   │   ├── timeblock/            # タイムブロック・タイマー (:8084)
│   │   ├── analytics/            # 分析・レポート (:8088)
│   │   ├── memo/                 # クイックメモ (:8090)
│   │   ├── note/                 # 統合ノート (:8091)
│   │   └── routine/              # 定期タスク（docker-compose未登録）
│   ├── shared/                   # 共有パッケージ（auth, bootstrap, config, database, middleware, errors, telemetry, types）
│   ├── migrations/               # DBマイグレーション（34ファイル）
│   └── Makefile
├── kensan-ai/                    # AIサービス (Python/FastAPI)
│   └── src/kensan_ai/
│       ├── agents/               # AgentRunner
│       ├── api/                  # FastAPIエンドポイント
│       ├── tools/                # Direct Tools（39個）
│       ├── context/              # コンテキスト管理
│       ├── extraction/           # ファクト抽出
│       ├── embeddings/           # ベクトル埋め込み
│       └── db/                   # asyncpg DB接続
├── docker-compose.yml            # 全サービス統合
└── Makefile                      # 開発コマンド
```

---

## 画面一覧

| ID | 画面名 | パス | 説明 |
|----|--------|------|------|
| - | ログイン | `/login` | メール・パスワード認証 |
| S01 | 設定 | `/settings` | ユーザー設定（初期設定も兼用） |
| - | デイリー（ホーム） | `/` | 朝の計画・夜の振り返り・タイムライン |
| T01 | タスク管理 | `/tasks` | 目標・マイルストーン・タスク・ガントチャート |
| N01 | ノート一覧 | `/notes` | 日記・学習記録の一覧・検索 |
| N02 | ノート編集 | `/notes/:id` | Markdown/Drawioエディタ |
| A01 | 分析レポート | `/analytics` | 時間分析・週次/月次サマリー |
| O01 | インタラクション探索 | `/interactions` | AI対話履歴の探索 |

---

## バックエンドサービス一覧

### Goマイクロサービス

| サービス | ポート | 状態 | 概要 |
|----------|--------|------|------|
| user-service | 8081 | ✅ | ユーザー認証・設定・AI同意管理 |
| task-service | 8082 | ✅ | 目標・マイルストーン・タスク・タグ・Todo・EntityMemo |
| timeblock-service | 8084 | ✅ | タイムブロック・時間記録・タイマー |
| analytics-service | 8088 | ✅ | 週次/月次サマリー・トレンド・日別学習時間 |
| memo-service | 8090 | ✅ | クイックメモ |
| note-service | 8091 | ✅ | 統合ノート・NoteContent・ファイルストレージ |

> **Note**: `routine/`ディレクトリは存在するがdocker-compose.ymlには未登録。定期タスク機能はtask-serviceのTodo（frequency）で代替。

### Python AIサービス

| サービス | ポート | 状態 | 概要 |
|----------|--------|------|------|
| kensan-ai | 8089 | ✅ | AIエージェント（ストリーミング対話）、Direct Tools（39個）、ファクト抽出、ベクトル検索、Web検索 |

### インフラサービス

| サービス | ポート | 概要 |
|----------|--------|------|
| PostgreSQL | 5432 | データベース（pgvector対応） |
| MinIO | 9000/9001 | S3互換ファイルストレージ |
| OTEL Collector | 4317/4318 | テレメトリ収集 |
| Tempo | 3200 | 分散トレーシング |
| Loki | 3100 | ログ集約 |
| Prometheus | 9090 | メトリクス |
| Grafana | 3000 | 可視化ダッシュボード |

---

## フロントエンド詳細

### Zustandストア（15個）

| ストア | 役割 |
|--------|------|
| `useAuthStore` | JWT認証・ログイン/ログアウト |
| `useSettingsStore` | タイムゾーン・テーマ設定 |
| `useGoalStore` | 目標CRUD |
| `useMilestoneStore` | マイルストーンCRUD |
| `useTagStore` | タグCRUD |
| `useTaskStore` | タスクCRUD |
| `useTaskManagerStore` | 上記4ストアの統合フック |
| `useTimeBlockStore` | タイムブロック・時間記録 |
| `useTimerStore` | 作業タイマー |
| `useNoteStore` | ノート管理 |
| `useNoteTypeStore` | ノートタイプ |
| `useMemoStore` | メモ |
| `useAnalyticsStore` | 分析データ |
| `useChatStore` | AIチャット |
| `createCrudStore` | ストアファクトリ |

### APIサービス（10個）

`src/api/services/`: auth, user, tasks, timeblocks, timer, analytics, memos, notes, agent, observability

---

## 開発コマンド

### 起動
```bash
make up                   # 全サービス起動
npm run dev               # フロントエンドのみ（バックエンド接続）
VITE_ENABLE_MSW=true npm run dev  # MSWモック有効
make dev-backend          # バックエンドのみ
```

### テスト・ビルド
```bash
npm run build             # TypeScript + Viteビルド
npm run lint              # ESLint
cd backend && make test   # バックエンドユニットテスト
cd backend && make lint   # golangci-lint
```

### その他
```bash
make down      # 全停止
make logs      # ログ表示
make health    # ヘルスチェック
make clean     # 全削除（ボリューム含む）
```

---

## テストデータ

| 項目 | 値 |
|------|-----|
| Email | `test@kensan.dev` |
| Password | `password123` |
| Name | `Yu` |

---

## 参照ドキュメント

| ドキュメント | パス |
|-------------|------|
| API仕様書 | `docs/spec/api_specification.md` |
| 企画書 | `docs/spec/kensan_proposal_v0.5.md` |
| アーキテクチャガイド | `docs/guides/architecture_guide_for_beginners.md` |
| ADR | `docs/adr/` |
| Backend ARCHITECTURE.md | `backend/ARCHITECTURE.md` |
| Frontend ARCHITECTURE.md | `src/ARCHITECTURE.md` |
| AI Service ARCHITECTURE.md | `kensan-ai/ARCHITECTURE.md` |
