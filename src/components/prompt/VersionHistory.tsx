import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, GitCompare, Loader2, FlaskConical } from 'lucide-react'
import type { AIContextVersion } from '@/api/services/prompts'

interface VersionHistoryProps {
  versions: AIContextVersion[]
  currentVersionNumber: number | null
  isLoading: boolean
  onRollback: (versionNumber: number) => Promise<void>
  onShowDiff: (v1: AIContextVersion, v2: AIContextVersion) => void
  onCompare?: (versionNumber: number) => void
  lastSeenVersion?: number | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

export function VersionHistory({
  versions,
  currentVersionNumber,
  isLoading,
  onRollback,
  onShowDiff,
  onCompare,
  lastSeenVersion,
}: VersionHistoryProps) {
  const [rollingBack, setRollingBack] = useState<number | null>(null)

  const handleRollback = async (versionNumber: number) => {
    setRollingBack(versionNumber)
    try {
      await onRollback(versionNumber)
    } finally {
      setRollingBack(null)
    }
  }

  if (versions.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        バージョン履歴がありません
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">バージョン履歴</h3>
      <div className="space-y-2">
        {versions.map((version, idx) => {
          const isCurrent = version.version_number === currentVersionNumber
          const prevVersion = idx < versions.length - 1 ? versions[idx + 1] : null

          return (
            <div
              key={version.id}
              className="flex items-start gap-3 rounded-lg border p-3 text-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">v{version.version_number}</span>
                  {isCurrent && (
                    <Badge variant="secondary" className="text-[10px]">
                      current
                    </Badge>
                  )}
                  {lastSeenVersion != null && version.version_number > lastSeenVersion && (
                    <Badge className="h-4 bg-blue-500 px-1 text-[9px] text-white hover:bg-blue-600">
                      NEW
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(version.created_at)}
                  </span>
                </div>
                {version.changelog && (
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">
                    {version.changelog}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {prevVersion && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => onShowDiff(prevVersion, version)}
                    title="前のバージョンとのdiffを表示"
                  >
                    <GitCompare className="h-3.5 w-3.5" />
                  </Button>
                )}
                {!isCurrent && onCompare && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => onCompare(version.version_number)}
                    title="現行版と比較"
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                  </Button>
                )}
                {!isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => handleRollback(version.version_number)}
                    disabled={isLoading || rollingBack !== null}
                    title="このバージョンにロールバック"
                  >
                    {rollingBack === version.version_number ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
