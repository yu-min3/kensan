import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TagBadge } from '@/components/common/TagBadge'
import { weeklySummary as mockWeeklySummary, dailyStudyHours as mockDailyStudyHours } from '@/mocks/data'
import {
  BarChart3,
  Clock,
  Target,
  TrendingUp,
  Calendar,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts'

const pieData = [
  { name: 'GK', value: mockWeeklySummary.byGoalTag.GK, color: '#ecc94b' },
  { name: 'OSS', value: mockWeeklySummary.byGoalTag.OSS, color: '#48bb78' },
  { name: 'Output', value: mockWeeklySummary.byGoalTag.Output, color: '#4299e1' },
].filter((d) => d.value > 0)

const projectData = Object.entries(mockWeeklySummary.byProject).map(([name, minutes]) => ({
  name,
  hours: Math.round((minutes / 60) * 10) / 10,
}))

export function A01AnalyticsReport() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const totalHours = Math.floor(mockWeeklySummary.totalMinutes / 60)
  const totalMinutes = mockWeeklySummary.totalMinutes % 60

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold">分析・レポート</h1>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as 'week' | 'month')}>
          <TabsList>
            <TabsTrigger value="week">今週</TabsTrigger>
            <TabsTrigger value="month">今月</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">総学習時間</p>
                <p className="text-2xl font-bold">
                  {totalHours}h {totalMinutes}m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">完了タスク</p>
                <p className="text-2xl font-bold">{mockWeeklySummary.completedTasks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">計画達成率</p>
                <p className="text-2xl font-bold">
                  {Math.round(
                    (mockWeeklySummary.plannedVsActual.actual /
                      mockWeeklySummary.plannedVsActual.planned) *
                      100
                  )}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">日平均</p>
                <p className="text-2xl font-bold">
                  {Math.round(totalHours / 7)}h {Math.round(totalMinutes / 7)}m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 日別学習時間 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              日別学習時間
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={mockDailyStudyHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} unit="h" />
                <Tooltip formatter={(value) => [`${value}時間`, '学習時間']} />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 目標別時間配分 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              目標別時間配分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatMinutes(value as number), '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatMinutes(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* プロジェクト別時間 */}
        <Card>
          <CardHeader>
            <CardTitle>プロジェクト別時間</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={projectData} layout="vertical">
                <XAxis type="number" fontSize={12} unit="h" />
                <YAxis type="category" dataKey="name" fontSize={12} width={100} />
                <Tooltip formatter={(value) => [`${value}時間`, '']} />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 目標達成度 */}
        <Card>
          <CardHeader>
            <CardTitle>目標達成度</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TagBadge tag="GK" />
                  <span className="text-sm">週20h目標</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.floor(mockWeeklySummary.byGoalTag.GK / 60)}h / 20h
                </span>
              </div>
              <Progress
                value={(mockWeeklySummary.byGoalTag.GK / (20 * 60)) * 100}
                className="h-3"
                indicatorClassName="bg-yellow-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TagBadge tag="OSS" />
                  <span className="text-sm">週15h目標</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.floor(mockWeeklySummary.byGoalTag.OSS / 60)}h / 15h
                </span>
              </div>
              <Progress
                value={(mockWeeklySummary.byGoalTag.OSS / (15 * 60)) * 100}
                className="h-3"
                indicatorClassName="bg-green-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TagBadge tag="Output" />
                  <span className="text-sm">週5h目標</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {Math.floor(mockWeeklySummary.byGoalTag.Output / 60)}h / 5h
                </span>
              </div>
              <Progress
                value={(mockWeeklySummary.byGoalTag.Output / (5 * 60)) * 100}
                className="h-3"
                indicatorClassName="bg-blue-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
