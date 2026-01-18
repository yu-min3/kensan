// Sync MSW handlers (TimeEntries from Clockify)
import { http, HttpResponse } from 'msw'
import { timeEntries, generateId } from '../data'
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

export const syncHandlers = [
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
