import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Goal, Milestone, Task } from '@/types'
import { CalendarRange } from 'lucide-react'

interface GanttChartWidgetProps {
  goals: Goal[]
  milestones: Milestone[]
  tasks: Task[]
  className?: string
}

interface MilestoneWithProgress extends Milestone {
  goal: Goal
  progress: number
  totalTasks: number
  completedTasks: number
}

export function GanttChartWidget({ goals, milestones, tasks, className }: GanttChartWidgetProps) {
  // 表示期間を計算（今日から3ヶ月）
  const today = new Date()
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1)
  const endDate = new Date(today.getFullYear(), today.getMonth() + 3, 0)

  // 月のラベルを生成
  const months = useMemo(() => {
    const result: { label: string; startDay: number; days: number }[] = []
    let currentDate = new Date(startDate)
    let dayOffset = 0

    while (currentDate <= endDate) {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const startDay = currentDate.getDate()
      const remainingDays = daysInMonth - startDay + 1

      result.push({
        label: `${month + 1}月`,
        startDay: dayOffset,
        days: remainingDays,
      })

      dayOffset += remainingDays
      currentDate = new Date(year, month + 1, 1)
    }

    return result
  }, [startDate, endDate])

  const totalDays = useMemo(() => {
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }, [startDate, endDate])

  // マイルストーンを目標ごとにグループ化し、進捗を計算
  const milestonesWithProgress = useMemo(() => {
    return milestones
      .filter(m => m.status !== 'archived' && (m.targetDate || m.startDate))
      .map(m => {
        const goal = goals.find(g => g.id === m.goalId)
        if (!goal) return null

        const milestoneTasks = tasks.filter(t => t.milestoneId === m.id)
        const completedTasks = milestoneTasks.filter(t => t.completed).length
        const totalTasks = milestoneTasks.length
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        return {
          ...m,
          goal,
          progress,
          totalTasks,
          completedTasks,
        } as MilestoneWithProgress
      })
      .filter((m): m is MilestoneWithProgress => m !== null)
      .sort((a, b) => {
        // 目標でグループ化してからtargetDateでソート
        if (a.goalId !== b.goalId) {
          return a.goal.name.localeCompare(b.goal.name)
        }
        return (a.targetDate || '').localeCompare(b.targetDate || '')
      })
  }, [goals, milestones, tasks])

  // 日付をX座標（パーセント）に変換
  const dateToPercent = (dateStr: string) => {
    const date = new Date(dateStr)
    const dayDiff = Math.ceil((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, Math.min(100, (dayDiff / totalDays) * 100))
  }

  // 今日の位置
  const todayPercent = dateToPercent(today.toISOString().split('T')[0])

  // 目標ごとにグループ化
  const groupedByGoal = useMemo(() => {
    const groups: { goal: Goal; milestones: MilestoneWithProgress[] }[] = []
    let currentGoalId: string | null = null

    milestonesWithProgress.forEach(m => {
      if (m.goalId !== currentGoalId) {
        groups.push({ goal: m.goal, milestones: [m] })
        currentGoalId = m.goalId
      } else {
        groups[groups.length - 1].milestones.push(m)
      }
    })

    return groups
  }, [milestonesWithProgress])

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarRange className="h-4 w-4" />
          ガントチャート
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {groupedByGoal.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            期限のあるマイルストーンがありません
          </div>
        ) : (
          <div className="space-y-1">
            {/* ヘッダー: 月ラベル */}
            <div className="flex items-center h-6 mb-2">
              <div className="w-48 flex-shrink-0" />
              <div className="flex-1 relative h-full">
                {months.map((month, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 text-xs text-muted-foreground font-medium"
                    style={{
                      left: `${(month.startDay / totalDays) * 100}%`,
                      width: `${(month.days / totalDays) * 100}%`,
                    }}
                  >
                    {month.label}
                  </div>
                ))}
              </div>
            </div>

            {/* ガントチャート本体 */}
            {groupedByGoal.map(({ goal, milestones: groupMilestones }) => (
              <div key={goal.id} className="space-y-0.5">
                {/* 目標ヘッダー */}
                <div className="flex items-center h-6">
                  <div className="w-48 flex-shrink-0 flex items-center gap-1.5 pr-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: goal.color }}
                    />
                    <span className="text-xs font-medium truncate">{goal.name}</span>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* マイルストーン行 */}
                {groupMilestones.map(milestone => {
                  const startPercent = milestone.startDate ? dateToPercent(milestone.startDate) : 0
                  const endPercent = milestone.targetDate ? dateToPercent(milestone.targetDate) : todayPercent
                  const isPast = milestone.targetDate ? new Date(milestone.targetDate) < today : false
                  const isCompleted = milestone.status === 'completed'

                  return (
                    <div key={milestone.id} className="flex items-center h-7 group">
                      {/* マイルストーン名 + 進捗 */}
                      <div className="w-48 flex-shrink-0 pr-2 flex items-center gap-1">
                        <span className={cn(
                          "text-xs truncate pl-4 flex-1",
                          isCompleted && "line-through text-muted-foreground"
                        )}>
                          {milestone.name}
                        </span>
                        <span className={cn(
                          "text-[10px] flex-shrink-0 tabular-nums",
                          isCompleted
                            ? "text-green-600"
                            : isPast
                              ? "text-red-500"
                              : "text-muted-foreground"
                        )}>
                          {milestone.progress}%
                          <span className="text-muted-foreground/70">
                            ({milestone.completedTasks}/{milestone.totalTasks})
                          </span>
                        </span>
                      </div>

                      {/* ガントバー */}
                      <div className="flex-1 relative h-5 bg-muted/30 rounded">
                        {/* 今日のライン */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                          style={{ left: `${todayPercent}%` }}
                        />

                        {/* 進捗バー（開始日〜今日または期限まで） */}
                        <div
                          className={cn(
                            "absolute top-1 bottom-1 rounded transition-all",
                            isCompleted
                              ? "bg-green-500/70"
                              : isPast
                                ? "bg-red-400/70"
                                : "bg-primary/70"
                          )}
                          style={{
                            left: `${startPercent}%`,
                            width: `${Math.max(0, Math.min(endPercent, todayPercent) - startPercent) * (milestone.progress / 100)}%`,
                          }}
                        />

                        {/* 残りのバー（予定） */}
                        <div
                          className={cn(
                            "absolute top-1 bottom-1 rounded-r transition-all",
                            isCompleted
                              ? "bg-green-200/50"
                              : isPast
                                ? "bg-red-200/50"
                                : "bg-primary/20"
                          )}
                          style={{
                            left: `${startPercent + Math.max(0, Math.min(endPercent, todayPercent) - startPercent) * (milestone.progress / 100)}%`,
                            width: `${Math.max(0, endPercent - startPercent - Math.max(0, Math.min(endPercent, todayPercent) - startPercent) * (milestone.progress / 100))}%`,
                          }}
                        />

                        {/* 開始日マーカー（startDateがある場合） */}
                        {milestone.startDate && (
                          <div
                            className={cn(
                              "absolute top-0 bottom-0 w-1 rounded-full opacity-50",
                              isCompleted
                                ? "bg-green-600"
                                : "bg-primary"
                            )}
                            style={{ left: `calc(${startPercent}% - 2px)` }}
                          />
                        )}

                        {/* 期限マーカー（targetDateがある場合） */}
                        {milestone.targetDate && (
                          <div
                            className={cn(
                              "absolute top-0 bottom-0 w-1 rounded-full",
                              isCompleted
                                ? "bg-green-600"
                                : isPast
                                  ? "bg-red-500"
                                  : "bg-primary"
                            )}
                            style={{ left: `calc(${endPercent}% - 2px)` }}
                          />
                        )}

                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* 凡例 */}
            <div className="flex items-center gap-4 mt-4 pt-2 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-primary/70 rounded" />
                <span>予定通り</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-400/70 rounded" />
                <span>期限超過</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500/70 rounded" />
                <span>完了</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-0.5 h-3 bg-red-400" />
                <span>今日</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
