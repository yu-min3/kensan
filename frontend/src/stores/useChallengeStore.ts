import { create } from 'zustand'
import {
  fetchComparisons,
  fetchComparison,
  createComparison,
  initRound,
  voteRound,
  resolveComparison,
  fetchExperiments,
  fetchExperiment,
  resolveExperiment as apiResolveExperiment,
  runOptimization as apiRunOptimization,
  type Comparison,
  type Experiment,
  type InitRoundResult,
  type OptimizationResult,
} from '@/api/services/challenges'

interface ComparisonStore {
  comparisons: Comparison[]
  experiments: Experiment[]
  selectedComparison: Comparison | null
  selectedExperiment: Experiment | null
  currentRound: InitRoundResult | null
  isLoading: boolean
  isGenerating: boolean
  isOptimizing: boolean
  optimizationResult: OptimizationResult | null
  error: string | null

  fetchComparisons: (contextId?: string) => Promise<void>
  fetchExperiments: () => Promise<void>
  createAndSelect: (contextId: string, versionA: number, versionB: number) => Promise<void>
  selectComparison: (id: string) => Promise<void>
  selectExperiment: (id: string) => Promise<void>
  resolveExperiment: (action: 'promote' | 'reject') => Promise<void>
  initRound: () => Promise<void>
  vote: (roundId: string, winner: 'A' | 'B' | 'tie') => Promise<void>
  resolve: (action: 'adopt_a' | 'adopt_b' | 'dismiss') => Promise<void>
  clearRound: () => void
  runOptimization: (force?: boolean) => Promise<OptimizationResult | null>
}

export const useChallengeStore = create<ComparisonStore>()((set, get) => ({
  comparisons: [],
  experiments: [],
  selectedComparison: null,
  selectedExperiment: null,
  currentRound: null,
  isLoading: false,
  isGenerating: false,
  isOptimizing: false,
  optimizationResult: null,
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

  fetchExperiments: async () => {
    try {
      const experiments = await fetchExperiments()
      set({ experiments })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  createAndSelect: async (contextId: string, versionA: number, versionB: number) => {
    set({ isLoading: true, error: null })
    try {
      const comparison = await createComparison(contextId, versionA, versionB)
      set({ selectedComparison: comparison, selectedExperiment: null, isLoading: false })
      // Refresh list
      await get().fetchComparisons()
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  selectComparison: async (id: string) => {
    set({ isLoading: true, error: null, currentRound: null, selectedExperiment: null })
    try {
      const comparison = await fetchComparison(id)
      set({ selectedComparison: comparison, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  selectExperiment: async (id: string) => {
    set({ isLoading: true, error: null, currentRound: null, selectedComparison: null })
    try {
      const experiment = await fetchExperiment(id)
      set({ selectedExperiment: experiment, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  resolveExperiment: async (action: 'promote' | 'reject') => {
    const { selectedExperiment } = get()
    if (!selectedExperiment) return
    set({ isLoading: true, error: null })
    try {
      await apiResolveExperiment(selectedExperiment.id, action)
      const updated = await fetchExperiment(selectedExperiment.id)
      set({ selectedExperiment: updated, isLoading: false })
      await get().fetchExperiments()
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

  runOptimization: async (force = false) => {
    set({ isOptimizing: true, optimizationResult: null, error: null })
    try {
      const result = await apiRunOptimization(force)
      set({ optimizationResult: result, isOptimizing: false })
      await get().fetchExperiments()
      return result
    } catch (e) {
      set({ error: (e as Error).message, isOptimizing: false })
      return null
    }
  },

  clearRound: () => {
    set({ currentRound: null })
  },
}))
