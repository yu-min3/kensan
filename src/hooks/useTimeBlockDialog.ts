import { useState, useCallback } from 'react'
import { useTaskManagerStore } from '@/stores/useTaskManagerStore'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { getLocalTime } from '@/lib/timezone'
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
  const { getMilestoneById, getGoalById } = useTaskManagerStore()
  const timezone = useSettingsStore((s) => s.timezone) || 'Asia/Tokyo'

  const [state, setState] = useState<TimeBlockDialogState>({
    isOpen: false,
    editingBlockId: null,
    taskName: '',
    startTime: '09:00',
    endTime: '10:00',
    taskId: undefined,
    milestoneId: undefined,
    taskInputMode: 'existing', // デフォルトはタスクから選択
  })

  // Get goal from selected milestone
  const selectedMilestone = state.milestoneId ? getMilestoneById(state.milestoneId) : undefined
  const selectedGoal = selectedMilestone ? getGoalById(selectedMilestone.goalId) : undefined

  const openDialog = useCallback((params?: {
    taskId?: string
    taskName?: string
    milestoneId?: string
    taskInputMode?: TaskInputMode
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
      // パラメータで指定があればそれを使用、なければexistingがデフォルト
      taskInputMode: params?.taskInputMode || (params?.taskId ? 'existing' : 'existing'),
    })
  }, [])

  const openEditDialog = useCallback((block: TimeBlock) => {
    setState({
      isOpen: true,
      editingBlockId: block.id,
      taskName: block.taskName,
      startTime: getLocalTime(block.startDatetime, timezone),
      endTime: getLocalTime(block.endDatetime, timezone),
      taskId: block.taskId,
      milestoneId: block.milestoneId,
      taskInputMode: block.taskId ? 'existing' : 'manual',
    })
  }, [timezone])

  // 指定した時刻でダイアログを開く（空きエリアダブルクリック用）
  const openDialogWithTime = useCallback((startTime: string, endTime: string) => {
    setState({
      isOpen: true,
      editingBlockId: null,
      taskName: '',
      startTime,
      endTime,
      taskId: undefined,
      milestoneId: undefined,
      taskInputMode: 'existing',
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
    const data = {
      taskName: state.taskName,
      taskId: state.taskId,
      milestoneId: state.milestoneId,
      milestoneName: selectedMilestone?.name,
      goalId: selectedGoal?.id,
      goalName: selectedGoal?.name,
      goalColor: selectedGoal?.color,
    }

    if (state.editingBlockId) {
      await updateTimeBlock(state.editingBlockId, date, state.startTime, state.endTime, data)
    } else {
      await addTimeBlock(date, state.startTime, state.endTime, data)
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
    await deleteTimeBlock(id)
    return true
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
    openDialogWithTime,
    openEditDialog,
    closeDialog,
    setField,
    save,
    deleteBlock,
  }
}
