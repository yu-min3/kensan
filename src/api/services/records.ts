// Learning Records API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
import { createApiService, extendApiService } from '../createApiService'
import type { LearningRecord, RecordFormat } from '@/types'

// API Response type
interface LearningRecordResponse {
  id: string
  userId: string
  title: string
  content: string
  format: RecordFormat
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  tagIds?: string[]
  relatedTimeEntryIds?: string[]
  createdAt: string
  updatedAt: string
}

// Transform API response to frontend type
const transformLearningRecord = (r: LearningRecordResponse): LearningRecord => ({
  id: r.id,
  title: r.title,
  content: r.content,
  format: r.format,
  milestoneId: r.milestoneId,
  milestoneName: r.milestoneName,
  goalId: r.goalId,
  goalName: r.goalName,
  goalColor: r.goalColor,
  tagIds: r.tagIds,
  relatedTimeEntryIds: r.relatedTimeEntryIds,
  createdAt: new Date(r.createdAt),
  updatedAt: new Date(r.updatedAt),
})

export interface CreateRecordInput {
  title: string
  content: string
  format: RecordFormat
  milestoneId?: string
  goalId?: string
  tagIds?: string[]
  relatedTimeEntryIds?: string[]
}

export interface UpdateRecordInput {
  title?: string
  content?: string
  format?: RecordFormat
  milestoneId?: string
  goalId?: string
  tagIds?: string[]
  relatedTimeEntryIds?: string[]
}

export interface RecordFilter {
  milestoneId?: string
  goalId?: string
  format?: RecordFormat
  query?: string
}

// Create base CRUD service
const baseRecordsApi = createApiService<
  LearningRecordResponse,
  LearningRecord,
  CreateRecordInput,
  UpdateRecordInput,
  RecordFilter
>(
  {
    baseUrl: API_CONFIG.baseUrls.record,
    resourcePath: '/records',
    transform: transformLearningRecord,
  },
  {
    filterMappings: {
      milestoneId: 'milestone_id',
      goalId: 'goal_id',
      query: 'q',
    },
  }
)

// Extend with record-specific methods
export const recordsApi = extendApiService(baseRecordsApi, () => ({
  async semanticSearch(query: string, limit?: number): Promise<LearningRecord[]> {
    const response = await httpClient.post<LearningRecordResponse[]>(
      API_CONFIG.baseUrls.record,
      '/records/search/semantic',
      { query, limit }
    )
    return response.map(transformLearningRecord)
  },
}))
