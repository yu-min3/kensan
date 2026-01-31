# AI Agent Cockpit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an AI agent chat panel to Kensan that can read and write all app data via natural language, with streaming responses and proposal-based approval for write operations.

**Architecture:** Right-side slide-in chat panel in React, backed by kensan-ai's unified `/agent/stream` SSE endpoint. Claude API tool_use handles the agent loop server-side. Frontend handles UI + store sync only. Phase 1 focuses on the frontend with MSW mocks.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS, shadcn/ui, MSW (mocks), SSE via fetch+ReadableStream

**Design doc:** `docs/plans/2026-01-31-ai-agent-cockpit-design.md`

---

## Phase 1: フロントエンド（MSWモック付き）

### Task 1: useChatStore — Zustand ストア

**Files:**
- Create: `src/stores/useChatStore.ts`

**Step 1: ストアを作成**

```typescript
// src/stores/useChatStore.ts
import { create } from 'zustand'

export interface ActionItem {
  id: string
  type: string
  description: string
  input: Record<string, unknown>
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  type: 'text' | 'tool_call' | 'tool_result' | 'action_proposal'
  toolName?: string
  actions?: ActionItem[]
  timestamp: Date
}

interface ChatState {
  isOpen: boolean
  messages: ChatMessage[]
  conversationId: string | null
  isStreaming: boolean
  pendingActions: ActionItem[] | null
}

interface ChatActions {
  toggle: () => void
  open: () => void
  close: () => void
  addMessage: (message: ChatMessage) => void
  appendToLastAssistantMessage: (text: string) => void
  setStreaming: (streaming: boolean) => void
  setPendingActions: (actions: ActionItem[] | null) => void
  setConversationId: (id: string | null) => void
  newConversation: () => void
}

export type ChatStore = ChatState & ChatActions

export const useChatStore = create<ChatStore>((set) => ({
  isOpen: false,
  messages: [],
  conversationId: null,
  isStreaming: false,
  pendingActions: null,

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),

  appendToLastAssistantMessage: (text) =>
    set((s) => {
      const messages = [...s.messages]
      const last = messages[messages.length - 1]
      if (last && last.role === 'assistant' && last.type === 'text') {
        messages[messages.length - 1] = { ...last, content: last.content + text }
      }
      return { messages }
    }),

  setStreaming: (isStreaming) => set({ isStreaming }),
  setPendingActions: (pendingActions) => set({ pendingActions }),
  setConversationId: (conversationId) => set({ conversationId }),

  newConversation: () =>
    set({ messages: [], conversationId: null, pendingActions: null }),
}))
```

**Step 2: ビルド確認**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npx tsc --noEmit`
Expected: No errors

**Step 3: コミット**

```bash
git add src/stores/useChatStore.ts
git commit -m "feat: add useChatStore for AI agent chat panel"
```

---

### Task 2: SSE パーサー — agentApi

**Files:**
- Create: `src/api/services/agent.ts`

**Step 1: SSEストリーム処理のAPIサービスを作成**

```typescript
// src/api/services/agent.ts
import { API_CONFIG } from '../config'
import { httpClient } from '../client'

const BASE_URL = API_CONFIG.baseUrls.ai

export interface AgentStreamEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'action_proposal' | 'done' | 'error'
  data: Record<string, unknown>
}

export interface AgentStreamRequest {
  message: string
  conversation_id?: string | null
  situation?: 'auto' | 'morning' | 'evening' | 'weekly' | 'chat'
}

export interface AgentApproveRequest {
  conversation_id: string
  action_ids: string[]
}

/**
 * Parse SSE lines from a text chunk.
 * SSE format: "event: <type>\ndata: <json>\n\n"
 */
function parseSSEEvents(text: string): AgentStreamEvent[] {
  const events: AgentStreamEvent[] = []
  const blocks = text.split('\n\n').filter(Boolean)

  for (const block of blocks) {
    const lines = block.split('\n')
    let eventType = 'text'
    let dataStr = ''

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        dataStr += line.slice(6)
      }
    }

    if (dataStr) {
      try {
        events.push({ type: eventType as AgentStreamEvent['type'], data: JSON.parse(dataStr) })
      } catch {
        // text events may just have {content: "..."}
        events.push({ type: eventType as AgentStreamEvent['type'], data: { content: dataStr } })
      }
    }
  }

  return events
}

/**
 * Stream agent response via SSE (POST with fetch + ReadableStream).
 * Yields parsed SSE events.
 */
export async function* streamAgentChat(
  request: AgentStreamRequest,
  signal?: AbortSignal
): AsyncGenerator<AgentStreamEvent> {
  const token = httpClient.getAuthToken()
  const url = `${BASE_URL}/api/v1/agent/stream`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Agent stream failed: ${response.status} ${errorText}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Process complete SSE blocks (separated by double newline)
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || '' // Keep incomplete part in buffer

    for (const part of parts) {
      if (!part.trim()) continue
      const events = parseSSEEvents(part + '\n\n')
      for (const event of events) {
        yield event
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    const events = parseSSEEvents(buffer + '\n\n')
    for (const event of events) {
      yield event
    }
  }
}

/**
 * Approve proposed actions.
 */
export async function approveActions(request: AgentApproveRequest): Promise<void> {
  await httpClient.post(BASE_URL, '/agent/approve', request)
}
```

**Step 2: ビルド確認**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npx tsc --noEmit`
Expected: No errors

**Step 3: コミット**

```bash
git add src/api/services/agent.ts
git commit -m "feat: add agent SSE streaming API service"
```

---

### Task 3: MSW ハンドラー — エージェントモック

**Files:**
- Create: `src/mocks/handlers/agent.ts`
- Modify: `src/mocks/handlers.ts`

**Step 1: エージェント用MSWハンドラーを作成**

SSEレスポンスをシミュレートするハンドラー。実際のAIの代わりに固定シナリオで応答する。

```typescript
// src/mocks/handlers/agent.ts
import { http, HttpResponse } from 'msw'
import { tasks, timeBlocks } from '../data'
import { generateId } from '../data'

const BASE_URL = 'http://localhost:8089/api/v1'

function sseEvent(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const agentHandlers = [
  // POST /agent/stream - SSE streaming endpoint
  http.post(`${BASE_URL}/agent/stream`, async ({ request }) => {
    const body = (await request.json()) as {
      message: string
      conversation_id?: string
      situation?: string
    }
    const message = body.message.toLowerCase()
    const conversationId = body.conversation_id || generateId('conv')

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Simple pattern matching for mock responses
        if (message.includes('タスク') && (message.includes('見せて') || message.includes('確認') || message.includes('一覧'))) {
          // Read-only: show tasks
          controller.enqueue(encoder.encode(sseEvent('text', { content: 'タスクを確認しますね。' })))
          await delay(300)

          const incompleteTasks = tasks.filter((t) => !t.completed).slice(0, 5)
          controller.enqueue(encoder.encode(sseEvent('tool_call', {
            id: 'tc_1', name: 'get_tasks', input: { completed: false },
          })))
          await delay(500)

          controller.enqueue(encoder.encode(sseEvent('tool_result', {
            id: 'tc_1', name: 'get_tasks', result: incompleteTasks.map((t) => ({ id: t.id, name: t.name, goalName: t.goalName })),
          })))
          await delay(300)

          const taskList = incompleteTasks.map((t) => `- ${t.name}`).join('\n')
          controller.enqueue(encoder.encode(sseEvent('text', {
            content: `未完了タスクが${incompleteTasks.length}件あります：\n\n${taskList}`,
          })))
        } else if (message.includes('予定') && (message.includes('立てて') || message.includes('作って') || message.includes('計画'))) {
          // Write: propose time blocks
          controller.enqueue(encoder.encode(sseEvent('text', { content: 'タスクを確認して、今日のスケジュールを提案しますね。' })))
          await delay(300)

          controller.enqueue(encoder.encode(sseEvent('tool_call', {
            id: 'tc_1', name: 'get_tasks', input: { completed: false },
          })))
          await delay(500)

          const incompleteTasks = tasks.filter((t) => !t.completed).slice(0, 3)
          controller.enqueue(encoder.encode(sseEvent('tool_result', {
            id: 'tc_1', name: 'get_tasks', result: incompleteTasks.map((t) => ({ id: t.id, name: t.name })),
          })))
          await delay(300)

          controller.enqueue(encoder.encode(sseEvent('text', { content: '以下のスケジュールを提案します：' })))
          await delay(200)

          const actions = incompleteTasks.map((t, i) => ({
            id: `a${i + 1}`,
            type: 'create_time_block',
            description: `${9 + i * 2}:00-${10 + i * 2}:00 ${t.name}`,
            input: {
              date: new Date().toISOString().split('T')[0],
              startTime: `${String(9 + i * 2).padStart(2, '0')}:00`,
              endTime: `${String(10 + i * 2).padStart(2, '0')}:00`,
              taskId: t.id,
              title: t.name,
            },
          }))

          controller.enqueue(encoder.encode(sseEvent('action_proposal', { actions })))
        } else {
          // General chat
          controller.enqueue(encoder.encode(sseEvent('text', {
            content: `了解しました。「${body.message}」についてお手伝いします。\n\n現在の状況を確認しました。何か具体的に操作したいことがあれば教えてください。`,
          })))
        }

        await delay(200)
        controller.enqueue(encoder.encode(sseEvent('done', {
          conversation_id: conversationId,
          tokens: { input: 500, output: 200 },
        })))

        controller.close()
      },
    })

    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }),

  // POST /agent/approve - Execute approved actions
  http.post(`${BASE_URL}/agent/approve`, async ({ request }) => {
    const body = (await request.json()) as {
      conversation_id: string
      action_ids: string[]
    }

    // Simulate creating time blocks
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        for (const actionId of body.action_ids) {
          controller.enqueue(encoder.encode(sseEvent('tool_call', {
            id: `tc_${actionId}`, name: 'create_time_block', input: {},
          })))
          await delay(300)

          const newBlock = {
            id: generateId('tb'),
            title: `提案されたブロック ${actionId}`,
          }
          controller.enqueue(encoder.encode(sseEvent('tool_result', {
            id: `tc_${actionId}`, name: 'create_time_block', result: newBlock,
          })))
          await delay(200)
        }

        controller.enqueue(encoder.encode(sseEvent('text', {
          content: `${body.action_ids.length}件のタイムブロックを作成しました。`,
        })))
        controller.enqueue(encoder.encode(sseEvent('done', {
          conversation_id: body.conversation_id,
          tokens: { input: 100, output: 50 },
        })))
        controller.close()
      },
    })

    return new HttpResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }),
]
```

**Step 2: handlers.ts にエージェントハンドラーを追加**

`src/mocks/handlers.ts` に以下を追加:

```typescript
import { agentHandlers } from './handlers/agent'

// ...既存の handlers 配列に追加:
  ...agentHandlers,
```

**Step 3: ビルド確認**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npx tsc --noEmit`
Expected: No errors

**Step 4: コミット**

```bash
git add src/mocks/handlers/agent.ts src/mocks/handlers.ts
git commit -m "feat: add MSW handlers for agent SSE streaming mock"
```

---

### Task 4: ChatInput コンポーネント

**Files:**
- Create: `src/components/agent/ChatInput.tsx`

**Step 1: チャット入力コンポーネントを作成**

```typescript
// src/components/agent/ChatInput.tsx
import { useState, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <div className="flex items-end gap-2 p-3 border-t">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="メッセージを入力..."
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
      />
      <Button
        size="icon"
        onClick={handleSend}
        disabled={disabled || !input.trim()}
        className="shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
```

**Step 2: ビルド確認**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npx tsc --noEmit`

**Step 3: コミット**

```bash
git add src/components/agent/ChatInput.tsx
git commit -m "feat: add ChatInput component for agent panel"
```

---

### Task 5: ChatMessage コンポーネント

**Files:**
- Create: `src/components/agent/ChatMessage.tsx`

**Step 1: メッセージ表示コンポーネントを作成**

```typescript
// src/components/agent/ChatMessage.tsx
import { Bot, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/stores/useChatStore'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  if (message.type === 'tool_call') {
    return (
      <div className="flex items-center gap-2 px-4 py-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{getToolLabel(message.toolName || '')}...</span>
      </div>
    )
  }

  if (message.type === 'tool_result') {
    return null // tool_result は表示しない（tool_call のインジケーターが消えるだけ）
  }

  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-2 px-4 py-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      )}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn(
        'rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
      )}>
        {message.content}
      </div>
    </div>
  )
}

function getToolLabel(toolName: string): string {
  const labels: Record<string, string> = {
    get_tasks: 'タスクを確認中',
    get_goals_and_milestones: '目標を確認中',
    get_time_blocks: 'タイムブロックを確認中',
    get_time_entries: '実績を確認中',
    get_memos: 'メモを確認中',
    get_notes: 'ノートを確認中',
    create_task: 'タスクを作成中',
    create_time_block: 'タイムブロックを作成中',
    create_memo: 'メモを作成中',
  }
  return labels[toolName] || `${toolName} を実行中`
}
```

**Step 2: ビルド確認**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npx tsc --noEmit`

**Step 3: コミット**

```bash
git add src/components/agent/ChatMessage.tsx
git commit -m "feat: add ChatMessage component with tool call indicators"
```

---

### Task 6: ActionProposal コンポーネント

**Files:**
- Create: `src/components/agent/ActionProposal.tsx`

**Step 1: 承認UIコンポーネントを作成**

```typescript
// src/components/agent/ActionProposal.tsx
import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ActionItem } from '@/stores/useChatStore'

interface ActionProposalProps {
  actions: ActionItem[]
  onApprove: (actionIds: string[]) => void
  onReject: () => void
  disabled?: boolean
}

export function ActionProposal({ actions, onApprove, onReject, disabled }: ActionProposalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(actions.map((a) => a.id))
  )

  const toggleAction = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="mx-4 my-2 rounded-lg border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">提案されたアクション</p>
      <div className="space-y-1.5">
        {actions.map((action) => (
          <label
            key={action.id}
            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1"
          >
            <input
              type="checkbox"
              checked={selected.has(action.id)}
              onChange={() => toggleAction(action.id)}
              disabled={disabled}
              className="rounded border-input"
            />
            <span>{action.description}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          onClick={() => onApprove(Array.from(selected))}
          disabled={disabled || selected.size === 0}
          className="flex-1"
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          承認 ({selected.size})
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          disabled={disabled}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          却下
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: ビルド確認**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npx tsc --noEmit`

**Step 3: コミット**

```bash
git add src/components/agent/ActionProposal.tsx
git commit -m "feat: add ActionProposal component for write action approval"
```

---

### Task 7: ChatPanel コンポーネント — メインパネル

**Files:**
- Create: `src/components/agent/ChatPanel.tsx`

**Step 1: チャットパネル全体のコンポーネントを作成**

```typescript
// src/components/agent/ChatPanel.tsx
import { useEffect, useRef, useCallback } from 'react'
import { X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/useChatStore'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ActionProposal } from './ActionProposal'
import { streamAgentChat, approveActions } from '@/api/services/agent'
import type { AgentStreamEvent } from '@/api/services/agent'

export function ChatPanel() {
  const {
    isOpen,
    messages,
    conversationId,
    isStreaming,
    pendingActions,
    close,
    addMessage,
    appendToLastAssistantMessage,
    setStreaming,
    setPendingActions,
    setConversationId,
    newConversation,
  } = useChatStore()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSSEEvent = useCallback((event: AgentStreamEvent) => {
    switch (event.type) {
      case 'text':
        // Check if last message is assistant text — append, otherwise create new
        {
          const msgs = useChatStore.getState().messages
          const last = msgs[msgs.length - 1]
          if (last && last.role === 'assistant' && last.type === 'text') {
            appendToLastAssistantMessage(event.data.content as string)
          } else {
            addMessage({
              id: crypto.randomUUID(),
              role: 'assistant',
              content: event.data.content as string,
              type: 'text',
              timestamp: new Date(),
            })
          }
        }
        break

      case 'tool_call':
        addMessage({
          id: event.data.id as string,
          role: 'assistant',
          content: '',
          type: 'tool_call',
          toolName: event.data.name as string,
          timestamp: new Date(),
        })
        break

      case 'tool_result':
        // Remove the tool_call indicator message
        {
          const store = useChatStore.getState()
          const filtered = store.messages.filter(
            (m) => !(m.type === 'tool_call' && m.id === event.data.id)
          )
          useChatStore.setState({ messages: filtered })
        }
        break

      case 'action_proposal':
        setPendingActions(event.data.actions as ActionItem[])
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '',
          type: 'action_proposal',
          actions: event.data.actions as ActionItem[],
          timestamp: new Date(),
        })
        break

      case 'done':
        if (event.data.conversation_id) {
          setConversationId(event.data.conversation_id as string)
        }
        break
    }
  }, [addMessage, appendToLastAssistantMessage, setPendingActions, setConversationId])

  const handleSend = useCallback(async (text: string) => {
    // Add user message
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      type: 'text',
      timestamp: new Date(),
    })

    setStreaming(true)
    abortControllerRef.current = new AbortController()

    try {
      const stream = streamAgentChat(
        {
          message: text,
          conversation_id: conversationId,
          situation: 'auto',
        },
        abortControllerRef.current.signal
      )

      for await (const event of stream) {
        handleSSEEvent(event)
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'エラーが発生しました。もう一度お試しください。',
          type: 'text',
          timestamp: new Date(),
        })
      }
    } finally {
      setStreaming(false)
    }
  }, [conversationId, addMessage, setStreaming, handleSSEEvent])

  const handleApprove = useCallback(async (actionIds: string[]) => {
    if (!conversationId) return

    setPendingActions(null)
    setStreaming(true)

    try {
      // approveActions returns SSE stream too
      const stream = streamAgentChat(
        {
          message: `__approve__:${JSON.stringify({ conversation_id: conversationId, action_ids: actionIds })}`,
          conversation_id: conversationId,
        },
      )

      for await (const event of stream) {
        handleSSEEvent(event)
      }
    } catch {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'アクションの実行中にエラーが発生しました。',
        type: 'text',
        timestamp: new Date(),
      })
    } finally {
      setStreaming(false)
    }
  }, [conversationId, setPendingActions, setStreaming, handleSSEEvent, addMessage])

  const handleReject = useCallback(() => {
    setPendingActions(null)
    addMessage({
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '提案をキャンセルしました。他にお手伝いできることはありますか？',
      type: 'text',
      timestamp: new Date(),
    })
  }, [setPendingActions, addMessage])

  if (!isOpen) return null

  return (
    <div className="w-[380px] border-l flex flex-col bg-background h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">AI Assistant</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={newConversation} title="新しい会話">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-6 text-center">
            <p>何かお手伝いしましょうか？</p>
            <p className="text-xs mt-1">例：「今日の予定立てて」「タスク見せて」</p>
          </div>
        )}
        {messages.map((msg) =>
          msg.type === 'action_proposal' && msg.actions ? (
            <ActionProposal
              key={msg.id}
              actions={msg.actions}
              onApprove={handleApprove}
              onReject={handleReject}
              disabled={isStreaming || !pendingActions}
            />
          ) : (
            <ChatMessage key={msg.id} message={msg} />
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  )
}
```

**Step 2: ビルド確認**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npx tsc --noEmit`

**Step 3: コミット**

```bash
git add src/components/agent/ChatPanel.tsx
git commit -m "feat: add ChatPanel with SSE streaming and approval flow"
```

---

### Task 8: Layout + Header 統合

**Files:**
- Modify: `src/components/layout/Layout.tsx`
- Modify: `src/components/layout/Header.tsx`

**Step 1: Header に AI ボタンを追加**

`src/components/layout/Header.tsx` を修正:

- import に `Bot` アイコンと `useChatStore` を追加
- Bell ボタンの後に AI ボタンを追加

追加する import:
```typescript
import { Bot } from 'lucide-react'  // 既存 import に追加
import { useChatStore } from '@/stores/useChatStore'
```

追加するボタン（Bell ボタンの直後、Settings ボタンの前）:
```tsx
<Button variant="ghost" size="icon" onClick={() => useChatStore.getState().toggle()} title="AI Assistant">
  <Bot className="h-5 w-5" />
</Button>
```

**Step 2: Layout に ChatPanel を統合**

`src/components/layout/Layout.tsx` を修正:

```typescript
import { ChatPanel } from '@/components/agent/ChatPanel'
```

main タグの後に ChatPanel を追加（flex コンテナ内）:

変更前:
```tsx
<div className="flex-1 flex overflow-hidden">
  <Sidebar />
  <main className="flex-1 overflow-auto p-6">
    <Outlet />
  </main>
</div>
```

変更後:
```tsx
<div className="flex-1 flex overflow-hidden">
  <Sidebar />
  <main className="flex-1 overflow-auto p-6">
    <Outlet />
  </main>
  <ChatPanel />
</div>
```

**Step 3: ビルド確認**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npx tsc --noEmit`

**Step 4: ブラウザで動作確認**

Run: `cd /home/yu-min/Repositories/kensan-mockup && VITE_ENABLE_MSW=true npm run dev`

確認項目:
- [ ] Header に Bot アイコンボタンが表示される
- [ ] ボタンクリックで右側にチャットパネルがスライドイン
- [ ] メインコンテンツの幅が縮む
- [ ] 「タスク見せて」と入力すると、ツール実行→タスク一覧が表示
- [ ] 「今日の予定立てて」と入力すると、提案UIが表示
- [ ] 提案の承認/却下が動作する
- [ ] × ボタンでパネルが閉じる
- [ ] + ボタンで新しい会話がスタート

**Step 5: コミット**

```bash
git add src/components/layout/Layout.tsx src/components/layout/Header.tsx
git commit -m "feat: integrate ChatPanel into Layout with AI toggle button"
```

---

### Task 9: キーボードショートカット

**Files:**
- Modify: `src/components/agent/ChatPanel.tsx`

**Step 1: Ctrl+Shift+A でパネル開閉のショートカットを追加**

`ChatPanel.tsx` のコンポーネント先頭に useEffect を追加:

```typescript
// グローバルキーボードショートカット（パネル外でも動作）
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault()
      useChatStore.getState().toggle()
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

注: このショートカットはパネルの開閉状態に関わらず動作する。パネルが開いていないときも `ChatPanel` は `isOpen` チェック前にこの `useEffect` を実行するため、`isOpen` チェックを `useEffect` の後に移動する必要がある。

**Step 2: ビルド確認**

Run: `cd /home/yu-min/Repositories/kensan-mockup && npx tsc --noEmit`

**Step 3: コミット**

```bash
git add src/components/agent/ChatPanel.tsx
git commit -m "feat: add Ctrl+Shift+A keyboard shortcut for chat panel"
```

---

## Phase 2 以降（バックエンド・ツール拡張・ストア同期）は別の計画書で作成

Phase 1 が完成して動作確認できたら、Phase 2 以降を別途計画する。

Phase 2 の概要:
- kensan-ai に `/agent/stream` 統一エンドポイント追加
- 読み取り/書き込み区別ロジック
- action_proposal SSEイベント生成
- `/agent/approve` エンドポイント

Phase 3 の概要:
- 不足ツール追加（Goal/Milestone/Note/Memo/Analytics CRUD）

Phase 4 の概要:
- フロントエンドのストア同期（ToolResultHandler）
- 既存ストアとの再フェッチ連携
