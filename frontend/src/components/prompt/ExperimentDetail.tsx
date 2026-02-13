import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowUpCircle, XCircle, Sparkles } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { useChallengeStore } from '@/stores/useChallengeStore'
import { ChallengePromptDiff } from './ChallengePromptDiff'

const statusConfig = {
  pending_review: { label: 'レビュー待ち', className: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' },
  in_challenge: { label: '評価中', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  promoted: { label: '採用済み', className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' },
  rejected: { label: '却下', className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30' },
} as const

export function ExperimentDetail() {
  const {
    selectedExperiment: exp,
    isLoading,
    resolveExperiment,
  } = useChallengeStore()

  if (!exp) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">
            左のリストから比較を選択してください
          </p>
        </CardContent>
      </Card>
    )
  }

  const status = statusConfig[exp.status]
  const isResolved = exp.status === 'promoted' || exp.status === 'rejected'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{exp.control_name}</h3>
          <p className="text-sm text-muted-foreground">
            {exp.situation} — AI最適化提案
          </p>
        </div>
        <Badge variant="outline" className={status.className}>{status.label}</Badge>
      </div>

      {/* Evaluation Summary */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            評価サマリー
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">会話数:</span>{' '}
              <span className="font-medium">{exp.eval_interaction_count}</span>
            </div>
            <div>
              <span className="text-muted-foreground">平均評価:</span>{' '}
              <span className="font-medium">
                {exp.eval_avg_rating != null ? exp.eval_avg_rating.toFixed(1) : 'N/A'}
              </span>
            </div>
          </div>

          {exp.eval_weaknesses.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">改善点</p>
              <ul className="space-y-0.5">
                {exp.eval_weaknesses.map((w, i) => (
                  <li key={i} className="text-xs text-red-600 dark:text-red-400">- {w}</li>
                ))}
              </ul>
            </div>
          )}

          {exp.eval_strengths.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">強み</p>
              <ul className="space-y-0.5">
                {exp.eval_strengths.map((s, i) => (
                  <li key={i} className="text-xs text-green-600 dark:text-green-400">- {s}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prompt Diff */}
      <ChallengePromptDiff
        promptA={exp.control_prompt}
        promptB={exp.variant_prompt}
        labelA="現行"
        labelB="改善案"
      />

      {/* Resolve Actions */}
      {isResolved ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {exp.status === 'promoted' ? (
                <ArrowUpCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm font-medium">
                {exp.status === 'promoted'
                  ? '改善案が採用されました'
                  : '改善案は却下されました'}
              </span>
              <Badge variant="outline" className={status.className}>{status.label}</Badge>
            </div>
            {exp.resolved_at && (
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(exp.resolved_at).toLocaleString('ja-JP')}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-3 text-sm font-medium">解決アクション</h4>
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm">
                    <ArrowUpCircle className="h-4 w-4" />
                    改善案を採用
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>改善案を採用しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      AIが生成した改善プロンプトを現行プロンプトとして採用します。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction onClick={() => resolveExperiment('promote')} disabled={isLoading}>
                      採用する
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                variant="outline"
                size="sm"
                onClick={() => resolveExperiment('reject')}
                disabled={isLoading}
              >
                <XCircle className="h-4 w-4" />
                却下
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
