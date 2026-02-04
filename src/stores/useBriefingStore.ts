import { create } from 'zustand'
import type { BriefingMode, BriefingPhase } from '@/types/briefing'
import type { ActionItem } from '@/stores/useChatStore'

interface BriefingState {
  mode: BriefingMode
  phase: BriefingPhase
  conversationId: string | null
  insightText: string
  /** Action proposals from AI (e.g., timeblock creation) */
  proposedActions: ActionItem[]
  actionStatus: 'pending' | 'approved' | 'rejected' | 'skipped' | null
  error: string | null

  startBriefing: (mode: BriefingMode) => void
  reset: () => void
  appendInsightText: (text: string) => void
  setProposedActions: (actions: ActionItem[]) => void
  setActionStatus: (status: 'approved' | 'rejected' | 'skipped') => void
  setPhase: (phase: BriefingPhase) => void
  setConversationId: (id: string) => void
}

export const useBriefingStore = create<BriefingState>((set) => ({
  mode: 'morning',
  phase: 'idle',
  conversationId: null,
  insightText: '',
  proposedActions: [],
  actionStatus: null,
  error: null,

  startBriefing: (mode) =>
    set({
      mode,
      phase: 'loading',
      conversationId: null,
      insightText: '',
      proposedActions: [],
      actionStatus: null,
      error: null,
    }),

  reset: () =>
    set({
      mode: 'morning',
      phase: 'idle',
      conversationId: null,
      insightText: '',
      proposedActions: [],
      actionStatus: null,
      error: null,
    }),

  appendInsightText: (text) =>
    set((state) => ({ insightText: state.insightText + text })),

  setProposedActions: (actions) =>
    set({ proposedActions: actions, actionStatus: 'pending' }),

  setActionStatus: (status) => set({ actionStatus: status }),

  setPhase: (phase) => set({ phase }),

  setConversationId: (id) => set({ conversationId: id }),
}))
