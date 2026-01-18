// AI Review API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'
import type { AIReviewReport } from '@/types'

// API Response types
interface AIReviewReportResponse {
  id: string
  userId: string
  weekStart: string
  weekEnd: string
  summary: string
  goodPoints: string[]
  improvementPoints: string[]
  advice: string[]
  createdAt: string
}

interface AskResponse {
  answer: string
  sources?: string[]
}

// Transform API response to frontend type
const transformAIReviewReport = (r: AIReviewReportResponse): AIReviewReport => ({
  id: r.id,
  weekStart: r.weekStart,
  weekEnd: r.weekEnd,
  summary: r.summary,
  goodPoints: r.goodPoints,
  improvementPoints: r.improvementPoints,
  advice: r.advice,
  createdAt: new Date(r.createdAt),
})

export interface GenerateReviewInput {
  weekStart: string // YYYY-MM-DD
  weekEnd: string // YYYY-MM-DD
}

export interface ReviewFilter {
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
}

export interface AskInput {
  question: string
  context?: string
}

export const aiApi = {
  async generateReview(data: GenerateReviewInput): Promise<AIReviewReport> {
    const response = await httpClient.post<AIReviewReportResponse>(
      API_CONFIG.baseUrls.ai,
      '/ai/reviews/generate',
      data
    )
    return transformAIReviewReport(response)
  },

  async listReviews(filters?: ReviewFilter): Promise<AIReviewReport[]> {
    const params = new URLSearchParams()
    if (filters?.startDate) params.set('start_date', filters.startDate)
    if (filters?.endDate) params.set('end_date', filters.endDate)

    const query = params.toString()
    const endpoint = `/ai/reviews${query ? `?${query}` : ''}`

    const response = await httpClient.get<AIReviewReportResponse[]>(
      API_CONFIG.baseUrls.ai,
      endpoint
    )
    return response.map(transformAIReviewReport)
  },

  async getReview(id: string): Promise<AIReviewReport> {
    const response = await httpClient.get<AIReviewReportResponse>(
      API_CONFIG.baseUrls.ai,
      `/ai/reviews/${id}`
    )
    return transformAIReviewReport(response)
  },

  async ask(data: AskInput): Promise<AskResponse> {
    return httpClient.post<AskResponse>(
      API_CONFIG.baseUrls.ai,
      '/ai/ask',
      data
    )
  },
}
