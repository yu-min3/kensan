# リファクタリング実装レポート

**実施日**: 2026-02-01
**対象**: 調査レポート `2026-02-01-refactoring-investigation-report.md` の推奨アクション順序2〜10
**順序1（DBトリガー）は実施済みのため対象外**

---

## 実装サマリ

全9項目を実装し、フロントエンド（`npm run build`）・バックエンド（`go build ./...`）ともにビルド通過を確認。
DBマイグレーション3件（033〜035）を稼働中のPostgreSQLコンテナに適用済み。

| 順序 | 内容 | ステータス | 備考 |
|------|------|-----------|------|
| 1 | 非正規化フィールド同期トリガー | **実施済み（着手前）** | migration 033 |
| 2 | `create_time_block`非正規化フィールド自動取得 | **完了** | git working treeで実装済みを確認 |
| 3 | Notes embedding + search_tools拡張 | **完了** | migration 034 + embedding生成パイプライン追加 |
| 4 | REDメトリクス + Service層スパンヘルパー | **完了** | metrics.go, tracing.go 新規作成 |
| 5 | リソース属性 + GenAI Semantic Conventions | **完了** | Go/Python両方 |
| 6 | タイムゾーン動的取得 + Routine Tasks対応 | **完了** | user_settings.py, routines.py 新規作成 |
| 7 | analytics-serviceクロスサービスアクセス整理 | **完了** | migration 035（読み取り専用ビュー） |
| 8 | セマンティックカラー統一 | **完了** | 4コンポーネント修正 |
| 9 | MetadataFormバリデーション | **完了** | validateMetadata関数追加 |
| 10 | diary/record-service残骸削除 | **完了** | git rm + ディレクトリ削除 |

---

## 詳細

### 順序2: `create_time_block` 非正規化フィールド自動取得

**変更ファイル:**
- `kensan-ai/src/kensan_ai/db/queries/time_blocks.py`
- `kensan-ai/src/kensan_ai/tools/db_tools.py`

**内容:**
`create_time_block`ツールから`goal_name`/`goal_color`/`milestone_name`の直接指定パラメータを廃止。`goal_id`/`milestone_id`からDB上の正規データを自動取得する方式に変更。これにより、AIが不整合な非正規化データを挿入するリスクを排除。

---

### 順序3: Notes embedding + search_tools拡張

**変更ファイル:**
- `backend/migrations/034_notes_embedding.sql`（新規）
- `kensan-ai/src/kensan_ai/tools/search_tools.py`
- `kensan-ai/src/kensan_ai/db/queries/notes.py`
- `kensan-ai/src/kensan_ai/db/connection.py`

**マイグレーション内容:**
```sql
ALTER TABLE notes ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_notes_embedding
    ON notes USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_notes_fts
    ON notes USING gin (to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(content, '')));
```

**追加ツール:**
| ツール名 | 機能 |
|---------|------|
| `search_notes` | ノートのキーワード全文検索（title + content、`to_tsvector`使用） |
| `semantic_search_notes` | ノートのベクトル類似度検索（pgvector `<=>` 演算子） |
| `backfill_note_embeddings` | embedding未生成ノートの一括ベクトル生成 |

**Embedding生成パイプライン:**
- `create_note()` / `update_note()` 実行時に `asyncio.create_task()` でfire-and-forget方式でembeddingを自動生成
- OpenAI `text-embedding-3-small`（1536次元）を使用
- 失敗してもノート操作自体は成功する（fail-safe）
- Go（UI）経由で作成されたノートは `backfill_note_embeddings` ツールでバッチ生成

**pgvector型登録:**
`connection.py`のpool初期化に`pgvector.asyncpg.register_vector`を追加。これにより既存の`semantic_search`/`keyword_search`/`hybrid_search`ツールにあった潜在的な型変換バグも解消。

---

### 順序4: REDメトリクス + Service層スパンヘルパー

**変更ファイル:**
- `backend/shared/middleware/metrics.go`（新規）
- `backend/shared/telemetry/tracing.go`（新規）
- `backend/shared/bootstrap/bootstrap.go`

**REDメトリクス（metrics.go）:**
| メトリクス名 | 種別 | 説明 |
|-------------|------|------|
| `http.server.request.total` | Counter | HTTPリクエスト総数 |
| `http.server.request.errors` | Counter | 5xxエラー数 |
| `http.server.request.duration` | Histogram | レスポンス時間（秒） |

属性: `http.method`, `http.route`, `http.status_code`

**Service層スパンヘルパー（tracing.go）:**
```go
func ServiceTracer(serviceName string) trace.Tracer
func StartSpan(ctx context.Context, tracer trace.Tracer, operation string, attrs ...attribute.KeyValue) (context.Context, func(error))
```
各サービスのservice層で `defer endSpan(err)` パターンでスパンを追加可能。

**bootstrap.go変更:**
ミドルウェアチェーンに `middleware.Metrics` を追加。telemetry configに `Environment` フィールドを渡すよう変更。

---

### 順序5: リソース属性 + GenAI Semantic Conventions

**変更ファイル:**
- `backend/shared/telemetry/telemetry.go`
- `kensan-ai/src/kensan_ai/telemetry.py`
- `kensan-ai/src/kensan_ai/agents/base.py`
- `kensan-ai/src/kensan_ai/api/routes.py`

**Go側（telemetry.go）:**
`Config`構造体に`ServiceVersion`/`Environment`フィールドを追加。リソース属性に`service.version`と`deployment.environment`を追加。

**Python側（telemetry.py）:**
Resourceに`service.version: "dev"`と`deployment.environment: "development"`を追加。

**GenAI Semantic Conventions準拠（base.py, routes.py）:**

| 旧属性名 | 新属性名（GenAI SemConv） |
|---------|------------------------|
| `agent.user_id` | `gen_ai.user.id` |
| `agent.conversation_id` | `gen_ai.conversation.id` |
| `agent.model` | `gen_ai.request.model` |
| `agent.turn.input_tokens` | `gen_ai.usage.input_tokens` |
| `agent.turn.output_tokens` | `gen_ai.usage.output_tokens` |
| `agent.turn.stop_reason` | `gen_ai.response.finish_reason` |
| `agent.situation` | `gen_ai.request.situation` |
| `agent.context_name` | `gen_ai.request.context_name` |

---

### 順序6: タイムゾーン動的取得 + Routine Tasks対応

**変更ファイル:**
- `kensan-ai/src/kensan_ai/db/queries/user_settings.py`（新規）
- `kensan-ai/src/kensan_ai/db/queries/routines.py`（新規）
- `kensan-ai/src/kensan_ai/tools/db_tools.py`
- `kensan-ai/src/kensan_ai/tools/analytics_tools.py`

**タイムゾーン動的取得:**
`_DEFAULT_TZ = ZoneInfo("Asia/Tokyo")` のハードコードを廃止。`user_settings`テーブルからユーザーのタイムゾーン設定を動的に取得する`get_user_timezone()`関数を新設。フォールバックは`Asia/Tokyo`。

全5ツール（`get_time_blocks`, `create_time_block`, `update_time_block`, `get_time_entries` + analytics系2件）で`await get_user_timezone(user_id)`を呼び出すよう変更。

**Routine Tasks対応:**
- `get_routine_tasks()`: `tasks`テーブルから`frequency IS NOT NULL`のルーティンタスクを取得。`days_of_week`による曜日フィルタ対応。
- `get_routine_completions()`: 指定日のルーティン完了状況を取得。
- `get_routine_tasks` AIツールを`ALL_DB_TOOLS`に追加。

---

### 順序7: analytics-serviceクロスサービスアクセス整理

**変更ファイル:**
- `backend/migrations/035_analytics_views.sql`（新規）
- `backend/services/analytics/internal/repository/repository.go`

**方針:**
単一DBアーキテクチャを維持しつつ、サービス境界を明示化するためにPostgreSQLの読み取り専用ビューを導入。将来的なDB分離やAPI経由アクセスへの移行パスを確保。

**ビュー定義:**
| ビュー名 | ソーステーブル | 所有サービス |
|---------|-------------|------------|
| `analytics_time_blocks` | `time_blocks` | timeblock-service |
| `analytics_time_entries` | `time_entries` | timeblock-service |
| `analytics_tasks` | `tasks` | task-service |
| `analytics_goals` | `goals` | task-service |

**注意:** `goals`テーブルには`is_archived`カラムが存在せず`status`カラム（active/completed/archived）であったため、ビュー定義を`(status = 'archived') AS is_archived`に修正。repository.goの`WHERE is_archived = false`はビュー経由で正しく動作する。

**repository.go変更:**
全クエリのテーブル参照を`analytics_*`ビューに変更。`goals`/`milestones`/`tags`への直接JOINは非正規化フィールドのフォールバック用として残存。

---

### 順序8: セマンティックカラー統一

**変更ファイル:**

| ファイル | 変更内容 |
|---------|---------|
| `src/components/layout/Sidebar.tsx` | Active state: `bg-sky-100/dark:bg-sky-900` → `bg-brand/15 dark:bg-brand/20`、indicator `bg-sky-300` → `bg-brand/60` |
| `src/components/ui/progress.tsx` | Track: `bg-slate-200 dark:bg-slate-700` → `bg-muted` |
| `src/components/common/TagBadge.tsx` | Opacity: `${color}20`/`${color}40` → `color-mix(in srgb, ${color} 12%, transparent)`/`color-mix(in srgb, ${color} 25%, transparent)` |
| `src/components/editor/DrawioEditorPlaceholder.tsx` | Canvas: `bg-[#f8f9fa] dark:bg-slate-900` → `bg-muted/50` |

---

### 順序9: MetadataFormバリデーション

**変更ファイル:**
- `src/components/note/MetadataForm.tsx`
- `src/pages/N02_NoteEdit.tsx`

**追加したバリデーションルール:**
| フィールドタイプ | バリデーション |
|---------------|-------------|
| required | 空文字チェック |
| integer | 整数チェック + min/max範囲チェック |
| float | 数値チェック + min/max範囲チェック |
| url | `new URL()` による構文検証 |
| date | `YYYY-MM-DD` 正規表現マッチ |
| enum | 許可値リストとの照合 |

`validateMetadata(metadata, schema)` → `Record<string, string>`（エラーマップ）としてエクスポート。
`N02_NoteEdit.tsx`の`isValid()`をmetadata schemaバリデーション対応に拡張。

---

### 順序10: diary/record-service残骸削除

**削除ファイル（18ファイル）:**
```
backend/services/diary/  (Dockerfile, Makefile, cmd/main.go, internal/*)
backend/services/record/ (Dockerfile, Makefile, cmd/main.go, internal/*)
```

note-serviceに統合済みであり、docker-compose.ymlにも含まれていなかった。`git rm -r`で削除後、空ディレクトリおよび残存していたuntracked ARCHITECTURE.mdも削除。

---

## マイグレーション適用結果

```
kensan-postgres (PostgreSQL 16, pgvector 0.8.1)
```

| マイグレーション | 内容 | 適用結果 |
|---------------|------|---------|
| 033 | デノーマライズフィールド同期トリガー3件 | CREATE FUNCTION x3, CREATE TRIGGER x3 |
| 034 | notes.embedding vector(1536) + HNSW/GINインデックス | ALTER TABLE, CREATE INDEX x2 |
| 035 | analytics読み取り専用ビュー4件 | CREATE VIEW x4（`analytics_goals`は`status`→`is_archived`変換を含む） |

---

## ARCHITECTURE.md更新

以下の3ドキュメントを変更内容に合わせて更新済み:

| ドキュメント | 更新内容 |
|------------|---------|
| `backend/ARCHITECTURE.md` | REDメトリクスミドルウェア、tracing.goヘルパー、リソース属性、analyticsビュー |
| `kensan-ai/ARCHITECTURE.md` | 動的タイムゾーン、Routine Tasksツール、search_notes/semantic_search_notes/backfill_note_embeddings、GenAI SemConv |
| `src/ARCHITECTURE.md` | セマンティックカラー統一、MetadataFormバリデーション |

---

## 実装時に検出・修正した問題

| 問題 | 修正内容 |
|------|---------|
| `metrics.go`に未使用の`statusText`関数と`strconv`インポート | 関数・インポートを削除 |
| `go.mod`のotel/metric依存がindirectのまま | `go mod tidy`で解決 |
| migration 035の`is_archived`カラム不在 | `goals.status`カラムから`(status = 'archived') AS is_archived`に変換 |
| asyncpgにpgvector型が未登録（既存search_toolsの潜在バグ） | `connection.py`のpool initで`register_vector`を登録 |
| `diary/`/`record/`ディレクトリにuntracked ARCHITECTURE.mdが残存 | ファイル削除後、空ディレクトリも削除 |

---

## 残存する設計上の制約

1. **Go（UI）経由のノート作成ではembeddingが即座に生成されない** — AIの`backfill_note_embeddings`ツールで後からバッチ生成する運用。将来的にはGo側からのwebhookまたはPostgreSQL LISTEN/NOTIFYでリアルタイム化が望ましい。

2. **Service層カスタムスパンはヘルパーのみ提供** — `tracing.go`の`StartSpan()`を各サービスのservice.goで呼び出す作業は個別に実施が必要。

3. **task-serviceの責務肥大化（8エンティティ）** — 今回のスコープ外。成長に応じてTodos/EntityMemosの分離を検討。
