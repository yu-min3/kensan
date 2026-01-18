// Auth API Service
import { API_CONFIG } from '../config'
import { httpClient } from '../client'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: {
    id: string
    email: string
    name: string
  }
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export const authApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>(
      API_CONFIG.baseUrls.user,
      '/auth/login',
      data
    )
    // トークンをクライアントに保存
    httpClient.setAuthToken(response.token)
    localStorage.setItem('kensan_token', response.token)
    return response
  },

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await httpClient.post<LoginResponse>(
      API_CONFIG.baseUrls.user,
      '/auth/register',
      data
    )
    httpClient.setAuthToken(response.token)
    localStorage.setItem('kensan_token', response.token)
    return response
  },

  logout() {
    httpClient.setAuthToken(null)
    localStorage.removeItem('kensan_token')
  },

  // 保存されたトークンを復元
  restoreToken(): boolean {
    const token = localStorage.getItem('kensan_token')
    if (token) {
      httpClient.setAuthToken(token)
      return true
    }
    return false
  },
}
