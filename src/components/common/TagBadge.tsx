import { Badge } from '@/components/ui/badge'
import type { GoalTag } from '@/types'
import { cn } from '@/lib/utils'

interface TagBadgeProps {
  tag: GoalTag
  size?: 'sm' | 'default'
}

const tagConfig: Record<GoalTag, { label: string; className: string }> = {
  GK: { label: 'GK', className: 'bg-slate-700 hover:bg-slate-600' },
  OSS: { label: 'OSS', className: 'bg-slate-600 hover:bg-slate-500' },
  Output: { label: 'Output', className: 'bg-slate-500 hover:bg-slate-400' },
  Other: { label: 'Other', className: 'bg-slate-400 hover:bg-slate-300' },
}

export function TagBadge({ tag, size = 'default' }: TagBadgeProps) {
  const config = tagConfig[tag]

  return (
    <Badge
      className={cn(
        'text-white border-none',
        config.className,
        size === 'sm' && 'text-[10px] px-1.5 py-0'
      )}
    >
      {config.label}
    </Badge>
  )
}
