import { create } from 'zustand'
import type { TimeBlock, TimeEntry } from '@/types'
import { timeblocksApi, timeentriesApi } from '@/api/services/timeblocks'
import { useSettingsStore } from './useSettingsStore'

interface TimeBlockState {
  timeBlocks: TimeBlock[]
  timeEntries: TimeEntry[]
  isLoading: boolean
  error: string | null

  // データ取得 (timezone-aware)
  fetchTimeBlocksForLocalDate: (localDate: string, timezone: string) => Promise<void>
  fetchTimeEntriesForLocalDate: (localDate: string, timezone: string) => Promise<void>
  fetchTimeBlocksRange: (startDate: string, endDate: string) => Promise<void>
  fetchTimeEntriesRange: (startDate: string, endDate: string) => Promise<void>

  // タイムブロック操作 (timezone-aware: converts local time to UTC before sending)
  addTimeBlock: (block: Omit<TimeBlock, 'id'>) => Promise<void>
  updateTimeBlock: (id: string, updates: Partial<TimeBlock>) => Promise<void>
  deleteTimeBlock: (id: string) => Promise<void>

  // 時間記録操作（API連携, timezone-aware）
  addTimeEntry: (entry: Omit<TimeEntry, 'id'>) => Promise<void>
  updateTimeEntry: (id: string, updates: Partial<TimeEntry>) => Promise<void>
  deleteTimeEntry: (id: string) => Promise<void>

  // 取得
  getTimeBlocksByDate: (date: string) => TimeBlock[]
  getTimeEntriesByDate: (date: string) => TimeEntry[]
  getTodayTimeBlocks: () => TimeBlock[]
  getTodayTimeEntries: () => TimeEntry[]

  // ローカルにエントリを追加（API呼び出しなし、タイマー停止時に使用）
  insertTimeEntryLocal: (entry: TimeEntry) => void
}

// Helper to get current timezone from settings store
const getTimezone = (): string => {
  return useSettingsStore.getState().timezone || 'Asia/Tokyo'
}

export const useTimeBlockStore = create<TimeBlockState>((set, get) => ({
  timeBlocks: [],
  timeEntries: [],
  isLoading: false,
  error: null,

  // Timezone-aware fetch: converts local date to UTC range for proper querying
  fetchTimeBlocksForLocalDate: async (localDate, timezone) => {
    set({ isLoading: true, error: null })
    try {
      const timeBlocks = await timeblocksApi.listByLocalDate(localDate, timezone)
      set({ timeBlocks, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchTimeEntriesForLocalDate: async (localDate, timezone) => {
    set({ isLoading: true, error: null })
    try {
      const timeEntries = await timeentriesApi.listByLocalDate(localDate, timezone)
      set({ timeEntries, isLoading: false })
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
      const timezone = getTimezone()
      const newBlock = await timeblocksApi.createWithTimezone(block, timezone)
      set((state) => ({
        timeBlocks: [...state.timeBlocks, newBlock],
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  updateTimeBlock: async (id, updates) => {
    try {
      const timezone = getTimezone()
      // Find current block to get its date for time-only updates
      const currentBlock = get().timeBlocks.find((b) => b.id === id)
      const currentDate = currentBlock?.date || updates.date || ''
      const updatedBlock = await timeblocksApi.updateWithTimezone(id, updates, timezone, currentDate)
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

  fetchTimeEntriesRange: async (startDate, endDate) => {
    set({ isLoading: true, error: null })
    try {
      const timeEntries = await timeentriesApi.listByDateRange(startDate, endDate)
      set({ timeEntries, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  // TimeEntry CRUD operations (timezone-aware)
  addTimeEntry: async (entry) => {
    try {
      const timezone = getTimezone()
      const newEntry = await timeentriesApi.createWithTimezone(entry, timezone)
      set((state) => ({
        timeEntries: [...state.timeEntries, newEntry],
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  updateTimeEntry: async (id, updates) => {
    try {
      const timezone = getTimezone()
      // Find current entry to get its date for time-only updates
      const currentEntry = get().timeEntries.find((e) => e.id === id)
      const currentDate = currentEntry?.date || updates.date || ''
      const updatedEntry = await timeentriesApi.updateWithTimezone(id, updates, timezone, currentDate)
      set((state) => ({
        timeEntries: state.timeEntries.map((e) =>
          e.id === id ? updatedEntry : e
        ),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  deleteTimeEntry: async (id) => {
    try {
      await timeentriesApi.delete(id)
      set((state) => ({
        timeEntries: state.timeEntries.filter((e) => e.id !== id),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  getTimeBlocksByDate: (date) =>
    get().timeBlocks.filter((b) => b.date === date),

  getTimeEntriesByDate: (date) =>
    get().timeEntries.filter((e) => e.date === date),

  getTodayTimeBlocks: () => {
    // When using timezone-aware fetch (fetchTimeBlocksForLocalDate), the store
    // already contains only the data for the requested local date range.
    // Return all entries without additional filtering.
    return get().timeBlocks
  },

  getTodayTimeEntries: () => {
    // When using timezone-aware fetch (fetchTimeEntriesForLocalDate), the store
    // already contains only the data for the requested local date range.
    // Return all entries without additional filtering.
    return get().timeEntries
  },

  // Insert a time entry locally without API call (used when timer stops)
  insertTimeEntryLocal: (entry) => {
    set((state) => ({
      timeEntries: [...state.timeEntries, entry],
    }))
  },
}))
