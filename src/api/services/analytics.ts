// Analytics API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
import type { WeeklySummary, GoalSummary, TagSummary, MilestoneSummary } from '@/types'

// API Response types
interface WeeklySummaryResponse {
  weekStart: string
  weekEnd: string
  totalMinutes: number
  byGoal: GoalSummary[]
  byTag: TagSummary[]
  byMilestone: MilestoneSummary[]
  completedTasks: number
  plannedVsActual: {
    planned: number
    actual: number
  }
}

interface MonthlySummaryResponse {
  year: number
  month: number
  totalMinutes: number
  byGoal: GoalSummary[]
  byTag: TagSummary[]
  byMilestone: MilestoneSummary[]
  completedTasks: number
  weeklyBreakdown: WeeklySummaryResponse[]
}

interface TrendDataPoint {
  period: string
  totalMinutes: number
  byGoal: GoalSummary[]
  completedTasks: number
}

interface TrendsResponse {
  period: 'week' | 'month' | 'quarter'
  data: TrendDataPoint[]
}

interface GoalProgressItem {
  goalId: string
  goalName: string
  goalColor: string
  targetMinutes: number
  actualMinutes: number
  progressPercent: number
  trend: 'up' | 'down' | 'stable'
}

interface GoalProgressResponse {
  items: GoalProgressItem[]
  overallProgress: number
}

export interface DailyStudyHour {
  date: string
  hours: number
  byGoal?: GoalSummary[]
}

export const analyticsApi = {
  async getWeeklySummary(weekStart?: string): Promise<WeeklySummary> {
    const params = new URLSearchParams()
    if (weekStart) params.set('week_start', weekStart)

    const query = params.toString()
    const endpoint = `/analytics/summary/weekly${query ? `?${query}` : ''}`

    const response = await httpClient.get<WeeklySummaryResponse>(
      API_CONFIG.baseUrls.analytics,
      endpoint
    )
    return response
  },

  async getMonthlySummary(year?: number, month?: number): Promise<MonthlySummaryResponse> {
    const params = new URLSearchParams()
    if (year) params.set('year', String(year))
    if (month) params.set('month', String(month))

    const query = params.toString()
    const endpoint = `/analytics/summary/monthly${query ? `?${query}` : ''}`

    return httpClient.get<MonthlySummaryResponse>(
      API_CONFIG.baseUrls.analytics,
      endpoint
    )
  },

  async getTrends(period?: 'week' | 'month' | 'quarter', count?: number): Promise<TrendsResponse> {
    const params = new URLSearchParams()
    if (period) params.set('period', period)
    if (count) params.set('count', String(count))

    const query = params.toString()
    const endpoint = `/analytics/trends${query ? `?${query}` : ''}`

    return httpClient.get<TrendsResponse>(
      API_CONFIG.baseUrls.analytics,
      endpoint
    )
  },

  async getGoalProgress(goalId?: string): Promise<GoalProgressResponse> {
    const params = new URLSearchParams()
    if (goalId) params.set('goal_id', goalId)

    const query = params.toString()
    const endpoint = `/analytics/goal-progress${query ? `?${query}` : ''}`

    return httpClient.get<GoalProgressResponse>(
      API_CONFIG.baseUrls.analytics,
      endpoint
    )
  },

  // Helper to get daily study hours from trends
  async getDailyStudyHours(days: number = 7): Promise<DailyStudyHour[]> {
    const trends = await this.getTrends('week', Math.ceil(days / 7))
    // Transform trends data to daily format
    // This is a simplified version - actual implementation would need more detailed API
    return trends.data.map(d => ({
      date: d.period,
      hours: d.totalMinutes / 60,
      byGoal: d.byGoal,
    }))
  },
}
