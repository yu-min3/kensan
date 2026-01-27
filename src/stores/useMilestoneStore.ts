import { create } from 'zustand'
import { milestonesApi } from '@/api/services/tasks'
import type { Milestone } from '@/types'
import type { CreateMilestoneInput, UpdateMilestoneInput } from '@/api/services/tasks'

interface MilestoneState {
  milestones: Milestone[]
  isLoading: boolean
  error: string | null
  fetchMilestones: () => Promise<void>
  addMilestone: (input: CreateMilestoneInput) => Promise<Milestone>
  updateMilestone: (id: string, input: UpdateMilestoneInput) => Promise<Milestone>
  deleteMilestone: (id: string) => Promise<void>
  getMilestoneById: (id: string) => Milestone | undefined
  getMilestonesByGoal: (goalId: string) => Milestone[]
  clearError: () => void
}

export const useMilestoneStore = create<MilestoneState>((set, get) => ({
  milestones: [],
  isLoading: false,
  error: null,

  fetchMilestones: async () => {
    set({ isLoading: true, error: null })
    try {
      const milestones = await milestonesApi.list()
      set({ milestones, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  addMilestone: async (input) => {
    const milestone = await milestonesApi.create(input)
    set((state) => ({ milestones: [...state.milestones, milestone] }))
    return milestone
  },

  updateMilestone: async (id, input) => {
    const milestone = await milestonesApi.update(id, input)
    set((state) => ({
      milestones: state.milestones.map((m) => (m.id === id ? milestone : m)),
    }))
    return milestone
  },

  deleteMilestone: async (id) => {
    await milestonesApi.delete(id)
    set((state) => ({
      milestones: state.milestones.filter((m) => m.id !== id),
    }))
  },

  getMilestoneById: (id) => get().milestones.find((m) => m.id === id),

  getMilestonesByGoal: (goalId) => get().milestones.filter((m) => m.goalId === goalId),

  clearError: () => set({ error: null }),
}))
