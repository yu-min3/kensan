// Timeblocks API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
import { createApiService, extendApiService } from '../createApiService'
import type { TimeBlock, TimeEntry } from '@/types'
import { localDateToUtcRange, localToUtcDatetime } from '@/lib/timezone'

// API Response types (matches backend JSON)
interface TimeBlockResponse {
  id: string
  startDatetime: string // ISO 8601 UTC
  endDatetime: string // ISO 8601 UTC
  taskId?: string
  taskName: string
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  tagIds?: string[]
}

interface TimeEntryResponse {
  id: string
  startDatetime: string // ISO 8601 UTC
  endDatetime: string // ISO 8601 UTC
  taskId?: string
  taskName: string
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  tagIds?: string[]
  description?: string
}

// Transform functions (API response → domain type, no conversion needed)
const transformTimeBlock = (tb: TimeBlockResponse): TimeBlock => ({
  id: tb.id,
  startDatetime: tb.startDatetime,
  endDatetime: tb.endDatetime,
  taskId: tb.taskId,
  taskName: tb.taskName,
  milestoneId: tb.milestoneId,
  milestoneName: tb.milestoneName,
  goalId: tb.goalId,
  goalName: tb.goalName,
  goalColor: tb.goalColor,
  tagIds: tb.tagIds,
})

const transformTimeEntry = (te: TimeEntryResponse): TimeEntry => ({
  id: te.id,
  startDatetime: te.startDatetime,
  endDatetime: te.endDatetime,
  taskId: te.taskId,
  taskName: te.taskName,
  milestoneId: te.milestoneId,
  milestoneName: te.milestoneName,
  goalId: te.goalId,
  goalName: te.goalName,
  goalColor: te.goalColor,
  tagIds: te.tagIds,
  description: te.description,
})

// Input types (sent to backend as UTC ISO datetimes)
export interface CreateTimeBlockInput {
  startDatetime: string // ISO 8601 UTC
  endDatetime: string // ISO 8601 UTC
  taskId?: string
  taskName: string
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  tagIds?: string[]
  isRoutine?: boolean
  routineTaskId?: string
}

export interface UpdateTimeBlockInput {
  startDatetime?: string // ISO 8601 UTC
  endDatetime?: string // ISO 8601 UTC
  taskId?: string
  taskName?: string
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  tagIds?: string[]
  isRoutine?: boolean
  routineTaskId?: string
}

export interface CreateTimeEntryInput {
  startDatetime: string // ISO 8601 UTC
  endDatetime: string // ISO 8601 UTC
  taskId?: string
  taskName: string
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  tagIds?: string[]
  description?: string
}

export interface UpdateTimeEntryInput {
  startDatetime?: string // ISO 8601 UTC
  endDatetime?: string // ISO 8601 UTC
  taskId?: string
  taskName?: string
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  tagIds?: string[]
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
export const timeblocksApi = extendApiService(baseTimeBlocksApi, (base) => ({
  /**
   * List time blocks by local date.
   * Converts the local date to UTC datetime range for querying.
   *
   * @param localDate - Date in YYYY-MM-DD format (user's local timezone)
   * @param timezone - User's timezone (e.g., 'Asia/Tokyo')
   */
  async listByLocalDate(localDate: string, timezone: string): Promise<TimeBlock[]> {
    const { startUtc, endUtc } = localDateToUtcRange(localDate, timezone)
    const response = await httpClient.get<TimeBlockResponse[]>(
      API_CONFIG.baseUrls.timeblock,
      `/timeblocks?start_datetime=${encodeURIComponent(startUtc)}&end_datetime=${encodeURIComponent(endUtc)}`
    )
    return response.map(transformTimeBlock)
  },

  async listByDateRange(startDate: string, endDate: string, timezone: string): Promise<TimeBlock[]> {
    const { startUtc } = localDateToUtcRange(startDate, timezone)
    const { endUtc } = localDateToUtcRange(endDate, timezone)
    const response = await httpClient.get<TimeBlockResponse[]>(
      API_CONFIG.baseUrls.timeblock,
      `/timeblocks?start_datetime=${encodeURIComponent(startUtc)}&end_datetime=${encodeURIComponent(endUtc)}`
    )
    return response.map(transformTimeBlock)
  },

  /**
   * Create a time block from local date/time.
   * Converts local date/time to UTC ISO datetimes before sending.
   *
   * @param localDate - Date in YYYY-MM-DD format (user's local timezone)
   * @param localStartTime - Start time in HH:mm format (local)
   * @param localEndTime - End time in HH:mm format (local)
   * @param data - Other time block fields
   * @param timezone - User's timezone (e.g., 'Asia/Tokyo')
   */
  async createFromLocal(
    localDate: string,
    localStartTime: string,
    localEndTime: string,
    data: Omit<CreateTimeBlockInput, 'startDatetime' | 'endDatetime'>,
    timezone: string
  ): Promise<TimeBlock> {
    let startDatetime = localToUtcDatetime(localDate, localStartTime, timezone)
    let endDatetime = localToUtcDatetime(localDate, localEndTime, timezone)

    // Handle overnight blocks (e.g., 23:30 - 00:30)
    if (endDatetime <= startDatetime) {
      // Add 1 day to end
      const endMs = new Date(endDatetime).getTime() + 24 * 60 * 60 * 1000
      endDatetime = new Date(endMs).toISOString()
    }

    return base.create({
      ...data,
      startDatetime,
      endDatetime,
    })
  },

  /**
   * Update a time block from local date/time.
   *
   * @param id - Time block ID
   * @param localDate - Date in YYYY-MM-DD (local), needed when updating times
   * @param localStartTime - New start time in HH:mm (local), optional
   * @param localEndTime - New end time in HH:mm (local), optional
   * @param data - Other fields to update
   * @param timezone - User's timezone
   */
  async updateFromLocal(
    id: string,
    localDate: string | undefined,
    localStartTime: string | undefined,
    localEndTime: string | undefined,
    data: Omit<UpdateTimeBlockInput, 'startDatetime' | 'endDatetime'>,
    timezone: string
  ): Promise<TimeBlock> {
    const input: UpdateTimeBlockInput = { ...data }

    if (localDate && localStartTime) {
      input.startDatetime = localToUtcDatetime(localDate, localStartTime, timezone)
    }
    if (localDate && localEndTime) {
      input.endDatetime = localToUtcDatetime(localDate, localEndTime, timezone)
    }

    // Handle overnight
    if (input.startDatetime && input.endDatetime && input.endDatetime <= input.startDatetime) {
      const endMs = new Date(input.endDatetime).getTime() + 24 * 60 * 60 * 1000
      input.endDatetime = new Date(endMs).toISOString()
    }

    return base.update(id, input)
  },
}))

// Extended TimeEntries API with date-based queries
export const timeentriesApi = extendApiService(baseTimeEntriesApi, (base) => ({
  /**
   * List time entries by local date.
   * Converts the local date to UTC datetime range for querying.
   */
  async listByLocalDate(localDate: string, timezone: string): Promise<TimeEntry[]> {
    const { startUtc, endUtc } = localDateToUtcRange(localDate, timezone)
    const response = await httpClient.get<TimeEntryResponse[]>(
      API_CONFIG.baseUrls.timeblock,
      `/time-entries?start_datetime=${encodeURIComponent(startUtc)}&end_datetime=${encodeURIComponent(endUtc)}`
    )
    return response.map(transformTimeEntry)
  },

  async listByDateRange(startDate: string, endDate: string, timezone: string): Promise<TimeEntry[]> {
    const { startUtc } = localDateToUtcRange(startDate, timezone)
    const { endUtc } = localDateToUtcRange(endDate, timezone)
    const response = await httpClient.get<TimeEntryResponse[]>(
      API_CONFIG.baseUrls.timeblock,
      `/time-entries?start_datetime=${encodeURIComponent(startUtc)}&end_datetime=${encodeURIComponent(endUtc)}`
    )
    return response.map(transformTimeEntry)
  },

  /**
   * Create a time entry from local date/time.
   */
  async createFromLocal(
    localDate: string,
    localStartTime: string,
    localEndTime: string,
    data: Omit<CreateTimeEntryInput, 'startDatetime' | 'endDatetime'>,
    timezone: string
  ): Promise<TimeEntry> {
    let startDatetime = localToUtcDatetime(localDate, localStartTime, timezone)
    let endDatetime = localToUtcDatetime(localDate, localEndTime, timezone)

    // Handle overnight entries
    if (endDatetime <= startDatetime) {
      const endMs = new Date(endDatetime).getTime() + 24 * 60 * 60 * 1000
      endDatetime = new Date(endMs).toISOString()
    }

    return base.create({
      ...data,
      startDatetime,
      endDatetime,
    })
  },

  /**
   * Update a time entry from local date/time.
   */
  async updateFromLocal(
    id: string,
    localDate: string | undefined,
    localStartTime: string | undefined,
    localEndTime: string | undefined,
    data: Omit<UpdateTimeEntryInput, 'startDatetime' | 'endDatetime'>,
    timezone: string
  ): Promise<TimeEntry> {
    const input: UpdateTimeEntryInput = { ...data }

    if (localDate && localStartTime) {
      input.startDatetime = localToUtcDatetime(localDate, localStartTime, timezone)
    }
    if (localDate && localEndTime) {
      input.endDatetime = localToUtcDatetime(localDate, localEndTime, timezone)
    }

    // Handle overnight
    if (input.startDatetime && input.endDatetime && input.endDatetime <= input.startDatetime) {
      const endMs = new Date(input.endDatetime).getTime() + 24 * 60 * 60 * 1000
      input.endDatetime = new Date(endMs).toISOString()
    }

    return base.update(id, input)
  },
}))
