# Kensan システムアーキテクチャ入門ガイド

このドキュメントでは、Kensanサービスの仕組みを図を使ってわかりやすく説明します。

---

## 目次

1. [Kensanとは？](#1-kensanとは)
2. [システム全体像](#2-システム全体像)
3. [フロントエンドの仕組み](#3-フロントエンドの仕組み)
4. [バックエンドの仕組み](#4-バックエンドの仕組み)
5. [データの流れ](#5-データの流れ)
6. [データベース構造](#6-データベース構造)
7. [開発モードと本番モードの違い](#7-開発モードと本番モードの違い)

---

## 1. Kensanとは？

Kensanは、個人の生産性を向上させるためのアプリケーションです。

**主な機能:**
- 時間管理（タイムブロック）
- タスク管理
- 学習記録
- 日記
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
        BE3["🔄 sync-service<br/>:8083"]
        BE4["⏰ timeblock-service<br/>:8084"]
        BE5["🔁 routine-service<br/>:8085"]
        BE6["📚 record-service<br/>:8086"]
        BE7["📝 diary-service<br/>:8087"]
        BE8["📊 analytics-service<br/>:8088"]
        BE9["🤖 ai-service<br/>:8089"]
    end

    subgraph "データベース"
        DB[("🗄️ PostgreSQL<br/>:5432")]
    end

    subgraph "外部サービス"
        CL["⏱️ Clockify API"]
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
    FE <--> BE9

    BE1 --> DB
    BE2 --> DB
    BE3 --> DB
    BE4 --> DB
    BE5 --> DB
    BE6 --> DB
    BE7 --> DB
    BE8 --> DB
    BE9 --> DB

    BE3 --> CL
    BE9 --> AI
```

### ポイント解説

| 用語 | 説明 |
|------|------|
| **フロントエンド** | ユーザーが直接触る画面部分。ブラウザで動作します |
| **バックエンド** | データの保存・処理を担当。サーバーで動作します |
| **マイクロサービス** | 機能ごとに分けられた小さなサービス群 |
| **データベース** | すべてのデータを保存する場所 |

---

## 3. フロントエンドの仕組み

フロントエンドは、ユーザーが見る画面を担当します。

### 3.1 フロントエンドの構成

```mermaid
graph LR
    subgraph "フロントエンド構成"
        subgraph "ページ（画面）"
            P1["🌅 M01_Morning<br/>朝のルーチン"]
            P2["🌙 E01_Evening<br/>夜のルーチン"]
            P3["📋 T01_TaskManagement<br/>タスク管理"]
            P4["📚 L01/L02<br/>学習記録"]
            P5["📝 D01/D02<br/>日記"]
            P6["📊 A01/A02<br/>分析・AI"]
        end

        subgraph "ストア（状態管理）"
            S1["useTaskStore"]
            S2["useTimeBlockStore"]
            S3["useLearningRecordStore"]
            S4["useDiaryStore"]
        end

        subgraph "APIサービス"
            A1["tasksApi"]
            A2["timeblocksApi"]
            A3["recordsApi"]
            A4["diariesApi"]
        end

        subgraph "HTTPクライアント"
            HC["httpClient"]
        end
    end

    P1 --> S2
    P3 --> S1
    P4 --> S3
    P5 --> S4

    S1 --> A1
    S2 --> A2
    S3 --> A3
    S4 --> A4

    A1 --> HC
    A2 --> HC
    A3 --> HC
    A4 --> HC
```

### 3.2 ページの命名規則

ページ名の先頭文字には意味があります：

| 文字 | 意味 | 例 |
|------|------|-----|
| **S** | Settings（設定） | S01_Settings, S02_Dashboard |
| **M** | Morning（朝） | M01_Morning |
| **E** | Evening（夜） | E01_Evening |
| **T** | Task（タスク） | T01_TaskManagement |
| **R** | Routine（定期タスク） | R01_RoutineTaskManagement |
| **L** | Learning（学習） | L01_LearningRecordList |
| **D** | Diary（日記） | D01_DiaryList |
| **A** | Analytics/AI（分析） | A01_AnalyticsReport |

### 3.3 Zustandストアとは？

**Zustand**は、アプリ全体でデータを共有するための仕組みです。

```mermaid
graph TB
    subgraph "Zustand ストアの役割"
        Store["📦 useTaskStore"]

        subgraph "保持するデータ（State）"
            D1["projects: プロジェクト一覧"]
            D2["tasks: タスク一覧"]
            D3["isLoading: 読み込み中フラグ"]
        end

        subgraph "操作（Actions）"
            A1["fetchProjects(): 取得"]
            A2["addTask(): 追加"]
            A3["updateTask(): 更新"]
            A4["deleteTask(): 削除"]
        end
    end

    Store --> D1
    Store --> D2
    Store --> D3
    Store --> A1
    Store --> A2
    Store --> A3
    Store --> A4
```

**ストアを使うメリット:**
- どの画面からでも同じデータにアクセスできる
- データが変わると自動で画面が更新される

---

## 4. バックエンドの仕組み

バックエンドは9つの**マイクロサービス**で構成されています。

### 4.1 マイクロサービス一覧

```mermaid
graph TB
    subgraph "バックエンドサービス群"
        subgraph "認証・ユーザー"
            US["👤 user-service<br/>ポート: 8081<br/>・ログイン/ログアウト<br/>・ユーザー設定"]
        end

        subgraph "タスク管理"
            TS["📋 task-service<br/>ポート: 8082<br/>・プロジェクト管理<br/>・タスク管理"]
            TBS["⏰ timeblock-service<br/>ポート: 8084<br/>・時間ブロック<br/>・スケジュール管理"]
            RS["🔁 routine-service<br/>ポート: 8085<br/>・定期タスク<br/>・習慣管理"]
        end

        subgraph "記録系"
            RCS["📚 record-service<br/>ポート: 8086<br/>・学習記録<br/>・メモ管理"]
            DS["📝 diary-service<br/>ポート: 8087<br/>・日記エントリー<br/>・振り返り"]
        end

        subgraph "分析・外部連携"
            AS["📊 analytics-service<br/>ポート: 8088<br/>・週次サマリー<br/>・月次レポート"]
            AIS["🤖 ai-service<br/>ポート: 8089<br/>・AI振り返り<br/>・Claude API連携"]
            SS["🔄 sync-service<br/>ポート: 8083<br/>・Clockify連携<br/>・時間記録同期"]
        end
    end
```

### 4.2 各サービスの内部構造

すべてのサービスは同じ構造（レイヤードアーキテクチャ）で作られています：

```mermaid
graph TB
    subgraph "サービス内部構造（例: task-service）"
        H["🌐 Handler（ハンドラー）<br/>HTTPリクエストを受け取る"]
        S["⚙️ Service（サービス）<br/>ビジネスロジック"]
        R["💾 Repository（リポジトリ）<br/>データベース操作"]
        DB[("🗄️ PostgreSQL")]
    end

    H -->|"リクエスト処理"| S
    S -->|"データ操作依頼"| R
    R -->|"SQLクエリ"| DB
    DB -->|"結果"| R
    R -->|"データ"| S
    S -->|"レスポンス"| H
```

### 4.3 レイヤーの役割

| レイヤー | 役割 | 例 |
|---------|------|-----|
| **Handler** | HTTPリクエストの受付・レスポンス返却 | `GET /api/v1/tasks` を受け取る |
| **Service** | ビジネスロジック（処理ルール） | 「完了タスクは削除できない」などのルール適用 |
| **Repository** | データベースとのやり取り | SQLでデータを取得・保存 |

---

## 5. データの流れ

ユーザーがタスクを追加する場合を例に、データがどう流れるか見てみましょう。

### 5.1 タスク追加の流れ

```mermaid
sequenceDiagram
    participant U as 👤 ユーザー
    participant P as 📱 画面
    participant ST as 📦 ストア
    participant API as 🌐 APIサービス
    participant BE as ⚙️ バックエンド
    participant DB as 🗄️ データベース

    U->>P: 1. タスクを入力して「追加」ボタンをクリック
    P->>ST: 2. addTask(タスクデータ) を呼び出し
    ST->>API: 3. tasksApi.create(タスクデータ)
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
    FE->>FE: 7. トークンを保存

    Note over U,DB: 以降のリクエスト
    FE->>BE: 8. GET /api/v1/tasks<br/>Authorization: Bearer {token}
    BE->>BE: 9. トークンを検証
    BE->>BE: 10. ユーザーIDを取得
    BE->>DB: 11. WHERE user_id = {ユーザーID}
    DB-->>BE: 12. そのユーザーのデータのみ返却
```

### 5.3 JWT（ジェイダブリューティー）とは？

```mermaid
graph LR
    subgraph "JWTトークンの仕組み"
        T["🎫 JWTトークン"]

        subgraph "中身"
            H["Header<br/>トークンの種類"]
            P["Payload<br/>ユーザーID等"]
            S["Signature<br/>改ざん防止の署名"]
        end
    end

    T --> H
    T --> P
    T --> S
```

**JWTのメリット:**
- 毎回データベースに問い合わせなくてもユーザーを識別できる
- 改ざんされると署名が無効になるのでセキュリティが高い

---

## 6. データベース構造

すべてのデータはPostgreSQLデータベースに保存されます。

### 6.1 主要テーブルの関係

```mermaid
erDiagram
    users ||--o{ user_settings : "1対1"
    users ||--o{ projects : "1対多"
    users ||--o{ tasks : "1対多"
    users ||--o{ time_blocks : "1対多"
    users ||--o{ routine_tasks : "1対多"
    users ||--o{ learning_records : "1対多"
    users ||--o{ diary_entries : "1対多"
    users ||--o{ ai_review_reports : "1対多"

    projects ||--o{ tasks : "1対多"
    tasks ||--o{ tasks : "親子関係"

    users {
        uuid id PK
        string email
        string password_hash
        timestamp created_at
    }

    projects {
        uuid id PK
        uuid user_id FK
        string name
        string goal_tag
        boolean archived
    }

    tasks {
        uuid id PK
        uuid user_id FK
        uuid project_id FK
        uuid parent_task_id FK
        string title
        boolean completed
    }

    time_blocks {
        uuid id PK
        uuid user_id FK
        date date
        time start_time
        time end_time
        string task_type
    }

    learning_records {
        uuid id PK
        uuid user_id FK
        string title
        string format
        text content
    }

    diary_entries {
        uuid id PK
        uuid user_id FK
        date entry_date
        text content
        array tags
    }
```

### 6.2 マルチテナント設計

すべてのテーブルに`user_id`があり、ユーザーごとにデータが分離されています：

```mermaid
graph TB
    subgraph "データ分離の仕組み"
        subgraph "ユーザーA"
            UA["👤 ユーザーA<br/>user_id: aaa-111"]
            PA["📋 ユーザーAのタスク"]
            DA["📝 ユーザーAの日記"]
        end

        subgraph "ユーザーB"
            UB["👤 ユーザーB<br/>user_id: bbb-222"]
            PB["📋 ユーザーBのタスク"]
            DB_B["📝 ユーザーBの日記"]
        end

        DB[("🗄️ データベース")]
    end

    UA --> PA
    UA --> DA
    UB --> PB
    UB --> DB_B

    PA --> DB
    DA --> DB
    PB --> DB
    DB_B --> DB

    Note["クエリ例:<br/>SELECT * FROM tasks<br/>WHERE user_id = 'aaa-111'<br/>→ ユーザーAのタスクのみ取得"]
```

---

## 7. 開発モードと本番モードの違い

### 7.1 MSW（Mock Service Worker）とは？

開発中はバックエンドなしでも動作できるように、**MSW**がAPIリクエストを横取りしてモックデータを返します。

```mermaid
graph TB
    subgraph "開発モード（DEV）"
        FE_DEV["📱 フロントエンド"]
        MSW["🎭 MSW<br/>モックサーバー"]
        MOCK["📦 モックデータ<br/>src/mocks/data.ts"]

        FE_DEV -->|"1. fetch(/api/v1/tasks)"| MSW
        MSW -->|"2. ハンドラーで処理"| MOCK
        MOCK -->|"3. モックデータを返却"| MSW
        MSW -->|"4. レスポンス"| FE_DEV
    end

    subgraph "本番モード（PROD）"
        FE_PROD["📱 フロントエンド"]
        BE_PROD["⚙️ バックエンド"]
        DB_PROD[("🗄️ DB")]

        FE_PROD -->|"1. fetch(/api/v1/tasks)"| BE_PROD
        BE_PROD -->|"2. クエリ実行"| DB_PROD
        DB_PROD -->|"3. データ"| BE_PROD
        BE_PROD -->|"4. レスポンス"| FE_PROD
    end
```

### 7.2 モードの切り替え

| 環境 | MSW | バックエンド | 用途 |
|------|-----|------------|------|
| **開発モード** | 有効 | 不要 | UIの開発・テスト |
| **本番モード** | 無効 | 必要 | 実際の運用 |

```bash
# 開発モード（MSW有効）
npm run dev

# 本番モード（バックエンド必要）
npm run build && npm run preview
```

---

## まとめ

### Kensanの技術スタック

```mermaid
graph LR
    subgraph "フロントエンド"
        R["React"]
        TS["TypeScript"]
        V["Vite"]
        Z["Zustand"]
        TW["Tailwind CSS"]
    end

    subgraph "バックエンド"
        GO["Go"]
        CHI["chi router"]
        PGX["pgx"]
    end

    subgraph "インフラ"
        PG["PostgreSQL"]
        D["Docker"]
    end

    subgraph "外部API"
        CL["Clockify"]
        AI["Claude API"]
    end
```

### 覚えておくべきポイント

1. **フロントエンド**はReact + TypeScriptで、Zustandで状態管理
2. **バックエンド**は9つのGoマイクロサービスで構成
3. すべてのサービスは**Handler → Service → Repository**の3層構造
4. **JWT**で認証し、**user_id**でデータを分離（マルチテナント）
5. 開発時は**MSW**でモック、本番は実際のバックエンドを使用

---

## 参考リンク

- [React公式ドキュメント](https://react.dev/)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Go言語公式](https://go.dev/)
- [PostgreSQL公式](https://www.postgresql.org/)
- [MSW公式ドキュメント](https://mswjs.io/)
