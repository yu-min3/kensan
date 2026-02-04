import type { AgentStreamEvent } from '@/api/services/agent'
import type { ActionItem } from '@/stores/useChatStore'
import { useBriefingStore } from '@/stores/useBriefingStore'

/**
 * Process a single SSE event from the AI stream and update the briefing store.
 *
 * Card data is fetched separately by useBriefingData.
 * This processor only handles:
 * - text → insightText (AI-generated analysis)
 * - action_proposal → proposed actions (e.g., timeblock creation)
 * - done → mark phase as ready
 * - error → mark phase as error
 */
export function processBriefingEvent(event: AgentStreamEvent): void {
  const store = useBriefingStore.getState()

  switch (event.type) {
    case 'text': {
      const content = event.data.content as string
      store.appendInsightText(content)
      break
    }

    case 'action_proposal': {
      const actions = event.data.actions as ActionItem[]
      store.setProposedActions(actions)
      break
    }

    case 'done': {
      const conversationId = event.data.conversation_id as string | undefined
      if (conversationId) {
        store.setConversationId(conversationId)
      }
      store.setPhase('ready')
      break
    }

    case 'error': {
      store.setPhase('error')
      break
    }

    // tool_call, tool_result, keepalive — ignored
    // (AI may still call tools internally, but we don't depend on them for cards)
    default:
      break
  }
}
