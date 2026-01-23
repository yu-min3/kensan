import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GoalBadge } from '@/components/common/GoalBadge'
import { formatDurationShort } from '@/lib/dateFormat'
import { useAnalyticsStore } from '@/stores/useAnalyticsStore'
import {
  BarChart3,
  Clock,
  Target,
  TrendingUp,
  Calendar,
  Loader2,
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

export function A01AnalyticsReport() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const { weeklySummary, dailyStudyHours, isLoading, fetchDashboardData } = useAnalyticsStore()

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const pieData = useMemo(() => {
    if (!weeklySummary) return []
    return weeklySummary.byGoal.map((goal) => ({
      name: goal.name,
      value: goal.minutes,
      color: goal.color,
    })).filter((d) => d.value > 0)
  }, [weeklySummary])

  const milestoneData = useMemo(() => {
    if (!weeklySummary) return []
    return weeklySummary.byMilestone.map((milestone) => ({
      name: milestone.name,
      hours: Math.round((milestone.minutes / 60) * 10) / 10,
    }))
  }, [weeklySummary])

  const totalHours = weeklySummary ? Math.floor(weeklySummary.totalMinutes / 60) : 0
  const totalMinutes = weeklySummary ? weeklySummary.totalMinutes % 60 : 0

  if (isLoading || !weeklySummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-slate-500" />
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
                <p className="text-2xl font-bold">{weeklySummary.completedTasks}</p>
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
                    (weeklySummary.plannedVsActual.actual /
                      weeklySummary.plannedVsActual.planned) *
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
              <BarChart data={dailyStudyHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} unit="h" />
                <Tooltip formatter={(value) => [`${value}時間`, '学習時間']} />
                <Bar dataKey="hours" fill="hsl(var(--brand))" radius={[4, 4, 0, 0]} />
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
                  <Tooltip formatter={(value) => [formatDurationShort(value as number), '']} />
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
                      {formatDurationShort(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* マイルストーン別時間 */}
        <Card>
          <CardHeader>
            <CardTitle>マイルストーン別時間</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={milestoneData} layout="vertical">
                <XAxis type="number" fontSize={12} unit="h" />
                <YAxis type="category" dataKey="name" fontSize={12} width={100} />
                <Tooltip formatter={(value) => [`${value}時間`, '']} />
                <Bar dataKey="hours" fill="hsl(var(--brand))" radius={[0, 4, 4, 0]} />
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
            {weeklySummary.byGoal.map((goal) => (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <GoalBadge name={goal.name} color={goal.color} size="sm" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {Math.floor(goal.minutes / 60)}h
                  </span>
                </div>
                <Progress
                  value={(goal.minutes / (20 * 60)) * 100}
                  className="h-3"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
