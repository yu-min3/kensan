// Diary Entries API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
import type { DiaryEntry } from '@/types'

// API Response type
interface DiaryEntryResponse {
  id: string
  userId: string
  date: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

// Transform API response to frontend type
const transformDiaryEntry = (d: DiaryEntryResponse): DiaryEntry => ({
  id: d.id,
  date: d.date,
  title: d.title,
  content: d.content,
  tags: d.tags || [],
  createdAt: new Date(d.createdAt),
  updatedAt: new Date(d.updatedAt),
})

export interface CreateDiaryInput {
  date: string // YYYY-MM-DD
  title: string
  content?: string
  tags?: string[]
}

export interface UpdateDiaryInput {
  title?: string
  content?: string
  tags?: string[]
}

export interface DiaryFilter {
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
  tag?: string
  query?: string
}

export const diariesApi = {
  async list(filters?: DiaryFilter): Promise<DiaryEntry[]> {
    const params = new URLSearchParams()
    if (filters?.startDate) params.set('start_date', filters.startDate)
    if (filters?.endDate) params.set('end_date', filters.endDate)
    if (filters?.tag) params.set('tag', filters.tag)
    if (filters?.query) params.set('q', filters.query)

    const query = params.toString()
    const endpoint = `/diaries${query ? `?${query}` : ''}`

    const response = await httpClient.get<DiaryEntryResponse[]>(
      API_CONFIG.baseUrls.diary,
      endpoint
    )
    return response.map(transformDiaryEntry)
  },

  async get(id: string): Promise<DiaryEntry> {
    const response = await httpClient.get<DiaryEntryResponse>(
      API_CONFIG.baseUrls.diary,
      `/diaries/${id}`
    )
    return transformDiaryEntry(response)
  },

  async getByDate(date: string): Promise<DiaryEntry> {
    const response = await httpClient.get<DiaryEntryResponse>(
      API_CONFIG.baseUrls.diary,
      `/diaries/by-date/${date}`
    )
    return transformDiaryEntry(response)
  },

  async create(data: CreateDiaryInput): Promise<DiaryEntry> {
    const response = await httpClient.post<DiaryEntryResponse>(
      API_CONFIG.baseUrls.diary,
      '/diaries',
      data
    )
    return transformDiaryEntry(response)
  },

  async update(id: string, data: UpdateDiaryInput): Promise<DiaryEntry> {
    const response = await httpClient.put<DiaryEntryResponse>(
      API_CONFIG.baseUrls.diary,
      `/diaries/${id}`,
      data
    )
    return transformDiaryEntry(response)
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(API_CONFIG.baseUrls.diary, `/diaries/${id}`)
  },
}
