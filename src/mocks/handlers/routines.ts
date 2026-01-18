// Routine Tasks MSW handlers
import { http, HttpResponse } from 'msw'
import { routineTasks, generateId } from '../data'
import type { RoutineTask, RoutineFrequency } from '@/types'

const BASE_URL = 'http://localhost:8085/api/v1'

// Transform to API response format
const toRoutineResponse = (r: RoutineTask) => ({
  id: r.id,
  userId: 'user-1',
  name: r.name,
  frequency: r.frequency,
  daysOfWeek: r.daysOfWeek,
  estimatedMinutes: r.estimatedMinutes,
  enabled: r.enabled,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

export const routineHandlers = [
  // GET /routines
  http.get(`${BASE_URL}/routines`, ({ request }) => {
    const url = new URL(request.url)
    const enabled = url.searchParams.get('enabled')

    let result = [...routineTasks]
    if (enabled !== null) {
      result = result.filter(r => r.enabled === (enabled === 'true'))
    }

    return HttpResponse.json(result.map(toRoutineResponse))
  }),

  // POST /routines
  http.post(`${BASE_URL}/routines`, async ({ request }) => {
    const body = await request.json() as {
      name: string
      frequency: RoutineFrequency
      daysOfWeek?: number[]
      estimatedMinutes: number
      enabled?: boolean
    }
    const newRoutine: RoutineTask = {
      id: generateId('r'),
      name: body.name,
      frequency: body.frequency,
      daysOfWeek: body.daysOfWeek,
      estimatedMinutes: body.estimatedMinutes,
      enabled: body.enabled ?? true,
    }
    routineTasks.push(newRoutine)
    return HttpResponse.json(toRoutineResponse(newRoutine), { status: 201 })
  }),

  // PUT /routines/:id
  http.put(`${BASE_URL}/routines/:id`, async ({ params, request }) => {
    const index = routineTasks.findIndex(r => r.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Routine task not found' },
        { status: 404 }
      )
    }
    const body = await request.json() as Partial<RoutineTask>
    routineTasks[index] = { ...routineTasks[index], ...body }
    return HttpResponse.json(toRoutineResponse(routineTasks[index]))
  }),

  // PATCH /routines/:id/toggle
  http.patch(`${BASE_URL}/routines/:id/toggle`, ({ params }) => {
    const index = routineTasks.findIndex(r => r.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Routine task not found' },
        { status: 404 }
      )
    }
    routineTasks[index].enabled = !routineTasks[index].enabled
    return HttpResponse.json(toRoutineResponse(routineTasks[index]))
  }),

  // DELETE /routines/:id
  http.delete(`${BASE_URL}/routines/:id`, ({ params }) => {
    const index = routineTasks.findIndex(r => r.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Routine task not found' },
        { status: 404 }
      )
    }
    routineTasks.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
