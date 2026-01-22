// Learning Records MSW handlers
import { http, HttpResponse } from 'msw'
import { learningRecords } from '../data'
import { createMockCrudHandlers } from '../createMockCrudHandlers'
import type { LearningRecord } from '@/types'

const BASE_URL = 'http://localhost:8086/api/v1'

// Transform to API response format
const toRecordResponse = (r: LearningRecord) => ({
  id: r.id,
  userId: 'user-1',
  title: r.title,
  content: r.content,
  format: r.format,
  milestoneId: r.milestoneId,
  milestoneName: r.milestoneName,
  goalId: r.goalId,
  goalName: r.goalName,
  goalColor: r.goalColor,
  tagIds: r.tagIds,
  relatedTimeEntryIds: r.relatedTimeEntryIds,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
})

// Base CRUD handlers
const crudHandlers = createMockCrudHandlers(
  {
    baseUrl: BASE_URL,
    resourcePath: '/records',
    transform: toRecordResponse,
    data: learningRecords,
    getId: (r) => r.id,
    idPrefix: 'lr',
    resourceName: 'Learning record',
    prependOnAdd: true,
  },
  {
    filters: [
      { paramName: 'milestone_id', fieldName: 'milestoneId', type: 'equals' },
      { paramName: 'goal_id', fieldName: 'goalId', type: 'equals' },
      { paramName: 'format', fieldName: 'format', type: 'equals' },
      { paramName: 'q', fieldName: '', type: 'search', searchFields: ['title', 'content'] },
    ],
  }
)

// Custom handlers
const customHandlers = [
  // POST /records/search/semantic
  http.post(`${BASE_URL}/records/search/semantic`, async ({ request }) => {
    const body = await request.json() as { query: string; limit?: number }
    const q = body.query.toLowerCase()
    const limit = body.limit || 10

    // Simple keyword search as mock for semantic search
    const result = learningRecords
      .filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q)
      )
      .slice(0, limit)

    return HttpResponse.json(result.map(toRecordResponse))
  }),
]

export const recordHandlers = [
  ...crudHandlers,
  ...customHandlers,
]
