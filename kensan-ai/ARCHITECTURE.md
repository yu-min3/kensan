# Kensan AIアーキテクチャ

KensanアプリケーションのためのDirect Toolsを使用したPython AIサービス。

---

## 目次

1. [概要](#概要)
2. [リクエスト処理フロー](#リクエスト処理フロー)
3. [エージェント](#エージェント)
4. [Direct Tools](#direct-tools)
5. [コンテキスト管理](#コンテキスト管理)
6. [メモリとファクト抽出](#メモリとファクト抽出)
7. [埋め込みと検索](#埋め込みと検索)
8. [APIエンドポイント](#apiエンドポイント)
9. [設定と環境変数](#設定と環境変数)
10. [テレメトリ](#テレメトリ)

---

## 概要

### アーキテクチャスタイル

- **FastAPI** アプリケーション（非同期サポート）
- **エージェントベース** アーキテクチャ（LLMのDirect Tools / Function Calling使用）
- **コンテキスト認識** AI（状況別プロンプト選択 + A/Bテスト）
- **メモリシステム**（ファクト自動抽出 + プロフィール要約）
- **マルチプロバイダ**: Anthropic (Claude) / Google (Gemini) を `AI_PROVIDER` で切替

### 技術スタック

| コンポーネント | 技術 |
|--------------|------|
| フレームワーク | FastAPI (非同期) |
| ランタイム | Python 3.12+ |
| AIモデル | Claude (Anthropic SDK) / Gemini (Google GenAI SDK) |
| 埋め込み | OpenAI text-embedding-3-small (1536次元) |
| データベース | PostgreSQL 16 + pgvector (asyncpg) |
| ストレージ | MinIO (S3互換、読み取り専用) |
| 外部検索 | Tavily API (web_search / web_fetch) |
| データレイク | Iceberg via Nessie Catalog (オプション) |

### ディレクトリ構成

```
kensan-ai/src/kensan_ai/
├── main.py                    # FastAPIエントリー
├── config.py                  # Pydantic BaseSettings
├── errors.py                  # 統一エラー階層
├── agents/                    # エージェント実装
│   ├── base.py               # AgentRunner (Anthropic, プロンプトキャッシング)
│   ├── gemini_runner.py       # GeminiAgentRunner
│   ├── chat.py               # チャットエージェント（動的ツール選択）※DBマイグレーション元ネタ
│   ├── weekly_review.py       # 週次レビューエージェント ※DBマイグレーション元ネタ
│   └── planning_agent.py      # 計画提案エージェント ※DBマイグレーション元ネタ
├── tools/                     # Direct Tools (39+)
│   ├── base.py               # ツールレジストリ & デコレータ
│   ├── db_tools.py           # DB操作 (21)
│   ├── memory_tools.py       # メモリ (4)
│   ├── search_tools.py       # 検索 (6)
│   ├── review_tools.py       # レビュー (3)
│   ├── analytics_tools.py    # 分析 (2)
│   ├── pattern_tools.py      # 行動パターン (1)
│   └── web_tools.py          # Web検索 (2, Tavily)
├── context/                   # AIコンテキスト管理
│   ├── detector.py           # 状況検出
│   ├── resolver.py           # コンテキスト読み込み
│   ├── variable_replacer.py  # 動的プロンプト変数
│   └── ab_selector.py        # A/Bテスト
├── db/queries/                # ドメインクエリ
├── extraction/                # ファクト抽出
├── embeddings/                # ベクトル埋め込み
├── indexing/                  # チャンク分割+インデックス
├── logging/                   # インタラクションログ
├── lakehouse/                 # Iceberg Bronze書き込み
└── batch/                     # オフラインジョブ
```

---

## リクエスト処理フロー

```mermaid
flowchart TB
    subgraph "API層"
        Request["POST /chat/stream"]
        JWT["JWTからuserID抽出"]
    end

    subgraph "コンテキスト解決"
        Detect["状況検出<br/>(chat/weekly/planning)"]
        Load["DBからAIコンテキスト読込"]
        AB{"A/Bテスト?"}
        ABSelect["重みでバリアント選択"]
        Replace["{変数}をユーザーデータで置換"]
    end

    subgraph "エージェント実行ループ"
        Call["LLM API呼び出し<br/>(messages + tools)"]
        Check{"tool_use?"}
        Inject["argsにuser_id自動注入"]
        Execute["ツールをローカル実行"]
        Append["結果をメッセージに追加"]
        Return["最終テキストをSSE返却"]
    end

    subgraph "後処理 (非同期)"
        Log["ai_interactionsに記録"]
        Extract["ファクト抽出"]
        Summarize["プロフィール要約更新"]
    end

    Request --> JWT --> Detect --> Load
    Load --> AB
    AB -->|Yes| ABSelect --> Replace
    AB -->|No| Replace
    Replace --> Call

    Call --> Check
    Check -->|Yes| Inject --> Execute --> Append --> Call
    Check -->|No| Return

    Return --> Log
    Log -.->|async| Extract
    Extract -.->|新factあれば| Summarize
```

---

## エージェント

### エージェント一覧

```mermaid
graph TB
    subgraph "エージェント"
        Chat["ChatAgent<br/>汎用会話 + タスク管理<br/>動的ツール選択"]
        Review["WeeklyReviewAgent<br/>構造化振り返り<br/>セクション解析"]
        Planning["PlanningAgent<br/>日次計画提案<br/>JSON構造化出力"]
    end

    subgraph "基盤"
        BaseAnth["AgentRunner<br/>(Anthropic SDK)"]
        BaseGemini["GeminiAgentRunner<br/>(Google GenAI SDK)"]
        History["MessageHistory<br/>会話管理"]
        Store["ConversationStore<br/>セッション管理"]
    end

    Chat --> BaseAnth
    Chat --> BaseGemini
    Review --> BaseAnth
    Review --> BaseGemini
    Planning --> BaseAnth
    Planning --> BaseGemini
    BaseAnth --> History
    BaseGemini --> History
```

| エージェント | 用途 | 出力形式 | ツール |
|------------|------|---------|--------|
| ChatAgent | 汎用会話、タスク管理 | テキスト (SSEストリーミング) | 動的選択 (7-39ツール) |
| WeeklyReviewAgent | 週次振り返り | 構造化テキスト (セクション解析) | DB読み取り系 |
| PlanningAgent | 日次計画提案 | JSON (insights, proposedBlocks, taskPriorities, alerts) | 計画系 + パターン分析 |

### AgentRunner コア動作

```mermaid
sequenceDiagram
    participant Agent as AgentRunner
    participant LLM as LLM API
    participant Tools as Tool Registry
    participant DB as PostgreSQL

    Note over Agent: system_prompt + tools にcache_control付与
    Agent->>LLM: messages + tools schema
    LLM-->>Agent: レスポンス

    loop 各tool_useに対して (最大10ターン)
        Agent->>Agent: user_idを自動注入
        Agent->>Tools: execute_tool(name, args)
        Tools->>DB: SQLクエリ (user_idフィルタ)
        DB-->>Tools: 結果
        Tools-->>Agent: ツール結果（スリム化済み）
        Agent->>LLM: 継続
        LLM-->>Agent: 次のレスポンス
    end

    Note over Agent: end_turn → 最終テキスト返却
```

**トークン最適化:**

| 手法 | 効果 |
|------|------|
| Anthropic Prompt Caching | Turn 2以降の入力トークンコスト90%削減 |
| ツール結果スリム化 | ネストIDの除外、descriptionの除外、コンテンツ切り詰め(300文字) |
| 動的ツール選択 | 全39ツール→必要な7-15ツールのみ送信 |

### 動的ツール選択

```mermaid
flowchart TB
    Msg["ユーザーメッセージ"] --> Intent["意図分析"]

    Intent --> ReadWrite{"書込キーワード?<br/>(作って/追加して/削除して)"}

    ReadWrite -->|No| ReadOnly["Readグループのみ"]
    ReadWrite -->|Yes| ReadAndWrite["Read + Writeグループ"]

    Intent --> Topic["トピック分析<br/>(キーワードマッチ)"]

    Topic -->|予定の話題| PlanGroup["planning グループ"]
    Topic -->|目標の話題| GoalGroup["goals_read グループ"]
    Topic -->|ノートの話題| NoteGroup["notes_read グループ"]
    Topic -->|分析の話題| AnalGroup["analytics グループ"]
    Topic -->|検索の話題| SearchGroup["search グループ"]
    Topic -->|Web検索| WebGroup["web グループ"]

    Core["core グループ<br/>(常に含む)"]

    Core --> Final["選択されたツールのみ送信"]
    PlanGroup --> Final
    GoalGroup --> Final
    NoteGroup --> Final
    AnalGroup --> Final
```

**ツールグループ一覧:**

| グループ | 種別 | 含まれるツール |
|---------|------|-------------|
| `core` | 常に含む | get_tasks, get_time_blocks, get_time_entries, get_memos |
| `planning` | Write | create/update/delete_time_block |
| `task` | Write | create/update/delete_task |
| `goals_read` | Read | get_goals_and_milestones |
| `goals_write` | Write | create/update/delete_goal, create/update/delete_milestone |
| `notes_read` | Read | get_notes |
| `notes_write` | Write | create/update_note, create_memo |
| `analytics` | Read | get_analytics_summary, get_daily_summary |
| `search` | Read/Write | semantic_search, keyword_search, hybrid_search, reindex_notes |
| `review` | Read/Write | get_reviews, get_review, generate_weekly_review |
| `memory` | Read/Write | get_user_memory, get_user_facts, add_user_fact |
| `patterns` | Read | get_user_patterns |
| `web` | Read | web_search, web_fetch |

**Situationベース静的選択:**

| Situation | 使用グループ |
|-----------|------------|
| `weekly` | core, review, notes_read, goals_read, search, patterns |
| `planning` | core, planning, task, goals_read, analytics, patterns |

---

## Direct Tools

### ツールインフラ

```mermaid
graph TB
    subgraph "定義"
        Decorator["@tool デコレータ<br/>name, description, input_schema"]
    end

    subgraph "レジストリ"
        Registry["ToolRegistry<br/>get_tool, get_all_tools<br/>execute_tool"]
        Schema["get_tools_api_schema<br/>→ Anthropic/Gemini形式"]
    end

    subgraph "実行"
        UserID["user_id 自動注入<br/>(AgentRunner)"]
        Execute["async execute_tool()"]
        Format["format_tool_result()<br/>→ スリム化文字列"]
    end

    Decorator --> Registry
    Registry --> Schema
    Registry --> Execute
    UserID --> Execute
    Execute --> Format
```

### ツールカテゴリ

| カテゴリ | ファイル | ツール数 | 主なツール |
|---------|--------|---------|-----------|
| **DB操作** | `db_tools.py` | 21 | get_tasks, create_task, get_time_blocks, create_time_block, get_notes, create_note |
| **メモリ** | `memory_tools.py` | 4 | get_user_memory, get_user_facts, add_user_fact, get_recent_interactions |
| **検索** | `search_tools.py` | 6 | semantic_search, keyword_search, hybrid_search, search_notes, reindex_notes |
| **レビュー** | `review_tools.py` | 3 | get_reviews, get_review, generate_weekly_review |
| **分析** | `analytics_tools.py` | 2 | get_analytics_summary, get_daily_summary |
| **パターン** | `pattern_tools.py` | 1 | get_user_patterns |
| **Web** | `web_tools.py` | 2 | web_search (Tavily Search), web_fetch (Tavily Extract) |

### DB操作ツールのタイムゾーン処理

ツール入力はローカル日時（LLMの使いやすさ優先）。内部で `user_settings` からタイムゾーンを取得しUTCに変換してDB保存:

```mermaid
flowchart LR
    LLM["LLM が呼び出し<br/>date: 2026-01-27<br/>start_time: 09:00"] --> Tool["create_time_block"]
    Tool --> TZ["user_settings から<br/>timezone取得"]
    TZ --> Convert["ローカル→UTC変換<br/>→ 2026-01-27T00:00:00Z"]
    Convert --> DB["PostgreSQLに<br/>TIMESTAMPTZ保存"]
```

### パターン分析ツール

`get_user_patterns` が返す行動パターン統計:

| メトリクス | 説明 |
|-----------|------|
| `productivityByHour` | 時間帯別の実績分数・件数・計画実行率 |
| `planAccuracy` | 実績/計画（全体） |
| `overcommitRatio` | 計画/実績（1.0超 = 計画過多） |
| `chronicOverdueTasks` | 未完了+期限超過+作成2週間以上のタスク |
| `goalVelocity` | 目標別の週次推移とトレンド (accelerating/stable/declining/stalled) |
| `avgSessionMinutes` | 平均作業セッション時間 |

### Web検索ツール (Tavily)

| ツール | 機能 | Lakehouse連携 |
|-------|------|-------------|
| `web_search` | キーワード検索、検索深度・最大結果数指定可 | `bronze.external_tool_results_raw` に記録 |
| `web_fetch` | URL指定でコンテンツ抽出（最大10,000文字） | 同上 |

Lakehouse書き込みはfire & forget。失敗はログのみで応答をブロックしない。`LAKEHOUSE_ENABLED=false` で全操作no-op。

---

## コンテキスト管理

### コンテキスト選択フロー

```mermaid
flowchart TB
    subgraph "入力"
        Explicit["明示的Situationパラメータ"]
        Default["デフォルト: chat"]
    end

    subgraph "コンテキスト読込"
        Query["ai_contextsテーブルをクエリ<br/>(situation + is_active)"]
        HasExp{"experiment_id?"}
        ABSelect["SHA256ハッシュで<br/>決定論的バケット選択"]
        DefaultCtx["is_default=trueを取得"]
    end

    subgraph "変数置換"
        Variables["{user_memory}<br/>{today_schedule}<br/>{pending_tasks}<br/>{recent_context}<br/>{weekly_summary}<br/>{goal_progress}<br/>{user_patterns}"]
    end

    subgraph "出力"
        Context["AIContext<br/>system_prompt + tools + settings"]
    end

    Explicit --> Query
    Default --> Query
    Query --> HasExp
    HasExp -->|Yes| ABSelect --> Variables
    HasExp -->|No| DefaultCtx --> Variables
    Variables --> Context
```

### 動的プロンプト変数

| 変数 | データソース | 内容 |
|------|------------|------|
| `{user_memory}` | user_memory テーブル | プロフィール要約 + 強み + 成長領域 |
| `{today_schedule}` | time_blocks テーブル | 今日のタイムブロック一覧 |
| `{today_entries}` | time_entries テーブル | 今日の実績一覧 |
| `{pending_tasks}` | tasks テーブル | 未完了タスク一覧 |
| `{recent_context}` | ai_interactions テーブル | 最近3件のやり取り |
| `{weekly_summary}` | analytics クエリ | 今週のサマリー統計 |
| `{goal_progress}` | goals + milestones | 目標・マイルストーン進捗 |
| `{user_patterns}` | パターン分析クエリ | 生産性ピーク、計画精度、目標トレンド |

### A/Bテスト

同一situationに複数のコンテキストを紐付け、`experiment_id` + `traffic_weight` で分割:

```mermaid
flowchart LR
    UserID["user_id + experiment_id"] --> Hash["SHA256ハッシュ"]
    Hash --> Bucket["バケット 0-99"]
    Bucket --> Select{"累積重みで<br/>コンテキスト選択"}
    Select -->|0-49| CtxA["コンテキストA<br/>(weight: 50)"]
    Select -->|50-99| CtxB["コンテキストB<br/>(weight: 50)"]
```

同一ユーザー+実験には常に同じバリアントが割り当てられる（決定論的）。

---

## メモリとファクト抽出

### メモリ構築パイプライン

```mermaid
flowchart LR
    subgraph "リアルタイム (チャットごと非同期)"
        Chat["ユーザーチャット"]
        Log["InteractionLogger<br/>→ ai_interactions"]
        Extract["FactExtractor<br/>→ user_facts"]
        Profile["ProfileSummarizer<br/>→ user_memory"]
    end

    subgraph "次回チャット"
        Variable["{user_memory} 変数<br/>としてプロンプトに注入"]
    end

    Chat --> Log
    Log -.->|async| Extract
    Extract -.->|新factあれば| Profile
    Profile --> Variable --> Chat
```

### ファクト抽出の詳細

```mermaid
sequenceDiagram
    participant Chat as POST /chat
    participant Logger as InteractionLogger
    participant Extractor as FactExtractor
    participant LLM as LLM API
    participant DB as PostgreSQL

    Chat->>Logger: log(user_input, ai_output)
    Logger->>DB: INSERT INTO ai_interactions
    Logger-->>Chat: interaction_id

    Note over Chat,DB: 非同期バックグラウンドタスク
    Chat--)Extractor: extract_and_save()

    Extractor->>LLM: 抽出プロンプト + 会話
    LLM-->>Extractor: ファクトJSON配列

    loop 各ファクト
        Extractor->>Extractor: type検証 + confidence >= 0.5
        Extractor->>DB: 重複チェック
        Extractor->>DB: INSERT INTO user_facts
    end

    Note over Extractor,DB: 新ファクトがあれば即時
    Extractor->>LLM: プロフィール要約生成
    Extractor->>DB: UPSERT user_memory
```

### ファクトタイプ

| タイプ | 説明 | 例 |
|-------|------|-----|
| `preference` | 好み | "早朝に作業するのが好き" |
| `habit` | 習慣 | "毎朝7時に起きる" |
| `skill` | スキル | "Pythonが得意" |
| `goal` | 目標 | "来月までにリリース" |
| `constraint` | 制約 | "平日は19時以降のみ" |

### プロフィール要約 (user_memory)

| フィールド | 説明 | ソース |
|-----------|------|--------|
| `profile_summary` | プロフィール要約（最大300文字） | LLMで生成 |
| `strengths` | 強みリスト | skillタイプ、confidence >= 0.7 |
| `growth_areas` | 成長領域リスト | goal/constraintタイプ |

---

## 埋め込みと検索

### 検索アーキテクチャ

```mermaid
graph TB
    subgraph "インデックスパイプライン"
        Note["ノートコンテンツ"] --> Chunker["Chunker<br/>テキスト分割"]
        Chunker --> Embed["OpenAI<br/>text-embedding-3-small<br/>(1536次元)"]
        Embed --> Store["note_content_chunks<br/>(pgvector)"]
    end

    subgraph "検索ツール"
        Semantic["semantic_search<br/>ベクトル類似度<br/>(cosine距離)"]
        Keyword["keyword_search<br/>全文検索<br/>(tsvector)"]
        Hybrid["hybrid_search<br/>複合スコア<br/>(重み: 0.7 semantic)"]
    end

    Store --> Semantic
    Store --> Keyword
    Store --> Hybrid
```

### 検索手法

| ツール | 手法 | スコア計算 |
|-------|------|----------|
| `semantic_search` | pgvectorのcosine距離 | `1 - (embedding <=> query_embedding)` |
| `keyword_search` | PostgreSQL全文検索 | `ts_rank(to_tsvector('simple', text), query)` |
| `hybrid_search` | 上記2つを組み合わせ | `semantic_score * 0.7 + keyword_score * 0.3` |
| `search_notes` | notesテーブル直接検索 | `ts_rank` on title + content |

---

## APIエンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/health` | ヘルスチェック |
| POST | `/chat/stream` | SSEストリーミングチャット |
| POST | `/chat` | 非ストリーミングチャット |
| POST | `/advice` | 朝の計画アドバイス |
| POST | `/reflect` | 夕方の振り返り |
| POST | `/review` | 週次レビュー |
| POST | `/ai/reviews/generate` | レビュー生成 |
| GET | `/ai/reviews` | レビュー一覧 |
| GET | `/ai/reviews/{id}` | レビュー詳細 |
| POST | `/ai/ask` | 質問応答 |
| POST | `/interactions/{id}/feedback` | フィードバック送信 (1-5評価) |

認証: `Authorization: Bearer <token>` → JWT (HS256) から `user_id` を抽出。

---

## 設定と環境変数

### 主要設定

| カテゴリ | 環境変数 | 説明 |
|---------|---------|------|
| **AIプロバイダ** | `AI_PROVIDER` | `anthropic` or `google` (デフォルト: `google`) |
| **Anthropic** | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Claude API (デフォルト: `claude-sonnet-4-20250514`) |
| **Google** | `GOOGLE_API_KEY`, `GOOGLE_MODEL` | Gemini API (デフォルト: `gemini-2.0-flash`) |
| **埋め込み** | `OPENAI_API_KEY` | OpenAI text-embedding-3-small |
| **DB** | `DATABASE_URL` or `DB_HOST/PORT/USER/PASSWORD/NAME` | PostgreSQL 16 |
| **ストレージ** | `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | MinIO (ノートコンテンツ読み取り) |
| **Web検索** | `TAVILY_API_KEY` | Tavily API (web_search/web_fetch) |
| **Lakehouse** | `LAKEHOUSE_ENABLED`, `NESSIE_URI` | Iceberg Bronze書き込み (オプション) |
| **OTel** | `OTEL_ENABLED`, `OTEL_COLLECTOR_URL` | OpenTelemetry |
| **サーバー** | `SERVER_PORT`, `SERVER_ENV` | FastAPI (デフォルト: 8089, development) |

### 本番バリデーション

`SERVER_ENV=production` 時に以下を自動検証:
- APIキーが開発用デフォルトでないこと
- JWTシークレットが安全であること
- DBパスワードがデフォルトでないこと

---

## テレメトリ

### 構造化ログイベント

各実行フェーズで構造化JSONログを出力。Lokiに収集されフロントエンドのInteraction Explorerで可視化:

```mermaid
flowchart LR
    subgraph "エージェント実行"
        Start["agent.prompt<br/>(モデル, ツール数, コンテキスト)"]
        SysPrompt["agent.system_prompt<br/>(プロンプト全文)"]
        Turn["agent.turn<br/>(トークン, キャッシュヒット)"]
        ToolCall["agent.tool_call<br/>(ツール名, 入出力, 成否)"]
        Complete["agent.complete<br/>(総ターン数, 総トークン)"]
    end

    Start --> SysPrompt --> Turn --> ToolCall --> Turn
    Turn --> Complete
```

### GenAIメトリクス (OpenTelemetry)

| メトリクス | 種別 | 説明 |
|-----------|------|------|
| `gen_ai.client.token.usage` | Counter | トークン消費量 (input/output) |
| `gen_ai.client.operation.duration` | Histogram | エージェント実行時間 (秒) |
| `gen_ai.client.operation.count` | Counter | エージェント実行回数 |

自動計装: FastAPI (HTTPスパン)、asyncpg (DBスパン)、httpx (外部HTTPスパン)。`OTEL_ENABLED=false` で全no-op。
