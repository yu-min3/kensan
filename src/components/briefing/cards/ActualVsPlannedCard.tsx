import { BriefingCard } from '../BriefingCard'
import { Progress } from '@/components/ui/progress'
import type { BriefingCard as BriefingCardData } from '@/types/briefing'

interface TimeEntryResult {
  id: string
  taskName: string
  goalName?: string
  goalColor?: string
  minutes: number
}

export function ActualVsPlannedCard({ card }: { card: BriefingCardData }) {
  const data = card.data.result as {
    planned: number
    actual: number
    entries: TimeEntryResult[]
    blocks: Array<{ id: string; taskName: string; goalColor?: string }>
  } | undefined

  const planned = data?.planned ?? 0
  const actual = data?.actual ?? 0
  const entries = data?.entries ?? []
  const percentage = planned > 0 ? Math.round((actual / planned) * 100) : 0

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }

  return (
    <BriefingCard card={card}>
      <div className="space-y-4">
        {/* Progress overview */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">{percentage}%</span>
            <span className="text-sm text-muted-foreground">
              {formatTime(actual)} / {formatTime(planned)}
            </span>
          </div>
          <Progress value={percentage} />
        </div>

        {/* Entries breakdown */}
        {entries.length > 0 && (
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
                  {formatTime(entry.minutes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </BriefingCard>
  )
}
