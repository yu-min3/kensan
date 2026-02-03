import type { BriefingCard as BriefingCardData } from '@/types/briefing'

interface BriefingCardGridProps {
  cards: BriefingCardData[]
  renderCard: (card: BriefingCardData) => React.ReactNode
}

export function BriefingCardGrid({ cards, renderCard }: BriefingCardGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {cards.map((card) => (
        <div
          key={card.type}
          className={card.fullWidth ? 'col-span-full' : undefined}
        >
          {renderCard(card)}
        </div>
      ))}
    </div>
  )
}
