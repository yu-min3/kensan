import { Progress } from '@/components/ui/progress'
import type { ActualVsPlanned } from '@/hooks/useBriefingData'

function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function ActualVsPlannedCard({ data }: { data: ActualVsPlanned }) {
  const percentage = data.planned > 0 ? Math.round((data.actual / data.planned) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Progress overview */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold">{percentage}%</span>
          <span className="text-sm text-muted-foreground">
            {formatTime(data.actual)} / {formatTime(data.planned)}
          </span>
        </div>
        <Progress value={percentage} />
      </div>

      {/* Entries breakdown */}
      {data.entries.length > 0 && (
        <div className="space-y-1.5">
          {data.entries.map((entry) => (
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
  )
}
