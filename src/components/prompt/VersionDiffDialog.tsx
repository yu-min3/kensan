import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { AIContextVersion } from '@/api/services/prompts'

interface VersionDiffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  oldVersion: AIContextVersion | null
  newVersion: AIContextVersion | null
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
}

function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')

  // Simple LCS-based diff
  const m = oldLines.length
  const n = newLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to build diff
  const diffs: DiffLine[] = []
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diffs.push({ type: 'unchanged', content: oldLines[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diffs.push({ type: 'added', content: newLines[j - 1] })
      j--
    } else {
      diffs.push({ type: 'removed', content: oldLines[i - 1] })
      i--
    }
  }

  return diffs.reverse()
}

export function VersionDiffDialog({
  open,
  onOpenChange,
  oldVersion,
  newVersion,
}: VersionDiffDialogProps) {
  if (!oldVersion || !newVersion) return null

  const diffLines = computeLineDiff(oldVersion.system_prompt, newVersion.system_prompt)

  const paramChanges: string[] = []
  if (oldVersion.max_turns !== newVersion.max_turns) {
    paramChanges.push(`max_turns: ${oldVersion.max_turns} → ${newVersion.max_turns}`)
  }
  if (oldVersion.temperature !== newVersion.temperature) {
    paramChanges.push(`temperature: ${oldVersion.temperature} → ${newVersion.temperature}`)
  }
  if (JSON.stringify(oldVersion.allowed_tools) !== JSON.stringify(newVersion.allowed_tools)) {
    paramChanges.push('allowed_tools が変更されました')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            v{oldVersion.version_number} → v{newVersion.version_number} の差分
          </DialogTitle>
          <DialogDescription>
            システムプロンプトの変更箇所
          </DialogDescription>
        </DialogHeader>

        {paramChanges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {paramChanges.map((change, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {change}
              </Badge>
            ))}
          </div>
        )}

        <ScrollArea className="h-[50vh]">
          <pre className="text-xs leading-relaxed">
            {diffLines.map((line, i) => (
              <div
                key={i}
                className={
                  line.type === 'added'
                    ? 'bg-green-500/15 text-green-700 dark:text-green-400'
                    : line.type === 'removed'
                      ? 'bg-red-500/15 text-red-700 dark:text-red-400'
                      : 'text-foreground'
                }
              >
                <span className="inline-block w-5 select-none text-right text-muted-foreground/50">
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                {' '}{line.content}
              </div>
            ))}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
