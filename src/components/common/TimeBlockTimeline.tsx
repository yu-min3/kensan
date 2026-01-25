import { useState, useCallback, useEffect, useRef } from 'react'
import type { TimeBlock, TimeEntry } from '@/types'
import { GoalBadge } from './GoalBadge'
import { cn } from '@/lib/utils'
import { Edit, Trash2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDroppable } from '@dnd-kit/core'

// 実行中タイマーの型
interface RunningTimerData {
  taskName: string
  startedAt: string // ISO timestamp
  goalId?: string
  goalName?: string
  goalColor?: string
  milestoneName?: string
}

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
  // 空きエリアダブルクリックで予定作成
  onEmptyDoubleClick?: (startTime: string, endTime: string) => void
  // ドラッグ&ドロップ用
  isDraggingTask?: boolean
  dragOverY?: number | null
  // タイマー実行中フラグ
  isTimerRunning?: boolean
  // 実行中タイマー（仮想エントリとして表示）
  runningTimer?: RunningTimerData | null
}

type ResizeEdge = 'top' | 'bottom'

interface ResizeState {
  blockId: string
  edge: ResizeEdge
  initialY: number
  initialStartTime: string
  initialEndTime: string
}

interface DragState {
  blockId: string
  initialY: number
  initialStartTime: string
  initialEndTime: string
  duration: number // in minutes
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
}: TimeBlockTimelineProps) {
  const [resizeState, setResizeState] = useState<ResizeState | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [previewTime, setPreviewTime] = useState<{ startTime: string; endTime: string } | null>(null)
  const [currentTime, setCurrentTime] = useState<Date>(new Date())
  const containerRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  // 現在時刻を更新（タイマー実行中は1秒ごと、それ以外は1分ごと）
  useEffect(() => {
    const updateCurrentTime = () => setCurrentTime(new Date())
    const intervalMs = runningTimer ? 1000 : 60000
    const interval = setInterval(updateCurrentTime, intervalMs)
    return () => clearInterval(interval)
  }, [runningTimer])

  // ドロップゾーン設定
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: 'timeblock-timeline-droppable',
  })

  // 複数のrefを結合するコールバック
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node
    setDroppableRef(node)
  }, [setDroppableRef])

  // 実行中タイマーから仮想エントリの時間を計算
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

  // Calculate actual time range from data to ensure all items are visible
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

  // 常にスクロール可能（表示エリアの高さを固定）
  // 12時間分の高さを表示エリアとして確保（6:00〜18:00相当）
  const visibleHours = 12
  const maxHeight = `${visibleHours * 48}px`

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

  // Handle drag start (for moving the entire block)
  const handleDragStart = useCallback(
    (e: React.MouseEvent, block: TimeBlock) => {
      e.preventDefault()
      e.stopPropagation()
      const duration = getDurationMinutes(block.startTime, block.endTime)
      setDragState({
        blockId: block.id,
        initialY: e.clientY,
        initialStartTime: block.startTime,
        initialEndTime: block.endTime,
        duration,
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

  // Handle drag move (for moving the entire block)
  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState) return

      const newMinutes = yToMinutes(e.clientY)
      const initialStartMinutes = getMinutesFromTime(dragState.initialStartTime)

      // Calculate the offset from where we initially clicked
      // We need to figure out where in the block we clicked and maintain that offset
      const initialClickMinutes = yToMinutes(dragState.initialY)
      const offsetFromStart = initialClickMinutes - initialStartMinutes

      // New start time is the new mouse position minus the offset
      let newStartMinutes = newMinutes - offsetFromStart
      let newEndMinutes = newStartMinutes + dragState.duration

      // Clamp to valid range
      if (newStartMinutes < startHour * 60) {
        newStartMinutes = startHour * 60
        newEndMinutes = newStartMinutes + dragState.duration
      }
      if (newEndMinutes > endHour * 60) {
        newEndMinutes = endHour * 60
        newStartMinutes = newEndMinutes - dragState.duration
      }

      // Snap to 15-minute intervals
      newStartMinutes = snapToInterval(newStartMinutes)
      newEndMinutes = newStartMinutes + dragState.duration

      setPreviewTime({
        startTime: minutesToTimeString(newStartMinutes),
        endTime: minutesToTimeString(newEndMinutes),
      })
    },
    [dragState, yToMinutes, startHour, endHour]
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

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (dragState && previewTime && onBlockResize) {
      const hasChanged =
        previewTime.startTime !== dragState.initialStartTime ||
        previewTime.endTime !== dragState.initialEndTime
      if (hasChanged) {
        onBlockResize(dragState.blockId, previewTime.startTime, previewTime.endTime)
      }
    }
    setDragState(null)
    setPreviewTime(null)
  }, [dragState, previewTime, onBlockResize])

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

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleDragMove)
      window.addEventListener('mouseup', handleDragEnd)
      document.body.style.cursor = 'grab'
      document.body.style.userSelect = 'none'
      return () => {
        window.removeEventListener('mousemove', handleDragMove)
        window.removeEventListener('mouseup', handleDragEnd)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [dragState, handleDragMove, handleDragEnd])

  // 初期スクロール位置を8:00に設定
  useEffect(() => {
    if (scrollContainerRef.current && startHour < 8) {
      const hourHeight = 48 // px per hour
      const scrollToHour = 8
      const scrollPosition = (scrollToHour - startHour) * hourHeight
      scrollContainerRef.current.scrollTop = scrollPosition
    }
  }, [startHour])

  // Get display times for a block (use preview if resizing or dragging)
  const getDisplayTimes = (block: TimeBlock) => {
    if ((resizeState?.blockId === block.id || dragState?.blockId === block.id) && previewTime) {
      return previewTime
    }
    return { startTime: block.startTime, endTime: block.endTime }
  }

  return (
    <div
      ref={scrollContainerRef}
      className="relative flex overflow-y-auto"
      style={{ maxHeight }}
    >
      {/* 時間軸 */}
      <div className="w-16 flex-shrink-0">
        {hours.map((hour) => (
          <div
            key={hour}
            className="h-12 border-t text-xs text-muted-foreground flex items-start pt-1 pr-2 justify-end"
          >
            {hour === 24 ? '0:00' : `${hour}:00`}
          </div>
        ))}
      </div>

      {/* タイムブロック表示エリア */}
      <div
        ref={setRefs}
        data-timeline-container
        className={cn(
          'flex-1 relative border-l',
          isDraggingTask && 'ring-2 ring-primary/30 ring-inset bg-primary/5',
          isOver && 'ring-primary/50 bg-primary/10',
          onEmptyDoubleClick && 'cursor-pointer'
        )}
        style={{ height: `${hours.length * 48}px` }}
        onDoubleClick={(e) => {
          if (!onEmptyDoubleClick || !containerRef.current) return

          // タイムブロックやエントリー上のダブルクリックは無視（data-block属性で判定）
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
        {/* 時間線 */}
        {hours.map((hour, index) => (
          <div
            key={hour}
            className="absolute w-full border-t border-dashed border-muted"
            style={{ top: `${(index / hours.length) * 100}%` }}
          />
        ))}

        {/* 現在時刻インジケーター */}
        {(() => {
          const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes()
          const timeRangeStart = startHour * 60
          const timeRangeEnd = endHour * 60

          // 現在時刻が表示範囲内の場合のみ表示
          if (currentMinutes >= timeRangeStart && currentMinutes <= timeRangeEnd) {
            const topPosition = ((currentMinutes - timeRangeStart) / totalMinutes) * 100

            return (
              <div
                className="absolute left-0 right-0 z-30 pointer-events-none"
                style={{ top: `${topPosition}%` }}
              >
                {/* 小さな丸マーカー */}
                <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-primary" />
                {/* 現在時刻のドット線 */}
                <div
                  className="absolute left-0 right-0 border-t border-dotted border-primary"
                />
              </div>
            )
          }
          return null
        })()}

        {/* タイムブロック（計画） */}
        {timeBlocks.map((block) => {
          const displayTimes = getDisplayTimes(block)
          const isResizing = resizeState?.blockId === block.id
          const isDragging = dragState?.blockId === block.id
          const isActive = isResizing || isDragging
          const hasGoal = !!(block.goalId && block.goalColor)

          return (
            <div
              key={block.id}
              data-block
              className={cn(
                'absolute left-1 right-1 rounded-md px-2 py-1 text-xs group overflow-hidden',
                showComparison ? 'left-1 right-[52%]' : 'right-1',
                onBlockResize && !isActive && 'cursor-grab',
                isActive && 'ring-2 ring-primary z-10',
                isDragging && 'cursor-grabbing',
                // 目標なしの場合は点線ボーダー
                !hasGoal && 'border border-dashed border-muted-foreground/40'
              )}
              style={{
                // 目標ありの場合: 目標色の薄い背景
                // 目標なしの場合: mutedの背景
                backgroundColor: hasGoal
                  ? `color-mix(in srgb, ${block.goalColor} 12%, transparent)`
                  : 'hsl(var(--muted))',
                top: `${getTopPosition(displayTimes.startTime)}%`,
                height: `${getHeight(displayTimes.startTime, displayTimes.endTime)}%`,
                minHeight: '24px',
              }}
              onMouseDown={(e) => {
                // Only start drag if clicking on the block itself (not on buttons or resize handles)
                if (onBlockResize && e.target === e.currentTarget) {
                  handleDragStart(e, block)
                }
              }}
            >
              {/* 目標ありの場合: 左ボーダーに目標色 */}
              {hasGoal && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
                  style={{ backgroundColor: block.goalColor }}
                />
              )}

              {/* Top resize handle */}
              {onBlockResize && (
                <div
                  className="absolute left-0 right-0 top-0 h-2 cursor-ns-resize group/handle hover:bg-primary/20 rounded-t-md"
                  onMouseDown={(e) => handleResizeStart(e, block, 'top')}
                >
                  <div className="absolute left-1/2 -translate-x-1/2 top-0.5 w-8 h-1 bg-muted-foreground/30 rounded-full opacity-0 group-hover/handle:opacity-100" />
                </div>
              )}

              {/* Draggable content area */}
              <div
                className={cn(
                  'relative',
                  hasGoal && 'pl-1', // 左ボーダー分のパディング
                  onBlockResize && !isActive && 'cursor-grab active:cursor-grabbing'
                )}
                onMouseDown={(e) => {
                  if (onBlockResize) {
                    handleDragStart(e, block)
                  }
                }}
              >
                <div className="flex items-center gap-1">
                  {hasGoal ? (
                    <GoalBadge name={block.goalName!} color={block.goalColor!} size="sm" />
                  ) : (
                    <span className="text-muted-foreground text-[10px] px-1 py-0.5 rounded bg-muted-foreground/10">
                      目標なし
                    </span>
                  )}
                  {block.milestoneName && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[80px]" title={block.milestoneName}>
                      {block.milestoneName}
                    </span>
                  )}
                  <span className="truncate font-medium flex-1">{block.taskName}</span>
                  {(onBlockClick || onBlockDelete || onBlockStartTimer) && !isActive && (
                    <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 ml-1">
                      {onBlockStartTimer && !isTimerRunning && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 text-primary hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            onBlockStartTimer(block)
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          title="タイマー開始"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                      {onBlockClick && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            onBlockClick(block)
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          title="編集"
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
                          onMouseDown={(e) => e.stopPropagation()}
                          title="削除"
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
          timeEntries.map((entry) => {
            const hasGoal = !!(entry.goalId && entry.goalColor)

            return (
              <div
                key={entry.id}
                data-block
                className={cn(
                  'absolute left-[52%] right-1 rounded-md px-2 py-1 text-xs group overflow-hidden',
                  // 目標なしの場合は点線ボーダー
                  !hasGoal && 'border border-dashed border-muted-foreground/40'
                )}
                style={{
                  // 目標ありの場合: 目標色の薄い背景
                  // 目標なしの場合: mutedの背景
                  backgroundColor: hasGoal
                    ? `color-mix(in srgb, ${entry.goalColor} 12%, transparent)`
                    : 'hsl(var(--muted))',
                  top: `${getTopPosition(entry.startTime)}%`,
                  height: `${getHeight(entry.startTime, entry.endTime)}%`,
                  minHeight: '24px',
                }}
              >
                {/* 目標ありの場合: 左ボーダーに目標色 */}
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
                      <span className="text-[10px] text-muted-foreground truncate max-w-[80px]" title={entry.milestoneName}>
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

        {/* 実行中タイマー（仮想エントリ） */}
        {showComparison && runningTimer && runningEntryTimes && (() => {
          const hasGoal = !!(runningTimer.goalId && runningTimer.goalColor)
          const heightPercent = getHeight(runningEntryTimes.startTime, runningEntryTimes.endTime)
          // 最小高さを確保（開始直後は短いため）
          const effectiveHeight = Math.max(heightPercent, 2)

          return (
            <div
              data-block
              className={cn(
                'absolute left-[52%] right-1 rounded-md px-2 py-1 text-xs overflow-hidden',
                'animate-pulse',
                'ring-2 ring-primary/50',
                // 目標なしの場合は点線ボーダー
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
              {/* 目標ありの場合: 左ボーダーに目標色 */}
              {hasGoal && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-md"
                  style={{ backgroundColor: runningTimer.goalColor }}
                />
              )}

              <div className={cn('relative', hasGoal && 'pl-1')}>
                <div className="flex items-center gap-1">
                  {hasGoal ? (
                    <GoalBadge name={runningTimer.goalName!} color={runningTimer.goalColor!} size="sm" />
                  ) : (
                    <span className="text-primary text-[10px] px-1 py-0.5 rounded bg-primary/10 font-medium">
                      作業中
                    </span>
                  )}
                  {runningTimer.milestoneName && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[80px]" title={runningTimer.milestoneName}>
                      {runningTimer.milestoneName}
                    </span>
                  )}
                  <span className="truncate font-medium flex-1">{runningTimer.taskName}</span>
                  <span className="text-primary text-[10px] font-medium flex-shrink-0">
                    REC
                  </span>
                </div>
                <div className="text-muted-foreground">
                  {formatTime(runningEntryTimes.startTime)} - 作業中
                </div>
              </div>
            </div>
          )
        })()}

        {/* ドロップインジケーター */}
        {isDraggingTask && dragOverY !== null && containerRef.current && (
          (() => {
            const rect = containerRef.current.getBoundingClientRect()
            const relativeY = Math.max(0, Math.min(dragOverY - rect.top, rect.height))
            const percentage = relativeY / rect.height
            const rawMinutes = percentage * totalMinutes + startHour * 60
            const snappedMinutes = snapToInterval(Math.max(startHour * 60, Math.min(endHour * 60 - 60, rawMinutes)))
            const timeString = minutesToTimeString(snappedMinutes)
            const topPercentage = ((snappedMinutes - startHour * 60) / totalMinutes) * 100

            return (
              <div
                className="absolute left-0 right-0 pointer-events-none z-20"
                style={{ top: `${topPercentage}%` }}
              >
                {/* 時刻インジケーター線 */}
                <div className="absolute left-0 right-0 h-0.5 bg-primary" />
                {/* 時刻ラベル */}
                <div className="absolute -left-16 -top-2.5 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded font-medium">
                  {timeString}
                </div>
                {/* 予定プレビュー（1時間分） */}
                <div
                  className="absolute left-1 right-1 rounded-md border-2 border-dashed border-primary bg-primary/10"
                  style={{
                    height: `${(60 / totalMinutes) * 100 * (hours.length * 48) / 100}px`,
                    minHeight: '48px',
                  }}
                />
              </div>
            )
          })()
        )}
      </div>
    </div>
  )
}

// Y座標から時刻に変換するヘルパー（外部から使用可能）
export function calculateTimeFromY(
  clientY: number,
  containerRect: DOMRect,
  startHour: number,
  endHour: number,
  interval: number = 15
): { startTime: string; endTime: string } {
  const totalMinutes = (endHour - startHour) * 60
  const relativeY = Math.max(0, Math.min(clientY - containerRect.top, containerRect.height))
  const percentage = relativeY / containerRect.height
  const rawMinutes = percentage * totalMinutes + startHour * 60
  const snappedMinutes = Math.round(rawMinutes / interval) * interval
  const clampedMinutes = Math.max(startHour * 60, Math.min(endHour * 60 - 60, snappedMinutes))

  const startTimeMinutes = clampedMinutes
  const endTimeMinutes = Math.min(clampedMinutes + 60, endHour * 60)

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  return {
    startTime: formatTime(startTimeMinutes),
    endTime: formatTime(endTimeMinutes),
  }
}
