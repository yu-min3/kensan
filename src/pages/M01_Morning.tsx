import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { TagBadge } from '@/components/common/TagBadge'
import { TimeBlockTimeline } from '@/components/common/TimeBlockTimeline'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useRoutineStore } from '@/stores/useRoutineStore'
import { mockWeeklySummary } from '@/data/mockData'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Sun,
  Plus,
  Play,
  ArrowRight,
  Clock,
  GripVertical,
  RotateCcw,
} from 'lucide-react'

export function M01Morning() {
  const { userName } = useSettingsStore()
  const { getTodayTimeBlocks } = useTimeBlockStore()
  const { tasks, projects, toggleTaskComplete } = useTaskStore()
  const { getTodayRoutines } = useRoutineStore()

  const todayBlocks = getTodayTimeBlocks()
  const todayRoutines = getTodayRoutines()
  const today = format(new Date(), 'yyyy年M月d日（E）', { locale: ja })

  // 未スケジュールのタスク
  const unscheduledTasks = tasks.filter(
    (task) =>
      !task.completed &&
      !task.parentTaskId &&
      !todayBlocks.some((b) => b.taskId === task.id)
  )

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
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                追加
              </Button>
            </CardHeader>
            <CardContent>
              <TimeBlockTimeline timeBlocks={todayBlocks} startHour={8} endHour={19} />
            </CardContent>
          </Card>

          {/* 未スケジュールのタスク */}
          <Card>
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
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-grab"
                      draggable
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={task.completed}
                        onChange={() => toggleTaskComplete(task.id)}
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
          </Card>
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
          <Button className="w-full gap-2" size="lg">
            <Play className="h-5 w-5" />
            タイマー開始
          </Button>
        </div>
      </div>
    </div>
  )
}
