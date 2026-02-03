import { BriefingLayout } from '@/components/briefing/BriefingLayout'
import { BriefingCard } from '@/components/briefing/BriefingCard'
import { ActualVsPlannedCard } from '@/components/briefing/cards/ActualVsPlannedCard'
import { CompletedTasksCard } from '@/components/briefing/cards/CompletedTasksCard'
import { AiInsightCard } from '@/components/briefing/cards/AiInsightCard'
import { TomorrowFocusCard } from '@/components/briefing/cards/TomorrowFocusCard'
import { TimeblockProposalCard } from '@/components/briefing/cards/TimeblockProposalCard'
import type { BriefingCard as BriefingCardData } from '@/types/briefing'

function renderEveningCard(card: BriefingCardData) {
  switch (card.type) {
    case 'actual_vs_planned':
      return <ActualVsPlannedCard card={card} />
    case 'completed_tasks':
      return <CompletedTasksCard card={card} />
    case 'ai_insight':
      return <AiInsightCard card={card} mode="evening" />
    case 'tomorrow_focus':
      return <TomorrowFocusCard card={card} />
    case 'timeblock_proposal':
      return <TimeblockProposalCard card={card} />
    default:
      return (
        <BriefingCard card={card}>
          <p className="text-sm text-muted-foreground">不明なカードタイプ</p>
        </BriefingCard>
      )
  }
}

export function B02Reflection() {
  return <BriefingLayout mode="evening" renderCard={renderEveningCard} />
}
