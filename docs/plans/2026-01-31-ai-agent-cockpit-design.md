# AI Agent Cockpit Design

**Date**: 2026-01-31
**Status**: Draft

---

## 概要

Kensanに統一AIエージェントを導入する。チャットパネルから自然言語で全機能を操作可能にし、コクピット的に使えるようにする。

**設計方針:**
- 右側スライドインのチャットパネル
- アクション範囲: 全操作（CRUD全般 + 閲覧）
- 確認フロー: 提案→承認型（読み取りは即実行、書き込みは確認後）
- バックエンド: kensan-ai（Python）経由でClaude API tool_use
- ストリーミング: SSEでリアルタイム表示
- 既存の `/review`, `/chat`, `/advice`, `/reflect` を1つの `/agent/stream` に統一

---

## 1. アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│  Browser (React)                                     │
│                                                      │
│  ChatPanel ←→ useChatStore ←→ agentApi (SSE)        │
│                                  │                   │
│  ToolResultHandler               │                   │
│    └→ 既存Store (task, timeblock, memo...) を更新    │
└──────────────────────────────────┼───────────────────┘
                                   │ SSE (POST /agent/stream)
                                   ▼
┌─────────────────────────────────────────────────────┐
│  kensan-ai (Python)                                  │
│                                                      │
│  統一 AgentEndpoint                                  │
│    └→ Claude API (tool_use + streaming)              │
│         ├→ 全ツール定義（DB/Memory/Search/Storage）  │
│         └→ system prompt: 状況に応じて切替           │
│                                                      │
│  ToolExecutor                                        │
│    └→ HTTP calls to Go services (8081-8091)          │
└─────────────────────────────────────────────────────┘
```

**ポイント:**
1. フロントエンドはチャットUIとストア同期のみ担当。ツール実行ロジックは持たない
2. kensan-aiがClaude APIのtool_use機能を使い、エージェントループを制御
3. ツール実行結果はSSEイベントとしてフロントに流し、既存Zustandストアを更新してUIに即反映
4. 認証はフロントのJWTトークンをkensan-aiに渡し、各Goサービス呼出時にそのまま転送

---

## 2. バックエンド設計（kensan-ai）

### 2.1 統一エンドポイント

既存の `/chat`, `/chat/stream`, `/advice`, `/reflect`, `/review` を廃止し、1つに統一:

```
POST /api/v1/agent/stream
POST /api/v1/agent/approve
```

### 2.2 リクエスト/レスポンス

**リクエスト:**
```json
{
  "message": "今日の予定を立てて",
  "conversation_id": "uuid-optional",
  "situation": "auto"
}
```

- `situation`: `auto` | `morning` | `evening` | `weekly` | `chat`
- `auto` で既存のSituationDetector（時間帯判定）をそのまま活用

**SSEレスポンス:**
```
event: text
data: {"content": "今日の予定を確認しますね。"}

event: tool_call
data: {"id": "tc_1", "name": "get_tasks", "input": {"completed": false}}

event: tool_result
data: {"id": "tc_1", "name": "get_tasks", "result": [...]}

event: action_proposal
data: {"actions": [
  {"id": "a1", "type": "create_time_block", "description": "9:00-10:00 CKA勉強", "input": {...}},
  {"id": "a2", "type": "create_time_block", "description": "10:00-11:30 Kensan開発", "input": {...}}
]}

event: done
data: {"conversation_id": "uuid", "tokens": {"input": 1500, "output": 800}}
```

**承認リクエスト:**
```json
POST /api/v1/agent/approve
{
  "conversation_id": "uuid",
  "action_ids": ["a1", "a2"]
}
```

### 2.3 読み取り/書き込みの区別

エージェントループ内で、ツール呼び出しを2種類に分ける:

| 分類 | ツール | 動作 |
|------|--------|------|
| **読み取り** | get_tasks, get_goals_and_milestones, get_time_blocks, get_time_entries, get_memos, get_notes, get_analytics_summary, get_daily_summary, get_user_memory, get_user_facts, get_recent_interactions, semantic_search, keyword_search, hybrid_search | 即座に実行し、tool_result を返す |
| **書き込み** | create_*, update_*, delete_* | `action_proposal` イベントとして提案。ユーザー承認後に `/approve` で実行 |

### 2.4 ツール拡張

既存ツール（18個）に加えて、全操作をカバーする追加ツール:

```
# Goal管理
create_goal, update_goal, delete_goal

# Milestone管理
create_milestone, update_milestone, delete_milestone

# Task管理（既存 + 追加）
delete_task

# TimeBlock管理（既存 + 追加）
update_time_block, delete_time_block

# Memo管理
get_memos, create_memo

# Note管理
get_notes, create_note, update_note

# Analytics
get_analytics_summary, get_daily_summary
```

### 2.5 System Prompt 切替

状況に応じて system prompt を切り替え（既存の SituationDetector + ContextResolver を活用）:

| Situation | System Prompt の特徴 |
|-----------|---------------------|
| morning | 朝の計画立案にフォーカス。今日のタスク・予定を把握して提案 |
| evening | 振り返りにフォーカス。実績と予定の差分を分析 |
| weekly | 週次レビュー。目標進捗・稼働分析 |
| chat | 汎用。ユーザーの指示に応じて柔軟に対応 |
| auto | 時間帯で自動判定（5-10時→morning, 17-22時→evening, それ以外→chat） |

すべての状況で全ツールが使用可能。prompt が誘導するだけ。

---

## 3. フロントエンドUI設計

### 3.1 レイアウト

```
┌─ Header ─────────────────────────────────────────────────────────┐
│ [☰ Sidebar]  Kensan  [Timer] [🌙] [🔔] [⚙] [AI🤖] [User]     │
├──────────────────────────────────────────┬───────────────────────┤
│                                          │  AI Assistant    [×]  │
│          メインコンテンツ                 │  ──────────────────── │
│          (DailyPage等)                   │                       │
│                                          │  ☀ おはようございます！│
│          ← パネル開閉で幅が動的に変化     │  今日の予定を立てま    │
│                                          │  しょうか？           │
│                                          │                       │
│                                          │  👤 今日の予定立てて   │
│                                          │                       │
│                                          │  🔍 タスク確認中...    │
│                                          │                       │
│                                          │  ☀ 提案：             │
│                                          │ ┌─ 提案 ────────────┐│
│                                          │ │ ☑ 9:00 CKA勉強    ││
│                                          │ │ ☑ 10:00 Kensan開発 ││
│                                          │ │ ☑ 13:00 ブログ執筆 ││
│                                          │ │ [全て承認] [却下]   ││
│                                          │ └────────────────────┘│
│                                          │                       │
│                                          │  [メッセージ入力... ▶]│
└──────────────────────────────────────────┴───────────────────────┘
```

### 3.2 コンポーネント構成

```
src/components/agent/
├── ChatPanel.tsx          # スライドインパネル全体
├── ChatHeader.tsx         # パネルヘッダー（タイトル、新規会話、閉じる）
├── ChatMessageList.tsx    # メッセージ一覧（スクロール）
├── ChatMessage.tsx        # 個別メッセージ表示
├── ChatInput.tsx          # テキスト入力 + 送信
├── ActionProposal.tsx     # 書き込みアクションの承認UI
└── ToolCallIndicator.tsx  # ツール実行中の表示
```

### 3.3 ChatMessage の種類

| タイプ | 表示 |
|--------|------|
| user | 右寄せ、ユーザーアイコン、テキスト |
| assistant_text | 左寄せ、AIアイコン、テキスト（Markdown対応） |
| tool_call | 左寄せ、小さいインジケーター「🔍 タスクを確認中...」 |
| action_proposal | 左寄せ、承認UIカード（チェックボックス + ボタン） |

### 3.4 Zustand Store

```typescript
// src/stores/chatStore.ts

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  type: 'text' | 'tool_call' | 'tool_result' | 'action_proposal'
  toolName?: string
  actions?: ActionItem[]
  timestamp: Date
}

interface ActionItem {
  id: string
  type: string       // create_time_block, create_task, etc.
  description: string // 人間可読の説明
  input: Record<string, unknown>
  approved?: boolean
}

interface ChatStore {
  // State
  isOpen: boolean
  messages: ChatMessage[]
  conversationId: string | null
  isStreaming: boolean
  pendingActions: ActionItem[] | null

  // Actions
  toggle: () => void
  open: () => void
  close: () => void
  sendMessage: (text: string) => Promise<void>
  approveActions: (actionIds: string[]) => Promise<void>
  rejectActions: () => void
  newConversation: () => void
}
```

### 3.5 既存UIへの影響

| ファイル | 変更内容 |
|----------|---------|
| `Layout.tsx` | ChatPanel をメインコンテンツ横に条件付き表示 |
| `Header.tsx` | AIボタン追加（Bot アイコン） |
| `FloatingMemoButton` | そのまま維持（チャットパネルとは独立） |

---

## 4. データフロー

### 4.1 読み取り系（即実行）

```
ユーザー: "今日のタスク見せて"
    │
    ├→ useChatStore.sendMessage()
    │     └→ POST /api/v1/agent/stream (SSE)
    │
    ├← event: text "確認しますね"
    │     └→ messages に追加
    │
    ├← event: tool_call {get_tasks}
    │     └→ messages に「タスク取得中...」表示
    │
    ├← event: tool_result {tasks: [...]}
    │     └→ インジケーター消去
    │
    ├← event: text "5件のタスクがあります..."
    │     └→ messages に追加
    │
    └← event: done
```

### 4.2 書き込み系（承認フロー）

```
ユーザー: "今日の予定立てて"
    │
    ├← event: tool_call {get_tasks}    ← 読取り: 自動実行
    ├← event: tool_result {tasks}
    ├← event: text "以下を提案します："
    │
    ├← event: action_proposal          ← 書き込み: 提案のみ
    │   {actions: [{create_time_block, ...}, ...]}
    │     └→ pendingActions にセット → ActionProposal UI表示
    │
    ├─ ユーザーが「全て承認」クリック
    │     └→ approveActions()
    │           └→ POST /api/v1/agent/approve
    │
    ├← event: tool_call {create_time_block}
    ├← event: tool_result {created}
    │     └→ useTimeBlockStore.fetchTimeBlocks() ← 既存ストア更新
    │
    └← event: text "作成しました！"
```

### 4.3 ストア同期

ツール実行結果がSSEで返ったとき、`tool_name` に応じて対応するZustandストアを再フェッチ:

```typescript
const STORE_REFRESH_MAP: Record<string, () => void> = {
  create_task:        () => useTaskStore.getState().fetchTasks(),
  update_task:        () => useTaskStore.getState().fetchTasks(),
  delete_task:        () => useTaskStore.getState().fetchTasks(),
  create_time_block:  () => useTimeBlockStore.getState().fetchTimeBlocks(date),
  update_time_block:  () => useTimeBlockStore.getState().fetchTimeBlocks(date),
  delete_time_block:  () => useTimeBlockStore.getState().fetchTimeBlocks(date),
  create_goal:        () => useGoalStore.getState().fetchGoals(),
  update_goal:        () => useGoalStore.getState().fetchGoals(),
  create_milestone:   () => useMilestoneStore.getState().fetchMilestones(),
  create_memo:        () => useMemoStore.getState().fetchMemos(),
  create_note:        () => useNoteStore.getState().fetchNotes(),
  // ...
}
```

---

## 5. 実装フェーズ

### Phase 1: フロントエンド（モック）
- ChatPanel UI コンポーネント群
- useChatStore
- Layout への統合
- MSW でモックレスポンス（SSEシミュレーション）

### Phase 2: バックエンド統一
- kensan-ai の `/agent/stream` エンドポイント
- 読み取り/書き込みの区別ロジック
- action_proposal SSEイベント
- `/agent/approve` エンドポイント

### Phase 3: ツール拡張
- 不足しているツールの追加（Goal/Milestone CRUD, Note, Memo等）
- 全ツールの動作確認

### Phase 4: ストア同期
- ToolResultHandler 実装
- 既存ストアとの連携テスト

---

## 6. 技術的考慮事項

### SSE実装
- フロント: `EventSource` または `fetch` + `ReadableStream`（POST対応のため後者推奨）
- バックエンド: FastAPI の `StreamingResponse` + `text/event-stream`

### 承認フローの状態管理
- kensan-ai が conversation ごとに pending_actions を保持
- approve リクエスト時に conversation_id で紐付けて実行
- タイムアウト: 一定時間承認がなければ proposal を破棄

### エラーハンドリング
- SSE接続切断時の再接続（exponential backoff）
- ツール実行エラー時: エラーメッセージをチャットに表示
- ネットワークエラー: リトライプロンプト表示

### パフォーマンス
- メッセージ履歴の上限（直近50件程度、古いものはサマリー化）
- ストア再フェッチはデバウンス付き（連続実行時にまとめる）
