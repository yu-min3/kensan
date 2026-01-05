import { create } from 'zustand'
import type { LearningRecord, GoalTag } from '@/types'
import { mockLearningRecords } from '@/data/mockData'

interface LearningRecordState {
  records: LearningRecord[]

  // 操作
  addRecord: (record: Omit<LearningRecord, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateRecord: (id: string, updates: Partial<LearningRecord>) => void
  deleteRecord: (id: string) => void

  // 取得
  getRecordById: (id: string) => LearningRecord | undefined
  getRecordsByProject: (projectId: string) => LearningRecord[]
  getRecordsByGoalTag: (goalTag: GoalTag) => LearningRecord[]
  searchRecords: (query: string) => LearningRecord[]
}

export const useLearningRecordStore = create<LearningRecordState>((set, get) => ({
  records: mockLearningRecords,

  addRecord: (record) => {
    const now = new Date()
    set((state) => ({
      records: [
        ...state.records,
        {
          ...record,
          id: `lr${Date.now()}`,
          createdAt: now,
          updatedAt: now,
        },
      ],
    }))
  },

  updateRecord: (id, updates) =>
    set((state) => ({
      records: state.records.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: new Date() } : r
      ),
    })),

  deleteRecord: (id) =>
    set((state) => ({
      records: state.records.filter((r) => r.id !== id),
    })),

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
