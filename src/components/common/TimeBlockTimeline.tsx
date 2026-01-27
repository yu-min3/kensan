import { useState, useCallback, useEffect, useRef } from 'react'
import type { TimeBlock, TimeEntry } from '@/types'
import { GoalBadge } from './GoalBadge'
import { cn } from '@/lib/utils'
import { Edit, Trash2, Plus, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDroppable } from '@dnd-kit/core'
import {
  TimeBlockTimelineGrid,
  TimeBlockItem,
  useTimeBlockDragResize,
  getMinutesFromTime,
  minutesToTimeString,
  snapToInterval,
  formatTime,
  calculateTimeFromY,
} from './timeline'
import type { RunningTimerData } from './timeline'

interface TimeBlockTimelineProps {
  timeBlocks?: TimeBlock[]
  timeEntries?: TimeEntry[]
  showComparison?: boolean
  startHour?: number
  endHour?: number
  onBlockClick?: (block: TimeBlock) => void
  onBlockDelete?: (blockId: string) => void
  onBlockResize?: (blockId: string, startTime: string, endTime: string) => void
  onBlockStartTimer?: (block: TimeBlock) => void
  onEntryClick?: (entry: TimeEntry) => void
  onEntryDelete?: (entryId: string) => void
  onEmptyDoubleClick?: (startTime: string, endTime: string) => void
  isDraggingTask?: boolean
  dragOverY?: number | null
  isTimerRunning?: boolean
  runningTimer?: RunningTimerData | null
  scale?: number
  onScaleChange?: (scale: number) => void
}

// Zoom settings
const BASE_HOUR_HEIGHT = 48
const MIN_SCALE = 0.5
const MAX_SCALE = 2.0
const SCALE_STEP = 0.1

export function TimeBlockTimeline({
  timeBlocks = [],
  timeEntries = [],
  showComparison = false,
  startHour: defaultStartHour = 6,
  endHour: defaultEndHour = 24,
  onBlockClick,
  onBlockDelete,
  onBlockResize,
  onBlockStartTimer,
  onEntryClick,
  onEntryDelete,
  onEmptyDoubleClick,
  isDraggingTask = false,
  dragOverY = null,
  isTimerRunning = false,
  runningTimer = null,
  scale: propScale,
  onScaleChange,
}: TimeBlockTimelineProps) {
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const [internalScale, setInternalScale] = useState(1.0)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // Scale management
  const scale = propScale ?? internalScale
  const setScale = onScaleChange ?? setInternalScale
  const hourHeight = BASE_HOUR_HEIGHT * scale

  // Mouse wheel zoom (Ctrl+wheel)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta))
        if (newScale !== scale) {
          setScale(newScale)
        }
      }
    },
    [scale, setScale]
  )

  // Update current time (1 second when timer running, 1 minute otherwise)
  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(new Date())
    const intervalMs = runningTimer ? 1000 : 60000
    const interval = setInterval(updateCurrentTime, intervalMs)
    return () => clearInterval(interval)
  }, [runningTimer])

  // Calculate running timer entry times
  const runningEntryTimes = runningTimer
    ? (() => {
        const startDate = new Date(runningTimer.startedAt)
        const startHours = startDate.getHours()
        const startMins = startDate.getMinutes()
        const endHours = currentTime.getHours()
        const endMins = currentTime.getMinutes()
        return {
          startTime: `${startHours.toString().padStart(2, '0')}:${startMins.toString().padStart(2, '0')}`,
          endTime: `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`,
        }
      })()
    : null

  // Calculate actual time range from data
  const allTimes = [
    ...timeBlocks.flatMap((b) => [b.startTime, b.endTime]),
    ...timeEntries.flatMap((e) => [e.startTime, e.endTime]),
    ...(runningEntryTimes ? [runningEntryTimes.startTime, runningEntryTimes.endTime] : []),
  ]

  let minHour = defaultStartHour
  let maxHour = defaultEndHour

  if (allTimes.length > 0) {
    const hours = allTimes.map((t) => Math.floor(getMinutesFromTime(t) / 60))
    const dataMinHour = Math.min(...hours)
    const dataMaxHour = Math.max(...hours) + 1
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
    const startMinutes = getMinutesFromTime(start)
    const endMinutes = getMinutesFromTime(end)
    const duration = endMinutes - startMinutes
    return (duration / totalMinutes) * 100
  }

  // Scroll area height
  const visibleHours = 12
  const maxHeight = `${visibleHours * hourHeight}px`

  // Use drag/resize hook
  const {
    resizeState,
    dragState,
    containerRef,
    handleResizeStart,
    handleDragStart,
    getDisplayTimes,
  } = useTimeBlockDragResize({
    startHour,
    endHour,
    totalMinutes,
    onBlockResize,
  })

  // Droppable setup
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: 'timeblock-timeline-droppable',
  })

  // Combine refs
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      ;(containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      setDroppableRef(node)
    },
    [setDroppableRef, containerRef]
  )

  // Initial scroll position to 8:00
  useEffect(() => {
    if (scrollContainerRef.current && startHour < 8) {
      const scrollToHour = 8
      const scrollPosition = (scrollToHour - startHour) * hourHeight
      scrollContainerRef.current.scrollTop = scrollPosition
    }
  }, [startHour, hourHeight])

  return (
    <div className="relative">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-30 flex items-center gap-0.5 bg-background/95 border rounded-md shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setScale(Math.max(MIN_SCALE, scale - SCALE_STEP))}
          disabled={scale <= MIN_SCALE}
          title="縮小"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <button
          className="px-1.5 text-xs text-muted-foreground hover:text-foreground min-w-[40px] text-center"
          onClick={() => setScale(1.0)}
          title="リセット (100%)"
        >
          {Math.round(scale * 100)}%
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setScale(Math.min(MAX_SCALE, scale + SCALE_STEP))}
          disabled={scale >= MAX_SCALE}
          title="拡大"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Scroll container */}
      <div
        ref={scrollContainerRef}
        className="relative flex overflow-y-auto"
        style={{ maxHeight }}
        onWheel={handleWheel}
      >
        {/* Time axis */}
        <TimeBlockTimelineGrid hours={hours} hourHeight={hourHeight} />

        {/* Time block display area */}
        <div
          ref={setRefs}
          data-timeline-container
          data-start-hour={startHour}
          data-end-hour={endHour}
          className={cn(
            'flex-1 relative border-l',
            isDraggingTask && 'ring-2 ring-primary/30 ring-inset bg-primary/5',
            isOver && 'ring-primary/50 bg-primary/10',
            onEmptyDoubleClick && 'cursor-pointer'
          )}
          style={{ height: `${hours.length * hourHeight}px` }}
          onDoubleClick={(e) => {
            if (!onEmptyDoubleClick || !containerRef.current) return
            const target = e.target as HTMLElement
            if (target.closest('[data-block]')) return
            const rect = containerRef.current.getBoundingClientRect()
            const { startTime, endTime } = calculateTimeFromY(
              e.clientY,
              rect,
              startHour,
              endHour
            )
            onEmptyDoubleClick(startTime, endTime)
          }}
        >
          {/* Hour lines */}
          {hours.map((hour, index) => (
            <div
              key={hour}
              className="absolute w-full border-t border-dashed border-muted"
              style={{ top: `${(index / hours.length) * 100}%` }}
            />
          ))}

          {/* Current time indicator */}
          {(() => {
            const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
            const timeRangeStart = startHour * 60
            const timeRangeEnd = endHour * 60

            if (currentMinutes >= timeRangeStart && currentMinutes <= timeRangeEnd) {
              const topPosition = ((currentMinutes - timeRangeStart) / totalMinutes) * 100

              return (
                <div
                  className="absolute left-0 right-0 z-30 pointer-events-none"
                  style={{ top: `${topPosition}%` }}
                >
                  <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-primary" />
                  <div className="absolute left-0 right-0 border-t border-dotted border-primary" />
                </div>
              )
            }
            return null
          })()}

          {/* Time blocks (plans) */}
          {timeBlocks.map((block) => {
            const displayTimes = getDisplayTimes(block)
            const isResizing = resizeState?.blockId === block.id
            const isDragging = dragState?.blockId === block.id
            const isActive = isResizing || isDragging

            return (
              <TimeBlockItem
                key={block.id}
                block={block}
                displayTimes={displayTimes}
                isActive={isActive}
                isDragging={isDragging}
                showComparison={showComparison}
                isTimerRunning={isTimerRunning}
                onBlockClick={onBlockClick}
                onBlockDelete={onBlockDelete}
                onBlockResize={onBlockResize}
                onBlockStartTimer={onBlockStartTimer}
                onDragStart={handleDragStart}
                onResizeStart={handleResizeStart}
                getTopPosition={getTopPosition}
                getHeight={getHeight}
              />
            )
          })}

          {/* Time entries (actuals) */}
          {showComparison &&
            timeEntries.map((entry) => {
              const hasGoal = !!(entry.goalId && entry.goalColor)

              return (
                <div
                  key={entry.id}
                  data-block
                  className={cn(
                    'absolute left-[52%] right-1 rounded-md px-2 py-1 text-xs group overflow-hidden',
                    !hasGoal && 'border border-dashed border-muted-foreground/40'
                  )}
                  style={{
                    backgroundColor: hasGoal
                      ? `color-mix(in srgb, ${entry.goalColor} 12%, transparent)`
                      : 'hsl(var(--muted))',
                    top: `${getTopPosition(entry.startTime)}%`,
                    height: `${getHeight(entry.startTime, entry.endTime)}%`,
                    minHeight: '24px',
                  }}
                >
                  {hasGoal && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
                      style={{ backgroundColor: entry.goalColor }}
                    />
                  )}

                  <div className={cn('relative', hasGoal && 'pl-1')}>
                    <div className="flex items-center gap-1">
                      {hasGoal ? (
                        <GoalBadge name={entry.goalName!} color={entry.goalColor!} size="sm" />
                      ) : (
                        <span className="text-muted-foreground text-[10px] px-1 py-0.5 rounded bg-muted-foreground/10">
                          目標なし
                        </span>
                      )}
                      {entry.milestoneName && (
                        <span
                          className="text-[10px] text-muted-foreground truncate max-w-[80px]"
                          title={entry.milestoneName}
                        >
                          {entry.milestoneName}
                        </span>
                      )}
                      <span className="truncate font-medium flex-1">{entry.taskName}</span>
                      {(onEntryClick || onEntryDelete) && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 ml-1">
                          {onEntryClick && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEntryClick(entry)
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {onEntryDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEntryDelete(entry.id)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                    </div>
                  </div>
                </div>
              )
            })}

          {/* Running timer (virtual entry) */}
          {showComparison &&
            runningTimer &&
            runningEntryTimes &&
            (() => {
              const hasGoal = !!(runningTimer.goalId && runningTimer.goalColor)
              const heightPercent = getHeight(runningEntryTimes.startTime, runningEntryTimes.endTime)
              const effectiveHeight = Math.max(heightPercent, 2)

              return (
                <div
                  data-block
                  className={cn(
                    'absolute left-[52%] right-1 rounded-md px-2 py-1 text-xs overflow-hidden',
                    'animate-pulse',
                    'ring-2 ring-primary/50',
                    !hasGoal && 'border border-dashed border-muted-foreground/40'
                  )}
                  style={{
                    backgroundColor: hasGoal
                      ? `color-mix(in srgb, ${runningTimer.goalColor} 20%, transparent)`
                      : 'hsl(var(--primary) / 0.15)',
                    top: `${getTopPosition(runningEntryTimes.startTime)}%`,
                    height: `${effectiveHeight}%`,
                    minHeight: '24px',
                  }}
                >
                  {hasGoal && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
                      style={{ backgroundColor: runningTimer.goalColor }}
                    />
                  )}

                  <div className={cn('relative', hasGoal && 'pl-1')}>
                    <div className="flex items-center gap-1">
                      {hasGoal ? (
                        <GoalBadge
                          name={runningTimer.goalName!}
                          color={runningTimer.goalColor!}
                          size="sm"
                        />
                      ) : (
                        <span className="text-primary text-[10px] px-1 py-0.5 rounded bg-primary/10 font-medium">
                          作業中
                        </span>
                      )}
                      {runningTimer.milestoneName && (
                        <span
                          className="text-[10px] text-muted-foreground truncate max-w-[80px]"
                          title={runningTimer.milestoneName}
                        >
                          {runningTimer.milestoneName}
                        </span>
                      )}
                      <span className="truncate font-medium flex-1">{runningTimer.taskName}</span>
                      <span className="text-primary text-[10px] font-medium flex-shrink-0">REC</span>
                    </div>
                    <div className="text-muted-foreground">
                      {formatTime(runningEntryTimes.startTime)} - 作業中
                    </div>
                  </div>
                </div>
              )
            })()}

          {/* Drop indicator */}
          {isDraggingTask &&
            dragOverY !== null &&
            containerRef.current &&
            (() => {
              const rect = containerRef.current.getBoundingClientRect()
              const relativeY = Math.max(0, Math.min(dragOverY - rect.top, rect.height))
              const percentage = relativeY / rect.height
              const rawMinutes = percentage * totalMinutes + startHour * 60
              const snappedMinutes = snapToInterval(
                Math.max(startHour * 60, Math.min(endHour * 60 - 60, rawMinutes))
              )
              const timeString = minutesToTimeString(snappedMinutes)
              const topPercentage = ((snappedMinutes - startHour * 60) / totalMinutes) * 100

              return (
                <div
                  className="absolute left-0 right-0 pointer-events-none z-20"
                  style={{ top: `${topPercentage}%` }}
                >
                  <div className="absolute left-0 right-0 h-0.5 bg-primary" />
                  <div className="absolute -left-16 -top-2.5 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded font-medium">
                    {timeString}
                  </div>
                  <div
                    className="absolute left-1 right-1 rounded-md border-2 border-dashed border-primary bg-primary/10"
                    style={{
                      height: `${hourHeight}px`,
                      minHeight: `${hourHeight}px`,
                    }}
                  />
                </div>
              )
            })()}
        </div>
      </div>
    </div>
  )
}

// Re-export calculateTimeFromY for external use
export { calculateTimeFromY }
