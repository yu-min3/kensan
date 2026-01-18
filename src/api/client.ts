// HTTP Client for API requests

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

  setAuthToken(token: string | null) {
    this.authToken = token
  }

  getAuthToken(): string | null {
    return this.authToken
  }

  async request<T>(baseUrl: string, endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options

    const url = `${baseUrl}/api/v1${endpoint}`

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    if (this.authToken) {
      requestHeaders['Authorization'] = `Bearer ${this.authToken}`
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        response.status,
        errorData.code || 'UNKNOWN_ERROR',
        errorData.message || `Request failed with status ${response.status}`
      )
    }

    // 204 No Content の場合は空のレスポンス
    if (response.status === 204) {
      return {} as T
    }

    return response.json()
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
