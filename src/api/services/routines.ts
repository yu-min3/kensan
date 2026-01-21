// Routine Tasks API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
import { createApiService, extendApiService } from '../createApiService'
import type { RoutineTask, RoutineFrequency } from '@/types'

// API Response type
interface RoutineTaskResponse {
  id: string
  userId: string
  name: string
  frequency: RoutineFrequency
  daysOfWeek?: number[]
  estimatedMinutes: number
  defaultStartTime?: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

// Transform API response to frontend type
const transformRoutineTask = (r: RoutineTaskResponse): RoutineTask => ({
  id: r.id,
  name: r.name,
  frequency: r.frequency,
  daysOfWeek: r.daysOfWeek,
  estimatedMinutes: r.estimatedMinutes,
  enabled: r.enabled,
})

export interface CreateRoutineInput {
  name: string
  frequency: RoutineFrequency
  daysOfWeek?: number[]
  estimatedMinutes: number
  defaultStartTime?: string
  enabled?: boolean
}

export interface UpdateRoutineInput {
  name?: string
  frequency?: RoutineFrequency
  daysOfWeek?: number[]
  estimatedMinutes?: number
  defaultStartTime?: string
  enabled?: boolean
}

export interface RoutineFilter {
  enabled?: boolean
  forDate?: string // YYYY-MM-DD
}

// Create base CRUD service (without get since routines doesn't have individual get)
const baseRoutinesApi = createApiService<
  RoutineTaskResponse,
  RoutineTask,
  CreateRoutineInput,
  UpdateRoutineInput,
  RoutineFilter
>(
  {
    baseUrl: API_CONFIG.baseUrls.routine,
    resourcePath: '/routines',
    transform: transformRoutineTask,
  },
  {
    filterMappings: {
      forDate: 'for_date',
    },
  }
)

// Extend with routine-specific methods
export const routinesApi = extendApiService(baseRoutinesApi, () => ({
  // Override create to set default enabled value
  async create(data: CreateRoutineInput): Promise<RoutineTask> {
    const response = await httpClient.post<RoutineTaskResponse>(
      API_CONFIG.baseUrls.routine,
      '/routines',
      { ...data, enabled: data.enabled ?? true }
    )
    return transformRoutineTask(response)
  },

  async toggleEnabled(id: string): Promise<RoutineTask> {
    const response = await httpClient.patch<RoutineTaskResponse>(
      API_CONFIG.baseUrls.routine,
      `/routines/${id}/toggle`
    )
    return transformRoutineTask(response)
  },
}))
