import type { AgentStreamEvent } from '@/api/services/agent'
import type { BriefingCardType } from '@/types/briefing'
import type { ActionItem } from '@/stores/useChatStore'
import { useBriefingStore } from '@/stores/useBriefingStore'

/**
 * Process a single SSE event and update the briefing store accordingly.
 * Maps tool_call/tool_result events to specific cards using the card_type field.
 */
export function processBriefingEvent(event: AgentStreamEvent): void {
  const store = useBriefingStore.getState()

  switch (event.type) {
    case 'tool_call': {
      const toolName = event.data.name as string
      store.activateStep(toolName)
      break
    }

    case 'tool_result': {
      const toolName = event.data.name as string
      const cardType = event.data.card_type as BriefingCardType | undefined
      const result = event.data.result

      store.completeStep(toolName)

      if (cardType) {
        store.updateCard(cardType, {
          status: 'ready',
          data: { result },
        })
      }
      break
    }

    case 'action_proposal': {
      const cardType = event.data.card_type as BriefingCardType | undefined
      const actions = event.data.actions as ActionItem[]

      if (cardType) {
        store.updateCard(cardType, {
          status: 'action_pending',
          actions,
          actionStatus: 'pending',
        })
      }
      break
    }

    case 'text': {
      const content = event.data.content as string
      const cardType = event.data.card_type as BriefingCardType | undefined

      if (cardType === 'ai_insight') {
        store.appendInsightText(content)
        store.updateCard('ai_insight', { status: 'ready' })
      } else if (cardType) {
        // Text for a specific card (e.g., learning diary draft)
        store.updateCard(cardType, {
          status: 'ready',
          data: { text: content },
        })
      }
      // Non-card text is ignored in briefing mode (no chat panel)
      break
    }

    case 'done': {
      const conversationId = event.data.conversation_id as string | undefined
      if (conversationId) {
        store.setConversationId(conversationId)
      }
      store.completeStep('insight')
      store.setPhase('ready')
      break
    }

    case 'error': {
      store.setPhase('error')
      break
    }

    default:
      break
  }
}
