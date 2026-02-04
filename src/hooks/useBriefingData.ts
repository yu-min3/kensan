import { useEffect, useState, useRef } from 'react'
import type { BriefingMode } from '@/types/briefing'
import type { Task, TimeEntry } from '@/types'
import { tasksApi } from '@/api/services/tasks'
import { timeblocksApi, timeentriesApi } from '@/api/services/timeblocks'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useGoalStore } from '@/stores/useGoalStore'
import { useMilestoneStore } from '@/stores/useMilestoneStore'
import { getTodayInTimezone } from '@/lib/timezone'
import { subDays, addDays, format } from 'date-fns'

// ─── Card Data Types ───────────────────────────────

export interface TimeEntrySummary {
  id: string
  taskName: string
  goalName?: string
  goalColor?: string
  minutes: number
}

export interface FocusTask {
  id: string
  name: string
  goalName?: string
  goalColor?: string
  estimatedMinutes?: number
}

export interface CarryoverTask {
  id: string
  name: string
  goalName?: string
  goalColor?: string
  dueDate?: string
  daysOverdue: number
}

export interface ActualVsPlanned {
  planned: number
  actual: number
  entries: TimeEntrySummary[]
}

// ─── Collected Briefing Data ───────────────────────

export interface BriefingData {
  /** Data loading state */
  isLoading: boolean
  error: string | null

  // Morning cards
  yesterdayEntries: TimeEntrySummary[]
  todayFocusTasks: FocusTask[]
  carryoverTasks: CarryoverTask[]

  // Evening cards
  actualVsPlanned: ActualVsPlanned
  completedTasks: FocusTask[]

  // Shared / future
  tomorrowFocusTasks: FocusTask[]
}

// ─── Helper ────────────────────────────────────────

function toEntrySummary(entry: TimeEntry): TimeEntrySummary {
  const start = new Date(entry.startDatetime).getTime()
  const end = new Date(entry.endDatetime).getTime()
  return {
    id: entry.id,
    taskName: entry.taskName,
    goalName: entry.goalName,
    goalColor: entry.goalColor,
    minutes: Math.round((end - start) / 60000),
  }
}

function enrichTaskWithGoal(
  task: Task,
  milestones: ReturnType<typeof useMilestoneStore.getState>['items'],
  goals: ReturnType<typeof useGoalStore.getState>['items'],
): { goalName?: string; goalColor?: string } {
  if (!task.milestoneId) return {}
  const milestone = milestones.find((m) => m.id === task.milestoneId)
  if (!milestone) return {}
  const goal = goals.find((g) => g.id === milestone.goalId)
  if (!goal) return {}
  return { goalName: goal.name, goalColor: goal.color }
}

// ─── Hook ──────────────────────────────────────────

export function useBriefingData(mode: BriefingMode): BriefingData {
  const [data, setData] = useState<BriefingData>({
    isLoading: true,
    error: null,
    yesterdayEntries: [],
    todayFocusTasks: [],
    carryoverTasks: [],
    actualVsPlanned: { planned: 0, actual: 0, entries: [] },
    completedTasks: [],
    tomorrowFocusTasks: [],
  })

  const fetchedRef = useRef(false)
  const timezone = useSettingsStore((s) => s.timezone) || 'Asia/Tokyo'

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    const fetchData = async () => {
      try {
        const today = getTodayInTimezone(timezone)
        const yesterday = format(subDays(new Date(today), 1), 'yyyy-MM-dd')
        const tomorrow = format(addDays(new Date(today), 1), 'yyyy-MM-dd')

        // Grab goal/milestone data from stores (already loaded by useInitializeData)
        const milestones = useMilestoneStore.getState().items
        const goals = useGoalStore.getState().items

        // Fetch from APIs in parallel
        const [
          allTasks,
          yesterdayTimeEntries,
          todayTimeBlocks,
          todayTimeEntries,
        ] = await Promise.all([
          tasksApi.list(),
          timeentriesApi.listByLocalDate(yesterday, timezone),
          timeblocksApi.listByLocalDate(today, timezone),
          timeentriesApi.listByLocalDate(today, timezone),
        ])

        // ── Yesterday entries ──
        const yesterdayEntries = yesterdayTimeEntries.map(toEntrySummary)

        // ── Focus tasks (incomplete, top-level, sorted by sortOrder) ──
        const incompleteTasks = allTasks
          .filter((t) => !t.completed && !t.parentTaskId)
          .sort((a, b) => a.sortOrder - b.sortOrder)

        const todayFocusTasks: FocusTask[] = incompleteTasks.slice(0, 5).map((t) => ({
          id: t.id,
          name: t.name,
          estimatedMinutes: t.estimatedMinutes,
          ...enrichTaskWithGoal(t, milestones, goals),
        }))

        // ── Carryover (overdue) tasks ──
        const carryoverTasks: CarryoverTask[] = incompleteTasks
          .filter((t) => t.dueDate && t.dueDate < today)
          .map((t) => ({
            id: t.id,
            name: t.name,
            dueDate: t.dueDate,
            daysOverdue: Math.floor(
              (new Date(today).getTime() - new Date(t.dueDate!).getTime()) / 86400000,
            ),
            ...enrichTaskWithGoal(t, milestones, goals),
          }))

        // ── Actual vs Planned ──
        const plannedMinutes = todayTimeBlocks.reduce((sum, tb) => {
          const start = new Date(tb.startDatetime).getTime()
          const end = new Date(tb.endDatetime).getTime()
          return sum + Math.round((end - start) / 60000)
        }, 0)
        const todayEntriesSummary = todayTimeEntries.map(toEntrySummary)
        const actualMinutes = todayEntriesSummary.reduce((sum, e) => sum + e.minutes, 0)

        // ── Completed tasks ──
        const completedTasks: FocusTask[] = allTasks
          .filter((t) => t.completed && !t.parentTaskId)
          .map((t) => ({
            id: t.id,
            name: t.name,
            ...enrichTaskWithGoal(t, milestones, goals),
          }))

        // ── Tomorrow focus (incomplete, with due date = tomorrow, or top remaining) ──
        const tomorrowDueTasks = incompleteTasks.filter((t) => t.dueDate === tomorrow)
        const tomorrowFocusTasks: FocusTask[] = (
          tomorrowDueTasks.length > 0 ? tomorrowDueTasks : incompleteTasks
        )
          .slice(0, 4)
          .map((t) => ({
            id: t.id,
            name: t.name,
            ...enrichTaskWithGoal(t, milestones, goals),
          }))

        setData({
          isLoading: false,
          error: null,
          yesterdayEntries,
          todayFocusTasks,
          carryoverTasks,
          actualVsPlanned: {
            planned: plannedMinutes,
            actual: actualMinutes,
            entries: todayEntriesSummary,
          },
          completedTasks,
          tomorrowFocusTasks,
        })
      } catch (err) {
        console.error('[Briefing] Data fetch failed:', err)
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: (err as Error).message,
        }))
      }
    }

    fetchData()

    return () => {
      fetchedRef.current = false
    }
  }, [mode, timezone])

  return data
}

// ─── Context Builder (for AI stream) ───────────────

/**
 * Build a context object from collected briefing data to send to the AI.
 * This ensures the AI has full context for rich insight generation
 * without needing to call tools itself.
 */
export function buildBriefingContext(
  mode: BriefingMode,
  data: BriefingData,
): Record<string, string> {
  if (mode === 'morning') {
    return {
      yesterday_summary: data.yesterdayEntries.length > 0
        ? data.yesterdayEntries
            .map((e) => `${e.taskName}: ${e.minutes}分${e.goalName ? ` (${e.goalName})` : ''}`)
            .join('\n')
        : '昨日の実績はありません',
      today_focus: data.todayFocusTasks.length > 0
        ? data.todayFocusTasks
            .map((t) => `${t.name}${t.estimatedMinutes ? ` (${t.estimatedMinutes}分)` : ''}${t.goalName ? ` [${t.goalName}]` : ''}`)
            .join('\n')
        : '今日のフォーカスタスクはありません',
      overdue_tasks: data.carryoverTasks.length > 0
        ? data.carryoverTasks
            .map((t) => `${t.name}: ${t.daysOverdue}日超過`)
            .join('\n')
        : '期限超過タスクはありません',
    }
  }

  // evening
  return {
    actual_vs_planned: `計画: ${data.actualVsPlanned.planned}分, 実績: ${data.actualVsPlanned.actual}分`,
    today_entries: data.actualVsPlanned.entries.length > 0
      ? data.actualVsPlanned.entries
          .map((e) => `${e.taskName}: ${e.minutes}分${e.goalName ? ` (${e.goalName})` : ''}`)
          .join('\n')
      : '今日の実績はありません',
    completed_tasks: data.completedTasks.length > 0
      ? data.completedTasks
          .map((t) => `${t.name}${t.goalName ? ` [${t.goalName}]` : ''}`)
          .join('\n')
      : '今日完了したタスクはありません',
    pending_tasks: data.todayFocusTasks.length > 0
      ? data.todayFocusTasks
          .map((t) => `${t.name}${t.goalName ? ` [${t.goalName}]` : ''}`)
          .join('\n')
      : '未完了タスクはありません',
  }
}
