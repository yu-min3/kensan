import { useState, useEffect } from 'react'
import { addDays, subDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { TimeBlockTimeline, calculateTimeFromY } from '@/components/common/TimeBlockTimeline'
import { TimeBlockDialog } from '@/components/common/TimeBlockDialog'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTimerStore } from '@/stores/useTimerStore'
import { useTimeBlockDialog } from '@/hooks/useTimeBlockDialog'
import { formatDateIso, formatDateShortJa } from '@/lib/dateFormat'
import type { Goal, Milestone, Task, TimeBlock, TimeEntry } from '@/types'
import type { TaskInputMode } from '@/hooks/useTimeBlockDialog'
import type { TaskDragData } from './TaskListWidget'
import { WidgetError } from '@/components/common/WidgetError'
import {
  Clock,
  Plus,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  AlertCircle,
} from 'lucide-react'

interface TimeBlockSectionProps {
  showAddButtons?: boolean
  // ドラッグ&ドロップ用（親のDndContextから渡される）
  isDraggingTask?: boolean
  dragOverY?: number | null
  onTaskDrop?: (data: TaskDragData, startTime: string, endTime: string) => void
  // 日付状態（親コンポーネントから渡される）
  selectedDate?: Date
  onDateChange?: (date: Date) => void
}

// 期限タスク表示パネル
interface DueTasksPanelProps {
  date: string
  tasks: Task[]
  getMilestoneById: (id: string) => Milestone | undefined
  getGoalById: (id: string) => Goal | undefined
}

function DueTasksPanel({ date, tasks, getMilestoneById, getGoalById }: DueTasksPanelProps) {
  const dueTasks = tasks.filter((t) => t.dueDate === date && !t.completed)
  if (dueTasks.length === 0) return null

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">
          期限: {dueTasks.length}件のタスク
        </span>
      </div>
      <ul className="space-y-1">
        {dueTasks.map((task) => {
          const milestone = task.milestoneId
            ? getMilestoneById(task.milestoneId)
            : undefined
          const goal = milestone ? getGoalById(milestone.goalId) : undefined
          return (
            <li key={task.id} className="flex items-center gap-2 text-sm">
              {goal && (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: goal.color }}
                />
              )}
              <span className="truncate">{task.name}</span>
              {task.estimatedMinutes && (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  ({task.estimatedMinutes}分)
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Y座標からタイムブロックの時間を計算するヘルパーをエクスポート
export { calculateTimeFromY }

// 実績ダイアログ用のstate型
interface TimeEntryDialogState {
  isOpen: boolean
  editingEntryId: string | null
  taskName: string
  date: string
  startTime: string
  endTime: string
  taskId: string | undefined
  milestoneId: string | undefined
  description: string
  taskInputMode: TaskInputMode
}

export function TimeBlockSection({
  showAddButtons = true,
  isDraggingTask = false,
  dragOverY = null,
  selectedDate: propSelectedDate,
  onDateChange: propOnDateChange,
}: TimeBlockSectionProps) {
  const { timezone } = useSettingsStore()
  const { tasks, getMilestoneById, getGoalById } = useTaskStore()
  const { currentTimer, startTimer } = useTimerStore()
  const {
    timeBlocks,
    timeEntries,
    error: timeBlockError,
    fetchTimeBlocksForLocalDate,
    fetchTimeEntriesForLocalDate,
    updateTimeBlock,
    updateTimeEntry,
    deleteTimeEntry,
    addTimeEntry,
  } = useTimeBlockStore()
  const { error: taskError } = useTaskStore()

  // 日付状態: propsがあればpropsを使用、なければ内部状態を使用（後方互換性）
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date>(new Date())
  const selectedDate = propSelectedDate ?? internalSelectedDate
  const setSelectedDate = propOnDateChange ?? setInternalSelectedDate

  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isEntrySubmitting, setIsEntrySubmitting] = useState(false)

  // 実績ダイアログのstate
  const [entryDialog, setEntryDialog] = useState<TimeEntryDialogState>({
    isOpen: false,
    editingEntryId: null,
    taskName: '',
    date: formatDateIso(new Date()),
    startTime: '09:00',
    endTime: '10:00',
    taskId: undefined,
    milestoneId: undefined,
    description: '',
    taskInputMode: 'existing',
  })

  const selectedDateIso = formatDateIso(selectedDate)

  // TimeBlock Dialog Hook
  const timeBlockDialog = useTimeBlockDialog({ defaultDate: selectedDateIso })

  // Get goal from selected milestone (for entry dialog)
  const entrySelectedMilestone = entryDialog.milestoneId
    ? getMilestoneById(entryDialog.milestoneId)
    : undefined
  const entrySelectedGoal = entrySelectedMilestone
    ? getGoalById(entrySelectedMilestone.goalId)
    : undefined

  // Fetch data when date changes
  useEffect(() => {
    const tz = timezone || 'Asia/Tokyo'
    fetchTimeBlocksForLocalDate(selectedDateIso, tz)
    fetchTimeEntriesForLocalDate(selectedDateIso, tz)
  }, [selectedDateIso, timezone, fetchTimeBlocksForLocalDate, fetchTimeEntriesForLocalDate])

  // Navigation handlers
  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1))
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1))
  const goToToday = () => setSelectedDate(new Date())

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setIsCalendarOpen(false)
    }
  }

  // Filter data for selected date
  const filteredBlocks = timeBlocks.filter((b) => b.date === selectedDateIso)
  const filteredEntries = timeEntries.filter((e) => e.date === selectedDateIso)

  // 実績ダイアログを開く（新規）
  const openNewEntryDialog = () => {
    const now = new Date()
    const startH = now.getHours().toString().padStart(2, '0')
    const startM = Math.floor(now.getMinutes() / 15) * 15
    const endH = (now.getHours() + 1).toString().padStart(2, '0')

    setEntryDialog({
      isOpen: true,
      editingEntryId: null,
      taskName: '',
      date: selectedDateIso,
      startTime: `${startH}:${startM.toString().padStart(2, '0')}`,
      endTime: `${endH}:${startM.toString().padStart(2, '0')}`,
      taskId: undefined,
      milestoneId: undefined,
      description: '',
      taskInputMode: 'existing',
    })
  }

  // 実績ダイアログを開く（編集）
  const openEditEntryDialog = (entry: TimeEntry) => {
    setEntryDialog({
      isOpen: true,
      editingEntryId: entry.id,
      taskName: entry.taskName,
      date: entry.date,
      startTime: entry.startTime.slice(0, 5),
      endTime: entry.endTime.slice(0, 5),
      taskId: entry.taskId,
      milestoneId: entry.milestoneId,
      description: entry.description || '',
      taskInputMode: entry.taskId ? 'existing' : 'manual',
    })
  }

  // 実績ダイアログを閉じる
  const closeEntryDialog = () => {
    setEntryDialog((prev) => ({ ...prev, isOpen: false }))
  }

  // 実績を保存
  const handleEntrySave = async () => {
    if (!entryDialog.taskName || !entryDialog.date || !entryDialog.startTime || !entryDialog.endTime) return

    setIsEntrySubmitting(true)
    try {
      const data = {
        taskName: entryDialog.taskName,
        date: entryDialog.date,
        startTime: entryDialog.startTime,
        endTime: entryDialog.endTime,
        taskId: entryDialog.taskId,
        milestoneId: entryDialog.milestoneId,
        milestoneName: entrySelectedMilestone?.name,
        goalId: entrySelectedGoal?.id,
        goalName: entrySelectedGoal?.name,
        goalColor: entrySelectedGoal?.color,
        description: entryDialog.description || undefined,
      }

      if (entryDialog.editingEntryId) {
        await updateTimeEntry(entryDialog.editingEntryId, data)
      } else {
        await addTimeEntry(data)
      }

      closeEntryDialog()
    } catch (error) {
      console.error('Failed to save time entry:', error)
    } finally {
      setIsEntrySubmitting(false)
    }
  }

  const handleEntryDelete = async (entryId: string) => {
    await deleteTimeEntry(entryId)
  }

  const handleBlockClick = (block: TimeBlock) => {
    timeBlockDialog.openEditDialog(block)
  }

  const handleBlockStartTimer = async (block: TimeBlock) => {
    await startTimer({
      taskId: block.taskId,
      taskName: block.taskName,
      milestoneId: block.milestoneId,
      milestoneName: block.milestoneName,
      goalId: block.goalId,
      goalName: block.goalName,
      goalColor: block.goalColor,
    })
  }

  const isToday = formatDateIso(new Date()) === selectedDateIso

  return (
    <>
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            タイムブロック
          </CardTitle>
          <div className="flex items-center justify-between">
            {/* Date Selector */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goToPreviousDay}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 min-w-[120px]">
                    <CalendarIcon className="h-4 w-4" />
                    {formatDateShortJa(selectedDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    locale={ja}
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={goToNextDay}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              {!isToday && (
                <Button variant="ghost" size="sm" onClick={goToToday}>
                  今日
                </Button>
              )}
            </div>

            {/* Add buttons - 予定（左）、実績（右）の順 */}
            {showAddButtons && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => timeBlockDialog.openDialog()}
                >
                  <Plus className="h-4 w-4" />
                  予定追加
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={openNewEntryDialog}
                >
                  <ClipboardList className="h-4 w-4" />
                  実績追加
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* エラー表示 */}
          {(timeBlockError || taskError) && (
            <WidgetError
              message={timeBlockError || taskError || undefined}
              onRetry={() => {
                const tz = timezone || 'Asia/Tokyo'
                fetchTimeBlocksForLocalDate(selectedDateIso, tz)
                fetchTimeEntriesForLocalDate(selectedDateIso, tz)
              }}
              compact
            />
          )}

          {/* 期限が選択日のタスク */}
          <DueTasksPanel
            date={selectedDateIso}
            tasks={tasks}
            getMilestoneById={getMilestoneById}
            getGoalById={getGoalById}
          />

          <div>
            <TimeBlockTimeline
              timeBlocks={filteredBlocks}
              timeEntries={filteredEntries}
              showComparison={true}
              onBlockClick={handleBlockClick}
              onBlockDelete={timeBlockDialog.deleteBlock}
              onBlockResize={(blockId, startTime, endTime) => {
                updateTimeBlock(blockId, { startTime, endTime })
              }}
              onBlockStartTimer={handleBlockStartTimer}
              onEntryClick={openEditEntryDialog}
              onEntryDelete={handleEntryDelete}
              onEmptyDoubleClick={(startTime, endTime) => {
                timeBlockDialog.openDialogWithTime(startTime, endTime)
              }}
              isDraggingTask={isDraggingTask}
              dragOverY={dragOverY}
              isTimerRunning={!!currentTimer}
              // 今日の場合のみ実行中タイマーを表示
              runningTimer={isToday && currentTimer ? {
                taskName: currentTimer.taskName,
                startedAt: currentTimer.startedAt,
                goalId: currentTimer.goalId,
                goalName: currentTimer.goalName,
                goalColor: currentTimer.goalColor,
                milestoneName: currentTimer.milestoneName,
              } : null}
            />
          </div>
        </CardContent>
      </Card>

      {/* タイムブロック（予定）追加/編集ダイアログ */}
      <TimeBlockDialog
        open={timeBlockDialog.isOpen}
        onOpenChange={(open) => !open && timeBlockDialog.closeDialog()}
        title={
          timeBlockDialog.editingBlockId
            ? '予定を編集'
            : '予定を追加'
        }
        mode="plan"
        taskName={timeBlockDialog.taskName}
        startTime={timeBlockDialog.startTime}
        endTime={timeBlockDialog.endTime}
        taskId={timeBlockDialog.taskId}
        milestoneId={timeBlockDialog.milestoneId}
        taskInputMode={timeBlockDialog.taskInputMode}
        selectedGoal={timeBlockDialog.selectedGoal}
        onTaskNameChange={(v) => timeBlockDialog.setField('taskName', v)}
        onStartTimeChange={(v) => timeBlockDialog.setField('startTime', v)}
        onEndTimeChange={(v) => timeBlockDialog.setField('endTime', v)}
        onTaskIdChange={(v) => timeBlockDialog.setField('taskId', v)}
        onMilestoneIdChange={(v) => timeBlockDialog.setField('milestoneId', v)}
        onTaskInputModeChange={(v) => timeBlockDialog.setField('taskInputMode', v)}
        onSave={() => timeBlockDialog.save(selectedDateIso)}
        showTaskInputModeToggle={true}
        isEditMode={!!timeBlockDialog.editingBlockId}
      />

      {/* 時間記録（実績）追加/編集ダイアログ */}
      <TimeBlockDialog
        open={entryDialog.isOpen}
        onOpenChange={(open) => !open && closeEntryDialog()}
        title={entryDialog.editingEntryId ? '実績を編集' : '実績を追加'}
        mode="entry"
        taskName={entryDialog.taskName}
        startTime={entryDialog.startTime}
        endTime={entryDialog.endTime}
        taskId={entryDialog.taskId}
        milestoneId={entryDialog.milestoneId}
        taskInputMode={entryDialog.taskInputMode}
        selectedGoal={entrySelectedGoal}
        date={entryDialog.date}
        description={entryDialog.description}
        onTaskNameChange={(v) => setEntryDialog((prev) => ({ ...prev, taskName: v }))}
        onStartTimeChange={(v) => setEntryDialog((prev) => ({ ...prev, startTime: v }))}
        onEndTimeChange={(v) => setEntryDialog((prev) => ({ ...prev, endTime: v }))}
        onTaskIdChange={(v) => setEntryDialog((prev) => ({ ...prev, taskId: v }))}
        onMilestoneIdChange={(v) => setEntryDialog((prev) => ({ ...prev, milestoneId: v }))}
        onTaskInputModeChange={(v) => setEntryDialog((prev) => ({ ...prev, taskInputMode: v }))}
        onDateChange={(v) => setEntryDialog((prev) => ({ ...prev, date: v }))}
        onDescriptionChange={(v) => setEntryDialog((prev) => ({ ...prev, description: v }))}
        onSave={handleEntrySave}
        showTaskInputModeToggle={true}
        isEditMode={!!entryDialog.editingEntryId}
        isSubmitting={isEntrySubmitting}
      />
    </>
  )
}
