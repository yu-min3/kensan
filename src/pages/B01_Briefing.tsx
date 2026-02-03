import { BriefingLayout } from '@/components/briefing/BriefingLayout'
import { BriefingCard } from '@/components/briefing/BriefingCard'
import { YesterdaySummaryCard } from '@/components/briefing/cards/YesterdaySummaryCard'
import { TodayFocusCard } from '@/components/briefing/cards/TodayFocusCard'
import { TimeblockProposalCard } from '@/components/briefing/cards/TimeblockProposalCard'
import { CarryoverTasksCard } from '@/components/briefing/cards/CarryoverTasksCard'
import { AiInsightCard } from '@/components/briefing/cards/AiInsightCard'
import type { BriefingCard as BriefingCardData } from '@/types/briefing'

function renderMorningCard(card: BriefingCardData) {
  switch (card.type) {
    case 'yesterday_summary':
      return <YesterdaySummaryCard card={card} />
    case 'today_focus':
      return <TodayFocusCard card={card} />
    case 'timeblock_proposal':
      return <TimeblockProposalCard card={card} />
    case 'carryover_tasks':
      return <CarryoverTasksCard card={card} />
    case 'ai_insight':
      return <AiInsightCard card={card} mode="morning" />
    default:
      return (
        <BriefingCard card={card}>
          <p className="text-sm text-muted-foreground">不明なカードタイプ</p>
        </BriefingCard>
      )
  }
}

export function B01Briefing() {
  return <BriefingLayout mode="morning" renderCard={renderMorningCard} />
}
