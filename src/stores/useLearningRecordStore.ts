import { create } from 'zustand'
import type { LearningRecord, GoalTag } from '@/types'
import { recordsApi } from '@/api/services/records'

interface LearningRecordState {
  records: LearningRecord[]
  isLoading: boolean
  error: string | null

  // データ取得
  fetchRecords: () => Promise<void>

  // 操作
  addRecord: (record: Omit<LearningRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateRecord: (id: string, updates: Partial<LearningRecord>) => Promise<void>
  deleteRecord: (id: string) => Promise<void>

  // 取得
  getRecordById: (id: string) => LearningRecord | undefined
  getRecordsByProject: (projectId: string) => LearningRecord[]
  getRecordsByGoalTag: (goalTag: GoalTag) => LearningRecord[]
  searchRecords: (query: string) => LearningRecord[]
}

export const useLearningRecordStore = create<LearningRecordState>((set, get) => ({
  records: [],
  isLoading: false,
  error: null,

  fetchRecords: async () => {
    set({ isLoading: true, error: null })
    try {
      const records = await recordsApi.list()
      set({ records, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  addRecord: async (record) => {
    try {
      const newRecord = await recordsApi.create({
        title: record.title,
        content: record.content,
        format: record.format,
        projectId: record.projectId,
        goalTag: record.goalTag,
        relatedTimeEntryIds: record.relatedTimeEntryIds,
      })
      set((state) => ({
        records: [newRecord, ...state.records],
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  updateRecord: async (id, updates) => {
    try {
      const updatedRecord = await recordsApi.update(id, {
        title: updates.title,
        content: updates.content,
        format: updates.format,
        projectId: updates.projectId,
        goalTag: updates.goalTag,
        relatedTimeEntryIds: updates.relatedTimeEntryIds,
      })
      set((state) => ({
        records: state.records.map((r) =>
          r.id === id ? updatedRecord : r
        ),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  deleteRecord: async (id) => {
    try {
      await recordsApi.delete(id)
      set((state) => ({
        records: state.records.filter((r) => r.id !== id),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  getRecordById: (id) => get().records.find((r) => r.id === id),

  getRecordsByProject: (projectId) =>
    get().records.filter((r) => r.projectId === projectId),

  getRecordsByGoalTag: (goalTag) =>
    get().records.filter((r) => r.goalTag === goalTag),

  searchRecords: (query) => {
    const lowerQuery = query.toLowerCase()
    return get().records.filter(
      (r) =>
        r.title.toLowerCase().includes(lowerQuery) ||
        r.content.toLowerCase().includes(lowerQuery)
    )
  },
}))
