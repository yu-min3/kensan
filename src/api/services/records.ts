// Learning Records API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
import { createApiService, extendApiService } from '../createApiService'
import type { LearningRecord, RecordFormat, GoalTag } from '@/types'

// API Response type
interface LearningRecordResponse {
  id: string
  userId: string
  title: string
  content: string
  format: RecordFormat
  projectId?: string
  projectName?: string
  goalTag?: GoalTag
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
  projectId: r.projectId,
  projectName: r.projectName,
  goalTag: r.goalTag,
  relatedTimeEntryIds: r.relatedTimeEntryIds,
  createdAt: new Date(r.createdAt),
  updatedAt: new Date(r.updatedAt),
})

export interface CreateRecordInput {
  title: string
  content: string
  format: RecordFormat
  projectId?: string
  goalTag?: GoalTag
  relatedTimeEntryIds?: string[]
}

export interface UpdateRecordInput {
  title?: string
  content?: string
  format?: RecordFormat
  projectId?: string
  goalTag?: GoalTag
  relatedTimeEntryIds?: string[]
}

export interface RecordFilter {
  projectId?: string
  goalTag?: GoalTag
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
      projectId: 'project_id',
      goalTag: 'goal_tag',
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
