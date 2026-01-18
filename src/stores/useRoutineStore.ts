import { create } from 'zustand'
import type { RoutineTask } from '@/types'
import { routinesApi } from '@/api/services/routines'

interface RoutineState {
  routines: RoutineTask[]
  isLoading: boolean
  error: string | null

  // データ取得
  fetchRoutines: () => Promise<void>

  // 操作
  addRoutine: (routine: Omit<RoutineTask, 'id'>) => Promise<void>
  updateRoutine: (id: string, updates: Partial<RoutineTask>) => Promise<void>
  deleteRoutine: (id: string) => Promise<void>
  toggleRoutineEnabled: (id: string) => Promise<void>

  // 取得
  getRoutineById: (id: string) => RoutineTask | undefined
  getActiveRoutines: () => RoutineTask[]
  getRoutinesForDay: (dayOfWeek: number) => RoutineTask[]
  getTodayRoutines: () => RoutineTask[]
}

export const useRoutineStore = create<RoutineState>((set, get) => ({
  routines: [],
  isLoading: false,
  error: null,

  fetchRoutines: async () => {
    set({ isLoading: true, error: null })
    try {
      const routines = await routinesApi.list()
      set({ routines, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  addRoutine: async (routine) => {
    try {
      const newRoutine = await routinesApi.create({
        name: routine.name,
        frequency: routine.frequency,
        daysOfWeek: routine.daysOfWeek,
        estimatedMinutes: routine.estimatedMinutes,
        enabled: routine.enabled,
      })
      set((state) => ({
        routines: [...state.routines, newRoutine],
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  updateRoutine: async (id, updates) => {
    try {
      const updatedRoutine = await routinesApi.update(id, {
        name: updates.name,
        frequency: updates.frequency,
        daysOfWeek: updates.daysOfWeek,
        estimatedMinutes: updates.estimatedMinutes,
        enabled: updates.enabled,
      })
      set((state) => ({
        routines: state.routines.map((r) =>
          r.id === id ? updatedRoutine : r
        ),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  deleteRoutine: async (id) => {
    try {
      await routinesApi.delete(id)
      set((state) => ({
        routines: state.routines.filter((r) => r.id !== id),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  toggleRoutineEnabled: async (id) => {
    try {
      const updatedRoutine = await routinesApi.toggleEnabled(id)
      set((state) => ({
        routines: state.routines.map((r) =>
          r.id === id ? updatedRoutine : r
        ),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  getRoutineById: (id) => get().routines.find((r) => r.id === id),

  getActiveRoutines: () => get().routines.filter((r) => r.enabled),

  getRoutinesForDay: (dayOfWeek) =>
    get().routines.filter((r) => {
      if (!r.enabled) return false
      if (r.frequency === 'daily') return true
      if (r.frequency === 'custom' && r.daysOfWeek) {
        return r.daysOfWeek.includes(dayOfWeek)
      }
      if (r.frequency === 'weekly' && r.daysOfWeek) {
        return r.daysOfWeek.includes(dayOfWeek)
      }
      return false
    }),

  getTodayRoutines: () => {
    const today = new Date().getDay()
    return get().getRoutinesForDay(today)
  },
}))
