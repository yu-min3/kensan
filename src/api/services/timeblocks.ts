// Timeblocks API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
import type { TimeBlock, TimeEntry, GoalTag } from '@/types'

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
  async listByDate(date: string): Promise<TimeEntry[]> {
    const response = await httpClient.get<TimeEntryResponse[]>(
      API_CONFIG.baseUrls.sync,
      `/timeentries?date=${date}`
    )
    return response.map(transformTimeEntry)
  },

  async listByDateRange(startDate: string, endDate: string): Promise<TimeEntry[]> {
    const response = await httpClient.get<TimeEntryResponse[]>(
      API_CONFIG.baseUrls.sync,
      `/timeentries?start_date=${startDate}&end_date=${endDate}`
    )
    return response.map(transformTimeEntry)
  },

  async create(data: Omit<TimeEntry, 'id'>): Promise<TimeEntry> {
    const response = await httpClient.post<TimeEntryResponse>(
      API_CONFIG.baseUrls.sync,
      '/timeentries',
      data
    )
    return transformTimeEntry(response)
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(API_CONFIG.baseUrls.sync, `/timeentries/${id}`)
  },
}
