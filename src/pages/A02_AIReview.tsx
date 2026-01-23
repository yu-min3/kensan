import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { aiApi } from '@/api/services/ai'
import { useAnalyticsStore } from '@/stores/useAnalyticsStore'
import { formatDateRange } from '@/lib/dateFormat'
import type { AIReviewReport } from '@/types'
import {
  Bot,
  Sparkles,
  ThumbsUp,
  AlertTriangle,
  Lightbulb,
  Calendar,
  Loader2,
  ChevronRight,
} from 'lucide-react'

export function A02AIReview() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiReviewReports, setAiReviewReports] = useState<AIReviewReport[]>([])
  const [selectedReport, setSelectedReport] = useState<AIReviewReport | null>(null)
  const [isLoadingReports, setIsLoadingReports] = useState(true)
  const { weeklySummary, fetchWeeklySummary } = useAnalyticsStore()

  useEffect(() => {
    fetchWeeklySummary()
    loadReports()
  }, [fetchWeeklySummary])

  const loadReports = async () => {
    setIsLoadingReports(true)
    try {
      const reports = await aiApi.listReviews()
      setAiReviewReports(reports)
      if (reports.length > 0) {
        setSelectedReport(reports[0])
      }
    } catch (error) {
      console.error('Failed to load AI review reports:', error)
    } finally {
      setIsLoadingReports(false)
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const today = new Date()
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - 6)
      const newReport = await aiApi.generateReview({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: today.toISOString().split('T')[0],
      })
      setAiReviewReports((prev) => [newReport, ...prev])
      setSelectedReport(newReport)
    } catch (error) {
      console.error('Failed to generate AI review:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const formatWeek = (start: string, end: string) => formatDateRange(start, end)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-indigo-500" />
          <div>
            <h1 className="text-2xl font-bold">AI振り返り</h1>
            <p className="text-sm text-muted-foreground">Phase 2 機能</p>
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              今週のレポートを生成
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* メインコンテンツ */}
        <div className="lg:col-span-3 space-y-6">
          {selectedReport ? (
            <>
              {/* レポートヘッダー */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {formatWeek(selectedReport.weekStart, selectedReport.weekEnd)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{selectedReport.summary}</p>
                </CardContent>
              </Card>

              {/* よかった点 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ThumbsUp className="h-5 w-5 text-slate-500" />
                    よかった点
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedReport.goodPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-slate-400 mt-1">✓</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* 改善点 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-slate-500" />
                    改善点
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedReport.improvementPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-slate-400 mt-1">!</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* アドバイス */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-slate-500" />
                    来週へのアドバイス
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {selectedReport.advice.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-slate-400 mt-1">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Bot className="h-16 w-16 mx-auto text-muted-foreground/50" />
                <h3 className="text-lg font-medium mt-4">AIレポートを生成</h3>
                <p className="text-muted-foreground mt-2">
                  今週の学習データを分析して、振り返りレポートを生成します。
                </p>
                <Button onClick={handleGenerate} className="mt-4 gap-2">
                  <Sparkles className="h-4 w-4" />
                  レポートを生成
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-4">
          {/* 過去のレポート */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">過去のレポート</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingReports ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : aiReviewReports.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  レポートがありません
                </p>
              ) : (
                <div className="space-y-2">
                  {aiReviewReports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`w-full flex items-center justify-between p-2 rounded text-left text-sm transition-colors ${
                        selectedReport?.id === report.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <span>{formatWeek(report.weekStart, report.weekEnd)}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* サマリー統計 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">今週のサマリー</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {weeklySummary ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">総学習時間</span>
                    <span className="font-medium">
                      {Math.floor(weeklySummary.totalMinutes / 60)}時間
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">完了タスク</span>
                    <span className="font-medium">{weeklySummary.completedTasks}件</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">計画達成率</span>
                    <span className="font-medium">
                      {Math.round(
                        (weeklySummary.plannedVsActual.actual /
                          weeklySummary.plannedVsActual.planned) *
                          100
                      )}
                      %
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground text-sm">
                  読み込み中...
                </p>
              )}
            </CardContent>
          </Card>

          {/* 注意書き */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">
                AIレポートはClaude APIを使用して生成されます。
                データはAnthropicに送信されますが、モデルのトレーニングには使用されません。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
