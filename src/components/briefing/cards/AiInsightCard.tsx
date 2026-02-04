import { useState } from 'react'
import type { BriefingMode } from '@/types/briefing'
import { useBriefingStore } from '@/stores/useBriefingStore'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Save, ExternalLink, Sparkles, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface AiInsightCardProps {
  mode: BriefingMode
}

export function AiInsightCard({ mode }: AiInsightCardProps) {
  const insightText = useBriefingStore((s) => s.insightText)
  const phase = useBriefingStore((s) => s.phase)
  const [diaryDraft, setDiaryDraft] = useState('')
  const [saved, setSaved] = useState(false)
  const navigate = useNavigate()

  const isEvening = mode === 'evening'

  // Parse insight: first section is insight, second (after ---) is diary draft
  const parts = insightText.split('\n---\n')
  const insightSection = parts[0] ?? ''
  const diarySection = parts[1] ?? ''

  const effectiveDraft = diaryDraft || diarySection

  const handleSaveDiary = () => {
    setSaved(true)
  }

  const handleOpenEditor = () => {
    const params = new URLSearchParams({
      type: 'learning',
      prefill: effectiveDraft,
    })
    navigate(`/notes/new?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* AI Insight section */}
      {insightSection ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            インサイト
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {insightSection}
          </div>
        </div>
      ) : phase === 'loading' ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>AI分析中...</span>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">インサイトはありません</p>
      )}

      {/* Learning diary section (evening only) */}
      {isEvening && diarySection && (
        <div className="space-y-3 border-t pt-4">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            今日の学習日記（下書き）
          </div>
          <Textarea
            value={effectiveDraft}
            onChange={(e) => setDiaryDraft(e.target.value)}
            className="min-h-[120px] text-sm"
            placeholder="AIが生成した学習日記の下書き..."
          />
          <div className="flex items-center gap-2">
            {saved ? (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Save className="h-3.5 w-3.5" />
                保存しました
              </span>
            ) : (
              <Button size="sm" onClick={handleSaveDiary}>
                <Save className="h-3.5 w-3.5 mr-1" />
                学習日記として保存
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleOpenEditor}>
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              ノートエディタで開く
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
