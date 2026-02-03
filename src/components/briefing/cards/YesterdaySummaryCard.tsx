import { BriefingCard } from '../BriefingCard'
import type { BriefingCard as BriefingCardData } from '@/types/briefing'

interface TimeEntryResult {
  id: string
  taskName: string
  goalName?: string
  goalColor?: string
  minutes: number
}

export function YesterdaySummaryCard({ card }: { card: BriefingCardData }) {
  const entries = (card.data.result as TimeEntryResult[] | undefined) ?? []
  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  return (
    <BriefingCard card={card}>
      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{hours}h {mins > 0 ? `${mins}m` : ''}</span>
          <span className="text-sm text-muted-foreground">稼働時間</span>
        </div>

        {entries.length > 0 ? (
          <div className="space-y-1.5">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center gap-2 text-sm">
                {entry.goalColor && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: entry.goalColor }}
                  />
                )}
                <span className="flex-1 truncate">{entry.taskName}</span>
                <span className="text-muted-foreground tabular-nums">
                  {Math.floor(entry.minutes / 60)}h{entry.minutes % 60 > 0 ? `${entry.minutes % 60}m` : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">昨日の記録はありません</p>
        )}
      </div>
    </BriefingCard>
  )
}
