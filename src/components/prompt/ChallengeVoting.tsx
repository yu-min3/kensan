import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
import { ArrowUpCircle, XCircle } from 'lucide-react'
import type { Comparison } from '@/api/services/challenges'

const statusConfig: Record<Comparison['status'], { label: string; className: string }> = {
  active: { label: '比較中', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  adopted_a: { label: 'vA採用', className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' },
  adopted_b: { label: 'vB採用', className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' },
  dismissed: { label: '棄却', className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30' },
}

interface ChallengeResolvedCardProps {
  status: Comparison['status']
  resolvedAt?: string | null
}

export function ChallengeResolvedCard({ status, resolvedAt }: ChallengeResolvedCardProps) {
  const config = statusConfig[status]
  const isAdopted = status === 'adopted_a' || status === 'adopted_b'
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          {isAdopted ? (
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600" />
          )}
          <span className="text-sm font-medium">
            {status === 'adopted_a'
              ? 'バージョンAが採用されました'
              : status === 'adopted_b'
                ? 'バージョンBが採用されました'
                : '比較は棄却されました'}
          </span>
          <Badge variant="outline" className={config.className}>{config.label}</Badge>
        </div>
        {resolvedAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            {new Date(resolvedAt).toLocaleString('ja-JP')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface ChallengeResolveActionsProps {
  winRateB: number | null
  versionA: number
  versionB: number
  isLoading: boolean
  onResolve: (action: 'adopt_a' | 'adopt_b' | 'dismiss') => void
}

export function ChallengeResolveActions({
  winRateB,
  versionA,
  versionB,
  isLoading,
  onResolve,
}: ChallengeResolveActionsProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <h4 className="mb-3 text-sm font-medium">解決アクション</h4>
        {winRateB != null && (
          <div className="mb-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">v{versionB} の勝率</span>
              <span className="font-medium">{Math.round(winRateB * 100)}%</span>
            </div>
            <Progress value={winRateB * 100} />
          </div>
        )}
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm">
                <ArrowUpCircle className="h-4 w-4" />
                v{versionA} を採用
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>v{versionA} を採用しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  v{versionA} を現行プロンプトとして採用します。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={() => onResolve('adopt_a')}>
                  採用する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="secondary">
                <ArrowUpCircle className="h-4 w-4" />
                v{versionB} を採用
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>v{versionB} を採用しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  v{versionB} を現行プロンプトとして採用します。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={() => onResolve('adopt_b')}>
                  採用する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onResolve('dismiss')}
            disabled={isLoading}
          >
            <XCircle className="h-4 w-4" />
            棄却
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
