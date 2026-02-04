import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useBriefingStore } from '@/stores/useBriefingStore'
import { streamApproveActions } from '@/api/services/agent'
import { processBriefingEvent } from '@/lib/briefingEventProcessor'
import { Check, X, Clock } from 'lucide-react'

export function TimeblockProposalCard() {
  const [approving, setApproving] = useState(false)
  const conversationId = useBriefingStore((s) => s.conversationId)
  const actions = useBriefingStore((s) => s.proposedActions)
  const actionStatus = useBriefingStore((s) => s.actionStatus)
  const setActionStatus = useBriefingStore((s) => s.setActionStatus)

  const handleApprove = async () => {
    if (!conversationId || actions.length === 0) return
    setApproving(true)

    try {
      for await (const event of streamApproveActions({
        conversation_id: conversationId,
        action_ids: actions.map((a) => a.id),
      })) {
        processBriefingEvent(event)
      }
      setActionStatus('approved')
    } catch {
      // Keep pending on error
    } finally {
      setApproving(false)
    }
  }

  const handleSkip = () => {
    setActionStatus('skipped')
  }

  if (actions.length === 0) {
    return <p className="text-sm text-muted-foreground">提案はありません</p>
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {actions.map((action) => (
          <div
            key={action.id}
            className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50"
          >
            <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="flex-1">{action.description}</span>
          </div>
        ))}
      </div>

      {actionStatus === 'approved' ? (
        <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" />
          <span>作成しました</span>
        </div>
      ) : actionStatus === 'skipped' ? (
        <p className="text-sm text-muted-foreground">スキップしました</p>
      ) : (
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleApprove} disabled={approving}>
            {approving ? '作成中...' : '承認して作成'}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleSkip} disabled={approving}>
            <X className="h-3.5 w-3.5 mr-1" />
            スキップ
          </Button>
        </div>
      )}
    </div>
  )
}
