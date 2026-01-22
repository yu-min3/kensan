// Analytics MSW handlers
import { http, HttpResponse } from 'msw'
import { weeklySummary, dailyStudyHours, goals } from '../data'

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
      byGoal: weeklySummary.byGoal,
      byTag: weeklySummary.byTag,
      byMilestone: weeklySummary.byMilestone,
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
        byGoal: goals.map(g => ({
          id: g.id,
          name: g.name,
          color: g.color,
          minutes: Math.floor(d.hours * 60 * Math.random()),
        })),
        completedTasks: Math.floor(d.hours),
      })),
    })
  }),

  // GET /analytics/goal-progress
  http.get(`${BASE_URL}/analytics/goal-progress`, ({ request }) => {
    const url = new URL(request.url)
    const goalId = url.searchParams.get('goal_id')

    const items = goals.map(g => ({
      goalId: g.id,
      goalName: g.name,
      goalColor: g.color,
      targetMinutes: 1200,
      actualMinutes: Math.floor(Math.random() * 1000) + 200,
      progressPercent: Math.floor(Math.random() * 40) + 60,
      trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
    }))

    return HttpResponse.json({
      items: goalId ? items.filter(i => i.goalId === goalId) : items,
      overallProgress: 75,
    })
  }),
]
