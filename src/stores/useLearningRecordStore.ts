import { createCrudStore, CrudStore } from './createCrudStore'
import type { LearningRecord } from '@/types'
import { recordsApi, CreateRecordInput, UpdateRecordInput, RecordFilter } from '@/api/services/records'

// Extension state/actions specific to learning record store
interface LearningRecordExtensions {
  getRecordsByMilestone: (milestoneId: string) => LearningRecord[]
  getRecordsByGoal: (goalId: string) => LearningRecord[]
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
    getRecordsByMilestone: (milestoneId) =>
      get().items.filter((r) => r.milestoneId === milestoneId),

    getRecordsByGoal: (goalId) =>
      get().items.filter((r) => r.goalId === goalId),

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
