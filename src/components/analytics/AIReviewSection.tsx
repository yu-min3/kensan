import { useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAnalyticsStore } from '@/stores/useAnalyticsStore'
import { streamAgentChat } from '@/api/services/agent'
import type { AIReviewReport, TaskEvaluation, TimeEvaluation, LearningSummaryData } from '@/types'
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
      periodStart: (parsed.periodStart as string) || '',
      periodEnd: (parsed.periodEnd as string) || '',
      taskEvaluations: (parsed.taskEvaluations as TaskEvaluation[]) || [],
      timeEvaluations: (parsed.timeEvaluations as TimeEvaluation[]) || [],
      learningSummary: (parsed.learningSummary as string) || '',
      learningSummaryData: (parsed.learningSummaryData as LearningSummaryData) || undefined,
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
      .map((g) => `- ${g.name} (color:${g.color}): ${Math.floor(g.minutes / 60)}h${g.minutes % 60}m`)
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
          message: `${startDate}〜${endDate}の振り返りレビューを生成してください。
まず get_notes(type="diary", start_date="${startDate}", end_date="${endDate}") と get_notes(type="learning", start_date="${startDate}", end_date="${endDate}") でこの期間の日記・学習記録を取得し、内容を踏まえてレビューしてください。
以下のJSON形式で出力してください:
\`\`\`json
{
  "periodStart": "${startDate}",
  "periodEnd": "${endDate}",
  "taskEvaluations": [{"taskName": "タスク名", "status": "achieved|good|partial|missed", "comment": "コメント"}],
  "timeEvaluations": [{"goalName": "目標名", "goalColor": "#色コード", "actualMinutes": 数値, "comment": "定性的な分析（数値の繰り返しではなく時間配分の意味や質的評価）"}],
  "learningSummary": "学習内容の要約（単なる羅列ではなく、ユーザーの関心や目標との関連を分析）",
  "learningSummaryData": {
    "overview": "今週の学習全体の要約（1-2文）",
    "topics": [{"topic": "トピック名", "goalName": "関連目標名", "goalColor": "#色", "depth": "deep|moderate|light", "insight": "この学習の意味"}],
    "weeklyPattern": "学習パターン分析",
    "goalConnection": "目標進捗との関連"
  },
  "goodPoints": ["ユーザー特性を踏まえた具体的な洞察"],
  "improvementPoints": ["パターン分析に基づく改善点"],
  "advice": ["ユーザーのスタイルに合わせたパーソナライズされたアドバイス"],
  "diaryFeedback": "日記の具体的な内容に触れたひとこと（共感、感想、励まし等。テンプレ禁止）",
  "summary": "全体サマリー"
}
\`\`\`

重要なルール:
- get_notes呼び出し時は必ずstart_dateとend_dateを指定。期間外のノートは絶対に言及しない
- taskEvaluations: この期間中に実際に作業したタスクだけを含める。期限が先でこの期間に手をつけていないタスクは一覧に含めないこと
- taskEvaluations の status: achieved=完了済み、good=今週作業して順調、partial=作業したが遅れ気味、missed=期限超過のもののみ
- taskEvaluations のコメント: missedには「おめでとう」「素晴らしい」等の祝福表現を絶対に使わない。期限超過の事実と次のアクションを淡々と述べる
- timeEvaluations の goalColor と actualMinutes は「提供済みデータ」の週間サマリーの値をそのまま使うこと
- timeEvaluations の comment: 数値の繰り返しではなく、時間配分の意味や質的な分析を書くこと
- learningSummary/learningSummaryData: get_notesで取得した今週の実データのみに基づく。関心プロファイル(ALL-TIME)のトピックを今週学んだかのように書くのは禁止
- learningSummaryData.topics: 各トピックにdepth(deep/moderate/light)とinsight(意味づけ)を含める
- goodPoints/improvementPoints/advice: 一般論ではなくユーザー特性・行動パターンに基づくパーソナライズされた内容にすること`,
          situation: 'review',
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
    <Card className="border-brand/30 bg-gradient-to-br from-brand/[0.03] to-transparent">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-brand">
          <Sparkles className="h-5 w-5" />
          AI振り返りレビュー
          <Badge variant="secondary" className="text-[10px] font-normal">
            AI生成
          </Badge>
        </CardTitle>
        {!isGeneratingReview && (
          <Button
            variant={currentReview ? 'outline' : 'default'}
            size="sm"
            className={currentReview ? 'gap-1.5' : 'gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90'}
            onClick={handleGenerate}
          >
            {currentReview ? (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                再生成
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                レビューを生成
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* 生成中 */}
        {isGeneratingReview && (
          <div className="space-y-4">
            <div className="rounded-lg border-l-4 border-brand bg-brand/5 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-brand" />
                <span className="font-medium text-brand">
                  レビューを生成中...
                </span>
              </div>
              <p className="text-xs text-brand/60 mt-1">
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
            <Bot className="h-12 w-12 mx-auto mb-4 text-brand/30" />
            <p className="text-sm text-muted-foreground mb-1">
              この期間のAIレビューはまだ生成されていません
            </p>
            <p className="text-xs text-muted-foreground">
              右上のボタンからデータを分析し、タスク評価・時間分析・振り返りを生成できます
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
