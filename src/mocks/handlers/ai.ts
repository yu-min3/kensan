// AI Review MSW handlers
import { http, HttpResponse } from 'msw'
import { aiReviewReports, generateId } from '../data'
import type { AIReviewReport } from '@/types'

const BASE_URL = 'http://localhost:8089/api/v1'

// Transform to API response format
const toReviewResponse = (r: AIReviewReport) => ({
  id: r.id,
  userId: 'user-1',
  weekStart: r.weekStart,
  weekEnd: r.weekEnd,
  summary: r.summary,
  goodPoints: r.goodPoints,
  improvementPoints: r.improvementPoints,
  advice: r.advice,
  createdAt: r.createdAt.toISOString(),
})

export const aiHandlers = [
  // POST /ai/reviews/generate
  http.post(`${BASE_URL}/ai/reviews/generate`, async ({ request }) => {
    const body = await request.json() as { weekStart: string; weekEnd: string }

    // Generate a mock review
    const newReport: AIReviewReport = {
      id: generateId('ai'),
      weekStart: body.weekStart,
      weekEnd: body.weekEnd,
      summary: '今週は順調に学習を進めることができました。特にKubernetesの理解が深まりました。',
      goodPoints: [
        '毎日継続して学習できた',
        'ドキュメントを丁寧に読む習慣がついた',
        '計画通りのタイムブロックを消化できた',
      ],
      improvementPoints: [
        'アウトプットの量をもう少し増やしたい',
        '休憩時間の管理を改善したい',
      ],
      advice: [
        '学んだことをブログにまとめると理解が深まります',
        'ポモドーロテクニックを試してみてはいかがでしょうか',
        '週末に1時間程度のバッファを設けておくと柔軟性が上がります',
      ],
      createdAt: new Date(),
    }
    aiReviewReports.unshift(newReport)

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    return HttpResponse.json(toReviewResponse(newReport), { status: 201 })
  }),

  // GET /ai/reviews
  http.get(`${BASE_URL}/ai/reviews`, ({ request }) => {
    const url = new URL(request.url)
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')

    let result = [...aiReviewReports]
    if (startDate) {
      result = result.filter(r => r.weekStart >= startDate)
    }
    if (endDate) {
      result = result.filter(r => r.weekEnd <= endDate)
    }

    return HttpResponse.json(result.map(toReviewResponse))
  }),

  // GET /ai/reviews/:id
  http.get(`${BASE_URL}/ai/reviews/:id`, ({ params }) => {
    const report = aiReviewReports.find(r => r.id === params.id)
    if (!report) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'AI review not found' },
        { status: 404 }
      )
    }
    return HttpResponse.json(toReviewResponse(report))
  }),

  // POST /ai/ask
  http.post(`${BASE_URL}/ai/ask`, async ({ request }) => {
    const body = await request.json() as { question: string; context?: string }

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 500))

    return HttpResponse.json({
      answer: `ご質問「${body.question}」について回答します。\n\n学習の進捗は順調です。今週は特にKubernetesの理解が深まりました。継続的な学習を心がけましょう。`,
      sources: ['過去の学習記録', '週次レポート'],
    })
  }),
]
