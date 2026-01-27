// Timeblocks API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
import { createApiService, extendApiService } from '../createApiService'
import type { TimeBlock, TimeEntry } from '@/types'
import { localDateToUtcRange, localToUtcDateTime, utcToLocalDateTime } from '@/lib/timezone'

// API Response types
interface TimeBlockResponse {
  id: string
  date: string
  startTime: string
  endTime: string
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
  date: string
  startTime: string
  endTime: string
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

// Transform functions
const transformTimeBlock = (tb: TimeBlockResponse): TimeBlock => ({
  id: tb.id,
  date: tb.date,
  startTime: tb.startTime,
  endTime: tb.endTime,
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
  date: te.date,
  startTime: te.startTime,
  endTime: te.endTime,
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

// Input types
export interface CreateTimeBlockInput {
  date: string
  startTime: string
  endTime: string
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
  date?: string
  startTime?: string
  endTime?: string
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
  date: string
  startTime: string
  endTime: string
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
  date?: string
  startTime?: string
  endTime?: string
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

// Extended TimeBlocks API with date-based queries and timezone-aware write operations
export const timeblocksApi = extendApiService(baseTimeBlocksApi, (base) => ({
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

  /**
   * Create a time block with timezone-aware UTC conversion.
   * Converts local date/time to UTC before sending to the backend.
   * Converts response back to local time for UI consistency.
   *
   * @param input - Time block data in user's local timezone
   * @param timezone - User's timezone (e.g., 'Asia/Tokyo')
   */
  async createWithTimezone(input: CreateTimeBlockInput, timezone: string): Promise<TimeBlock> {
    const { date: utcDate, time: utcStartTime } = localToUtcDateTime(input.date, input.startTime, timezone)
    const { time: utcEndTime } = localToUtcDateTime(input.date, input.endTime, timezone)

    const utcInput: CreateTimeBlockInput = {
      ...input,
      date: utcDate,
      startTime: utcStartTime,
      endTime: utcEndTime,
    }

    const result = await base.create(utcInput)

    // Convert response back to local time
    const { date: localDate, time: localStartTime } = utcToLocalDateTime(result.date, result.startTime, timezone)
    const { time: localEndTime } = utcToLocalDateTime(result.date, result.endTime, timezone)

    return {
      ...result,
      date: localDate,
      startTime: localStartTime,
      endTime: localEndTime,
    }
  },

  /**
   * Update a time block with timezone-aware UTC conversion.
   * Converts local date/time to UTC before sending to the backend.
   * Converts response back to local time for UI consistency.
   *
   * @param id - Time block ID
   * @param input - Partial time block data in user's local timezone
   * @param timezone - User's timezone (e.g., 'Asia/Tokyo')
   * @param currentDate - Current date of the time block (needed for time-only updates)
   */
  async updateWithTimezone(
    id: string,
    input: UpdateTimeBlockInput,
    timezone: string,
    currentDate: string
  ): Promise<TimeBlock> {
    const utcInput: UpdateTimeBlockInput = { ...input }

    // Convert date/time fields if present
    if (input.date && input.startTime && input.endTime) {
      const { date: utcDate, time: utcStartTime } = localToUtcDateTime(input.date, input.startTime, timezone)
      const { time: utcEndTime } = localToUtcDateTime(input.date, input.endTime, timezone)
      utcInput.date = utcDate
      utcInput.startTime = utcStartTime
      utcInput.endTime = utcEndTime
    } else if (input.startTime || input.endTime) {
      // For partial updates (time only), use current date for conversion
      const dateToUse = input.date || currentDate
      if (input.startTime) {
        const { date: utcDate, time: utcStartTime } = localToUtcDateTime(dateToUse, input.startTime, timezone)
        utcInput.date = utcDate
        utcInput.startTime = utcStartTime
      }
      if (input.endTime) {
        const { time: utcEndTime } = localToUtcDateTime(dateToUse, input.endTime, timezone)
        utcInput.endTime = utcEndTime
      }
    }

    const result = await base.update(id, utcInput)

    // Convert response back to local time
    const { date: localDate, time: localStartTime } = utcToLocalDateTime(result.date, result.startTime, timezone)
    const { time: localEndTime } = utcToLocalDateTime(result.date, result.endTime, timezone)

    return {
      ...result,
      date: localDate,
      startTime: localStartTime,
      endTime: localEndTime,
    }
  },
}))

// Extended TimeEntries API with date-based queries and timezone-aware write operations
export const timeentriesApi = extendApiService(baseTimeEntriesApi, (base) => ({
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

  /**
   * Create a time entry with timezone-aware UTC conversion.
   * Converts local date/time to UTC before sending to the backend.
   * Converts response back to local time for UI consistency.
   *
   * @param input - Time entry data in user's local timezone
   * @param timezone - User's timezone (e.g., 'Asia/Tokyo')
   */
  async createWithTimezone(input: CreateTimeEntryInput, timezone: string): Promise<TimeEntry> {
    const { date: utcDate, time: utcStartTime } = localToUtcDateTime(input.date, input.startTime, timezone)
    const { time: utcEndTime } = localToUtcDateTime(input.date, input.endTime, timezone)

    const utcInput: CreateTimeEntryInput = {
      ...input,
      date: utcDate,
      startTime: utcStartTime,
      endTime: utcEndTime,
    }

    const result = await base.create(utcInput)

    // Convert response back to local time
    const { date: localDate, time: localStartTime } = utcToLocalDateTime(result.date, result.startTime, timezone)
    const { time: localEndTime } = utcToLocalDateTime(result.date, result.endTime, timezone)

    return {
      ...result,
      date: localDate,
      startTime: localStartTime,
      endTime: localEndTime,
    }
  },

  /**
   * Update a time entry with timezone-aware UTC conversion.
   * Converts local date/time to UTC before sending to the backend.
   * Converts response back to local time for UI consistency.
   *
   * @param id - Time entry ID
   * @param input - Partial time entry data in user's local timezone
   * @param timezone - User's timezone (e.g., 'Asia/Tokyo')
   * @param currentDate - Current date of the time entry (needed for time-only updates)
   */
  async updateWithTimezone(
    id: string,
    input: UpdateTimeEntryInput,
    timezone: string,
    currentDate: string
  ): Promise<TimeEntry> {
    const utcInput: UpdateTimeEntryInput = { ...input }

    // Convert date/time fields if present
    if (input.date && input.startTime && input.endTime) {
      const { date: utcDate, time: utcStartTime } = localToUtcDateTime(input.date, input.startTime, timezone)
      const { time: utcEndTime } = localToUtcDateTime(input.date, input.endTime, timezone)
      utcInput.date = utcDate
      utcInput.startTime = utcStartTime
      utcInput.endTime = utcEndTime
    } else if (input.startTime || input.endTime) {
      // For partial updates (time only), use current date for conversion
      const dateToUse = input.date || currentDate
      if (input.startTime) {
        const { date: utcDate, time: utcStartTime } = localToUtcDateTime(dateToUse, input.startTime, timezone)
        utcInput.date = utcDate
        utcInput.startTime = utcStartTime
      }
      if (input.endTime) {
        const { time: utcEndTime } = localToUtcDateTime(dateToUse, input.endTime, timezone)
        utcInput.endTime = utcEndTime
      }
    }

    const result = await base.update(id, utcInput)

    // Convert response back to local time
    const { date: localDate, time: localStartTime } = utcToLocalDateTime(result.date, result.startTime, timezone)
    const { time: localEndTime } = utcToLocalDateTime(result.date, result.endTime, timezone)

    return {
      ...result,
      date: localDate,
      startTime: localStartTime,
      endTime: localEndTime,
    }
  },
}))
