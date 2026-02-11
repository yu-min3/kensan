import { create } from 'zustand'
import {
  fetchComparisons,
  fetchComparison,
  createComparison,
  initRound,
  voteRound,
  resolveComparison,
  type Comparison,
  type InitRoundResult,
} from '@/api/services/challenges'

interface ComparisonStore {
  comparisons: Comparison[]
  selectedComparison: Comparison | null
  currentRound: InitRoundResult | null
  isLoading: boolean
  isGenerating: boolean
  error: string | null

  fetchComparisons: (contextId?: string) => Promise<void>
  createAndSelect: (contextId: string, versionA: number, versionB: number) => Promise<void>
  selectComparison: (id: string) => Promise<void>
  initRound: () => Promise<void>
  vote: (roundId: string, winner: 'A' | 'B' | 'tie') => Promise<void>
  resolve: (action: 'adopt_a' | 'adopt_b' | 'dismiss') => Promise<void>
  clearRound: () => void
}

export const useChallengeStore = create<ComparisonStore>()((set, get) => ({
  comparisons: [],
  selectedComparison: null,
  currentRound: null,
  isLoading: false,
  isGenerating: false,
  error: null,

  fetchComparisons: async (contextId?: string) => {
    set({ isLoading: true, error: null })
    try {
      const comparisons = await fetchComparisons(contextId)
      set({ comparisons, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  createAndSelect: async (contextId: string, versionA: number, versionB: number) => {
    set({ isLoading: true, error: null })
    try {
      const comparison = await createComparison(contextId, versionA, versionB)
      set({ selectedComparison: comparison, isLoading: false })
      // Refresh list
      await get().fetchComparisons()
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  selectComparison: async (id: string) => {
    set({ isLoading: true, error: null, currentRound: null })
    try {
      const comparison = await fetchComparison(id)
      set({ selectedComparison: comparison, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  initRound: async () => {
    const { selectedComparison } = get()
    if (!selectedComparison) return
    set({ isGenerating: true, error: null })
    try {
      const result = await initRound(selectedComparison.id)
      const updated = await fetchComparison(selectedComparison.id)
      set({ currentRound: result, selectedComparison: updated, isGenerating: false })
    } catch (e) {
      set({ error: (e as Error).message, isGenerating: false })
    }
  },

  vote: async (roundId: string, winner: 'A' | 'B' | 'tie') => {
    const { selectedComparison } = get()
    if (!selectedComparison) return
    set({ isLoading: true, error: null })
    try {
      await voteRound(selectedComparison.id, roundId, winner)
      const updated = await fetchComparison(selectedComparison.id)
      set({ selectedComparison: updated, currentRound: null, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  resolve: async (action: 'adopt_a' | 'adopt_b' | 'dismiss') => {
    const { selectedComparison } = get()
    if (!selectedComparison) return
    set({ isLoading: true, error: null })
    try {
      await resolveComparison(selectedComparison.id, action)
      const updated = await fetchComparison(selectedComparison.id)
      set({ selectedComparison: updated, isLoading: false })
      await get().fetchComparisons()
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  clearRound: () => {
    set({ currentRound: null })
  },
}))
