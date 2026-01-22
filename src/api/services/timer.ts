import { API_CONFIG } from '../config'
import { httpClient } from '../client'

export interface RunningTimer {
  id: string
  taskName: string
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  description?: string
  startedAt: string // ISO timestamp
}

export interface StartTimerInput {
  taskName: string
  milestoneId?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  description?: string
}

export const timerApi = {
  async getCurrent(): Promise<RunningTimer | null> {
    return httpClient.get<RunningTimer | null>(
      API_CONFIG.baseUrls.timeblock,
      '/timer/current'
    )
  },

  async start(input: StartTimerInput): Promise<RunningTimer> {
    return httpClient.post<RunningTimer>(
      API_CONFIG.baseUrls.timeblock,
      '/timer/start',
      input
    )
  },

  async stop(): Promise<void> {
    return httpClient.post<void>(
      API_CONFIG.baseUrls.timeblock,
      '/timer/stop'
    )
  },
}
