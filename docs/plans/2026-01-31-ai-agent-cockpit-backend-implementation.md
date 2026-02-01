# AI Agent Cockpit - Phase 2 バックエンド実装計画

**Goal:** kensan-ai の既存エンドポイント (`/chat`, `/chat/stream`, `/advice`, `/reflect`, `/review`) を廃止し、統一エンドポイント `/agent/stream` + `/agent/approve` に統合する。SSE形式でイベントを返し、書き込みツールは提案→承認フローを経て実行する。

**前提:**
- Phase 1（フロントエンド）は完了済み。ChatPanel が `POST /api/v1/agent/stream` と `POST /api/v1/agent/approve` を呼ぶ
- kensan-ai は Python / FastAPI / Anthropic SDK (Direct Tools)
- DB直接アクセス（Go サービスへのHTTP呼び出しなし）
- 設計書: `docs/plans/2026-01-31-ai-agent-cockpit-design.md`

**変更対象:** `kensan-ai/src/kensan_ai/` 配下

---

## 設計: システムコンテキスト切り替え

### パイプライン

```
リクエスト (situation: "auto" | "morning" | "evening" | "weekly" | "chat")
  │
  ▼
SituationDetector.detect()          ← 時間帯で自動判定 or 明示指定
  │ Situation enum
  ▼
ContextResolver.resolve(situation)  ← ai_contexts テーブルから取得
  │ AgentContext { system_prompt, allowed_tools, max_turns, temperature }
  ▼
VariableReplacer.replace(prompt)    ← {変数} を実データで置換
  │ 完成した system_prompt
  ▼
AgentRunner.stream_sse(system_prompt, tools, ...)
```

既存の3ステップ（検出→解決→置換）をそのまま活用。`/agent/stream` は situation パラメータを受け取るだけで、内部のコンテキスト選択は全て既存インフラが処理する。

### System Prompt テンプレート

全 situation で**同じツールセット**にアクセス可能。prompt がエージェントの振る舞いを誘導する。

#### 共通ヘッダー（全 situation 共通で先頭に付与）

```
あなたはKensanアプリのAIアシスタントです。
ユーザーのタスク管理・時間計画・目標管理・学習記録・振り返りを支援します。

## ユーザー情報
{user_memory}

## ルール
- 日本語で応答する
- 書き込み操作（create/update/delete）は必ず提案として出す。勝手に実行しない
- 読み取り操作はツールで即取得してよい
- 日付は Asia/Tokyo (JST) 基準で扱う
- 簡潔に、必要な情報だけ伝える
```

#### morning (05:00-10:00 JST)

```
{common_header}

## 今日の状況
予定: {today_schedule}
未完了タスク: {pending_tasks}
最近のやりとり: {recent_context}

## 朝の役割
- 今日のスケジュールを一緒に立てる
- 未完了タスクから優先度を提案する
- タイムブロック作成を提案する
- 「おはようございます」から始める
```

#### evening (17:00-22:00 JST)

```
{common_header}

## 今日の状況
計画: {today_schedule}
実績: {today_entries}
未完了タスク: {pending_tasks}

## 夜の役割
- 今日の計画と実績の差分を分析する
- 良かった点・改善点を伝える
- 明日に持ち越すタスクがあれば確認する
- 「お疲れさまでした」から始める
```

#### weekly

```
{common_header}

## 今週の状況
週間サマリー: {weekly_summary}
目標進捗: {goal_progress}

## 週次レビューの役割
- 今週の稼働時間・目標別配分を分析する
- 良かった点・改善点をまとめる
- 来週に向けたアドバイスを出す
- generate_weekly_review ツールでレビューを保存する
```

#### chat (デフォルト / その他の時間帯)

```
{common_header}

## 直近のやりとり
{recent_context}

## 汎用アシスタントの役割
- ユーザーの指示に柔軟に対応する
- タスク・予定・メモ・ノートなど、何でも操作できる
- 必要に応じてツールを使ってデータを取得・操作する
```

### 変数一覧

| 変数 | 生成元 | 内容 |
|------|--------|------|
| `{user_memory}` | `user_memory` テーブル | プロフィール要約・強み・成長領域 |
| `{today_schedule}` | `get_time_blocks(date=today)` | 今日のタイムブロック一覧 |
| `{today_entries}` | `get_time_entries(date=today)` | 今日の実績一覧 |
| `{pending_tasks}` | `get_tasks(completed=false)` | 未完了タスク一覧 |
| `{recent_context}` | `get_recent_interactions(limit=3)` | 直近3件のやりとり要約 |
| `{weekly_summary}` | analytics クエリ | 週の稼働時間・目標別配分 |
| `{goal_progress}` | `get_goals_and_milestones()` | 目標・マイルストーン進捗 |

VariableReplacer は prompt 内の `{xxx}` を検出し、対応するデータ取得関数を呼んで置換する。prompt に含まれない変数は取得しない（不要なDB呼び出しを避ける）。

---

## 設計: ツール定義

### 方針

- Claude API の `tools` パラメータに渡す JSON Schema 形式で定義
- `name` はスネークケース、動詞+名詞（`get_tasks`, `create_time_block`）
- `description` は Claude がツール選択に使うため、**いつ使うべきか**を明記する
- `input_schema` に `user_id` は含めない（AgentRunner が自動注入）
- `readonly` フラグで読み取り/書き込みを区別

### ツールカタログ

#### 読み取りツール（即実行）

```python
@tool(
    name="get_goals_and_milestones",
    description="ユーザーの目標とマイルストーンの一覧を取得する。目標の進捗確認や計画立案時に使う。",
    input_schema={"type": "object", "properties": {}, "required": []},
    readonly=True,
)

@tool(
    name="get_tasks",
    description="タスク一覧を取得する。フィルタ条件で絞り込み可能。タスクの確認や計画時に使う。",
    input_schema={
        "type": "object",
        "properties": {
            "milestone_id": {"type": "string", "description": "マイルストーンIDで絞り込み"},
            "completed": {"type": "boolean", "description": "完了/未完了で絞り込み"},
            "due_date": {"type": "string", "description": "期限日 (YYYY-MM-DD)"},
        },
        "required": [],
    },
    readonly=True,
)

@tool(
    name="get_time_blocks",
    description="タイムブロック（計画）を取得する。日付指定で特定日の予定を確認する。",
    input_schema={
        "type": "object",
        "properties": {
            "date": {"type": "string", "description": "日付 (YYYY-MM-DD)。省略時は今日"},
            "start_date": {"type": "string", "description": "範囲指定の開始日"},
            "end_date": {"type": "string", "description": "範囲指定の終了日"},
        },
        "required": [],
    },
    readonly=True,
)

@tool(
    name="get_time_entries",
    description="タイムエントリ（実績）を取得する。実際に何に時間を使ったかの確認に使う。",
    input_schema={
        "type": "object",
        "properties": {
            "date": {"type": "string", "description": "日付 (YYYY-MM-DD)"},
            "start_date": {"type": "string", "description": "範囲指定の開始日"},
            "end_date": {"type": "string", "description": "範囲指定の終了日"},
        },
        "required": [],
    },
    readonly=True,
)

@tool(
    name="get_memos",
    description="メモ一覧を取得する。ユーザーの書いたメモや走り書きの確認に使う。",
    input_schema={
        "type": "object",
        "properties": {
            "limit": {"type": "integer", "description": "取得件数（デフォルト20）"},
        },
        "required": [],
    },
    readonly=True,
)

@tool(
    name="get_notes",
    description="ノート一覧を取得する。学習記録や日記の確認に使う。",
    input_schema={
        "type": "object",
        "properties": {
            "type": {"type": "string", "enum": ["diary", "learning"], "description": "ノート種別で絞り込み"},
            "limit": {"type": "integer", "description": "取得件数（デフォルト20）"},
        },
        "required": [],
    },
    readonly=True,
)

@tool(
    name="get_reviews",
    description="過去のAI週次レビュー一覧を取得する。",
    input_schema={
        "type": "object",
        "properties": {
            "limit": {"type": "integer", "description": "取得件数（デフォルト10）"},
        },
        "required": [],
    },
    readonly=True,
)

@tool(
    name="get_review",
    description="特定のAI週次レビューを取得する。",
    input_schema={
        "type": "object",
        "properties": {
            "review_id": {"type": "string", "description": "レビューID"},
        },
        "required": ["review_id"],
    },
    readonly=True,
)

@tool(
    name="get_analytics_summary",
    description="週次または月次の稼働サマリーを取得する。目標別の時間配分を確認する。",
    input_schema={
        "type": "object",
        "properties": {
            "period": {"type": "string", "enum": ["weekly", "monthly"], "description": "集計期間"},
            "start_date": {"type": "string", "description": "開始日 (YYYY-MM-DD)"},
            "end_date": {"type": "string", "description": "終了日 (YYYY-MM-DD)"},
        },
        "required": ["period", "start_date", "end_date"],
    },
    readonly=True,
)

@tool(
    name="get_daily_summary",
    description="特定日の時間配分サマリーを取得する。計画vs実績の比較に使う。",
    input_schema={
        "type": "object",
        "properties": {
            "date": {"type": "string", "description": "日付 (YYYY-MM-DD)。省略時は今日"},
        },
        "required": [],
    },
    readonly=True,
)
```

既存のメモリ・検索ツール（`get_user_memory`, `get_user_facts`, `get_recent_interactions`, `semantic_search`, `keyword_search`, `hybrid_search`）は変更なし。ストレージツール（`upload_file`, `get_file`, `delete_file`, `get_upload_url`）も変更なし。

#### 書き込みツール（提案→承認）

```python
@tool(
    name="create_task",
    description="新しいタスクを作成する。ユーザーがやるべきことを追加する時に使う。",
    input_schema={
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": "タスク名"},
            "milestone_id": {"type": "string", "description": "紐付けるマイルストーンID"},
            "estimated_minutes": {"type": "integer", "description": "見積もり時間（分）"},
            "due_date": {"type": "string", "description": "期限日 (YYYY-MM-DD)"},
        },
        "required": ["name"],
    },
    readonly=False,
)

@tool(
    name="update_task",
    description="既存タスクを更新する。タスクの完了マーク、名前変更、期限変更に使う。",
    input_schema={
        "type": "object",
        "properties": {
            "task_id": {"type": "string", "description": "タスクID"},
            "name": {"type": "string", "description": "新しいタスク名"},
            "completed": {"type": "boolean", "description": "完了フラグ"},
            "due_date": {"type": "string", "description": "新しい期限日"},
        },
        "required": ["task_id"],
    },
    readonly=False,
)

@tool(
    name="delete_task",
    description="タスクを削除する。不要になったタスクの除去に使う。",
    input_schema={
        "type": "object",
        "properties": {
            "task_id": {"type": "string", "description": "タスクID"},
        },
        "required": ["task_id"],
    },
    readonly=False,
)

@tool(
    name="create_time_block",
    description="タイムブロック（予定）を作成する。1日のスケジュール立案時に使う。",
    input_schema={
        "type": "object",
        "properties": {
            "date": {"type": "string", "description": "日付 (YYYY-MM-DD)"},
            "start_time": {"type": "string", "description": "開始時刻 (HH:MM)"},
            "end_time": {"type": "string", "description": "終了時刻 (HH:MM)"},
            "task_name": {"type": "string", "description": "表示名"},
            "task_id": {"type": "string", "description": "紐付けるタスクID"},
            "milestone_id": {"type": "string", "description": "紐付けるマイルストーンID"},
            "goal_id": {"type": "string", "description": "紐付ける目標ID"},
            "goal_color": {"type": "string", "description": "目標カラー (#hex)"},
            "is_routine": {"type": "boolean", "description": "ルーティンタスクか"},
        },
        "required": ["date", "start_time", "end_time", "task_name"],
    },
    readonly=False,
)

@tool(
    name="update_time_block",
    description="既存タイムブロックを更新する。予定の時間帯変更や内容変更に使う。",
    input_schema={
        "type": "object",
        "properties": {
            "time_block_id": {"type": "string", "description": "タイムブロックID"},
            "start_time": {"type": "string", "description": "新しい開始時刻 (HH:MM)"},
            "end_time": {"type": "string", "description": "新しい終了時刻 (HH:MM)"},
            "task_name": {"type": "string", "description": "新しい表示名"},
        },
        "required": ["time_block_id"],
    },
    readonly=False,
)

@tool(
    name="delete_time_block",
    description="タイムブロックを削除する。予定のキャンセルに使う。",
    input_schema={
        "type": "object",
        "properties": {
            "time_block_id": {"type": "string", "description": "タイムブロックID"},
        },
        "required": ["time_block_id"],
    },
    readonly=False,
)

@tool(
    name="create_memo",
    description="メモを作成する。ユーザーが何かを書き留めたい時に使う。",
    input_schema={
        "type": "object",
        "properties": {
            "content": {"type": "string", "description": "メモの内容"},
        },
        "required": ["content"],
    },
    readonly=False,
)

@tool(
    name="create_note",
    description="ノートを作成する。学習記録や日記の新規作成に使う。",
    input_schema={
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "タイトル"},
            "content": {"type": "string", "description": "本文 (Markdown)"},
            "type": {"type": "string", "enum": ["diary", "learning"], "description": "ノート種別"},
        },
        "required": ["title", "content", "type"],
    },
    readonly=False,
)

@tool(
    name="update_note",
    description="既存ノートを更新する。学習記録や日記の編集に使う。",
    input_schema={
        "type": "object",
        "properties": {
            "note_id": {"type": "string", "description": "ノートID"},
            "title": {"type": "string", "description": "新しいタイトル"},
            "content": {"type": "string", "description": "新しい本文"},
        },
        "required": ["note_id"],
    },
    readonly=False,
)

@tool(
    name="create_goal",
    description="新しい目標を作成する。",
    input_schema={
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": "目標名"},
            "description": {"type": "string", "description": "目標の説明"},
            "color": {"type": "string", "description": "表示カラー (#hex)"},
        },
        "required": ["name"],
    },
    readonly=False,
)

@tool(
    name="update_goal",
    description="既存目標を更新する。",
    input_schema={
        "type": "object",
        "properties": {
            "goal_id": {"type": "string", "description": "目標ID"},
            "name": {"type": "string", "description": "新しい名前"},
            "description": {"type": "string", "description": "新しい説明"},
        },
        "required": ["goal_id"],
    },
    readonly=False,
)

@tool(
    name="delete_goal",
    description="目標を削除する。配下のマイルストーン・タスクとの紐付きに注意。",
    input_schema={
        "type": "object",
        "properties": {
            "goal_id": {"type": "string", "description": "目標ID"},
        },
        "required": ["goal_id"],
    },
    readonly=False,
)

@tool(
    name="create_milestone",
    description="目標にマイルストーンを追加する。",
    input_schema={
        "type": "object",
        "properties": {
            "goal_id": {"type": "string", "description": "親目標ID"},
            "name": {"type": "string", "description": "マイルストーン名"},
            "due_date": {"type": "string", "description": "期限日 (YYYY-MM-DD)"},
        },
        "required": ["goal_id", "name"],
    },
    readonly=False,
)

@tool(
    name="update_milestone",
    description="既存マイルストーンを更新する。",
    input_schema={
        "type": "object",
        "properties": {
            "milestone_id": {"type": "string", "description": "マイルストーンID"},
            "name": {"type": "string", "description": "新しい名前"},
            "due_date": {"type": "string", "description": "新しい期限日"},
        },
        "required": ["milestone_id"],
    },
    readonly=False,
)

@tool(
    name="delete_milestone",
    description="マイルストーンを削除する。",
    input_schema={
        "type": "object",
        "properties": {
            "milestone_id": {"type": "string", "description": "マイルストーンID"},
        },
        "required": ["milestone_id"],
    },
    readonly=False,
)

@tool(
    name="generate_weekly_review",
    description="指定した週の週次レビューを生成しDBに保存する。週次振り返り時に使う。",
    input_schema={
        "type": "object",
        "properties": {
            "week_start": {"type": "string", "description": "週の開始日 (YYYY-MM-DD, 月曜日)"},
            "week_end": {"type": "string", "description": "週の終了日 (YYYY-MM-DD, 日曜日)"},
        },
        "required": ["week_start", "week_end"],
    },
    readonly=False,
)
```

### ツール合計

| カテゴリ | 読み取り | 書き込み | 計 |
|----------|----------|----------|-----|
| 目標・マイルストーン | 1 | 6 | 7 |
| タスク | 1 | 3 | 4 |
| タイムブロック | 1 | 3 | 4 |
| タイムエントリ | 1 | 0 | 1 |
| メモ | 1 | 1 | 2 |
| ノート | 1 | 2 | 3 |
| レビュー | 2 | 1 | 3 |
| 分析 | 2 | 0 | 2 |
| メモリ・検索 | 6 | 1 | 7 |
| ストレージ | 4 | 0 | 4 |
| **合計** | **20** | **17** | **37** |

### Claude への tools パラメータ構築

```python
# AgentRunner が tools パラメータを構築する流れ
def build_tools_param(allowed_tool_names: list[str]) -> list[dict]:
    """ai_contexts.allowed_tools から Claude API の tools パラメータを構築"""
    return [
        {
            "name": entry.name,
            "description": entry.description,
            "input_schema": entry.input_schema,
        }
        for entry in get_all_tools().values()
        if entry.name in allowed_tool_names
    ]
```

`ai_contexts.allowed_tools` が使用可能なツール名の配列。situation ごとに絞ることも、全開放することもDBレベルで制御可能。現時点では全 situation で全ツール開放し、prompt で誘導する。

---

## Task 1: SSE レスポンスヘルパー

**Files:**
- Create: `kensan_ai/api/sse.py`

SSEイベントのフォーマットとStreamingResponse生成を担うヘルパー。

```python
# kensan_ai/api/sse.py
import json
from typing import Any

def sse_event(event_type: str, data: dict[str, Any]) -> str:
    """Format a single SSE event block."""
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"
```

---

## Task 2: 読み取り/書き込みツール分類

**Files:**
- Modify: `kensan_ai/tools/base.py`

ツール登録時に `readonly` フラグを追加。

**変更内容:**

1. `tool()` デコレータに `readonly: bool = True` パラメータ追加
2. `_tool_registry` の各エントリに `readonly` フィールド追加
3. `is_readonly_tool(name: str) -> bool` ヘルパー関数追加
4. 既存の全ツールに `readonly` フラグを付与（設計セクションのカタログ通り）

---

## Task 3: AgentRunner のSSEストリーミング対応

**Files:**
- Modify: `kensan_ai/agents/base.py`

既存の `stream()` メソッドはプレーンテキストを yield するが、新しい `stream_sse()` メソッドを追加してSSEイベントを yield する。

**新メソッド: `stream_sse()`**

```python
async def stream_sse(
    self,
    user_message: str,
    user_id: UUID,
    system_prompt: str,
    tools: list[str] | None = None,
    max_turns: int = 10,
    temperature: float = 0.7,
) -> AsyncGenerator[str, None]:
    """
    Agent loop with SSE event output.

    読み取りツール → 即実行し tool_call/tool_result イベントを yield
    書き込みツール → action_proposal イベントとして提案のみ（実行しない）
    テキスト → text イベントとして yield
    完了時 → done イベントを yield
    """
```

**ロジック:**

```
1. Claude API に messages.stream() で送信
2. テキストチャンクを受信 → yield sse_event("text", {"content": chunk})
3. tool_use ブロックを受信:
   a. readonly ツール → 即実行
      - yield sse_event("tool_call", {"id": tc_id, "name": name, "input": input})
      - result = await execute_tool(name, args)
      - yield sse_event("tool_result", {"id": tc_id, "name": name, "result": result})
      - tool_result を message history に追加してループ継続
   b. 書き込みツール → 提案として蓄積
      - pending_actions に追加
4. ループ終了時:
   a. pending_actions がある → yield sse_event("action_proposal", {"actions": [...]})
   b. yield sse_event("done", {"conversation_id": conv_id, "tokens": {...}})
```

**ポイント:**
- 既存の `run()` / `stream()` はそのまま残す（後方互換のため一時的に）
- `stream_sse()` が安定したら Task 8 で旧メソッドを廃止

---

## Task 4: 会話状態管理（承認フロー用）

**Files:**
- Create: `kensan_ai/agents/conversation_store.py`

承認待ちアクションを保持するインメモリストア。

```python
# kensan_ai/agents/conversation_store.py
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from uuid import UUID

@dataclass
class PendingAction:
    id: str
    tool_name: str
    description: str
    input: dict

@dataclass
class ConversationState:
    conversation_id: str
    user_id: UUID
    pending_actions: list[PendingAction] = field(default_factory=list)
    message_history: MessageHistory  # 既存クラス再利用
    created_at: datetime = field(default_factory=datetime.utcnow)

class ConversationStore:
    """インメモリ会話ストア。TTL付き。"""

    def __init__(self, ttl_minutes: int = 30):
        self._store: dict[str, ConversationState] = {}
        self._ttl = timedelta(minutes=ttl_minutes)

    def get(self, conversation_id: str) -> ConversationState | None: ...
    def set(self, state: ConversationState) -> None: ...
    def remove(self, conversation_id: str) -> None: ...
    def cleanup_expired(self) -> None: ...
```

**注意:**
- シングルインスタンス（FastAPI の lifespan で初期化し app.state に保持）
- プロダクションでスケールする場合は Redis に移行するが、Phase 2 ではインメモリで十分

---

## Task 5: 統一エンドポイント `/agent/stream`

**Files:**
- Modify: `kensan_ai/api/routes.py`
- Modify: `kensan_ai/api/schemas.py`

**スキーマ追加:**

```python
# schemas.py に追加
class AgentStreamRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    situation: Literal["auto", "morning", "evening", "weekly", "chat"] = "auto"
```

**エンドポイント実装:**

```python
@router.post("/agent/stream")
async def agent_stream(
    request: AgentStreamRequest,
    authorization: str | None = Header(None),
):
    user_id = _get_user_id_from_header(authorization)

    # 1. Situation 検出（既存 detect_situation 再利用）
    situation = detect_situation(
        explicit_situation=request.situation if request.situation != "auto" else None
    )

    # 2. Context 解決（既存 ContextResolver 再利用）
    context = await context_resolver.resolve(situation, user_id)

    # 3. System prompt の変数置換（既存 VariableReplacer 再利用）
    system_prompt = await variable_replacer.replace(context.system_prompt, user_id)

    # 4. 会話状態の取得 or 新規作成
    conv_id = request.conversation_id or str(uuid4())
    state = conversation_store.get(conv_id) or ConversationState(...)

    # 5. SSE ストリーミング
    async def event_generator():
        async for event in agent_runner.stream_sse(
            user_message=request.message,
            user_id=user_id,
            system_prompt=system_prompt,
            tools=context.allowed_tools,
            max_turns=context.max_turns,
            temperature=context.temperature,
        ):
            yield event

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

---

## Task 6: 承認エンドポイント `/agent/approve`

**Files:**
- Modify: `kensan_ai/api/routes.py`
- Modify: `kensan_ai/api/schemas.py`

**スキーマ追加:**

```python
class AgentApproveRequest(BaseModel):
    conversation_id: str
    action_ids: list[str]
```

**エンドポイント実装:**

```python
@router.post("/agent/approve")
async def agent_approve(
    request: AgentApproveRequest,
    authorization: str | None = Header(None),
):
    user_id = _get_user_id_from_header(authorization)
    state = conversation_store.get(request.conversation_id)

    if not state or state.user_id != user_id:
        raise HTTPException(404, "Conversation not found")

    # 承認されたアクションのみフィルタ
    approved = [a for a in state.pending_actions if a.id in request.action_ids]

    async def event_generator():
        for action in approved:
            yield sse_event("tool_call", {
                "id": f"tc_{action.id}",
                "name": action.tool_name,
                "input": action.input,
            })

            result = await execute_tool(action.tool_name, action.input)

            yield sse_event("tool_result", {
                "id": f"tc_{action.id}",
                "name": action.tool_name,
                "result": result,
            })

        yield sse_event("text", {
            "content": f"{len(approved)}件のアクションを実行しました。"
        })
        yield sse_event("done", {
            "conversation_id": request.conversation_id,
            "tokens": {"input": 0, "output": 0},
        })

        # 後始末
        state.pending_actions.clear()
        conversation_store.set(state)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

---

## Task 7: 不足ツールの追加

**Files:**
- Modify: `kensan_ai/tools/db_tools.py`
- Create: `kensan_ai/tools/review_tools.py`
- Create: `kensan_ai/tools/analytics_tools.py`
- Create: `kensan_ai/db/queries/memos.py`
- Create: `kensan_ai/db/queries/notes.py`
- Modify: `kensan_ai/db/queries/tasks.py`
- Modify: `kensan_ai/db/queries/time_blocks.py`
- Modify: `kensan_ai/db/queries/goals.py`
- Create: `kensan_ai/db/queries/analytics.py`

設計セクション「ツールカタログ」の定義に従い、以下を実装する。

**追加ツール一覧:**

| ツール | readonly | ファイル |
|--------|----------|----------|
| `delete_task` | No | `db_tools.py` + `queries/tasks.py` |
| `update_time_block` | No | `db_tools.py` + `queries/time_blocks.py` |
| `delete_time_block` | No | `db_tools.py` + `queries/time_blocks.py` |
| `get_memos` | Yes | `db_tools.py` + `queries/memos.py` (新規) |
| `create_memo` | No | `db_tools.py` + `queries/memos.py` |
| `get_notes` | Yes | `db_tools.py` + `queries/notes.py` (新規) |
| `create_note` | No | `db_tools.py` + `queries/notes.py` |
| `update_note` | No | `db_tools.py` + `queries/notes.py` |
| `create_goal` | No | `db_tools.py` + `queries/goals.py` |
| `update_goal` | No | `db_tools.py` + `queries/goals.py` |
| `delete_goal` | No | `db_tools.py` + `queries/goals.py` |
| `create_milestone` | No | `db_tools.py` + `queries/goals.py` |
| `update_milestone` | No | `db_tools.py` + `queries/goals.py` |
| `delete_milestone` | No | `db_tools.py` + `queries/goals.py` |
| `get_analytics_summary` | Yes | `analytics_tools.py` + `queries/analytics.py` (新規) |
| `get_daily_summary` | Yes | `analytics_tools.py` + `queries/analytics.py` |
| `generate_weekly_review` | No | `review_tools.py` + `queries/ai_reviews.py` |
| `get_reviews` | Yes | `review_tools.py` + `queries/ai_reviews.py` |
| `get_review` | Yes | `review_tools.py` + `queries/ai_reviews.py` |

**実装方針:**
- `input_schema` は設計セクションのカタログに定義済み。そのまま使用
- `user_id` は AgentRunner が自動注入（既存パターン踏襲）
- 新規 DB クエリモジュールは既存の `queries/goals.py` 等と同じパターンで作成
- `generate_weekly_review` は既存の `weekly_review.py` の `_parse_review_response()` ロジックを移植

---

## Task 8: 旧エンドポイント全廃止 + A02_AIReview 統合

**Files (バックエンド):**
- Modify: `kensan_ai/api/routes.py`
- Modify: `kensan_ai/api/schemas.py`
- Delete: `kensan_ai/agents/chat.py`
- Delete: `kensan_ai/agents/weekly_review.py`

**Files (フロントエンド):**
- Modify: `src/pages/A02_AIReview.tsx`
- Modify: `src/api/services/ai.ts`
- Modify: `src/mocks/handlers/ai.ts`
- Modify: `src/stores/useChatStore.ts`

### 8-1. バックエンド: 全旧エンドポイント廃止

| 旧エンドポイント | 対応 |
|-----------------|------|
| `POST /chat` | 廃止 |
| `POST /chat/stream` | 廃止 |
| `POST /advice` | 廃止 |
| `POST /reflect` | 廃止 |
| `POST /review` | 廃止 |
| `POST /ai/reviews/generate` | **廃止** |
| `GET /ai/reviews` | **廃止** |
| `GET /ai/reviews/{review_id}` | **廃止** |
| `POST /ai/ask` | 廃止 |
| `POST /interactions/{id}/feedback` | 維持 |
| `GET /health` | 維持 |

**手順:**
1. 廃止対象のルート関数を全て削除
2. 関連する schemas (ChatRequest, AdviceRequest, ReviewResponse, AIReviewReportResponse 等) を削除
3. 旧 `AgentRunner.run()` と `AgentRunner.stream()` を削除（`stream_sse()` に置き換え済み）
4. `weekly_review.py` と `chat.py` を削除（設定は `ai_contexts` テーブルに移行済み）

### 8-2. フロントエンド: A02_AIReview.tsx を ChatPanel 経由に書き換え

**変更方針:**
- レビュー生成ボタンをクリック → ChatPanel を開き `situation: "weekly"` で「今週のレビューを生成して」を自動送信
- レビュー一覧/詳細表示は agent の `get_reviews` / `get_review` ツール経由で取得
- 既存の `aiApi` (`src/api/services/ai.ts`) の review 関連メソッドを削除
- `src/mocks/handlers/ai.ts` の review 関連ハンドラーを削除（`src/mocks/handlers/agent.ts` に統合）

**useChatStore に追加するアクション:**
```typescript
sendPrefilled: (message: string, situation?: string) => void
// パネルを開き、指定メッセージとsituationで自動送信する
```

**A02_AIReview.tsx の具体的な変更:**

```tsx
// 変更前: aiApi.generateReview() を直接呼ぶ
// 変更後: ChatPanel を開いて agent 経由で生成
const handleGenerateReview = () => {
  useChatStore.getState().open()
  useChatStore.getState().sendPrefilled(
    `${weekStart}〜${weekEnd}の週次レビューを生成してください`,
    'weekly'
  )
}
```

**レビュー表示:**
- エージェントがレビュー生成後、結果をチャットメッセージとして表示（Markdown形式）
- 過去レビューの閲覧は「先週のレビューを見せて」等のチャット操作で対応
- A02_AIReview.tsx ページ自体は残すが、大幅に簡素化（ChatPanel への導線 + 簡易説明のみ）

---

## Task 9: ai_contexts シードデータ更新

**Files:**
- Create: `backend/migrations/XXX_unified_agent_contexts.sql`

設計セクションの System Prompt テンプレートを `ai_contexts` テーブルに投入する。

**全ツール名配列（共通）:**

```sql
-- 全37ツール
'{
  "get_goals_and_milestones","get_tasks","get_time_blocks","get_time_entries",
  "get_memos","get_notes","get_reviews","get_review",
  "get_analytics_summary","get_daily_summary",
  "get_user_memory","get_user_facts","get_recent_interactions",
  "semantic_search","keyword_search","hybrid_search",
  "upload_file","get_file","delete_file","get_upload_url",
  "create_task","update_task","delete_task",
  "create_time_block","update_time_block","delete_time_block",
  "create_memo","create_note","update_note",
  "create_goal","update_goal","delete_goal",
  "create_milestone","update_milestone","delete_milestone",
  "add_user_fact","generate_weekly_review"
}'::text[]
```

**シードデータ:**

```sql
-- 既存の ai_contexts を無効化
UPDATE ai_contexts SET is_active = false, is_default = false;

-- chat (デフォルト / 10:00-17:00 JST)
INSERT INTO ai_contexts (
  id, name, situation, system_prompt, allowed_tools,
  max_turns, temperature, is_default, is_active
) VALUES (
  gen_random_uuid(), 'unified-chat', 'chat',
  E'あなたはKensanアプリのAIアシスタントです。\nユーザーのタスク管理・時間計画・目標管理・学習記録・振り返りを支援します。\n\n## ユーザー情報\n{user_memory}\n\n## ルール\n- 日本語で応答する\n- 書き込み操作（create/update/delete）は必ず提案として出す。勝手に実行しない\n- 読み取り操作はツールで即取得してよい\n- 日付は Asia/Tokyo (JST) 基準で扱う\n- 簡潔に、必要な情報だけ伝える\n\n## 直近のやりとり\n{recent_context}\n\n## 汎用アシスタントの役割\n- ユーザーの指示に柔軟に対応する\n- タスク・予定・メモ・ノートなど、何でも操作できる\n- 必要に応じてツールを使ってデータを取得・操作する',
  /* allowed_tools = 全ツール配列（上記参照） */,
  10, 0.7, true, true
);

-- morning (05:00-10:00 JST)
INSERT INTO ai_contexts (
  id, name, situation, system_prompt, allowed_tools,
  max_turns, temperature, is_default, is_active
) VALUES (
  gen_random_uuid(), 'unified-morning', 'morning',
  E'あなたはKensanアプリのAIアシスタントです。\nユーザーのタスク管理・時間計画・目標管理・学習記録・振り返りを支援します。\n\n## ユーザー情報\n{user_memory}\n\n## ルール\n- 日本語で応答する\n- 書き込み操作（create/update/delete）は必ず提案として出す。勝手に実行しない\n- 読み取り操作はツールで即取得してよい\n- 日付は Asia/Tokyo (JST) 基準で扱う\n- 簡潔に、必要な情報だけ伝える\n\n## 今日の状況\n予定: {today_schedule}\n未完了タスク: {pending_tasks}\n最近のやりとり: {recent_context}\n\n## 朝の役割\n- 今日のスケジュールを一緒に立てる\n- 未完了タスクから優先度を提案する\n- タイムブロック作成を提案する\n- 「おはようございます」から始める',
  /* allowed_tools = 全ツール配列 */,
  10, 0.7, true, true
);

-- evening (17:00-22:00 JST)
INSERT INTO ai_contexts (
  id, name, situation, system_prompt, allowed_tools,
  max_turns, temperature, is_default, is_active
) VALUES (
  gen_random_uuid(), 'unified-evening', 'evening',
  E'あなたはKensanアプリのAIアシスタントです。\nユーザーのタスク管理・時間計画・目標管理・学習記録・振り返りを支援します。\n\n## ユーザー情報\n{user_memory}\n\n## ルール\n- 日本語で応答する\n- 書き込み操作（create/update/delete）は必ず提案として出す。勝手に実行しない\n- 読み取り操作はツールで即取得してよい\n- 日付は Asia/Tokyo (JST) 基準で扱う\n- 簡潔に、必要な情報だけ伝える\n\n## 今日の状況\n計画: {today_schedule}\n実績: {today_entries}\n未完了タスク: {pending_tasks}\n\n## 夜の役割\n- 今日の計画と実績の差分を分析する\n- 良かった点・改善点を伝える\n- 明日に持ち越すタスクがあれば確認する\n- 「お疲れさまでした」から始める',
  /* allowed_tools = 全ツール配列 */,
  10, 0.7, true, true
);

-- weekly (明示指定のみ)
INSERT INTO ai_contexts (
  id, name, situation, system_prompt, allowed_tools,
  max_turns, temperature, is_default, is_active
) VALUES (
  gen_random_uuid(), 'unified-weekly', 'weekly',
  E'あなたはKensanアプリのAIアシスタントです。\nユーザーのタスク管理・時間計画・目標管理・学習記録・振り返りを支援します。\n\n## ユーザー情報\n{user_memory}\n\n## ルール\n- 日本語で応答する\n- 書き込み操作（create/update/delete）は必ず提案として出す。勝手に実行しない\n- 読み取り操作はツールで即取得してよい\n- 日付は Asia/Tokyo (JST) 基準で扱う\n- 簡潔に、必要な情報だけ伝える\n\n## 今週の状況\n週間サマリー: {weekly_summary}\n目標進捗: {goal_progress}\n\n## 週次レビューの役割\n- 今週の稼働時間・目標別配分を分析する\n- 良かった点・改善点をまとめる\n- 来週に向けたアドバイスを出す\n- generate_weekly_review ツールでレビューを保存する',
  /* allowed_tools = 全ツール配列 */,
  10, 0.5, true, true
);
```

**VariableReplacer に追加が必要な変数:**

| 変数 | 既存/新規 | 実装 |
|------|-----------|------|
| `{user_memory}` | 既存 | 変更なし |
| `{today_schedule}` | 既存 | 変更なし |
| `{pending_tasks}` | 既存 | 変更なし |
| `{recent_context}` | 既存 | 変更なし |
| `{today_entries}` | **新規** | `queries/time_entries.py` から今日の実績を取得してフォーマット |
| `{weekly_summary}` | **新規** | `queries/analytics.py` から今週の集計を取得してフォーマット |
| `{goal_progress}` | **新規** | `queries/goals.py` から目標・マイルストーン進捗を取得してフォーマット |

---

## 実装順序

```
Task 1 (SSEヘルパー)
  └→ Task 2 (ツール分類)
       └→ Task 3 (AgentRunner SSE対応)
            └→ Task 4 (会話ストア)
                 └→ Task 5 (/agent/stream)
                      └→ Task 6 (/agent/approve)
Task 7 (ツール追加) ← Task 2 の後なら並行可能
Task 9 (シードデータ + VariableReplacer拡張) ← Task 7 の後
Task 8 (旧エンドポイント全廃止 + A02統合) ← Task 5-7 完了・動作確認後に実施
```

---

## テスト方針

- 各タスクで `pytest` によるユニットテスト追加
- Task 5, 6 完了後に `VITE_ENABLE_MSW=false` でフロントエンドと結合テスト
- Task 8 はフロント・バックエンド両方の変更を含むため、結合テストで以下を確認:
  - ChatPanel から「週次レビューを生成して」→ レビューが生成・表示される
  - A02_AIReview.tsx からレビュー生成 → ChatPanel が開いて agent 経由で実行
  - 旧エンドポイント (`/chat`, `/review` 等) が 404 を返す
  - 朝/夜/週次で system prompt が切り替わり、エージェントの振る舞いが変わることを確認
