import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { GoalBadge } from '@/components/common/GoalBadge'
import { TagBadge } from '@/components/common/TagBadge'
import { ConfirmPopover } from '@/components/common/ConfirmPopover'
import { TaskDialog, type TaskFormData } from '@/components/task/TaskDialog'
import { GoalDialog, type GoalFormData } from '@/components/task/GoalDialog'
import { MilestoneDialog, type MilestoneFormData } from '@/components/task/MilestoneDialog'
import { TagDialog, type TagFormData } from '@/components/task/TagDialog'
import { useDialogState } from '@/hooks/useDialogState'
import { useTaskStore } from '@/stores/useTaskStore'
import { DEFAULT_COLORS } from '@/types'
import type { Goal, Milestone, Task, Tag } from '@/types'
import {
  FolderKanban,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Target,
  Flag,
  Edit,
  Trash2,
  CheckCircle2,
  ListTodo,
  Tags,
  GripVertical,
  X,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { GanttChartWidget } from '@/components/task/GanttChartWidget'
import { RecurringTaskWidget } from '@/components/task/RecurringTaskWidget'
import { PageMemo } from '@/components/common/PageMemo'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Sortable Goal Item component for drag & drop
interface SortableGoalItemProps {
  goal: Goal
  isSelected: boolean
  progress: { completed: number; total: number; percentage: number }
  milestoneCount: number
  onSelect: (id: string) => void
  onEdit: (goal: Goal) => void
  onDelete: (id: string) => void
  onComplete: (id: string) => void
}

function SortableGoalItem({
  goal,
  isSelected,
  progress,
  milestoneCount,
  onSelect,
  onEdit,
  onDelete,
  onComplete,
}: SortableGoalItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isCompleted = goal.status === 'completed'

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          'p-3 rounded-lg cursor-pointer transition-colors group',
          isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50',
          isDragging && 'opacity-50 bg-muted',
          isCompleted && 'opacity-60'
        )}
        onClick={() => onSelect(goal.id)}
      >
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          {isCompleted ? (
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
          ) : (
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: goal.color }} />
          )}
          <span className={cn(
            'font-medium text-sm flex-1',
            isSelected && 'text-primary',
            isCompleted && 'line-through'
          )}>
            {goal.name}
          </span>
          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
            {!isCompleted && (
              <ConfirmPopover
                message="この目標を完了しますか？"
                confirmLabel="完了"
                onConfirm={() => onComplete(goal.id)}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-green-600"
                  onClick={e => e.stopPropagation()}
                  title="完了"
                >
                  <CheckCircle2 className="h-3 w-3" />
                </Button>
              </ConfirmPopover>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={e => {
                e.stopPropagation()
                onEdit(goal)
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <ConfirmPopover
              message="この目標と配下のマイルストーン・タスクを削除しますか？"
              confirmLabel="削除"
              onConfirm={() => onDelete(goal.id)}
              variant="destructive"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={e => e.stopPropagation()}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </ConfirmPopover>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Progress value={progress.percentage} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground w-16 text-right">
            {progress.completed}/{progress.total}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{milestoneCount} マイルストーン</div>
      </div>
    </div>
  )
}

const initialTaskFormData: TaskFormData = {
  name: '',
  milestoneId: '',
  parentTaskId: undefined,
  tagIds: [],
  frequency: undefined,
  daysOfWeek: undefined,
}

const initialTagFormData: TagFormData = {
  name: '',
  color: DEFAULT_COLORS[0],
}

// Sortable Task Item component for drag & drop
interface SortableTaskItemProps {
  task: Task
  isSelected: boolean
  isSelectionMode: boolean
  onSelect: (taskId: string, checked: boolean) => void
  onToggleComplete: (taskId: string) => void
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onAddSubtask: (milestoneId?: string, parentId?: string) => void
  getTagsByIds: (ids: string[]) => Tag[]
  hasChildren: boolean
  isExpanded: boolean
  onToggleExpand: (taskId: string) => void
  recentlyCompleted: boolean
  children?: React.ReactNode
}

function SortableTaskItem({
  task,
  isSelected,
  isSelectionMode,
  onSelect,
  onToggleComplete,
  onEdit,
  onDelete,
  onAddSubtask,
  getTagsByIds,
  hasChildren,
  isExpanded,
  onToggleExpand,
  recentlyCompleted,
  children,
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg transition-colors group',
          'hover:bg-muted/50',
          recentlyCompleted && 'bg-green-100 dark:bg-green-900/30',
          isDragging && 'opacity-50 bg-muted',
          isSelected && 'bg-primary/10 border border-primary/30'
        )}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded opacity-50 hover:opacity-100 touch-none"
        >
          <GripVertical className="h-3 w-3" />
        </button>

        {/* Selection checkbox (shown in selection mode) or expand button */}
        {isSelectionMode ? (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(task.id, checked === true)}
          />
        ) : hasChildren ? (
          <button onClick={() => onToggleExpand(task.id)} className="p-1 hover:bg-muted rounded">
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* Complete checkbox */}
        <Checkbox checked={task.completed} onCheckedChange={() => onToggleComplete(task.id)} />

        {/* Task name */}
        <span
          className={cn(
            'flex-1 text-sm cursor-pointer',
            task.completed && 'line-through text-muted-foreground'
          )}
          onClick={() => isSelectionMode && onSelect(task.id, !isSelected)}
        >
          {task.name}
        </span>

        {/* Tags */}
        {task.tagIds && task.tagIds.length > 0 && (
          <div className="flex gap-1 flex-shrink-0">
            {getTagsByIds(task.tagIds).map(tag => (
              <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="opacity-0 group-hover:opacity-100 flex gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onAddSubtask(task.milestoneId, task.id)}
            title="サブタスク追加"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onEdit(task)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <ConfirmPopover
            message="このタスクを削除しますか？"
            confirmLabel="削除"
            onConfirm={() => onDelete(task.id)}
            variant="destructive"
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </ConfirmPopover>
        </div>
      </div>
      {children}
    </div>
  )
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

export function T01TaskManagement() {
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
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    reorderGoals,
    bulkDeleteTasks,
    bulkCompleteTasks,
  } = useTaskStore()

  // 選択状態 ("__standalone__" = 目標なしタスクを選択中)
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null)
  const isStandaloneSelected = selectedGoalId === '__standalone__'

  // フィルター
  const [searchQuery, setSearchQuery] = useState('')
  const [hideCompleted, setHideCompleted] = useState(false)

  // タスク展開状態（サブタスク表示用）
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<string>>(new Set())

  // 複数選択状態
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const isSelectionMode = selectedTaskIds.size > 0

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // ダイアログ
  const taskDialog = useDialogState<TaskFormData>(initialTaskFormData)
  const goalDialog = useDialogState<GoalFormData>(initialGoalFormData)
  const milestoneDialog = useDialogState<MilestoneFormData>(initialMilestoneFormData)
  const tagDialog = useDialogState<TagFormData>(initialTagFormData)

  // 初期選択: 最初の目標を選択（目標なしタスク選択中は除く）
  useEffect(() => {
    if (!selectedGoalId && !isStandaloneSelected && goals.length > 0) {
      const firstGoal = goals.find(g => g.status !== 'archived')
      if (firstGoal) {
        setSelectedGoalId(firstGoal.id)
      }
    }
  }, [goals, selectedGoalId, isStandaloneSelected])

  // 目標が選択されたらマイルストーンの初期選択（目標なしタスク選択中は除く）
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

  // フィルタリングされた目標
  const filteredGoals = goals.filter(g => {
    if (g.status === 'archived') return false
    if (hideCompleted && g.status === 'completed') return false
    return true
  })

  // 選択された目標のマイルストーン（期限順にソート）
  const selectedGoalMilestones = (selectedGoalId && !isStandaloneSelected)
    ? getMilestonesByGoal(selectedGoalId)
        .filter(m => {
          if (hideCompleted && m.status === 'completed') return false
          return m.status !== 'archived'
        })
        .sort((a, b) => {
          // targetDateがnullの場合は後ろに
          if (!a.targetDate && !b.targetDate) return 0
          if (!a.targetDate) return 1
          if (!b.targetDate) return -1
          return a.targetDate.localeCompare(b.targetDate)
        })
    : []

  // 選択されたマイルストーンのタスク
  const selectedMilestoneTasks = selectedMilestoneId
    ? getTasksByMilestone(selectedMilestoneId).filter(t => !t.parentTaskId)
    : []

  // 目標なしタスク
  const standaloneTasks = getStandaloneTasks().filter(t => !t.parentTaskId)

  // タスクフィルタリングとソート
  const filterTasks = (taskList: Task[]) => {
    return taskList
      .filter(task => {
        const matchesSearch = searchQuery === '' || task.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCompleted = !hideCompleted || !task.completed
        return matchesSearch && matchesCompleted
      })
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  // Sorted tasks for current view
  const sortedMilestoneTasks = useMemo(() => {
    return filterTasks(selectedMilestoneTasks)
  }, [selectedMilestoneTasks, searchQuery, hideCompleted])

  const sortedStandaloneTasks = useMemo(() => {
    return filterTasks(standaloneTasks)
  }, [standaloneTasks, searchQuery, hideCompleted])

  // Selection handlers
  const handleSelectTask = (taskId: string, checked: boolean) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(taskId)
      } else {
        next.delete(taskId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    const currentTasks = selectedMilestoneId ? sortedMilestoneTasks : sortedStandaloneTasks
    const allIds = currentTasks.map(t => t.id)
    setSelectedTaskIds(new Set(allIds))
  }

  const handleClearSelection = () => {
    setSelectedTaskIds(new Set())
  }

  // Bulk operation handlers
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

  // Drag end handler for tasks
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const currentTasks = selectedMilestoneId ? sortedMilestoneTasks : sortedStandaloneTasks
      const oldIndex = currentTasks.findIndex(t => t.id === active.id)
      const newIndex = currentTasks.findIndex(t => t.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        // Create new order
        const newOrder = [...currentTasks]
        const [removed] = newOrder.splice(oldIndex, 1)
        newOrder.splice(newIndex, 0, removed)

        // Update backend
        await reorderTasks(newOrder.map(t => t.id))
      }
    }
  }

  // Drag end handler for goals
  const handleGoalDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const filteredGoals = goals.filter(g => g.status !== 'archived')
      const oldIndex = filteredGoals.findIndex(g => g.id === active.id)
      const newIndex = filteredGoals.findIndex(g => g.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = [...filteredGoals]
        const [removed] = newOrder.splice(oldIndex, 1)
        newOrder.splice(newIndex, 0, removed)

        await reorderGoals(newOrder.map(g => g.id))
      }
    }
  }

  // プログレス計算
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
      const milestoneTasks = getTasksByMilestone(m.id)
      totalTasks += milestoneTasks.length
      completedTasks += milestoneTasks.filter(t => t.completed).length
    })
    if (totalTasks === 0) return { completed: 0, total: 0, percentage: 0 }
    return {
      completed: completedTasks,
      total: totalTasks,
      percentage: Math.round((completedTasks / totalTasks) * 100),
    }
  }

  // タスク完了ハンドラー
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

  // タスク展開トグル
  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedTasks(newExpanded)
  }

  // Goal Handlers
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

  // Milestone Handlers
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
        goalId: data.goalId,
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
    if (selectedMilestoneId === id) {
      setSelectedMilestoneId(null)
    }
  }

  const handleCompleteMilestone = async (milestoneId: string) => {
    await updateMilestone(milestoneId, { status: 'completed' })
  }

  // ConfirmPopover用: 未完了タスクの有無を確認メッセージに含める
  const getMilestoneCompleteMessage = (milestoneId: string) => {
    const progress = calculateMilestoneProgress(milestoneId)
    if (progress.total > 0 && progress.completed < progress.total) {
      return `未完了のタスクが${progress.total - progress.completed}件あります。完了しますか？`
    }
    return 'マイルストーンを完了しますか？'
  }

  // Task Handlers
  const openNewTaskDialog = (milestoneId?: string, parentId?: string) => {
    taskDialog.open({
      milestoneId: milestoneId || selectedMilestoneId || '',
      parentTaskId: parentId,
    })
  }

  const openEditTaskDialog = (task: Task) => {
    taskDialog.openEdit(task.id, {
      name: task.name,
      milestoneId: task.milestoneId || '',
      parentTaskId: task.parentTaskId,
      tagIds: task.tagIds || [],
      frequency: task.frequency,
      daysOfWeek: task.daysOfWeek,
    })
  }

  const handleSaveTask = async (data: TaskFormData, editingId: string | null) => {
    if (editingId) {
      await updateTask(editingId, {
        name: data.name,
        milestoneId: data.milestoneId || undefined,
        parentTaskId: data.parentTaskId,
        tagIds: data.tagIds,
        frequency: data.frequency,
        daysOfWeek: data.daysOfWeek,
      })
    } else {
      await addTask({
        name: data.name,
        milestoneId: data.milestoneId || undefined,
        parentTaskId: data.parentTaskId,
        tagIds: data.tagIds,
        frequency: data.frequency,
        daysOfWeek: data.daysOfWeek,
      })
    }
  }

  // Tag Handlers
  const openEditTagDialog = (tag: Tag) => {
    tagDialog.openEdit(tag.id, {
      name: tag.name,
      color: tag.color,
    })
  }

  const handleSaveTag = async (data: TagFormData, editingId: string | null) => {
    if (editingId) {
      await updateTag(editingId, {
        name: data.name,
        color: data.color,
      })
    } else {
      await addTag({
        name: data.name,
        color: data.color,
      })
    }
  }

  const handleDeleteTag = async (id: string) => {
    await deleteTag(id)
  }

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id)
  }

  // 選択された目標・マイルストーン
  const selectedGoal = (selectedGoalId && !isStandaloneSelected) ? goals.find(g => g.id === selectedGoalId) : null
  const selectedMilestone = selectedMilestoneId ? milestones.find(m => m.id === selectedMilestoneId) : null

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-8 w-8 text-slate-500" />
          <h1 className="text-2xl font-bold">タスク管理</h1>
        </div>
        <div className="flex gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="検索..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={hideCompleted} onCheckedChange={checked => setHideCompleted(checked === true)} />
            <span className="text-sm">完了済みを隠す</span>
          </label>
        </div>
      </div>

      {/* ガントチャート + 定期タスク達成率 + メモ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GanttChartWidget goals={goals} milestones={milestones} tasks={tasks} className="lg:col-span-2" />
        <div className="space-y-4">
          <RecurringTaskWidget goals={goals} milestones={milestones} tasks={tasks} />
          <PageMemo
            pageId="task-management"
            title="タスク管理メモ"
            placeholder="タスクの優先度、検討事項、メモなど..."
          />
        </div>
      </div>

      {/* 3カラムレイアウト */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-280px)]">
        {/* カラム1: 目標 */}
        <Card className="flex flex-col">
          <CardHeader className="py-3 px-4 border-b flex-shrink-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              目標
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-auto" onClick={() => goalDialog.open()}>
                <Plus className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent className="p-2 space-y-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleGoalDragEnd}
              >
                <SortableContext
                  items={filteredGoals.map(g => g.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredGoals.map(goal => {
                    const progress = calculateGoalProgress(goal.id)
                    const isSelected = selectedGoalId === goal.id
                    const milestoneCount = getMilestonesByGoal(goal.id).filter(m => m.status !== 'archived').length

                    return (
                      <SortableGoalItem
                        key={goal.id}
                        goal={goal}
                        isSelected={isSelected}
                        progress={progress}
                        milestoneCount={milestoneCount}
                        onSelect={setSelectedGoalId}
                        onEdit={openEditGoalDialog}
                        onDelete={handleDeleteGoal}
                        onComplete={handleCompleteGoal}
                      />
                    )
                  })}
                </SortableContext>
              </DndContext>

              {filteredGoals.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  目標がありません
                </div>
              )}

              {/* 目標なしタスクセクション */}
              {standaloneTasks.length > 0 && (
                <div
                  className={cn(
                    'p-3 rounded-lg cursor-pointer transition-colors mt-4 border-t pt-4',
                    isStandaloneSelected ? 'bg-muted/50 border border-muted' : 'hover:bg-muted/30'
                  )}
                  onClick={() => {
                    setSelectedGoalId('__standalone__')
                    setSelectedMilestoneId(null)
                  }}
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ListTodo className="h-4 w-4" />
                    <span className="text-sm">目標なしタスク</span>
                    <span className="text-xs ml-auto">{standaloneTasks.length}件</span>
                  </div>
                </div>
              )}

              {/* タグ管理セクション */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">タグ</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 ml-auto"
                    onClick={() => tagDialog.open()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.length === 0 ? (
                    <span className="text-xs text-muted-foreground">タグがありません</span>
                  ) : (
                    tags.map(tag => (
                      <div
                        key={tag.id}
                        className="group relative"
                      >
                        <TagBadge name={tag.name} color={tag.color} />
                        <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5">
                          <button
                            onClick={() => openEditTagDialog(tag)}
                            className="w-4 h-4 bg-background border rounded-full flex items-center justify-center hover:bg-muted"
                          >
                            <Edit className="h-2.5 w-2.5" />
                          </button>
                          <ConfirmPopover
                            message="このタグを削除しますか？"
                            confirmLabel="削除"
                            onConfirm={() => handleDeleteTag(tag.id)}
                            variant="destructive"
                          >
                            <button
                              className="w-4 h-4 bg-background border rounded-full flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </ConfirmPopover>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </ScrollArea>
        </Card>

        {/* カラム2: マイルストーン */}
        <Card className="flex flex-col">
          <CardHeader className="py-3 px-4 border-b flex-shrink-0">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flag className="h-4 w-4" />
              マイルストーン
              {selectedGoal && (
                <>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <GoalBadge name={selectedGoal.name} color={selectedGoal.color} size="sm" />
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 ml-auto"
                onClick={() => openNewMilestoneDialog()}
                disabled={!selectedGoalId || isStandaloneSelected}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent className="p-2 space-y-1">
              {selectedGoalId && !isStandaloneSelected ? (
                <>
                  {selectedGoalMilestones.map(milestone => {
                    const progress = calculateMilestoneProgress(milestone.id)
                    const isSelected = selectedMilestoneId === milestone.id
                    const isCompleted = milestone.status === 'completed'

                    return (
                      <div
                        key={milestone.id}
                        className={cn(
                          'p-3 rounded-lg cursor-pointer transition-colors group',
                          isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50',
                          isCompleted && 'opacity-60'
                        )}
                        onClick={() => setSelectedMilestoneId(milestone.id)}
                      >
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <Flag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          )}
                          <span
                            className={cn(
                              'font-medium text-sm flex-1',
                              isSelected && 'text-primary',
                              isCompleted && 'line-through'
                            )}
                          >
                            {milestone.name}
                          </span>
                          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                            {!isCompleted && (
                              <ConfirmPopover
                                message={getMilestoneCompleteMessage(milestone.id)}
                                confirmLabel="完了"
                                onConfirm={() => handleCompleteMilestone(milestone.id)}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-green-600"
                                  onClick={e => e.stopPropagation()}
                                  title="完了"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                </Button>
                              </ConfirmPopover>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={e => {
                                e.stopPropagation()
                                openEditMilestoneDialog(milestone)
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <ConfirmPopover
                              message="このマイルストーンと配下のタスクを削除しますか？"
                              confirmLabel="削除"
                              onConfirm={() => handleDeleteMilestone(milestone.id)}
                              variant="destructive"
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={e => e.stopPropagation()}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </ConfirmPopover>
                          </div>
                        </div>
                        {(milestone.startDate || milestone.targetDate) && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {milestone.startDate && milestone.targetDate
                              ? `${milestone.startDate} 〜 ${milestone.targetDate}`
                              : milestone.targetDate
                                ? `期限: ${milestone.targetDate}`
                                : `開始: ${milestone.startDate}`}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <Progress value={progress.percentage} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground w-16 text-right">
                            {progress.completed}/{progress.total}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {selectedGoalMilestones.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <Flag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      マイルストーンがありません
                      <Button variant="link" size="sm" className="block mx-auto mt-2" onClick={() => openNewMilestoneDialog()}>
                        追加する
                      </Button>
                    </div>
                  )}
                </>
              ) : isStandaloneSelected ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  目標なしタスクを選択中
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Flag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  目標を選択してください
                </div>
              )}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* カラム3: タスク */}
        <Card className="flex flex-col">
          <CardHeader className="py-3 px-4 border-b flex-shrink-0">
            {isSelectionMode ? (
              /* Bulk action bar when tasks are selected */
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={handleClearSelection}
                >
                  <X className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">{selectedTaskIds.size}件選択中</span>
                <div className="ml-auto flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleSelectAll}
                  >
                    全選択
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-green-600 hover:text-green-700"
                    onClick={() => handleBulkComplete(true)}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    完了
                  </Button>
                  <ConfirmPopover
                    message={`${selectedTaskIds.size}件のタスクを削除しますか？`}
                    confirmLabel="削除"
                    onConfirm={handleBulkDelete}
                    variant="destructive"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      削除
                    </Button>
                  </ConfirmPopover>
                </div>
              </div>
            ) : (
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                タスク
                {selectedMilestone && (
                  <>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">{selectedMilestone.name}</span>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 ml-auto"
                  onClick={() => openNewTaskDialog()}
                  disabled={!selectedMilestoneId && !isStandaloneSelected}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </CardTitle>
            )}
          </CardHeader>
          <ScrollArea className="flex-1">
            <CardContent className="p-2 space-y-1">
              {/* マイルストーン選択時のタスク */}
              {selectedMilestoneId && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortedMilestoneTasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedMilestoneTasks.map(task => {
                      const childTasks = getChildTasks(task.id)
                      const filteredChildTasks = filterTasks(childTasks)
                      const hasChildren = filteredChildTasks.length > 0
                      const isTaskExpanded = expandedTasks.has(task.id)

                      return (
                        <SortableTaskItem
                          key={task.id}
                          task={task}
                          isSelected={selectedTaskIds.has(task.id)}
                          isSelectionMode={isSelectionMode}
                          onSelect={handleSelectTask}
                          onToggleComplete={handleToggleTaskComplete}
                          onEdit={openEditTaskDialog}
                          onDelete={handleDeleteTask}
                          onAddSubtask={openNewTaskDialog}
                          getTagsByIds={getTagsByIds}
                          hasChildren={hasChildren}
                          isExpanded={isTaskExpanded}
                          onToggleExpand={toggleTask}
                          recentlyCompleted={recentlyCompleted.has(task.id)}
                        >
                          {/* サブタスク */}
                          {hasChildren && isTaskExpanded && (
                            <div className="ml-8 border-l pl-2 space-y-1">
                              {filteredChildTasks.map(childTask => (
                                <div
                                  key={childTask.id}
                                  className={cn(
                                    'flex items-center gap-2 p-2 rounded-lg transition-colors group',
                                    'hover:bg-muted/50',
                                    recentlyCompleted.has(childTask.id) && 'bg-green-100 dark:bg-green-900/30',
                                    selectedTaskIds.has(childTask.id) && 'bg-primary/10 border border-primary/30'
                                  )}
                                >
                                  {isSelectionMode ? (
                                    <Checkbox
                                      checked={selectedTaskIds.has(childTask.id)}
                                      onCheckedChange={(checked) => handleSelectTask(childTask.id, checked === true)}
                                    />
                                  ) : (
                                    <div className="w-6" />
                                  )}
                                  <Checkbox
                                    checked={childTask.completed}
                                    onCheckedChange={() => handleToggleTaskComplete(childTask.id)}
                                  />
                                  <span
                                    className={cn(
                                      'flex-1 text-sm',
                                      childTask.completed && 'line-through text-muted-foreground'
                                    )}
                                  >
                                    {childTask.name}
                                  </span>
                                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => openEditTaskDialog(childTask)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <ConfirmPopover
                                      message="このタスクを削除しますか？"
                                      confirmLabel="削除"
                                      onConfirm={() => handleDeleteTask(childTask.id)}
                                      variant="destructive"
                                    >
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </ConfirmPopover>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </SortableTaskItem>
                      )
                    })}
                  </SortableContext>

                  {sortedMilestoneTasks.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      タスクがありません
                      <Button variant="link" size="sm" className="block mx-auto mt-2" onClick={() => openNewTaskDialog()}>
                        追加する
                      </Button>
                    </div>
                  )}
                </DndContext>
              )}

              {/* 目標なしタスク表示 */}
              {isStandaloneSelected && sortedStandaloneTasks.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortedStandaloneTasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedStandaloneTasks.map(task => {
                      const childTasks = getChildTasks(task.id)
                      const filteredChildTasks = filterTasks(childTasks)
                      const hasChildren = filteredChildTasks.length > 0
                      const isTaskExpanded = expandedTasks.has(task.id)

                      return (
                        <SortableTaskItem
                          key={task.id}
                          task={task}
                          isSelected={selectedTaskIds.has(task.id)}
                          isSelectionMode={isSelectionMode}
                          onSelect={handleSelectTask}
                          onToggleComplete={handleToggleTaskComplete}
                          onEdit={openEditTaskDialog}
                          onDelete={handleDeleteTask}
                          onAddSubtask={openNewTaskDialog}
                          getTagsByIds={getTagsByIds}
                          hasChildren={hasChildren}
                          isExpanded={isTaskExpanded}
                          onToggleExpand={toggleTask}
                          recentlyCompleted={recentlyCompleted.has(task.id)}
                        >
                          {/* サブタスク */}
                          {hasChildren && isTaskExpanded && (
                            <div className="ml-8 border-l pl-2 space-y-1">
                              {filteredChildTasks.map(childTask => (
                                <div
                                  key={childTask.id}
                                  className={cn(
                                    'flex items-center gap-2 p-2 rounded-lg transition-colors group',
                                    'hover:bg-muted/50',
                                    recentlyCompleted.has(childTask.id) && 'bg-green-100 dark:bg-green-900/30',
                                    selectedTaskIds.has(childTask.id) && 'bg-primary/10 border border-primary/30'
                                  )}
                                >
                                  {isSelectionMode ? (
                                    <Checkbox
                                      checked={selectedTaskIds.has(childTask.id)}
                                      onCheckedChange={(checked) => handleSelectTask(childTask.id, checked === true)}
                                    />
                                  ) : (
                                    <div className="w-6" />
                                  )}
                                  <Checkbox
                                    checked={childTask.completed}
                                    onCheckedChange={() => handleToggleTaskComplete(childTask.id)}
                                  />
                                  <span
                                    className={cn(
                                      'flex-1 text-sm',
                                      childTask.completed && 'line-through text-muted-foreground'
                                    )}
                                  >
                                    {childTask.name}
                                  </span>
                                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => openEditTaskDialog(childTask)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <ConfirmPopover
                                      message="このタスクを削除しますか？"
                                      confirmLabel="削除"
                                      onConfirm={() => handleDeleteTask(childTask.id)}
                                      variant="destructive"
                                    >
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </ConfirmPopover>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </SortableTaskItem>
                      )
                    })}
                  </SortableContext>
                </DndContext>
              )}

              {/* 何も選択されていない場合 */}
              {!selectedMilestoneId && selectedGoalId && !isStandaloneSelected && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  マイルストーンを選択してください
                </div>
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      </div>

      {/* Dialogs */}
      <TaskDialog dialog={taskDialog} goals={goals} milestones={milestones} tags={tags} tasks={tasks} onSave={handleSaveTask} />

      <GoalDialog dialog={goalDialog} onSave={handleSaveGoal} />

      <MilestoneDialog dialog={milestoneDialog} goals={goals} onSave={handleSaveMilestone} />

      <TagDialog dialog={tagDialog} onSave={handleSaveTag} />
    </div>
  )
}
