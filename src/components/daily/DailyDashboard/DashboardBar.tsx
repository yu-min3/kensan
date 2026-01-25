import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { Target, Pin, StickyNote, Flame, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DailyDashboard } from './DailyDashboard'

export function DashboardBar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const { todayFocus, pinnedReminders, stickyNotes, streaks } = useDashboardStore()

  const activePins = pinnedReminders.filter((r) => !r.completed).length
  const notesCount = stickyNotes.length
  const learningStreak = streaks.find((s) => s.type === 'learning')
  const isCompleted = !!todayFocus?.completedAt

  return (
    <div className="space-y-2">
      {/* コンパクトバー */}
      <div
        className={cn(
          'flex items-center gap-4 px-4 py-2 rounded-lg border bg-card cursor-pointer hover:bg-muted/50 transition-colors',
          isExpanded && 'rounded-b-none border-b-0'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* 今日のフォーカス */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Target className="h-4 w-4 text-primary shrink-0" />
          {todayFocus?.text ? (
            <span
              className={cn(
                'text-sm font-medium truncate',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {isCompleted && <Check className="h-3 w-3 inline mr-1 text-green-500" />}
              {todayFocus.text}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">フォーカス未設定</span>
          )}
        </div>

        {/* ステータスバッジ */}
        <div className="flex items-center gap-3 shrink-0">
          {activePins > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Pin className="h-3 w-3 text-amber-500" />
              <span>{activePins}</span>
            </div>
          )}
          {notesCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <StickyNote className="h-3 w-3 text-yellow-500" />
              <span>{notesCount}</span>
            </div>
          )}
          {learningStreak && learningStreak.currentStreak > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="h-3 w-3 text-orange-500" />
              <span>{learningStreak.currentStreak}日</span>
            </div>
          )}
        </div>

        {/* 展開ボタン */}
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 展開時のコンテンツ */}
      {isExpanded && (
        <div className="border border-t-0 rounded-b-lg p-4 bg-card">
          <DailyDashboard />
        </div>
      )}
    </div>
  )
}
