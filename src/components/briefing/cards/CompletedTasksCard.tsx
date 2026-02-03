import { BriefingCard } from '../BriefingCard'
import type { BriefingCard as BriefingCardData } from '@/types/briefing'
import { CheckCircle2 } from 'lucide-react'

interface CompletedTask {
  id: string
  name: string
  goalName?: string
  goalColor?: string
}

export function CompletedTasksCard({ card }: { card: BriefingCardData }) {
  const tasks = (card.data.result as CompletedTask[] | undefined) ?? []

  return (
    <BriefingCard card={card}>
      <div className="space-y-2">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="truncate block">{task.name}</span>
                {task.goalName && (
                  <span className="text-xs text-muted-foreground">{task.goalName}</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">今日完了したタスクはありません</p>
        )}
      </div>
    </BriefingCard>
  )
}
