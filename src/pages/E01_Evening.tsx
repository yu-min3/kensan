import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { TimeRangeInput } from '@/components/ui/time-range-input'
import { GoalBadge } from '@/components/common/GoalBadge'
import { TimeBlockTimeline } from '@/components/common/TimeBlockTimeline'
import { TimeEntryList } from '@/components/common/TimeEntryList'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useMemoStore } from '@/stores/useMemoStore'
import { addDays } from 'date-fns'
import { formatDateJa, formatDateShortJa, formatDateIso, formatTime, formatDurationShort } from '@/lib/dateFormat'
import {
  Moon,
  ArrowRight,
  Clock,
  BookOpen,
  BookMarked,
  Plus,
  Sun,
  TrendingUp,
  Lightbulb,
  Archive,
  Trash2,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

export function E01Evening() {
  const { userName } = useSettingsStore()
  const { getTodayTimeBlocks, getTodayTimeEntries, getTimeBlocksByDate, addTimeBlock, updateTimeBlock } = useTimeBlockStore()
  const { tasks, goals, milestones, getMilestoneById, getGoalById } = useTaskStore()
  const { fetchMemos, archiveMemo, deleteMemo, getActiveMemos } = useMemoStore()

  // Fetch memos on mount
  useEffect(() => {
    fetchMemos()
  }, [fetchMemos])

  const todayBlocks = getTodayTimeBlocks()
  const todayEntries = getTodayTimeEntries()
  const tomorrowDate = formatDateIso(addDays(new Date(), 1))
  const tomorrowBlocks = getTimeBlocksByDate(tomorrowDate)
  const today = formatDateJa(new Date())
  const tomorrow = formatDateShortJa(addDays(new Date(), 1))

  // TimeBlock Dialog State for tomorrow
  const [isTimeBlockDialogOpen, setIsTimeBlockDialogOpen] = useState(false)
  const [blockTaskName, setBlockTaskName] = useState('')
  const [blockStartTime, setBlockStartTime] = useState('09:00')
  const [blockEndTime, setBlockEndTime] = useState('10:00')
  const [blockTaskId, setBlockTaskId] = useState<string | undefined>(undefined)
  const [blockMilestoneId, setBlockMilestoneId] = useState<string | undefined>(undefined)

  // Get goal from selected milestone
  const selectedMilestone = blockMilestoneId ? getMilestoneById(blockMilestoneId) : undefined
  const selectedGoal = selectedMilestone ? getGoalById(selectedMilestone.goalId) : undefined

  const openNewTimeBlockDialog = () => {
    setBlockTaskName('')
    setBlockTaskId(undefined)
    setBlockMilestoneId(undefined)
    setBlockStartTime('09:00')
    setBlockEndTime('10:00')
    setIsTimeBlockDialogOpen(true)
  }

  const handleSaveTimeBlock = async () => {
    if (!blockTaskName || !blockStartTime || !blockEndTime) return

    await addTimeBlock({
      date: tomorrowDate,
      startTime: blockStartTime,
      endTime: blockEndTime,
      taskName: blockTaskName,
      taskId: blockTaskId,
      milestoneId: blockMilestoneId,
      milestoneName: selectedMilestone?.name,
      goalId: selectedGoal?.id,
      goalName: selectedGoal?.name,
      goalColor: selectedGoal?.color,
      isRoutine: false,
    })
    setIsTimeBlockDialogOpen(false)
  }

  // 計画時間と実績時間を計算
  const calculateMinutes = (items: { startTime: string; endTime: string }[]) => {
    return items.reduce((acc, item) => {
      const [sh, sm] = item.startTime.split(':').map(Number)
      const [eh, em] = item.endTime.split(':').map(Number)
      return acc + (eh * 60 + em) - (sh * 60 + sm)
    }, 0)
  }

  const plannedMinutes = calculateMinutes(todayBlocks)
  const actualMinutes = calculateMinutes(todayEntries)
  const difference = actualMinutes - plannedMinutes

  // 目標別の時間配分
  const timeByGoalMap = todayEntries.reduce(
    (acc, entry) => {
      const goalId = entry.goalId || 'other'
      const goalName = entry.goalName || 'その他'
      const goalColor = entry.goalColor || '#a0aec0'
      const [sh, sm] = entry.startTime.split(':').map(Number)
      const [eh, em] = entry.endTime.split(':').map(Number)
      const minutes = (eh * 60 + em) - (sh * 60 + sm)
      if (!acc[goalId]) {
        acc[goalId] = { name: goalName, color: goalColor, value: 0 }
      }
      acc[goalId].value += minutes
      return acc
    },
    {} as Record<string, { name: string; color: string; value: number }>
  )

  const pieData = Object.values(timeByGoalMap).filter((d) => d.value > 0)

  // 時間ベースの計画達成率
  const completionRate = plannedMinutes > 0 ? Math.round((actualMinutes / plannedMinutes) * 100) : 0

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Moon className="h-8 w-8 text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold">
              お疲れさまでした、{userName}さん
            </h1>
            <p className="text-muted-foreground">{today}</p>
          </div>
        </div>
        <Link to="/morning">
          <Button variant="outline" className="gap-2">
            朝の画面へ
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左カラム: 計画vs実績 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 今日のサマリー（統合カード） */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                今日のサマリー
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 計画達成率 */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-4xl font-bold">{completionRate}%</p>
                  <p className="text-sm text-muted-foreground">達成率</p>
                </div>
                <div className="flex-1">
                  <Progress value={Math.min(completionRate, 100)} className="h-3" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {formatDurationShort(actualMinutes)} / {formatDurationShort(plannedMinutes)}
                  </p>
                </div>
              </div>

              {/* 時間サマリー */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">計画</p>
                  <p className="text-xl font-semibold">{formatDurationShort(plannedMinutes)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">実績</p>
                  <p className="text-xl font-semibold text-brand">{formatDurationShort(actualMinutes)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">差分</p>
                  <p className={`text-xl font-semibold ${difference >= 0 ? 'text-brand' : 'text-destructive'}`}>
                    {difference >= 0 ? '+' : ''}{formatDurationShort(difference)}
                  </p>
                </div>
              </div>

              {/* 目標別の時間配分 */}
              {pieData.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-3">目標別の時間配分</p>
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={120} height={120}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [formatDurationShort(value as number), '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {pieData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDurationShort(item.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 計画 vs 実績 タイムライン */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                計画 vs 実績
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border" style={{ backgroundColor: 'var(--timeblock-plan-bg)', borderColor: 'var(--timeblock-plan-border)' }} />
                  <span>計画</span>
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
                onBlockResize={(blockId, startTime, endTime) => {
                  updateTimeBlock(blockId, { startTime, endTime })
                }}
              />
            </CardContent>
          </Card>

          {/* 今日の実績（時間記録リスト） */}
          <TimeEntryList
            entries={todayEntries}
            title="今日の実績"
            showAddButton={true}
            defaultDate={formatDateIso(new Date())}
          />

          {/* 今日のメモ */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-slate-500" />
                今日のメモ
              </CardTitle>
              <Link to="/learning-records/new">
                <Button size="sm" variant="outline" className="gap-1">
                  <Plus className="h-4 w-4" />
                  学習記録へ
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {getActiveMemos().length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  メモがありません。右下の💡ボタンからメモを追加できます。
                </p>
              ) : (
                <div className="space-y-2">
                  {getActiveMemos().map((memo) => (
                    <div
                      key={memo.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {memo.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(memo.createdAt)}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => archiveMemo(memo.id)}
                          title="アーカイブ"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => deleteMemo(memo.id)}
                          title="削除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右カラム: サイドパネル */}
        <div className="space-y-6">
          {/* 明日のタイムブロック */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sun className="h-4 w-4" />
                明日の予定
              </CardTitle>
              <Link to="/morning">
                <Button size="sm" variant="ghost">
                  編集
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{tomorrow}</p>
              <div className="space-y-2">
                {tomorrowBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-xs text-muted-foreground w-20">
                      {block.startTime} - {block.endTime}
                    </span>
                    <span className="text-sm flex-1 truncate">{block.taskName}</span>
                    {block.goalName && block.goalColor && (
                      <GoalBadge name={block.goalName} color={block.goalColor} size="sm" />
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1"
                  onClick={openNewTimeBlockDialog}
                >
                  <Plus className="h-4 w-4" />
                  タイムブロック追加
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* アクションボタン */}
          <div className="space-y-2">
            <Link to="/learning-records/new">
              <Button variant="outline" className="w-full gap-2">
                <BookOpen className="h-4 w-4" />
                学習記録を作成
              </Button>
            </Link>
            <Link to="/diary/new">
              <Button variant="outline" className="w-full gap-2">
                <BookMarked className="h-4 w-4" />
                日記を書く
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 明日のタイムブロック追加ダイアログ */}
      <Dialog open={isTimeBlockDialogOpen} onOpenChange={setIsTimeBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>明日のタイムブロックを追加</DialogTitle>
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

            <div>
              <Label>時間</Label>
              <div className="mt-1">
                <TimeRangeInput
                  startTime={blockStartTime}
                  endTime={blockEndTime}
                  onStartTimeChange={setBlockStartTime}
                  onEndTimeChange={setBlockEndTime}
                />
              </div>
            </div>

            <div>
              <Label>マイルストーン（任意）</Label>
              <Select
                value={blockMilestoneId || ''}
                onValueChange={(v) => setBlockMilestoneId(v || undefined)}
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
                            <SelectItem key={milestone.id} value={milestone.id}>
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

            <div>
              <Label>または既存タスクから選択</Label>
              <Select
                value={blockTaskId || ''}
                onValueChange={(v) => {
                  const task = tasks.find((t) => t.id === v)
                  if (task) {
                    setBlockTaskId(v)
                    setBlockTaskName(task.name)
                    if (task.milestoneId) {
                      setBlockMilestoneId(task.milestoneId)
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
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
