# Kensan システムアーキテクチャ入門ガイド

このドキュメントでは、Kensanサービスの仕組みを図を使ってわかりやすく説明します。

**最終更新: 2026-01-24**

---

## 目次

1. [Kensanとは？](#1-kensanとは)
2. [システム全体像](#2-システム全体像)
3. [フロントエンドの仕組み](#3-フロントエンドの仕組み)
4. [バックエンドの仕組み](#4-バックエンドの仕組み)
5. [データの流れ](#5-データの流れ)
6. [データベース構造](#6-データベース構造)
7. [目標・タスク管理の階層](#7-目標タスク管理の階層)
8. [開発モードと本番モードの違い](#8-開発モードと本番モードの違い)

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
        BE5["🔁 routine-service<br/>:8085"]
        BE6["📚 record-service<br/>:8086"]
        BE7["📝 diary-service<br/>:8087"]
        BE8["📊 analytics-service<br/>:8088"]
        BE10["📌 memo-service<br/>:8090"]
        BE11["📓 note-service<br/>:8091"]
    end

    subgraph "AIサービス（Python）"
        AI_SVC["🤖 kensan-ai<br/>（開発中）"]
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
    FE <--> BE6
    FE <--> BE7
    FE <--> BE8
    FE <--> BE10
    FE <--> BE11

    BE1 --> DB
    BE2 --> DB
    BE4 --> DB
    BE5 --> DB
    BE6 --> DB
    BE7 --> DB
    BE8 --> DB
    BE10 --> DB
    BE11 --> DB

    AI_SVC --> DB
    AI_SVC --> AI
```

### ポイント解説

| 用語 | 説明 |
|------|------|
| **フロントエンド** | ユーザーが直接触る画面部分。ブラウザで動作します |
| **バックエンド** | データの保存・処理を担当。Goで書かれた9つのマイクロサービス |
| **kensan-ai** | AI機能を担当するPythonサービス（Claude API連携） |
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
        S02["🏠 S02_Dashboard<br/>ホーム画面"]
    end

    subgraph "日常"
        Daily["📅 DailyPage<br/>朝/夜の計画・振り返り"]
    end

    subgraph "タスク管理"
        T01["📋 T01_TaskManagement<br/>目標・タスク管理"]
        R01["🔁 R01_RoutineTaskManagement<br/>定期タスク"]
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
| **S** | Settings（設定） | S01_Settings, S02_Dashboard |
| **D** | Daily（日常） | DailyPage（朝/夜統合） |
| **T** | Task（タスク） | T01_TaskManagement |
| **R** | Routine（定期タスク） | R01_RoutineTaskManagement |
| **N** | Note（ノート） | N01_NoteList, N02_NoteEdit |
| **A** | Analytics/AI（分析） | A01_AnalyticsReport, A02_AIReview |

> **変更点**: 以前の `M01_Morning`（朝）と `E01_Evening`（夜）は `DailyPage` に統合されました。

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
            Common["common/ - 共通部品<br/>（TaskCard, TimerWidget等 11個）"]
            Daily["daily/ - 日次部品<br/>（DailySummary等 4個）"]
            Task["task/ - タスク部品<br/>（ダイアログ 4個）"]
            Note["note/ - ノート部品"]
        end

        subgraph "stores/ - 状態管理"
            ST["12個のZustandストア"]
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
├── common/             # ドメイン共通（11個）
│   ├── TaskCard.tsx    # タスクカード
│   ├── TimerWidget.tsx # タイマー
│   ├── GoalBadge.tsx   # 目標バッジ
│   └── ...
├── daily/              # 日次（4個）
│   ├── DailySummary.tsx
│   └── TimeBlockSection.tsx
├── task/               # タスクダイアログ（4個）
│   ├── GoalDialog.tsx
│   ├── MilestoneDialog.tsx
│   └── TaskDialog.tsx
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
        Task["useTaskStore<br/>目標・タスク"]
        TimeBlock["useTimeBlockStore<br/>タイムブロック"]
        Timer["useTimerStore<br/>タイマー"]
        Note["useNoteStore<br/>ノート"]
        Routine["useRoutineStore<br/>定期タスク"]
        Memo["useMemoStore<br/>メモ"]
        Analytics["useAnalyticsStore<br/>分析データ"]
        Legacy1["useLearningRecordStore<br/>（レガシー）"]
        Legacy2["useDiaryStore<br/>（レガシー）"]
    end

    Note -.->|"統合中"| Legacy1
    Note -.->|"統合中"| Legacy2
```

**主要ストアの役割:**

| ストア | 役割 | 主な機能 |
|--------|------|---------|
| `useAuthStore` | 認証 | ログイン、ログアウト、トークン管理 |
| `useSettingsStore` | 設定 | タイムゾーン、テーマ、ユーザー名 |
| `useTaskStore` | タスク | 目標・マイルストーン・タスクのCRUD |
| `useTimeBlockStore` | 時間 | タイムブロック、時間記録（timezone対応） |
| `useTimerStore` | タイマー | 作業タイマーの開始・停止 |
| `useNoteStore` | ノート | 日記・学習記録の統合管理 |

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
            TS["📋 task-service<br/>ポート: 8082<br/>・目標管理<br/>・マイルストーン<br/>・タスク・タグ"]
            TBS["⏰ timeblock-service<br/>ポート: 8084<br/>・タイムブロック<br/>・時間記録<br/>・タイマー"]
            RS["🔁 routine-service<br/>ポート: 8085<br/>・定期タスク<br/>・日/週/月"]
        end

        subgraph "記録系"
            RCS["📚 record-service<br/>ポート: 8086<br/>・学習記録<br/>（レガシー）"]
            DS["📝 diary-service<br/>ポート: 8087<br/>・日記<br/>（レガシー）"]
            MS["📌 memo-service<br/>ポート: 8090<br/>・クイックメモ"]
            NS["📓 note-service<br/>ポート: 8091<br/>・統合ノート<br/>・日記+学習+メモ"]
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
| `middleware` | HTTPミドルウェア | `middleware.go` - 認証、ログ、リクエストID |
| `logging` | ログ出力 | `setup.go` - zerolog設定 |

---

## 5. データの流れ

ユーザーがタスクを追加する場合を例に、データがどう流れるか見てみましょう。

### 5.1 タスク追加の流れ

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

### 5.2 認証の流れ

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

### 5.3 タイムゾーン処理

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

## 6. データベース構造

すべてのデータはPostgreSQL 16データベースに保存されます。

### 6.1 主要テーブルの関係

```mermaid
erDiagram
    users ||--o{ user_settings : "1対1"
    users ||--o{ goals : "1対多"
    users ||--o{ notes : "1対多"
    users ||--o{ time_blocks : "1対多"
    users ||--o{ routine_tasks : "1対多"

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

### 6.2 主要テーブル一覧

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
| `routine_tasks` | 定期タスク | name, frequency, days_of_week |
| `notes` | 統合ノート | type, title, content, format |
| `memos` | クイックメモ | content, archived |

### 6.3 マルチテナント設計

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

## 7. 目標・タスク管理の階層

Kensanでは、**目標 → マイルストーン → タスク**の3層構造でタスクを管理します。

### 7.1 階層構造

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

### 7.2 タグによる横断的な分類

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

## 8. 開発モードと本番モードの違い

### 8.1 MSW（Mock Service Worker）とは？

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

### 8.2 モードの切り替え

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

### ファイル統計

| カテゴリ | 数 |
|---------|-----|
| ページ | 10 |
| コンポーネント | 47 |
| Zustandストア | 12 |
| APIサービス | 12 |
| バックエンドサービス | 9 |
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
