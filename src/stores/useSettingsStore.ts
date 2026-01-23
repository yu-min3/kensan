import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserSettings, Theme } from '@/types'
import { userApi } from '@/api/services/user'

interface SettingsState extends UserSettings {
  isLoading: boolean
  error: string | null

  // データ取得
  fetchSettings: () => Promise<void>

  // 操作
  setTimezone: (tz: string) => void
  setTheme: (theme: Theme) => void
  setUserName: (name: string) => void
  setIsConfigured: (configured: boolean) => void
  saveSettings: () => Promise<void>
  resetSettings: () => void
}

const initialSettings: UserSettings = {
  timezone: 'Asia/Tokyo',
  theme: 'system',
  isConfigured: false,
  userName: 'Guest',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...initialSettings,
      isLoading: false,
      error: null,

      fetchSettings: async () => {
        set({ isLoading: true, error: null })
        try {
          const settings = await userApi.getSettings()
          set({ ...settings, isLoading: false })
        } catch (error) {
          // If fetch fails, keep local settings
          set({ error: (error as Error).message, isLoading: false })
        }
      },

      setTimezone: (tz) =>
        set({ timezone: tz }),

      setTheme: (theme) =>
        set({ theme }),

      setUserName: (name) =>
        set({ userName: name }),

      setIsConfigured: (configured) =>
        set({ isConfigured: configured }),

      saveSettings: async () => {
        const state = get()
        try {
          await userApi.updateSettings({
            timezone: state.timezone,
            theme: state.theme,
          })
        } catch (error) {
          set({ error: (error as Error).message })
        }
      },

      resetSettings: () =>
        set(initialSettings),
    }),
    {
      name: 'kensan-settings',
      partialize: (state) => ({
        timezone: state.timezone,
        theme: state.theme,
        isConfigured: state.isConfigured,
        userName: state.userName,
      }),
    }
  )
)
