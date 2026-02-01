import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ActionItem } from '@/stores/useChatStore'
import { formatActionDescription } from '@/lib/actionFormatter'

interface ActionProposalProps {
  actions: ActionItem[]
  onApprove: (actionIds: string[]) => void
  onReject: () => void
  disabled?: boolean
}

export function ActionProposal({ actions, onApprove, onReject, disabled }: ActionProposalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(actions.map((a) => a.id)))

  const toggleAction = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="mx-4 my-2 rounded-lg border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">提案されたアクション</p>
      <div className="space-y-1.5">
        {actions.map((action) => (
          <label
            key={action.id}
            className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1.5 py-1"
          >
            <input
              type="checkbox"
              checked={selected.has(action.id)}
              onChange={() => toggleAction(action.id)}
              disabled={disabled}
              className="rounded border-input"
            />
            <span>{formatActionDescription(action.type, action.input)}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          onClick={() => onApprove(Array.from(selected))}
          disabled={disabled || selected.size === 0}
          className="flex-1"
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          承認 ({selected.size})
        </Button>
        <Button size="sm" variant="outline" onClick={onReject} disabled={disabled}>
          <X className="h-3.5 w-3.5 mr-1" />
          却下
        </Button>
      </div>
    </div>
  )
}
