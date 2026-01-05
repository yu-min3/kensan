import { create } from 'zustand'
import type { RoutineTask } from '@/types'
import { mockRoutineTasks } from '@/data/mockData'

interface RoutineState {
  routines: RoutineTask[]

  // 操作
  addRoutine: (routine: Omit<RoutineTask, 'id'>) => void
  updateRoutine: (id: string, updates: Partial<RoutineTask>) => void
  deleteRoutine: (id: string) => void
  toggleRoutineEnabled: (id: string) => void

  // 取得
  getRoutineById: (id: string) => RoutineTask | undefined
  getActiveRoutines: () => RoutineTask[]
  getRoutinesForDay: (dayOfWeek: number) => RoutineTask[]
  getTodayRoutines: () => RoutineTask[]
}

export const useRoutineStore = create<RoutineState>((set, get) => ({
  routines: mockRoutineTasks,

  addRoutine: (routine) =>
    set((state) => ({
      routines: [...state.routines, { ...routine, id: `r${Date.now()}` }],
    })),

  updateRoutine: (id, updates) =>
    set((state) => ({
      routines: state.routines.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),

  deleteRoutine: (id) =>
    set((state) => ({
      routines: state.routines.filter((r) => r.id !== id),
    })),

  toggleRoutineEnabled: (id) =>
    set((state) => ({
      routines: state.routines.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      ),
    })),

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
