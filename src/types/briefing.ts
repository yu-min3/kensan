import type { ActionItem } from '@/stores/useChatStore'

export type BriefingMode = 'morning' | 'evening'
export type BriefingPhase = 'idle' | 'loading' | 'ready' | 'error'

export interface BriefingStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'completed'
}

export type BriefingCardType =
  | 'yesterday_summary'
  | 'today_focus'
  | 'timeblock_proposal'
  | 'carryover_tasks'
  | 'ai_insight'
  | 'actual_vs_planned'
  | 'completed_tasks'
  | 'tomorrow_focus'

export interface BriefingCard {
  type: BriefingCardType
  title: string
  status: 'loading' | 'ready' | 'action_pending' | 'action_done' | 'skipped'
  data: Record<string, unknown>
  actions?: ActionItem[]
  actionStatus?: 'pending' | 'approved' | 'rejected' | 'skipped'
  fullWidth?: boolean
}
