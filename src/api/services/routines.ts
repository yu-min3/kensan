// Routine Tasks API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
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

export const routinesApi = {
  async list(filters?: RoutineFilter): Promise<RoutineTask[]> {
    const params = new URLSearchParams()
    if (filters?.enabled !== undefined) params.set('enabled', String(filters.enabled))
    if (filters?.forDate) params.set('for_date', filters.forDate)

    const query = params.toString()
    const endpoint = `/routines${query ? `?${query}` : ''}`

    const response = await httpClient.get<RoutineTaskResponse[]>(
      API_CONFIG.baseUrls.routine,
      endpoint
    )
    return response.map(transformRoutineTask)
  },

  async create(data: CreateRoutineInput): Promise<RoutineTask> {
    const response = await httpClient.post<RoutineTaskResponse>(
      API_CONFIG.baseUrls.routine,
      '/routines',
      { ...data, enabled: data.enabled ?? true }
    )
    return transformRoutineTask(response)
  },

  async update(id: string, data: UpdateRoutineInput): Promise<RoutineTask> {
    const response = await httpClient.put<RoutineTaskResponse>(
      API_CONFIG.baseUrls.routine,
      `/routines/${id}`,
      data
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

  async delete(id: string): Promise<void> {
    await httpClient.delete(API_CONFIG.baseUrls.routine, `/routines/${id}`)
  },
}
