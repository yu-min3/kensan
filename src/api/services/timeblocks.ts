// Timeblocks API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
import type { TimeBlock, TimeEntry, GoalTag } from '@/types'
import { localDateToUtcRange } from '@/lib/timezone'

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

export const timeblocksApi = {
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

  /**
   * @deprecated Use listByLocalDate with timezone instead
   */
  async listByDate(date: string): Promise<TimeBlock[]> {
    const response = await httpClient.get<TimeBlockResponse[]>(
      API_CONFIG.baseUrls.timeblock,
      `/timeblocks?date=${date}`
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

  async create(data: Omit<TimeBlock, 'id'>): Promise<TimeBlock> {
    const response = await httpClient.post<TimeBlockResponse>(
      API_CONFIG.baseUrls.timeblock,
      '/timeblocks',
      data
    )
    return transformTimeBlock(response)
  },

  async update(id: string, data: Partial<Omit<TimeBlock, 'id'>>): Promise<TimeBlock> {
    const response = await httpClient.put<TimeBlockResponse>(
      API_CONFIG.baseUrls.timeblock,
      `/timeblocks/${id}`,
      data
    )
    return transformTimeBlock(response)
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(API_CONFIG.baseUrls.timeblock, `/timeblocks/${id}`)
  },
}

// TimeEntry response type
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

export const timeentriesApi = {
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

  /**
   * @deprecated Use listByLocalDate with timezone instead
   */
  async listByDate(date: string): Promise<TimeEntry[]> {
    const response = await httpClient.get<TimeEntryResponse[]>(
      API_CONFIG.baseUrls.timeblock,
      `/time-entries?date=${date}`
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

  async create(data: Omit<TimeEntry, 'id'>): Promise<TimeEntry> {
    const response = await httpClient.post<TimeEntryResponse>(
      API_CONFIG.baseUrls.timeblock,
      '/time-entries',
      data
    )
    return transformTimeEntry(response)
  },

  async update(id: string, data: Partial<Omit<TimeEntry, 'id'>>): Promise<TimeEntry> {
    const response = await httpClient.put<TimeEntryResponse>(
      API_CONFIG.baseUrls.timeblock,
      `/time-entries/${id}`,
      data
    )
    return transformTimeEntry(response)
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(API_CONFIG.baseUrls.timeblock, `/time-entries/${id}`)
  },
}
