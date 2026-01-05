import { Badge } from '@/components/ui/badge'
import type { GoalTag } from '@/types'
import { cn } from '@/lib/utils'

interface TagBadgeProps {
  tag: GoalTag
  size?: 'sm' | 'default'
}

const tagConfig: Record<GoalTag, { label: string; className: string }> = {
  GK: { label: 'GK', className: 'bg-yellow-500 hover:bg-yellow-500/80' },
  OSS: { label: 'OSS', className: 'bg-green-500 hover:bg-green-500/80' },
  Output: { label: 'Output', className: 'bg-blue-500 hover:bg-blue-500/80' },
  Other: { label: 'Other', className: 'bg-gray-500 hover:bg-gray-500/80' },
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
