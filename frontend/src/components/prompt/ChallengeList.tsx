import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { GitCompare } from 'lucide-react'
import type { Comparison } from '@/api/services/challenges'

interface ChallengeListProps {
  challenges: Comparison[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const statusConfig: Record<Comparison['status'], { label: string; className: string }> = {
  active: { label: '比較中', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  adopted_a: { label: 'vA採用', className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' },
  adopted_b: { label: 'vB採用', className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' },
  dismissed: { label: '棄却', className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30' },
}

export function ChallengeList({ challenges, selectedId, onSelect }: ChallengeListProps) {
  if (challenges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <GitCompare className="h-10 w-10 text-muted-foreground/50" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">比較がありません</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            バージョン履歴から比較を開始できます。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <h3 className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        比較一覧
      </h3>
      {challenges.map((comp) => {
        const status = statusConfig[comp.status]
        const decidedRounds = comp.rounds.filter((r) => r.winner != null).length
        return (
          <button
            key={comp.id}
            onClick={() => onSelect(comp.id)}
            className={cn(
              'flex w-full flex-col gap-1.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
              selectedId === comp.id
                ? 'bg-brand/15 text-brand font-medium'
                : 'text-foreground hover:bg-muted'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{comp.context_name}</span>
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 shrink-0', status.className)}>
                {status.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>v{comp.version_a} vs v{comp.version_b}</span>
              {decidedRounds > 0 && (
                <>
                  <span>·</span>
                  <span>{decidedRounds} ラウンド</span>
                </>
              )}
              {comp.win_rate_b != null && (
                <>
                  <span>·</span>
                  <span>vB勝率 {Math.round(comp.win_rate_b * 100)}%</span>
                </>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
