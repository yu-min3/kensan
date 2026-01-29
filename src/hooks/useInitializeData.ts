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
        // Use Promise.allSettled to allow partial success
        const results = await Promise.allSettled([
          fetchTasks(),
          fetchTimeBlocksForLocalDate(todayLocal, currentTimezone),
          fetchTimeEntriesForLocalDate(todayLocal, currentTimezone),
          fetchNotes(),
          fetchCurrentTimer(),
        ])

        // Log any failures but don't block initialization
        const failures = results
          .map((r, i) => ({ result: r, name: ['tasks', 'timeBlocks', 'timeEntries', 'notes', 'timer'][i] }))
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
  }, [isAuthenticated, fetchTasks, fetchTimeBlocksForLocalDate, fetchTimeEntriesForLocalDate, fetchNotes, fetchSettings, fetchCurrentTimer, timezone])

  return { initialized, isLoading, error }
}
