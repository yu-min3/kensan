import { useState, useCallback } from 'react'
import { useTaskStore } from '@/stores/useTaskStore'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import type { TimeBlock } from '@/types'

export type TaskInputMode = 'manual' | 'existing'

interface TimeBlockDialogState {
  isOpen: boolean
  editingBlockId: string | null
  taskName: string
  startTime: string
  endTime: string
  taskId: string | undefined
  milestoneId: string | undefined
  taskInputMode: TaskInputMode
}

interface UseTimeBlockDialogOptions {
  defaultDate: string
}

export function useTimeBlockDialog(options: UseTimeBlockDialogOptions) {
  const { defaultDate } = options
  const { addTimeBlock, updateTimeBlock, deleteTimeBlock } = useTimeBlockStore()
  const { getMilestoneById, getGoalById } = useTaskStore()

  const [state, setState] = useState<TimeBlockDialogState>({
    isOpen: false,
    editingBlockId: null,
    taskName: '',
    startTime: '09:00',
    endTime: '10:00',
    taskId: undefined,
    milestoneId: undefined,
    taskInputMode: 'manual',
  })

  // Get goal from selected milestone
  const selectedMilestone = state.milestoneId ? getMilestoneById(state.milestoneId) : undefined
  const selectedGoal = selectedMilestone ? getGoalById(selectedMilestone.goalId) : undefined

  const openDialog = useCallback((params?: {
    taskId?: string
    taskName?: string
    milestoneId?: string
  }) => {
    // Calculate current time rounded to 15 minutes
    const now = new Date()
    const startH = now.getHours().toString().padStart(2, '0')
    const startM = Math.floor(now.getMinutes() / 15) * 15
    const endH = (now.getHours() + 1).toString().padStart(2, '0')

    setState({
      isOpen: true,
      editingBlockId: null,
      taskName: params?.taskName || '',
      startTime: `${startH}:${startM.toString().padStart(2, '0')}`,
      endTime: `${endH}:${startM.toString().padStart(2, '0')}`,
      taskId: params?.taskId,
      milestoneId: params?.milestoneId,
      taskInputMode: params?.taskId ? 'existing' : 'manual',
    })
  }, [])

  const openEditDialog = useCallback((block: TimeBlock) => {
    setState({
      isOpen: true,
      editingBlockId: block.id,
      taskName: block.taskName,
      startTime: block.startTime.slice(0, 5), // Normalize HH:mm:ss to HH:mm
      endTime: block.endTime.slice(0, 5),
      taskId: block.taskId,
      milestoneId: block.milestoneId,
      taskInputMode: block.taskId ? 'existing' : 'manual',
    })
  }, [])

  const closeDialog = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const setField = useCallback(<K extends keyof TimeBlockDialogState>(
    field: K,
    value: TimeBlockDialogState[K]
  ) => {
    setState(prev => ({ ...prev, [field]: value }))
  }, [])

  const save = useCallback(async (targetDate?: string) => {
    if (!state.taskName || !state.startTime || !state.endTime) return false

    const date = targetDate || defaultDate
    const blockData = {
      startTime: state.startTime,
      endTime: state.endTime,
      taskName: state.taskName,
      taskId: state.taskId,
      milestoneId: state.milestoneId,
      milestoneName: selectedMilestone?.name,
      goalId: selectedGoal?.id,
      goalName: selectedGoal?.name,
      goalColor: selectedGoal?.color,
    }

    if (state.editingBlockId) {
      await updateTimeBlock(state.editingBlockId, blockData)
    } else {
      await addTimeBlock({
        ...blockData,
        date,
        isRoutine: false,
      })
    }

    closeDialog()
    return true
  }, [
    state,
    defaultDate,
    selectedMilestone,
    selectedGoal,
    addTimeBlock,
    updateTimeBlock,
    closeDialog,
  ])

  const deleteBlock = useCallback(async (id: string) => {
    if (window.confirm('このタイムブロックを削除しますか？')) {
      await deleteTimeBlock(id)
      return true
    }
    return false
  }, [deleteTimeBlock])

  return {
    // State
    isOpen: state.isOpen,
    editingBlockId: state.editingBlockId,
    taskName: state.taskName,
    startTime: state.startTime,
    endTime: state.endTime,
    taskId: state.taskId,
    milestoneId: state.milestoneId,
    taskInputMode: state.taskInputMode,
    selectedMilestone,
    selectedGoal,

    // Actions
    openDialog,
    openEditDialog,
    closeDialog,
    setField,
    save,
    deleteBlock,
  }
}
