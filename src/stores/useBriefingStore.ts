import { create } from 'zustand'
import type {
  BriefingMode,
  BriefingPhase,
  BriefingStep,
  BriefingCard,
  BriefingCardType,
} from '@/types/briefing'

const MORNING_STEPS: BriefingStep[] = [
  { id: 'get_time_entries', label: '昨日の実績を取得', status: 'pending' },
  { id: 'get_tasks', label: 'タスクを確認', status: 'pending' },
  { id: 'get_time_blocks', label: '今日の計画を確認', status: 'pending' },
  { id: 'get_analytics_summary', label: '分析データを取得', status: 'pending' },
  { id: 'insight', label: 'インサイトを生成', status: 'pending' },
]

const EVENING_STEPS: BriefingStep[] = [
  { id: 'get_time_blocks', label: '今日の計画を取得', status: 'pending' },
  { id: 'get_time_entries', label: '今日の実績を取得', status: 'pending' },
  { id: 'get_tasks', label: '完了タスクを確認', status: 'pending' },
  { id: 'get_analytics_summary', label: '分析データを取得', status: 'pending' },
  { id: 'insight', label: 'インサイトを生成', status: 'pending' },
]

const MORNING_CARDS: BriefingCard[] = [
  { type: 'yesterday_summary', title: '昨日の実績', status: 'loading', data: {} },
  { type: 'today_focus', title: '今日のフォーカス', status: 'loading', data: {} },
  { type: 'timeblock_proposal', title: 'タイムブロック提案', status: 'loading', data: {} },
  { type: 'carryover_tasks', title: '持ち越しタスク', status: 'loading', data: {} },
  { type: 'ai_insight', title: 'AIインサイト', status: 'loading', data: {}, fullWidth: true },
]

const EVENING_CARDS: BriefingCard[] = [
  { type: 'actual_vs_planned', title: '実績 vs 計画', status: 'loading', data: {} },
  { type: 'completed_tasks', title: '今日の完了タスク', status: 'loading', data: {} },
  { type: 'ai_insight', title: '振り返り・学習日記', status: 'loading', data: {}, fullWidth: true },
  { type: 'tomorrow_focus', title: '明日のタスク提案', status: 'loading', data: {} },
  { type: 'timeblock_proposal', title: '明日のタイムブロック提案', status: 'loading', data: {} },
]

interface BriefingState {
  mode: BriefingMode
  phase: BriefingPhase
  conversationId: string | null
  steps: BriefingStep[]
  cards: BriefingCard[]
  insightText: string
  error: string | null

  startBriefing: (mode: BriefingMode) => void
  reset: () => void
  activateStep: (toolName: string) => void
  completeStep: (toolName: string) => void
  updateCard: (type: BriefingCardType, partial: Partial<BriefingCard>) => void
  appendInsightText: (text: string) => void
  setPhase: (phase: BriefingPhase) => void
  setConversationId: (id: string) => void
}

export const useBriefingStore = create<BriefingState>((set) => ({
  mode: 'morning',
  phase: 'idle',
  conversationId: null,
  steps: [],
  cards: [],
  insightText: '',
  error: null,

  startBriefing: (mode) =>
    set({
      mode,
      phase: 'loading',
      conversationId: null,
      steps: (mode === 'morning' ? MORNING_STEPS : EVENING_STEPS).map((s) => ({ ...s })),
      cards: (mode === 'morning' ? MORNING_CARDS : EVENING_CARDS).map((c) => ({
        ...c,
        data: {},
        actions: undefined,
        actionStatus: undefined,
      })),
      insightText: '',
      error: null,
    }),

  reset: () =>
    set({
      mode: 'morning',
      phase: 'idle',
      conversationId: null,
      steps: [],
      cards: [],
      insightText: '',
      error: null,
    }),

  activateStep: (toolName) =>
    set((state) => ({
      steps: state.steps.map((s) =>
        s.id === toolName ? { ...s, status: 'active' } : s
      ),
    })),

  completeStep: (toolName) =>
    set((state) => ({
      steps: state.steps.map((s) =>
        s.id === toolName ? { ...s, status: 'completed' } : s
      ),
    })),

  updateCard: (type, partial) =>
    set((state) => ({
      cards: state.cards.map((c) =>
        c.type === type ? { ...c, ...partial } : c
      ),
    })),

  appendInsightText: (text) =>
    set((state) => ({
      insightText: state.insightText + text,
    })),

  setPhase: (phase) => set({ phase }),

  setConversationId: (id) => set({ conversationId: id }),
}))
