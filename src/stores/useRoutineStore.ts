import { createCrudStore, CrudStore, CrudState } from './createCrudStore'
import type { RoutineTask } from '@/types'
import { routinesApi, CreateRoutineInput, UpdateRoutineInput, RoutineFilter } from '@/api/services/routines'

// Extension state/actions specific to routine store
interface RoutineExtensions {
  toggleRoutineEnabled: (id: string) => Promise<void>
  getActiveRoutines: () => RoutineTask[]
  getRoutinesForDay: (dayOfWeek: number) => RoutineTask[]
  getTodayRoutines: () => RoutineTask[]
}

// Full store type for external use
export type RoutineStore = CrudStore<RoutineTask, CreateRoutineInput, UpdateRoutineInput> & RoutineExtensions

// Create the store with base CRUD + extensions
export const useRoutineStore = createCrudStore<
  RoutineTask,
  CreateRoutineInput,
  UpdateRoutineInput,
  RoutineFilter,
  RoutineExtensions
>(
  {
    api: routinesApi,
    getId: (r) => r.id,
    prependOnAdd: false, // Append routines to end of list
  },
  (set, get) => ({
    toggleRoutineEnabled: async (id) => {
      try {
        const updatedRoutine = await routinesApi.toggleEnabled(id)
        set({
          items: get().items.map((r) =>
            r.id === id ? updatedRoutine : r
          ),
        } as Partial<CrudState<RoutineTask>>)
      } catch (error) {
        set({ error: (error as Error).message } as Partial<CrudState<RoutineTask>>)
      }
    },

    getActiveRoutines: () => get().items.filter((r) => r.enabled),

    getRoutinesForDay: (dayOfWeek) =>
      get().items.filter((r) => {
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
  })
)

// Re-export for backward compatibility with existing code using 'routines' instead of 'items'
// Note: New code should use 'items' directly
