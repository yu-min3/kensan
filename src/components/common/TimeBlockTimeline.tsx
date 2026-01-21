import type { TimeBlock, TimeEntry } from '@/types'
import { TagBadge } from './TagBadge'
import { cn } from '@/lib/utils'
import { Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TimeBlockTimelineProps {
  timeBlocks?: TimeBlock[]
  timeEntries?: TimeEntry[]
  showComparison?: boolean
  startHour?: number
  endHour?: number
  onBlockClick?: (block: TimeBlock) => void
  onBlockDelete?: (blockId: string) => void
}

function formatTime(time: string): string {
  // HH:mm:ss → HH:mm に変換（秒を削除）
  return time.slice(0, 5)
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
  startHour: defaultStartHour = 8,
  endHour: defaultEndHour = 20,
  onBlockClick,
  onBlockDelete,
}: TimeBlockTimelineProps) {
  // Calculate actual time range from data to ensure all items are visible
  const allTimes = [
    ...timeBlocks.flatMap((b) => [b.startTime, b.endTime]),
    ...timeEntries.flatMap((e) => [e.startTime, e.endTime]),
  ]

  let minHour = defaultStartHour
  let maxHour = defaultEndHour

  if (allTimes.length > 0) {
    const hours = allTimes.map((t) => Math.floor(getMinutesFromTime(t) / 60))
    const dataMinHour = Math.min(...hours)
    const dataMaxHour = Math.max(...hours) + 1 // +1 to include the end hour

    // Expand range to include all data
    minHour = Math.min(defaultStartHour, dataMinHour)
    maxHour = Math.max(defaultEndHour, dataMaxHour)
  }

  const startHour = minHour
  const endHour = maxHour

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

  // Calculate if we need scrolling (more than default range)
  const needsScroll = hours.length > (defaultEndHour - defaultStartHour)
  const maxHeight = needsScroll ? `${(defaultEndHour - defaultStartHour) * 48}px` : undefined

  return (
    <div className={cn("relative flex", needsScroll && "overflow-y-auto")} style={{ maxHeight }}>
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
              'absolute left-1 right-1 rounded-md px-2 py-1 text-xs group border',
              showComparison ? 'left-1 right-[52%]' : 'right-1',
              onBlockClick && 'cursor-pointer hover:ring-2 hover:ring-primary/50'
            )}
            style={{
              backgroundColor: block.isRoutine ? 'var(--timeblock-routine-bg)' : 'var(--timeblock-plan-bg)',
              borderColor: block.isRoutine ? 'var(--timeblock-routine-border)' : 'var(--timeblock-plan-border)',
              top: `${getTopPosition(block.startTime)}%`,
              height: `${getHeight(block.startTime, block.endTime)}%`,
              minHeight: '24px',
            }}
            onClick={() => onBlockClick?.(block)}
          >
            <div className="flex items-center gap-1">
              {block.goalTag && <TagBadge tag={block.goalTag} size="sm" />}
              <span className="truncate font-medium flex-1">{block.taskName}</span>
              {(onBlockClick || onBlockDelete) && (
                <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 ml-1">
                  {onBlockClick && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        onBlockClick(block)
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                  {onBlockDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        onBlockDelete(block.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
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
              className="absolute left-[52%] right-1 rounded-md px-2 py-1 text-xs border"
              style={{
                backgroundColor: 'var(--timeblock-actual-bg)',
                borderColor: 'var(--timeblock-actual-border)',
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
