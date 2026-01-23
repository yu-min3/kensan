import { create } from 'zustand'
import type { Note, NoteListItem, NoteSearchResult, NoteType } from '@/types'
import { notesApi, CreateNoteInput, UpdateNoteInput, NoteFilter } from '@/api/services/notes'

// Store state
interface NoteState {
  // Note list items (without content)
  items: NoteListItem[]
  // Full notes cache (with content)
  noteCache: Map<string, Note>
  // Search results
  searchResults: NoteSearchResult[]
  // Current filters
  currentFilter: NoteFilter
  // Loading states
  isLoading: boolean
  isSearching: boolean
  error: string | null
}

// Store actions
interface NoteActions {
  // Fetch operations
  fetchNotes: (filter?: NoteFilter) => Promise<void>
  fetchNote: (id: string) => Promise<Note>
  search: (query: string, filter?: Pick<NoteFilter, 'types' | 'archived'>, limit?: number) => Promise<void>

  // CRUD operations
  createNote: (data: CreateNoteInput) => Promise<Note>
  updateNote: (id: string, data: UpdateNoteInput) => Promise<Note>
  deleteNote: (id: string) => Promise<void>
  archiveNote: (id: string, archived: boolean) => Promise<Note>

  // Convenience methods for specific types
  createDiary: (data: Omit<CreateNoteInput, 'type'> & { date: string }) => Promise<Note>
  createLearning: (data: Omit<CreateNoteInput, 'type'>) => Promise<Note>
  createMemo: (data: Omit<CreateNoteInput, 'type'>) => Promise<Note>

  // Filter helpers
  setFilter: (filter: NoteFilter) => void
  clearFilter: () => void

  // Getters
  getById: (id: string) => NoteListItem | undefined
  getNoteContent: (id: string) => Note | undefined
  getByType: (type: NoteType) => NoteListItem[]
  getByGoal: (goalId: string) => NoteListItem[]
  getByMilestone: (milestoneId: string) => NoteListItem[]
  getByTask: (taskId: string) => NoteListItem[]
  getByDate: (date: string) => NoteListItem[]

  // Error handling
  clearError: () => void
  clearSearchResults: () => void
}

export type NoteStore = NoteState & NoteActions

export const useNoteStore = create<NoteStore>()((set, get) => ({
  // Initial state
  items: [],
  noteCache: new Map(),
  searchResults: [],
  currentFilter: {},
  isLoading: false,
  isSearching: false,
  error: null,

  // Fetch operations
  fetchNotes: async (filter?: NoteFilter) => {
    set({ isLoading: true, error: null })
    try {
      const mergedFilter = { ...get().currentFilter, ...filter }
      const items = await notesApi.listItems(mergedFilter)
      set({ items, currentFilter: mergedFilter, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchNote: async (id: string) => {
    const cached = get().noteCache.get(id)
    if (cached) return cached

    try {
      const note = await notesApi.get(id)
      set((state) => ({
        noteCache: new Map(state.noteCache).set(id, note),
      }))
      return note
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  search: async (query: string, filter?: Pick<NoteFilter, 'types' | 'archived'>, limit?: number) => {
    set({ isSearching: true, error: null })
    try {
      const results = await notesApi.search(query, filter, limit)
      set({ searchResults: results, isSearching: false })
    } catch (error) {
      set({ error: (error as Error).message, isSearching: false })
    }
  },

  // CRUD operations
  createNote: async (data: CreateNoteInput) => {
    try {
      const newNote = await notesApi.create(data)
      // Add to items list (as NoteListItem)
      const listItem: NoteListItem = {
        id: newNote.id,
        userId: newNote.userId,
        type: newNote.type,
        title: newNote.title,
        format: newNote.format,
        date: newNote.date,
        taskId: newNote.taskId,
        milestoneId: newNote.milestoneId,
        milestoneName: newNote.milestoneName,
        goalId: newNote.goalId,
        goalName: newNote.goalName,
        goalColor: newNote.goalColor,
        tagIds: newNote.tagIds,
        relatedTimeEntryIds: newNote.relatedTimeEntryIds,
        fileUrl: newNote.fileUrl,
        archived: newNote.archived,
        createdAt: newNote.createdAt,
        updatedAt: newNote.updatedAt,
      }
      set((state) => ({
        items: [listItem, ...state.items],
        noteCache: new Map(state.noteCache).set(newNote.id, newNote),
      }))
      return newNote
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  updateNote: async (id: string, data: UpdateNoteInput) => {
    try {
      const updatedNote = await notesApi.update(id, data)
      const listItem: NoteListItem = {
        id: updatedNote.id,
        userId: updatedNote.userId,
        type: updatedNote.type,
        title: updatedNote.title,
        format: updatedNote.format,
        date: updatedNote.date,
        taskId: updatedNote.taskId,
        milestoneId: updatedNote.milestoneId,
        milestoneName: updatedNote.milestoneName,
        goalId: updatedNote.goalId,
        goalName: updatedNote.goalName,
        goalColor: updatedNote.goalColor,
        tagIds: updatedNote.tagIds,
        relatedTimeEntryIds: updatedNote.relatedTimeEntryIds,
        fileUrl: updatedNote.fileUrl,
        archived: updatedNote.archived,
        createdAt: updatedNote.createdAt,
        updatedAt: updatedNote.updatedAt,
      }
      set((state) => ({
        items: state.items.map((item) => (item.id === id ? listItem : item)),
        noteCache: new Map(state.noteCache).set(id, updatedNote),
      }))
      return updatedNote
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  deleteNote: async (id: string) => {
    try {
      await notesApi.delete(id)
      set((state) => {
        const newCache = new Map(state.noteCache)
        newCache.delete(id)
        return {
          items: state.items.filter((item) => item.id !== id),
          noteCache: newCache,
        }
      })
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  archiveNote: async (id: string, archived: boolean) => {
    try {
      const updatedNote = await notesApi.archive(id, archived)
      const listItem: NoteListItem = {
        id: updatedNote.id,
        userId: updatedNote.userId,
        type: updatedNote.type,
        title: updatedNote.title,
        format: updatedNote.format,
        date: updatedNote.date,
        taskId: updatedNote.taskId,
        milestoneId: updatedNote.milestoneId,
        milestoneName: updatedNote.milestoneName,
        goalId: updatedNote.goalId,
        goalName: updatedNote.goalName,
        goalColor: updatedNote.goalColor,
        tagIds: updatedNote.tagIds,
        relatedTimeEntryIds: updatedNote.relatedTimeEntryIds,
        fileUrl: updatedNote.fileUrl,
        archived: updatedNote.archived,
        createdAt: updatedNote.createdAt,
        updatedAt: updatedNote.updatedAt,
      }
      set((state) => ({
        items: state.items.map((item) => (item.id === id ? listItem : item)),
        noteCache: new Map(state.noteCache).set(id, updatedNote),
      }))
      return updatedNote
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  // Convenience methods
  createDiary: async (data) => {
    return get().createNote({ ...data, type: 'diary' })
  },

  createLearning: async (data) => {
    return get().createNote({ ...data, type: 'learning' })
  },

  createMemo: async (data) => {
    return get().createNote({ ...data, type: 'memo' })
  },

  // Filter helpers
  setFilter: (filter: NoteFilter) => {
    set({ currentFilter: filter })
    get().fetchNotes(filter)
  },

  clearFilter: () => {
    set({ currentFilter: {} })
    get().fetchNotes({})
  },

  // Getters
  getById: (id: string) => get().items.find((item) => item.id === id),

  getNoteContent: (id: string) => get().noteCache.get(id),

  getByType: (type: NoteType) => get().items.filter((item) => item.type === type),

  getByGoal: (goalId: string) => get().items.filter((item) => item.goalId === goalId),

  getByMilestone: (milestoneId: string) => get().items.filter((item) => item.milestoneId === milestoneId),

  getByTask: (taskId: string) => get().items.filter((item) => item.taskId === taskId),

  getByDate: (date: string) => get().items.filter((item) => item.date === date),

  // Error handling
  clearError: () => set({ error: null }),

  clearSearchResults: () => set({ searchResults: [] }),
}))
