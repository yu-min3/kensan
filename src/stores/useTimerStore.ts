import { create } from 'zustand'
import { timerApi, type RunningTimer, type StartTimerInput } from '@/api/services/timer'
import { useTimeBlockStore } from './useTimeBlockStore'
import { useSettingsStore } from './useSettingsStore'
import { utcToLocalDateTime } from '@/lib/timezone'

interface TimerState {
  currentTimer: RunningTimer | null
  isLoading: boolean
  elapsedSeconds: number
  error: string | null

  // Actions
  fetchCurrentTimer: () => Promise<void>
  startTimer: (input: StartTimerInput) => Promise<void>
  stopTimer: () => Promise<void>
  updateElapsed: () => void
  clearError: () => void
}

let intervalId: number | null = null

export const useTimerStore = create<TimerState>((set, get) => ({
  currentTimer: null,
  isLoading: false,
  elapsedSeconds: 0,
  error: null,

  fetchCurrentTimer: async () => {
    set({ isLoading: true, error: null })
    try {
      const timer = await timerApi.getCurrent()
      set({ currentTimer: timer, isLoading: false })

      // Start interval if timer is running
      if (timer) {
        get().updateElapsed()
        startElapsedInterval(get().updateElapsed)
      } else {
        stopElapsedInterval()
        set({ elapsedSeconds: 0 })
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  startTimer: async (input: StartTimerInput) => {
    set({ isLoading: true, error: null })
    try {
      const timer = await timerApi.start(input)
      set({ currentTimer: timer, isLoading: false, elapsedSeconds: 0 })

      // Start interval
      startElapsedInterval(get().updateElapsed)
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  stopTimer: async () => {
    set({ isLoading: true, error: null })
    try {
      const result = await timerApi.stop()
      set({ currentTimer: null, isLoading: false, elapsedSeconds: 0 })

      // Stop interval
      stopElapsedInterval()

      // Convert the returned time entry from UTC to local time and add to store
      if (result?.timeEntry) {
        const timezone = useSettingsStore.getState().timezone || 'Asia/Tokyo'
        const entry = result.timeEntry
        const { date: localDate, time: localStartTime } = utcToLocalDateTime(
          entry.date,
          entry.startTime,
          timezone
        )
        const { time: localEndTime } = utcToLocalDateTime(
          entry.date,
          entry.endTime,
          timezone
        )

        const localEntry = {
          ...entry,
          date: localDate,
          startTime: localStartTime,
          endTime: localEndTime,
        }

        useTimeBlockStore.getState().insertTimeEntryLocal(localEntry)
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  updateElapsed: () => {
    const { currentTimer } = get()
    if (currentTimer) {
      const startedAt = new Date(currentTimer.startedAt).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - startedAt) / 1000)
      set({ elapsedSeconds: elapsed })
    }
  },

  clearError: () => {
    set({ error: null })
  },
}))

// Helper functions for interval management
function startElapsedInterval(updateFn: () => void) {
  stopElapsedInterval()
  intervalId = window.setInterval(updateFn, 1000)
}

function stopElapsedInterval() {
  if (intervalId !== null) {
    window.clearInterval(intervalId)
    intervalId = null
  }
}
