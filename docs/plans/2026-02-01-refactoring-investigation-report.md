# Kensan リファクタリング調査レポート

**調査日**: 2026-02-01
**調査対象**: `src/`, `backend/services/`, `backend/shared/`, `kensan-ai/src/`, `observability/`

---

## Executive Summary

Kensanのアーキテクチャは全体的に健全で、クリーンアーキテクチャの原則（handler → service → repository interface）が一貫して守られている。フロントエンドのデザインシステムも成熟しており、ダークモード対応はほぼ完全。

**最も緊急度の高い問題は「非正規化フィールドの整合性管理の欠如」**である。`goal_name`, `goal_color`, `milestone_name`がtime_blocks/notesに複製されているが、Goals/Milestones更新時の同期メカニズムが存在しない。この問題はGoサービス・AIサービスの両方に影響し、観点2（バックエンド）と観点4（AIデータアクセス）で同時に検出された。AIサービスが`create_time_block`で非正規化フィールドを直接指定できる設計は、整合性破壊リスクをさらに高めている。

---

## 観点4: AI データアクセス（最重要）

### 発見事項

**1. データアクセスマトリクス — アクセス可能なドメイン**

| ドメイン | Read | Create | Update | Delete | 備考 |
|---------|:-----:|:-------:|:-------:|:-------:|------|
| Goals | ✅ | ✅ | ✅ | ✅ | |
| Milestones | ✅ | ✅ | ✅ | ✅ | |
| Tasks | ✅ | ✅ | ✅ | ✅ | |
| TimeBlocks | ✅ | ✅ | ✅ | ✅ | |
| TimeEntries | ✅ | ❌ | ❌ | ❌ | Read only |
| Memos | ✅ | ✅ | ❌ | ❌ | Create only |
| Notes | ✅ | ✅ | ✅ | ❌ | |
| AnalyticsData | ✅ | ❌ | ❌ | ❌ | 集計のみ |
| Documents | ✅ | ✅ | ✅ | ✅ | R2 + DB |

**アクセス不可なドメイン:**
- Users / UserSettings（セキュリティ上の理由 — 適切）
- Tags（フロントエンド主導）
- Routine Tasks（Go APIのみ）
- Running Timers（Go APIのみ）

**2. 非正規化フィールドの直接設定が可能**
- `kensan-ai/src/kensan_ai/tools/db_tools.py:334-336`
```python
goal_name=args.get("goal_name"),
goal_color=args.get("goal_color"),
```
AIが`create_time_block`で`goal_name`, `goal_color`, `milestone_name`を直接指定できる。`goal_id`から自動取得する設計ではないため、Goalsテーブルと不整合な値を挿入可能。

**3. ビジネスロジック重複 — Time Block作成**
- `kensan-ai/src/kensan_ai/tools/db_tools.py:248-340` — AI側でUTC変換・日跨ぎ処理を独自実装
- `kensan-ai/src/kensan_ai/db/queries/time_blocks.py:71-107` — バリデーションなしで直接INSERT
- Goサービス（timeblock-service）にも同等のロジックが存在し、二重管理状態

**4. Task更新時のバリデーション欠如**
- `kensan-ai/src/kensan_ai/tools/db_tools.py:155-197` — `update_task`でステータス遷移ルールなし
- Goサービス側のバリデーション・ビジネスルールがすべてバイパスされる

**5. 検索機能の対応漏れ**
- `kensan-ai/src/kensan_ai/tools/search_tools.py:64-94` — `documents`テーブルのみsemantic/keyword/hybrid searchに対応
- `notes`テーブルにembedding columnがなく、セマンティック検索不可
- `memos`, `time_entries`は検索ツール自体がない

**6. タイムゾーンのハードコード**
- `kensan-ai/src/kensan_ai/tools/db_tools.py:34` — `Asia/Tokyo`がハードコード
- `kensan-ai/src/kensan_ai/tools/analytics_tools.py:15` — 同様
- ユーザーのタイムゾーン設定（`user_settings`）を参照していない

**7. Routine Tasksへのアクセスなし**
- AIが「毎日のルーティンを計画して」等のリクエストに対応不可
- [横断: 観点2関連] routine-serviceのデータがAIから完全に隔離

### 推奨アクション

| 優先度 | アクション | 対象ファイル |
|--------|----------|------------|
| **High** | `create_time_block`から`goal_name`/`goal_color`/`milestone_name`パラメータを削除、`goal_id`から自動取得に変更 | `kensan-ai/src/kensan_ai/tools/db_tools.py`, `kensan-ai/src/kensan_ai/db/queries/time_blocks.py` |
| **High** | `delete_goal`/`delete_task`に配下リソース存在チェックを追加 | `kensan-ai/src/kensan_ai/tools/db_tools.py` |
| **High** | `notes`テーブルにembedding対応、search_toolsをnotes対応に拡張 | 新マイグレーション, `kensan-ai/src/kensan_ai/tools/search_tools.py` |
| **Medium** | タイムゾーンを`user_settings`から動的取得 | `kensan-ai/src/kensan_ai/tools/db_tools.py:34`, `analytics_tools.py:15` |
| **Medium** | Routine Tasksアクセスツール追加 | 新規 `kensan-ai/src/kensan_ai/db/queries/routines.py` |
| **Medium** | Memos向けkeyword searchツール追加 | `kensan-ai/src/kensan_ai/tools/search_tools.py` |

---

## 観点5: OpenTelemetry 実装品質

### 発見事項

**1. メトリクス記録がほぼ未実装（スコア 2/10）**
- `backend/shared/telemetry/telemetry.go` でexporterは初期化済みだが、サービス側でcustom metricsを記録していない
- Python AI側も`kensan-ai/src/kensan_ai/telemetry.py:62-67`でMeterProviderは設定済みだが、実際のメトリクス記録なし
- REDメソッド（Rate, Errors, Duration）のうち、HTTP/DB Durationのみ自動計装で取得。Rate, Errorsは未実装

**2. Service層にカスタムスパンがない**
- 全Goサービスの`service.go`で確認：ビジネスロジック層のスパンが一切なし
- HTTP Handler → pgx (DB) の2層のみで、Service層が可観測性の盲点
- ビジネスロジックのボトルネック特定が困難

**3. リソース属性が最小限**
- `backend/shared/telemetry/telemetry.go:39-42` — `service.name`のみ
```go
res, err := resource.New(ctx,
    resource.WithAttributes(
        semconv.ServiceNameKey.String(cfg.ServiceName),  // これだけ
    ),
)
```
- `service.version`, `deployment.environment`, `service.instance.id`が欠如

**4. Python AI側のセマンティック規約逸脱**
- `kensan-ai/src/kensan_ai/api/routes.py:128-145` — カスタム属性名`agent.*`を使用
- OTel Semantic Conventions for GenAI（`gen_ai.request.model`, `gen_ai.usage.input_tokens`等）に未準拠
- Claude APIトークン使用量のメトリクスなし

**5. コンテキスト伝播は優秀（スコア 9/10）**
- `backend/shared/telemetry/telemetry.go:78-82` — W3C TraceContext + Baggage完全実装
- `backend/shared/bootstrap/bootstrap.go:198` — CORS headerで`traceparent`/`tracestate`暴露
- `backend/shared/middleware/middleware.go:56-61` — ログにtrace_id/span_id自動注入
- `kensan-ai/src/kensan_ai/main.py:65` — Python側も対応済み

**6. SDK初期化・Graceful Shutdownは完璧（スコア 10/10）**
- `backend/shared/bootstrap/bootstrap.go:182-187` — `svc.Close()`で確実にshutdown
- `kensan-ai/src/kensan_ai/main.py:40-44` — FastAPI lifespanで`shutdown_telemetry()`呼び出し

**総合スコア: 6.4/10**（基盤は堅牢だが、メトリクス・スパン粒度に大きなギャップ）

### 推奨アクション

| 優先度 | アクション | 対象ファイル |
|--------|----------|------------|
| **High** | REDメトリクス（HTTP request count, error count, duration histogram）を記録 | `backend/shared/telemetry/telemetry.go`, 各service |
| **High** | Service層にカスタムスパン追加 | 全`backend/services/*/internal/service/service.go` |
| **High** | リソース属性に`service.version`, `deployment.environment`追加 | `backend/shared/telemetry/telemetry.go:39-42` |
| **High** | Python AIでtoken usage metricsを記録 | `kensan-ai/src/kensan_ai/agents/base.py` |
| **Medium** | Python属性名をOTel GenAI Semantic Conventionsに準拠 | `kensan-ai/src/kensan_ai/api/routes.py` |
| **Medium** | HTTPスパン名をchi routerのroute patternで正規化（cardinality explosion防止） | `backend/shared/middleware/otel.go:14-16` |

---

## 観点2: バックエンド サービス境界

### 発見事項

**1. analytics-serviceがtask/timeblockのテーブルに直接クエリ**
- `backend/services/analytics/internal/repository/repository.go:31-100`
- `tasks`, `time_blocks`, `time_entries`, `goals`, `tag_entries`に直接アクセス
- サービス境界を完全に越えている（読み取り専用とはいえ設計上の問題）

**2. 非正規化フィールドの整合性保証が存在しない**

| テーブル | 非正規化フィールド | 更新時の同期 |
|---------|------------------|------------|
| time_blocks | `goal_name`, `goal_color`, `milestone_name`, `task_name`, `tag_ids` | **なし** |
| time_entries | `goal_name`, `goal_color`, `milestone_name`, `task_name`, `tag_ids` | **なし** |
| notes | `goal_name`, `goal_color`, `milestone_name` | **なし** |

- `backend/services/timeblock/internal/model.go:8-43` — 非正規化フィールド定義
- `backend/services/note/internal/model.go:79-146` — 同様
- Goals名変更時に既存レコードが古い名前のまま残り、UIで不整合が表示される

**3. task-serviceの責務肥大化（8エンティティ）**
- `backend/services/task/internal/repository/interface.go:85-97`
- Goals, Milestones, Tasks, Tags, TaskTags, EntityMemos, Todos, TodoCompletions
- 8つのサブインターフェースを1つのRepositoryに結合
- [横断: 観点4関連] AIツールもこの肥大化の影響を受ける

**4. diary-service / record-serviceの残骸**
- `backend/services/diary/`, `backend/services/record/` が存在
- note-serviceに統合済みと推定されるが、ソースが残存
- docker-composeには含まれていない可能性あり（要確認）

**5. サービス間の不一貫なパターン**

| パターン | task-service | note-service | 状況 |
|---------|-------------|-------------|------|
| 非正規化 | なし（IDで参照） | goal_name等を複製 | 不一貫 |
| 並び替え | sort_orderカラム | なし | 不一貫 |
| 削除カスケード | SET NULL | CASCADE | 不一貫 |

**6. クリーンアーキテクチャ準拠状況**
- handler → service → repository interfaceの依存方向: **全サービスで準拠** ✓
- model.goの外部依存: `time` + `shared/types`のみ — **適切** ✓
- ISP準拠: task-serviceのRepository interfaceは8つの小インターフェースで構成 — **準拠** ✓

### 推奨アクション

| 優先度 | アクション | 対象ファイル |
|--------|----------|------------|
| **High** | 非正規化フィールドの同期メカニズム実装（DBトリガーまたはService層ロジック） | 新マイグレーション, timeblock-service, note-service |
| **High** | analytics-serviceのクロスサービステーブルアクセスを整理（集計エンドポイントの追加、またはread replica view） | `backend/services/analytics/internal/repository/repository.go` |
| **Medium** | diary-service/record-serviceの残骸削除 | `backend/services/diary/`, `backend/services/record/` |
| **Medium** | 削除カスケード戦略の統一・文書化 | 全サービスのrepository.go |
| **Low** | task-serviceからTodos/EntityMemosの分離検討 | `backend/services/task/` |

---

## 観点1: フロントエンド デザインシステム

### 発見事項

**1. CSS変数は整備済み、Tailwindクラス経由で実質的に機能**
- `src/index.css` — 35個のCSS変数定義（セマンティックカラー16個、チャート5個、ブランド2個等）
- ダークモード（`.dark`セレクタ）で全変数を再定義済み
- 直接`hsl(var(--*))`形式の使用は9箇所のみだが、Tailwindのsemanticクラス経由で298箇所が間接使用

**2. セマンティックカラー無視は最小限**

| パターン | 件数 | 問題度 |
|---------|------|--------|
| bg-[#hex] hardcode | 1件 | Low（Drawioプレースホルダーのみ） |
| slate/gray直接指定 | 19件 | Medium（shadcn/ui継承+一部hardcode） |
| 意図的semantic色（amber/red/emerald） | 22件 | Low（ステータス表現として適切） |
| inline style（動的色） | 33件 | N/A（Goal color等の動的値、意図的） |

**代表例:**
- `src/components/layout/Sidebar.tsx:37-38` — アクティブ状態で`bg-sky-100`ハードコード。`bg-brand/15`が適切
- `src/components/ui/progress.tsx:19` — `bg-slate-200`。`bg-muted`が適切

**3. Opacity処理は3方式が用途別に使い分けられている**
- `color-mix()`: 動的色の背景（3件、TimeBlockItem等）— 最も標準的
- Hex末尾追加: TagBadgeのみ（2件）— 非標準だが影響小
- Tailwind `/opacity`: 静的色（14件）— 標準的

`src/components/common/TagBadge.tsx:22-25`のHex末尾追加（`${color}20`）を`color-mix()`に統一すると一貫性向上

**4. ダークモード対応はほぼ完全（スコア 9.5/10）**
- 19箇所のdark: variant全てが正しく実装
- 未対応コンポーネントなし

### 推奨アクション

| 優先度 | アクション | 対象ファイル |
|--------|----------|------------|
| **Medium** | Sidebar Active Stateの`bg-sky-100`を`bg-brand/15`に変更 | `src/components/layout/Sidebar.tsx:37-38` |
| **Medium** | Progress barの`bg-slate-200`を`bg-muted`に変更 | `src/components/ui/progress.tsx:19` |
| **Medium** | TagBadgeのHex opacity処理を`color-mix()`に統一 | `src/components/common/TagBadge.tsx:22-25` |
| **Low** | DrawioPlaceholderの`bg-[#f8f9fa]`を`bg-muted/50`に変更 | `src/components/editor/DrawioEditorPlaceholder.tsx:47` |

---

## 観点3: ノートシステム 拡張性

### 発見事項

**1. note_typesのデータ駆動型設計は一貫して実装済み**
- DB: `backend/migrations/028_note_types.sql` — `note_types`テーブルでスラッグ・制約・メタデータスキーマを完全定義
- バックエンド: `backend/services/note/internal/service/service.go:80-96` — `LoadNoteTypes()`でキャッシュロード
- フロントエンド: `src/pages/N01_NoteList.tsx:121-129` — タイプタブを動的生成

**2. 新ノートタイプ追加時の変更ファイル数: 1-2（理想に近い）**

| ファイル | 変更内容 | 必須度 |
|---------|---------|-------|
| 新マイグレーション | `INSERT INTO note_types` | 必須 |
| AI層バリデーション | note_type制約追加 | 推奨 |
| バックエンド | 0ファイル（データ駆動） | 不要 |
| フロントエンド | 0ファイル（データ駆動） | 不要 |

**3. metadata_schemaバリデーション: バックエンド完全、フロントエンド不完全**
- バックエンド: `backend/services/note/internal/service/service.go:347-405` — required, integer min/max, enum values の完全バリデーション
- フロントエンド: `src/components/note/MetadataForm.tsx:42-132` — UIレンダリングのみ、バリデーションロジック未実装
  - enum型: Select UIで実質バリデーション済み ✓
  - integer型: HTML5 min/max属性のみ（JavaScript検証なし）
  - string/date/url型: バリデーションなし ✗

**4. コンテンツタイプ処理はMarkdown/Drawioの2種のみ実装**
- バックエンド: `backend/services/note/internal/model.go:211-268` — 5種のContentType定義（markdown, drawio, image, pdf, code）
- フロントエンド: `src/components/note/NoteEditor.tsx:233-245` — Markdown/Drawioのみ
- image, pdf, codeタイプはバックエンドで定義済みだがフロントエンド未対応
- [横断: 観点4関連] AI層はコンテンツタイプの区別なくplain text取得のみ

### 推奨アクション

| 優先度 | アクション | 対象ファイル |
|--------|----------|------------|
| **Medium** | MetadataFormにバリデーションロジック追加（required, url, date） | `src/components/note/MetadataForm.tsx` |
| **Medium** | NoteEdit画面のisValid()をmetadata schema対応に拡張 | `src/pages/N02_NoteEdit.tsx:219-227` |
| **Low** | コンテンツタイプRendererの拡張（image, pdf対応） | `src/components/note/NoteEditor.tsx` |
| **Low** | AI層でnote_typeバリデーション追加 | `kensan-ai/src/kensan_ai/db/queries/notes.py` |

---

## 横断評価: 設計思想の一貫性

### クリーンアーキテクチャ

**強い点:**
- ✅ 全Goサービスでhandler → service → repository interfaceの一方向依存が一貫
- ✅ model.goが外部パッケージ（DB, HTTP）に依存していない（`time` + `shared/types`のみ）
- ✅ Repository interfaceが小インターフェースに分割されISP準拠（task-service）
- ✅ フロントエンドのComponent → Zustand → API Serviceの責務分離が一貫

**弱い点:**
- ❌ analytics-serviceがサービス境界を越えて他サービスのテーブルに直接クエリ
- ❌ AIサービスがGoサービスのバリデーション・ビジネスロジックを完全にバイパス
- ❌ 非正規化フィールドの同期が設計上保証されていない

### モダナイズと実用のバランス

**適切な点:**
- ✅ フロントエンドのCSS変数 + Tailwind semantic classは過不足なし
- ✅ note_typesのデータ駆動設計は拡張性とシンプルさを両立
- ✅ OTelの基盤（SDK初期化、コンテキスト伝播、graceful shutdown）は堅実

**改善の余地:**
- ⚠️ OTelメトリクスの未実装は「基盤があるのに使っていない」状態 — 少ない労力で大きなリターン
- ⚠️ AI直接DBアクセスはプロトタイピング速度に優れるが、ビジネスロジック重複の技術的負債が蓄積中
- ⚠️ task-serviceの8エンティティは現時点で許容範囲だが、今後の成長で分割が必要になる閾値に近い

---

## 推奨リファクタリング順序

| 順序 | 対象 | 内容 | 先行依存 | 改善効果 |
|------|------|------|----------|----------|
| 1 | 観点2 | 非正規化フィールドの同期メカニズム実装（DBトリガー） | なし | AI整合性の前提が整う。全サービスで恩恵 |
| 2 | 観点4 | `create_time_block`の非正規化フィールド直接指定を廃止、`goal_id`から自動取得に変更 | #1 | AIデータ変更時の整合性保証 |
| 3 | 観点4 | Notes向けembedding対応 + search_tools拡張 | なし | AIの検索能力が全ドメインに拡大 |
| 4 | 観点5 | REDメトリクス記録 + Service層カスタムスパン追加 | なし | 可観測性スコア 6.4→8.0、障害調査能力向上 |
| 5 | 観点5 | リソース属性充実 + GenAI Semantic Conventions準拠 | #4 | ダッシュボードでのサービス識別精度向上 |
| 6 | 観点4 | タイムゾーンハードコード削除 + Routine Tasks対応 | なし | AI機能の完全性向上 |
| 7 | 観点2 | analytics-serviceのクロスサービスアクセス整理 | なし | サービス境界の明確化 |
| 8 | 観点1 | Sidebar/Progress/TagBadgeのセマンティックカラー統一 | なし | デザイントークン一貫性（影響小、労力極小） |
| 9 | 観点3 | MetadataFormバリデーション実装 | なし | フロントエンドのデータ品質向上 |
| 10 | 観点2 | diary/record-service残骸削除 | なし | コードベース整理（労力極小） |
