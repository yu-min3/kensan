import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { TimeRangeInput } from '@/components/ui/time-range-input'
import { useTaskStore } from '@/stores/useTaskStore'
import type { TaskInputMode } from '@/hooks/useTimeBlockDialog'
import type { Goal, Milestone } from '@/types'
import { AlertTriangle, Plus } from 'lucide-react'

interface TimeBlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string

  // Mode: plan (予定) or entry (実績)
  mode?: 'plan' | 'entry'

  // Form state
  taskName: string
  startTime: string
  endTime: string
  taskId: string | undefined
  milestoneId: string | undefined
  taskInputMode: TaskInputMode
  selectedGoal: Goal | undefined

  // Entry-specific state
  date?: string
  description?: string

  // Callbacks
  onTaskNameChange: (value: string) => void
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  onTaskIdChange: (value: string | undefined) => void
  onMilestoneIdChange: (value: string | undefined) => void
  onTaskInputModeChange: (mode: TaskInputMode) => void
  onSave: () => void

  // Entry-specific callbacks
  onDateChange?: (value: string) => void
  onDescriptionChange?: (value: string) => void

  // Options
  showTaskInputModeToggle?: boolean
  isEditMode?: boolean
  isSubmitting?: boolean
}

export function TimeBlockDialog({
  open,
  onOpenChange,
  title,
  mode = 'plan',
  taskName,
  startTime,
  endTime,
  taskId,
  milestoneId,
  taskInputMode,
  selectedGoal,
  date,
  description,
  onTaskNameChange,
  onStartTimeChange,
  onEndTimeChange,
  onTaskIdChange,
  onMilestoneIdChange,
  onTaskInputModeChange,
  onSave,
  onDateChange,
  onDescriptionChange,
  showTaskInputModeToggle = true,
  isEditMode = false,
  isSubmitting = false,
}: TimeBlockDialogProps) {
  const { tasks, goals, milestones, addTask } = useTaskStore()
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskMilestoneId, setNewTaskMilestoneId] = useState<string | undefined>(undefined)

  // 新規タスクを追加
  const handleAddTask = async () => {
    if (!newTaskName.trim()) return

    const taskName = newTaskName.trim()

    await addTask({
      name: taskName,
      milestoneId: newTaskMilestoneId,
    })

    // タスク追加後、タスク名で直接設定（storeのtasksリストは非同期で更新されるため）
    onTaskNameChange(taskName)
    if (newTaskMilestoneId) {
      onMilestoneIdChange(newTaskMilestoneId)
    }
    // taskIdは次回のtasks更新後に自動的に反映されるため、一旦undefinedのまま
    // ただしtaskNameとmilestoneIdが設定されているので、保存時に正しいgoalが紐づく

    // リセット
    setNewTaskName('')
    setNewTaskMilestoneId(undefined)
    setIsAddingTask(false)
  }

  // 目標がないかどうか（警告表示用）
  const showNoGoalWarning = taskInputMode === 'manual' && !milestoneId && taskName.length > 0

  // 所要時間計算
  const calculateDuration = () => {
    if (!startTime || !endTime) return null
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const startMinutes = sh * 60 + sm
    const endMinutes = eh * 60 + em
    const durationMinutes = endMinutes - startMinutes
    if (durationMinutes <= 0) return null
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const duration = calculateDuration()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task input mode toggle */}
          {showTaskInputModeToggle && (
            <div>
              <Label className="mb-2 block">タスクの指定方法</Label>
              <div className="flex rounded-lg border p-1 bg-muted/30">
                <button
                  type="button"
                  className={`flex-1 py-1.5 px-3 text-sm rounded-md transition-colors ${
                    taskInputMode === 'existing'
                      ? 'bg-background shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => {
                    onTaskInputModeChange('existing')
                    onTaskNameChange('')
                    onMilestoneIdChange(undefined)
                  }}
                >
                  タスクから選択
                </button>
                <button
                  type="button"
                  className={`flex-1 py-1.5 px-3 text-sm rounded-md transition-colors ${
                    taskInputMode === 'manual'
                      ? 'bg-background shadow-sm font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => {
                    onTaskInputModeChange('manual')
                    onTaskIdChange(undefined)
                  }}
                >
                  タスク名を入力
                </button>
              </div>
            </div>
          )}

          {/* Existing task selection mode (デフォルト) */}
          {taskInputMode === 'existing' && showTaskInputModeToggle && (
            <div className="space-y-3">
              <div>
                <Label>タスクを選択</Label>
                <Select
                  value={taskId || ''}
                  onValueChange={(v) => {
                    const task = tasks.find((t) => t.id === v)
                    if (task) {
                      onTaskIdChange(v)
                      onTaskNameChange(task.name)
                      if (task.milestoneId) {
                        onMilestoneIdChange(task.milestoneId)
                      }
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="タスクを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <GroupedTaskList
                      tasks={tasks}
                      goals={goals}
                      milestones={milestones}
                    />
                  </SelectContent>
                </Select>
                {taskId && selectedGoal && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: selectedGoal.color }}
                    />
                    {selectedGoal.name}
                  </p>
                )}
              </div>

              {/* タスク追加セクション */}
              {!isAddingTask ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setIsAddingTask(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  新しいタスクを作成
                </Button>
              ) : (
                <div className="p-3 rounded-md border bg-muted/30 space-y-3">
                  <div>
                    <Label htmlFor="newTaskName" className="text-xs">タスク名</Label>
                    <Input
                      id="newTaskName"
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      placeholder="新しいタスク名"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">マイルストーン</Label>
                    <Select
                      value={newTaskMilestoneId || ''}
                      onValueChange={(v) => setNewTaskMilestoneId(v || undefined)}
                    >
                      <SelectTrigger className="mt-1 h-8 text-sm">
                        <SelectValue placeholder="選択（任意）" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">なし</SelectItem>
                        {goals
                          .filter(g => !g.isArchived)
                          .map(goal => {
                            const goalMilestones = milestones.filter(
                              m => m.goalId === goal.id && m.status === 'active'
                            )
                            if (goalMilestones.length === 0) return null
                            return (
                              <div key={goal.id}>
                                <div className="px-2 py-1 text-xs text-muted-foreground flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: goal.color }}
                                  />
                                  {goal.name}
                                </div>
                                {goalMilestones.map(milestone => (
                                  <SelectItem key={milestone.id} value={milestone.id} label={milestone.name}>
                                    {milestone.name}
                                  </SelectItem>
                                ))}
                              </div>
                            )
                          })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={handleAddTask}
                      disabled={!newTaskName.trim()}
                    >
                      作成して選択
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setIsAddingTask(false)
                        setNewTaskName('')
                        setNewTaskMilestoneId(undefined)
                      }}
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual input mode */}
          {(taskInputMode === 'manual' || !showTaskInputModeToggle) && (
            <>
              <div>
                <Label htmlFor="blockTaskName">タスク名</Label>
                <Input
                  id="blockTaskName"
                  value={taskName}
                  onChange={(e) => onTaskNameChange(e.target.value)}
                  placeholder="例: MTG、休憩など"
                  className="mt-1"
                />
              </div>

              <MilestoneSelector
                milestoneId={milestoneId}
                onMilestoneIdChange={onMilestoneIdChange}
                goals={goals}
                milestones={milestones}
                selectedGoal={selectedGoal}
              />

              {/* 目標未設定の警告 */}
              {showNoGoalWarning && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p className="text-xs">
                    マイルストーンが未設定のため、目標別の達成率には含まれません。
                  </p>
                </div>
              )}
            </>
          )}

          {/* 日付 (実績モードのみ) */}
          {mode === 'entry' && onDateChange && (
            <div>
              <Label htmlFor="entryDate">日付</Label>
              <Input
                id="entryDate"
                type="date"
                value={date || ''}
                onChange={(e) => onDateChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          {/* Time range */}
          <div>
            <Label>時間</Label>
            <div className="mt-1">
              <TimeRangeInput
                startTime={startTime}
                endTime={endTime}
                onStartTimeChange={onStartTimeChange}
                onEndTimeChange={onEndTimeChange}
              />
            </div>
            {duration && (
              <p className="text-xs text-muted-foreground mt-1">
                所要時間: {duration}
              </p>
            )}
          </div>

          {/* 説明 (実績モードのみ) */}
          {mode === 'entry' && onDescriptionChange && (
            <div>
              <Label htmlFor="entryDescription">説明（任意）</Label>
              <Textarea
                id="entryDescription"
                value={description || ''}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="作業内容の詳細..."
                className="mt-1"
                rows={2}
              />
            </div>
          )}

          {/* Alternative: existing task selection for non-toggle mode */}
          {!showTaskInputModeToggle && (
            <div>
              <Label>または既存タスクから選択</Label>
              <Select
                value={taskId || ''}
                onValueChange={(v) => {
                  const task = tasks.find((t) => t.id === v)
                  if (task) {
                    onTaskIdChange(v)
                    onTaskNameChange(task.name)
                    if (task.milestoneId) {
                      onMilestoneIdChange(task.milestoneId)
                    }
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="タスクを選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.filter((t) => !t.completed && !t.parentTaskId).map((task) => (
                    <SelectItem key={task.id} value={task.id} label={task.name}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            キャンセル
          </Button>
          <Button onClick={onSave} disabled={!taskName || isSubmitting}>
            {isSubmitting ? '保存中...' : isEditMode ? '保存' : '追加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Extracted milestone selector component
interface MilestoneSelectorProps {
  milestoneId: string | undefined
  onMilestoneIdChange: (value: string | undefined) => void
  goals: Goal[]
  milestones: Milestone[]
  selectedGoal: Goal | undefined
}

function MilestoneSelector({
  milestoneId,
  onMilestoneIdChange,
  goals,
  milestones,
  selectedGoal,
}: MilestoneSelectorProps) {
  return (
    <div>
      <Label>マイルストーン（任意）</Label>
      <Select
        value={milestoneId || ''}
        onValueChange={(v) => onMilestoneIdChange(v || undefined)}
      >
        <SelectTrigger className="mt-1">
          <SelectValue placeholder="マイルストーンを選択" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">なし</SelectItem>
          {goals
            .filter(g => !g.isArchived)
            .map(goal => {
              const goalMilestones = milestones.filter(
                m => m.goalId === goal.id && m.status === 'active'
              )
              if (goalMilestones.length === 0) return null
              return (
                <div key={goal.id}>
                  <div className="px-2 py-1 text-xs text-muted-foreground flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: goal.color }}
                    />
                    {goal.name}
                  </div>
                  {goalMilestones.map(milestone => (
                    <SelectItem key={milestone.id} value={milestone.id} label={milestone.name}>
                      {milestone.name}
                    </SelectItem>
                  ))}
                </div>
              )
            })}
        </SelectContent>
      </Select>
      {selectedGoal && (
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: selectedGoal.color }}
          />
          {selectedGoal.name}
        </p>
      )}
    </div>
  )
}

// 目標・マイルストーン別にグループ化されたタスクリスト
interface GroupedTaskListProps {
  tasks: import('@/types').Task[]
  goals: Goal[]
  milestones: Milestone[]
}

function GroupedTaskList({
  tasks,
  goals,
  milestones,
}: GroupedTaskListProps) {
  // 未完了で親タスクでないタスクのみ
  const activeTasks = tasks.filter((t) => !t.completed && !t.parentTaskId)

  // 目標なしタスク
  const noGoalTasks = activeTasks.filter((t) => !t.milestoneId)

  // 目標別にグループ化
  const activeGoals = goals.filter((g) => !g.isArchived)

  return (
    <>
      {/* 目標ごとにグループ表示 */}
      {activeGoals.map((goal) => {
        const goalMilestones = milestones.filter(
          (m) => m.goalId === goal.id && m.status === 'active'
        )
        // この目標に紐づくタスクを取得
        const goalTaskIds = new Set(
          goalMilestones.flatMap((m) =>
            activeTasks.filter((t) => t.milestoneId === m.id).map((t) => t.id)
          )
        )
        if (goalTaskIds.size === 0) return null

        return (
          <div key={goal.id}>
            {/* 目標ヘッダー */}
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2 bg-muted/50 sticky top-0">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: goal.color }}
              />
              {goal.name}
            </div>
            {/* マイルストーンごとにタスク表示 */}
            {goalMilestones.map((milestone) => {
              const milestoneTasks = activeTasks.filter(
                (t) => t.milestoneId === milestone.id
              )
              if (milestoneTasks.length === 0) return null

              return (
                <div key={milestone.id}>
                  {/* マイルストーンヘッダー */}
                  <div className="px-4 py-1 text-xs text-muted-foreground">
                    {milestone.name}
                  </div>
                  {/* タスク */}
                  {milestoneTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id} label={task.name}>
                      <span className="pl-2">{task.name}</span>
                    </SelectItem>
                  ))}
                </div>
              )
            })}
          </div>
        )
      })}

      {/* 目標なしタスク */}
      {noGoalTasks.length > 0 && (
        <div>
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 sticky top-0">
            目標なし
          </div>
          {noGoalTasks.map((task) => (
            <SelectItem key={task.id} value={task.id} label={task.name}>
              {task.name}
            </SelectItem>
          ))}
        </div>
      )}
    </>
  )
}
