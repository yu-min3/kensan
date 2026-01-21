// Memos API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'

export interface Memo {
  id: string
  userId: string
  content: string
  archived: boolean
  createdAt: string
  updatedAt: string
}

interface MemoResponse {
  id: string
  userId: string
  content: string
  archived: boolean
  createdAt: string
  updatedAt: string
}

const transformMemo = (m: MemoResponse): Memo => ({
  id: m.id,
  userId: m.userId,
  content: m.content,
  archived: m.archived,
  createdAt: m.createdAt,
  updatedAt: m.updatedAt,
})

export interface ListMemosParams {
  archived?: boolean
  includeAll?: boolean
  date?: string
  limit?: number
}

export const memosApi = {
  /**
   * List memos with optional filters
   */
  async list(params?: ListMemosParams): Promise<Memo[]> {
    const searchParams = new URLSearchParams()
    if (params?.archived !== undefined) {
      searchParams.set('archived', String(params.archived))
    }
    if (params?.includeAll) {
      searchParams.set('include_all', 'true')
    }
    if (params?.date) {
      searchParams.set('date', params.date)
    }
    if (params?.limit) {
      searchParams.set('limit', String(params.limit))
    }

    const query = searchParams.toString()
    const path = query ? `/memos?${query}` : '/memos'

    const response = await httpClient.get<MemoResponse[]>(
      API_CONFIG.baseUrls.memo,
      path
    )
    return response.map(transformMemo)
  },

  /**
   * Create a new memo
   */
  async create(content: string): Promise<Memo> {
    const response = await httpClient.post<MemoResponse>(
      API_CONFIG.baseUrls.memo,
      '/memos',
      { content }
    )
    return transformMemo(response)
  },

  /**
   * Update a memo
   */
  async update(id: string, data: { content?: string; archived?: boolean }): Promise<Memo> {
    const response = await httpClient.patch<MemoResponse>(
      API_CONFIG.baseUrls.memo,
      `/memos/${id}`,
      data
    )
    return transformMemo(response)
  },

  /**
   * Archive a memo
   */
  async archive(id: string): Promise<Memo> {
    const response = await httpClient.post<MemoResponse>(
      API_CONFIG.baseUrls.memo,
      `/memos/${id}/archive`,
      {}
    )
    return transformMemo(response)
  },

  /**
   * Delete a memo
   */
  async delete(id: string): Promise<void> {
    await httpClient.delete(API_CONFIG.baseUrls.memo, `/memos/${id}`)
  },
}
