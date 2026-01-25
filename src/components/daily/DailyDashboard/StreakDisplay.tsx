import { useDashboardStore } from '@/stores/useDashboardStore'
import { Flame } from 'lucide-react'

export function StreakDisplay() {
  const { streaks } = useDashboardStore()

  if (streaks.length === 0) return null

  return (
    <div className="space-y-2">
      {streaks.map((streak) => (
        <div
          key={streak.type}
          className="flex items-center gap-2 text-sm"
        >
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-muted-foreground">{streak.label}:</span>
          <span className="font-semibold">{streak.currentStreak}日</span>
          {streak.longestStreak > streak.currentStreak && (
            <span className="text-xs text-muted-foreground">
              (最長: {streak.longestStreak}日)
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
