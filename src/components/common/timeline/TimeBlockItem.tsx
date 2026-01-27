import { Edit, Trash2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GoalBadge } from '@/components/common/GoalBadge'
import { cn } from '@/lib/utils'
import { formatTime } from './utils'
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

  return (
    <div
      data-block
      className={cn(
        'absolute left-1 right-1 rounded-md px-2 py-1 text-xs group overflow-hidden',
        showComparison ? 'left-1 right-[52%]' : 'right-1',
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
        <div className="flex items-center gap-1">
          {hasGoal ? (
            <GoalBadge name={block.goalName!} color={block.goalColor!} size="sm" />
          ) : (
            <span className="text-muted-foreground text-[10px] px-1 py-0.5 rounded bg-muted-foreground/10">
              目標なし
            </span>
          )}
          {block.milestoneName && (
            <span
              className="text-[10px] text-muted-foreground truncate max-w-[80px]"
              title={block.milestoneName}
            >
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
          onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
        >
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0.5 w-8 h-1 bg-muted-foreground/30 rounded-full opacity-0 group-hover/handle:opacity-100" />
        </div>
      )}
    </div>
  )
}
