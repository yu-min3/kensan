import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { AIContext } from '@/api/services/prompts'

interface PromptSidebarProps {
  contexts: AIContext[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function PromptSidebar({ contexts, selectedId, onSelect }: PromptSidebarProps) {
  return (
    <div className="space-y-1">
      <h3 className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        コンテキスト一覧
      </h3>
      {contexts.map((ctx) => (
        <button
          key={ctx.id}
          onClick={() => onSelect(ctx.id)}
          className={cn(
            'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
            selectedId === ctx.id
              ? 'bg-brand/15 text-brand font-medium'
              : 'text-foreground hover:bg-muted'
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{ctx.name}</div>
            <div className="text-xs text-muted-foreground">{ctx.situation}</div>
          </div>
          <div className="ml-2 flex items-center gap-1.5">
            {ctx.situation === 'persona' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">共有</Badge>
            )}
            {ctx.current_version_number && (
              <span className="text-[10px] text-muted-foreground">
                v{ctx.current_version_number}
              </span>
            )}
            {ctx.is_active && (
              <span className="h-2 w-2 rounded-full bg-green-500" title="Active" />
            )}
          </div>
        </button>
      ))}
      {contexts.length === 0 && (
        <p className="px-3 py-4 text-sm text-muted-foreground">
          コンテキストがありません
        </p>
      )}
    </div>
  )
}
