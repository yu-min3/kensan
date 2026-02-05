import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTaskManagerStore } from '@/stores/useTaskManagerStore'
import { useDialogState } from '@/hooks/useDialogState'
import { useTaskDetailPanel } from '@/hooks/useTaskDetailPanel'
import { DEFAULT_COLORS } from '@/types'
import type { Goal, Milestone, Task, Tag } from '@/types'
import type { GoalFormData } from '@/components/task/GoalDialog'
import type { MilestoneFormData } from '@/components/task/MilestoneDialog'
import type { TagFormData } from '@/components/task/TagDialog'
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

// Form initial data
const initialTagFormData: TagFormData = {
  name: '',
  color: DEFAULT_COLORS[0],
}

const initialGoalFormData: GoalFormData = {
  name: '',
  description: '',
  color: DEFAULT_COLORS[0],
}

const initialMilestoneFormData: MilestoneFormData = {
  name: '',
  description: '',
  goalId: '',
  startDate: '',
  targetDate: '',
  status: 'active',
}

export function useTaskManagement() {
  const {
    goals,
    milestones,
    tags,
    tasks,
    toggleTaskComplete,
    getTasksByMilestone,
    getChildTasks,
    getStandaloneTasks,
    getMilestonesByGoal,
    getTagsByIds,
    addGoal,
    updateGoal,
    deleteGoal,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addTag,
    updateTag,
    deleteTag,
    deleteTask,
    reorderTasks,
    reorderGoals,
    bulkDeleteTasks,
    bulkCompleteTasks,
  } = useTaskManagerStore()

  // Selection state
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null)
  const isStandaloneSelected = selectedGoalId === '__standalone__'

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [hideCompleted, setHideCompleted] = useState(false)

  // Task expansion
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<string>>(new Set())

  // Multi-select
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const isSelectionMode = selectedTaskIds.size > 0

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Task detail panel
  const taskDetailPanel = useTaskDetailPanel()

  // Dialogs
  const goalDialog = useDialogState<GoalFormData>(initialGoalFormData)
  const milestoneDialog = useDialogState<MilestoneFormData>(initialMilestoneFormData)
  const tagDialog = useDialogState<TagFormData>(initialTagFormData)

  // Auto-select first goal
  useEffect(() => {
    if (!selectedGoalId && !isStandaloneSelected && goals.length > 0) {
      const firstGoal = goals.find(g => g.status !== 'archived')
      if (firstGoal) setSelectedGoalId(firstGoal.id)
    }
  }, [goals, selectedGoalId, isStandaloneSelected])

  // Auto-select first milestone when goal changes
  useEffect(() => {
    if (selectedGoalId && !isStandaloneSelected) {
      const goalMilestones = getMilestonesByGoal(selectedGoalId).filter(m => m.status !== 'archived')
      if (goalMilestones.length > 0 && !goalMilestones.find(m => m.id === selectedMilestoneId)) {
        setSelectedMilestoneId(goalMilestones[0].id)
      } else if (goalMilestones.length === 0) {
        setSelectedMilestoneId(null)
      }
    }
  }, [selectedGoalId, getMilestonesByGoal, selectedMilestoneId, isStandaloneSelected])

  // Filtered goals
  const filteredGoals = goals.filter(g => {
    if (g.status === 'archived') return false
    if (hideCompleted && g.status === 'completed') return false
    return true
  })

  // Selected goal milestones (sorted by target date)
  const selectedGoalMilestones = (selectedGoalId && !isStandaloneSelected)
    ? getMilestonesByGoal(selectedGoalId)
        .filter(m => {
          if (hideCompleted && m.status === 'completed') return false
          return m.status !== 'archived'
        })
        .sort((a, b) => {
          if (!a.targetDate && !b.targetDate) return 0
          if (!a.targetDate) return 1
          if (!b.targetDate) return -1
          return a.targetDate.localeCompare(b.targetDate)
        })
    : []

  // Milestone tasks and standalone tasks
  const selectedMilestoneTasks = selectedMilestoneId
    ? getTasksByMilestone(selectedMilestoneId).filter(t => !t.parentTaskId)
    : []
  const standaloneTasks = getStandaloneTasks().filter(t => !t.parentTaskId)

  // Task filtering and sorting
  const filterTasks = useCallback((taskList: Task[]) => {
    return taskList
      .filter(task => {
        const matchesSearch = searchQuery === '' || task.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCompleted = !hideCompleted || !task.completed
        return matchesSearch && matchesCompleted
      })
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }, [searchQuery, hideCompleted])

  const sortedMilestoneTasks = useMemo(
    () => filterTasks(selectedMilestoneTasks),
    [selectedMilestoneTasks, filterTasks]
  )

  const sortedStandaloneTasks = useMemo(
    () => filterTasks(standaloneTasks),
    [standaloneTasks, filterTasks]
  )

  // Selection handlers
  const handleSelectTask = (taskId: string, checked: boolean) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev)
      if (checked) next.add(taskId)
      else next.delete(taskId)
      return next
    })
  }

  const handleSelectAll = () => {
    const currentTasks = selectedMilestoneId ? sortedMilestoneTasks : sortedStandaloneTasks
    setSelectedTaskIds(new Set(currentTasks.map(t => t.id)))
  }

  const handleClearSelection = () => setSelectedTaskIds(new Set())

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedTaskIds.size === 0) return
    await bulkDeleteTasks(Array.from(selectedTaskIds))
    setSelectedTaskIds(new Set())
  }

  const handleBulkComplete = async (completed: boolean) => {
    if (selectedTaskIds.size === 0) return
    await bulkCompleteTasks(Array.from(selectedTaskIds), completed)
    setSelectedTaskIds(new Set())
  }

  // DnD handlers
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const currentTasks = selectedMilestoneId ? sortedMilestoneTasks : sortedStandaloneTasks
      const oldIndex = currentTasks.findIndex(t => t.id === active.id)
      const newIndex = currentTasks.findIndex(t => t.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = [...currentTasks]
        const [removed] = newOrder.splice(oldIndex, 1)
        newOrder.splice(newIndex, 0, removed)
        await reorderTasks(newOrder.map(t => t.id))
      }
    }
  }

  const handleGoalDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const activeGoals = goals.filter(g => g.status !== 'archived')
      const oldIndex = activeGoals.findIndex(g => g.id === active.id)
      const newIndex = activeGoals.findIndex(g => g.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = [...activeGoals]
        const [removed] = newOrder.splice(oldIndex, 1)
        newOrder.splice(newIndex, 0, removed)
        await reorderGoals(newOrder.map(g => g.id))
      }
    }
  }

  // Progress calculations
  const calculateMilestoneProgress = (milestoneId: string) => {
    const milestoneTasks = getTasksByMilestone(milestoneId)
    if (milestoneTasks.length === 0) return { completed: 0, total: 0, percentage: 0 }
    const completedTasks = milestoneTasks.filter(t => t.completed).length
    return {
      completed: completedTasks,
      total: milestoneTasks.length,
      percentage: Math.round((completedTasks / milestoneTasks.length) * 100),
    }
  }

  const calculateGoalProgress = (goalId: string) => {
    const goalMilestones = getMilestonesByGoal(goalId)
    let totalTasks = 0
    let completedTasks = 0
    goalMilestones.forEach(m => {
      const mt = getTasksByMilestone(m.id)
      totalTasks += mt.length
      completedTasks += mt.filter(t => t.completed).length
    })
    if (totalTasks === 0) return { completed: 0, total: 0, percentage: 0 }
    return {
      completed: completedTasks,
      total: totalTasks,
      percentage: Math.round((completedTasks / totalTasks) * 100),
    }
  }

  // Task handlers
  const handleToggleTaskComplete = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task && !task.completed) {
      setRecentlyCompleted(prev => new Set(prev).add(taskId))
      setTimeout(() => {
        setRecentlyCompleted(prev => {
          const next = new Set(prev)
          next.delete(taskId)
          return next
        })
      }, 1500)
    }
    await toggleTaskComplete(taskId)
  }

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) newExpanded.delete(taskId)
    else newExpanded.add(taskId)
    setExpandedTasks(newExpanded)
  }

  // Goal CRUD handlers
  const openEditGoalDialog = (goal: Goal) => {
    goalDialog.openEdit(goal.id, {
      name: goal.name,
      description: goal.description || '',
      color: goal.color,
      status: goal.status,
    })
  }

  const handleSaveGoal = async (data: GoalFormData, editingId: string | null) => {
    if (editingId) {
      await updateGoal(editingId, {
        name: data.name,
        description: data.description || undefined,
        color: data.color,
        status: data.status,
      })
    } else {
      await addGoal({
        name: data.name,
        description: data.description || undefined,
        color: data.color,
      })
    }
  }

  const handleDeleteGoal = async (id: string) => {
    await deleteGoal(id)
    if (selectedGoalId === id) {
      setSelectedGoalId(null)
      setSelectedMilestoneId(null)
    }
  }

  const handleCompleteGoal = async (goalId: string) => {
    await updateGoal(goalId, { status: 'completed' })
  }

  // Milestone CRUD handlers
  const openNewMilestoneDialog = (goalId?: string) => {
    milestoneDialog.open({
      goalId: goalId || selectedGoalId || goals[0]?.id || '',
    })
  }

  const openEditMilestoneDialog = (milestone: Milestone) => {
    milestoneDialog.openEdit(milestone.id, {
      name: milestone.name,
      description: milestone.description || '',
      goalId: milestone.goalId,
      startDate: milestone.startDate || '',
      targetDate: milestone.targetDate || '',
      status: milestone.status,
    })
  }

  const handleSaveMilestone = async (data: MilestoneFormData, editingId: string | null) => {
    if (editingId) {
      await updateMilestone(editingId, {
        name: data.name,
        description: data.description || undefined,
        startDate: data.startDate || undefined,
        targetDate: data.targetDate || undefined,
        status: data.status,
      })
    } else {
      await addMilestone({
        name: data.name,
        description: data.description || undefined,
        goalId: data.goalId,
        startDate: data.startDate || undefined,
        targetDate: data.targetDate || undefined,
      })
    }
  }

  const handleDeleteMilestone = async (id: string) => {
    await deleteMilestone(id)
    if (selectedMilestoneId === id) setSelectedMilestoneId(null)
  }

  const handleCompleteMilestone = async (milestoneId: string) => {
    await updateMilestone(milestoneId, { status: 'completed' })
  }

  const getMilestoneCompleteMessage = (milestoneId: string) => {
    const progress = calculateMilestoneProgress(milestoneId)
    if (progress.total > 0 && progress.completed < progress.total) {
      return `未完了のタスクが${progress.total - progress.completed}件あります。完了しますか？`
    }
    return 'マイルストーンを完了しますか？'
  }

  // Task CRUD handlers
  const openNewTaskDialog = (milestoneId?: string, parentId?: string) => {
    taskDetailPanel.openNewTask({
      milestoneId: milestoneId || selectedMilestoneId || undefined,
      parentTaskId: parentId,
    })
  }

  const openEditTaskDialog = (task: Task) => {
    taskDetailPanel.openTask(task.id)
  }

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id)
  }

  // Tag CRUD handlers
  const openEditTagDialog = (tag: Tag) => {
    tagDialog.openEdit(tag.id, { name: tag.name, color: tag.color })
  }

  const handleSaveTag = async (data: TagFormData, editingId: string | null) => {
    if (editingId) {
      await updateTag(editingId, { name: data.name, color: data.color })
    } else {
      await addTag({ name: data.name, color: data.color })
    }
  }

  const handleDeleteTag = async (id: string) => {
    await deleteTag(id)
  }

  // Derived state
  const selectedGoal = (selectedGoalId && !isStandaloneSelected) ? goals.find(g => g.id === selectedGoalId) : null
  const selectedMilestone = selectedMilestoneId ? milestones.find(m => m.id === selectedMilestoneId) : null

  return {
    // Data
    goals, milestones, tags, tasks,

    // Selection
    selectedGoalId, setSelectedGoalId,
    selectedMilestoneId, setSelectedMilestoneId,
    isStandaloneSelected,
    selectedGoal, selectedMilestone,

    // Filters
    searchQuery, setSearchQuery,
    hideCompleted, setHideCompleted,

    // Task expansion
    expandedTasks, recentlyCompleted,

    // Multi-select
    selectedTaskIds, isSelectionMode,
    handleSelectTask, handleSelectAll, handleClearSelection,

    // Bulk operations
    handleBulkDelete, handleBulkComplete,

    // DnD
    sensors, handleDragEnd, handleGoalDragEnd,

    // Computed data
    filteredGoals, selectedGoalMilestones,
    sortedMilestoneTasks, sortedStandaloneTasks,
    standaloneTasks,

    // Progress
    calculateMilestoneProgress, calculateGoalProgress,

    // Task operations
    handleToggleTaskComplete, toggleTask,
    getChildTasks, getTagsByIds, filterTasks,

    // CRUD handlers
    handleSaveGoal, handleDeleteGoal, handleCompleteGoal,
    openEditGoalDialog,
    openNewMilestoneDialog, openEditMilestoneDialog,
    handleSaveMilestone, handleDeleteMilestone, handleCompleteMilestone,
    getMilestoneCompleteMessage,
    openNewTaskDialog, openEditTaskDialog,
    handleDeleteTask,
    openEditTagDialog, handleSaveTag, handleDeleteTag,

    // Dialogs
    goalDialog, milestoneDialog, tagDialog,

    // Detail panel
    taskDetailPanel,
  }
}
