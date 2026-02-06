import { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import { X, Plus, History, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/useChatStore'
import type { ActionItem } from '@/stores/useChatStore'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ActionProposal } from './ActionProposal'
import { WelcomeMessage } from './WelcomeMessage'
import { streamAgentChat, streamApproveActions } from '@/api/services/agent'
import type { AgentStreamEvent, AgentStreamRequest } from '@/api/services/agent'

export function ChatPanel() {
  const {
    isOpen,
    messages,
    conversationId,
    isStreaming,
    pendingActions,
    conversations,
    isLoadingHistory,
    isViewingHistory,
    close,
    addMessage,
    appendToLastAssistantMessage,
    setStreaming,
    setPendingActions,
    setConversationId,
    newConversation,
    fetchConversations,
    loadConversation,
  } = useChatStore()

  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Resize state
  const MIN_WIDTH = 320
  const MAX_WIDTH = 700
  const DEFAULT_WIDTH = 380
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)
  const isResizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(DEFAULT_WIDTH)

  useLayoutEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      // Panel is on the right side, so dragging left increases width
      const delta = startX.current - e.clientX
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
      setPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    startX.current = e.clientX
    startWidth.current = panelWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [panelWidth])

  // Global keyboard shortcut: Ctrl+Shift+A to toggle panel
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
          // Mark tool_call as completed instead of removing it
          const store = useChatStore.getState()
          const updated = store.messages.map((m) =>
            m.type === 'tool_call' && m.id === event.data.id
              ? { ...m, toolCompleted: true }
              : m
          )
          useChatStore.setState({ messages: updated })

          // Show error message if the tool execution failed
          if (event.data.error) {
            addMessage({
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `⚠ ${event.data.name || 'アクション'}の実行に失敗しました: ${event.data.error}`,
              type: 'text',
              timestamp: new Date(),
            })
          }
          break
        }

        case 'action_proposal': {
          const rawActions = event.data.actions as Array<Record<string, unknown>>
          const mappedActions: ActionItem[] = rawActions.map((a) => ({
            id: a.id as string,
            type: (a.tool_name as string) || (a.type as string) || '',
            description: (a.description as string) || '',
            input: (a.input as Record<string, unknown>) || {},
          }))
          setPendingActions(mappedActions)
          addMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
            type: 'action_proposal',
            actions: mappedActions,
            timestamp: new Date(),
          })
          break
        }

        case 'done':
          if (event.data.conversation_id) {
            setConversationId(event.data.conversation_id as string)
          }
          break
      }
    },
    [addMessage, appendToLastAssistantMessage, setPendingActions, setConversationId]
  )

  const handleSendWithSituation = useCallback(
    async (text: string, situation: AgentStreamRequest['situation'] = 'auto') => {
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
            situation,
          },
          abortControllerRef.current.signal
        )

        for await (const event of stream) {
          handleSSEEvent(event)
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          const errorMessage = (err as Error).message?.includes('タイムアウト')
            ? 'AIサービスからの応答がタイムアウトしました。もう一度お試しください。'
            : 'エラーが発生しました。もう一度お試しください。'
          addMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: errorMessage,
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

  const handleSend = useCallback(
    (text: string) => handleSendWithSituation(text, 'auto'),
    [handleSendWithSituation]
  )

  // Handle prefilled messages (e.g., from A02_AIReview)
  useEffect(() => {
    const prefilled = useChatStore.getState().prefilledMessage
    if (prefilled && isOpen && !isStreaming) {
      useChatStore.getState().clearPrefilled()
      handleSendWithSituation(prefilled.message, prefilled.situation || 'auto')
    }
  }, [isOpen, isStreaming, handleSendWithSituation])

  const handleApprove = useCallback(
    async (actionIds: string[]) => {
      if (!conversationId) return

      setPendingActions(null)
      setStreaming(true)

      try {
        const stream = streamApproveActions({
          conversation_id: conversationId,
          action_ids: actionIds,
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

  const handleShowHistory = useCallback(() => {
    setShowHistory(true)
    fetchConversations()
  }, [fetchConversations])

  const handleSelectConversation = useCallback(
    (id: string) => {
      loadConversation(id)
      setShowHistory(false)
    },
    [loadConversation]
  )

  const handleBackFromHistory = useCallback(() => {
    setShowHistory(false)
  }, [])

  const handleNewFromHistory = useCallback(() => {
    newConversation()
    setShowHistory(false)
  }, [newConversation])

  if (!isOpen) return null

  return (
    <div className="border-l flex flex-col bg-background h-full relative" style={{ width: panelWidth }}>
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 z-10"
        onMouseDown={handleResizeStart}
      />
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        {showHistory ? (
          <>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleBackFromHistory}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-sm font-semibold">履歴</h2>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close}>
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-sm font-semibold">
              AI Assistant
              {isViewingHistory && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">(閲覧中)</span>
              )}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleShowHistory}
                title="履歴"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleNewFromHistory}
                title="新しい会話"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>

      {showHistory ? (
        /* History List */
        <div className="flex-1 overflow-y-auto">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              履歴がありません
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                  onClick={() => handleSelectConversation(conv.id)}
                >
                  <p className="text-sm truncate">{conv.lastMessage}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {new Date(conv.lastMessageAt).toLocaleDateString('ja-JP')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {conv.messageCount}件
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-2">
            {messages.length === 0 && <WelcomeMessage />}
            {messages.map((msg) => {
              return msg.type === 'action_proposal' && msg.actions ? (
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
            })}
            {isStreaming && !pendingActions && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>考え中...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input - disabled when viewing history */}
          <ChatInput
            onSend={handleSend}
            disabled={isStreaming || isViewingHistory}
            placeholder={isViewingHistory ? '閲覧モード（新しい会話を開始してください）' : undefined}
          />
        </>
      )}
    </div>
  )
}
