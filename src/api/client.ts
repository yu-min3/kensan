// HTTP Client for API requests
import { toast } from 'sonner'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

class HttpClient {
  private authToken: string | null = null
  private onUnauthorizedCallback: (() => void) | null = null

  /**
   * Generate a W3C Trace Context traceparent header value.
   * Format: 00-{traceId(32hex)}-{parentId(16hex)}-{flags(2hex)}
   */
  private generateTraceparent(): string {
    const traceId = crypto.randomUUID().replace(/-/g, '')
    const parentId = crypto.randomUUID().replace(/-/g, '').substring(0, 16)
    return `00-${traceId}-${parentId}-01`
  }

  setAuthToken(token: string | null) {
    this.authToken = token
  }

  getAuthToken(): string | null {
    return this.authToken
  }

  setOnUnauthorized(callback: () => void) {
    this.onUnauthorizedCallback = callback
  }

  async request<T>(baseUrl: string, endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options

    const url = `${baseUrl}/api/v1${endpoint}`

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'traceparent': this.generateTraceparent(),
      ...headers,
    }

    if (this.authToken) {
      requestHeaders['Authorization'] = `Bearer ${this.authToken}`
    }

    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      })
    } catch (err) {
      // Network error (server down, CORS, etc.)
      const errorMessage = err instanceof Error ? err.message : 'Unknown network error'
      toast.error('Network Error', {
        description: `${method} ${endpoint}: ${errorMessage}`,
        duration: 5000,
      })
      throw new ApiError(0, 'NETWORK_ERROR', errorMessage)
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      // Backend returns {error: {code, message}, meta: {...}}
      const errorObj = errorData.error || errorData
      const errorCode = errorObj.code || 'UNKNOWN_ERROR'
      const errorMessage = errorObj.message || `Request failed with status ${response.status}`

      // 401 Unauthorized: セッション無効
      if (response.status === 401) {
        toast.error('セッションが無効です', {
          description: '再ログインしてください',
          duration: 5000,
        })
        if (this.onUnauthorizedCallback) {
          this.onUnauthorizedCallback()
        }
        throw new ApiError(response.status, errorCode, errorMessage)
      }

      // Show toast notification for API errors
      toast.error(`API Error [${response.status}]`, {
        description: `${errorCode}: ${errorMessage}`,
        duration: 5000,
      })

      throw new ApiError(response.status, errorCode, errorMessage)
    }

    // 204 No Content の場合は空のレスポンス
    if (response.status === 204) {
      return {} as T
    }

    const json = await response.json()
    // バックエンドは {data: ..., meta: ...} 形式で返すため、data フィールドを抽出
    // MSW や他のソースからの直接レスポンスにも対応
    return (json.data !== undefined ? json.data : json) as T
  }

  get<T>(baseUrl: string, endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(baseUrl, endpoint, { ...options, method: 'GET' })
  }

  post<T>(baseUrl: string, endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(baseUrl, endpoint, { ...options, method: 'POST', body })
  }

  put<T>(baseUrl: string, endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(baseUrl, endpoint, { ...options, method: 'PUT', body })
  }

  patch<T>(baseUrl: string, endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(baseUrl, endpoint, { ...options, method: 'PATCH', body })
  }

  delete<T>(baseUrl: string, endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(baseUrl, endpoint, { ...options, method: 'DELETE' })
  }
}

// シングルトンとしてエクスポート
export const httpClient = new HttpClient()
