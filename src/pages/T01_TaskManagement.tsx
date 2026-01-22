import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { GoalBadge } from '@/components/common/GoalBadge'
import { TaskDialog, type TaskFormData } from '@/components/task/TaskDialog'
import { GoalDialog, type GoalFormData } from '@/components/task/GoalDialog'
import { MilestoneDialog, type MilestoneFormData } from '@/components/task/MilestoneDialog'
import { useDialogState } from '@/hooks/useDialogState'
import { useTaskStore } from '@/stores/useTaskStore'
import { DEFAULT_COLORS } from '@/types'
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
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'

const initialTaskFormData: TaskFormData = {
  name: '',
  milestoneId: '',
  parentTaskId: undefined,
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
  targetDate: '',
  status: 'active',
}

export function T01TaskManagement() {
  const {
    goals,
    milestones,
    tasks,
    toggleTaskComplete,
    getTasksByMilestone,
    getChildTasks,
    getStandaloneTasks,
    getMilestonesByGoal,
    addGoal,
    updateGoal,
    deleteGoal,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addTask,
    updateTask,
    deleteTask,
  } = useTaskStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [hideCompleted, setHideCompleted] = useState(false)
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(
    new Set(goals.map((g) => g.id))
  )
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(
    new Set(milestones.map((m) => m.id))
  )
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<string>>(new Set())

  const taskDialog = useDialogState<TaskFormData>(initialTaskFormData)
  const goalDialog = useDialogState<GoalFormData>(initialGoalFormData)
  const milestoneDialog = useDialogState<MilestoneFormData>(initialMilestoneFormData)

  // タスク完了時のフィードバック付きトグル
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

  // Task Dialog Handlers
  const openNewTaskDialog = (milestoneId?: string, parentId?: string) => {
    taskDialog.open({
      milestoneId: milestoneId || '',
      parentTaskId: parentId,
    })
  }

  const openEditTaskDialog = (task: typeof tasks[0]) => {
    taskDialog.openEdit(task.id, {
      name: task.name,
      milestoneId: task.milestoneId || '',
      parentTaskId: task.parentTaskId,
    })
  }

  const handleSaveTask = async (data: TaskFormData, editingId: string | null) => {
    if (editingId) {
      await updateTask(editingId, {
        name: data.name,
        milestoneId: data.milestoneId || undefined,
        parentTaskId: data.parentTaskId,
      })
    } else {
      await addTask({
        name: data.name,
        milestoneId: data.milestoneId || undefined,
        parentTaskId: data.parentTaskId,
      })
    }
  }

  const handleDeleteTask = async (id: string) => {
    if (window.confirm('このタスクを削除しますか？')) {
      await deleteTask(id)
    }
  }

  // Goal Dialog Handlers
  const openEditGoalDialog = (goal: typeof goals[0]) => {
    goalDialog.openEdit(goal.id, {
      name: goal.name,
      description: goal.description || '',
      color: goal.color,
    })
  }

  const handleSaveGoal = async (data: GoalFormData, editingId: string | null) => {
    if (editingId) {
      await updateGoal(editingId, {
        name: data.name,
        description: data.description || undefined,
        color: data.color,
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
    if (window.confirm('この目標と配下のマイルストーン・タスクを削除しますか？')) {
      await deleteGoal(id)
    }
  }

  // Milestone Dialog Handlers
  const openNewMilestoneDialog = (goalId?: string) => {
    milestoneDialog.open({
      goalId: goalId || goals[0]?.id || '',
    })
  }

  const openEditMilestoneDialog = (milestone: typeof milestones[0]) => {
    milestoneDialog.openEdit(milestone.id, {
      name: milestone.name,
      description: milestone.description || '',
      goalId: milestone.goalId,
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
        targetDate: data.targetDate || undefined,
        status: data.status,
      })
    } else {
      await addMilestone({
        name: data.name,
        description: data.description || undefined,
        goalId: data.goalId,
        targetDate: data.targetDate || undefined,
      })
    }
  }

  const handleDeleteMilestone = async (id: string) => {
    if (window.confirm('このマイルストーンと配下のタスクを削除しますか？')) {
      await deleteMilestone(id)
    }
  }

  const toggleGoal = (goalId: string) => {
    const newExpanded = new Set(expandedGoals)
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId)
    } else {
      newExpanded.add(goalId)
    }
    setExpandedGoals(newExpanded)
  }

  const toggleMilestone = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones)
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId)
    } else {
      newExpanded.add(milestoneId)
    }
    setExpandedMilestones(newExpanded)
  }

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedTasks(newExpanded)
  }

  const filteredGoals = goals.filter((g) => !g.isArchived)

  const filterTasks = (taskList: typeof tasks) => {
    return taskList.filter((task) => {
      const matchesSearch =
        searchQuery === '' ||
        task.name.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCompleted = !hideCompleted || !task.completed

      return matchesSearch && matchesCompleted
    })
  }

  // プログレス計算用のヘルパー関数
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

  // マイルストーン完了ハンドラー
  const handleCompleteMilestone = async (milestoneId: string) => {
    const progress = calculateMilestoneProgress(milestoneId)
    if (progress.total > 0 && progress.completed < progress.total) {
      if (!window.confirm('未完了のタスクがあります。マイルストーンを完了しますか？')) {
        return
      }
    }
    await updateMilestone(milestoneId, { status: 'completed' })
  }

  // Standalone tasks (tasks without milestoneId)
  const standaloneTasks = filterTasks(getStandaloneTasks().filter(t => !t.parentTaskId))

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-8 w-8 text-slate-500" />
          <h1 className="text-2xl font-bold">タスク管理</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => goalDialog.open()}>
            <Plus className="h-4 w-4" />
            目標追加
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => openNewMilestoneDialog()}>
            <Plus className="h-4 w-4" />
            マイルストーン追加
          </Button>
          <Button className="gap-2" onClick={() => openNewTaskDialog()}>
            <Plus className="h-4 w-4" />
            タスク追加
          </Button>
        </div>
      </div>

      {/* フィルター */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={hideCompleted}
            onCheckedChange={(checked) => setHideCompleted(checked === true)}
          />
          <span className="text-sm">完了済みを隠す</span>
        </label>
      </div>

      {/* 目標・マイルストーン・タスク一覧 */}
      <div className="space-y-4">
        {filteredGoals.map((goal) => {
          const allMilestones = getMilestonesByGoal(goal.id)
          const goalMilestones = hideCompleted
            ? allMilestones.filter(m => m.status === 'active')
            : allMilestones.filter(m => m.status !== 'archived')
          const isGoalExpanded = expandedGoals.has(goal.id)
          const goalProgress = calculateGoalProgress(goal.id)

          return (
            <Card key={goal.id}>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <button
                    onClick={() => toggleGoal(goal.id)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    {isGoalExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <Target className="h-4 w-4" style={{ color: goal.color }} />
                  <GoalBadge name={goal.name} color={goal.color} size="sm" />
                  {goalProgress.total > 0 && (
                    <div className="flex items-center gap-2 ml-2">
                      <Progress value={goalProgress.percentage} className="w-24 h-2" />
                      <span className="text-xs text-muted-foreground">
                        {goalProgress.completed}/{goalProgress.total}
                      </span>
                    </div>
                  )}
                  <span className="text-sm text-muted-foreground ml-auto">
                    {goalMilestones.length}マイルストーン
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => openNewMilestoneDialog(goal.id)}
                    title="マイルストーン追加"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => openEditGoalDialog(goal)}
                    title="目標を編集"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleDeleteGoal(goal.id)}
                    title="目標を削除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>

              {isGoalExpanded && (
                <CardContent className="pt-0 space-y-4">
                  {goalMilestones.map((milestone) => {
                    const milestoneTasks = filterTasks(getTasksByMilestone(milestone.id).filter(t => !t.parentTaskId))
                    const isMilestoneExpanded = expandedMilestones.has(milestone.id)
                    const milestoneProgress = calculateMilestoneProgress(milestone.id)
                    const isCompleted = milestone.status === 'completed'

                    return (
                      <div key={milestone.id} className={`border rounded-lg p-3 ${isCompleted ? 'bg-muted/50 opacity-75' : ''}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={() => toggleMilestone(milestone.id)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {isMilestoneExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Flag className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                            {milestone.name}
                          </span>
                          {milestone.targetDate && (
                            <span className="text-xs text-muted-foreground">
                              〜{milestone.targetDate}
                            </span>
                          )}
                          {milestoneProgress.total > 0 && (
                            <div className="flex items-center gap-2">
                              <Progress value={milestoneProgress.percentage} className="w-16 h-1.5" />
                              <span className="text-xs text-muted-foreground">
                                {milestoneProgress.completed}/{milestoneProgress.total}
                              </span>
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {milestoneTasks.length}タスク
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => openNewTaskDialog(milestone.id)}
                            title="タスク追加"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          {!isCompleted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                              onClick={() => handleCompleteMilestone(milestone.id)}
                              title="マイルストーンを完了"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => openEditMilestoneDialog(milestone)}
                            title="マイルストーンを編集"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDeleteMilestone(milestone.id)}
                            title="マイルストーンを削除"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {isMilestoneExpanded && (
                          <div className="space-y-1 ml-4">
                            {milestoneTasks.map((task) => {
                              const childTasks = getChildTasks(task.id)
                              const filteredChildTasks = filterTasks(childTasks)
                              const hasChildren = filteredChildTasks.length > 0
                              const isTaskExpanded = expandedTasks.has(task.id)

                              return (
                                <div key={task.id}>
                                  <div className={`flex items-center gap-2 p-2 rounded hover:bg-muted/50 group transition-colors duration-500 ${
                                    recentlyCompleted.has(task.id) ? 'bg-green-100 dark:bg-green-900/30' : ''
                                  }`}>
                                    {hasChildren ? (
                                      <button
                                        onClick={() => toggleTask(task.id)}
                                        className="p-1 hover:bg-muted rounded"
                                      >
                                        {isTaskExpanded ? (
                                          <ChevronDown className="h-3 w-3" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3" />
                                        )}
                                      </button>
                                    ) : (
                                      <div className="w-6" />
                                    )}
                                    <Checkbox
                                      checked={task.completed}
                                      onCheckedChange={() => handleToggleTaskComplete(task.id)}
                                    />
                                    <span
                                      className={`flex-1 text-sm transition-all duration-300 ${
                                        task.completed
                                          ? 'line-through text-muted-foreground'
                                          : ''
                                      }`}
                                    >
                                      {task.name}
                                    </span>
                                    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => openNewTaskDialog(task.milestoneId, task.id)}
                                        title="サブタスク追加"
                                      >
                                        <Plus className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => openEditTaskDialog(task)}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleDeleteTask(task.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* 子タスク */}
                                  {hasChildren && isTaskExpanded && (
                                    <div className="ml-8 space-y-1">
                                      {filteredChildTasks.map((childTask) => (
                                        <div
                                          key={childTask.id}
                                          className={`flex items-center gap-2 p-2 rounded hover:bg-muted/50 group transition-colors duration-500 ${
                                            recentlyCompleted.has(childTask.id) ? 'bg-green-100 dark:bg-green-900/30' : ''
                                          }`}
                                        >
                                          <div className="w-6" />
                                          <Checkbox
                                            checked={childTask.completed}
                                            onCheckedChange={() => handleToggleTaskComplete(childTask.id)}
                                          />
                                          <span
                                            className={`flex-1 text-sm transition-all duration-300 ${
                                              childTask.completed
                                                ? 'line-through text-muted-foreground'
                                                : ''
                                            }`}
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
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0"
                                              onClick={() => handleDeleteTask(childTask.id)}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}

                            {milestoneTasks.length === 0 && (
                              <p className="text-sm text-muted-foreground py-2 text-center">
                                タスクがありません
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {goalMilestones.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2 text-center">
                      マイルストーンがありません
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}

        {/* スタンドアロンタスク（目標なし） */}
        {standaloneTasks.length > 0 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-muted-foreground">目標なしタスク</span>
                <span className="text-sm text-muted-foreground ml-auto">
                  {standaloneTasks.length}タスク
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => openNewTaskDialog()}
                  title="タスク追加"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1">
                {standaloneTasks.map((task) => {
                  const childTasks = getChildTasks(task.id)
                  const filteredChildTasks = filterTasks(childTasks)
                  const hasChildren = filteredChildTasks.length > 0
                  const isTaskExpanded = expandedTasks.has(task.id)

                  return (
                    <div key={task.id}>
                      <div className={`flex items-center gap-2 p-2 rounded hover:bg-muted/50 group transition-colors duration-500 ${
                        recentlyCompleted.has(task.id) ? 'bg-green-100 dark:bg-green-900/30' : ''
                      }`}>
                        {hasChildren ? (
                          <button
                            onClick={() => toggleTask(task.id)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {isTaskExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                        ) : (
                          <div className="w-6" />
                        )}
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => handleToggleTaskComplete(task.id)}
                        />
                        <span
                          className={`flex-1 text-sm ${
                            task.completed
                              ? 'line-through text-muted-foreground'
                              : ''
                          }`}
                        >
                          {task.name}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => openNewTaskDialog(undefined, task.id)}
                            title="サブタスク追加"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => openEditTaskDialog(task)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* 子タスク */}
                      {hasChildren && isTaskExpanded && (
                        <div className="ml-8 space-y-1">
                          {filteredChildTasks.map((childTask) => (
                            <div
                              key={childTask.id}
                              className={`flex items-center gap-2 p-2 rounded hover:bg-muted/50 group transition-colors duration-500 ${
                                recentlyCompleted.has(childTask.id) ? 'bg-green-100 dark:bg-green-900/30' : ''
                              }`}
                            >
                              <div className="w-6" />
                              <Checkbox
                                checked={childTask.completed}
                                onCheckedChange={() => handleToggleTaskComplete(childTask.id)}
                              />
                              <span
                                className={`flex-1 text-sm ${
                                  childTask.completed
                                    ? 'line-through text-muted-foreground'
                                    : ''
                                }`}
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleDeleteTask(childTask.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <TaskDialog
        dialog={taskDialog}
        goals={goals}
        milestones={milestones}
        tasks={tasks}
        onSave={handleSaveTask}
      />

      <GoalDialog
        dialog={goalDialog}
        onSave={handleSaveGoal}
      />

      <MilestoneDialog
        dialog={milestoneDialog}
        goals={goals}
        onSave={handleSaveMilestone}
      />
    </div>
  )
}
