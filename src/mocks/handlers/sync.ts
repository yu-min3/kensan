// Sync MSW handlers (TimeEntries from Clockify)
import { http, HttpResponse } from 'msw'
import { timeEntries, generateId, userSettings } from '../data'
import type { TimeEntry } from '@/types'

const BASE_URL = 'http://localhost:8083/api/v1'

// Transform to API response format
const toTimeEntryResponse = (te: TimeEntry) => ({
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

// Mock Clockify data
const mockClockifyUser = {
  id: 'clockify-user-123',
  email: 'demo@kensan.app',
  name: 'Demo User',
  activeWorkspace: 'ws-personal',
}

const mockWorkspaces = [
  { id: 'ws-personal', name: 'Personal Workspace' },
  { id: 'ws-work', name: 'Work Projects' },
]

export const syncHandlers = [
  // POST /sync/clockify/workspaces - Validate API key and get workspaces
  http.post(`${BASE_URL}/sync/clockify/workspaces`, async ({ request }) => {
    const body = await request.json() as { apiKey: string }

    if (!body.apiKey) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'APIキーは必須です' } },
        { status: 400 }
      )
    }

    // Mock: any non-empty API key is valid
    // In real mode, this would validate against Clockify API
    userSettings.clockifyApiKey = body.apiKey

    return HttpResponse.json({
      data: {
        user: mockClockifyUser,
        workspaces: mockWorkspaces,
      },
    })
  }),

  // POST /sync/trigger - Trigger full sync
  http.post(`${BASE_URL}/sync/trigger`, () => {
    // Mock: Check if API key is set
    if (!userSettings.clockifyApiKey) {
      return HttpResponse.json(
        { error: { code: 'API_KEY_REQUIRED', message: 'Clockify APIキーが設定されていません' } },
        { status: 400 }
      )
    }
    if (!userSettings.workspaceId) {
      return HttpResponse.json(
        { error: { code: 'WORKSPACE_REQUIRED', message: 'ワークスペースが設定されていません' } },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      data: {
        projectsSynced: 3,
        entriesSynced: 15,
      },
    })
  }),

  // GET /timeentries
  http.get(`${BASE_URL}/timeentries`, ({ request }) => {
    const url = new URL(request.url)
    const date = url.searchParams.get('date')
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')

    let result = [...timeEntries]

    if (date) {
      result = result.filter(te => te.date === date)
    } else if (startDate && endDate) {
      result = result.filter(te => te.date >= startDate && te.date <= endDate)
    }

    return HttpResponse.json(result.map(toTimeEntryResponse))
  }),

  // POST /timeentries
  http.post(`${BASE_URL}/timeentries`, async ({ request }) => {
    const body = await request.json() as Omit<TimeEntry, 'id'>
    const newTimeEntry: TimeEntry = {
      id: generateId('te'),
      ...body,
    }
    timeEntries.push(newTimeEntry)
    return HttpResponse.json(toTimeEntryResponse(newTimeEntry), { status: 201 })
  }),

  // DELETE /timeentries/:id
  http.delete(`${BASE_URL}/timeentries/:id`, ({ params }) => {
    const index = timeEntries.findIndex(te => te.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'TimeEntry not found' },
        { status: 404 }
      )
    }
    timeEntries.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
