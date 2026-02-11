import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Sparkles,
  Loader2,
  Trophy,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { useChallengeStore } from '@/stores/useChallengeStore'
import { ChatInput } from '@/components/agent/ChatInput'
import { ChallengeChatPanel } from './ChallengeChatPanel'
import type { ChallengeChatPanelHandle } from './ChallengeChatPanel'
import { ChallengePromptDiff } from './ChallengePromptDiff'
import { ChallengeResolvedCard, ChallengeResolveActions } from './ChallengeVoting'

const statusConfig = {
  active: { label: '比較中', className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  adopted_a: { label: 'vA採用', className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' },
  adopted_b: { label: 'vB採用', className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' },
  dismissed: { label: '棄却', className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30' },
} as const

export function ChallengeDetail() {
  const {
    selectedComparison: comp,
    currentRound,
    isLoading,
    isGenerating,
    initRound,
    vote,
    resolve,
  } = useChallengeStore()

  const [hasExchanged, setHasExchanged] = useState(false)
  const [bothDone, setBothDone] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const panelARef = useRef<ChallengeChatPanelHandle>(null)
  const panelBRef = useRef<ChallengeChatPanelHandle>(null)
  const streamEndCountRef = useRef(0)

  // Escape key to exit maximize
  useEffect(() => {
    if (!isMaximized) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMaximized(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMaximized])

  const handleSendToBoth = useCallback(
    (text: string) => {
      streamEndCountRef.current = 0
      setBothDone(false)
      panelARef.current?.sendMessage(text)
      panelBRef.current?.sendMessage(text)
      setHasExchanged(true)
    },
    [],
  )

  const handleStreamEnd = useCallback(() => {
    streamEndCountRef.current += 1
    if (streamEndCountRef.current >= 2) {
      setBothDone(true)
    }
  }, [])

  const handleStartRound = useCallback(async () => {
    setHasExchanged(false)
    await initRound()
  }, [initRound])

  const handleVote = useCallback(
    async (winner: 'A' | 'B' | 'tie') => {
      if (!currentRound) return
      await vote(currentRound.round_id, winner)
      setHasExchanged(false)
    },
    [currentRound, vote],
  )

  if (!comp) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">
            左のリストから比較を選択してください
          </p>
        </CardContent>
      </Card>
    )
  }

  const status = statusConfig[comp.status]
  const isResolved = comp.status !== 'active'
  const decidedRounds = comp.rounds.filter((r) => r.winner != null).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{comp.context_name}</h3>
          <p className="text-sm text-muted-foreground">
            {comp.situation} — v{comp.version_a} vs v{comp.version_b}
          </p>
        </div>
        <Badge variant="outline" className={status.className}>{status.label}</Badge>
      </div>

      {/* Prompt Diff Section */}
      <ChallengePromptDiff
        promptA={comp.version_a_prompt}
        promptB={comp.version_b_prompt}
        labelA={`v${comp.version_a}`}
        labelB={`v${comp.version_b}`}
      />

      {/* Section B: Multi-turn A/B Chat */}
      {!isResolved && (
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-3 text-sm font-medium">A/B 比較ラウンド</h4>

            {!currentRound ? (
              <div className="space-y-3">
                <Button
                  size="sm"
                  onClick={handleStartRound}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isGenerating ? '準備中...' : 'ラウンド開始'}
                </Button>

                {/* Past rounds summary */}
                {decidedRounds > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Trophy className="h-3.5 w-3.5" />
                      <span>{decidedRounds} ラウンド投票済み</span>
                    </div>
                    {comp.win_rate_b != null && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">v{comp.version_b} の勝率</span>
                          <span className="font-medium">{Math.round(comp.win_rate_b * 100)}%</span>
                        </div>
                        <Progress value={comp.win_rate_b * 100} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className={
                isMaximized
                  ? 'fixed inset-0 z-50 flex flex-col bg-background p-4'
                  : 'space-y-3'
              }>
                {/* Maximize/Minimize toggle */}
                {isMaximized && (
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">A/B 比較ラウンド</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setIsMaximized(false)}
                      title="元に戻す (Esc)"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {!isMaximized && (
                  <div className="flex justify-end -mt-1 mb-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setIsMaximized(true)}
                      title="最大化"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                {/* Two chat panels side by side */}
                <div
                  className={
                    isMaximized
                      ? 'grid gap-3 sm:grid-cols-2 flex-1 min-h-0'
                      : 'grid gap-3 sm:grid-cols-2'
                  }
                  style={isMaximized ? undefined : { height: 400 }}
                >
                  <ChallengeChatPanel
                    ref={panelARef}
                    label="A"
                    contextId={currentRound.context_id}
                    versionNumber={currentRound.version_a}
                    onStreamEnd={handleStreamEnd}
                  />
                  <ChallengeChatPanel
                    ref={panelBRef}
                    label="B"
                    contextId={currentRound.context_id}
                    versionNumber={currentRound.version_b}
                    onStreamEnd={handleStreamEnd}
                  />
                </div>

                {/* Shared input */}
                <div className={isMaximized ? 'mt-3' : ''}>
                  <ChatInput
                    onSend={handleSendToBoth}
                    placeholder="両方のパネルに同じメッセージを送信..."
                  />
                </div>

                {/* Guide + Vote buttons */}
                {hasExchanged && bothDone && (
                  <div className={`rounded-md border border-dashed border-muted-foreground/30 p-3 space-y-2 ${isMaximized ? 'mt-2' : ''}`}>
                    <p className="text-xs text-muted-foreground">
                      会話を続けるか、投票してラウンドを終了できます。
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVote('A')}
                        disabled={isLoading}
                      >
                        Aが良い
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVote('B')}
                        disabled={isLoading}
                      >
                        Bが良い
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote('tie')}
                        disabled={isLoading}
                      >
                        引き分け
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section C: Resolve Actions */}
      {isResolved ? (
        <ChallengeResolvedCard status={comp.status} resolvedAt={comp.resolved_at} />
      ) : decidedRounds > 0 && (
        <ChallengeResolveActions
          winRateB={comp.win_rate_b}
          versionA={comp.version_a}
          versionB={comp.version_b}
          isLoading={isLoading}
          onResolve={resolve}
        />
      )}
    </div>
  )
}
