// Diary Entries MSW handlers
import { http, HttpResponse } from 'msw'
import { diaryEntries } from '../data'
import { createMockCrudHandlers } from '../createMockCrudHandlers'
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

// Base CRUD handlers
const crudHandlers = createMockCrudHandlers(
  {
    baseUrl: BASE_URL,
    resourcePath: '/diaries',
    transform: toDiaryResponse,
    data: diaryEntries,
    getId: (d) => d.id,
    idPrefix: 'd',
    resourceName: 'Diary entry',
    prependOnAdd: true,
  },
  {
    filters: [
      { paramName: 'tag', fieldName: 'tags', type: 'includes' },
      { paramName: 'q', fieldName: '', type: 'search', searchFields: ['title', 'content'] },
    ],
  }
)

// Custom handlers
const customHandlers = [
  // GET /diaries - Override list to handle date range filters properly
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
]

// Export: custom handlers first (they override CRUD list), then CRUD handlers (excluding list)
export const diaryHandlers = [
  ...customHandlers,
  ...crudHandlers.slice(1), // Skip the generated list handler since we override it
]
