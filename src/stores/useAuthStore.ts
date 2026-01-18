import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { httpClient } from '@/api/client'

interface User {
  id: string
  email: string
  name: string
}

interface AuthState {
  // State
  token: string | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  restoreSession: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await httpClient.post<{ token: string; user: User }>(
            import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:8081',
            '/auth/login',
            { email, password }
          )

          httpClient.setAuthToken(response.token)
          set({
            token: response.token,
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: (error as Error).message || 'ログインに失敗しました',
            isLoading: false,
          })
          throw error
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null })
        try {
          const response = await httpClient.post<{ token: string; user: User }>(
            import.meta.env.VITE_USER_SERVICE_URL || 'http://localhost:8081',
            '/auth/register',
            { email, password, name }
          )

          httpClient.setAuthToken(response.token)
          set({
            token: response.token,
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: (error as Error).message || '登録に失敗しました',
            isLoading: false,
          })
          throw error
        }
      },

      logout: () => {
        httpClient.setAuthToken(null)
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          error: null,
        })
      },

      restoreSession: () => {
        const { token } = get()
        if (token) {
          httpClient.setAuthToken(token)
          set({ isAuthenticated: true })
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'kensan-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        // 永続化されたトークンを復元
        if (state?.token) {
          httpClient.setAuthToken(state.token)
          state.isAuthenticated = true
        }
      },
    }
  )
)
