import { create } from 'zustand'
import type { TimeBlock, TimeEntry } from '@/types'
import { timeblocksApi, timeentriesApi } from '@/api/services/timeblocks'
import { format } from 'date-fns'

interface TimeBlockState {
  timeBlocks: TimeBlock[]
  timeEntries: TimeEntry[]
  isLoading: boolean
  error: string | null

  // データ取得
  fetchTimeBlocks: (date?: string) => Promise<void>
  fetchTimeBlocksRange: (startDate: string, endDate: string) => Promise<void>
  fetchTimeEntries: (date?: string) => Promise<void>
  fetchTimeEntriesRange: (startDate: string, endDate: string) => Promise<void>

  // タイムブロック操作
  addTimeBlock: (block: Omit<TimeBlock, 'id'>) => Promise<void>
  updateTimeBlock: (id: string, updates: Partial<TimeBlock>) => Promise<void>
  deleteTimeBlock: (id: string) => Promise<void>

  // 時間記録操作（現状はローカルのみ - Clockify連携用）
  addTimeEntry: (entry: Omit<TimeEntry, 'id'>) => void
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => void
  deleteTimeEntry: (id: string) => void

  // 取得
  getTimeBlocksByDate: (date: string) => TimeBlock[]
  getTimeEntriesByDate: (date: string) => TimeEntry[]
  getTodayTimeBlocks: () => TimeBlock[]
  getTodayTimeEntries: () => TimeEntry[]
}

export const useTimeBlockStore = create<TimeBlockState>((set, get) => ({
  timeBlocks: [],
  timeEntries: [],
  isLoading: false,
  error: null,

  fetchTimeBlocks: async (date) => {
    set({ isLoading: true, error: null })
    try {
      const targetDate = date || format(new Date(), 'yyyy-MM-dd')
      const timeBlocks = await timeblocksApi.listByDate(targetDate)
      set((state) => {
        // Replace blocks for the fetched date, keep others
        const otherBlocks = state.timeBlocks.filter(b => b.date !== targetDate)
        return { timeBlocks: [...otherBlocks, ...timeBlocks], isLoading: false }
      })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchTimeBlocksRange: async (startDate, endDate) => {
    set({ isLoading: true, error: null })
    try {
      const timeBlocks = await timeblocksApi.listByDateRange(startDate, endDate)
      set({ timeBlocks, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  addTimeBlock: async (block) => {
    try {
      const newBlock = await timeblocksApi.create(block)
      set((state) => ({
        timeBlocks: [...state.timeBlocks, newBlock],
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  updateTimeBlock: async (id, updates) => {
    try {
      const updatedBlock = await timeblocksApi.update(id, updates)
      set((state) => ({
        timeBlocks: state.timeBlocks.map((b) =>
          b.id === id ? updatedBlock : b
        ),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  deleteTimeBlock: async (id) => {
    try {
      await timeblocksApi.delete(id)
      set((state) => ({
        timeBlocks: state.timeBlocks.filter((b) => b.id !== id),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  fetchTimeEntries: async (date) => {
    set({ isLoading: true, error: null })
    try {
      const targetDate = date || format(new Date(), 'yyyy-MM-dd')
      const timeEntries = await timeentriesApi.listByDate(targetDate)
      set((state) => {
        // Replace entries for the fetched date, keep others
        const otherEntries = state.timeEntries.filter(e => e.date !== targetDate)
        return { timeEntries: [...otherEntries, ...timeEntries], isLoading: false }
      })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchTimeEntriesRange: async (startDate, endDate) => {
    set({ isLoading: true, error: null })
    try {
      const timeEntries = await timeentriesApi.listByDateRange(startDate, endDate)
      set({ timeEntries, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  // TimeEntries are read-only from Clockify sync - local operations for now
  addTimeEntry: (entry) =>
    set((state) => ({
      timeEntries: [...state.timeEntries, { ...entry, id: `te${Date.now()}` }],
    })),

  updateTimeEntry: (id, updates) =>
    set((state) => ({
      timeEntries: state.timeEntries.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  deleteTimeEntry: (id) =>
    set((state) => ({
      timeEntries: state.timeEntries.filter((e) => e.id !== id),
    })),

  getTimeBlocksByDate: (date) =>
    get().timeBlocks.filter((b) => b.date === date),

  getTimeEntriesByDate: (date) =>
    get().timeEntries.filter((e) => e.date === date),

  getTodayTimeBlocks: () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    return get().timeBlocks.filter((b) => b.date === today)
  },

  getTodayTimeEntries: () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    return get().timeEntries.filter((e) => e.date === today)
  },
}))
