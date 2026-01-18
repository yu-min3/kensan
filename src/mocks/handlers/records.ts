// Learning Records MSW handlers
import { http, HttpResponse } from 'msw'
import { learningRecords, generateId } from '../data'
import type { LearningRecord, RecordFormat, GoalTag } from '@/types'

const BASE_URL = 'http://localhost:8086/api/v1'

// Transform to API response format
const toRecordResponse = (r: LearningRecord) => ({
  id: r.id,
  userId: 'user-1',
  title: r.title,
  content: r.content,
  format: r.format,
  projectId: r.projectId,
  projectName: r.projectName,
  goalTag: r.goalTag,
  relatedTimeEntryIds: r.relatedTimeEntryIds,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
})

export const recordHandlers = [
  // GET /records
  http.get(`${BASE_URL}/records`, ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('project_id')
    const goalTag = url.searchParams.get('goal_tag') as GoalTag | null
    const format = url.searchParams.get('format') as RecordFormat | null
    const query = url.searchParams.get('q')

    let result = [...learningRecords]
    if (projectId) {
      result = result.filter(r => r.projectId === projectId)
    }
    if (goalTag) {
      result = result.filter(r => r.goalTag === goalTag)
    }
    if (format) {
      result = result.filter(r => r.format === format)
    }
    if (query) {
      const q = query.toLowerCase()
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q)
      )
    }

    return HttpResponse.json(result.map(toRecordResponse))
  }),

  // GET /records/:id
  http.get(`${BASE_URL}/records/:id`, ({ params }) => {
    const record = learningRecords.find(r => r.id === params.id)
    if (!record) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Learning record not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(toRecordResponse(record))
  }),

  // POST /records
  http.post(`${BASE_URL}/records`, async ({ request }) => {
    const body = await request.json() as {
      title: string
      content: string
      format: RecordFormat
      projectId?: string
      goalTag?: GoalTag
      relatedTimeEntryIds?: string[]
    }
    const now = new Date()
    const newRecord: LearningRecord = {
      id: generateId('lr'),
      title: body.title,
      content: body.content,
      format: body.format,
      projectId: body.projectId,
      goalTag: body.goalTag,
      relatedTimeEntryIds: body.relatedTimeEntryIds,
      createdAt: now,
      updatedAt: now,
    }
    learningRecords.unshift(newRecord)
    return HttpResponse.json(toRecordResponse(newRecord), { status: 201 })
  }),

  // PUT /records/:id
  http.put(`${BASE_URL}/records/:id`, async ({ params, request }) => {
    const index = learningRecords.findIndex(r => r.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Learning record not found' },
        { status: 404 }
      )
    }
    const body = await request.json() as Partial<LearningRecord>
    learningRecords[index] = {
      ...learningRecords[index],
      ...body,
      updatedAt: new Date(),
    }
    return HttpResponse.json(toRecordResponse(learningRecords[index]))
  }),

  // DELETE /records/:id
  http.delete(`${BASE_URL}/records/:id`, ({ params }) => {
    const index = learningRecords.findIndex(r => r.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Learning record not found' },
        { status: 404 }
      )
    }
    learningRecords.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

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
