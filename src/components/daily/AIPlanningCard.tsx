import { useCallback, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { streamAgentChat } from '@/api/services/agent'
import type { AIPlanningResult, ProposedBlock } from '@/types'
import {
  Sparkles,
  Bot,
  Loader2,
  RefreshCw,
  Zap,
  Target,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'

interface AIPlanningCardProps {
  selectedDate: string // YYYY-MM-DD
}

function parsePlanningFromStream(text: string): AIPlanningResult | null {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const jsonStr = jsonMatch[1] ?? jsonMatch[0]
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>

    return {
      insights: (parsed.insights as AIPlanningResult['insights']) || [],
      proposedBlocks: (parsed.proposedBlocks as AIPlanningResult['proposedBlocks']) || [],
      taskPriorities: (parsed.taskPriorities as AIPlanningResult['taskPriorities']) || [],
      alerts: (parsed.alerts as AIPlanningResult['alerts']) || [],
    }
  } catch {
    return null
  }
}

const CATEGORY_ICONS = {
  productivity: Zap,
  goal: Target,
  planning: Calendar,
  alert: AlertTriangle,
} as const

const ALERT_STYLES = {
  goal_stalled: 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200',
  overdue: 'border-red-400 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200',
  overcommit: 'border-orange-400 bg-orange-50 dark:bg-orange-950/20 text-orange-800 dark:text-orange-200',
} as const

const ACTION_BADGE_STYLES = {
  today: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  defer: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  split: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
} as const

const ACTION_LABELS = {
  today: '今日やる',
  defer: '延期',
  split: '分割',
} as const

export function AIPlanningCard({ selectedDate }: AIPlanningCardProps) {
  const { addTimeBlock } = useTimeBlockStore()

  const [planningResult, setPlanningResult] = useState<AIPlanningResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [selectedBlockIndices, setSelectedBlockIndices] = useState<Set<number>>(new Set())
  const [isApplying, setIsApplying] = useState(false)
  const [appliedCount, setAppliedCount] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true)
    setStreamText('')
    setPlanningResult(null)
    setSelectedBlockIndices(new Set())
    setAppliedCount(0)

    abortRef.current = new AbortController()

    try {
      const stream = streamAgentChat(
        {
          message: '今日の計画を提案して',
          situation: 'planning',
        },
        abortRef.current.signal,
      )

      let fullText = ''

      for await (const event of stream) {
        if (event.type === 'text') {
          const chunk = event.data.content as string
          fullText += chunk
          setStreamText((prev) => prev + chunk)
        }
      }

      const parsed = parsePlanningFromStream(fullText)
      if (parsed) {
        setPlanningResult(parsed)
        setStreamText('')
        // Select all blocks by default
        setSelectedBlockIndices(new Set(parsed.proposedBlocks.map((_, i) => i)))
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setStreamText((prev) => prev + '\n\nエラーが発生しました。もう一度お試しください。')
      }
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const handleToggleBlock = useCallback((index: number) => {
    setSelectedBlockIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const handleApplyBlocks = useCallback(async () => {
    if (!planningResult) return
    const blocks = planningResult.proposedBlocks.filter((_, i) => selectedBlockIndices.has(i))
    if (blocks.length === 0) return

    setIsApplying(true)
    let count = 0
    for (const block of blocks) {
      await addTimeBlock(selectedDate, block.startTime, selectedDate, block.endTime, {
        taskId: block.taskId || undefined,
        taskName: block.taskName,
        goalId: block.goalId || undefined,
        goalName: block.goalName || undefined,
        goalColor: block.goalColor || undefined,
      })
      count++
    }
    setAppliedCount(count)
    setIsApplying(false)
  }, [planningResult, selectedBlockIndices, selectedDate, addTimeBlock])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5" />
          AI計画提案
          <Badge variant="secondary" className="text-[10px] font-normal">
            AI生成
          </Badge>
        </CardTitle>
        {planningResult && !isGenerating && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGenerate}>
            <RefreshCw className="h-3.5 w-3.5" />
            再生成
          </Button>
        )}
        {!planningResult && !isGenerating && !streamText && (
          <Button size="sm" className="gap-1.5" onClick={handleGenerate}>
            <Sparkles className="h-3.5 w-3.5" />
            計画を生成
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Generating */}
        {isGenerating && (
          <div className="space-y-4">
            <div className="rounded-lg border-l-4 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span className="font-medium text-indigo-700 dark:text-indigo-300">
                  計画を生成中...
                </span>
              </div>
              <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-1">
                行動パターンを分析し、最適な計画を提案しています
              </p>
            </div>
            {streamText && (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {streamText}
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {planningResult && !isGenerating && (
          <div className="space-y-5">
            {/* Alerts */}
            {planningResult.alerts.length > 0 && (
              <div className="space-y-2">
                {planningResult.alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border-l-4 p-3 text-sm ${ALERT_STYLES[alert.type] || ALERT_STYLES.overcommit}`}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      {alert.message}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Insights */}
            {planningResult.insights.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  インサイト
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {planningResult.insights.map((insight, i) => {
                    const Icon = CATEGORY_ICONS[insight.category] || Zap
                    return (
                      <div
                        key={i}
                        className="flex gap-2 rounded-md border p-3"
                      >
                        <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{insight.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Proposed Blocks */}
            {planningResult.proposedBlocks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    タイムブロック提案
                  </h4>
                  {appliedCount > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {appliedCount}件適用済み
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5"
                      disabled={selectedBlockIndices.size === 0 || isApplying}
                      onClick={handleApplyBlocks}
                    >
                      {isApplying ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Calendar className="h-3.5 w-3.5" />
                      )}
                      まとめて適用（{selectedBlockIndices.size}件）
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {planningResult.proposedBlocks.map((block, i) => (
                    <ProposedBlockRow
                      key={i}
                      block={block}
                      checked={selectedBlockIndices.has(i)}
                      disabled={appliedCount > 0}
                      onToggle={() => handleToggleBlock(i)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Task Priorities */}
            {planningResult.taskPriorities.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  タスク優先度
                </h4>
                <div className="space-y-1.5">
                  {planningResult.taskPriorities.map((tp, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-md border p-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{tp.taskName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tp.reason}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${ACTION_BADGE_STYLES[tp.suggestedAction]}`}
                      >
                        {ACTION_LABELS[tp.suggestedAction]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fallback: stream text couldn't be parsed */}
        {!planningResult && !isGenerating && streamText && (
          <div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">{streamText}</div>
            <p className="text-xs text-muted-foreground mt-4">
              構造化データへの変換に失敗しました。テキストとして表示しています。
            </p>
          </div>
        )}

        {/* Empty state */}
        {!planningResult && !isGenerating && !streamText && (
          <div className="text-center py-8">
            <Bot className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-1">
              行動パターンに基づいた計画を提案します
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              生産性ピーク時間帯・目標トレンド・繰り越しタスクを分析
            </p>
            <Button onClick={handleGenerate} className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              計画を生成する
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ProposedBlockRow({
  block,
  checked,
  disabled,
  onToggle,
}: {
  block: ProposedBlock
  checked: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <label className="flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer hover:bg-accent/50 transition-colors">
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {block.goalColor && (
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: block.goalColor }}
            />
          )}
          <span className="text-sm font-medium truncate">{block.taskName}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {block.startTime}〜{block.endTime}
          </span>
        </div>
        {block.goalName && (
          <p className="text-xs text-muted-foreground mt-0.5">{block.goalName}</p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-0.5">{block.reason}</p>
      </div>
    </label>
  )
}
