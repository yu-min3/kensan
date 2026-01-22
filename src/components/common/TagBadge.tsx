import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface TagBadgeProps {
  name: string
  color: string
  size?: 'sm' | 'default'
}

/**
 * Tag を表示するバッジコンポーネント
 * 色付き背景でTag名を表示する（集計用の自由タグ）
 */
export function TagBadge({ name, color, size = 'default' }: TagBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'border-current',
        size === 'sm' && 'text-[10px] px-1.5 py-0'
      )}
      style={{ color, borderColor: color }}
    >
      {name}
    </Badge>
  )
}
