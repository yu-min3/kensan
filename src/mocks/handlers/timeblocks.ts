// Timeblocks & TimeEntries MSW handlers
import { http, HttpResponse } from 'msw'
import { timeBlocks, timeEntries } from '../data'
import { createMockCrudHandlers } from '../createMockCrudHandlers'
import type { TimeBlock, TimeEntry } from '@/types'

const BASE_URL = 'http://localhost:8084/api/v1'

// Transform to API response format
const toTimeBlockResponse = (tb: TimeBlock) => ({
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
  isRoutine: tb.isRoutine,
  routineTaskId: tb.routineTaskId,
})

const toTimeEntryResponse = (te: TimeEntry) => ({
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

// Base CRUD handlers for TimeBlocks
const timeBlockCrudHandlers = createMockCrudHandlers(
  {
    baseUrl: BASE_URL,
    resourcePath: '/timeblocks',
    transform: toTimeBlockResponse,
    data: timeBlocks,
    getId: (tb) => tb.id,
    idPrefix: 'tb',
    resourceName: 'TimeBlock',
  },
  {
    filters: [
      { paramName: 'date', fieldName: 'date', type: 'equals' },
    ],
  }
)

// Base CRUD handlers for TimeEntries
const timeEntryCrudHandlers = createMockCrudHandlers(
  {
    baseUrl: BASE_URL,
    resourcePath: '/time-entries',
    transform: toTimeEntryResponse,
    data: timeEntries,
    getId: (te) => te.id,
    idPrefix: 'te',
    resourceName: 'TimeEntry',
  },
  {
    filters: [
      { paramName: 'date', fieldName: 'date', type: 'equals' },
    ],
  }
)

// Custom handlers for timestamp/date range filtering
const customTimeBlockHandlers = [
  // GET /timeblocks - Override to handle timestamp and date range filters
  http.get(`${BASE_URL}/timeblocks`, ({ request }) => {
    const url = new URL(request.url)
    const date = url.searchParams.get('date')
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')
    const startTimestamp = url.searchParams.get('start_timestamp')
    const endTimestamp = url.searchParams.get('end_timestamp')

    let result = [...timeBlocks]

    if (date) {
      // Simple date filter
      result = result.filter(tb => tb.date === date)
    } else if (startTimestamp && endTimestamp) {
      // UTC timestamp range filter - extract date portion for mock comparison
      // In real backend, this would do proper timestamp comparison
      const startDateFromTimestamp = startTimestamp.substring(0, 10)
      const endDateFromTimestamp = endTimestamp.substring(0, 10)
      result = result.filter(tb => tb.date >= startDateFromTimestamp && tb.date <= endDateFromTimestamp)
    } else if (startDate && endDate) {
      // Date range filter
      result = result.filter(tb => tb.date >= startDate && tb.date <= endDate)
    }

    return HttpResponse.json(result.map(toTimeBlockResponse))
  }),
]

const customTimeEntryHandlers = [
  // GET /time-entries - Override to handle timestamp and date range filters
  http.get(`${BASE_URL}/time-entries`, ({ request }) => {
    const url = new URL(request.url)
    const date = url.searchParams.get('date')
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')
    const startTimestamp = url.searchParams.get('start_timestamp')
    const endTimestamp = url.searchParams.get('end_timestamp')

    let result = [...timeEntries]

    if (date) {
      // Simple date filter
      result = result.filter(te => te.date === date)
    } else if (startTimestamp && endTimestamp) {
      // UTC timestamp range filter - extract date portion for mock comparison
      const startDateFromTimestamp = startTimestamp.substring(0, 10)
      const endDateFromTimestamp = endTimestamp.substring(0, 10)
      result = result.filter(te => te.date >= startDateFromTimestamp && te.date <= endDateFromTimestamp)
    } else if (startDate && endDate) {
      // Date range filter
      result = result.filter(te => te.date >= startDate && te.date <= endDate)
    }

    return HttpResponse.json(result.map(toTimeEntryResponse))
  }),
]

// Export: custom handlers first (override CRUD list), then CRUD handlers (excluding list)
export const timeblockHandlers = [
  ...customTimeBlockHandlers,
  ...timeBlockCrudHandlers.slice(1), // Skip generated list handler
  ...customTimeEntryHandlers,
  ...timeEntryCrudHandlers.slice(1), // Skip generated list handler
]
