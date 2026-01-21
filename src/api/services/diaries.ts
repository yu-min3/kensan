// Diary Entries API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
import { createApiService, extendApiService } from '../createApiService'
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

// Create base CRUD service
const baseDiariesApi = createApiService<
  DiaryEntryResponse,
  DiaryEntry,
  CreateDiaryInput,
  UpdateDiaryInput,
  DiaryFilter
>(
  {
    baseUrl: API_CONFIG.baseUrls.diary,
    resourcePath: '/diaries',
    transform: transformDiaryEntry,
  },
  {
    filterMappings: {
      startDate: 'start_date',
      endDate: 'end_date',
      query: 'q',
    },
  }
)

// Extend with diary-specific methods
export const diariesApi = extendApiService(baseDiariesApi, () => ({
  async getByDate(date: string): Promise<DiaryEntry> {
    const response = await httpClient.get<DiaryEntryResponse>(
      API_CONFIG.baseUrls.diary,
      `/diaries/by-date/${date}`
    )
    return transformDiaryEntry(response)
  },
}))
