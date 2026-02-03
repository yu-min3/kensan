import { Sun, Moon } from 'lucide-react'
import type { BriefingMode, BriefingPhase } from '@/types/briefing'
import { useSettingsStore } from '@/stores/useSettingsStore'

interface BriefingHeaderProps {
  mode: BriefingMode
  phase: BriefingPhase
}

function getGreeting(mode: BriefingMode, userName: string): string {
  if (mode === 'morning') {
    return `おはようございます、${userName}さん`
  }
  return `お疲れさまでした、${userName}さん`
}

function getSubtext(mode: BriefingMode, phase: BriefingPhase): string {
  if (phase === 'loading') {
    return mode === 'morning'
      ? 'データを収集して今日の計画を準備しています...'
      : '今日のデータを分析しています...'
  }
  if (phase === 'error') {
    return 'データの取得中にエラーが発生しました'
  }
  return mode === 'morning'
    ? '今日のブリーフィングです'
    : '今日の振り返りです'
}

export function BriefingHeader({ mode, phase }: BriefingHeaderProps) {
  const userName = useSettingsStore((s) => s.userName)
  const today = new Date()
  const dateStr = today.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  const Icon = mode === 'morning' ? Sun : Moon

  return (
    <div className="flex items-start gap-4">
      <div className="rounded-full bg-brand/10 p-3">
        <Icon className="h-6 w-6 text-brand" />
      </div>
      <div className="flex-1">
        <h1 className="text-xl font-semibold">
          {getGreeting(mode, userName || 'Yu')}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{dateStr}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {getSubtext(mode, phase)}
        </p>
      </div>
    </div>
  )
}
