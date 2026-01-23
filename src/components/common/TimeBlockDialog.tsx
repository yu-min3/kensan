import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
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

interface TimeBlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string

  // Form state
  taskName: string
  startTime: string
  endTime: string
  taskId: string | undefined
  milestoneId: string | undefined
  taskInputMode: TaskInputMode
  selectedGoal: Goal | undefined

  // Callbacks
  onTaskNameChange: (value: string) => void
  onStartTimeChange: (value: string) => void
  onEndTimeChange: (value: string) => void
  onTaskIdChange: (value: string | undefined) => void
  onMilestoneIdChange: (value: string | undefined) => void
  onTaskInputModeChange: (mode: TaskInputMode) => void
  onSave: () => void

  // Options
  showTaskInputModeToggle?: boolean
  isEditMode?: boolean
}

export function TimeBlockDialog({
  open,
  onOpenChange,
  title,
  taskName,
  startTime,
  endTime,
  taskId,
  milestoneId,
  taskInputMode,
  selectedGoal,
  onTaskNameChange,
  onStartTimeChange,
  onEndTimeChange,
  onTaskIdChange,
  onMilestoneIdChange,
  onTaskInputModeChange,
  onSave,
  showTaskInputModeToggle = true,
  isEditMode = false,
}: TimeBlockDialogProps) {
  const { tasks, goals, milestones, getMilestoneById, getGoalById } = useTaskStore()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
                  既存タスクから選択
                </button>
              </div>
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
                  placeholder="例: ICA試験勉強"
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
            </>
          )}

          {/* Existing task selection mode */}
          {taskInputMode === 'existing' && showTaskInputModeToggle && (
            <div>
              <Label>既存タスクを選択</Label>
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
                  {tasks.filter((t) => !t.completed && !t.parentTaskId).map((task) => {
                    const milestone = task.milestoneId ? getMilestoneById(task.milestoneId) : undefined
                    const goal = milestone ? getGoalById(milestone.goalId) : undefined
                    return (
                      <SelectItem key={task.id} value={task.id} label={task.name}>
                        <div className="flex items-center gap-2">
                          <span>{task.name}</span>
                          {goal && (
                            <span className="text-xs text-muted-foreground">
                              ({goal.name})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {taskId && selectedGoal && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: selectedGoal.color }}
                  />
                  Goal: {selectedGoal.name}
                </p>
              )}
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
          </div>

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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={onSave} disabled={!taskName}>
            {isEditMode ? '保存' : '追加'}
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
          Goal: {selectedGoal.name}
        </p>
      )}
    </div>
  )
}
