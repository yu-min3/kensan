import { create } from 'zustand'
import { tagsApi } from '@/api/services/tasks'
import type { Tag } from '@/types'
import type { CreateTagInput, UpdateTagInput } from '@/api/services/tasks'

interface TagState {
  tags: Tag[]
  isLoading: boolean
  error: string | null
  fetchTags: () => Promise<void>
  addTag: (input: CreateTagInput) => Promise<Tag>
  updateTag: (id: string, input: UpdateTagInput) => Promise<Tag>
  deleteTag: (id: string) => Promise<void>
  getTagById: (id: string) => Tag | undefined
  getTagsByIds: (ids: string[]) => Tag[]
  clearError: () => void
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  isLoading: false,
  error: null,

  fetchTags: async () => {
    set({ isLoading: true, error: null })
    try {
      const tags = await tagsApi.list()
      set({ tags, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  addTag: async (input) => {
    const tag = await tagsApi.create(input)
    set((state) => ({ tags: [...state.tags, tag] }))
    return tag
  },

  updateTag: async (id, input) => {
    const tag = await tagsApi.update(id, input)
    set((state) => ({
      tags: state.tags.map((t) => (t.id === id ? tag : t)),
    }))
    return tag
  },

  deleteTag: async (id) => {
    await tagsApi.delete(id)
    set((state) => ({ tags: state.tags.filter((t) => t.id !== id) }))
  },

  getTagById: (id) => get().tags.find((t) => t.id === id),

  getTagsByIds: (ids) => get().tags.filter((t) => ids.includes(t.id)),

  clearError: () => set({ error: null }),
}))
