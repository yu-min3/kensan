import { Progress } from '@/components/ui/progress'
import type { AIReviewReport, TaskEvaluationStatus, LearningSummaryData } from '@/types'
import { Target, Clock, BookOpen, MessageSquare, CheckCircle2, AlertTriangle, Lightbulb, MessageCircle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const statusConfig: Record<TaskEvaluationStatus, { label: string; className: string }> = {
  achieved: {
    label: '達成',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  good: {
    label: '良好',
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  },
  partial: {
    label: '一部未達',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  missed: {
    label: '未達',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
}

const depthConfig: Record<string, { label: string; className: string }> = {
  deep: {
    label: '深い学習',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  },
  moderate: {
    label: '学習',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  light: {
    label: '概観',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  },
}

interface AIReviewContentProps {
  review: AIReviewReport
}

function LearningSummaryStructured({ data }: { data: LearningSummaryData }) {
  return (
    <div className="space-y-4">
      {/* Overview */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {data.overview}
      </p>

      {/* Topic Cards */}
      {data.topics.length > 0 && (
        <div className="space-y-2">
          {data.topics.map((topic, i) => {
            const depth = depthConfig[topic.depth] || depthConfig.moderate
            return (
              <div
                key={i}
                className="rounded-md border bg-card p-3"
                style={{ borderLeftWidth: '3px', borderLeftColor: topic.goalColor || 'var(--border)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">{topic.topic}</span>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', depth.className)}>
                    {depth.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{topic.insight}</p>
                {topic.goalName && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div
                      className="w-2 h-2 rounded-sm"
                      style={{ backgroundColor: topic.goalColor || '#888' }}
                    />
                    <span className="text-[11px] text-muted-foreground">{topic.goalName}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Weekly Pattern */}
      {data.weeklyPattern && (
        <div className="flex items-start gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-muted-foreground">{data.weeklyPattern}</p>
        </div>
      )}

      {/* Goal Connection */}
      {data.goalConnection && (
        <div className="flex items-start gap-2 text-sm">
          <Target className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-muted-foreground">{data.goalConnection}</p>
        </div>
      )}
    </div>
  )
}

export function AIReviewContent({ review }: AIReviewContentProps) {
  return (
    <div className="space-y-6">
      {/* Section A & B: タスク評価 + 学習時間評価 (2列) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Section A: タスク評価 */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium text-sm">タスク評価</h4>
          </div>
          <div className="space-y-4">
            {review.taskEvaluations.map((evaluation, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{evaluation.taskName}</span>
                  <span
                    className={cn(
                      'text-[11px] px-1.5 py-0.5 rounded font-medium',
                      statusConfig[evaluation.status].className
                    )}
                  >
                    {statusConfig[evaluation.status].label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{evaluation.comment}</p>
              </div>
            ))}
            {review.taskEvaluations.length === 0 && (
              <p className="text-xs text-muted-foreground">タスク評価データなし</p>
            )}
          </div>
        </div>

        {/* Section B: 学習時間評価 */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium text-sm">学習時間評価</h4>
          </div>
          <div className="space-y-4">
            {review.timeEvaluations.map((evaluation, i) => {
              const hasTarget = evaluation.targetMinutes && evaluation.targetMinutes > 0
              const percent = hasTarget
                ? Math.round((evaluation.actualMinutes / evaluation.targetMinutes!) * 100)
                : null
              const actualH = Math.round(evaluation.actualMinutes / 60)
              const targetH = hasTarget ? Math.round(evaluation.targetMinutes! / 60) : null
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {evaluation.goalColor && (
                        <div
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ backgroundColor: evaluation.goalColor }}
                        />
                      )}
                      <span className="text-sm font-medium">{evaluation.goalName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {targetH != null ? `${actualH}h/${targetH}h` : `${actualH}h`}
                    </span>
                  </div>
                  {percent != null && (
                    <Progress value={Math.min(percent, 100)} className="h-2 mb-1" />
                  )}
                  <p className="text-xs text-muted-foreground">{evaluation.comment}</p>
                </div>
              )
            })}
            {review.timeEvaluations.length === 0 && (
              <p className="text-xs text-muted-foreground">時間評価データなし</p>
            )}
          </div>
        </div>
      </div>

      {/* Section C: 学習記録サマリー */}
      {(review.learningSummaryData || review.learningSummary) && (
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium text-sm">学習記録サマリー</h4>
          </div>
          {review.learningSummaryData ? (
            <LearningSummaryStructured data={review.learningSummaryData} />
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {review.learningSummary}
            </p>
          )}
        </div>
      )}

      {/* おまけ: 日記へのひとこと */}
      {review.diaryFeedback && (
        <div className="rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200/50 dark:border-purple-800/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="h-4 w-4 text-purple-500" />
            <h4 className="font-medium text-sm text-purple-700 dark:text-purple-300">
              日記を読んで...
            </h4>
          </div>
          <p className="text-sm text-purple-900/80 dark:text-purple-100/80 leading-relaxed italic">
            {review.diaryFeedback}
          </p>
        </div>
      )}

      {/* Section D: 振り返り */}
      <div className="rounded-lg bg-muted/50 p-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-medium text-sm">振り返り</h4>
        </div>

        <div className="space-y-4">
          {/* よかった点 */}
          {review.goodPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">よかった点</p>
              <ul className="space-y-1.5">
                {review.goodPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 改善点 */}
          {review.improvementPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">改善点</p>
              <ul className="space-y-1.5">
                {review.improvementPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 来期へのアドバイス */}
          {review.advice.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">来期へのアドバイス</p>
              <ul className="space-y-1.5">
                {review.advice.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Lightbulb className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground">
        AIレビューはClaude APIで生成されています。参考情報としてご活用ください。
      </p>
    </div>
  )
}
