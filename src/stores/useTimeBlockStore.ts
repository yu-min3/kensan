import { create } from 'zustand'
import type { TimeBlock, TimeEntry } from '@/types'
import { mockTimeBlocks, mockTimeEntries, mockTodayTimeEntries, mockTomorrowTimeBlocks } from '@/data/mockData'
import { format } from 'date-fns'

interface TimeBlockState {
  timeBlocks: TimeBlock[]
  timeEntries: TimeEntry[]

  // タイムブロック操作
  addTimeBlock: (block: Omit<TimeBlock, 'id'>) => void
  updateTimeBlock: (id: string, updates: Partial<TimeBlock>) => void
  deleteTimeBlock: (id: string) => void

  // 時間記録操作
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
  timeBlocks: [...mockTimeBlocks, ...mockTomorrowTimeBlocks],
  timeEntries: [...mockTimeEntries, ...mockTodayTimeEntries],

  addTimeBlock: (block) =>
    set((state) => ({
      timeBlocks: [...state.timeBlocks, { ...block, id: `tb${Date.now()}` }],
    })),

  updateTimeBlock: (id, updates) =>
    set((state) => ({
      timeBlocks: state.timeBlocks.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    })),

  deleteTimeBlock: (id) =>
    set((state) => ({
      timeBlocks: state.timeBlocks.filter((b) => b.id !== id),
    })),

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
