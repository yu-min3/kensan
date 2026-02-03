import { useEffect, useRef, useCallback } from 'react'
import { streamAgentChat } from '@/api/services/agent'
import type { AgentStreamEvent } from '@/api/services/agent'
import { processBriefingEvent } from '@/lib/briefingEventProcessor'
import { useBriefingStore } from '@/stores/useBriefingStore'
import { BriefingHeader } from './BriefingHeader'
import { BriefingStatusBar } from './BriefingStatusBar'
import { BriefingCardGrid } from './BriefingCardGrid'
import { BriefingFollowUp } from './BriefingFollowUp'
import type { BriefingMode, BriefingCard as BriefingCardData } from '@/types/briefing'

interface BriefingLayoutProps {
  mode: BriefingMode
  renderCard: (card: BriefingCardData) => React.ReactNode
}

export function BriefingLayout({ mode, renderCard }: BriefingLayoutProps) {
  const { phase, steps, cards, startBriefing, reset } = useBriefingStore()
  const abortRef = useRef<AbortController | null>(null)
  const startedRef = useRef(false)

  const startStream = useCallback(async () => {
    const controller = new AbortController()
    abortRef.current = controller

    const situation = mode === 'morning' ? 'briefing' : 'evening'
    const message =
      mode === 'morning'
        ? '今日のブリーフィングをお願いします'
        : '今日の振り返りをお願いします'

    try {
      for await (const event of streamAgentChat(
        { message, situation },
        controller.signal,
      )) {
        processBriefingEvent(event as AgentStreamEvent)
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        useBriefingStore.getState().setPhase('error')
      }
    }
  }, [mode])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    startBriefing(mode)
    startStream()

    return () => {
      abortRef.current?.abort()
      reset()
      startedRef.current = false
    }
  }, [mode, startBriefing, startStream, reset])

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <BriefingHeader mode={mode} phase={phase} />
      <BriefingStatusBar steps={steps} />
      <BriefingCardGrid cards={cards} renderCard={renderCard} />
      {phase === 'ready' && <BriefingFollowUp mode={mode} />}
    </div>
  )
}
