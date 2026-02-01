import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { formatTime } from './utils'
import { TimelineItemContent } from './TimelineItemContent'
import type { ActionButton } from './TimelineItemContent'
import type { TimeBlockItemProps, ResizeEdge } from './types'

/**
 * TimeBlockItem - Renders a single time block with drag/resize handles
 */
export function TimeBlockItem({
  block,
  displayTimes,
  isActive,
  isDragging,
  showComparison,
  isTimerRunning,
  overlapColumn = 0,
  overlapTotalColumns = 1,
  onBlockClick,
  onBlockDelete,
  onBlockResize,
  onBlockStartTimer,
  onDragStart,
  onResizeStart,
  getTopPosition,
  getHeight,
}: TimeBlockItemProps) {
  const hasGoal = !!(block.goalId && block.goalColor)

  const handleDragMouseDown = (e: React.MouseEvent) => {
    if (onBlockResize) {
      onDragStart(e, block)
    }
  }

  const handleResizeMouseDown = (e: React.MouseEvent, edge: ResizeEdge) => {
    e.preventDefault()
    e.stopPropagation()
    onResizeStart(e, block, edge)
  }

  // Calculate horizontal position for overlapping blocks
  const rightBound = showComparison ? 52 : 0 // percentage from right
  const leftPadding = 4 // px
  const rightPadding = showComparison ? 0 : 4 // px
  const hasOverlap = overlapTotalColumns > 1

  const overlapStyle: React.CSSProperties = hasOverlap
    ? {
        left: `calc(${leftPadding}px + ${(overlapColumn / overlapTotalColumns) * 100}% * ${(100 - rightBound) / 100})`,
        width: `calc(${(1 / overlapTotalColumns) * 100}% * ${(100 - rightBound) / 100} - ${leftPadding + rightPadding}px)`,
        right: 'auto',
      }
    : {}

  const actions = useMemo(() => {
    if (isActive) return undefined
    const result: ActionButton[] = []
    if (onBlockStartTimer && !isTimerRunning) {
      result.push({ type: 'timer', onClick: () => onBlockStartTimer(block) })
    }
    if (onBlockClick) {
      result.push({ type: 'edit', onClick: () => onBlockClick(block) })
    }
    if (onBlockDelete) {
      result.push({
        type: 'delete',
        onClick: () => onBlockDelete(block.id),
        confirmMessage: 'このタイムブロックを削除しますか？',
      })
    }
    return result.length > 0 ? result : undefined
  }, [block, isActive, isTimerRunning, onBlockClick, onBlockDelete, onBlockStartTimer])

  return (
    <div
      data-block
      className={cn(
        'absolute rounded-md px-2 py-1 text-xs group overflow-hidden',
        !hasOverlap && (showComparison ? 'left-1 right-[52%]' : 'left-1 right-1'),
        onBlockResize && !isActive && 'cursor-grab',
        isActive && 'ring-2 ring-primary z-10',
        isDragging && 'cursor-grabbing',
        // No goal: dashed border
        !hasGoal && 'border border-dashed border-muted-foreground/40'
      )}
      style={{
        backgroundColor: hasGoal
          ? `color-mix(in srgb, ${block.goalColor} 12%, transparent)`
          : 'hsl(var(--muted))',
        top: `${getTopPosition(displayTimes.startTime)}%`,
        height: `${getHeight(displayTimes.startTime, displayTimes.endTime)}%`,
        minHeight: '24px',
        ...overlapStyle,
      }}
      onMouseDown={(e) => {
        if (onBlockResize && e.target === e.currentTarget) {
          handleDragMouseDown(e)
        }
      }}
    >
      {/* Goal color left border */}
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
          onMouseDown={(e) => handleResizeMouseDown(e, 'top')}
        >
          <div className="absolute left-1/2 -translate-x-1/2 top-0.5 w-8 h-1 bg-muted-foreground/30 rounded-full opacity-0 group-hover/handle:opacity-100" />
        </div>
      )}

      {/* Content area */}
      <div
        className={cn(
          'relative',
          hasGoal && 'pl-1',
          onBlockResize && !isActive && 'cursor-grab active:cursor-grabbing'
        )}
        onMouseDown={handleDragMouseDown}
      >
        <TimelineItemContent
          taskName={block.taskName}
          goalId={block.goalId}
          goalName={block.goalName}
          goalColor={block.goalColor}
          milestoneName={block.milestoneName}
          startTimeLabel={formatTime(displayTimes.startTime)}
          endTimeLabel={formatTime(displayTimes.endTime)}
          actions={actions}
        />
      </div>

      {/* Bottom resize handle */}
      {onBlockResize && (
        <div
          className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize group/handle hover:bg-primary/20 rounded-b-md"
          onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
        >
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0.5 w-8 h-1 bg-muted-foreground/30 rounded-full opacity-0 group-hover/handle:opacity-100" />
        </div>
      )}
    </div>
  )
}
