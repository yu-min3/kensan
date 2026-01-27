# Kensan システムアーキテクチャ入門ガイド

このドキュメントでは、Kensanサービスの仕組みを図を使ってわかりやすく説明します。

**最終更新: 2026-01-27**

---

## 目次

1. [Kensanとは？](#1-kensanとは)
2. [システム全体像](#2-システム全体像)
3. [フロントエンドの仕組み](#3-フロントエンドの仕組み)
4. [バックエンドの仕組み](#4-バックエンドの仕組み)
5. [AIサービス（kensan-ai）の仕組み](#5-aiサービスkensan-aiの仕組み)
6. [データの流れ](#6-データの流れ)
7. [データベース構造](#7-データベース構造)
8. [目標・タスク管理の階層](#8-目標タスク管理の階層)
9. [開発モードと本番モードの違い](#9-開発モードと本番モードの違い)

---

## 1. Kensanとは？

Kensanは、個人の生産性を向上させるためのアプリケーションです。

**主な機能:**
- 目標・マイルストーン・タスクの階層管理
- 時間管理（タイムブロック計画 & 実績記録）
- タイマー機能（作業時間の計測）
- ノート機能（日記・学習記録を統合管理）
- 定期タスク管理（日次・週次・月次）
- AIによる週次レビュー

---

## 2. システム全体像

Kensanは「フロントエンド」と「バックエンド」の2つの部分で構成されています。

```mermaid
graph TB
    subgraph "ユーザー"
        U[("👤 ユーザー")]
    end

    subgraph "フロントエンド（ブラウザで動く）"
        FE["📱 React アプリ<br/>localhost:5173"]
    end

    subgraph "バックエンド（サーバーで動く）"
        BE1["👤 user-service<br/>:8081"]
        BE2["📋 task-service<br/>:8082"]
        BE4["⏰ timeblock-service<br/>:8084"]
        BE8["📊 analytics-service<br/>:8088"]
        BE10["📌 memo-service<br/>:8090"]
        BE11["📓 note-service<br/>:8091"]
    end

    subgraph "AIサービス（Python）"
        AI_SVC["🤖 kensan-ai<br/>:8089"]
    end

    subgraph "データベース"
        DB[("🗄️ PostgreSQL 16<br/>+ pgvector<br/>:5432")]
    end

    subgraph "外部サービス"
        AI["🧠 Claude API"]
    end

    U --> FE
    FE <--> BE1
    FE <--> BE2
    FE <--> BE4
    FE <--> BE5
    FE <--> BE8
    FE <--> BE10
    FE <--> BE11
    FE <--> AI_SVC

    BE1 --> DB
    BE2 --> DB
    BE4 --> DB
    BE5 --> DB
    BE6 --> DB
    BE7 --> DB
    BE8 --> DB
    BE10 --> DB
    BE11 --> DB

    AI_SVC -->|"Direct Tools<br/>(asyncpg)"| DB
    AI_SVC -->|"週次レビュー生成"| AI
```

### ポイント解説

| 用語 | 説明 |
|------|------|
| **フロントエンド** | ユーザーが直接触る画面部分。ブラウザで動作します |
| **バックエンド** | データの保存・処理を担当。Goで書かれた9つのマイクロサービス |
| **kensan-ai** | AI機能を担当するPythonサービス（ポート8089）。**DBに直接接続**してデータ取得し、Claude APIで週次レビューを生成。バックエンドサービスは経由しない |
| **PostgreSQL** | すべてのデータを保存するデータベース。ベクトル検索にも対応 |

---

## 3. フロントエンドの仕組み

フロントエンドは、ユーザーが見る画面を担当します。

### 3.1 ページ一覧

現在、Kensanには10個のページがあります：

```mermaid
graph LR
    subgraph "認証"
        Login["🔐 LoginPage<br/>ログイン/登録"]
    end

    subgraph "設定"
        S01["⚙️ S01_Settings<br/>初期設定"]
    end

    subgraph "日常（ホーム）"
        Daily["📅 DailyPage<br/>朝/夜の計画・振り返り<br/>（ホームページ）"]
    end

    subgraph "タスク管理"
        T01["📋 T01_TaskManagement<br/>目標・タスク管理<br/>（定期タスクはfrequencyで対応）"]
    end

    subgraph "記録"
        N01["📚 N01_NoteList<br/>ノート一覧"]
        N02["✏️ N02_NoteEdit<br/>ノート編集"]
    end

    subgraph "分析"
        A01["📊 A01_AnalyticsReport<br/>週次レポート"]
        A02["🤖 A02_AIReview<br/>AI振り返り"]
    end
```

### 3.2 ページの命名規則

ページ名の先頭文字には意味があります：

| 文字 | 意味 | 例 |
|------|------|-----|
| **S** | Settings（設定） | S01_Settings |
| **D** | Daily（日常） | DailyPage（ホームページ） |
| **T** | Task（タスク） | T01_TaskManagement（定期タスクはfrequencyで対応） |
| **N** | Note（ノート） | N01_NoteList, N02_NoteEdit |
| **A** | Analytics/AI（分析） | A01_AnalyticsReport（期間選択対応）, A02_AIReview |

> **変更点**: ダッシュボードはDailyPageに統合され、分析ページに期間選択（今日/今週/今月/カスタム）と学習記録ウィジェットが追加されました。

### 3.3 フロントエンドの構成

```mermaid
graph TB
    subgraph "src/ ディレクトリ構造"
        subgraph "pages/ - 画面"
            P["10個のページコンポーネント"]
        end

        subgraph "components/ - 部品"
            UI["ui/ - 基本部品<br/>（Button, Dialog等 18個）"]
            Layout["layout/ - レイアウト<br/>（Header, Sidebar）"]
            Common["common/ - 共通部品<br/>（TaskCard, TimerWidget, PageMemo等 13個）"]
            Daily["daily/ - 日次部品<br/>（DailySummary, TaskListWidget等 11個）"]
            Task["task/ - タスク部品<br/>（ダイアログ, GanttChart等 6個）"]
            Editor["editor/ - エディタ部品<br/>（Markdown, Drawio 4個）"]
            Note["note/ - ノート部品"]
        end

        subgraph "stores/ - 状態管理"
            ST["14個のZustandストア"]
        end

        subgraph "api/ - API連携"
            API["12個のAPIサービス"]
        end
    end

    P --> Common
    P --> ST
    ST --> API
```

### 3.4 コンポーネント階層

```
components/
├── ui/                 # shadcn/ui（18個）
│   ├── button.tsx      # ボタン
│   ├── dialog.tsx      # モーダル
│   ├── input.tsx       # 入力欄
│   └── ...
├── layout/             # レイアウト（3個）
│   ├── Header.tsx      # ヘッダー
│   ├── Sidebar.tsx     # サイドバー
│   └── Layout.tsx      # 全体レイアウト
├── common/             # ドメイン共通（14個）
│   ├── TaskCard.tsx    # タスクカード
│   ├── TimerWidget.tsx # タイマー
│   ├── GoalBadge.tsx   # 目標バッジ
│   ├── PageMemo.tsx    # ページ固有メモ
│   ├── TimeBlockTimeline.tsx  # タイムライン（コンテナ）
│   ├── timeline/       # タイムライン部品（SRP分割）
│   │   ├── TimeBlockTimelineGrid.tsx  # グリッド描画
│   │   ├── TimeBlockItem.tsx          # 個別ブロック
│   │   └── useTimeBlockDragResize.ts  # ドラッグ&リサイズ
│   └── ...
├── daily/              # 日次
│   ├── DailySummary.tsx    # 日次サマリー
│   ├── TimeBlockSection.tsx # タイムブロック管理
│   └── TaskListWidget.tsx  # タスクリスト（カード表示）
├── task/               # タスク（6個）
│   ├── GoalDialog.tsx
│   ├── MilestoneDialog.tsx
│   ├── TaskDialog.tsx
│   ├── TagDialog.tsx
│   ├── GanttChartWidget.tsx # ガントチャート
│   └── RecurringTaskWidget.tsx
├── editor/             # エディタ（4個）
│   ├── MarkdownEditor.tsx
│   └── DrawioEditor.tsx
└── note/               # ノート（1個）
    └── NoteEditor.tsx
```

### 3.5 Zustandストアとは？

**Zustand**は、アプリ全体でデータを共有するための仕組みです。

```mermaid
graph TB
    subgraph "12個のZustandストア"
        Auth["useAuthStore<br/>認証状態"]
        Settings["useSettingsStore<br/>ユーザー設定"]

        subgraph "タスク管理（ドメイン分割）"
            Goal["useGoalStore<br/>目標"]
            Milestone["useMilestoneStore<br/>マイルストーン"]
            Tag["useTagStore<br/>タグ"]
            Task["useTaskStore<br/>タスク"]
            TaskManager["useTaskManagerStore<br/>統合フック"]
        end

        TimeBlock["useTimeBlockStore<br/>タイムブロック"]
        Timer["useTimerStore<br/>タイマー"]
        Note["useNoteStore<br/>ノート（日記・学習記録）"]
        Memo["useMemoStore<br/>メモ"]
        Analytics["useAnalyticsStore<br/>分析データ"]
    end

    TaskManager -->|"統合"| Goal
    TaskManager -->|"統合"| Milestone
    TaskManager -->|"統合"| Tag
    TaskManager -->|"統合"| Task
```

**主要ストアの役割:**

| ストア | 役割 | 主な機能 |
|--------|------|---------|
| `useAuthStore` | 認証 | ログイン、ログアウト、トークン管理 |
| `useSettingsStore` | 設定 | タイムゾーン、テーマ、ユーザー名 |
| `useGoalStore` | 目標 | 目標のCRUD（ISP分割） |
| `useMilestoneStore` | マイルストーン | マイルストーンのCRUD（ISP分割） |
| `useTagStore` | タグ | タグのCRUD（ISP分割） |
| `useTaskStore` | タスク | タスクのCRUD |
| `useTaskManagerStore` | 統合 | 上記4ストアを統合した便利フック |
| `useTimeBlockStore` | 時間 | タイムブロック、時間記録（timezone対応） |
| `useTimerStore` | タイマー | 作業タイマーの開始・停止 |
| `useNoteStore` | ノート | 日記・学習記録の統合管理 |

> **リファクタリング (2026-01)**: `useTaskStore`は以前、目標・マイルストーン・タグ・タスクを全て管理していましたが、ISP（インターフェース分離原則）に従い、ドメインごとに分割されました。後方互換性のため`useTaskManagerStore`が統合フックとして提供されています。

### 3.6 主要コンポーネントの特徴

#### PageMemo（ページ固有メモ）
各ページに配置できる常時表示メモ。localStorageに自動保存され、ページごとに独立したメモを管理できます。

```typescript
<PageMemo
  pageId="daily"
  title="今日のメモ"
  placeholder="今日の予定、気づき..."
/>
```

#### TaskListWidget（タスクリスト）
カード形式でタスクを表示。マイルストーンの期限に応じた緊急度インジケーター付き：
- 🔴 危険（3日以内）
- 🟡 注意（7日以内）
- 🟢 余裕あり
- ⚪ 期限なし

#### TimeBlockTimeline（タイムライン）
時間ブロックを視覚的に表示。ズームコントロール機能付き：
- `[−]` / `[+]` ボタンで拡大縮小
- パーセント表示クリックで100%にリセット
- Ctrl+ホイールでも操作可能

---

## 4. バックエンドの仕組み

バックエンドは9つの**Goマイクロサービス**で構成されています。

### 4.1 マイクロサービス一覧

```mermaid
graph TB
    subgraph "バックエンドサービス群"
        subgraph "認証・ユーザー"
            US["👤 user-service<br/>ポート: 8081<br/>・ログイン/登録<br/>・ユーザー設定<br/>・AI同意管理"]
        end

        subgraph "タスク管理"
            TS["📋 task-service<br/>ポート: 8082<br/>・目標管理<br/>・マイルストーン<br/>・タスク・タグ<br/>・定期タスク（frequency）"]
            TBS["⏰ timeblock-service<br/>ポート: 8084<br/>・タイムブロック<br/>・時間記録<br/>・タイマー"]
        end

        subgraph "記録系"
            MS["📌 memo-service<br/>ポート: 8090<br/>・クイックメモ"]
            NS["📓 note-service<br/>ポート: 8091<br/>・統合ノート<br/>（日記・学習記録）"]
        end

        subgraph "分析"
            AS["📊 analytics-service<br/>ポート: 8088<br/>・週次サマリー<br/>・月次レポート<br/>・トレンド分析"]
        end
    end
```

### 4.2 各サービスの主要エンドポイント

#### user-service (8081)
| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/auth/register` | ユーザー登録 |
| POST | `/auth/login` | ログイン |
| GET | `/users/me` | 自分の情報取得 |
| GET/PUT | `/users/me/settings` | 設定の取得・更新 |

#### task-service (8082)
| メソッド | パス | 説明 |
|---------|------|------|
| GET/POST | `/goals` | 目標一覧・作成 |
| GET/POST | `/milestones` | マイルストーン一覧・作成 |
| GET/POST | `/tasks` | タスク一覧・作成 |
| GET/POST | `/tags` | タグ一覧・作成 |
| PATCH | `/tasks/{id}/complete` | タスク完了トグル |

#### timeblock-service (8084)
| メソッド | パス | 説明 |
|---------|------|------|
| GET/POST | `/timeblocks` | 計画タイムブロック |
| GET/POST | `/time-entries` | 実績時間記録 |
| GET | `/timer/current` | 実行中タイマー |
| POST | `/timer/start` | タイマー開始 |
| POST | `/timer/stop` | タイマー停止 |

#### note-service (8091) - 新規追加
| メソッド | パス | 説明 |
|---------|------|------|
| GET/POST | `/notes` | ノート一覧・作成 |
| GET | `/notes/search` | ノート検索 |
| POST | `/notes/{id}/archive` | アーカイブ |

### 4.3 各サービスの内部構造

すべてのサービスは同じ構造（レイヤードアーキテクチャ）で作られています：

```mermaid
graph TB
    subgraph "サービス内部構造（例: task-service）"
        H["🌐 Handler（ハンドラー）<br/>HTTPリクエストを受け取る<br/>internal/handler/handler.go"]
        S["⚙️ Service（サービス）<br/>ビジネスロジック<br/>internal/service/service.go"]
        R["💾 Repository（リポジトリ）<br/>データベース操作<br/>internal/repository/repository.go"]
        DB[("🗄️ PostgreSQL")]
    end

    H -->|"リクエスト処理"| S
    S -->|"データ操作依頼"| R
    R -->|"SQLクエリ"| DB
```

### 4.4 共有パッケージ

`backend/shared/` には、全サービスで共通利用するコードがあります：

| パッケージ | 役割 | 主なファイル |
|-----------|------|-------------|
| `auth` | JWT認証 | `jwt.go` - トークン生成・検証 |
| `config` | 設定読み込み | `config.go` - 環境変数から設定 |
| `database` | DB接続 | `postgres.go` - pgxpoolでコネクション管理 |
| `errors` | エラー定義 | `errors.go` - 共通エラー型、エンティティ別ヘルパー |
| `middleware` | HTTPミドルウェア | `middleware.go` - 認証、ログ、リクエストID |
| `logging` | ログ出力 | `setup.go` - zerolog設定 |

> **errorsパッケージ**: `errors.TaskNotFound()`, `errors.Required("field")` など、全サービスで統一されたエラーハンドリングを提供します。

---

## 5. AIサービス（kensan-ai）の仕組み

kensan-aiは、Pythonで書かれたAI機能専用のサービスです。

### 5.1 アーキテクチャ概要

```mermaid
graph TB
    subgraph "kensan-ai の仕組み"
        FE["📱 フロントエンド"]
        API["🌐 FastAPI<br/>:8089"]
        Agent["🤖 AgentRunner<br/>マルチターン会話"]
        Tools["🔧 Direct Tools<br/>18個のツール"]
        DB[("🗄️ PostgreSQL<br/>asyncpg直接接続")]
        Claude["🧠 Claude API"]
    end

    FE -->|"POST /chat<br/>POST /ai/reviews/generate"| API
    API --> Agent
    Agent -->|"ツール呼び出し"| Tools
    Tools -->|"SQL実行"| DB
    Agent <-->|"推論リクエスト"| Claude
```

**ポイント:**
- **バックエンドサービス（Go）を経由しない** - DBに直接接続
- **Direct Tools** - ClaudeがDBを操作するためのツール群
- **AgentRunner** - マルチターン会話を管理するコア

### 5.2 Direct Tools（18個）

Claudeが使えるツール一覧：

#### Database Tools（7個）- データ操作
| ツール | 説明 | 書込 |
|--------|------|:----:|
| `get_goals_and_milestones` | 目標とマイルストーン取得 | - |
| `get_tasks` | タスク取得（フィルタ可） | - |
| `create_task` | タスク作成 | ✓ |
| `update_task` | タスク更新 | ✓ |
| `get_time_blocks` | 予定取得 | - |
| `create_time_block` | 予定作成 | ✓ |
| `get_time_entries` | 作業実績取得 | - |

#### Memory Tools（4個）- ユーザー記憶
| ツール | 説明 |
|--------|------|
| `get_user_memory` | ユーザープロフィール取得 |
| `get_user_facts` | 抽出済みファクト取得 |
| `add_user_fact` | ファクト手動追加 |
| `get_recent_interactions` | 最近のやり取り取得 |

#### Search Tools（3個）- 検索
| ツール | 説明 |
|--------|------|
| `semantic_search` | ベクトル類似検索（pgvector） |
| `keyword_search` | 全文検索（tsvector） |
| `hybrid_search` | セマンティック + キーワード複合 |

#### Storage Tools（4個）- ファイル
| ツール | 説明 |
|--------|------|
| `upload_file` | R2にファイルアップロード |
| `get_file` | ファイルメタデータ取得 |
| `delete_file` | ファイル削除 |
| `get_upload_url` | 署名付きアップロードURL生成 |

### 5.3 AgentRunnerの動作フロー

```mermaid
sequenceDiagram
    participant U as 👤 ユーザー
    participant API as 🌐 FastAPI
    participant Agent as 🤖 AgentRunner
    participant Claude as 🧠 Claude API
    participant Tools as 🔧 Direct Tools
    participant DB as 🗄️ DB

    U->>API: "明日の予定を作って"
    API->>Agent: run(message, user_id)

    loop マルチターン（最大10回）
        Agent->>Claude: メッセージ + ツール定義
        Claude-->>Agent: tool_use: create_time_block

        Agent->>Tools: execute_tool("create_time_block", args)
        Tools->>DB: INSERT INTO time_blocks...
        DB-->>Tools: 結果
        Tools-->>Agent: ツール結果

        Agent->>Claude: ツール結果を送信
        Claude-->>Agent: end_turn + 応答テキスト
    end

    Agent-->>API: AgentResult
    API-->>U: "明日の予定を作成しました！"
```

### 5.4 ファクト抽出システム

会話からユーザーの特徴を自動抽出して記憶：

```mermaid
graph LR
    subgraph "会話"
        Conv["💬 '朝型なので7時から作業します'"]
    end

    subgraph "抽出"
        Extract["🔍 FactExtractor<br/>Claudeで解析"]
    end

    subgraph "保存"
        Facts["📝 user_facts テーブル"]
    end

    subgraph "活用"
        Memory["🧠 次回の会話で参照"]
    end

    Conv --> Extract
    Extract -->|"habit: '朝7時から作業'"| Facts
    Facts --> Memory
```

**ファクトの種類:**
| タイプ | 説明 | 例 |
|--------|------|-----|
| `preference` | 好み | "早朝が好き" |
| `habit` | 習慣 | "毎朝7時に起きる" |
| `skill` | スキル | "Pythonが得意" |
| `goal` | 目標 | "来月までにリリース" |
| `constraint` | 制約 | "平日は19時以降のみ" |

### 5.5 APIエンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/chat` | 非ストリーミングチャット |
| POST | `/chat/stream` | ストリーミングチャット |
| POST | `/ai/reviews/generate` | 週次レビュー生成 |
| GET | `/ai/reviews` | レビュー一覧 |
| POST | `/interactions/{id}/feedback` | フィードバック送信 |

---

## 6. データの流れ

ユーザーがタスクを追加する場合を例に、データがどう流れるか見てみましょう。

### 6.1 タスク追加の流れ

```mermaid
sequenceDiagram
    participant U as 👤 ユーザー
    participant P as 📱 画面<br/>（TaskManagement）
    participant ST as 📦 ストア<br/>（useTaskStore）
    participant API as 🌐 APIサービス<br/>（tasks.ts）
    participant BE as ⚙️ バックエンド<br/>（task-service）
    participant DB as 🗄️ データベース

    U->>P: 1. タスクを入力して「追加」ボタンをクリック
    P->>ST: 2. addTask(タスクデータ) を呼び出し
    ST->>API: 3. tasksApi.createTask(データ)
    API->>BE: 4. POST /api/v1/tasks
    BE->>BE: 5. JWT認証チェック
    BE->>BE: 6. ユーザーID取得
    BE->>DB: 7. INSERT INTO tasks ...
    DB-->>BE: 8. 保存完了
    BE-->>API: 9. 新しいタスクを返却
    API-->>ST: 10. レスポンス処理
    ST-->>ST: 11. ストアを更新
    ST-->>P: 12. 画面を再描画
    P-->>U: 13. 新しいタスクが表示される
```

### 6.2 認証の流れ

すべてのリクエストには「認証」が必要です：

```mermaid
sequenceDiagram
    participant U as 👤 ユーザー
    participant FE as 📱 フロントエンド
    participant BE as ⚙️ user-service
    participant DB as 🗄️ データベース

    Note over U,DB: ログイン処理
    U->>FE: 1. メールアドレス・パスワードを入力
    FE->>BE: 2. POST /api/v1/auth/login
    BE->>DB: 3. ユーザー情報を確認
    DB-->>BE: 4. ユーザー情報
    BE->>BE: 5. JWT トークンを生成
    BE-->>FE: 6. トークンを返却
    FE->>FE: 7. トークンをlocalStorageに保存

    Note over U,DB: 以降のリクエスト
    FE->>BE: 8. GET /api/v1/tasks<br/>Authorization: Bearer {token}
    BE->>BE: 9. トークンを検証
    BE->>BE: 10. ユーザーIDを取得
    BE->>DB: 11. WHERE user_id = {ユーザーID}
    DB-->>BE: 12. そのユーザーのデータのみ返却
```

### 6.3 タイムゾーン処理

Kensanは世界中どこからでも使えるよう、タイムゾーンを正しく処理します：

```mermaid
graph LR
    subgraph "フロントエンド"
        Local["ローカル時間<br/>2026-01-24<br/>（Asia/Tokyo）"]
        Convert["timezone.ts<br/>UTC変換"]
    end

    subgraph "バックエンド"
        API["API<br/>UTCで受け取り"]
        DB["DB保存<br/>全てUTC"]
    end

    Local -->|"localDateToUtcRange()"| Convert
    Convert -->|"2026-01-23T15:00:00Z<br/>〜2026-01-24T15:00:00Z"| API
    API --> DB
```

**ポイント:**
- データベースには全て**UTC**で保存
- フロントエンドでユーザーのタイムゾーンに変換して表示
- `useSettingsStore`からタイムゾーン設定を取得

---

## 7. データベース構造

すべてのデータはPostgreSQL 16データベースに保存されます。

### 7.1 主要テーブルの関係

```mermaid
erDiagram
    users ||--o{ user_settings : "1対1"
    users ||--o{ goals : "1対多"
    users ||--o{ notes : "1対多"
    users ||--o{ time_blocks : "1対多"

    goals ||--o{ milestones : "1対多"
    milestones ||--o{ tasks : "1対多"
    tasks ||--o{ tasks : "親子関係"

    users {
        uuid id PK
        string email
        string name
        string password_hash
    }

    goals {
        uuid id PK
        uuid user_id FK
        string name
        string description
        string color
        boolean is_archived
    }

    milestones {
        uuid id PK
        uuid user_id FK
        uuid goal_id FK
        string name
        string status
        date target_date
    }

    tasks {
        uuid id PK
        uuid user_id FK
        uuid milestone_id FK
        uuid parent_task_id FK
        string name
        boolean completed
    }

    notes {
        uuid id PK
        uuid user_id FK
        string type
        string title
        text content
        string format
        date date
    }

    time_blocks {
        uuid id PK
        uuid user_id FK
        date date
        time start_time
        time end_time
        string task_name
    }
```

### 7.2 主要テーブル一覧

| テーブル | 説明 | 主要カラム |
|---------|------|-----------|
| `users` | ユーザー | email, name, password_hash |
| `user_settings` | 設定 | timezone, theme, ai_enabled |
| `goals` | 目標 | name, color, is_archived |
| `milestones` | マイルストーン | goal_id, name, status, target_date |
| `tasks` | タスク | milestone_id, parent_task_id, name, completed |
| `tags` | タグ | name, color |
| `task_tags` | タスク-タグ関連 | task_id, tag_id |
| `time_blocks` | 計画時間 | date, start_time, end_time, task_name |
| `time_entries` | 実績時間 | date, start_time, end_time, task_name |
| `running_timers` | 実行中タイマー | task_name, started_at |
| `notes` | 統合ノート | type, title, content, format |
| `memos` | クイックメモ | content, archived |

### 7.3 マルチテナント設計

すべてのテーブルに`user_id`があり、ユーザーごとにデータが分離されています：

```mermaid
graph TB
    subgraph "データ分離の仕組み"
        subgraph "ユーザーA"
            UA["👤 ユーザーA"]
            PA["📋 Aのタスク"]
            NA["📝 Aのノート"]
        end

        subgraph "ユーザーB"
            UB["👤 ユーザーB"]
            PB["📋 Bのタスク"]
            NB["📝 Bのノート"]
        end
    end

    Note["全クエリに<br/>WHERE user_id = ? が付く"]
```

---

## 8. 目標・タスク管理の階層

Kensanでは、**目標 → マイルストーン → タスク**の3層構造でタスクを管理します。

### 8.1 階層構造

```mermaid
graph TB
    subgraph "Goal（目標）"
        G1["🎯 Kensanリリース"]
        G2["💪 健康"]
        G3["🎤 KubeCon登壇"]
    end

    subgraph "Milestone（マイルストーン）"
        M1["📦 Dockerで利用できるようにする"]
        M2["☸️ k8sにデプロイする"]
        M3["🏃 定期的なジム通い"]
        M4["📝 原稿提出"]
        M5["🗣️ 英語練習"]
    end

    subgraph "Task（タスク）"
        T1["ai-serviceと情報収集の設計"]
        T2["UIつめ"]
        T3["ジム"]
        T4["原稿作成"]
        T5["リスニング"]
    end

    G1 --> M1
    G1 --> M2
    G2 --> M3
    G3 --> M4
    G3 --> M5

    M1 --> T1
    M1 --> T2
    M3 --> T3
    M4 --> T4
    M5 --> T5
```

### 8.2 タグによる横断的な分類

目標・マイルストーンの縦の階層に加え、**タグ**で横断的に分類できます：

```mermaid
graph LR
    subgraph "タグ"
        Tag1["🏷️ Input"]
        Tag2["🏷️ 開発"]
        Tag3["🏷️ 運動"]
        Tag4["🏷️ 読書"]
    end

    subgraph "タスク"
        T1["ai-service設計"]
        T2["UIつめ"]
        T3["ジム"]
        T4["リスニング"]
    end

    Tag2 --> T1
    Tag2 --> T2
    Tag3 --> T3
    Tag1 --> T4
```

**使い分け:**
- **目標・マイルストーン**: 達成したいゴールに向けた構造
- **タグ**: 活動の種類（Input、開発、運動など）で集計

---

## 9. 開発モードと本番モードの違い

### 9.1 MSW（Mock Service Worker）とは？

開発中はバックエンドなしでも動作できるように、**MSW**がAPIリクエストを横取りしてモックデータを返します。

```mermaid
graph TB
    subgraph "開発モード（VITE_ENABLE_MSW=true）"
        FE_DEV["📱 フロントエンド"]
        MSW["🎭 MSW<br/>モックサーバー"]
        MOCK["📦 モックデータ<br/>src/mocks/"]

        FE_DEV -->|"1. fetch(/api/v1/tasks)"| MSW
        MSW -->|"2. ハンドラーで処理"| MOCK
        MOCK -->|"3. モックデータを返却"| MSW
        MSW -->|"4. レスポンス"| FE_DEV
    end

    subgraph "本番モード"
        FE_PROD["📱 フロントエンド"]
        BE_PROD["⚙️ バックエンド"]
        DB_PROD[("🗄️ DB")]

        FE_PROD -->|"1. fetch(/api/v1/tasks)"| BE_PROD
        BE_PROD -->|"2. クエリ実行"| DB_PROD
        DB_PROD -->|"3. データ"| BE_PROD
        BE_PROD -->|"4. レスポンス"| FE_PROD
    end
```

### 9.2 モードの切り替え

| 環境 | MSW | バックエンド | 用途 |
|------|-----|------------|------|
| **開発モード** | 有効 | 不要 | UIの開発・テスト |
| **本番モード** | 無効 | 必要 | 実際の運用 |

```bash
# 開発モード（MSW有効）
VITE_ENABLE_MSW=true npm run dev

# 本番モード（バックエンド必要）
npm run dev  # MSWなし

# Docker Composeで全部起動
cd backend && make up
```

---

## まとめ

### Kensanの技術スタック

```mermaid
graph LR
    subgraph "フロントエンド"
        R["React 18"]
        TS["TypeScript 5.6"]
        V["Vite 6"]
        Z["Zustand 5"]
        TW["Tailwind CSS 4"]
        SH["shadcn/ui"]
    end

    subgraph "バックエンド"
        GO["Go 1.24"]
        CHI["chi router v5"]
        PGX["pgx v5"]
        ZL["zerolog"]
    end

    subgraph "インフラ"
        PG["PostgreSQL 16"]
        PGV["pgvector"]
        D["Docker"]
    end

    subgraph "外部API"
        AI["Claude API"]
    end
```

### 覚えておくべきポイント

1. **フロントエンド**はReact + TypeScriptで、Zustandで状態管理
2. **バックエンド**は9つのGoマイクロサービスで構成
3. すべてのサービスは**Handler → Service → Repository**の3層構造
4. **JWT**で認証し、**user_id**でデータを分離（マルチテナント）
5. **Goal → Milestone → Task**の3層でタスク管理、**Tag**で横断分類
6. 開発時は**MSW**でモック、本番は実際のバックエンドを使用
7. タイムゾーンは**UTC**で保存、フロントエンドで変換
8. **SOLID原則**に従った設計：
   - ISP: ストアやインターフェースはドメインごとに分割
   - DIP: サービス層はインターフェースに依存

### ファイル統計

| カテゴリ | 数 |
|---------|-----|
| ページ | 10 |
| コンポーネント | 59 |
| Zustandストア | 16 |
| APIサービス | 12 |
| バックエンドサービス | 9 |
| 共有パッケージ | 6 |
| データベーステーブル | 14+ |

---

## 参考リンク

- [React公式ドキュメント](https://react.dev/)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Go言語公式](https://go.dev/)
- [PostgreSQL公式](https://www.postgresql.org/)
- [MSW公式ドキュメント](https://mswjs.io/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
