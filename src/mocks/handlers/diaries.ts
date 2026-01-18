// Diary Entries MSW handlers
import { http, HttpResponse } from 'msw'
import { diaryEntries, generateId } from '../data'
import type { DiaryEntry } from '@/types'

const BASE_URL = 'http://localhost:8087/api/v1'

// Transform to API response format
const toDiaryResponse = (d: DiaryEntry) => ({
  id: d.id,
  userId: 'user-1',
  date: d.date,
  title: d.title,
  content: d.content,
  tags: d.tags,
  createdAt: d.createdAt.toISOString(),
  updatedAt: d.updatedAt.toISOString(),
})

export const diaryHandlers = [
  // GET /diaries
  http.get(`${BASE_URL}/diaries`, ({ request }) => {
    const url = new URL(request.url)
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')
    const tag = url.searchParams.get('tag')
    const query = url.searchParams.get('q')

    let result = [...diaryEntries]
    if (startDate) {
      result = result.filter(d => d.date >= startDate)
    }
    if (endDate) {
      result = result.filter(d => d.date <= endDate)
    }
    if (tag) {
      result = result.filter(d => d.tags.includes(tag))
    }
    if (query) {
      const q = query.toLowerCase()
      result = result.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q)
      )
    }

    return HttpResponse.json(result.map(toDiaryResponse))
  }),

  // GET /diaries/:id
  http.get(`${BASE_URL}/diaries/:id`, ({ params }) => {
    const diary = diaryEntries.find(d => d.id === params.id)
    if (!diary) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Diary entry not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(toDiaryResponse(diary))
  }),

  // GET /diaries/by-date/:date
  http.get(`${BASE_URL}/diaries/by-date/:date`, ({ params }) => {
    const diary = diaryEntries.find(d => d.date === params.date)
    if (!diary) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Diary entry not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(toDiaryResponse(diary))
  }),

  // POST /diaries
  http.post(`${BASE_URL}/diaries`, async ({ request }) => {
    const body = await request.json() as {
      date: string
      title: string
      content?: string
      tags?: string[]
    }
    const now = new Date()
    const newDiary: DiaryEntry = {
      id: generateId('d'),
      date: body.date,
      title: body.title,
      content: body.content || '',
      tags: body.tags || [],
      createdAt: now,
      updatedAt: now,
    }
    diaryEntries.unshift(newDiary)
    return HttpResponse.json(toDiaryResponse(newDiary), { status: 201 })
  }),

  // PUT /diaries/:id
  http.put(`${BASE_URL}/diaries/:id`, async ({ params, request }) => {
    const index = diaryEntries.findIndex(d => d.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Diary entry not found' },
        { status: 404 }
      )
    }
    const body = await request.json() as Partial<DiaryEntry>
    diaryEntries[index] = {
      ...diaryEntries[index],
      ...body,
      updatedAt: new Date(),
    }
    return HttpResponse.json(toDiaryResponse(diaryEntries[index]))
  }),

  // DELETE /diaries/:id
  http.delete(`${BASE_URL}/diaries/:id`, ({ params }) => {
    const index = diaryEntries.findIndex(d => d.id === params.id)
    if (index === -1) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Diary entry not found' },
        { status: 404 }
      )
    }
    diaryEntries.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
