import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { useRoutineStore } from '@/stores/useRoutineStore'
import { useDiaryStore } from '@/stores/useDiaryStore'
import { useLearningRecordStore } from '@/stores/useLearningRecordStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { format, addDays } from 'date-fns'

// App startup data initialization hook
export function useInitializeData() {
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Auth store
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  // Task store
  const fetchTasks = useTaskStore((state) => state.fetchAll)

  // TimeBlock store
  const fetchTimeBlocks = useTimeBlockStore((state) => state.fetchTimeBlocksRange)
  const fetchTimeEntries = useTimeBlockStore((state) => state.fetchTimeEntriesRange)

  // Routine store
  const fetchRoutines = useRoutineStore((state) => state.fetchRoutines)

  // Diary store
  const fetchDiaries = useDiaryStore((state) => state.fetchEntries)

  // Learning records store
  const fetchRecords = useLearningRecordStore((state) => state.fetchRecords)

  // Settings store
  const fetchSettings = useSettingsStore((state) => state.fetchSettings)

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
        // Fetch data from all stores in parallel
        const today = format(new Date(), 'yyyy-MM-dd')
        const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

        await Promise.all([
          fetchTasks(),
          fetchTimeBlocks(today, tomorrow),
          fetchTimeEntries(today, tomorrow),
          fetchRoutines(),
          fetchDiaries(),
          fetchRecords(),
          fetchSettings(),
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
  }, [isAuthenticated, fetchTasks, fetchTimeBlocks, fetchTimeEntries, fetchRoutines, fetchDiaries, fetchRecords, fetchSettings])

  return { initialized, isLoading, error }
}
