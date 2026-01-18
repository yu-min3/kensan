// Learning Records API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
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

export const recordsApi = {
  async list(filters?: RecordFilter): Promise<LearningRecord[]> {
    const params = new URLSearchParams()
    if (filters?.projectId) params.set('project_id', filters.projectId)
    if (filters?.goalTag) params.set('goal_tag', filters.goalTag)
    if (filters?.format) params.set('format', filters.format)
    if (filters?.query) params.set('q', filters.query)

    const query = params.toString()
    const endpoint = `/records${query ? `?${query}` : ''}`

    const response = await httpClient.get<LearningRecordResponse[]>(
      API_CONFIG.baseUrls.record,
      endpoint
    )
    return response.map(transformLearningRecord)
  },

  async get(id: string): Promise<LearningRecord> {
    const response = await httpClient.get<LearningRecordResponse>(
      API_CONFIG.baseUrls.record,
      `/records/${id}`
    )
    return transformLearningRecord(response)
  },

  async create(data: CreateRecordInput): Promise<LearningRecord> {
    const response = await httpClient.post<LearningRecordResponse>(
      API_CONFIG.baseUrls.record,
      '/records',
      data
    )
    return transformLearningRecord(response)
  },

  async update(id: string, data: UpdateRecordInput): Promise<LearningRecord> {
    const response = await httpClient.put<LearningRecordResponse>(
      API_CONFIG.baseUrls.record,
      `/records/${id}`,
      data
    )
    return transformLearningRecord(response)
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(API_CONFIG.baseUrls.record, `/records/${id}`)
  },

  async semanticSearch(query: string, limit?: number): Promise<LearningRecord[]> {
    const response = await httpClient.post<LearningRecordResponse[]>(
      API_CONFIG.baseUrls.record,
      '/records/search/semantic',
      { query, limit }
    )
    return response.map(transformLearningRecord)
  },
}
