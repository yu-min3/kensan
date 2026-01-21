// Timeblocks API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
import { createApiService, extendApiService } from '../createApiService'
import type { TimeBlock, TimeEntry, GoalTag } from '@/types'
import { localDateToUtcRange } from '@/lib/timezone'

// API Response types
interface TimeBlockResponse {
  id: string
  date: string
  startTime: string
  endTime: string
  taskId?: string
  taskName: string
  projectId?: string
  projectName?: string
  goalTag?: GoalTag
  isRoutine: boolean
  routineTaskId?: string
}

interface TimeEntryResponse {
  id: string
  date: string
  startTime: string
  endTime: string
  taskId?: string
  taskName: string
  projectId?: string
  projectName?: string
  goalTag?: GoalTag
  description?: string
}

// Transform functions
const transformTimeBlock = (tb: TimeBlockResponse): TimeBlock => ({
  id: tb.id,
  date: tb.date,
  startTime: tb.startTime,
  endTime: tb.endTime,
  taskId: tb.taskId,
  taskName: tb.taskName,
  projectId: tb.projectId,
  projectName: tb.projectName,
  goalTag: tb.goalTag,
  isRoutine: tb.isRoutine,
  routineTaskId: tb.routineTaskId,
})

const transformTimeEntry = (te: TimeEntryResponse): TimeEntry => ({
  id: te.id,
  date: te.date,
  startTime: te.startTime,
  endTime: te.endTime,
  taskId: te.taskId,
  taskName: te.taskName,
  projectId: te.projectId,
  projectName: te.projectName,
  goalTag: te.goalTag,
  description: te.description,
})

// Input types
export interface CreateTimeBlockInput {
  date: string
  startTime: string
  endTime: string
  taskId?: string
  taskName: string
  projectId?: string
  projectName?: string
  goalTag?: GoalTag
  isRoutine?: boolean
  routineTaskId?: string
}

export interface UpdateTimeBlockInput {
  date?: string
  startTime?: string
  endTime?: string
  taskId?: string
  taskName?: string
  projectId?: string
  projectName?: string
  goalTag?: GoalTag
  isRoutine?: boolean
  routineTaskId?: string
}

export interface CreateTimeEntryInput {
  date: string
  startTime: string
  endTime: string
  taskId?: string
  taskName: string
  projectId?: string
  projectName?: string
  goalTag?: GoalTag
  description?: string
}

export interface UpdateTimeEntryInput {
  date?: string
  startTime?: string
  endTime?: string
  taskId?: string
  taskName?: string
  projectId?: string
  projectName?: string
  goalTag?: GoalTag
  description?: string
}

// Base TimeBlocks API (CRUD operations)
const baseTimeBlocksApi = createApiService<
  TimeBlockResponse,
  TimeBlock,
  CreateTimeBlockInput,
  UpdateTimeBlockInput
>({
  baseUrl: API_CONFIG.baseUrls.timeblock,
  resourcePath: '/timeblocks',
  transform: transformTimeBlock,
})

// Base TimeEntries API (CRUD operations)
const baseTimeEntriesApi = createApiService<
  TimeEntryResponse,
  TimeEntry,
  CreateTimeEntryInput,
  UpdateTimeEntryInput
>({
  baseUrl: API_CONFIG.baseUrls.timeblock,
  resourcePath: '/time-entries',
  transform: transformTimeEntry,
})

// Extended TimeBlocks API with date-based queries
export const timeblocksApi = extendApiService(baseTimeBlocksApi, () => ({
  /**
   * List time blocks by local date with timezone conversion.
   * Converts the local date to UTC timestamp range for querying.
   * Response date/time will be converted to the specified timezone by the backend.
   *
   * @param localDate - Date in YYYY-MM-DD format (user's local timezone)
   * @param timezone - User's timezone (e.g., 'Asia/Tokyo')
   */
  async listByLocalDate(localDate: string, timezone: string): Promise<TimeBlock[]> {
    const { startUtc, endUtc } = localDateToUtcRange(localDate, timezone)
    const response = await httpClient.get<TimeBlockResponse[]>(
      API_CONFIG.baseUrls.timeblock,
      `/timeblocks?start_timestamp=${encodeURIComponent(startUtc)}&end_timestamp=${encodeURIComponent(endUtc)}&timezone=${encodeURIComponent(timezone)}`
    )
    return response.map(transformTimeBlock)
  },

  async listByDateRange(startDate: string, endDate: string): Promise<TimeBlock[]> {
    const response = await httpClient.get<TimeBlockResponse[]>(
      API_CONFIG.baseUrls.timeblock,
      `/timeblocks?start_date=${startDate}&end_date=${endDate}`
    )
    return response.map(transformTimeBlock)
  },
}))

// Extended TimeEntries API with date-based queries
export const timeentriesApi = extendApiService(baseTimeEntriesApi, () => ({
  /**
   * List time entries by local date with timezone conversion.
   * Converts the local date to UTC timestamp range for querying.
   * Response date/time will be converted to the specified timezone by the backend.
   *
   * @param localDate - Date in YYYY-MM-DD format (user's local timezone)
   * @param timezone - User's timezone (e.g., 'Asia/Tokyo')
   */
  async listByLocalDate(localDate: string, timezone: string): Promise<TimeEntry[]> {
    const { startUtc, endUtc } = localDateToUtcRange(localDate, timezone)
    const response = await httpClient.get<TimeEntryResponse[]>(
      API_CONFIG.baseUrls.timeblock,
      `/time-entries?start_timestamp=${encodeURIComponent(startUtc)}&end_timestamp=${encodeURIComponent(endUtc)}&timezone=${encodeURIComponent(timezone)}`
    )
    return response.map(transformTimeEntry)
  },

  async listByDateRange(startDate: string, endDate: string): Promise<TimeEntry[]> {
    const response = await httpClient.get<TimeEntryResponse[]>(
      API_CONFIG.baseUrls.timeblock,
      `/time-entries?start_date=${startDate}&end_date=${endDate}`
    )
    return response.map(transformTimeEntry)
  },
}))
