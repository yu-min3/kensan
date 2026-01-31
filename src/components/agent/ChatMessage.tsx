import { Bot, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage as ChatMessageType } from '@/stores/useChatStore'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  if (message.type === 'tool_call') {
    return (
      <div className="flex items-center gap-2 px-4 py-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{getToolLabel(message.toolName || '')}...</span>
      </div>
    )
  }

  if (message.type === 'tool_result') {
    return null
  }

  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-2 px-4 py-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {message.content}
      </div>
    </div>
  )
}

function getToolLabel(toolName: string): string {
  const labels: Record<string, string> = {
    get_tasks: 'タスクを確認中',
    get_goals_and_milestones: '目標を確認中',
    get_time_blocks: 'タイムブロックを確認中',
    get_time_entries: '実績を確認中',
    get_memos: 'メモを確認中',
    get_notes: 'ノートを確認中',
    create_task: 'タスクを作成中',
    create_time_block: 'タイムブロックを作成中',
    create_memo: 'メモを作成中',
  }
  return labels[toolName] || `${toolName} を実行中`
}
