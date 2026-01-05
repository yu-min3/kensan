import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { TagBadge } from '@/components/common/TagBadge'
import { TimeBlockTimeline } from '@/components/common/TimeBlockTimeline'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { mockTomorrowTimeBlocks } from '@/data/mockData'
import { format, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Moon,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BookOpen,
  BookMarked,
  Plus,
  Sun,
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
  const { getTodayTimeBlocks, getTodayTimeEntries } = useTimeBlockStore()

  const todayBlocks = getTodayTimeBlocks()
  const todayEntries = getTodayTimeEntries()
  const today = format(new Date(), 'yyyy年M月d日（E）', { locale: ja })
  const tomorrow = format(addDays(new Date(), 1), 'M月d日（E）', { locale: ja })

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
  const timeByGoal = todayEntries.reduce(
    (acc, entry) => {
      const tag = entry.goalTag || 'Other'
      const [sh, sm] = entry.startTime.split(':').map(Number)
      const [eh, em] = entry.endTime.split(':').map(Number)
      const minutes = (eh * 60 + em) - (sh * 60 + sm)
      acc[tag] = (acc[tag] || 0) + minutes
      return acc
    },
    {} as Record<string, number>
  )

  const pieData = [
    { name: 'GK', value: timeByGoal['GK'] || 0, color: '#ecc94b' },
    { name: 'OSS', value: timeByGoal['OSS'] || 0, color: '#48bb78' },
    { name: 'Output', value: timeByGoal['Output'] || 0, color: '#4299e1' },
    { name: 'Other', value: timeByGoal['Other'] || 0, color: '#a0aec0' },
  ].filter((d) => d.value > 0)

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(Math.abs(minutes) / 60)
    const m = Math.abs(minutes) % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const completedTasks = todayEntries.length
  const plannedTasks = todayBlocks.length
  const completionRate = plannedTasks > 0 ? Math.round((completedTasks / plannedTasks) * 100) : 0

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
          {/* サマリー */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">計画時間</p>
                    <p className="text-xl font-bold">{formatMinutes(plannedMinutes)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">実績時間</p>
                    <p className="text-xl font-bold">{formatMinutes(actualMinutes)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  {difference >= 0 ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">差分</p>
                    <p className="text-xl font-bold">
                      {difference >= 0 ? '+' : '-'}
                      {formatMinutes(difference)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
                  <div className="w-3 h-3 rounded bg-yellow-200 border border-yellow-400" />
                  <span>計画</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-200 border border-green-400" />
                  <span>実績</span>
                </div>
              </div>
              <TimeBlockTimeline
                timeBlocks={todayBlocks}
                timeEntries={todayEntries}
                showComparison={true}
                startHour={8}
                endHour={19}
              />
            </CardContent>
          </Card>

          {/* 今日の学び・メモ */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">今日の学び・メモ</CardTitle>
              <Link to="/learning-records/new">
                <Button size="sm" variant="outline" className="gap-1">
                  <Plus className="h-4 w-4" />
                  記録
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="今日学んだこと、気づいたことをメモ..."
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>
        </div>

        {/* 右カラム: サイドパネル */}
        <div className="space-y-6">
          {/* 目標別時間配分 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">目標別の時間配分</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatMinutes(value as number), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
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
                      {formatMinutes(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 達成率 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">計画達成率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-4xl font-bold">{completionRate}%</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {completedTasks}/{plannedTasks} タスク完了
                </p>
              </div>
              <Progress value={completionRate} className="h-2 mt-4" />
            </CardContent>
          </Card>

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
                {mockTomorrowTimeBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-xs text-muted-foreground w-20">
                      {block.startTime} - {block.endTime}
                    </span>
                    <span className="text-sm flex-1 truncate">{block.taskName}</span>
                    {block.goalTag && <TagBadge tag={block.goalTag} size="sm" />}
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full gap-1">
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
    </div>
  )
}
