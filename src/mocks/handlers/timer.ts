// Timer MSW handlers
import { http, HttpResponse } from 'msw'
import { generateId, goals, milestones } from '../data'

const BASE_URL = 'http://localhost:8084/api/v1'

interface RunningTimer {
  id: string
  taskName: string
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
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
      milestoneId?: string
      goalId?: string
      goalName?: string
      goalColor?: string
      description?: string
    }

    // Stop any existing timer (implicitly)
    currentTimer = null

    // Find milestone and goal info if milestoneId is provided
    let milestoneName: string | undefined
    let goalId = body.goalId
    let goalName = body.goalName
    let goalColor = body.goalColor

    if (body.milestoneId) {
      const milestone = milestones.find(m => m.id === body.milestoneId)
      if (milestone) {
        milestoneName = milestone.name
        const goal = goals.find(g => g.id === milestone.goalId)
        if (goal) {
          goalId = goal.id
          goalName = goal.name
          goalColor = goal.color
        }
      }
    }

    // Create new timer
    currentTimer = {
      id: generateId('timer'),
      taskName: body.taskName,
      milestoneId: body.milestoneId,
      milestoneName,
      goalId,
      goalName,
      goalColor,
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
