import { create } from 'zustand'
import type { DiaryEntry } from '@/types'
import { mockDiaryEntries } from '@/data/mockData'

interface DiaryState {
  entries: DiaryEntry[]

  // 操作
  addEntry: (entry: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateEntry: (id: string, updates: Partial<DiaryEntry>) => void
  deleteEntry: (id: string) => void

  // 取得
  getEntryById: (id: string) => DiaryEntry | undefined
  getEntryByDate: (date: string) => DiaryEntry | undefined
  getEntriesByTag: (tag: string) => DiaryEntry[]
  searchEntries: (query: string) => DiaryEntry[]
}

export const useDiaryStore = create<DiaryState>((set, get) => ({
  entries: mockDiaryEntries,

  addEntry: (entry) => {
    const now = new Date()
    set((state) => ({
      entries: [
        ...state.entries,
        {
          ...entry,
          id: `d${Date.now()}`,
          createdAt: now,
          updatedAt: now,
        },
      ],
    }))
  },

  updateEntry: (id, updates) =>
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, ...updates, updatedAt: new Date() } : e
      ),
    })),

  deleteEntry: (id) =>
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
    })),

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
