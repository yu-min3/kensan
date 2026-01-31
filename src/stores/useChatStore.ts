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

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  messages: [],
  conversationId: null,
  isStreaming: false,
  pendingActions: null,

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
    set({ messages: [], conversationId: null, pendingActions: null }),
}))
