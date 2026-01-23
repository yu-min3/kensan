import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { GoalBadge } from '@/components/common/GoalBadge'
import { TimeBlockTimeline } from '@/components/common/TimeBlockTimeline'
import { TimeEntryList } from '@/components/common/TimeEntryList'
import { TimeBlockDialog } from '@/components/common/TimeBlockDialog'
import { StartTimerDialog } from '@/components/common/StartTimerDialog'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { useRoutineStore } from '@/stores/useRoutineStore'
import { useAnalyticsStore } from '@/stores/useAnalyticsStore'
import { useTimerStore } from '@/stores/useTimerStore'
import { useTimeBlockDialog } from '@/hooks/useTimeBlockDialog'
import { formatDateJa, formatDateIso, formatMinutes } from '@/lib/dateFormat'
import {
  Sun,
  Plus,
  Play,
  ArrowRight,
  Clock,
  // GripVertical, // 未スケジュールタスク用（一時的に非表示）
  RotateCcw,
  Square,
} from 'lucide-react'

export function M01Morning() {
  const { userName } = useSettingsStore()
  const { getTodayTimeBlocks, getTodayTimeEntries, updateTimeBlock } = useTimeBlockStore()
  const { getTodayRoutines } = useRoutineStore()
  const { weeklySummary, fetchWeeklySummary } = useAnalyticsStore()
  const { currentTimer, elapsedSeconds, stopTimer, isLoading: isTimerLoading } = useTimerStore()

  const todayDate = formatDateIso(new Date())

  // TimeBlock Dialog Hook
  const timeBlockDialog = useTimeBlockDialog({ defaultDate: todayDate })

  // Timer Dialog State
  const [isTimerDialogOpen, setIsTimerDialogOpen] = useState(false)

  useEffect(() => {
    fetchWeeklySummary()
  }, [fetchWeeklySummary])

  const todayBlocks = getTodayTimeBlocks()
  const todayEntries = getTodayTimeEntries()
  const todayRoutines = getTodayRoutines()
  const today = formatDateJa(new Date())

  // Timer handlers
  const handleStopTimer = async () => {
    await stopTimer()
  }

  // Format elapsed time for display
  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return [hours, minutes, secs].map(v => v.toString().padStart(2, '0')).join(':')
  }

  // 未スケジュールのタスク - 一時的に非表示（将来復活予定）
  // const unscheduledTasks = tasks.filter(
  //   (task) =>
  //     !task.completed &&
  //     !task.parentTaskId &&
  //     !todayBlocks.some((b) => b.taskId === task.id)
  // )

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sun className="h-8 w-8 text-slate-500" />
          <div>
            <h1 className="text-2xl font-bold">
              おはようございます、{userName}さん
            </h1>
            <p className="text-muted-foreground">{today}</p>
          </div>
        </div>
        <Link to="/evening">
          <Button variant="outline" className="gap-2">
            夜の画面へ
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左カラム: タイムブロック */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                今日のタイムブロック
              </CardTitle>
              <Button size="sm" className="gap-1" onClick={() => timeBlockDialog.openDialog()}>
                <Plus className="h-4 w-4" />
                追加
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border" style={{ backgroundColor: 'var(--timeblock-plan-bg)', borderColor: 'var(--timeblock-plan-border)' }} />
                  <span>予定（計画）</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border" style={{ backgroundColor: 'var(--timeblock-actual-bg)', borderColor: 'var(--timeblock-actual-border)' }} />
                  <span>実績</span>
                </div>
              </div>
              <TimeBlockTimeline
                timeBlocks={todayBlocks}
                timeEntries={todayEntries}
                showComparison={true}
                startHour={8}
                endHour={19}
                onBlockClick={timeBlockDialog.openEditDialog}
                onBlockDelete={timeBlockDialog.deleteBlock}
                onBlockResize={(blockId, startTime, endTime) => {
                  updateTimeBlock(blockId, { startTime, endTime })
                }}
              />
            </CardContent>
          </Card>

          {/* 今日の実績 */}
          <TimeEntryList
            entries={todayEntries}
            title="今日の実績"
            showAddButton={true}
            defaultDate={todayDate}
          />

          {/* 未スケジュールのタスク - 一時的に非表示（将来復活予定） */}
          {/* <Card>
            <CardHeader>
              <CardTitle className="text-base">未スケジュールのタスク</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {unscheduledTasks.slice(0, 5).map((task) => {
                  const project = projects.find((p) => p.id === task.projectId)
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
                      onClick={() => openNewTimeBlockDialog(task.id, task.name, project?.goalTag)}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={task.completed}
                        onChange={(e) => {
                          e.stopPropagation()
                          toggleTaskComplete(task.id)
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.name}</p>
                        {project && (
                          <p className="text-xs text-muted-foreground">
                            {project.name}
                          </p>
                        )}
                      </div>
                      {project?.goalTag && (
                        <TagBadge tag={project.goalTag} size="sm" />
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStartTimer(task.name)
                        }}
                        title="タイマー開始"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
                {unscheduledTasks.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    すべてのタスクがスケジュールされています
                  </p>
                )}
                <p className="text-xs text-muted-foreground text-center mt-2">
                  ↑ ドラッグしてタイムブロックに配置
                </p>
              </div>
            </CardContent>
          </Card> */}
        </div>

        {/* 右カラム: サイドパネル */}
        <div className="space-y-6">
          {/* 今日の定期タスク */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <RotateCcw className="h-4 w-4" />
                今日の定期タスク
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {todayRoutines.map((routine) => (
                  <div
                    key={routine.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    <input type="checkbox" className="h-4 w-4" />
                    <span className="flex-1 text-sm">{routine.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatMinutes(routine.estimatedMinutes)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 今週の進捗 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">今週の進捗</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {weeklySummary?.byGoal.slice(0, 3).map((goal) => (
                <div key={goal.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GoalBadge name={goal.name} color={goal.color} size="sm" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.floor(goal.minutes / 60)}h
                    </span>
                  </div>
                  <Progress
                    value={(goal.minutes / (20 * 60)) * 100}
                    className="h-2"
                  />
                </div>
              ))}
              {!weeklySummary && (
                <p className="text-center text-muted-foreground text-sm py-4">
                  読み込み中...
                </p>
              )}
            </CardContent>
          </Card>

          {/* アクションボタン */}
          {currentTimer ? (
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                {currentTimer.goalName && currentTimer.goalColor && (
                  <div className="mb-2">
                    <GoalBadge
                      name={currentTimer.goalName}
                      color={currentTimer.goalColor}
                      size="sm"
                    />
                  </div>
                )}
                <p className="text-sm font-medium">
                  作業中: {currentTimer.taskName}
                </p>
                <p className="text-lg font-mono font-semibold text-primary mt-1">
                  {formatElapsedTime(elapsedSeconds)}
                </p>
              </div>
              <Button
                variant="destructive"
                className="w-full gap-2"
                size="lg"
                onClick={handleStopTimer}
                disabled={isTimerLoading}
              >
                <Square className="h-5 w-5" />
                タイマー停止
              </Button>
            </div>
          ) : (
            <>
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => setIsTimerDialogOpen(true)}
                disabled={isTimerLoading}
              >
                <Play className="h-5 w-5" />
                タイマー開始
              </Button>
              <StartTimerDialog
                open={isTimerDialogOpen}
                onOpenChange={setIsTimerDialogOpen}
              />
            </>
          )}
        </div>
      </div>

      {/* タイムブロック追加/編集ダイアログ */}
      <TimeBlockDialog
        open={timeBlockDialog.isOpen}
        onOpenChange={(open) => !open && timeBlockDialog.closeDialog()}
        title={timeBlockDialog.editingBlockId ? 'タイムブロックを編集' : 'タイムブロックを追加'}
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
        onSave={() => timeBlockDialog.save()}
        showTaskInputModeToggle={true}
        isEditMode={!!timeBlockDialog.editingBlockId}
      />
    </div>
  )
}
