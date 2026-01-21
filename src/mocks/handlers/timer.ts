// Timer MSW handlers
import { http, HttpResponse } from 'msw'
import { generateId, projects } from '../data'
import type { GoalTag } from '@/types'

const BASE_URL = 'http://localhost:8084/api/v1'

interface RunningTimer {
  id: string
  taskName: string
  projectId?: string
  projectName?: string
  goalTag?: GoalTag
  description?: string
  startedAt: string
}

// In-memory timer state (only one timer can run at a time)
let currentTimer: RunningTimer | null = null

export const timerHandlers = [
  // GET /timer/current - Get the current running timer
  http.get(`${BASE_URL}/timer/current`, () => {
    return HttpResponse.json(currentTimer)
  }),

  // POST /timer/start - Start a new timer
  http.post(`${BASE_URL}/timer/start`, async ({ request }) => {
    const body = await request.json() as {
      taskName: string
      projectId?: string
      goalTag?: GoalTag
      description?: string
    }

    // Stop any existing timer (implicitly)
    currentTimer = null

    // Find project name if projectId is provided
    let projectName: string | undefined
    if (body.projectId) {
      const project = projects.find(p => p.id === body.projectId)
      projectName = project?.name
    }

    // Create new timer
    currentTimer = {
      id: generateId('timer'),
      taskName: body.taskName,
      projectId: body.projectId,
      projectName,
      goalTag: body.goalTag,
      description: body.description,
      startedAt: new Date().toISOString(),
    }

    return HttpResponse.json(currentTimer, { status: 201 })
  }),

  // POST /timer/stop - Stop the current timer
  http.post(`${BASE_URL}/timer/stop`, () => {
    if (!currentTimer) {
      return HttpResponse.json(
        { error: { code: 'NO_RUNNING_TIMER', message: 'No timer is currently running' } },
        { status: 400 }
      )
    }

    // In a real implementation, this would create a time entry
    // For now, we just stop the timer
    currentTimer = null

    return new HttpResponse(null, { status: 204 })
  }),
]
