# Kensan AIアーキテクチャ

KensanアプリケーションのためのDirect Toolsを使用したPython AIサービス。

---

## 目次

1. [概要](#概要)
2. [Direct Tools](#direct-tools)
3. [エージェント](#エージェント)
4. [コンテキスト管理](#コンテキスト管理)
5. [データベースクエリ](#データベースクエリ)
6. [埋め込みと検索](#埋め込みと検索)
7. [メモリとファクト抽出](#メモリとファクト抽出)
8. [APIエンドポイント](#apiエンドポイント)
9. [バッチ処理](#バッチ処理)
10. [設定](#設定)
11. [主要パターン](#主要パターン)
12. [開発](#開発)

---

## 概要

### アーキテクチャスタイル
- **FastAPI** アプリケーション（非同期サポート）
- **エージェントベース** アーキテクチャ（ClaudeのDirect Tools / Function Calling使用）
- **コンテキスト認識** AI（状況別パーソナリティ選択）
- **メモリシステム**（ファクト抽出とプロフィール要約）

### 技術スタック

| コンポーネント | 技術 |
|--------------|------|
| フレームワーク | FastAPI |
| ランタイム | Python 3.12+ |
| AIモデル | Claude (Anthropic API) |
| 埋め込み | OpenAI text-embedding-3-small |
| データベース | PostgreSQL 16 + pgvector |
| 非同期DB | asyncpg |
| ストレージ | MinIO (S3互換、読み取り専用) |

### ディレクトリ構成

```
kensan-ai/
├── src/kensan_ai/
│   ├── main.py                    # FastAPIアプリエントリー
│   ├── config.py                  # 設定 (Pydantic BaseSettings)
│   ├── errors.py                  # 統一エラースキーマ
│   ├── agents/                    # エージェント実装
│   │   ├── base.py               # AgentRunnerコア（プロンプトキャッシング対応）
│   │   ├── message_history.py    # 会話メッセージ管理
│   │   ├── conversation_store.py # 会話ストア
│   │   ├── chat.py               # 汎用チャットエージェント（動的ツール選択）
│   │   └── weekly_review.py      # 週次レビューエージェント
│   ├── tools/                     # Direct Tools (38+ツール)
│   │   ├── base.py               # ツールレジストリ & デコレータ
│   │   ├── db_tools.py           # データベース操作 (21ツール)
│   │   ├── memory_tools.py       # ユーザーメモリ (4ツール)
│   │   ├── search_tools.py       # セマンティック/キーワード検索 (6ツール)
│   │   ├── review_tools.py       # レビュー (3ツール)
│   │   ├── analytics_tools.py    # 分析 (2ツール)
│   │   └── web_tools.py          # 外部Web検索・取得 (2ツール: Tavily API)
│   ├── lakehouse/                 # Lakehouse連携
│   │   ├── __init__.py
│   │   └── writer.py             # Fire & forget Bronze書き込み
│   ├── storage/                   # ストレージクライアント
│   │   └── minio_client.py       # MinIO読み取りクライアント
│   ├── indexing/                   # インデックスパイプライン
│   │   ├── chunker.py            # コンテンツチャンク分割
│   │   └── pipeline.py           # リインデックスパイプライン
│   ├── lib/                       # 共有ユーティリティ
│   │   └── parsers.py            # UUID、日付、時刻パース
│   ├── context/                   # AIコンテキスト管理
│   │   ├── detector.py           # 状況検出
│   │   ├── resolver.py           # コンテキスト読み込み
│   │   ├── variable_replacer.py  # 動的プロンプト変数
│   │   └── ab_selector.py        # A/Bテスト
│   ├── db/                        # データベース層
│   │   ├── connection.py         # AsyncPGプール
│   │   └── queries/              # ドメインクエリ
│   ├── embeddings/                # ベクトル埋め込み
│   │   └── service.py            # OpenAI埋め込みサービス
│   ├── extraction/                # ファクト抽出
│   │   └── fact_extractor.py     # Claudeベース抽出
│   ├── logging/                   # インタラクションログ
│   │   └── interaction_logger.py
│   ├── api/                       # HTTP層
│   │   ├── routes.py             # エンドポイント
│   │   └── schemas.py            # Pydanticモデル
│   └── batch/                     # オフラインジョブ
│       ├── profile_summarizer.py
│       └── run_summarizer.py
├── tests/                         # テストスイート
│   ├── test_errors.py
│   ├── test_message_history.py
│   ├── test_parsers.py
│   ├── test_config.py
│   ├── test_chat.py             # ツール選択テスト (40テスト)
│   ├── test_chunker.py          # チャンク分割テスト (27テスト)
│   └── test_minio_client.py     # MinIOクライアントテスト (5テスト)
├── Dockerfile
├── pyproject.toml
└── README.md
```

### リクエスト処理フロー

```mermaid
flowchart TB
    subgraph "API層"
        Request[POST /chat]
        JWT[JWTからuserIDを抽出]
        Response[ChatResponseを返却]
    end

    subgraph "コンテキスト解決"
        Detect[状況を検出]
        Load[DBからAIコンテキストを読込]
        Replace[プロンプト内の{変数}を置換]
    end

    subgraph "エージェント実行ループ"
        Call[Claude APIを呼び出し]
        Check{レスポンスにtool_use?}
        Execute[ツールをローカル実行]
        Inject[argsにuser_idを注入]
        Append[ツール結果をメッセージに追加]
        Return[最終テキストを抽出]
    end

    subgraph "後処理"
        Log[ai_interactionsに記録]
        Extract[ファクトを非同期抽出]
    end

    Request --> JWT
    JWT --> Detect
    Detect --> Load
    Load --> Replace
    Replace --> Call

    Call --> Check
    Check -->|Yes| Inject
    Inject --> Execute
    Execute --> Append
    Append --> Call
    Check -->|No| Return

    Return --> Log
    Log -.->|async| Extract
    Log --> Response
```

---

## エラーハンドリング (`errors.py`)

一貫した例外処理のための統一エラースキーマ:

```python
# 基底エラークラス
class ToolError(Exception):
    """ツール実行失敗の基底エラー"""
    def __init__(self, message: str, details: dict | None = None):
        self.message = message
        self.details = details or {}

class ValidationError(ToolError):
    """無効な入力または引数エラー"""
    pass

class NotFoundError(ToolError):
    """リソース未検出エラー"""
    pass

class AuthenticationError(ToolError):
    """認証失敗"""
    pass

class AuthorizationError(ToolError):
    """権限拒否エラー"""
    pass

class DatabaseError(ToolError):
    """データベース操作失敗"""
    pass

class ExternalServiceError(ToolError):
    """外部API失敗 (Anthropic, OpenAI等)"""
    pass
```

**ツールでの使用例:**
```python
from kensan_ai.errors import ValidationError, NotFoundError

@tool(name="get_task", ...)
async def get_task(args: dict) -> dict:
    task_id = args.get("task_id")
    if not task_id:
        raise ValidationError("task_id is required")

    task = await db_get_task(task_id)
    if not task:
        raise NotFoundError(f"Task not found: {task_id}")

    return {"task": task}
```

**FastAPI例外ハンドラ:**
```python
@app.exception_handler(ToolError)
async def tool_error_handler(request, exc):
    status_code = 400 if isinstance(exc, ValidationError) else 500
    return JSONResponse(
        status_code=status_code,
        content={"error": exc.message, "details": exc.details}
    )
```

---

## 共有ユーティリティ (`lib/parsers.py`)

バリデーション付きの共通パースユーティリティ:

```python
# UUIDパース
def parse_uuid(value: str | None) -> UUID | None:
    """文字列をUUIDにパース、無効な場合はNoneを返す"""

def require_uuid(value: str | None, field: str = "id") -> UUID:
    """文字列をUUIDにパース、無効な場合はValidationErrorを発生"""

# 日付パース (YYYY-MM-DD)
def parse_date(value: str | None) -> date | None:
    """文字列を日付にパース、無効な場合はNoneを返す"""

def require_date(value: str | None, field: str = "date") -> date:
    """文字列を日付にパース、無効な場合はValidationErrorを発生"""

# 時刻パース (HH:MM または HH:MM:SS)
def parse_time(value: str | None) -> time | None:
    """文字列を時刻にパース、無効な場合はNoneを返す"""

def require_time(value: str | None, field: str = "time") -> time:
    """文字列を時刻にパース、無効な場合はValidationErrorを発生"""
```

**使用例:**
```python
from kensan_ai.lib.parsers import require_uuid, parse_date

task_id = require_uuid(args.get("task_id"), "task_id")  # ValidationErrorを発生
due_date = parse_date(args.get("due_date"))  # 無効な場合はNoneを返す
```

---

## Direct Tools

### ツール実行シーケンス

```mermaid
sequenceDiagram
    participant Claude as Claude API
    participant Agent as AgentRunner
    participant Registry as Tool Registry
    participant Tool as Tool Function
    participant DB as PostgreSQL

    Agent->>Claude: messages + tools schema
    Claude-->>Agent: tool_useブロック付きレスポンス

    loop 各tool_useに対して
        Agent->>Agent: argsにuser_idがあるか確認
        Agent->>Agent: 不足ならuser_idを注入
        Agent->>Registry: execute_tool(name, args)
        Registry->>Registry: get_tool(name)
        Registry->>Tool: await tool_func(args)
        Tool->>DB: SQLクエリ (user_idフィルタ付き)
        DB-->>Tool: 結果行
        Tool->>Tool: dictに変換
        Tool-->>Registry: {result: ...}
        Registry->>Registry: format_tool_result(result)
        Registry-->>Agent: フォーマット済み文字列
    end

    Agent->>Agent: tool_resultをメッセージに追加
    Agent->>Claude: 会話を継続
    Claude-->>Agent: 最終テキストレスポンス (end_turn)
```

### ツールインフラ (`tools/base.py`)

デコレータベースのツールレジストリ:

```python
@tool(
    name="get_tasks",
    description="タスク一覧を取得します。",
    input_schema={
        "properties": {
            "user_id": {"type": "string", "description": "ユーザーID"},
            "completed": {"type": "boolean", "description": "完了状態"},
        },
        "required": ["user_id"],
    },
)
async def get_tasks(args: dict[str, Any]) -> dict[str, Any]:
    user_id = args.get("user_id")
    tasks = await db_get_tasks(user_id, completed=args.get("completed"))
    return {"tasks": tasks}
```

**コア関数:**
```python
get_tool(name: str) -> ToolDefinition | None
get_all_tools() -> list[ToolDefinition]
get_tools_api_schema(tool_names?) -> list[dict]  # Anthropic API形式
execute_tool(name: str, args: dict) -> Any
format_tool_result(result: Any) -> str
```

### データベースツール (`db_tools.py`)

| ツール | 説明 | 書込 |
|-------|------|-----|
| `get_goals_and_milestones` | 目標とマイルストーン取得 | No |
| `get_tasks` | タスク取得 (フィルタ可) | No |
| `create_task` | タスク作成 | Yes |
| `update_task` | タスク更新 | Yes |
| `get_time_blocks` | 予定取得 | No |
| `create_time_block` | 予定作成 | Yes |
| `get_time_entries` | 作業実績取得 | No |
| `get_notes` | ノート取得 (タイプフィルタ可) | No |
| `create_note` | ノート作成 (データ駆動タイプ) | Yes |
| `get_routine_tasks` | ルーティンタスク取得 (曜日フィルタ可) | No |

**ノートツールのタイプ指定:**
`get_notes`と`create_note`の`type`パラメータはデータ駆動。ハードコードのenum制約はなく、`note_types`テーブルに登録された任意のslugを受け付ける（例: `diary`, `learning`, `general`, `book_review`）。

**例 - create_time_block:**
```python
@tool(
    name="create_time_block",
    description="新しいタイムブロック（計画）を作成します。",
    input_schema={
        "properties": {
            "user_id": {"type": "string"},
            "date": {"type": "string", "description": "YYYY-MM-DD（ローカル日付）"},
            "start_time": {"type": "string", "description": "HH:MM（ローカル時刻）"},
            "end_time": {"type": "string", "description": "HH:MM（ローカル時刻）"},
            "task_name": {"type": "string"},
            "goal_id": {"type": "string"},
            "is_routine": {"type": "boolean"},
        },
        "required": ["user_id", "date", "start_time", "end_time", "task_name"],
    },
)
async def create_time_block(args: dict) -> dict:
    # ツール入力はローカル日時（LLMの使いやすさ優先）
    # user_settingsからタイムゾーンを取得しUTCに変換してDB保存
    block = await db_create_time_block(
        start_datetime=_combine_to_utc(date, start_time),
        end_datetime=_combine_to_utc(date, end_time),
        ...
    )
    return {"timeBlock": block}
```

### メモリツール (`memory_tools.py`)

| ツール | 説明 |
|-------|------|
| `get_user_memory` | ユーザープロフィール取得 |
| `get_user_facts` | 抽出済みファクト取得 |
| `add_user_fact` | ファクト手動追加 |
| `get_recent_interactions` | 最近のやり取り取得 |

**ファクトタイプ:**
- `preference` - 好み (例: "早朝が好き")
- `habit` - 習慣 (例: "毎朝7時に起きる")
- `skill` - スキル (例: "Pythonが得意")
- `goal` - 目標 (例: "来月までにリリース")
- `constraint` - 制約 (例: "平日は19時以降のみ")

### 外部ツール (`web_tools.py`)

Web検索・取得のためのTavily API連携ツール。結果はオプションでLakehouse Bronze層に記録される。

| ツール | 説明 |
|-------|------|
| `web_search` | Web検索（Tavily Search API）。検索クエリ、最大結果数、検索深度を指定可能 |
| `web_fetch` | URL指定でWebページのコンテンツを取得・抽出（Tavily Extract API） |

**設定:**
- `TAVILY_API_KEY`: Tavily APIキー（未設定時はツール呼び出しでエラー）
- `LAKEHOUSE_ENABLED`: Lakehouse書き込みの有効化（デフォルト: `false`）

**Lakehouse連携:**
外部ツールの実行結果は `bronze.external_tool_results_raw` にfire & forgetでappendされる。書き込み失敗はログのみでツール応答をブロックしない。

```python
# web_search の結果フォーマット
{
    "query": "検索クエリ",
    "results": [
        {"title": "...", "url": "...", "content": "...", "score": 0.95}
    ],
    "result_count": 5
}

# web_fetch の結果フォーマット
{
    "url": "https://example.com",
    "content": "ページ本文（最大10,000文字）",
    "content_length": 12345
}
```

### Lakehouse Writer (`lakehouse/writer.py`)

Iceberg Bronze層への非同期書き込み基盤。全外部ツールが共有するシングルトン。

```python
from kensan_ai.lakehouse.writer import get_writer

writer = get_writer()
await writer.append_tool_result(
    tool_name="web_search",
    input_data="kubernetes best practices",
    result_json='{"results": [...]}',
    result_count=5,
    metadata={"search_depth": "basic"},
)
```

**設計方針:**
- `LAKEHOUSE_ENABLED=false` なら全操作がno-op（Nessie/MinIOなしでも動作）
- Nessie catalog接続はlazy init（初回呼び出し時に確立）
- ブロッキングI/Oは `run_in_executor` でイベントループを阻害しない
- 全エラーはログに記録し、例外は伝播しない

### 検索ツール (`search_tools.py`)

| ツール | 説明 |
|-------|------|
| `semantic_search` | ベクトル類似検索 - note_content_chunksテーブル (pgvector) |
| `keyword_search` | 全文検索 - note_content_chunksテーブル (tsvector) |
| `hybrid_search` | セマンティック + キーワード複合 - note_content_chunksテーブル |
| `search_notes` | キーワード全文検索 - notesテーブル (title + content) |
| `semantic_search_notes` | ベクトル類似検索 - notesテーブル (pgvector) |
| `reindex_notes` | pendingノートのチャンク分割 + embedding一括生成 |

**ハイブリッド検索アルゴリズム:**
```python
combined_score = semantic_score * weight + keyword_score * (1 - weight)
# デフォルト重み: 0.7 (セマンティック重視)
```

---

## エージェント

### MessageHistory (`agents/message_history.py`)

会話メッセージ履歴を管理（AgentRunnerからSRP抽出）:

```python
class MessageHistory:
    """スレッドセーフな会話メッセージストレージ"""

    def __init__(self):
        self._messages: list[dict] = []

    def add_user_message(self, content: str) -> None:
        """ユーザーメッセージを追加"""
        self._messages.append({"role": "user", "content": content})

    def add_assistant_message(self, content: list) -> None:
        """tool_useブロック付きアシスタントメッセージを追加"""
        self._messages.append({"role": "assistant", "content": content})

    def add_tool_results(self, results: list[dict]) -> None:
        """会話継続用のツール結果を追加"""
        self._messages.append({"role": "user", "content": results})

    def get_messages(self) -> list[dict]:
        """API呼び出し用のメッセージコピーを返す"""
        return self._messages.copy()

    def clear(self) -> None:
        """全メッセージをクリア"""
        self._messages.clear()

    def __len__(self) -> int:
        return len(self._messages)
```

### AgentRunner (`agents/base.py`)

マルチターンClaudeインタラクションのコアオーケストレータ:

```python
runner = AgentRunner(
    system_prompt="You are a helpful assistant...",
    allowed_tools=["get_tasks", "create_task"],
    max_turns=10,
    temperature=0.7,
)

result = await runner.run(
    user_message="明日の予定を作って",
    user_id="user-uuid",
)

print(result.text)        # 最終レスポンス
print(result.tool_calls)  # 実行されたツールのリスト
print(result.tokens_input, result.tokens_output)
```

**実行フロー:**
1. システムプロンプト + ツールでClaudeを呼び出し
2. レスポンスに`tool_use`がある場合:
   - 各ツールをローカルで実行
   - `user_id`を自動注入
   - 結果を会話に追加
   - ループを継続
3. `end_turn`またはツールなし → 結果を返却

**Anthropic Prompt Caching:**

API呼び出しのトークンコストを削減するため、ツール定義とシステムプロンプトに`cache_control`を付与:

```python
def _get_tools_schema(self) -> list[dict]:
    """最後のツール定義に cache_control を追加"""
    tools = get_tools_api_schema(self.allowed_tools)
    if tools:
        tools[-1]["cache_control"] = {"type": "ephemeral"}
    return tools

def _get_system_blocks(self) -> list[dict]:
    """システムプロンプトを cache_control 付きコンテンツブロックで返す"""
    return [{
        "type": "text",
        "text": self.system_prompt,
        "cache_control": {"type": "ephemeral"},
    }]
```

キャッシュヒット時はTurn 2以降の入力トークンコストが90%削減される。キャッシュトークン数はログに記録:
- `cache_creation_input_tokens`: キャッシュ作成時のトークン数
- `cache_read_input_tokens`: キャッシュヒット時のトークン数

**ツール結果スリム化:**

ツール結果はターンごとに会話全体に含まれるため、不要なフィールドを除外してトークンを節約:
- UUIDの除外（ネストされたオブジェクトのID）
- descriptionフィールドの除外
- コンテンツの切り詰め（メモ/ノート: 300文字）
- ネスト構造のフラット化（`goal.name` → `goalName`）

**ストリーミング:**
```python
async for chunk in runner.stream(user_message, user_id):
    print(chunk, end="")  # リアルタイムテキスト出力
```

### チャットエージェント (`agents/chat.py`)

タスク/時間管理を伴う汎用会話。動的ツール選択によりトークンを節約:

```python
SYSTEM_PROMPT = """あなたはKensanアプリのAIアシスタントです。..."""

ALLOWED_TOOLS = [
    # Read tools (13)
    "get_goals_and_milestones", "get_tasks", "get_time_blocks", ...
    # Write tools (14)
    "create_task", "update_task", "delete_task", ...
]
```

#### 動的ツール選択

全ツールを毎回送信するとトークンコストが増大するため、`select_tools()`がメッセージ意図に基づき必要なツールのみを選択:

```python
def select_tools(message, base_tools, situation="auto", context_keys=None) -> list[str]:
    """situation とメッセージ意図からツールグループを選択し、必要なツールだけを返す。"""
```

**ツールグループ:**

| グループ | ツール | 種別 |
|---------|--------|------|
| `core` | get_tasks, get_time_blocks, get_time_entries, get_memos | 常に含む |
| `planning` | create/update/delete_time_block | Write |
| `task` | create/update/delete_task | Write |
| `goals_read` | get_goals_and_milestones | Read |
| `goals_write` | create/update/delete_goal, create/update/delete_milestone | Write |
| `notes_read` | get_notes | Read |
| `notes_write` | create/update_note, create_memo | Write |
| `analytics` | get_analytics_summary, get_daily_summary, get_goals_and_milestones | Read |
| `search` | semantic_search, keyword_search, hybrid_search, reindex_notes | Read/Write |
| `review` | get_reviews, get_review, generate_weekly_review | Read/Write |
| `memory` | get_user_memory, get_user_facts, get_recent_interactions, add_user_fact | Read/Write |
| `web` | web_search, web_fetch | Read |

**Read/Write意図分離:**

Writeツールは明示的な書き込みキーワード（「作って」「追加して」「削除して」等）がある場合のみ選択される:

```python
WRITE_KEYWORDS = ["作って", "追加して", "入れて", "変更して", "削除して", "インデックス", ...]

# 例: "このままで目標達成できそう？" → Read only → 7 tools (Write除外)
# 例: "明日の予定を作って" → Read + Write → planning グループ追加
# 例: "ノートをインデックスして" → Read + Write → search グループ (reindex_notes含む)
```

**Situationベース選択:**

明示的situationが指定された場合は静的グループを使用:

| Situation | グループ |
|-----------|---------|
| `weekly` | core, review, notes_read, goals_read, search |
| `morning` | core, planning, task, goals_read, goals_write |
| `evening` | core, analytics, notes_read, notes_write, memory |

**コンテキスト除外:**

フロントから渡されたcontextキーに対応するツールを除外（データ重複取得防止）:

```python
CONTEXT_EXCLUDES_TOOLS = {
    "週間サマリー": ["get_analytics_summary", "get_daily_summary"],
    "タスク一覧": ["get_tasks"],
    ...
}
```

### 週次レビューエージェント (`agents/weekly_review.py`)

構造化された振り返り:

```python
SYSTEM_PROMPT = """
週次レビューを行います。以下の観点で分析してください：
1. 目標への進捗
2. 今週の成果
3. 改善点
4. 来週へのアドバイス
"""

# 出力パース
def _parse_review_response(text: str) -> ReviewData:
    # セクションを抽出: summary, good_points, improvement_points, advice
    # 箇条書きを検出: -, •, ・, ✓, →
```

**レスポンス形式:**
```
### 今週の振り返り
(サマリー)

### よかった点
- ポイント1
- ポイント2

### 改善点
- ポイント1

### 来週へのアドバイス
- アドバイス1
```

---

## コンテキスト管理

### コンテキスト選択フロー

```mermaid
flowchart TB
    subgraph 入力
        Time[現在時刻 JST]
        Explicit[明示的Situationパラメータ]
    end

    subgraph "状況検出"
        HasExplicit{明示指定あり?}
        Morning{05:00-10:00?}
        Evening{17:00-22:00?}
        Default[デフォルト: chat]
    end

    subgraph "コンテキスト読込"
        Query[ai_contextsテーブルをクエリ]
        HasExperiment{experiment_id?}
        ABSelect[重みでA/B選択]
        DefaultCtx[is_default=trueを取得]
    end

    subgraph "変数置換"
        UserMemory["{user_memory}"]
        TodaySchedule["{today_schedule}"]
        PendingTasks["{pending_tasks}"]
        RecentContext["{recent_context}"]
    end

    subgraph 出力
        Context[AIContext準備完了]
    end

    Explicit --> HasExplicit
    Time --> HasExplicit
    HasExplicit -->|Yes| Query
    HasExplicit -->|No| Morning
    Morning -->|Yes, morning| Query
    Morning -->|No| Evening
    Evening -->|Yes, evening| Query
    Evening -->|No| Default
    Default --> Query

    Query --> HasExperiment
    HasExperiment -->|Yes| ABSelect
    HasExperiment -->|No| DefaultCtx
    ABSelect --> UserMemory
    DefaultCtx --> UserMemory

    UserMemory --> TodaySchedule
    TodaySchedule --> PendingTasks
    PendingTasks --> RecentContext
    RecentContext --> Context
```

### 状況検出 (`context/detector.py`)

時刻ベースのコンテキスト選択:

```python
class Situation(Enum):
    MORNING = "morning"   # 05:00-10:00
    EVENING = "evening"   # 17:00-22:00
    WEEKLY = "weekly"     # 明示指定のみ
    CHAT = "chat"         # デフォルト

def detect_situation(
    explicit: str | None = None,
    timezone: str = "Asia/Tokyo"
) -> Situation:
    if explicit:
        return Situation(explicit)

    hour = datetime.now(ZoneInfo(timezone)).hour
    if 5 <= hour < 10:
        return Situation.MORNING
    elif 17 <= hour < 22:
        return Situation.EVENING
    return Situation.CHAT
```

### コンテキストリゾルバ (`context/resolver.py`)

データベースからAI設定を読み込み:

```python
async def get_context(
    situation: Situation,
    user_id: str,
    experiment_id: str | None = None
) -> AIContext:
    # 1. experiment_idがあれば → A/Bテスト選択
    # 2. そうでなければ → situationのデフォルトコンテキスト
    # 3. 変数置換を適用
    return context
```

**データベーススキーマ (`ai_contexts`):**
```sql
id UUID PRIMARY KEY
name VARCHAR(100)
situation VARCHAR(20)  -- chat/morning/evening/weekly
system_prompt TEXT     -- {変数}を含む可能性あり
allowed_tools TEXT[]   -- ツール名
max_turns INTEGER
temperature FLOAT
experiment_id UUID     -- A/Bテスト用
traffic_weight INTEGER
is_default BOOLEAN
is_active BOOLEAN
```

### 変数置換 (`context/variable_replacer.py`)

動的プロンプトパーソナライゼーション:

```python
SUPPORTED_VARIABLES = {
    "user_memory",      # プロフィール要約 + 強み
    "today_schedule",   # 今日のタイムブロック
    "pending_tasks",    # 未完了タスク
    "recent_context",   # 最近3件のやり取り
}

# 変数付きプロンプト例
system_prompt = """
{user_memory}

今日の予定:
{today_schedule}

未完了タスク:
{pending_tasks}
"""

# 置換後
system_prompt = """
Yu様はKubernetesとGo開発に興味があります。
強み: インフラ構築、問題解決
成長領域: 英語学習

今日の予定:
- 09:00〜10:00: CKA学習 [GK]
- 14:00〜16:00: Kensan開発 [OSS]

未完了タスク:
- CKA模擬試験 (期限: 2026-01-25)
- ブログ記事作成 (期限: なし)
"""
```

### A/Bテスト (`context/ab_selector.py`)

決定論的トラフィック割り当て:

```python
def select_context(
    user_id: str,
    experiment_id: str,
    contexts: list[AIContext]
) -> AIContext:
    # 決定論的バケット用にSHA256ハッシュ
    bucket = int(sha256(f"{user_id}:{experiment_id}").hexdigest()[:4], 16) % 100

    # 累積重みでコンテキストを検索
    cumulative = 0
    for ctx in contexts:
        cumulative += ctx.traffic_weight
        if bucket < cumulative:
            return ctx
```

---

## データベースクエリ

### コネクションプール (`db/connection.py`)

```python
# シングルトンプール (min_size=2, max_size=10)
async def get_pool() -> asyncpg.Pool

# コネクション用コンテキストマネージャ
async with get_connection() as conn:
    rows = await conn.fetch("SELECT ...")
```

### クエリモジュール (`db/queries/`)

**goals.py:**
```python
async def get_goals_and_milestones(user_id: UUID) -> list[dict]:
    # マイルストーンとタスク数をネストした目標を返す
    return [
        {
            "id": "...",
            "name": "GK取得",
            "color": "#0EA5E9",
            "milestones": [
                {
                    "id": "...",
                    "name": "CKA合格",
                    "status": "active",
                    "taskCount": {"total": 10, "completed": 3}
                }
            ]
        }
    ]
```

**tasks.py:**
```python
async def get_tasks(
    user_id: UUID,
    milestone_id: UUID | None = None,
    completed: bool | None = None,
    due_date: date | None = None
) -> list[dict]

async def create_task(user_id, name, milestone_id?, estimated_minutes?, due_date?)
async def update_task(task_id, user_id, name?, completed?, due_date?)
```

**time_blocks.py / time_entries.py:**
```python
async def get_time_blocks(
    pool,
    user_id: UUID,
    start_datetime: datetime | None = None,  # UTC
    end_datetime: datetime | None = None      # UTC
) -> list[dict]
# 返却: {"id", "startDatetime" (ISO), "endDatetime" (ISO), "taskName", ...}

async def create_time_block(
    pool,
    user_id, start_datetime, end_datetime, task_name,
    task_id?, milestone_id?, goal_id?, goal_color?, is_routine?
)
# start_datetime/end_datetime は datetime オブジェクト（UTC）
```

---

## 埋め込みと検索

### 埋め込みサービス (`embeddings/service.py`)

OpenAI埋め込みラッパー:

```python
class EmbeddingService:
    MODEL = "text-embedding-3-small"  # 1536次元

    async def generate_embedding(text: str) -> list[float]
    async def generate_embeddings(texts: list[str]) -> list[list[float]]
```

**機能:**
- 遅延初期化
- テキスト切り詰め (最大16000文字)
- バッチ処理

### 検索実装

**note_content_chunksテーブル:**
```sql
id UUID PRIMARY KEY
note_id UUID
user_id UUID
chunk_index INTEGER
chunk_text TEXT
embedding vector(1536)    -- pgvector
created_at TIMESTAMP
```

**セマンティック検索:**
```sql
SELECT id, note_id, chunk_text,
       1 - (embedding <=> $2) as similarity
FROM note_content_chunks
WHERE user_id = $1
ORDER BY embedding <=> $2
LIMIT $3
```

**キーワード検索:**
```sql
SELECT id, note_id, chunk_text,
       ts_rank(to_tsvector('simple', chunk_text), query) as rank
FROM note_content_chunks, plainto_tsquery('simple', $2) query
WHERE user_id = $1
  AND to_tsvector('simple', chunk_text) @@ query
ORDER BY rank DESC
```

**ハイブリッド検索:**
```sql
WITH semantic AS (...),
     keyword AS (...)
SELECT s.id, s.name,
       (s.similarity * $weight + COALESCE(k.rank, 0) * (1 - $weight)) as score
FROM semantic s
LEFT JOIN keyword k ON s.id = k.id
ORDER BY score DESC
```

---

## メモリとファクト抽出

### メモリ構築パイプライン

```mermaid
flowchart LR
    subgraph "リアルタイム (チャットごと)"
        Chat[ユーザーチャット]
        Logger[InteractionLogger]
        Extractor[FactExtractor]
    end

    subgraph "ストレージ"
        Interactions[(ai_interactions)]
        Facts[(user_facts)]
        Memory[(user_memory)]
    end

    subgraph "バッチ (夜間)"
        Summarizer[ProfileSummarizer]
    end

    subgraph "将来のチャット"
        Variable["{user_memory}" 変数]
        Prompt[システムプロンプト]
    end

    Chat --> Logger
    Logger --> Interactions
    Logger -.->|async| Extractor
    Extractor --> Facts

    Facts --> Summarizer
    Summarizer --> Memory

    Memory --> Variable
    Variable --> Prompt
    Prompt --> Chat
```

### ファクト抽出詳細

```mermaid
sequenceDiagram
    participant Chat as POST /chat
    participant Logger as InteractionLogger
    participant Extractor as FactExtractor
    participant Claude as Claude API
    participant DB as PostgreSQL

    Chat->>Logger: log(user_input, ai_output, ...)
    Logger->>DB: INSERT INTO ai_interactions
    DB-->>Logger: interaction_id
    Logger-->>Chat: interaction_id

    Note over Chat,DB: 非同期バックグラウンドタスク
    Chat--)Extractor: extract_and_save(user_id, user_input, ai_output, interaction_id)

    Extractor->>Claude: 抽出プロンプト + 会話
    Claude-->>Extractor: ファクトのJSON配列

    loop 各ファクトに対して
        Extractor->>Extractor: fact_typeをバリデート
        Extractor->>Extractor: confidence >= 0.5を確認
        Extractor->>DB: 重複をチェック
        Extractor->>DB: INSERT INTO user_facts
    end
```

### ファクト抽出器 (`extraction/fact_extractor.py`)

会話からの自動抽出:

```python
class FactExtractor:
    VALID_TYPES = ["preference", "habit", "skill", "goal", "constraint"]

    async def extract_and_save(
        user_id: str,
        user_input: str,
        ai_output: str,
        interaction_id: str
    ) -> list[dict]:
        # 1. 抽出プロンプトでClaudeを呼び出し
        # 2. JSONレスポンスをパース
        # 3. バリデーションと重複排除
        # 4. user_factsテーブルに保存
```

**抽出プロンプト:**
```
以下の会話からユーザーに関する事実を抽出してください。
明示的に述べられた事実のみ抽出し、推測は避けてください。

会話:
ユーザー: {user_input}

JSON形式で出力:
[
  {"type": "preference", "content": "...", "confidence": 0.9}
]
```

**データベーススキーマ (`user_facts`):**
```sql
id UUID PRIMARY KEY
user_id UUID
fact_type VARCHAR(50)
content TEXT
source VARCHAR(50)      -- ai_extraction/conversation
confidence FLOAT        -- 0.0-1.0
expires_at TIMESTAMP    -- オプション有効期限
source_interaction_id UUID
created_at TIMESTAMP
```

### インタラクションロガー (`logging/interaction_logger.py`)

全AI会話を記録:

```python
async def log(
    user_id: str,
    session_id: str,
    situation: str,
    user_input: str,
    ai_output: str,
    tool_calls: list[dict] | None = None,
    tokens_input: int | None = None,
    tokens_output: int | None = None,
    latency_ms: int | None = None,
    context_id: str | None = None
) -> str:  # interaction_idを返す

async def add_feedback(
    interaction_id: str,
    rating: int,      # 1-5
    feedback: str | None = None
)

async def get_user_interactions(
    user_id: str,
    limit: int = 10,
    situation: str | None = None
) -> list[dict]
```

---

## APIエンドポイント

### ルート (`api/routes.py`)

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/health` | ヘルスチェック |
| POST | `/chat` | 非ストリーミングチャット |
| POST | `/chat/stream` | ストリーミングチャット |
| POST | `/advice` | 朝の計画アドバイス |
| POST | `/reflect` | 夕方の振り返り |
| POST | `/review` | 週次レビュー |
| POST | `/ai/reviews/generate` | レビュー生成 (フロントエンド用) |
| GET | `/ai/reviews` | レビュー一覧 |
| GET | `/ai/reviews/{id}` | レビュー詳細 |
| POST | `/ai/ask` | 質問応答 |
| POST | `/interactions/{id}/feedback` | フィードバック送信 |

### 認証

`Authorization: Bearer <token>`からJWTトークン:

```python
def get_user_id_from_token(authorization: str) -> str:
    token = authorization.replace("Bearer ", "")
    payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    return payload["sub"]  # user_id
```

### リクエスト/レスポンス例

**POST /chat:**
```json
// リクエスト
{
  "message": "明日の予定を作って",
  "session_id": "optional-session-id"
}

// レスポンス
{
  "message": "明日の予定を作成しました...",
  "session_id": "abc123",
  "tool_calls": [
    {"name": "create_time_block", "input": {...}, "output": {...}}
  ],
  "tokens_input": 1500,
  "tokens_output": 200
}
```

**POST /ai/reviews/generate:**
```json
// リクエスト
{
  "weekStart": "2026-01-20",
  "weekEnd": "2026-01-26"
}

// レスポンス
{
  "id": "review-uuid",
  "userId": "user-uuid",
  "weekStart": "2026-01-20",
  "weekEnd": "2026-01-26",
  "summary": "今週は...",
  "goodPoints": ["ポイント1", "ポイント2"],
  "improvementPoints": ["改善点1"],
  "advice": ["アドバイス1"],
  "createdAt": "2026-01-26T12:00:00Z"
}
```

---

## バッチ処理

### プロフィール要約 (`batch/profile_summarizer.py`)

ファクトをユーザープロフィールに集約:

```python
class ProfileSummarizer:
    async def run_batch(
        since: datetime | None = None,
        days: int = 1
    ):
        # 1. 新しいファクトを持つユーザーを検索
        # 2. 各ユーザーに対して:
        #    - 既存プロフィールを取得
        #    - 上位50件のファクト（confidence順）を取得
        #    - Claudeで要約を生成
        #    - 強みを抽出（skillタイプ、confidence >= 0.7）
        #    - 成長領域を抽出（goal/constraintタイプ）
        #    - user_memoryレコードをupsert
```

**データベーススキーマ (`user_memory`):**
```sql
user_id UUID PRIMARY KEY
profile_summary TEXT        -- 最大300文字
preferences JSONB
strengths TEXT[]           -- スキルから
growth_areas TEXT[]        -- 目標/制約から
last_updated TIMESTAMP
```

### CLI使用法

```bash
# 過去1日間のファクトを持つユーザーを要約
python -m kensan_ai.batch.run_summarizer --days 1

# 特定日時以降を要約
python -m kensan_ai.batch.run_summarizer --since 2026-01-01T00:00:00

# 詳細モード
python -m kensan_ai.batch.run_summarizer --days 7 --verbose
```

---

## 設定

### Settings (`config.py`)

環境変数と本番バリデーション付きPydantic BaseSettings:

```python
class Settings(BaseSettings):
    # データベース
    DATABASE_URL: str | None = None
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_USER: str = "kensan"
    DB_PASSWORD: str = "kensan"
    DB_NAME: str = "kensan"

    # AI
    ANTHROPIC_API_KEY: str
    ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"
    OPENAI_API_KEY: str | None = None
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # ストレージ
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "kensan"
    MINIO_SECRET_KEY: str = "kensan-minio"
    MINIO_BUCKET: str = "kensan-notes"
    MINIO_USE_SSL: bool = False

    # サーバー
    SERVER_PORT: int = 8089
    SERVER_ENV: str = "development"
    HOST: str = "0.0.0.0"

    # エージェント
    DEFAULT_MAX_TURNS: int = 10
    DEFAULT_TEMPERATURE: float = 0.7

    # セキュリティ
    JWT_SECRET: str = "dev-secret-key"

    # OpenTelemetry
    OTEL_ENABLED: bool = False
    OTEL_COLLECTOR_URL: str = "localhost:4318"

    # External Tools
    TAVILY_API_KEY: str = ""

    # Lakehouse (Iceberg direct write)
    NESSIE_URI: str = "http://localhost:19120/iceberg/"
    LAKEHOUSE_S3_ENDPOINT: str = "http://localhost:9000"
    LAKEHOUSE_S3_ACCESS_KEY: str = "kensan"
    LAKEHOUSE_S3_SECRET_KEY: str = "kensan-minio"
    LAKEHOUSE_S3_BUCKET: str = "kensan-lakehouse"
    LAKEHOUSE_ENABLED: bool = False

    @model_validator(mode='after')
    def validate_production(self) -> 'Settings':
        """本番環境で必須設定をバリデート"""
        if self.SERVER_ENV == 'production':
            errors = []
            if not self.ANTHROPIC_API_KEY or self.ANTHROPIC_API_KEY == 'dev-key':
                errors.append("ANTHROPIC_API_KEY must be set in production")
            if self.JWT_SECRET == 'dev-secret-key':
                errors.append("JWT_SECRET must be changed in production")
            if not self.DATABASE_URL and self.DB_PASSWORD == 'kensan':
                errors.append("DB_PASSWORD must be changed in production")
            if errors:
                raise ValueError(f"Production validation failed: {', '.join(errors)}")
        return self
```

**本番バリデーション:**
- APIキーが開発用デフォルトでないことを確認
- 安全でないJWTシークレットを防止
- データベース認証情報をバリデート

### 環境変数

```bash
# 必須
ANTHROPIC_API_KEY=sk-ant-...

# データベース
DATABASE_URL=postgresql://user:pass@host:5432/db
# または個別コンポーネント
DB_HOST=localhost
DB_PORT=5432
DB_USER=kensan
DB_PASSWORD=kensan
DB_NAME=kensan

# オプション
OPENAI_API_KEY=sk-...          # 埋め込み用
TAVILY_API_KEY=tvly-...        # Web検索用 (web_search/web_fetch)
LAKEHOUSE_ENABLED=false        # Lakehouse書き込み有効化
NESSIE_URI=http://localhost:19120/iceberg/  # Nessie Catalog URI
MINIO_ENDPOINT=localhost:9000  # ファイルストレージ用
MINIO_ACCESS_KEY=kensan
MINIO_SECRET_KEY=kensan-minio
MINIO_BUCKET=kensan-notes
MINIO_USE_SSL=false
JWT_SECRET=your-secret-key
```

### 構造化ログイベント (`agents/base.py`)

AgentRunnerは各実行フェーズで構造化JSONログを出力。Lokiに収集されフロントエンドのInteraction Explorerで可視化:

| イベント | タイミング | 主要フィールド |
|---------|----------|--------------|
| `agent.prompt` | 実行開始 | model, user_message, context_id/name/version, experiment_id, system_prompt_length, system_prompt_sections, tool_count, tool_names, tool_definitions_length |
| `agent.system_prompt` | 実行開始 | system_prompt (全文) |
| `agent.turn` | 各ターン完了 | turn_number, input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, tool_call_count, response_text |
| `agent.tool_call` | ツール実行 | tool_name, tool_input, tool_output, success, error |
| `agent.complete` | 実行完了 | outcome, total_turns, total_input/output_tokens, pending_action_count |

### Telemetry (`telemetry.py`)

OpenTelemetry計装（`OTEL_ENABLED=true`で有効化）:

- `initialize_telemetry(config)` - TracerProvider + MeterProvider初期化
- `instrument_fastapi(app)` - FastAPI自動計装（/health除外）
- `instrument_asyncpg()` - asyncpg DB自動計装
- `instrument_httpx()` - httpxクライアント自動計装
- `shutdown_telemetry()` - グレースフルシャットダウン
- `get_genai_metrics()` - GenAIメトリクス取得（遅延初期化）

**GenAIメトリクス（`base.py` の `stream_sse` finally節で記録）:**

| メトリクス名 | 種別 | 説明 | 属性 |
|---|---|---|---|
| `gen_ai.client.token.usage` | Counter | トークン消費量 | `gen_ai.request.model`, `gen_ai.response.outcome`, `gen_ai.token.type` (input/output) |
| `gen_ai.client.operation.duration` | Histogram | インタラクション所要時間（秒） | `gen_ai.request.model`, `gen_ai.response.outcome` |
| `gen_ai.client.operation.count` | Counter | エージェント実行回数 | `gen_ai.request.model`, `gen_ai.response.outcome` |

パッケージ未インストール時はImportErrorをキャッチし、No-op実装で続行。

---

## 主要パターン

### ツール登録パターン

```python
# 1. デコレータでツールを定義
@tool(name="...", description="...", input_schema={...})
async def my_tool(args: dict) -> dict:
    return {"result": "..."}

# 2. カテゴリリストに追加
ALL_MY_TOOLS = [my_tool]

# 3. __init__.pyからエクスポート
from .my_tools import my_tool, ALL_MY_TOOLS

# 4. ALL_TOOLS集約に追加
ALL_TOOLS = [*ALL_DB_TOOLS, *ALL_MY_TOOLS, ...]
```

### User ID注入

AgentRunnerが自動的に`user_id`を注入:

```python
# AgentRunner.run()内:
for tool_use in tool_uses:
    args = tool_use.input
    if self.user_id and "user_id" not in args:
        args["user_id"] = self.user_id
    result = await execute_tool(tool_use.name, args)
```

### バックグラウンドタスクパターン

```python
# ノンブロッキングファクト抽出
@router.post("/chat")
async def chat(request: ChatRequest):
    result = await runner.run(request.message, user_id)

    # インタラクションを記録
    interaction_id = await logger.log(...)

    # ファイアアンドフォーゲットでファクト抽出
    asyncio.create_task(
        extractor.extract_and_save(user_id, request.message, result.text, interaction_id)
    )

    return ChatResponse(message=result.text, ...)
```

### コンテキスト変数パターン

```python
# 変数リゾルバを定義
async def resolve_user_memory(user_id: str) -> str:
    memory = await get_user_memory(user_id)
    if not memory:
        return "(ユーザー情報なし)"
    return f"{memory.profile_summary}\n強み: {', '.join(memory.strengths)}"

# 変数を登録
VARIABLE_RESOLVERS = {
    "user_memory": resolve_user_memory,
    "today_schedule": resolve_today_schedule,
    ...
}

# プロンプト内で置換
async def replace_variables(prompt: str, user_id: str) -> str:
    for var, resolver in VARIABLE_RESOLVERS.items():
        if f"{{{var}}}" in prompt:
            value = await resolver(user_id)
            prompt = prompt.replace(f"{{{var}}}", value)
    return prompt
```

---

## 開発

### ローカル実行

```bash
cd kensan-ai

# 依存関係をインストール
pip install -e .

# サーバーを起動
uvicorn kensan_ai.main:app --reload --port 8089
```

### Docker

```bash
# プロジェクトルートから
docker compose up ai-service
```

### 新しいツールの追加

1. 適切なファイル（`db_tools.py`、`memory_tools.py`等）に関数を作成
2. `@tool(name, description, input_schema)`でデコレート
3. `ALL_*_TOOLS`リストに追加
4. `tools/__init__.py`からエクスポート
5. `ALL_TOOLS`集約に含める

### 新しい状況の追加

1. `context/detector.py`の`Situation`にenumを追加
2. 時刻ベースなら検出ロジックを追加
3. `agents/`にシステムプロンプトを作成
4. データベースに`ai_contexts`レコードを追加

### テスト

```bash
# テストを実行
pytest

# カバレッジ付き
pytest --cov=kensan_ai

# 特定のテストファイル
pytest tests/test_tools.py -v
```

---

## データフロー図

### チャットフロー (Mermaid)

```mermaid
sequenceDiagram
    participant Client as フロントエンド
    participant API as POST /chat
    participant Ctx as ContextResolver
    participant Agent as AgentRunner
    participant Claude as Claude API
    participant Tools as Tool Registry
    participant DB as PostgreSQL
    participant Logger as InteractionLogger

    Client->>API: {message, session_id?}
    API->>API: JWTからuser_idを抽出

    API->>Ctx: get_context(situation, user_id)
    Ctx->>DB: SELECT FROM ai_contexts
    Ctx->>Ctx: {変数}を置換
    Ctx-->>API: AIContext

    API->>Agent: run(message, user_id)

    loop エージェントループ
        Agent->>Claude: messages + tools
        Claude-->>Agent: response

        alt tool_use in response
            Agent->>Agent: user_idを注入
            Agent->>Tools: execute_tool(name, args)
            Tools->>DB: クエリ
            DB-->>Tools: 結果
            Tools-->>Agent: tool_result
            Agent->>Agent: メッセージに追加
        else end_turn
            Agent-->>API: AgentResult
        end
    end

    API->>Logger: log(interaction)
    Logger->>DB: INSERT ai_interactions
    Logger--)Logger: async extract_facts()

    API-->>Client: ChatResponse
```

### チャットフロー (テキスト)

```
POST /chat
    ↓
JWTからuser_idを抽出
    ↓
状況を検出 (時刻ベースまたは明示)
    ↓
ContextResolver.get_context()
    ├─ DBからai_contextsを読込
    └─ プロンプト内の{変数}を置換
    ↓
AgentRunner.run()
    ├─ ツール付きでClaudeを呼び出し
    ├─ tool_useをローカル実行 (user_id注入)
    ├─ 結果を追加、ループ継続
    └─ AgentResultを返却
    ↓
InteractionLogger.log()
    ↓
asyncio.create_task(FactExtractor.extract_and_save())
    ↓
ChatResponseを返却
```

### メモリ構築フロー (テキスト)

```
チャットインタラクション
    ↓
InteractionLogger.log()
    ↓
FactExtractor.extract_and_save() (バックグラウンド)
    ├─ Claudeがファクトを抽出
    ├─ バリデーション & 重複排除
    └─ user_factsに保存
    ↓
バッチジョブ (夜間): ProfileSummarizer
    ├─ 新しいファクトを持つユーザーを検索
    ├─ Claudeでプロフィール要約を生成
    └─ user_memoryをupsert
    ↓
将来のチャットで{user_memory}変数を使用
```

注: Mermaid版のメモリ構築フローは [メモリ構築パイプライン](#メモリ構築パイプライン) セクションを参照。

---

## 依存関係

```
anthropic>=0.40.0
openai>=1.50.0
fastapi>=0.115.0
uvicorn>=0.32.0
asyncpg>=0.30.0
pydantic>=2.10.0
pydantic-settings>=2.6.0
boto3>=1.35.0
python-jose>=3.3.0
```
