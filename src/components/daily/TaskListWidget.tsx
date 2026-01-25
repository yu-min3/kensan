import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { GoalBadge } from '@/components/common/GoalBadge'
import { EntityMemoSection } from '@/components/common/EntityMemoSection'
import { useTaskStore } from '@/stores/useTaskStore'
import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { ChevronRight, ChevronDown, ListTodo, GripVertical, MessageSquare } from 'lucide-react'
import type { Task, Goal, Milestone } from '@/types'

// ドラッグデータの型
export interface TaskDragData {
  type: 'task'
  taskId: string
  taskName: string
  milestoneId?: string
  milestoneName?: string
  goalId?: string
  goalName?: string
  goalColor?: string
}

// ドラッグ可能なタスクアイテム
interface DraggableTaskProps {
  task: Task
  goal?: Goal
  milestone?: Milestone
  onMemoClick?: (task: Task) => void
}

function DraggableTask({ task, goal, milestone, onMemoClick }: DraggableTaskProps) {
  const dragData: TaskDragData = {
    type: 'task',
    taskId: task.id,
    taskName: task.name,
    milestoneId: milestone?.id,
    milestoneName: milestone?.name,
    goalId: goal?.id,
    goalName: goal?.name,
    goalColor: goal?.color,
  }

  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `draggable-task-${task.id}`,
    data: dragData,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 p-2 rounded-md text-sm transition-colors',
        'bg-background border border-border',
        'hover:bg-muted/50',
        isDragging && 'opacity-50 shadow-lg z-50'
      )}
    >
      <div
        className="cursor-grab active:cursor-grabbing flex items-center gap-2 flex-1 min-w-0"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="truncate flex-1">{task.name}</span>
      </div>
      {/* メモボタン（ホバーで表示） */}
      {onMemoClick && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            onMemoClick(task)
          }}
          title="メモ"
        >
          <MessageSquare className="h-3 w-3 text-muted-foreground" />
        </Button>
      )}
    </div>
  )
}

export function TaskListWidget() {
  const { goals, tasks, getTasksByMilestone, getMilestonesByGoal } = useTaskStore()

  // 展開状態の管理
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set(goals.map((g) => g.id)))
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())

  // メモダイアログの状態
  const [memoDialogTask, setMemoDialogTask] = useState<Task | null>(null)

  const handleMemoClick = (task: Task) => {
    setMemoDialogTask(task)
  }

  // 未完了のトップレベルタスクのみ取得
  const getIncompleteTasks = (milestoneId: string): Task[] => {
    return getTasksByMilestone(milestoneId).filter((t) => !t.completed && !t.parentTaskId)
  }

  // マイルストーンなしの未完了タスク
  const standaloneIncompleteTasks = tasks.filter(
    (t) => !t.milestoneId && !t.parentTaskId && !t.completed
  )

  // 目標の展開をトグル
  const toggleGoal = (goalId: string) => {
    const newExpanded = new Set(expandedGoals)
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId)
    } else {
      newExpanded.add(goalId)
    }
    setExpandedGoals(newExpanded)
  }

  // マイルストーンの展開をトグル
  const toggleMilestone = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones)
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId)
    } else {
      newExpanded.add(milestoneId)
    }
    setExpandedMilestones(newExpanded)
  }

  // タスクが存在する目標のみ表示
  const goalsWithTasks = goals.filter((goal) => {
    const goalMilestones = getMilestonesByGoal(goal.id)
    return goalMilestones.some((m) => getIncompleteTasks(m.id).length > 0)
  })

  // 全タスク数をカウント
  const totalTaskCount =
    goalsWithTasks.reduce((acc, goal) => {
      const goalMilestones = getMilestonesByGoal(goal.id)
      return acc + goalMilestones.reduce((mAcc, m) => mAcc + getIncompleteTasks(m.id).length, 0)
    }, 0) + standaloneIncompleteTasks.length

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="py-3 px-4 border-b flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="h-4 w-4" />
          タスク
          <span className="text-xs text-muted-foreground ml-auto">{totalTaskCount}件</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-3">
            {totalTaskCount === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
                未完了のタスクがありません
              </div>
            ) : (
              <>
                {/* 目標ごとのタスク */}
                {goalsWithTasks.map((goal) => {
                  const goalMilestones = getMilestonesByGoal(goal.id).filter(
                    (m) => m.status !== 'archived' && getIncompleteTasks(m.id).length > 0
                  )
                  const isGoalExpanded = expandedGoals.has(goal.id)

                  return (
                    <div key={goal.id} className="space-y-1">
                      {/* 目標ヘッダー */}
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        {isGoalExpanded ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        )}
                        <GoalBadge name={goal.name} color={goal.color} size="sm" />
                      </button>

                      {/* マイルストーンとタスク */}
                      {isGoalExpanded && (
                        <div className="ml-4 space-y-2">
                          {goalMilestones.map((milestone) => {
                            const milestoneTasks = getIncompleteTasks(milestone.id)
                            const isMilestoneExpanded = expandedMilestones.has(milestone.id)

                            // マイルストーンが1つだけの場合は自動展開
                            const shouldShowTasks =
                              goalMilestones.length === 1 || isMilestoneExpanded

                            return (
                              <div key={milestone.id} className="space-y-1">
                                {/* マイルストーンヘッダー（複数ある場合のみ表示） */}
                                {goalMilestones.length > 1 && (
                                  <button
                                    onClick={() => toggleMilestone(milestone.id)}
                                    className="flex items-center gap-2 w-full px-2 py-1 rounded-md hover:bg-muted/30 transition-colors text-sm text-muted-foreground"
                                  >
                                    {isMilestoneExpanded ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                    <span className="truncate">{milestone.name}</span>
                                    <span className="text-xs ml-auto">{milestoneTasks.length}</span>
                                  </button>
                                )}

                                {/* タスクリスト */}
                                {shouldShowTasks && (
                                  <div className="space-y-1 ml-2">
                                    {milestoneTasks.map((task) => (
                                      <DraggableTask
                                        key={task.id}
                                        task={task}
                                        goal={goal}
                                        milestone={milestone}
                                        onMemoClick={handleMemoClick}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* マイルストーンなしタスク */}
                {standaloneIncompleteTasks.length > 0 && (
                  <div className="space-y-1 pt-2 border-t">
                    <div className="flex items-center gap-2 px-2 py-1 text-sm text-muted-foreground">
                      <ListTodo className="h-3 w-3" />
                      <span>目標なし</span>
                      <span className="text-xs ml-auto">{standaloneIncompleteTasks.length}</span>
                    </div>
                    <div className="space-y-1 ml-2">
                      {standaloneIncompleteTasks.map((task) => (
                        <DraggableTask
                          key={task.id}
                          task={task}
                          onMemoClick={handleMemoClick}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* メモダイアログ */}
      <Dialog open={!!memoDialogTask} onOpenChange={(open) => !open && setMemoDialogTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {memoDialogTask?.name}
            </DialogTitle>
          </DialogHeader>
          {memoDialogTask && (
            <EntityMemoSection
              entityType="task"
              entityId={memoDialogTask.id}
              maxHeight="300px"
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
