import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import type { BriefingCard as BriefingCardData } from '@/types/briefing'

interface BriefingCardProps {
  card: BriefingCardData
  children: React.ReactNode
  className?: string
}

function StatusIcon({ status }: { status: BriefingCardData['status'] }) {
  switch (status) {
    case 'loading':
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    case 'ready':
    case 'action_done':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case 'action_pending':
      return <AlertCircle className="h-4 w-4 text-amber-500" />
    case 'skipped':
      return <span className="text-xs text-muted-foreground">スキップ</span>
    default:
      return null
  }
}

export function BriefingCard({ card, children, className }: BriefingCardProps) {
  return (
    <Card
      className={cn(
        'transition-all duration-300',
        card.status === 'loading' && 'opacity-60',
        card.fullWidth && 'col-span-full',
        className,
      )}
    >
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>{card.title}</span>
          <StatusIcon status={card.status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {card.status === 'loading' ? (
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
