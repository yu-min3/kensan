import { useMemo } from 'react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTaskOnlyStore } from '@/stores/useTaskStore'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { useGoalStore } from '@/stores/useGoalStore'
import { useTimerStore } from '@/stores/useTimerStore'
import { getLocalTime } from '@/lib/timezone'
import { MarkdownContent } from './MarkdownContent'

function getGreeting(timezone: string): string {
  const now = new Date()
  const hour = new Date(now.toLocaleString('en-US', { timeZone: timezone })).getHours()
  if (hour < 11) return 'おはようございます'
  if (hour < 17) return 'こんにちは'
  return 'おつかれさまです'
}

export function WelcomeMessage() {
  const userName = useSettingsStore((s) => s.userName)
  const timezone = useSettingsStore((s) => s.timezone) || 'Asia/Tokyo'
  const tasks = useTaskOnlyStore((s) => s.tasks)
  const timeBlocks = useTimeBlockStore((s) => s.getTodayTimeBlocks())
  const goals = useGoalStore((s) => s.items)
  const currentTimer = useTimerStore((s) => s.currentTimer)

  const content = useMemo(() => {
    const lines: string[] = []

    // Greeting
    const greeting = getGreeting(timezone)
    lines.push(`${greeting}、${userName} さん`)
    lines.push('')
    lines.push('---')
    lines.push('')

    // Timer
    if (currentTimer) {
      lines.push('**タイマー稼働中**')
      lines.push('')
    }

    // Tasks (incomplete, sorted by due date, max 5)
    const incompleteTasks = tasks
      .filter((t) => !t.completed)
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
        if (a.dueDate) return -1
        if (b.dueDate) return 1
        return a.sortOrder - b.sortOrder
      })
      .slice(0, 5)

    if (incompleteTasks.length > 0) {
      const totalIncomplete = tasks.filter((t) => !t.completed).length
      lines.push(`**今日のタスク** — ${totalIncomplete}件`)
      for (const task of incompleteTasks) {
        const due = task.dueDate ? `（期限: ${task.dueDate}）` : ''
        lines.push(`- [ ] ${task.name}${due}`)
      }
      if (totalIncomplete > 5) {
        lines.push(`- ...他 ${totalIncomplete - 5}件`)
      }
      lines.push('')
    }

    // Time blocks (sorted by start time)
    const sortedBlocks = [...timeBlocks].sort((a, b) =>
      a.startDatetime.localeCompare(b.startDatetime)
    )

    if (sortedBlocks.length > 0) {
      lines.push(`**予定** — ${sortedBlocks.length}ブロック`)
      for (const block of sortedBlocks) {
        const start = getLocalTime(block.startDatetime, timezone)
        const end = getLocalTime(block.endDatetime, timezone)
        lines.push(`- ${start}–${end} ${block.taskName}`)
      }
      lines.push('')
    }

    // Active goals
    const activeGoals = goals.filter((g) => g.status === 'active')
    if (activeGoals.length > 0) {
      lines.push(`**進行中のゴール** — ${activeGoals.length}件`)
      lines.push('')
    }

    lines.push('---')
    lines.push('')
    lines.push('予定の作成やタスクの確認など、お気軽にどうぞ')

    return lines.join('\n')
  }, [userName, timezone, tasks, timeBlocks, goals, currentTimer])

  return (
    <div className="flex flex-col h-full px-4 py-6 overflow-y-auto">
      <div className="text-sm text-foreground/90">
        <MarkdownContent content={content} />
      </div>
    </div>
  )
}
