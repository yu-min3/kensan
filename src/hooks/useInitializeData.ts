import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { useNoteStore } from '@/stores/useNoteStore'
import { useNoteTypeStore } from '@/stores/useNoteTypeStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTimerStore } from '@/stores/useTimerStore'
import { useChatStore } from '@/stores/useChatStore'
import { getTodayInTimezone } from '@/lib/timezone'

// App startup data initialization hook
export function useInitializeData() {
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Auth store
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  // Task store
  const fetchTasks = useTaskStore((state) => state.fetchAll)

  // TimeBlock store (timezone-aware fetch methods)
  const fetchTimeBlocksForLocalDate = useTimeBlockStore((state) => state.fetchTimeBlocksForLocalDate)
  const fetchTimeEntriesForLocalDate = useTimeBlockStore((state) => state.fetchTimeEntriesForLocalDate)

  // Notes store (unified diary + learning records)
  const fetchNotes = useNoteStore((state) => state.fetchNotes)

  // Note types store
  const fetchNoteTypes = useNoteTypeStore((state) => state.fetchTypes)

  // Settings store
  const fetchSettings = useSettingsStore((state) => state.fetchSettings)
  const timezone = useSettingsStore((state) => state.timezone)

  // Timer store
  const fetchCurrentTimer = useTimerStore((state) => state.fetchCurrentTimer)

  useEffect(() => {
    // Only initialize when authenticated
    if (!isAuthenticated) {
      setInitialized(false)
      setIsLoading(false)
      return
    }

    const init = async () => {
      console.log('[Kensan] Initializing data...')
      setIsLoading(true)

      try {
        // First fetch settings to get timezone (needed for time block queries)
        await fetchSettings()

        // Get the current timezone (may have been updated by fetchSettings)
        const currentTimezone = useSettingsStore.getState().timezone || 'Asia/Tokyo'
        const todayLocal = getTodayInTimezone(currentTimezone)
        console.log(`[Kensan] Using timezone: ${currentTimezone}, today: ${todayLocal}`)

        // Fetch data from all stores in parallel
        // Use Promise.allSettled to allow partial success
        const results = await Promise.allSettled([
          fetchTasks(),
          fetchTimeBlocksForLocalDate(todayLocal, currentTimezone),
          fetchTimeEntriesForLocalDate(todayLocal, currentTimezone),
          fetchNotes(),
          fetchCurrentTimer(),
          fetchNoteTypes(),
        ])

        // Log any failures but don't block initialization
        const failures = results
          .map((r, i) => ({ result: r, name: ['tasks', 'timeBlocks', 'timeEntries', 'notes', 'timer', 'noteTypes'][i] }))
          .filter((r) => r.result.status === 'rejected')

        if (failures.length > 0) {
          console.warn('[Kensan] Some data failed to load:', failures.map((f) => f.name))
          failures.forEach((f) => {
            if (f.result.status === 'rejected') {
              console.error(`[Kensan] ${f.name} failed:`, f.result.reason)
            }
          })
        }

        console.log('[Kensan] Data initialization complete')

        // Proactive AI trigger: briefing (morning) or summary (evening), each once per day per user
        const todayKey = getTodayInTimezone(currentTimezone)
        const now = new Date()
        const localHour = new Date(now.toLocaleString('en-US', { timeZone: currentTimezone })).getHours()
        const userId = useAuthStore.getState().user?.id || 'unknown'

        if (localHour < 17) {
          // Morning / daytime → briefing
          const briefingKey = `kensan_briefing_date_${userId}`
          const lastBriefing = localStorage.getItem(briefingKey)
          if (lastBriefing !== todayKey) {
            localStorage.setItem(briefingKey, todayKey)
            setTimeout(() => {
              useChatStore.getState().sendPrefilled(
                '今日のブリーフィングをお願いします',
                'briefing'
              )
            }, 500)
          }
        } else {
          // Evening (17:00+) → summary
          const eveningKey = `kensan_evening_date_${userId}`
          const lastEvening = localStorage.getItem(eveningKey)
          if (lastEvening !== todayKey) {
            localStorage.setItem(eveningKey, todayKey)
            setTimeout(() => {
              useChatStore.getState().sendPrefilled(
                '今日の振り返りをお願いします',
                'evening'
              )
            }, 500)
          }
        }

        setInitialized(true)
      } catch (err) {
        // This catches errors in fetchSettings (required for initialization)
        console.error('[Kensan] Data initialization failed:', err)
        setError((err as Error).message)
        setInitialized(true) // Still allow app to render with error state
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [isAuthenticated, fetchTasks, fetchTimeBlocksForLocalDate, fetchTimeEntriesForLocalDate, fetchNotes, fetchSettings, fetchCurrentTimer, fetchNoteTypes, timezone])

  return { initialized, isLoading, error }
}
