# AI Service Architecture

## 概要

kensan-aiサービスのアーキテクチャ設計。拡張性、分析可能性、ユーザーメモリを重視。

## 決定事項

### Direct Tools方式を採用（MCP不採用）

**理由:**
- シングルユーザーアプリでMCPの共有メリットが薄い
- 全エージェントが同一Pythonプロセス内で完結
- シンプルさ優先（IPC不要、デプロイ簡単）
- 必要になれば後からMCP化可能（同じtool関数をラップするだけ）

```
┌─────────────────────────────────────────────────────────────────┐
│  MCP方式（不採用）                Direct Tools方式（採用）       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Agent ──▶ MCP Server ──▶ DB     Agent ──▶ Tools ──▶ DB        │
│           (別プロセス)                    (同一プロセス)         │
│                                                                 │
│  ✗ IPC オーバーヘッド            ✓ 直接呼び出しで高速           │
│  ✗ 複雑なデプロイ                ✓ シンプルなデプロイ           │
│  ○ 外部クライアント対応          ✗ 内部専用                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  AIChat Component  │  Weekly Review  │  Morning Advice  │  Evening Reflect  │
└─────────┬───────────────────────────────────────────────────────────────────┘
          │
          │ HTTP/WebSocket
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI Gateway (FastAPI)                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   /chat      │  │  /review     │  │  /advice     │  │  /reflect    │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         └─────────────────┴─────────────────┴─────────────────┘             │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Context Resolver                                  │    │
│  │  ・シチュエーションに応じたコンテキスト選択                           │    │
│  │  ・ユーザーメモリの注入                                               │    │
│  │  ・時間帯/曜日/過去の傾向を考慮                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Agent Orchestrator                                │    │
│  │  ・Claude Agent SDK Client                                           │    │
│  │  ・適切なエージェントを選択・実行                                     │    │
│  │  ・Direct Tools経由でデータアクセス                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Direct Tools (同一プロセス)                     │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │    │
│  │  │  DB Tools   │  │ Storage     │  │ Search      │  │ Memory    │  │    │
│  │  │  (CRUD)     │  │ Tools       │  │ Tools       │  │ Tools     │  │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │    │
│  └─────────┼────────────────┼────────────────┼───────────────┼────────┘    │
│            │                │                │               │              │
└────────────┼────────────────┼────────────────┼───────────────┼──────────────┘
             │                │                │               │
             ▼                ▼                ▼               ▼
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │  PostgreSQL  │ │ Cloudflare   │ │  PostgreSQL  │ │  PostgreSQL  │
      │  (kensan-db) │ │ R2 (S3互換)  │ │  + pgvector  │ │  (memory)    │
      └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

---

## コンポーネント詳細

### 1. Context Resolver（コンテキスト解決器）

```
┌─────────────────────────────────────────────────────────────────┐
│                      Context Resolver                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Input: user_id, situation, user_prompt                         │
│                                                                 │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │ Situation       │     │ Context         │                   │
│  │ Detector        │────▶│ Templates       │                   │
│  │                 │     │ (YAML)          │                   │
│  │ ・morning       │     │                 │                   │
│  │ ・evening       │     │ ・system_prompt │                   │
│  │ ・weekly_review │     │ ・allowed_tools │                   │
│  │ ・chat          │     │ ・max_turns     │                   │
│  │ ・task_help     │     │ ・temperature   │                   │
│  └─────────────────┘     └─────────────────┘                   │
│           │                       │                             │
│           ▼                       ▼                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Context Builder                             │   │
│  │                                                          │   │
│  │  base_context = load_template(situation)                 │   │
│  │  user_memory = get_user_memory(user_id)                  │   │
│  │  recent_context = get_recent_interactions(user_id)       │   │
│  │                                                          │   │
│  │  final_context = {                                       │   │
│  │    system_prompt: base_context.prompt                    │   │
│  │                   + user_memory.summary                  │   │
│  │                   + recent_context.summary,              │   │
│  │    tools: base_context.tools,                            │   │
│  │    ...                                                   │   │
│  │  }                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Output: ResolvedContext                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**コンテキストテンプレート例（YAML）:**
```yaml
# contexts/morning.yaml
name: morning_advice
description: 朝の計画立案サポート
system_prompt: |
  あなたはKensanの朝アドバイザーです。
  ユーザーの目標とタスクを確認し、今日の計画を一緒に立てましょう。

  ## ユーザー情報
  {user_memory}

  ## 最近の傾向
  {recent_summary}

allowed_tools:
  - get_goals_and_milestones
  - get_tasks
  - get_today_timeblocks
  - create_timeblock

max_turns: 10
temperature: 0.7
```

---

### 2. Interaction Logger（ログ/分析基盤）

```
┌─────────────────────────────────────────────────────────────────┐
│                    Interaction Logger                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 ai_interactions テーブル                  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  id              UUID PRIMARY KEY                        │   │
│  │  user_id         UUID NOT NULL                           │   │
│  │  session_id      UUID NOT NULL                           │   │
│  │  situation       VARCHAR(50)  -- morning, evening, etc   │   │
│  │  context_version VARCHAR(20)  -- context template ver    │   │
│  │  user_input      TEXT                                    │   │
│  │  ai_output       TEXT                                    │   │
│  │  tool_calls      JSONB        -- 使用したツールのログ     │   │
│  │  tokens_input    INTEGER                                 │   │
│  │  tokens_output   INTEGER                                 │   │
│  │  latency_ms      INTEGER                                 │   │
│  │  rating          SMALLINT     -- ユーザー評価 (1-5)       │   │
│  │  feedback        TEXT         -- ユーザーフィードバック   │   │
│  │  created_at      TIMESTAMPTZ                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  分析クエリ例                             │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  -- シチュエーション別の満足度                            │   │
│  │  SELECT situation, AVG(rating)                           │   │
│  │  FROM ai_interactions                                    │   │
│  │  GROUP BY situation;                                     │   │
│  │                                                          │   │
│  │  -- 低評価の回答を確認                                    │   │
│  │  SELECT user_input, ai_output, feedback                  │   │
│  │  FROM ai_interactions                                    │   │
│  │  WHERE rating <= 2;                                      │   │
│  │                                                          │   │
│  │  -- ツール使用パターン                                    │   │
│  │  SELECT tool_calls->>'name', COUNT(*)                    │   │
│  │  FROM ai_interactions, jsonb_array_elements(tool_calls)  │   │
│  │  GROUP BY 1;                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. User Memory（ユーザーメモリ）

```
┌─────────────────────────────────────────────────────────────────┐
│                       User Memory                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 user_memory テーブル                      │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  user_id           UUID PRIMARY KEY                      │   │
│  │  profile_summary   TEXT    -- AIが生成したユーザー像      │   │
│  │  preferences       JSONB   -- 好み/設定                   │   │
│  │  strengths         TEXT[]  -- 強み                        │   │
│  │  growth_areas      TEXT[]  -- 成長領域                    │   │
│  │  communication     JSONB   -- コミュニケーションスタイル  │   │
│  │  last_updated      TIMESTAMPTZ                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                user_facts テーブル                        │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  id              UUID PRIMARY KEY                        │   │
│  │  user_id         UUID NOT NULL                           │   │
│  │  fact_type       VARCHAR(50)  -- preference, goal, etc   │   │
│  │  content         TEXT                                    │   │
│  │  source          VARCHAR(50)  -- explicit, inferred      │   │
│  │  confidence      FLOAT        -- 確信度 (0-1)            │   │
│  │  created_at      TIMESTAMPTZ                             │   │
│  │  expires_at      TIMESTAMPTZ  -- 時限的な事実用          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Memory更新フロー:                                               │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐           │
│  │ Interaction│───▶│ Fact       │───▶│ Profile    │           │
│  │ Logs       │    │ Extractor  │    │ Summarizer │           │
│  └────────────┘    └────────────┘    └────────────┘           │
│                                                                 │
│  例:                                                            │
│  Input: "いつも朝は集中力があるから難しいタスクを入れてる"      │
│  Extracted Fact: {                                              │
│    type: "preference",                                          │
│    content: "朝に集中力が高く、難しいタスクを好む",              │
│    source: "explicit",                                          │
│    confidence: 0.9                                              │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4. Direct Tools 一覧

```python
# tools/db.py - データベースアクセス
from claude_agent_sdk import tool

@tool
async def get_goals_and_milestones(user_id: str) -> dict:
    """目標とマイルストーンを取得"""
    ...

@tool
async def get_tasks(user_id: str, filters: dict = None) -> list:
    """タスク一覧を取得"""
    ...

@tool
async def get_timeblocks(user_id: str, date: str) -> list:
    """指定日のタイムブロックを取得"""
    ...

@tool
async def get_time_entries(user_id: str, start_date: str, end_date: str) -> list:
    """期間内の実績を取得"""
    ...

@tool
async def get_notes(user_id: str, note_type: str = None) -> list:
    """ノートを取得"""
    ...

@tool
async def get_user_stats(user_id: str, period: str) -> dict:
    """統計情報を取得"""
    ...

@tool
async def create_task(user_id: str, data: dict) -> dict:
    """タスクを作成"""
    ...

@tool
async def update_task(task_id: str, data: dict) -> dict:
    """タスクを更新"""
    ...

@tool
async def create_timeblock(user_id: str, data: dict) -> dict:
    """タイムブロックを作成"""
    ...

@tool
async def create_time_entry(user_id: str, data: dict) -> dict:
    """実績を記録"""
    ...

@tool
async def create_note(user_id: str, data: dict) -> dict:
    """ノートを作成"""
    ...
```

```python
# tools/storage.py - ファイルストレージ (R2)
@tool
async def upload_file(user_id: str, file: bytes, metadata: dict) -> dict:
    """ファイルをR2にアップロード"""
    ...

@tool
async def get_file(file_id: str) -> bytes:
    """ファイルを取得"""
    ...

@tool
async def list_files(user_id: str, filters: dict = None) -> list:
    """ファイル一覧を取得"""
    ...
```

```python
# tools/search.py - セマンティック検索 (pgvector)
@tool
async def semantic_search(user_id: str, query: str, limit: int = 10) -> list:
    """意味検索でノートを検索"""
    ...

@tool
async def hybrid_search(user_id: str, query: str, filters: dict = None) -> list:
    """BM25 + セマンティックのハイブリッド検索"""
    ...

@tool
async def get_similar_notes(note_id: str, limit: int = 5) -> list:
    """類似ノートを取得"""
    ...
```

```python
# tools/memory.py - ユーザーメモリ
@tool
async def get_user_memory(user_id: str) -> dict:
    """ユーザーメモリを取得"""
    ...

@tool
async def add_user_fact(user_id: str, fact: dict) -> dict:
    """ユーザーの事実を追加"""
    ...

@tool
async def get_recent_context(user_id: str, limit: int = 5) -> list:
    """最近のインタラクションコンテキストを取得"""
    ...
```

---

## データフロー

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          リクエストフロー                                 │
└──────────────────────────────────────────────────────────────────────────┘

User Request
    │
    ▼
┌─────────────────┐
│  AI Gateway     │
│  (FastAPI)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Context        │────▶│  memory tools   │  (1) ユーザー情報取得
│  Resolver       │     │                 │
└────────┬────────┘     └─────────────────┘
         │
         │ (2) コンテキスト解決
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Agent          │────▶│  Context        │  (3) テンプレート読込
│  Orchestrator   │     │  Templates      │
└────────┬────────┘     └─────────────────┘
         │
         │ (4) エージェント実行
         ▼
┌─────────────────┐
│  Claude Agent   │
│  SDK            │
└────────┬────────┘
         │
         │ (5) Tool呼び出し (0-N回) ← Direct Tools (同一プロセス)
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Direct Tools   │────▶│  PostgreSQL     │
│  (db/storage/   │     │  R2 / pgvector  │
│   search/memory)│     │                 │
└────────┬────────┘     └─────────────────┘
         │
         │ (6) レスポンス
         ▼
┌─────────────────┐
│  Interaction    │  (7) ログ保存
│  Logger         │
└────────┬────────┘
         │
         ▼
    User Response
```

---

## 実装フェーズ

### Phase 1: 基盤整備
- [ ] FastAPI Gateway 構築
- [ ] PostgreSQL接続（mockデータ置換）
- [ ] ai_interactions テーブル作成
- [ ] 基本ログ機能
- [ ] Direct Tools基盤（db tools）

### Phase 2: コンテキスト管理
- [ ] Context Templates (YAML)
- [ ] Context Resolver 実装
- [ ] シチュエーション検出

### Phase 3: ユーザーメモリ
- [ ] user_memory, user_facts テーブル
- [ ] Memory Tools 実装
- [ ] Fact Extractor（AIベース）

### Phase 4: Tools拡張
- [ ] Storage Tools: R2連携
- [ ] Search Tools: pgvector統合

### Phase 5: 分析・改善
- [ ] 分析ダッシュボード
- [ ] A/Bテスト基盤
- [ ] コンテキスト自動改善提案

---

## 議論ポイント

1. **コンテキスト管理**
   - YAMLファイルでGit管理（バージョン管理が容易）
   - 変更時はデプロイが必要

2. **ユーザーメモリ**
   - 自動抽出は明示的な発言から（推論は慎重に）
   - ユーザーが確認・削除できるUI必要

3. **ログ分析**
   - バッチ処理（日次でサマリー生成）
   - 保存期間: 90日（その後アーカイブ）

4. **セキュリティ**
   - user_idによるデータ分離
   - Tool内でuser_id検証必須
