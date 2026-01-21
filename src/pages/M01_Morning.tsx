import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { TagBadge } from '@/components/common/TagBadge'
import { TimeBlockTimeline } from '@/components/common/TimeBlockTimeline'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useRoutineStore } from '@/stores/useRoutineStore'
import { syncApi } from '@/api/services/sync'
import { ApiError } from '@/api/client'
import { weeklySummary as mockWeeklySummary } from '@/mocks/data'
import type { GoalTag } from '@/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Sun,
  Plus,
  Play,
  ArrowRight,
  Clock,
  // GripVertical, // 未スケジュールタスク用（一時的に非表示）
  RotateCcw,
  Square,
  RefreshCw,
} from 'lucide-react'

export function M01Morning() {
  const { userName } = useSettingsStore()
  const { getTodayTimeBlocks, getTodayTimeEntries, addTimeBlock, updateTimeBlock, deleteTimeBlock, addTimeEntry } = useTimeBlockStore()
  const { tasks, projects } = useTaskStore()
  const { getTodayRoutines } = useRoutineStore()

  const todayBlocks = getTodayTimeBlocks()
  const todayEntries = getTodayTimeEntries()
  const todayRoutines = getTodayRoutines()
  const today = format(new Date(), 'yyyy年M月d日（E）', { locale: ja })
  const todayDate = format(new Date(), 'yyyy-MM-dd')

  // TimeBlock Dialog State
  const [isTimeBlockDialogOpen, setIsTimeBlockDialogOpen] = useState(false)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null)
  const [blockTaskName, setBlockTaskName] = useState('')
  const [blockStartTime, setBlockStartTime] = useState('09:00')
  const [blockEndTime, setBlockEndTime] = useState('10:00')
  const [blockTaskId, setBlockTaskId] = useState<string | undefined>(undefined)
  const [blockGoalTag, setBlockGoalTag] = useState<GoalTag | ''>('')

  // Timer State
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerTaskId, setTimerTaskId] = useState<string | undefined>(undefined)
  const [timerTaskName, setTimerTaskName] = useState('')
  const [timerGoalTag, setTimerGoalTag] = useState<GoalTag | undefined>(undefined)
  const [timerStartTime, setTimerStartTime] = useState<Date | null>(null)

  // Timer Dialog State
  const [isTimerDialogOpen, setIsTimerDialogOpen] = useState(false)
  const [selectedTimerTaskId, setSelectedTimerTaskId] = useState<string>('')

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false)

  // TimeBlock Dialog Handlers
  const openNewTimeBlockDialog = (taskId?: string, taskName?: string, goalTag?: GoalTag) => {
    setEditingBlockId(null)
    setBlockTaskName(taskName || '')
    setBlockTaskId(taskId)
    setBlockGoalTag(goalTag || '')
    // 現在時刻を開始時刻として設定
    const now = new Date()
    const startH = now.getHours().toString().padStart(2, '0')
    const startM = Math.floor(now.getMinutes() / 15) * 15 // 15分単位に丸める
    setBlockStartTime(`${startH}:${startM.toString().padStart(2, '0')}`)
    // 1時間後を終了時刻として設定
    const endH = (now.getHours() + 1).toString().padStart(2, '0')
    setBlockEndTime(`${endH}:${startM.toString().padStart(2, '0')}`)
    setIsTimeBlockDialogOpen(true)
  }

  const openEditTimeBlockDialog = (block: typeof todayBlocks[0]) => {
    setEditingBlockId(block.id)
    setBlockTaskName(block.taskName)
    setBlockTaskId(block.taskId)
    setBlockGoalTag(block.goalTag || '')
    // バックエンドは HH:mm:ss 形式で返すが、<input type="time"> と API は HH:mm を期待
    setBlockStartTime(block.startTime.slice(0, 5))
    setBlockEndTime(block.endTime.slice(0, 5))
    setIsTimeBlockDialogOpen(true)
  }

  const handleSaveTimeBlock = async () => {
    if (!blockTaskName || !blockStartTime || !blockEndTime) return

    if (editingBlockId) {
      await updateTimeBlock(editingBlockId, {
        startTime: blockStartTime,
        endTime: blockEndTime,
        taskName: blockTaskName,
        taskId: blockTaskId,
        goalTag: blockGoalTag || undefined,
      })
    } else {
      await addTimeBlock({
        date: todayDate,
        startTime: blockStartTime,
        endTime: blockEndTime,
        taskName: blockTaskName,
        taskId: blockTaskId,
        goalTag: blockGoalTag || undefined,
        isRoutine: false,
      })
    }
    setIsTimeBlockDialogOpen(false)
  }

  const handleDeleteTimeBlock = async (id: string) => {
    if (window.confirm('このタイムブロックを削除しますか？')) {
      await deleteTimeBlock(id)
    }
  }

  // Timer Dialog Handlers
  const openTimerDialog = () => {
    setSelectedTimerTaskId('')
    setIsTimerDialogOpen(true)
  }

  const handleConfirmStartTimer = () => {
    if (!selectedTimerTaskId) return
    const task = tasks.find((t) => t.id === selectedTimerTaskId)
    if (task) {
      const project = projects.find((p) => p.id === task.projectId)
      handleStartTimer(task.id, task.name, project?.goalTag)
    }
    setIsTimerDialogOpen(false)
  }

  // Timer Handlers
  const handleStartTimer = (taskId?: string, taskName?: string, goalTag?: GoalTag) => {
    setIsTimerRunning(true)
    setTimerTaskId(taskId)
    setTimerTaskName(taskName || '')
    setTimerGoalTag(goalTag)
    setTimerStartTime(new Date())
  }

  const handleStopTimer = () => {
    if (timerStartTime) {
      // TimeEntry（実績）として記録
      const endTime = new Date()
      const startH = timerStartTime.getHours().toString().padStart(2, '0')
      const startM = timerStartTime.getMinutes().toString().padStart(2, '0')
      const endH = endTime.getHours().toString().padStart(2, '0')
      const endM = endTime.getMinutes().toString().padStart(2, '0')

      addTimeEntry({
        date: todayDate,
        startTime: `${startH}:${startM}`,
        endTime: `${endH}:${endM}`,
        taskId: timerTaskId,
        taskName: timerTaskName,
        goalTag: timerGoalTag,
      })
    }
    setIsTimerRunning(false)
    setTimerTaskId(undefined)
    setTimerTaskName('')
    setTimerGoalTag(undefined)
    setTimerStartTime(null)
  }

  // Sync Handler
  const handleSync = async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      await syncApi.triggerSync()
      console.log('[Kensan] Manual sync complete')
      window.location.reload()
    } catch (err) {
      console.error('[Kensan] Sync failed:', err)
      if (err instanceof ApiError) {
        alert(`同期エラー [${err.status}] ${err.code}\n${err.message}`)
      } else {
        alert(`同期に失敗しました: ${(err as Error).message}`)
      }
    } finally {
      setIsSyncing(false)
    }
  }

  // 未スケジュールのタスク - 一時的に非表示（将来復活予定）
  // const unscheduledTasks = tasks.filter(
  //   (task) =>
  //     !task.completed &&
  //     !task.parentTaskId &&
  //     !todayBlocks.some((b) => b.taskId === task.id)
  // )

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sun className="h-8 w-8 text-yellow-500" />
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
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={handleSync}
                  disabled={isSyncing}
                  title="Clockifyデータを同期"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  同期
                </Button>
                <Button size="sm" className="gap-1" onClick={() => openNewTimeBlockDialog()}>
                  <Plus className="h-4 w-4" />
                  追加
                </Button>
              </div>
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
                onBlockClick={openEditTimeBlockDialog}
                onBlockDelete={handleDeleteTimeBlock}
              />
            </CardContent>
          </Card>

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
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TagBadge tag="GK" size="sm" />
                    <span className="text-sm">GK目標</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.floor(mockWeeklySummary.byGoalTag.GK / 60)}h / 20h
                  </span>
                </div>
                <Progress
                  value={(mockWeeklySummary.byGoalTag.GK / (20 * 60)) * 100}
                  className="h-2"
                  indicatorClassName="bg-yellow-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TagBadge tag="OSS" size="sm" />
                    <span className="text-sm">OSS</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.floor(mockWeeklySummary.byGoalTag.OSS / 60)}h / 15h
                  </span>
                </div>
                <Progress
                  value={(mockWeeklySummary.byGoalTag.OSS / (15 * 60)) * 100}
                  className="h-2"
                  indicatorClassName="bg-green-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* アクションボタン */}
          {isTimerRunning ? (
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  作業中: {timerTaskName}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  開始: {timerStartTime ? format(timerStartTime, 'HH:mm') : ''}
                </p>
              </div>
              <Button
                variant="destructive"
                className="w-full gap-2"
                size="lg"
                onClick={handleStopTimer}
              >
                <Square className="h-5 w-5" />
                タイマー停止
              </Button>
            </div>
          ) : (
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={openTimerDialog}
            >
              <Play className="h-5 w-5" />
              タイマー開始
            </Button>
          )}
        </div>
      </div>

      {/* タイムブロック追加/編集ダイアログ */}
      <Dialog open={isTimeBlockDialogOpen} onOpenChange={setIsTimeBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBlockId ? 'タイムブロックを編集' : 'タイムブロックを追加'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="blockTaskName">タスク名</Label>
              <Input
                id="blockTaskName"
                value={blockTaskName}
                onChange={(e) => setBlockTaskName(e.target.value)}
                placeholder="例: ICA試験勉強"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="blockStartTime">開始時刻</Label>
                <Input
                  id="blockStartTime"
                  type="time"
                  value={blockStartTime}
                  onChange={(e) => setBlockStartTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="blockEndTime">終了時刻</Label>
                <Input
                  id="blockEndTime"
                  type="time"
                  value={blockEndTime}
                  onChange={(e) => setBlockEndTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>目標タグ（任意）</Label>
              <Select value={blockGoalTag} onValueChange={(v) => setBlockGoalTag(v as GoalTag)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="タグを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GK">GK (Golden Kubestronaut)</SelectItem>
                  <SelectItem value="OSS">OSS</SelectItem>
                  <SelectItem value="Output">Output</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>または既存タスクから選択</Label>
              <Select
                value={blockTaskId || ''}
                onValueChange={(v) => {
                  const task = tasks.find((t) => t.id === v)
                  if (task) {
                    setBlockTaskId(v)
                    setBlockTaskName(task.name)
                    const project = projects.find((p) => p.id === task.projectId)
                    if (project?.goalTag) {
                      setBlockGoalTag(project.goalTag)
                    }
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="タスクを選択（任意）" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.filter((t) => !t.completed && !t.parentTaskId).map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTimeBlockDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveTimeBlock} disabled={!blockTaskName}>
              {editingBlockId ? '保存' : '追加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* タイマー開始ダイアログ */}
      <Dialog open={isTimerDialogOpen} onOpenChange={setIsTimerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>タイマーを開始</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>作業するタスクを選択</Label>
              <Select value={selectedTimerTaskId} onValueChange={setSelectedTimerTaskId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="タスクを選択" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.filter((t) => !t.completed && !t.parentTaskId).map((task) => {
                    const project = projects.find((p) => p.id === task.projectId)
                    return (
                      <SelectItem key={task.id} value={task.id}>
                        <div className="flex items-center gap-2">
                          <span>{task.name}</span>
                          {project?.goalTag && (
                            <span className="text-xs text-muted-foreground">
                              ({project.goalTag})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTimerDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleConfirmStartTimer} disabled={!selectedTimerTaskId}>
              <Play className="h-4 w-4 mr-2" />
              開始
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
