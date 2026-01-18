import { create } from 'zustand'
import type { DiaryEntry } from '@/types'
import { diariesApi } from '@/api/services/diaries'

interface DiaryState {
  entries: DiaryEntry[]
  isLoading: boolean
  error: string | null

  // データ取得
  fetchEntries: () => Promise<void>

  // 操作
  addEntry: (entry: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateEntry: (id: string, updates: Partial<DiaryEntry>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>

  // 取得
  getEntryById: (id: string) => DiaryEntry | undefined
  getEntryByDate: (date: string) => DiaryEntry | undefined
  getEntriesByTag: (tag: string) => DiaryEntry[]
  searchEntries: (query: string) => DiaryEntry[]
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: [],
  isLoading: false,
  error: null,

  fetchEntries: async () => {
    set({ isLoading: true, error: null })
    try {
      const entries = await diariesApi.list()
      set({ entries, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  addEntry: async (entry) => {
    try {
      const newEntry = await diariesApi.create({
        date: entry.date,
        title: entry.title,
        content: entry.content,
        tags: entry.tags,
      })
      set((state) => ({
        entries: [newEntry, ...state.entries],
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  updateEntry: async (id, updates) => {
    try {
      const updatedEntry = await diariesApi.update(id, {
        title: updates.title,
        content: updates.content,
        tags: updates.tags,
      })
      set((state) => ({
        entries: state.entries.map((e) =>
          e.id === id ? updatedEntry : e
        ),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  deleteEntry: async (id) => {
    try {
      await diariesApi.delete(id)
      set((state) => ({
        entries: state.entries.filter((e) => e.id !== id),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  getEntryById: (id) => get().entries.find((e) => e.id === id),

  getEntryByDate: (date) => get().entries.find((e) => e.date === date),

  getEntriesByTag: (tag) =>
    get().entries.filter((e) => e.tags.includes(tag)),

  searchEntries: (query) => {
    const lowerQuery = query.toLowerCase()
    return get().entries.filter(
      (e) =>
        e.title.toLowerCase().includes(lowerQuery) ||
        e.content.toLowerCase().includes(lowerQuery)
    )
  },
}))
