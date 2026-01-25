import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useMemoStore } from '@/stores/useMemoStore'
import { formatTime } from '@/lib/dateFormat'
import { Lightbulb, Archive, Trash2 } from 'lucide-react'

export function MemoSection() {
  const { fetchMemos, archiveMemo, deleteMemo, getActiveMemos } = useMemoStore()

  useEffect(() => {
    fetchMemos()
  }, [fetchMemos])

  const activeMemos = getActiveMemos()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-slate-500" />
          今日のメモ
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeMemos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            メモがありません。右下のボタンからメモを追加できます。
          </p>
        ) : (
          <div className="space-y-2">
            {activeMemos.map((memo) => (
              <div
                key={memo.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm whitespace-pre-wrap break-words">{memo.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTime(memo.createdAt)}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => archiveMemo(memo.id)}
                    title="アーカイブ"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => deleteMemo(memo.id)}
                    title="削除"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
