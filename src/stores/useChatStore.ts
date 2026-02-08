import { create } from 'zustand'
import type { Conversation, ConversationMessage } from '@/api/services/agent'
import { getConversations, getConversationMessages } from '@/api/services/agent'

export interface ActionItem {
  id: string
  type: string
  description: string
  input: Record<string, unknown>
}

export type ChatSituation = 'auto' | 'review' | 'chat' | 'daily_advice'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  type: 'text' | 'tool_call' | 'tool_result' | 'action_proposal'
  toolName?: string
  toolCompleted?: boolean
  actions?: ActionItem[]
  timestamp: Date
}

interface ChatState {
  isOpen: boolean
  messages: ChatMessage[]
  conversationId: string | null
  isStreaming: boolean
  pendingActions: ActionItem[] | null
  prefilledMessage: { message: string; situation?: ChatSituation } | null

  // History
  conversations: Conversation[]
  isLoadingHistory: boolean
  isViewingHistory: boolean

  toggle: () => void
  open: () => void
  close: () => void
  addMessage: (message: ChatMessage) => void
  appendToLastAssistantMessage: (text: string) => void
  setStreaming: (streaming: boolean) => void
  setPendingActions: (actions: ActionItem[] | null) => void
  setConversationId: (id: string | null) => void
  newConversation: () => void
  sendPrefilled: (message: string, situation?: ChatSituation) => void
  clearPrefilled: () => void

  // History actions
  fetchConversations: () => Promise<void>
  loadConversation: (id: string) => Promise<void>
  clearHistory: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  messages: [],
  conversationId: null,
  isStreaming: false,
  pendingActions: null,
  prefilledMessage: null,

  // History
  conversations: [],
  isLoadingHistory: false,
  isViewingHistory: false,

  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  appendToLastAssistantMessage: (text) =>
    set((state) => {
      const messages = [...state.messages]
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant' && messages[i].type === 'text') {
          messages[i] = { ...messages[i], content: messages[i].content + text }
          break
        }
      }
      return { messages }
    }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setPendingActions: (actions) => set({ pendingActions: actions }),
  setConversationId: (id) => set({ conversationId: id }),

  newConversation: () =>
    set({ messages: [], conversationId: null, pendingActions: null, isViewingHistory: false }),

  sendPrefilled: (message, situation) =>
    set({
      isOpen: true,
      messages: [],
      conversationId: null,
      pendingActions: null,
      prefilledMessage: { message, situation },
      isViewingHistory: false,
    }),

  clearPrefilled: () => set({ prefilledMessage: null }),

  fetchConversations: async () => {
    set({ isLoadingHistory: true })
    try {
      const result = await getConversations()
      set({ conversations: result.conversations })
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
    } finally {
      set({ isLoadingHistory: false })
    }
  },

  loadConversation: async (id: string) => {
    set({ isLoadingHistory: true })
    try {
      const result = await getConversationMessages(id)
      const messages: ChatMessage[] = result.messages.map((m: ConversationMessage) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        type: 'text' as const,
        timestamp: new Date(m.createdAt),
      }))
      set({
        messages,
        conversationId: id,
        pendingActions: null,
        isViewingHistory: true,
      })
    } catch (err) {
      console.error('Failed to load conversation:', err)
    } finally {
      set({ isLoadingHistory: false })
    }
  },

  clearHistory: () => set({ conversations: [], isViewingHistory: false }),
}))
