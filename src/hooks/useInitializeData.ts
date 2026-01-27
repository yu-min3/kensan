import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { useNoteStore } from '@/stores/useNoteStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTimerStore } from '@/stores/useTimerStore'
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
        // Use timezone-aware fetch for time blocks and entries
        await Promise.all([
          fetchTasks(),
          fetchTimeBlocksForLocalDate(todayLocal, currentTimezone),
          fetchTimeEntriesForLocalDate(todayLocal, currentTimezone),
          fetchNotes(),
          fetchCurrentTimer(),
        ])

        console.log('[Kensan] Data initialization complete')
        setInitialized(true)
      } catch (err) {
        console.error('[Kensan] Data initialization failed:', err)
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [isAuthenticated, fetchTasks, fetchTimeBlocksForLocalDate, fetchTimeEntriesForLocalDate, fetchNotes, fetchSettings, fetchCurrentTimer, timezone])

  return { initialized, isLoading, error }
}
