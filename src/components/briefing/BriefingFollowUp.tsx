import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/useChatStore'
import { useBriefingStore } from '@/stores/useBriefingStore'
import type { BriefingMode } from '@/types/briefing'

interface BriefingFollowUpProps {
  mode: BriefingMode
}

export function BriefingFollowUp({ mode }: BriefingFollowUpProps) {
  const { open } = useChatStore()
  const conversationId = useBriefingStore((s) => s.conversationId)

  const handleOpenChat = () => {
    if (conversationId) {
      useChatStore.getState().setConversationId(conversationId)
    }
    open()
  }

  return (
    <div className="flex items-center justify-center gap-3 py-4 border-t">
      <Button variant="outline" size="sm" onClick={handleOpenChat}>
        <MessageSquare className="h-4 w-4 mr-1.5" />
        {mode === 'morning'
          ? 'AIに相談する'
          : '振り返りを深掘りする'}
      </Button>
    </div>
  )
}
