// Timeblocks MSW handlers
import { http, HttpResponse } from 'msw'
import { timeBlocks, generateId } from '../data'
import type { TimeBlock } from '@/types'

const BASE_URL = 'http://localhost:8084/api/v1'

// Transform to API response format
const toTimeBlockResponse = (tb: TimeBlock) => ({
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

export const timeblockHandlers = [
  // GET /timeblocks
  http.get(`${BASE_URL}/timeblocks`, ({ request }) => {
    const url = new URL(request.url)
    const date = url.searchParams.get('date')
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')

    let result = [...timeBlocks]

    if (date) {
      result = result.filter(tb => tb.date === date)
    } else if (startDate && endDate) {
      result = result.filter(tb => tb.date >= startDate && tb.date <= endDate)
    }

    return HttpResponse.json(result.map(toTimeBlockResponse))
  }),

  // POST /timeblocks
  http.post(`${BASE_URL}/timeblocks`, async ({ request }) => {
    const body = await request.json() as Omit<TimeBlock, 'id'>
    const newTimeBlock: TimeBlock = {
      id: generateId('tb'),
      ...body,
    }
    timeBlocks.push(newTimeBlock)
    return HttpResponse.json(toTimeBlockResponse(newTimeBlock), { status: 201 })
  }),

  // PUT /timeblocks/:id
  http.put(`${BASE_URL}/timeblocks/:id`, async ({ params, request }) => {
    const index = timeBlocks.findIndex(tb => tb.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'TimeBlock not found' },
        { status: 404 }
      )
    }
    const body = await request.json() as Partial<TimeBlock>
    timeBlocks[index] = { ...timeBlocks[index], ...body }
    return HttpResponse.json(toTimeBlockResponse(timeBlocks[index]))
  }),

  // DELETE /timeblocks/:id
  http.delete(`${BASE_URL}/timeblocks/:id`, ({ params }) => {
    const index = timeBlocks.findIndex(tb => tb.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'TimeBlock not found' },
        { status: 404 }
      )
    }
    timeBlocks.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
