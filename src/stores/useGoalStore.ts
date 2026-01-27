import { create } from 'zustand'
import { goalsApi } from '@/api/services/tasks'
import type { Goal } from '@/types'
import type { CreateGoalInput, UpdateGoalInput } from '@/api/services/tasks'

interface GoalState {
  goals: Goal[]
  isLoading: boolean
  error: string | null
  fetchGoals: () => Promise<void>
  addGoal: (input: CreateGoalInput) => Promise<Goal>
  updateGoal: (id: string, input: UpdateGoalInput) => Promise<Goal>
  deleteGoal: (id: string) => Promise<void>
  getGoalById: (id: string) => Goal | undefined
  clearError: () => void
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  isLoading: false,
  error: null,

  fetchGoals: async () => {
    set({ isLoading: true, error: null })
    try {
      const goals = await goalsApi.list()
      set({ goals, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  addGoal: async (input) => {
    const goal = await goalsApi.create(input)
    set((state) => ({ goals: [...state.goals, goal] }))
    return goal
  },

  updateGoal: async (id, input) => {
    const goal = await goalsApi.update(id, input)
    set((state) => ({ goals: state.goals.map((g) => (g.id === id ? goal : g)) }))
    return goal
  },

  deleteGoal: async (id) => {
    await goalsApi.delete(id)
    set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }))
  },

  getGoalById: (id) => get().goals.find((g) => g.id === id),

  clearError: () => set({ error: null }),
}))
