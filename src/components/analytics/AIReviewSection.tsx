import { useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAnalyticsStore } from '@/stores/useAnalyticsStore'
import { streamAgentChat } from '@/api/services/agent'
import type { AIReviewReport, TaskEvaluation, TimeEvaluation } from '@/types'
import { AIReviewContent } from './AIReviewContent'
import { Sparkles, Bot, Loader2, RefreshCw } from 'lucide-react'

interface AIReviewSectionProps {
  startDate: string
  endDate: string
}

/**
 * Parse the streamed review text into a structured AIReviewReport.
 * Expects JSON output from the AI agent.
 */
function parseReviewFromStream(text: string): AIReviewReport | null {
  // Try to extract JSON from the stream text
  // The agent may wrap it in markdown code blocks
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const jsonStr = jsonMatch[1] ?? jsonMatch[0]
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>

    return {
      id: crypto.randomUUID(),
      weekStart: (parsed.weekStart as string) || '',
      weekEnd: (parsed.weekEnd as string) || '',
      taskEvaluations: (parsed.taskEvaluations as TaskEvaluation[]) || [],
      timeEvaluations: (parsed.timeEvaluations as TimeEvaluation[]) || [],
      learningSummary: (parsed.learningSummary as string) || '',
      goodPoints: (parsed.goodPoints as string[]) || [],
      improvementPoints: (parsed.improvementPoints as string[]) || [],
      advice: (parsed.advice as string[]) || [],
      diaryFeedback: (parsed.diaryFeedback as string) || undefined,
      summary: (parsed.summary as string) || '',
      createdAt: new Date(),
    }
  } catch {
    return null
  }
}

function buildReviewContext(store: {
  weeklySummary: import('@/types').WeeklySummary | null
  dailyStudyHours: import('@/stores/useAnalyticsStore').DailyStudyHour[]
}): Record<string, string> | undefined {
  const ctx: Record<string, string> = {}

  if (store.weeklySummary) {
    const ws = store.weeklySummary
    const goalLines = ws.byGoal
      .map((g) => `- ${g.name}: ${Math.floor(g.minutes / 60)}h${g.minutes % 60}m`)
      .join('\n')
    ctx['週間サマリー'] = [
      `期間: ${ws.weekStart} 〜 ${ws.weekEnd}`,
      `総稼働: ${Math.floor(ws.totalMinutes / 60)}h${ws.totalMinutes % 60}m`,
      `完了タスク: ${ws.completedTasks}件`,
      `計画vs実績: 計画${ws.plannedVsActual.planned}分 / 実績${ws.plannedVsActual.actual}分`,
      `目標別:\n${goalLines}`,
    ].join('\n')
  }

  if (store.dailyStudyHours.length > 0) {
    const lines = store.dailyStudyHours.map((d) => {
      const byGoal = d.byGoal?.map((g) => `${g.name}:${g.minutes}m`).join(', ') ?? ''
      return `- ${d.date}(${d.day}): ${d.hours.toFixed(1)}h${byGoal ? ` [${byGoal}]` : ''}`
    })
    ctx['日別稼働'] = lines.join('\n')
  }

  return Object.keys(ctx).length > 0 ? ctx : undefined
}

export function AIReviewSection({ startDate, endDate }: AIReviewSectionProps) {
  const {
    currentReview,
    isGeneratingReview,
    reviewStreamText,
    weeklySummary,
    dailyStudyHours,
    setCurrentReview,
    setGeneratingReview,
    setReviewStreamText,
    appendReviewStreamText,
  } = useAnalyticsStore()

  const abortRef = useRef<AbortController | null>(null)

  const handleGenerate = useCallback(async () => {
    setGeneratingReview(true)
    setReviewStreamText('')
    setCurrentReview(null)

    abortRef.current = new AbortController()

    try {
      const stream = streamAgentChat(
        {
          message: `${startDate}〜${endDate}の振り返りレビューを生成してください。以下のJSON形式で出力してください:
\`\`\`json
{
  "weekStart": "${startDate}",
  "weekEnd": "${endDate}",
  "taskEvaluations": [{"taskName": "タスク名", "status": "achieved|good|partial|missed", "comment": "コメント"}],
  "timeEvaluations": [{"goalName": "目標名", "goalColor": "#色コード", "actualMinutes": 数値, "targetMinutes": 数値, "comment": "コメント"}],
  "learningSummary": "学習記録の要約テキスト",
  "goodPoints": ["よかった点1", "よかった点2"],
  "improvementPoints": ["改善点1", "改善点2"],
  "advice": ["アドバイス1", "アドバイス2"],
  "diaryFeedback": "日記を読んでの雑談じみたひとこと（共感、感想、励まし等。1-2文でカジュアルに）",
  "summary": "全体サマリー"
}
\`\`\``,
          situation: 'weekly',
          context: buildReviewContext({ weeklySummary, dailyStudyHours }),
        },
        abortRef.current.signal
      )

      let fullText = ''

      for await (const event of stream) {
        if (event.type === 'text') {
          const chunk = event.data.content as string
          fullText += chunk
          appendReviewStreamText(chunk)
        }
      }

      // Try to parse the completed stream into structured data
      const parsed = parseReviewFromStream(fullText)
      if (parsed) {
        setCurrentReview(parsed)
        setReviewStreamText('')
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        appendReviewStreamText('\n\nエラーが発生しました。もう一度お試しください。')
      }
    } finally {
      setGeneratingReview(false)
    }
  }, [
    startDate,
    endDate,
    weeklySummary,
    dailyStudyHours,
    setGeneratingReview,
    setReviewStreamText,
    setCurrentReview,
    appendReviewStreamText,
  ])

  const formatCreatedAt = (date: Date) => {
    const d = new Date(date)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${month}/${day} ${hours}:${minutes}`
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI振り返りレビュー
          <Badge variant="secondary" className="text-[10px] font-normal">
            AI生成
          </Badge>
        </CardTitle>
        {currentReview && !isGeneratingReview && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleGenerate}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            再生成
          </Button>
        )}
        {!currentReview && !isGeneratingReview && !reviewStreamText && (
          <Button size="sm" className="gap-1.5" onClick={handleGenerate}>
            <Sparkles className="h-3.5 w-3.5" />
            レビューを生成
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* 生成中 */}
        {isGeneratingReview && (
          <div className="space-y-4">
            <div className="rounded-lg border-l-4 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span className="font-medium text-indigo-700 dark:text-indigo-300">
                  レビューを生成中...
                </span>
              </div>
              <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-1">
                データを分析しています
              </p>
            </div>
            {reviewStreamText && (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {reviewStreamText}
              </div>
            )}
          </div>
        )}

        {/* 生成済み */}
        {currentReview && !isGeneratingReview && (
          <div>
            <p className="text-xs text-muted-foreground mb-4">
              生成日: {formatCreatedAt(currentReview.createdAt)}
            </p>
            <AIReviewContent review={currentReview} />
          </div>
        )}

        {/* ストリーム完了したがパースできなかった場合（フォールバック表示） */}
        {!currentReview && !isGeneratingReview && reviewStreamText && (
          <div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">
              {reviewStreamText}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              AIレビューはClaude APIで生成されています。参考情報としてご活用ください。
            </p>
          </div>
        )}

        {/* 未生成 (Empty State) */}
        {!currentReview && !isGeneratingReview && !reviewStreamText && (
          <div className="text-center py-12">
            <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-1">
              この期間のAIレビューはまだ生成されていません
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              データを分析し、タスク評価・時間分析・振り返りを生成します
            </p>
            <Button onClick={handleGenerate} className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              レビューを生成する
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
