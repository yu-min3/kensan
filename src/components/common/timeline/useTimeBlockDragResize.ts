import { useState, useCallback, useEffect, useRef } from 'react'
import type { TimeBlock } from '@/types'
import type { ResizeState, DragState, PreviewTime, ResizeEdge } from './types'
import { getMinutesFromTime, minutesToTimeString, snapToInterval, getDurationMinutes } from './utils'

interface UseTimeBlockDragResizeProps {
  startHour: number
  endHour: number
  totalMinutes: number
  onBlockResize?: (blockId: string, startTime: string, endTime: string) => void
}

interface UseTimeBlockDragResizeReturn {
  resizeState: ResizeState | null
  dragState: DragState | null
  previewTime: PreviewTime | null
  containerRef: React.RefObject<HTMLDivElement | null>
  handleResizeStart: (e: React.MouseEvent, block: TimeBlock, edge: ResizeEdge) => void
  handleDragStart: (e: React.MouseEvent, block: TimeBlock) => void
  getDisplayTimes: (block: TimeBlock) => { startTime: string; endTime: string }
}

/**
 * Custom hook for managing drag and resize operations on time blocks
 */
export function useTimeBlockDragResize({
  startHour,
  endHour,
  totalMinutes,
  onBlockResize,
}: UseTimeBlockDragResizeProps): UseTimeBlockDragResizeReturn {
  const [resizeState, setResizeState] = useState<ResizeState | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [previewTime, setPreviewTime] = useState<PreviewTime | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

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

  // Handle drag start
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
        newStartMinutes = Math.min(newMinutes, initialEndMinutes - 15)
      } else {
        newEndMinutes = Math.max(newMinutes, initialStartMinutes + 15)
      }

      setPreviewTime({
        startTime: minutesToTimeString(newStartMinutes),
        endTime: minutesToTimeString(newEndMinutes),
      })
    },
    [resizeState, yToMinutes]
  )

  // Handle drag move
  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState) return

      const newMinutes = yToMinutes(e.clientY)
      const initialStartMinutes = getMinutesFromTime(dragState.initialStartTime)
      const initialClickMinutes = yToMinutes(dragState.initialY)
      const offsetFromStart = initialClickMinutes - initialStartMinutes

      let newStartMinutes = newMinutes - offsetFromStart
      let newEndMinutes = newStartMinutes + dragState.duration

      if (newStartMinutes < startHour * 60) {
        newStartMinutes = startHour * 60
        newEndMinutes = newStartMinutes + dragState.duration
      }
      if (newEndMinutes > endHour * 60) {
        newEndMinutes = endHour * 60
        newStartMinutes = newEndMinutes - dragState.duration
      }

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

  // Get display times for a block (use preview if resizing or dragging)
  const getDisplayTimes = useCallback(
    (block: TimeBlock) => {
      if ((resizeState?.blockId === block.id || dragState?.blockId === block.id) && previewTime) {
        return previewTime
      }
      return { startTime: block.startTime, endTime: block.endTime }
    },
    [resizeState, dragState, previewTime]
  )

  return {
    resizeState,
    dragState,
    previewTime,
    containerRef,
    handleResizeStart,
    handleDragStart,
    getDisplayTimes,
  }
}
