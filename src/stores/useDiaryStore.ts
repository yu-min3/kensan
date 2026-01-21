import { createCrudStore, CrudStore } from './createCrudStore'
import type { DiaryEntry } from '@/types'
import { diariesApi, CreateDiaryInput, UpdateDiaryInput, DiaryFilter } from '@/api/services/diaries'

// Extension state/actions specific to diary store
interface DiaryExtensions {
  getEntryByDate: (date: string) => DiaryEntry | undefined
  getEntriesByTag: (tag: string) => DiaryEntry[]
  searchEntries: (query: string) => DiaryEntry[]
}

// Full store type for external use
export type DiaryStore = CrudStore<DiaryEntry, CreateDiaryInput, UpdateDiaryInput> & DiaryExtensions

// Create the store with base CRUD + extensions
export const useDiaryStore = createCrudStore<
  DiaryEntry,
  CreateDiaryInput,
  UpdateDiaryInput,
  DiaryFilter,
  DiaryExtensions
>(
  {
    api: diariesApi,
    getId: (d) => d.id,
    prependOnAdd: true,
  },
  (_set, get) => ({
    getEntryByDate: (date) => get().items.find((e) => e.date === date),

    getEntriesByTag: (tag) => get().items.filter((e) => e.tags.includes(tag)),

    searchEntries: (query) => {
      const lowerQuery = query.toLowerCase()
      return get().items.filter(
        (e) =>
          e.title.toLowerCase().includes(lowerQuery) ||
          e.content.toLowerCase().includes(lowerQuery)
      )
    },
  })
)

// Re-export for backward compatibility with existing code using 'entries' instead of 'items'
// Note: New code should use 'items' directly
