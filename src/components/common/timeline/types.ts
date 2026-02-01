import type { TimeBlock, TimeEntry } from '@/types'

/**
 * Shared types for timeline components
 */

// Running timer data
export interface RunningTimerData {
  taskName: string
  startedAt: string // ISO timestamp
  goalId?: string
  goalName?: string
  goalColor?: string
  milestoneName?: string
}

// Resize edge type
export type ResizeEdge = 'top' | 'bottom'

// Resize state for drag/resize operations
export interface ResizeState {
  blockId: string
  edge: ResizeEdge
  initialY: number
  initialStartTime: string
  initialEndTime: string
}

// Drag state for moving blocks
export interface DragState {
  blockId: string
  initialY: number
  initialStartTime: string
  initialEndTime: string
  duration: number // in minutes
}

// Preview time during drag/resize
export interface PreviewTime {
  startTime: string
  endTime: string
}

// Time block display times (can be preview or actual)
export interface DisplayTimes {
  startTime: string
  endTime: string
}

// Props for TimeBlockItem component
export interface TimeBlockItemProps {
  block: TimeBlock
  displayTimes: DisplayTimes
  isActive: boolean
  isDragging: boolean
  showComparison: boolean
  isTimerRunning: boolean
  overlapColumn?: number
  overlapTotalColumns?: number
  onBlockClick?: (block: TimeBlock) => void
  onBlockDelete?: (blockId: string) => void
  onBlockResize?: (blockId: string, startTime: string, endTime: string) => void
  onBlockStartTimer?: (block: TimeBlock) => void
  onDragStart: (e: React.MouseEvent, block: TimeBlock) => void
  onResizeStart: (e: React.MouseEvent, block: TimeBlock, edge: ResizeEdge) => void
  getTopPosition: (time: string) => number
  getHeight: (start: string, end: string) => number
}

// Props for TimeEntryItem component
export interface TimeEntryItemProps {
  entry: TimeEntry
  onEntryClick?: (entry: TimeEntry) => void
  onEntryDelete?: (entryId: string) => void
  getTopPosition: (time: string) => number
  getHeight: (start: string, end: string) => number
}

// Props for running timer display
export interface RunningTimerItemProps {
  runningTimer: RunningTimerData
  startTime: string
  endTime: string
  getTopPosition: (time: string) => number
  getHeight: (start: string, end: string) => number
}

// Grid props
export interface TimeBlockTimelineGridProps {
  hours: number[]
  hourHeight: number
}
