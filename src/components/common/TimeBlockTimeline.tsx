import { useState, useCallback, useEffect, useRef } from 'react'
import type { TimeBlock, TimeEntry } from '@/types'
import { cn } from '@/lib/utils'
import { Plus, Minus } from 'lucide-react'
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
  calculateOverlapLayout,
} from './timeline'
import { TimelineItemContent } from './timeline/TimelineItemContent'
import type { ActionButton } from './timeline/TimelineItemContent'
import type { RunningTimerData } from './timeline'
import { getLocalTime } from '@/lib/timezone'
import { useSettingsStore } from '@/stores/useSettingsStore'

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
const SCALE_STEP = 0.25

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
  const timezone = useSettingsStore((s) => s.timezone) || 'Asia/Tokyo'

  // Helper to extract local time from an ISO datetime
  const toLocalTime = useCallback((isoDatetime: string) => getLocalTime(isoDatetime, timezone), [timezone])

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
    ...timeBlocks.flatMap((b) => [toLocalTime(b.startDatetime), toLocalTime(b.endDatetime)]),
    ...timeEntries.flatMap((e) => [toLocalTime(e.startDatetime), toLocalTime(e.endDatetime)]),
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

  // Scroll area height (fixed size regardless of zoom)
  const visibleHours = 12
  const maxHeight = `${visibleHours * BASE_HOUR_HEIGHT}px`

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
                  <div className="absolute -left-1 -top-[5px] w-[10px] h-[10px] rounded-full bg-brand shadow-[0_0_6px_hsl(var(--brand)/0.5)]" />
                  <div className="absolute left-0 right-0 border-t-2 border-dashed" style={{ borderColor: 'hsl(var(--brand))' }} />
                </div>
              )
            }
            return null
          })()}

          {/* Time blocks (plans) */}
          {(() => {
            const overlapLayout = calculateOverlapLayout(
              timeBlocks.map((b) => {
                const dt = getDisplayTimes(b)
                return { id: b.id, startTime: dt.startTime, endTime: dt.endTime }
              })
            )

            return timeBlocks.map((block) => {
              const displayTimes = getDisplayTimes(block)
              const isResizing = resizeState?.blockId === block.id
              const isDragging = dragState?.blockId === block.id
              const isActive = isResizing || isDragging
              const layout = overlapLayout.get(block.id)

              return (
                <TimeBlockItem
                  key={block.id}
                  block={block}
                  displayTimes={displayTimes}
                  isActive={isActive}
                  isDragging={isDragging}
                  showComparison={showComparison}
                  isTimerRunning={isTimerRunning}
                  overlapColumn={layout?.column}
                  overlapTotalColumns={layout?.totalColumns}
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
            })
          })()}

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
                    top: `${getTopPosition(toLocalTime(entry.startDatetime))}%`,
                    height: `${getHeight(toLocalTime(entry.startDatetime), toLocalTime(entry.endDatetime))}%`,
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
                    <TimelineItemContent
                      taskName={entry.taskName}
                      goalId={entry.goalId}
                      goalName={entry.goalName}
                      goalColor={entry.goalColor}
                      milestoneName={entry.milestoneName}
                      startTimeLabel={formatTime(toLocalTime(entry.startDatetime))}
                      endTimeLabel={formatTime(toLocalTime(entry.endDatetime))}
                      actions={(() => {
                        const a: ActionButton[] = []
                        if (onEntryClick) a.push({ type: 'edit', onClick: () => onEntryClick(entry) })
                        if (onEntryDelete) a.push({ type: 'delete', onClick: () => onEntryDelete(entry.id), confirmMessage: 'この実績を削除しますか？' })
                        return a.length > 0 ? a : undefined
                      })()}
                    />
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
                    <TimelineItemContent
                      taskName={runningTimer.taskName}
                      goalId={runningTimer.goalId}
                      goalName={runningTimer.goalName}
                      goalColor={runningTimer.goalColor}
                      milestoneName={runningTimer.milestoneName}
                      startTimeLabel={formatTime(runningEntryTimes.startTime)}
                      endTimeLabel="作業中"
                      noGoalLabel="作業中"
                      trailingBadge={
                        <span className="text-primary text-[10px] font-medium flex-shrink-0">REC</span>
                      }
                    />
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
