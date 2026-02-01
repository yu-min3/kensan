# AI Agent Cockpit - アーキテクチャ図

---

## 1. 全体構成

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser                                                            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐│
│  │  DailyPage   │  │  A02_AIReview│  │      ChatPanel             ││
│  │  TaskPage    │  │  (簡素化)    │  │  ┌──────────────────────┐  ││
│  │  NotePage    │  │      │       │  │  │ ChatMessageList      │  ││
│  │  ...         │  │      │       │  │  │  ├ ChatMessage (user) │  ││
│  │              │  │  sendPrefilled│  │  │  ├ ChatMessage (bot)  │  ││
│  │              │  │      │       │  │  │  ├ ToolCallIndicator  │  ││
│  └──────────────┘  └──────┼───────┘  │  │  └ ActionProposal    │  ││
│                           │          │  ├──────────────────────┤  ││
│                           └──────────┼─▶│ ChatInput            │  ││
│                                      │  └──────────────────────┘  ││
│                                      └─────────────┬──────────────┘│
│                                                     │               │
│  ┌─ useChatStore ───────────────────────────────────┤               │
│  │  messages[], isStreaming, pendingActions,         │               │
│  │  conversationId, sendPrefilled()                 │               │
│  └──────────────────────────────────────────────────┤               │
│                                                     │               │
│  ┌─ agentApi ───────────────────────────────────────┤               │
│  │  streamAgentChat()  ── POST + ReadableStream     │               │
│  │  approveActions()   ── POST + ReadableStream     │               │
│  └──────────────────────────────────────────────────┘               │
└──────────────────────────────────────┬──────────────────────────────┘
                                       │ SSE (text/event-stream)
                                       │
                          POST /api/v1/agent/stream
                          POST /api/v1/agent/approve
                                       │
┌──────────────────────────────────────┼──────────────────────────────┐
│  kensan-ai (FastAPI)                 │                              │
│                                      ▼                              │
│  ┌─ routes.py ──────────────────────────────────────┐               │
│  │  agent_stream()    → StreamingResponse (SSE)     │               │
│  │  agent_approve()   → StreamingResponse (SSE)     │               │
│  │  health()                                        │               │
│  │  feedback()                                      │               │
│  └──────────────────────────────────────────────────┘               │
│          │                                                          │
│          ▼                                                          │
│  ┌─ Context Pipeline ──────────────────────────────┐                │
│  │  SituationDetector → ContextResolver → VarReplacer              │
│  └─────────────────────────────────────────────────┘                │
│          │                                                          │
│          ▼                                                          │
│  ┌─ AgentRunner.stream_sse() ──────────────────────┐                │
│  │  Claude API (tool_use + streaming)              │                │
│  │     ├─ テキスト → SSE text event                │                │
│  │     ├─ 読み取りツール → 即実行 → SSE tool_*     │                │
│  │     └─ 書き込みツール → SSE action_proposal     │                │
│  └─────────────────────────────────────────────────┘                │
│          │                                                          │
│          ▼                                                          │
│  ┌─ Tool Registry (37 tools) ──────────────────────┐                │
│  │  @tool(name, description, input_schema, readonly)               │
│  │     ├─ db_tools.py      (タスク, TB, 目標, メモ, ノート)        │
│  │     ├─ review_tools.py  (レビュー生成/取得)                     │
│  │     ├─ analytics_tools.py (集計/サマリー)                       │
│  │     ├─ memory_tools.py  (ユーザー記憶/ファクト)                 │
│  │     ├─ search_tools.py  (セマンティック/キーワード/ハイブリッド) │
│  │     └─ storage_tools.py (R2ファイル操作)                        │
│  └─────────────────────────────────────────────────┘                │
│          │                                                          │
│          ▼                                                          │
│  ┌─ DB Queries ────────────────────────────────────┐                │
│  │  queries/{goals,tasks,time_blocks,time_entries,  │                │
│  │          memos,notes,ai_reviews,analytics}.py    │                │
│  └──────────────────────┬──────────────────────────┘                │
└─────────────────────────┼───────────────────────────────────────────┘
                          │ asyncpg
                          ▼
                 ┌─────────────────┐
                 │  PostgreSQL 16  │
                 │                 │
                 │  goals          │
                 │  milestones     │
                 │  tasks          │◄─── Go task-service (8082) も同じDBに書き込み
                 │  time_blocks    │◄─── Go timeblock-service (8084)
                 │  time_entries   │
                 │  memos          │◄─── Go memo-service (8090)
                 │  notes          │◄─── Go note-service (8091)
                 │  ai_contexts    │
                 │  ai_reviews     │
                 │  ai_interactions│
                 │  user_memory    │
                 │  user_facts     │
                 └─────────────────┘
```

---

## 2. リクエストフロー: 読み取り系

```
ユーザー: 「タスク見せて」
    │
    ▼
┌─ ChatPanel ──────────────────────────────────┐
│ 1. addMessage({role:"user", content:"..."})  │
│ 2. setStreaming(true)                        │
│ 3. POST /agent/stream {message, situation}   │
└──────────────────────┬───────────────────────┘
                       │
    ┌──────────────────┼─── SSE events ────────────────────┐
    │                  ▼                                    │
    │  ┌─ kensan-ai ────────────────────────────────────┐  │
    │  │                                                │  │
    │  │  detect("auto") → "chat"                       │  │
    │  │  resolve("chat") → context{prompt, tools}      │  │
    │  │  replace(prompt) → "あなたは...{pending_tasks}" │  │
    │  │       │                                        │  │
    │  │       ▼                                        │  │
    │  │  Claude API: "タスク見せて"                     │  │
    │  │       │                                        │  │
    │  │       ├─ text: "確認しますね"      ─────────────┼──┼──▶ event: text
    │  │       │                                        │  │
    │  │       ├─ tool_use: get_tasks       ─────────────┼──┼──▶ event: tool_call
    │  │       │    │                                   │  │
    │  │       │    ├─ readonly=True → 即実行            │  │
    │  │       │    └─ result: [{id,name}...]────────────┼──┼──▶ event: tool_result
    │  │       │                                        │  │
    │  │       ├─ text: "5件あります：..."  ─────────────┼──┼──▶ event: text
    │  │       │                                        │  │
    │  │       └─ end_turn                 ─────────────┼──┼──▶ event: done
    │  └────────────────────────────────────────────────┘  │
    └──────────────────────────────────────────────────────┘
                       │
                       ▼
┌─ ChatPanel ──────────────────────────────────┐
│ messages = [                                 │
│   {user, "タスク見せて"},                     │
│   {assistant, "確認しますね"},                │
│   {assistant, "5件あります：..."},           │
│ ]                                            │
│ setStreaming(false)                           │
└──────────────────────────────────────────────┘
```

---

## 3. リクエストフロー: 書き込み系（提案→承認）

```
ユーザー: 「今日の予定立てて」
    │
    ▼
POST /agent/stream
    │
    ├─▶ event: text       "確認して提案しますね"
    ├─▶ event: tool_call  get_tasks (readonly → 即実行)
    ├─▶ event: tool_result [{...tasks}]
    ├─▶ event: tool_call  get_time_blocks (readonly → 即実行)
    ├─▶ event: tool_result [{...blocks}]
    │
    │   Claude: "create_time_block を3回呼びたい"
    │   → readonly=False → 提案として蓄積（実行しない）
    │
    ├─▶ event: text       "以下を提案します："
    ├─▶ event: action_proposal
    │     {actions: [
    │       {id:"a1", type:"create_time_block", description:"9:00-10:00 CKA勉強", input:{...}},
    │       {id:"a2", type:"create_time_block", description:"10:00-12:00 Kensan開発", input:{...}},
    │       {id:"a3", type:"create_time_block", description:"13:00-14:00 ブログ執筆", input:{...}},
    │     ]}
    ├─▶ event: done
    │
    ▼
┌─ ChatPanel ──────────────────────────────────────────┐
│  ┌─ ActionProposal ───────────────────────────────┐  │
│  │  [x] 9:00-10:00 CKA勉強                       │  │
│  │  [x] 10:00-12:00 Kensan開発                    │  │
│  │  [ ] 13:00-14:00 ブログ執筆  ← ユーザーが外す  │  │
│  │                                                │  │
│  │  [承認 (2)]  [却下]                             │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────────────┘
                       │ ユーザーが「承認」クリック
                       ▼
POST /api/v1/agent/approve
  {conversation_id, action_ids: ["a1","a2"]}
    │
    ├─▶ event: tool_call   create_time_block (a1実行)
    ├─▶ event: tool_result  {created: ...}
    ├─▶ event: tool_call   create_time_block (a2実行)
    ├─▶ event: tool_result  {created: ...}
    ├─▶ event: text        "2件のタイムブロックを作成しました"
    └─▶ event: done
```

---

## 4. コンテキスト切り替えパイプライン

```
               リクエスト
                  │
                  │ situation = "auto" | "morning" | "evening" | "weekly" | "chat"
                  ▼
     ┌─ SituationDetector ───────────────────────────────┐
     │                                                   │
     │  "auto" の場合:                                    │
     │    05:00-10:00 JST → morning                      │
     │    10:00-17:00 JST → chat                         │
     │    17:00-22:00 JST → evening                      │
     │    22:00-05:00 JST → chat                         │
     │                                                   │
     │  明示指定("weekly"等) → そのまま使用               │
     │                                                   │
     └───────────────────────────┬───────────────────────┘
                                 │ Situation enum
                                 ▼
     ┌─ ContextResolver ────────────────────────────────┐
     │                                                  │
     │  SELECT * FROM ai_contexts                       │
     │  WHERE situation = $1 AND is_active = true       │
     │                                                  │
     │  ┌────────────┬──────────────────────┬─────────┐ │
     │  │ situation  │ system_prompt        │ tools   │ │
     │  ├────────────┼──────────────────────┼─────────┤ │
     │  │ morning    │ "...朝の役割..."     │ 全37    │ │
     │  │ evening    │ "...夜の役割..."     │ 全37    │ │
     │  │ weekly     │ "...週次レビュー..." │ 全37    │ │
     │  │ chat       │ "...汎用..."        │ 全37    │ │
     │  └────────────┴──────────────────────┴─────────┘ │
     │                                                  │
     └───────────────────────────┬──────────────────────┘
                                 │ AgentContext
                                 ▼
     ┌─ VariableReplacer ──────────────────────────────┐
     │                                                 │
     │  prompt 内の {変数} をスキャン                    │
     │  含まれる変数のみDBから取得（lazy）              │
     │                                                 │
     │  morning prompt の場合:                          │
     │    {user_memory}    → "Yu: GK取得目指す..."     │
     │    {today_schedule} → "9:00 CKA, 10:00 ..."    │
     │    {pending_tasks}  → "- CKA模試, - Kensan..." │
     │    {recent_context} → "昨日: タスク3件完了"     │
     │                                                 │
     │  evening prompt の場合:                          │
     │    {user_memory}    → (同上)                    │
     │    {today_schedule} → (同上)                    │
     │    {today_entries}  → "9:00-10:30 CKA 1.5h"   │ ← 新規変数
     │    {pending_tasks}  → (同上)                    │
     │                                                 │
     │  weekly prompt の場合:                           │
     │    {user_memory}    → (同上)                    │
     │    {weekly_summary} → "合計 32h, GK:12h..."    │ ← 新規変数
     │    {goal_progress}  → "GK: CKA合格, CKAD..."   │ ← 新規変数
     │                                                 │
     └───────────────────────────┬──────────────────────┘
                                 │ 完成した system_prompt
                                 ▼
     ┌─ AgentRunner.stream_sse() ──────────────────────┐
     │                                                 │
     │  Claude API に送信:                              │
     │    system = 完成した system_prompt               │
     │    tools  = build_tools_param(allowed_tools)    │
     │    messages = 会話履歴 + 新メッセージ            │
     │                                                 │
     └─────────────────────────────────────────────────┘
```

---

## 5. ツール実行フロー（AgentRunner 内部）

```
Claude API レスポンス
    │
    ├─ content_block: text
    │   └─▶ yield sse_event("text", {content})
    │
    ├─ content_block: tool_use
    │   │
    │   ├─ is_readonly_tool(name) == True
    │   │   │
    │   │   ├─▶ yield sse_event("tool_call", {id, name, input})
    │   │   │
    │   │   ├─ result = await execute_tool(name, {**input, user_id})
    │   │   │
    │   │   ├─▶ yield sse_event("tool_result", {id, name, result})
    │   │   │
    │   │   └─ message_history に tool_result 追加
    │   │      → 次のターンで Claude に渡す → ループ継続
    │   │
    │   └─ is_readonly_tool(name) == False
    │       │
    │       └─ pending_actions.append({
    │            id: generate_id(),
    │            tool_name: name,
    │            description: Claude が生成した説明,
    │            input: {**input, user_id}
    │          })
    │          → Claude には tool_result として
    │            "ユーザーの承認待ちです" を返す
    │          → ループ継続
    │
    └─ stop_reason: end_turn
        │
        ├─ pending_actions がある場合:
        │   └─▶ yield sse_event("action_proposal", {actions: [...]})
        │       → ConversationStore に保存
        │
        └─▶ yield sse_event("done", {conversation_id, tokens})
```

---

## 6. 廃止される旧エンドポイント

```
  廃止 (Phase 2 で削除)                     統一先
  ─────────────────────                     ─────────────────
  POST /chat              ──────────┐
  POST /chat/stream       ──────────┤
  POST /advice            ──────────┤
  POST /reflect           ──────────┼────▶  POST /agent/stream
  POST /review            ──────────┤       (situation で振り分け)
  POST /ai/reviews/generate ────────┤
  POST /ai/ask            ──────────┘

  GET /ai/reviews         ──────────┐
  GET /ai/reviews/{id}    ──────────┼────▶  ツール経由 (get_reviews, get_review)
                                    │       ChatPanel から自然言語で呼び出し
                                    │

  維持されるエンドポイント
  ─────────────────────
  GET  /health                      ← ヘルスチェック
  POST /interactions/{id}/feedback  ← フィードバック記録
  POST /agent/stream                ← 新: 統一チャット
  POST /agent/approve               ← 新: アクション承認
```
