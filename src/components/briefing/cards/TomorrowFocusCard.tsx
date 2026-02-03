import { BriefingCard } from '../BriefingCard'
import type { BriefingCard as BriefingCardData } from '@/types/briefing'
import { ArrowRight } from 'lucide-react'

interface TomorrowTask {
  id: string
  name: string
  goalName?: string
  goalColor?: string
}

export function TomorrowFocusCard({ card }: { card: BriefingCardData }) {
  const tasks = (card.data.result as TomorrowTask[] | undefined) ?? []

  return (
    <BriefingCard card={card}>
      <div className="space-y-2">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2 text-sm">
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {task.goalColor && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: task.goalColor }}
                    />
                  )}
                  <span className="truncate">{task.name}</span>
                </div>
                {task.goalName && (
                  <span className="text-xs text-muted-foreground">{task.goalName}</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">明日の提案はありません</p>
        )}
      </div>
    </BriefingCard>
  )
}
