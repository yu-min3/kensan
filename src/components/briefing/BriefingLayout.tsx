import { useEffect, useRef, useCallback } from 'react'
import { streamAgentChat } from '@/api/services/agent'
import type { AgentStreamEvent } from '@/api/services/agent'
import { processBriefingEvent } from '@/lib/briefingEventProcessor'
import { useBriefingStore } from '@/stores/useBriefingStore'
import { useBriefingData, buildBriefingContext } from '@/hooks/useBriefingData'
import { BriefingHeader } from './BriefingHeader'
import { BriefingFollowUp } from './BriefingFollowUp'
import { Loader2 } from 'lucide-react'
import type { BriefingMode } from '@/types/briefing'

interface BriefingLayoutProps {
  mode: BriefingMode
  renderCards: (data: ReturnType<typeof useBriefingData>) => React.ReactNode
}

export function BriefingLayout({ mode, renderCards }: BriefingLayoutProps) {
  const { phase, startBriefing, reset } = useBriefingStore()
  const abortRef = useRef<AbortController | null>(null)
  const startedRef = useRef(false)
  const briefingData = useBriefingData(mode)

  const startStream = useCallback(
    async (context: Record<string, string>) => {
      const controller = new AbortController()
      abortRef.current = controller

      const situation = mode === 'morning' ? 'briefing' : 'evening'
      const message =
        mode === 'morning'
          ? '今日のブリーフィングをお願いします'
          : '今日の振り返りをお願いします'

      try {
        for await (const event of streamAgentChat(
          { message, situation, context },
          controller.signal,
        )) {
          processBriefingEvent(event as AgentStreamEvent)
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('[Briefing] Stream error:', err)
          useBriefingStore.getState().setPhase('error')
        }
      }
    },
    [mode],
  )

  // Start AI stream once data is loaded
  useEffect(() => {
    if (briefingData.isLoading || startedRef.current) return
    startedRef.current = true

    startBriefing(mode)
    const context = buildBriefingContext(mode, briefingData)
    startStream(context)

    return () => {
      abortRef.current?.abort()
      reset()
      startedRef.current = false
    }
  }, [briefingData.isLoading, mode, startBriefing, startStream, reset, briefingData])

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <BriefingHeader mode={mode} phase={briefingData.isLoading ? 'loading' : phase} />

      {briefingData.isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>データを取得中...</span>
        </div>
      ) : (
        <>
          {renderCards(briefingData)}
          {phase === 'ready' && <BriefingFollowUp mode={mode} />}
        </>
      )}
    </div>
  )
}
