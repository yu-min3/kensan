import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { formatDurationShort, formatDateIso } from '@/lib/dateFormat'
import { TrendingUp } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface DailySummaryProps {
  mode: 'compact' | 'detailed'
}

export function DailySummary({ mode }: DailySummaryProps) {
  const { timeBlocks, timeEntries } = useTimeBlockStore()

  const todayDateIso = formatDateIso(new Date())

  // Filter today's data
  const todayBlocks = timeBlocks.filter((b) => b.date === todayDateIso)
  const todayEntries = timeEntries.filter((e) => e.date === todayDateIso)

  // Calculate planned and actual minutes
  const calculateMinutes = (items: { startTime: string; endTime: string }[]) => {
    return items.reduce((acc, item) => {
      const [sh, sm] = item.startTime.split(':').map(Number)
      const [eh, em] = item.endTime.split(':').map(Number)
      return acc + (eh * 60 + em) - (sh * 60 + sm)
    }, 0)
  }

  // すべての時間を達成率計算の対象とする
  const plannedMinutes = calculateMinutes(todayBlocks)
  const actualMinutes = calculateMinutes(todayEntries)
  const difference = actualMinutes - plannedMinutes
  const completionRate = plannedMinutes > 0 ? Math.round((actualMinutes / plannedMinutes) * 100) : 0

  // Goal-based time distribution (for detailed mode)
  const timeByGoalMap = todayEntries.reduce(
    (acc, entry) => {
      const goalId = entry.goalId || 'other'
      const goalName = entry.goalName || '目標なし'
      const goalColor = entry.goalColor || '#6b7280'
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

  if (mode === 'compact') {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">達成率</span>
          <span className="text-lg font-bold">{completionRate}%</span>
        </div>
        <div className="w-24">
          <Progress value={Math.min(completionRate, 100)} className="h-1.5" />
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDurationShort(actualMinutes)} / {formatDurationShort(plannedMinutes)}
        </span>
      </div>
    )
  }

  // Detailed mode
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          今日のサマリー
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Completion rate */}
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

        {/* Time summary */}
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
            <p
              className={`text-xl font-semibold ${difference >= 0 ? 'text-brand' : 'text-destructive'}`}
            >
              {difference >= 0 ? '+' : ''}
              {formatDurationShort(difference)}
            </p>
          </div>
        </div>

        {/* Goal-based time distribution */}
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
                  <Tooltip formatter={(value) => [formatDurationShort(value as number), '']} />
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
  )
}
