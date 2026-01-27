import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { GoalBadge } from '@/components/common/GoalBadge'
import { formatDurationShort, formatMonthDay } from '@/lib/dateFormat'
import { useAnalyticsStore } from '@/stores/useAnalyticsStore'
import { useNoteStore } from '@/stores/useNoteStore'
import {
  BarChart3,
  Clock,
  Target,
  TrendingUp,
  Calendar as CalendarIcon,
  Loader2,
  BookOpen,
  ArrowRight,
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
import { cn } from '@/lib/utils'
import type { DateRange } from 'react-day-picker'

type PeriodType = 'today' | 'week' | 'month' | 'custom'

// Helper to get date range for each period
function getDateRangeForPeriod(period: PeriodType, customRange?: DateRange): { start: Date; end: Date } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (period) {
    case 'today':
      return { start: today, end: today }
    case 'week': {
      const dayOfWeek = today.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const monday = new Date(today)
      monday.setDate(today.getDate() + mondayOffset)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { start: monday, end: sunday }
    }
    case 'month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: firstDay, end: lastDay }
    }
    case 'custom':
      if (customRange?.from && customRange?.to) {
        return { start: customRange.from, end: customRange.to }
      }
      return { start: today, end: today }
  }
}

// Format date range for display
function formatDateRange(start: Date, end: Date): string {
  const startStr = `${start.getMonth() + 1}/${start.getDate()}`
  const endStr = `${end.getMonth() + 1}/${end.getDate()}`
  if (startStr === endStr) return startStr
  return `${startStr} - ${endStr}`
}

export function A01AnalyticsReport() {
  const [period, setPeriod] = useState<PeriodType>('week')
  const [customRange, setCustomRange] = useState<DateRange | undefined>()
  const [calendarOpen, setCalendarOpen] = useState(false)

  const { weeklySummary, dailyStudyHours, isLoading, fetchDashboardData } = useAnalyticsStore()
  const { getByType } = useNoteStore()
  const learningRecords = getByType('learning')

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const dateRange = useMemo(() => {
    return getDateRangeForPeriod(period, customRange)
  }, [period, customRange])

  // Filter daily study hours based on selected period
  const filteredDailyHours = useMemo(() => {
    if (!dailyStudyHours.length) return []

    const { start, end } = dateRange
    return dailyStudyHours.filter((d) => {
      const date = new Date(d.date)
      return date >= start && date <= end
    })
  }, [dailyStudyHours, dateRange])

  const pieData = useMemo(() => {
    if (!weeklySummary) return []
    return weeklySummary.byGoal
      .map((goal) => ({
        name: goal.name,
        value: goal.minutes,
        color: goal.color,
      }))
      .filter((d) => d.value > 0)
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

  // Handle period change
  const handlePeriodChange = (value: string) => {
    const newPeriod = value as PeriodType
    setPeriod(newPeriod)
    if (newPeriod === 'custom' && !customRange) {
      setCalendarOpen(true)
    }
  }

  // Handle custom date range selection
  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    setCustomRange(range)
    if (range?.from && range?.to) {
      setCalendarOpen(false)
    }
  }

  if (isLoading || !weeklySummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-slate-500" />
          <h1 className="text-2xl font-bold">分析・レポート</h1>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={handlePeriodChange}>
            <TabsList>
              <TabsTrigger value="today">今日</TabsTrigger>
              <TabsTrigger value="week">今週</TabsTrigger>
              <TabsTrigger value="month">今月</TabsTrigger>
              <TabsTrigger value="custom">カスタム</TabsTrigger>
            </TabsList>
          </Tabs>

          {period === 'custom' && (
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {customRange?.from && customRange?.to
                    ? formatDateRange(customRange.from, customRange.to)
                    : '期間を選択'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={handleCustomRangeSelect}
                  numberOfMonths={2}
                  defaultMonth={new Date()}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Period indicator */}
      <div className="text-sm text-muted-foreground">
        {formatDateRange(dateRange.start, dateRange.end)} の集計
      </div>

      {/* Summary Cards */}
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
                  {weeklySummary.plannedVsActual.planned > 0
                    ? Math.round(
                        (weeklySummary.plannedVsActual.actual /
                          weeklySummary.plannedVsActual.planned) *
                          100
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">日平均</p>
                <p className="text-2xl font-bold">
                  {filteredDailyHours.length > 0
                    ? `${Math.round(
                        filteredDailyHours.reduce((sum, d) => sum + d.hours, 0) /
                          filteredDailyHours.length
                      )}h`
                    : '0h'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Study Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              日別学習時間
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={filteredDailyHours.length > 0 ? filteredDailyHours : dailyStudyHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis domain={[0, 'auto']} allowDataOverflow fontSize={12} unit="h" />
                <Tooltip formatter={(value) => [`${value}時間`, '学習時間']} />
                <Bar dataKey="hours" fill="hsl(var(--brand))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Goal Distribution */}
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

        {/* Milestone Hours */}
        <Card>
          <CardHeader>
            <CardTitle>マイルストーン別時間</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={milestoneData} layout="vertical">
                <XAxis type="number" domain={[0, 'auto']} fontSize={12} unit="h" />
                <YAxis type="category" dataKey="name" fontSize={12} width={100} />
                <Tooltip formatter={(value) => [`${value}時間`, '']} />
                <Bar dataKey="hours" fill="hsl(var(--brand))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Goal Progress */}
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
                <Progress value={(goal.minutes / (20 * 60)) * 100} className="h-3" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Learning Records Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            学習記録
          </CardTitle>
          <Link to="/notes?type=learning">
            <Button variant="ghost" size="sm" className="gap-1">
              すべて見る <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {learningRecords.slice(0, 6).map((record) => (
              <Link
                key={record.id}
                to={`/notes/${record.id}`}
                className="block p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      record.format === 'markdown'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    )}
                  >
                    {record.format === 'markdown' ? '.md' : '.dio'}
                  </span>
                  <span className="text-sm font-medium truncate">{record.title}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {record.goalName && record.goalColor && (
                    <GoalBadge name={record.goalName} color={record.goalColor} size="sm" />
                  )}
                  {record.milestoneName && <span>{record.milestoneName}</span>}
                  <span>•</span>
                  <span>{formatMonthDay(record.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
          {learningRecords.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>学習記録はまだありません</p>
              <Link to="/notes/new?type=learning">
                <Button variant="link" className="mt-2">
                  最初の記録を作成する
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
