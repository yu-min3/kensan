import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useMemoStore } from '@/stores/useMemoStore'
import { Lightbulb, X, Send, Loader2, Archive, Trash2, Plus, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { formatTime } from '@/lib/dateFormat'

type ViewMode = 'input' | 'list'

export function FloatingMemoButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { addMemo, fetchMemos, archiveMemo, deleteMemo, getActiveMemos } = useMemoStore()

  // パネルを開いたときにメモを取得
  useEffect(() => {
    if (isOpen) {
      fetchMemos()
    }
  }, [isOpen, fetchMemos])

  // 入力モードのときにテキストエリアにフォーカス
  useEffect(() => {
    if (isOpen && viewMode === 'input' && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen, viewMode])

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    const result = await addMemo(content.trim())
    setIsSubmitting(false)

    if (result) {
      toast.success('メモを保存しました', { duration: 2000 })
      setContent('')
      setViewMode('list') // 保存後はリスト表示に戻る
    } else {
      toast.error('メモの保存に失敗しました', { duration: 4000 })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      if (viewMode === 'input' && content.trim()) {
        // 入力中なら入力をキャンセルしてリスト表示に戻る
        setContent('')
        setViewMode('list')
      } else {
        setIsOpen(false)
      }
    }
  }

  const handleArchive = async (id: string) => {
    await archiveMemo(id)
    toast.success('アーカイブしました', { duration: 2000 })
  }

  const handleDelete = async (id: string) => {
    await deleteMemo(id)
    toast.success('削除しました', { duration: 2000 })
  }

  const activeMemos = getActiveMemos()

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Floating Panel */}
      <div
        className={cn(
          'fixed bottom-20 right-6 z-50 transition-all duration-200 ease-out',
          isOpen
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        <div className="bg-background border rounded-lg shadow-lg w-96 max-h-[70vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              メモ
            </div>
            <div className="flex items-center gap-1">
              {/* View Mode Toggle */}
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('list')}
                title="一覧"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'input' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('input')}
                title="新規追加"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 ml-1"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {viewMode === 'input' ? (
              /* Input Mode */
              <div className="p-3">
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="思いついたことをメモ..."
                  className="min-h-[100px] resize-none"
                />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">
                    Ctrl+Enter で保存
                  </span>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={!content.trim() || isSubmitting}
                    className="gap-1"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    保存
                  </Button>
                </div>
              </div>
            ) : (
              /* List Mode */
              <div className="overflow-y-auto max-h-[50vh]">
                {activeMemos.length === 0 ? (
                  <div className="p-6 text-center">
                    <Lightbulb className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      メモがありません
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setViewMode('input')}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      メモを追加
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {activeMemos.map((memo) => (
                      <div
                        key={memo.id}
                        className="p-3 hover:bg-muted/50 transition-colors group"
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {memo.content}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(memo.createdAt)}
                          </span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleArchive(memo.id)}
                              title="アーカイブ"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(memo.id)}
                              title="削除"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg',
          'transition-all duration-200',
          isOpen && 'rotate-45'
        )}
        size="icon"
      >
        <Lightbulb className={cn('h-6 w-6', isOpen && 'hidden')} />
        <X className={cn('h-6 w-6', !isOpen && 'hidden')} />
      </Button>
    </>
  )
}
