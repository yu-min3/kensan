import { useState, useRef, useCallback, useEffect } from 'react'
import type { TimeBlock, TimeEntry } from '@/types'
import { GoalBadge } from './GoalBadge'
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
  onBlockResize?: (blockId: string, startTime: string, endTime: string) => void
}

type ResizeEdge = 'top' | 'bottom'

interface ResizeState {
  blockId: string
  edge: ResizeEdge
  initialY: number
  initialStartTime: string
  initialEndTime: string
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

function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

function snapToInterval(minutes: number, interval: number = 15): number {
  return Math.round(minutes / interval) * interval
}

export function TimeBlockTimeline({
  timeBlocks = [],
  timeEntries = [],
  showComparison = false,
  startHour: defaultStartHour = 8,
  endHour: defaultEndHour = 20,
  onBlockClick,
  onBlockDelete,
  onBlockResize,
}: TimeBlockTimelineProps) {
  const [resizeState, setResizeState] = useState<ResizeState | null>(null)
  const [previewTime, setPreviewTime] = useState<{ startTime: string; endTime: string } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Convert Y position to minutes
  const yToMinutes = useCallback(
    (clientY: number): number => {
      if (!containerRef.current) return 0
      const rect = containerRef.current.getBoundingClientRect()
      const relativeY = clientY - rect.top
      const percentage = relativeY / rect.height
      const minutes = percentage * totalMinutes + startHour * 60
      return snapToInterval(Math.max(startHour * 60, Math.min(endHour * 60, minutes)))
    },
    [totalMinutes, startHour, endHour]
  )

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, block: TimeBlock, edge: ResizeEdge) => {
      e.preventDefault()
      e.stopPropagation()
      setResizeState({
        blockId: block.id,
        edge,
        initialY: e.clientY,
        initialStartTime: block.startTime,
        initialEndTime: block.endTime,
      })
      setPreviewTime({
        startTime: block.startTime,
        endTime: block.endTime,
      })
    },
    []
  )

  // Handle resize move
  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!resizeState) return

      const newMinutes = yToMinutes(e.clientY)
      const initialStartMinutes = getMinutesFromTime(resizeState.initialStartTime)
      const initialEndMinutes = getMinutesFromTime(resizeState.initialEndTime)

      let newStartMinutes = initialStartMinutes
      let newEndMinutes = initialEndMinutes

      if (resizeState.edge === 'top') {
        // Dragging top edge changes start time
        newStartMinutes = Math.min(newMinutes, initialEndMinutes - 15) // Minimum 15 min duration
      } else {
        // Dragging bottom edge changes end time
        newEndMinutes = Math.max(newMinutes, initialStartMinutes + 15) // Minimum 15 min duration
      }

      setPreviewTime({
        startTime: minutesToTimeString(newStartMinutes),
        endTime: minutesToTimeString(newEndMinutes),
      })
    },
    [resizeState, yToMinutes]
  )

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    if (resizeState && previewTime && onBlockResize) {
      const hasChanged =
        previewTime.startTime !== resizeState.initialStartTime ||
        previewTime.endTime !== resizeState.initialEndTime
      if (hasChanged) {
        onBlockResize(resizeState.blockId, previewTime.startTime, previewTime.endTime)
      }
    }
    setResizeState(null)
    setPreviewTime(null)
  }, [resizeState, previewTime, onBlockResize])

  // Add global mouse event listeners when resizing
  useEffect(() => {
    if (resizeState) {
      window.addEventListener('mousemove', handleResizeMove)
      window.addEventListener('mouseup', handleResizeEnd)
      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
      return () => {
        window.removeEventListener('mousemove', handleResizeMove)
        window.removeEventListener('mouseup', handleResizeEnd)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [resizeState, handleResizeMove, handleResizeEnd])

  // Get display times for a block (use preview if resizing)
  const getDisplayTimes = (block: TimeBlock) => {
    if (resizeState?.blockId === block.id && previewTime) {
      return previewTime
    }
    return { startTime: block.startTime, endTime: block.endTime }
  }

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
      <div
        ref={containerRef}
        className="flex-1 relative border-l"
        style={{ height: `${hours.length * 48}px` }}
      >
        {/* 時間線 */}
        {hours.map((hour, index) => (
          <div
            key={hour}
            className="absolute w-full border-t border-dashed border-muted"
            style={{ top: `${(index / hours.length) * 100}%` }}
          />
        ))}

        {/* タイムブロック（計画） */}
        {timeBlocks.map((block) => {
          const displayTimes = getDisplayTimes(block)
          const isResizing = resizeState?.blockId === block.id

          return (
            <div
              key={block.id}
              className={cn(
                'absolute left-1 right-1 rounded-md px-2 py-1 text-xs group border',
                showComparison ? 'left-1 right-[52%]' : 'right-1',
                onBlockClick && !isResizing && 'cursor-pointer hover:ring-2 hover:ring-primary/50',
                isResizing && 'ring-2 ring-primary z-10'
              )}
              style={{
                backgroundColor: block.isRoutine ? 'var(--timeblock-routine-bg)' : 'var(--timeblock-plan-bg)',
                borderColor: block.isRoutine ? 'var(--timeblock-routine-border)' : 'var(--timeblock-plan-border)',
                top: `${getTopPosition(displayTimes.startTime)}%`,
                height: `${getHeight(displayTimes.startTime, displayTimes.endTime)}%`,
                minHeight: '24px',
              }}
              onClick={() => !isResizing && onBlockClick?.(block)}
            >
              {/* Top resize handle */}
              {onBlockResize && (
                <div
                  className="absolute left-0 right-0 top-0 h-2 cursor-ns-resize group/handle hover:bg-primary/20 rounded-t-md"
                  onMouseDown={(e) => handleResizeStart(e, block, 'top')}
                >
                  <div className="absolute left-1/2 -translate-x-1/2 top-0.5 w-8 h-1 bg-muted-foreground/30 rounded-full opacity-0 group-hover/handle:opacity-100" />
                </div>
              )}

              <div className="flex items-center gap-1">
                {block.goalName && block.goalColor && (
                  <GoalBadge name={block.goalName} color={block.goalColor} size="sm" />
                )}
                <span className="truncate font-medium flex-1">{block.taskName}</span>
                {(onBlockClick || onBlockDelete) && !isResizing && (
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
                {formatTime(displayTimes.startTime)} - {formatTime(displayTimes.endTime)}
              </div>

              {/* Bottom resize handle */}
              {onBlockResize && (
                <div
                  className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize group/handle hover:bg-primary/20 rounded-b-md"
                  onMouseDown={(e) => handleResizeStart(e, block, 'bottom')}
                >
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-0.5 w-8 h-1 bg-muted-foreground/30 rounded-full opacity-0 group-hover/handle:opacity-100" />
                </div>
              )}
            </div>
          )
        })}

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
                {entry.goalName && entry.goalColor && (
                  <GoalBadge name={entry.goalName} color={entry.goalColor} size="sm" />
                )}
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
