// Analytics MSW handlers
import { http, HttpResponse } from 'msw'
import { weeklySummary, dailyStudyHours } from '../data'
import type { GoalTag } from '@/types'

const BASE_URL = 'http://localhost:8088/api/v1'

export const analyticsHandlers = [
  // GET /analytics/summary/weekly
  http.get(`${BASE_URL}/analytics/summary/weekly`, () => {
    return HttpResponse.json(weeklySummary)
  }),

  // GET /analytics/summary/monthly
  http.get(`${BASE_URL}/analytics/summary/monthly`, ({ request }) => {
    const url = new URL(request.url)
    const year = url.searchParams.get('year')
    const month = url.searchParams.get('month')

    return HttpResponse.json({
      year: year ? parseInt(year) : new Date().getFullYear(),
      month: month ? parseInt(month) : new Date().getMonth() + 1,
      totalMinutes: weeklySummary.totalMinutes * 4,
      byGoalTag: weeklySummary.byGoalTag,
      byProject: weeklySummary.byProject,
      completedTasks: weeklySummary.completedTasks * 4,
      weeklyBreakdown: [weeklySummary],
    })
  }),

  // GET /analytics/trends
  http.get(`${BASE_URL}/analytics/trends`, ({ request }) => {
    const url = new URL(request.url)
    const period = url.searchParams.get('period') || 'week'

    return HttpResponse.json({
      period,
      data: dailyStudyHours.map(d => ({
        period: d.date,
        totalMinutes: d.hours * 60,
        byGoalTag: {
          GK: d.hours * 30,
          OSS: d.hours * 15,
          Output: d.hours * 10,
          Other: d.hours * 5,
        },
        completedTasks: Math.floor(d.hours),
      })),
    })
  }),

  // GET /analytics/goal-progress
  http.get(`${BASE_URL}/analytics/goal-progress`, ({ request }) => {
    const url = new URL(request.url)
    const goalTag = url.searchParams.get('goal_tag') as GoalTag | null

    const items = [
      { goalTag: 'GK' as GoalTag, targetMinutes: 1200, actualMinutes: 960, progressPercent: 80, trend: 'up' as const },
      { goalTag: 'OSS' as GoalTag, targetMinutes: 600, actualMinutes: 480, progressPercent: 80, trend: 'stable' as const },
      { goalTag: 'Output' as GoalTag, targetMinutes: 300, actualMinutes: 180, progressPercent: 60, trend: 'down' as const },
      { goalTag: 'Other' as GoalTag, targetMinutes: 300, actualMinutes: 240, progressPercent: 80, trend: 'stable' as const },
    ]

    return HttpResponse.json({
      items: goalTag ? items.filter(i => i.goalTag === goalTag) : items,
      overallProgress: 75,
    })
  }),
]
