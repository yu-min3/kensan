import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserSettings, Theme } from '@/types'
import { mockUserSettings } from '@/data/mockData'

interface SettingsState extends UserSettings {
  setClockifyApiKey: (key: string) => void
  setWorkspace: (id: string, name: string) => void
  setTimezone: (tz: string) => void
  setTheme: (theme: Theme) => void
  setUserName: (name: string) => void
  setIsConfigured: (configured: boolean) => void
  resetSettings: () => void
}

const initialSettings: UserSettings = {
  clockifyApiKey: undefined,
  workspaceId: undefined,
  workspaceName: undefined,
  timezone: 'Asia/Tokyo',
  theme: 'system',
  isConfigured: false,
  userName: 'Guest',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // 初期状態（デモ用にmockデータを使用）
      ...mockUserSettings,

      setClockifyApiKey: (key) =>
        set({ clockifyApiKey: key }),

      setWorkspace: (id, name) =>
        set({ workspaceId: id, workspaceName: name }),

      setTimezone: (tz) =>
        set({ timezone: tz }),

      setTheme: (theme) =>
        set({ theme }),

      setUserName: (name) =>
        set({ userName: name }),

      setIsConfigured: (configured) =>
        set({ isConfigured: configured }),

      resetSettings: () =>
        set(initialSettings),
    }),
    {
      name: 'kensan-settings',
    }
  )
)
