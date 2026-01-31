import { useEffect, useRef, useCallback } from 'react'
import { X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/useChatStore'
import type { ActionItem } from '@/stores/useChatStore'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ActionProposal } from './ActionProposal'
import { streamAgentChat } from '@/api/services/agent'
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

  const handleSSEEvent = useCallback(
    (event: AgentStreamEvent) => {
      switch (event.type) {
        case 'text': {
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
          break
        }

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

        case 'tool_result': {
          const store = useChatStore.getState()
          const filtered = store.messages.filter(
            (m) => !(m.type === 'tool_call' && m.id === event.data.id)
          )
          useChatStore.setState({ messages: filtered })
          break
        }

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
    },
    [addMessage, appendToLastAssistantMessage, setPendingActions, setConversationId]
  )

  const handleSend = useCallback(
    async (text: string) => {
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
    },
    [conversationId, addMessage, setStreaming, handleSSEEvent]
  )

  const handleApprove = useCallback(
    async (actionIds: string[]) => {
      if (!conversationId) return

      setPendingActions(null)
      setStreaming(true)

      try {
        const stream = streamAgentChat({
          message: `__approve__:${JSON.stringify({ conversation_id: conversationId, action_ids: actionIds })}`,
          conversation_id: conversationId,
        })

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
    },
    [conversationId, setPendingActions, setStreaming, handleSSEEvent, addMessage]
  )

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
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={newConversation}
            title="新しい会話"
          >
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
