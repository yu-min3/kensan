import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { TagBadge } from '@/components/common/TagBadge'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { useLearningRecordStore } from '@/stores/useLearningRecordStore'
import { weeklySummary as mockWeeklySummary, dailyStudyHours as mockDailyStudyHours } from '@/mocks/data'
import { formatDateJa, formatDurationShort, formatMonthDay } from '@/lib/dateFormat'
import {
  Sun,
  Moon,
  Clock,
  Target,
  BookOpen,
  TrendingUp,
  ArrowRight,
  Play,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export function S02Dashboard() {
  const { userName } = useSettingsStore()
  const { getTodayTimeBlocks, getTodayTimeEntries } = useTimeBlockStore()
  const { items: records } = useLearningRecordStore()

  const todayBlocks = getTodayTimeBlocks()
  const todayEntries = getTodayTimeEntries()
  const today = formatDateJa(new Date())

  const totalPlannedMinutes = todayBlocks.reduce((acc, block) => {
    const [sh, sm] = block.startTime.split(':').map(Number)
    const [eh, em] = block.endTime.split(':').map(Number)
    return acc + (eh * 60 + em) - (sh * 60 + sm)
  }, 0)

  const totalActualMinutes = todayEntries.reduce((acc, entry) => {
    const [sh, sm] = entry.startTime.split(':').map(Number)
    const [eh, em] = entry.endTime.split(':').map(Number)
    return acc + (eh * 60 + em) - (sh * 60 + sm)
  }, 0)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            おかえりなさい、{userName}さん
          </h1>
          <p className="text-muted-foreground">{today}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/morning">
            <Button variant="outline" className="gap-2">
              <Sun className="h-4 w-4" />
              朝の画面
            </Button>
          </Link>
          <Link to="/evening">
            <Button variant="outline" className="gap-2">
              <Moon className="h-4 w-4" />
              夜の画面
            </Button>
          </Link>
        </div>
      </div>

      {/* クイック統計 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">今日の予定</p>
                <p className="text-2xl font-bold">{formatDurationShort(totalPlannedMinutes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">今日の実績</p>
                <p className="text-2xl font-bold">{formatDurationShort(totalActualMinutes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">今週の進捗</p>
                <p className="text-2xl font-bold">
                  {Math.round((mockWeeklySummary.totalMinutes / (40 * 60)) * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">学習記録</p>
                <p className="text-2xl font-bold">{records.length}件</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 今日のタイムブロック */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              今日の予定
            </CardTitle>
            <Link to="/morning">
              <Button variant="ghost" size="sm" className="gap-1">
                詳細 <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayBlocks.slice(0, 4).map((block) => (
                <div
                  key={block.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="text-sm text-muted-foreground w-24">
                    {block.startTime} - {block.endTime}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{block.taskName}</p>
                    {block.projectName && (
                      <p className="text-xs text-muted-foreground">
                        {block.projectName}
                      </p>
                    )}
                  </div>
                  {block.goalTag && <TagBadge tag={block.goalTag} size="sm" />}
                </div>
              ))}
              {todayBlocks.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  今日の予定はまだありません
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 週間学習時間 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              週間学習時間
            </CardTitle>
            <Link to="/analytics">
              <Button variant="ghost" size="sm" className="gap-1">
                詳細 <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mockDailyStudyHours}>
                <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} unit="h" />
                <Tooltip
                  formatter={(value) => [`${value}時間`, '学習時間']}
                  labelFormatter={(label) => `${label}曜日`}
                />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 目標別進捗 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              目標別 今週の進捗
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TagBadge tag="GK" />
                  <span className="text-sm">Golden Kubestronaut</span>
                </div>
                <span className="text-sm text-muted-foreground">
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
                  <TagBadge tag="OSS" />
                  <span className="text-sm">OSS活動</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.floor(mockWeeklySummary.byGoalTag.OSS / 60)}h / 15h
                </span>
              </div>
              <Progress
                value={(mockWeeklySummary.byGoalTag.OSS / (15 * 60)) * 100}
                className="h-2"
                indicatorClassName="bg-green-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TagBadge tag="Output" />
                  <span className="text-sm">アウトプット</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.floor(mockWeeklySummary.byGoalTag.Output / 60)}h / 5h
                </span>
              </div>
              <Progress
                value={(mockWeeklySummary.byGoalTag.Output / (5 * 60)) * 100}
                className="h-2"
                indicatorClassName="bg-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* 最近の学習記録 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              最近の学習記録
            </CardTitle>
            <Link to="/learning-records">
              <Button variant="ghost" size="sm" className="gap-1">
                すべて見る <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {records.slice(0, 3).map((record) => (
                <Link
                  key={record.id}
                  to={`/learning-records/${record.id}`}
                  className="block p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted-foreground/20">
                      {record.format === 'markdown' ? '.md' : '.dio'}
                    </span>
                    <span className="text-sm font-medium truncate">
                      {record.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {record.goalTag && <TagBadge tag={record.goalTag} size="sm" />}
                    <span>{record.projectName}</span>
                    <span>•</span>
                    <span>{formatMonthDay(record.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
