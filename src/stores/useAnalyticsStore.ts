import { create } from 'zustand'
import type { WeeklySummary } from '@/types'
import { analyticsApi } from '@/api/services/analytics'

export interface DailyStudyHour {
  date: string
  hours: number
  day: string
}

interface AnalyticsState {
  weeklySummary: WeeklySummary | null
  dailyStudyHours: DailyStudyHour[]
  isLoading: boolean
  error: string | null

  // データ取得
  fetchWeeklySummary: (weekStart?: string) => Promise<void>
  fetchDailyStudyHours: (days?: number) => Promise<void>

  // 一括取得（ダッシュボード用）- 日付範囲指定対応
  fetchDashboardData: (startDate?: string, endDate?: string) => Promise<void>
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  weeklySummary: null,
  dailyStudyHours: [],
  isLoading: false,
  error: null,

  fetchWeeklySummary: async (weekStart) => {
    set({ isLoading: true, error: null })
    try {
      const weeklySummary = await analyticsApi.getWeeklySummary(weekStart)
      set({ weeklySummary, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchDailyStudyHours: async (days = 7) => {
    set({ isLoading: true, error: null })
    try {
      const data = await analyticsApi.getDailyStudyHours(days)
      // APIのレスポンスをUI用の形式に変換
      const dailyStudyHours: DailyStudyHour[] = data.map((d) => ({
        date: d.date,
        hours: d.hours,
        day: d.day ?? '',
      }))
      set({ dailyStudyHours, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchDashboardData: async (startDate?: string, endDate?: string) => {
    set({ isLoading: true, error: null })
    try {
      let weeklySummary: WeeklySummary
      let dailyData: DailyStudyHour[]

      if (startDate && endDate) {
        // 日付範囲指定がある場合
        ;[weeklySummary, dailyData] = await Promise.all([
          analyticsApi.getSummary(startDate, endDate),
          analyticsApi.getDailyStudyHoursByRange(startDate, endDate),
        ])
      } else {
        // デフォルト（今週）
        ;[weeklySummary, dailyData] = await Promise.all([
          analyticsApi.getWeeklySummary(),
          analyticsApi.getDailyStudyHours(7),
        ])
      }

      const dailyStudyHours: DailyStudyHour[] = dailyData.map((d) => ({
        date: d.date,
        hours: d.hours,
        day: d.day ?? '',
      }))
      set({ weeklySummary, dailyStudyHours, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },
}))
