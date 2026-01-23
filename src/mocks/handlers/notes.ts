// Notes MSW handlers (unified diary, learning, memo)
import { http, HttpResponse } from 'msw'
import { notes, generateId } from '../data'
import type { Note, NoteType } from '@/types'

const BASE_URL = 'http://localhost:8091/api/v1'

// Transform to API response format (with content)
const toNoteResponse = (n: Note) => ({
  id: n.id,
  userId: n.userId,
  type: n.type,
  title: n.title,
  content: n.content,
  format: n.format,
  date: n.date,
  taskId: n.taskId,
  milestoneId: n.milestoneId,
  milestoneName: n.milestoneName,
  goalId: n.goalId,
  goalName: n.goalName,
  goalColor: n.goalColor,
  tagIds: n.tagIds,
  relatedTimeEntryIds: n.relatedTimeEntryIds,
  fileUrl: n.fileUrl,
  archived: n.archived,
  createdAt: n.createdAt.toISOString(),
  updatedAt: n.updatedAt.toISOString(),
})

// Transform to list item response (without content)
const toNoteListItemResponse = (n: Note) => ({
  id: n.id,
  userId: n.userId,
  type: n.type,
  title: n.title,
  format: n.format,
  date: n.date,
  taskId: n.taskId,
  milestoneId: n.milestoneId,
  milestoneName: n.milestoneName,
  goalId: n.goalId,
  goalName: n.goalName,
  goalColor: n.goalColor,
  tagIds: n.tagIds,
  relatedTimeEntryIds: n.relatedTimeEntryIds,
  fileUrl: n.fileUrl,
  archived: n.archived,
  createdAt: n.createdAt.toISOString(),
  updatedAt: n.updatedAt.toISOString(),
})

// Transform to search result response
const toSearchResultResponse = (n: Note, score: number) => ({
  note: toNoteListItemResponse(n),
  score,
})

export const noteHandlers = [
  // GET /notes - List notes (returns items without content)
  http.get(`${BASE_URL}/notes`, ({ request }) => {
    const url = new URL(request.url)
    let result = [...notes]

    // Filter by types (comma-separated)
    const typesParam = url.searchParams.get('types')
    if (typesParam) {
      const types = typesParam.split(',') as NoteType[]
      result = result.filter((n) => types.includes(n.type))
    }

    // Filter by goal_id
    const goalId = url.searchParams.get('goal_id')
    if (goalId) {
      result = result.filter((n) => n.goalId === goalId)
    }

    // Filter by milestone_id
    const milestoneId = url.searchParams.get('milestone_id')
    if (milestoneId) {
      result = result.filter((n) => n.milestoneId === milestoneId)
    }

    // Filter by task_id
    const taskId = url.searchParams.get('task_id')
    if (taskId) {
      result = result.filter((n) => n.taskId === taskId)
    }

    // Filter by format
    const format = url.searchParams.get('format')
    if (format) {
      result = result.filter((n) => n.format === format)
    }

    // Filter by archived
    const archived = url.searchParams.get('archived')
    if (archived !== null) {
      result = result.filter((n) => n.archived === (archived === 'true'))
    }

    // Filter by date_from
    const dateFrom = url.searchParams.get('date_from')
    if (dateFrom) {
      result = result.filter((n) => n.date && n.date >= dateFrom)
    }

    // Filter by date_to
    const dateTo = url.searchParams.get('date_to')
    if (dateTo) {
      result = result.filter((n) => n.date && n.date <= dateTo)
    }

    // Filter by tag_ids (comma-separated, AND condition)
    const tagIds = url.searchParams.get('tag_ids')
    if (tagIds) {
      const filterTagIds = tagIds.split(',')
      result = result.filter((n) =>
        filterTagIds.every((tagId) => n.tagIds?.includes(tagId))
      )
    }

    // Search query
    const q = url.searchParams.get('q')
    if (q) {
      const query = q.toLowerCase()
      result = result.filter(
        (n) =>
          n.title?.toLowerCase().includes(query) ||
          n.content.toLowerCase().includes(query)
      )
    }

    // Sort by createdAt desc
    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return HttpResponse.json(result.map(toNoteListItemResponse))
  }),

  // GET /notes/search - Search notes
  http.get(`${BASE_URL}/notes/search`, ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')

    if (!q) {
      return HttpResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Query is required' },
        { status: 400 }
      )
    }

    const query = q.toLowerCase()
    let result = [...notes]

    // Filter by types
    const typesParam = url.searchParams.get('types')
    if (typesParam) {
      const types = typesParam.split(',') as NoteType[]
      result = result.filter((n) => types.includes(n.type))
    }

    // Filter by archived
    const archived = url.searchParams.get('archived')
    if (archived !== null) {
      result = result.filter((n) => n.archived === (archived === 'true'))
    }

    // Search and score
    const searchResults = result
      .map((n) => {
        let score = 0
        if (n.title?.toLowerCase().includes(query)) {
          score = 1.0
        } else if (n.content.toLowerCase().includes(query)) {
          score = 0.5
        }
        return { note: n, score }
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || b.note.createdAt.getTime() - a.note.createdAt.getTime())

    // Apply limit
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    const limited = searchResults.slice(0, limit)

    return HttpResponse.json(limited.map((r) => toSearchResultResponse(r.note, r.score)))
  }),

  // GET /notes/:id - Get note by ID
  http.get(`${BASE_URL}/notes/:id`, ({ params }) => {
    const note = notes.find((n) => n.id === params.id)
    if (!note) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Note not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(toNoteResponse(note))
  }),

  // POST /notes - Create note
  http.post(`${BASE_URL}/notes`, async ({ request }) => {
    const body = (await request.json()) as Partial<Note>
    const now = new Date()

    const newNote: Note = {
      id: generateId('note'),
      userId: 'user-1',
      type: body.type || 'memo',
      title: body.title,
      content: body.content || '',
      format: body.format || 'markdown',
      date: body.date,
      taskId: body.taskId,
      milestoneId: body.milestoneId,
      milestoneName: body.milestoneName,
      goalId: body.goalId,
      goalName: body.goalName,
      goalColor: body.goalColor,
      tagIds: body.tagIds,
      relatedTimeEntryIds: body.relatedTimeEntryIds,
      fileUrl: body.fileUrl,
      archived: false,
      createdAt: now,
      updatedAt: now,
    }

    notes.unshift(newNote)
    return HttpResponse.json(toNoteResponse(newNote), { status: 201 })
  }),

  // PUT /notes/:id - Update note
  http.put(`${BASE_URL}/notes/:id`, async ({ params, request }) => {
    const index = notes.findIndex((n) => n.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Note not found' },
        { status: 404 }
      )
    }

    const body = (await request.json()) as Partial<Note>
    notes[index] = {
      ...notes[index],
      ...body,
      updatedAt: new Date(),
    }

    return HttpResponse.json(toNoteResponse(notes[index]))
  }),

  // DELETE /notes/:id - Delete note
  http.delete(`${BASE_URL}/notes/:id`, ({ params }) => {
    const index = notes.findIndex((n) => n.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Note not found' },
        { status: 404 }
      )
    }

    notes.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // POST /notes/:id/archive - Archive/unarchive note
  http.post(`${BASE_URL}/notes/:id/archive`, async ({ params, request }) => {
    const index = notes.findIndex((n) => n.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Note not found' },
        { status: 404 }
      )
    }

    const body = (await request.json()) as { archived: boolean }
    notes[index] = {
      ...notes[index],
      archived: body.archived,
      updatedAt: new Date(),
    }

    return HttpResponse.json(toNoteResponse(notes[index]))
  }),
]
