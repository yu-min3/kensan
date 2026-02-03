import { BriefingCard } from '../BriefingCard'
import type { BriefingCard as BriefingCardData } from '@/types/briefing'
import { Target } from 'lucide-react'

interface FocusTask {
  id: string
  name: string
  goalName?: string
  goalColor?: string
  estimatedMinutes?: number
  priority?: 'high' | 'medium' | 'low'
}

export function TodayFocusCard({ card }: { card: BriefingCardData }) {
  const tasks = (card.data.result as FocusTask[] | undefined) ?? []

  return (
    <BriefingCard card={card}>
      <div className="space-y-2">
        {tasks.length > 0 ? (
          tasks.map((task, i) => (
            <div
              key={task.id}
              className="flex items-start gap-2 text-sm"
            >
              <span className="text-muted-foreground font-mono text-xs mt-0.5 w-4">
                {i + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {task.goalColor && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: task.goalColor }}
                    />
                  )}
                  <span className="truncate font-medium">{task.name}</span>
                </div>
                {task.goalName && (
                  <span className="text-xs text-muted-foreground">{task.goalName}</span>
                )}
              </div>
              {task.estimatedMinutes && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {task.estimatedMinutes}min
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>今日のフォーカスタスクはまだありません</span>
          </div>
        )}
      </div>
    </BriefingCard>
  )
}
