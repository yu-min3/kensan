import { createCrudStore, CrudStore } from './createCrudStore'
import type { LearningRecord, GoalTag } from '@/types'
import { recordsApi, CreateRecordInput, UpdateRecordInput, RecordFilter } from '@/api/services/records'

// Extension state/actions specific to learning record store
interface LearningRecordExtensions {
  getRecordsByProject: (projectId: string) => LearningRecord[]
  getRecordsByGoalTag: (goalTag: GoalTag) => LearningRecord[]
  searchRecords: (query: string) => LearningRecord[]
}

// Full store type for external use
export type LearningRecordStore = CrudStore<LearningRecord, CreateRecordInput, UpdateRecordInput> & LearningRecordExtensions

// Create the store with base CRUD + extensions
export const useLearningRecordStore = createCrudStore<
  LearningRecord,
  CreateRecordInput,
  UpdateRecordInput,
  RecordFilter,
  LearningRecordExtensions
>(
  {
    api: recordsApi,
    getId: (r) => r.id,
    prependOnAdd: true,
  },
  (_set, get) => ({
    getRecordsByProject: (projectId) =>
      get().items.filter((r) => r.projectId === projectId),

    getRecordsByGoalTag: (goalTag) =>
      get().items.filter((r) => r.goalTag === goalTag),

    searchRecords: (query) => {
      const lowerQuery = query.toLowerCase()
      return get().items.filter(
        (r) =>
          r.title.toLowerCase().includes(lowerQuery) ||
          r.content.toLowerCase().includes(lowerQuery)
      )
    },
  })
)

// Re-export for backward compatibility with existing code using 'records' instead of 'items'
// Note: New code should use 'items' directly
