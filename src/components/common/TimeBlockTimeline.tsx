import type { TimeBlock, TimeEntry } from '@/types'
import { TagBadge } from './TagBadge'
import { cn } from '@/lib/utils'

interface TimeBlockTimelineProps {
  timeBlocks?: TimeBlock[]
  timeEntries?: TimeEntry[]
  showComparison?: boolean
  startHour?: number
  endHour?: number
}

function formatTime(time: string): string {
  return time
}

function getMinutesFromTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function getDurationMinutes(start: string, end: string): number {
  return getMinutesFromTime(end) - getMinutesFromTime(start)
}

export function TimeBlockTimeline({
  timeBlocks = [],
  timeEntries = [],
  showComparison = false,
  startHour = 8,
  endHour = 20,
}: TimeBlockTimelineProps) {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i)
  const totalMinutes = (endHour - startHour) * 60

  const getTopPosition = (time: string) => {
    const minutes = getMinutesFromTime(time) - startHour * 60
    return (minutes / totalMinutes) * 100
  }

  const getHeight = (start: string, end: string) => {
    const duration = getDurationMinutes(start, end)
    return (duration / totalMinutes) * 100
  }

  return (
    <div className="relative flex">
      {/* 時間軸 */}
      <div className="w-16 flex-shrink-0">
        {hours.map((hour) => (
          <div
            key={hour}
            className="h-12 border-t text-xs text-muted-foreground flex items-start pt-1 pr-2 justify-end"
          >
            {hour}:00
          </div>
        ))}
      </div>

      {/* タイムブロック表示エリア */}
      <div className="flex-1 relative border-l" style={{ height: `${hours.length * 48}px` }}>
        {/* 時間線 */}
        {hours.map((hour, index) => (
          <div
            key={hour}
            className="absolute w-full border-t border-dashed border-muted"
            style={{ top: `${(index / hours.length) * 100}%` }}
          />
        ))}

        {/* タイムブロック（計画） */}
        {timeBlocks.map((block) => (
          <div
            key={block.id}
            className={cn(
              'absolute left-1 right-1 rounded-md px-2 py-1 text-xs',
              showComparison ? 'left-1 right-[52%]' : 'right-1',
              block.isRoutine
                ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700'
                : 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700'
            )}
            style={{
              top: `${getTopPosition(block.startTime)}%`,
              height: `${getHeight(block.startTime, block.endTime)}%`,
              minHeight: '24px',
            }}
          >
            <div className="flex items-center gap-1 truncate">
              {block.goalTag && <TagBadge tag={block.goalTag} size="sm" />}
              <span className="truncate font-medium">{block.taskName}</span>
            </div>
            <div className="text-muted-foreground">
              {formatTime(block.startTime)} - {formatTime(block.endTime)}
            </div>
          </div>
        ))}

        {/* 時間記録（実績） */}
        {showComparison &&
          timeEntries.map((entry) => (
            <div
              key={entry.id}
              className="absolute left-[52%] right-1 rounded-md px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700"
              style={{
                top: `${getTopPosition(entry.startTime)}%`,
                height: `${getHeight(entry.startTime, entry.endTime)}%`,
                minHeight: '24px',
              }}
            >
              <div className="flex items-center gap-1 truncate">
                {entry.goalTag && <TagBadge tag={entry.goalTag} size="sm" />}
                <span className="truncate font-medium">{entry.taskName}</span>
              </div>
              <div className="text-muted-foreground">
                {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
