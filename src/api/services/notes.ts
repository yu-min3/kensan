// Notes API Service (unified diary, learning, memo)
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
import { createApiService, extendApiService, buildQueryParams } from '../createApiService'
import type { Note, NoteListItem, NoteSearchResult, NoteType, NoteFormat } from '@/types'

// ============================================
// API Response Types
// ============================================
interface NoteResponse {
  id: string
  userId: string
  type: NoteType
  title?: string
  content: string
  format: NoteFormat
  date?: string
  taskId?: string
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  tagIds?: string[]
  relatedTimeEntryIds?: string[]
  fileUrl?: string
  archived: boolean
  createdAt: string
  updatedAt: string
}

interface NoteListItemResponse {
  id: string
  userId: string
  type: NoteType
  title?: string
  format: NoteFormat
  date?: string
  taskId?: string
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  tagIds?: string[]
  relatedTimeEntryIds?: string[]
  fileUrl?: string
  archived: boolean
  createdAt: string
  updatedAt: string
}

interface NoteSearchResultResponse {
  note: NoteListItemResponse
  score: number
}

// ============================================
// Transform Functions
// ============================================
const transformNote = (n: NoteResponse): Note => ({
  id: n.id,
  userId: n.userId,
  type: n.type,
  title: n.title,
  content: n.content,
  format: n.format,
  date: n.date,
  taskId: n.taskId,
  milestoneId: n.milestoneId,
  milestoneName: n.milestoneName,
  goalId: n.goalId,
  goalName: n.goalName,
  goalColor: n.goalColor,
  tagIds: n.tagIds,
  relatedTimeEntryIds: n.relatedTimeEntryIds,
  fileUrl: n.fileUrl,
  archived: n.archived,
  createdAt: new Date(n.createdAt),
  updatedAt: new Date(n.updatedAt),
})

const transformNoteListItem = (n: NoteListItemResponse): NoteListItem => ({
  id: n.id,
  userId: n.userId,
  type: n.type,
  title: n.title,
  format: n.format,
  date: n.date,
  taskId: n.taskId,
  milestoneId: n.milestoneId,
  milestoneName: n.milestoneName,
  goalId: n.goalId,
  goalName: n.goalName,
  goalColor: n.goalColor,
  tagIds: n.tagIds,
  relatedTimeEntryIds: n.relatedTimeEntryIds,
  fileUrl: n.fileUrl,
  archived: n.archived,
  createdAt: new Date(n.createdAt),
  updatedAt: new Date(n.updatedAt),
})

const transformSearchResult = (r: NoteSearchResultResponse): NoteSearchResult => ({
  note: transformNoteListItem(r.note),
  score: r.score,
})

// ============================================
// Input Types
// ============================================
export interface CreateNoteInput {
  type: NoteType
  title?: string
  content: string
  format: NoteFormat
  date?: string // YYYY-MM-DD, required for diary
  taskId?: string
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  tagIds?: string[]
  relatedTimeEntryIds?: string[]
  fileUrl?: string
}

export interface UpdateNoteInput {
  title?: string
  content?: string
  format?: NoteFormat
  date?: string
  taskId?: string | null
  milestoneId?: string | null
  milestoneName?: string | null
  goalId?: string | null
  goalName?: string | null
  goalColor?: string | null
  tagIds?: string[]
  relatedTimeEntryIds?: string[]
  fileUrl?: string | null
  archived?: boolean
}

export interface NoteFilter {
  types?: NoteType[] // Filter by note types
  goalId?: string
  milestoneId?: string
  taskId?: string
  tagIds?: string[] // Filter by tags (AND condition)
  dateFrom?: string // YYYY-MM-DD
  dateTo?: string // YYYY-MM-DD
  archived?: boolean
  format?: NoteFormat
  q?: string // Search query
}

// ============================================
// Base API Service
// ============================================
const baseNotesApi = createApiService<
  NoteResponse,
  Note,
  CreateNoteInput,
  UpdateNoteInput,
  NoteFilter
>(
  {
    baseUrl: API_CONFIG.baseUrls.note,
    resourcePath: '/notes',
    transform: transformNote,
  },
  {
    filterMappings: {
      goalId: 'goal_id',
      milestoneId: 'milestone_id',
      taskId: 'task_id',
      tagIds: 'tag_ids',
      dateFrom: 'date_from',
      dateTo: 'date_to',
    },
  }
)

// ============================================
// Extended API with custom methods
// ============================================
export const notesApi = extendApiService(baseNotesApi, () => ({
  /**
   * List notes (returns items without content)
   */
  async listItems(filters?: NoteFilter): Promise<NoteListItem[]> {
    const params: Record<string, string> = {}

    if (filters?.types && filters.types.length > 0) {
      params.types = filters.types.join(',')
    }
    if (filters?.goalId) params.goal_id = filters.goalId
    if (filters?.milestoneId) params.milestone_id = filters.milestoneId
    if (filters?.taskId) params.task_id = filters.taskId
    if (filters?.tagIds && filters.tagIds.length > 0) {
      params.tag_ids = filters.tagIds.join(',')
    }
    if (filters?.dateFrom) params.date_from = filters.dateFrom
    if (filters?.dateTo) params.date_to = filters.dateTo
    if (filters?.archived !== undefined) params.archived = String(filters.archived)
    if (filters?.format) params.format = filters.format
    if (filters?.q) params.q = filters.q

    const query = buildQueryParams(params)
    const response = await httpClient.get<NoteListItemResponse[]>(
      API_CONFIG.baseUrls.note,
      `/notes${query}`
    )
    return response.map(transformNoteListItem)
  },

  /**
   * Search notes
   */
  async search(
    query: string,
    filters?: Pick<NoteFilter, 'types' | 'archived'>,
    limit?: number
  ): Promise<NoteSearchResult[]> {
    const params: Record<string, string> = { q: query }

    if (filters?.types && filters.types.length > 0) {
      params.types = filters.types.join(',')
    }
    if (filters?.archived !== undefined) params.archived = String(filters.archived)
    if (limit) params.limit = String(limit)

    const queryStr = buildQueryParams(params)
    const response = await httpClient.get<NoteSearchResultResponse[]>(
      API_CONFIG.baseUrls.note,
      `/notes/search${queryStr}`
    )
    return response.map(transformSearchResult)
  },

  /**
   * Archive/unarchive a note
   */
  async archive(id: string, archived: boolean): Promise<Note> {
    const response = await httpClient.post<NoteResponse>(
      API_CONFIG.baseUrls.note,
      `/notes/${id}/archive`,
      { archived }
    )
    return transformNote(response)
  },

  // ============================================
  // Convenience methods for specific note types
  // ============================================

  /**
   * List diary notes
   */
  async listDiaries(filters?: Omit<NoteFilter, 'types'>): Promise<NoteListItem[]> {
    return this.listItems({ ...filters, types: ['diary'] })
  },

  /**
   * List learning notes
   */
  async listLearnings(filters?: Omit<NoteFilter, 'types'>): Promise<NoteListItem[]> {
    return this.listItems({ ...filters, types: ['learning'] })
  },

  /**
   * Create a diary entry
   */
  async createDiary(input: Omit<CreateNoteInput, 'type'> & { date: string }): Promise<Note> {
    return baseNotesApi.create({ ...input, type: 'diary' })
  },

  /**
   * Create a learning record
   */
  async createLearning(input: Omit<CreateNoteInput, 'type'>): Promise<Note> {
    return baseNotesApi.create({ ...input, type: 'learning' })
  },

}))

// ============================================
// Export types for external use
// ============================================
export type { Note, NoteListItem, NoteSearchResult, NoteType, NoteFormat }
