import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useMemoStore } from '@/stores/useMemoStore'
import { Lightbulb, X, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FloatingMemoButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { addMemo } = useMemoStore()

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    const result = await addMemo(content.trim())
    setIsSubmitting(false)

    if (result) {
      setContent('')
      setIsOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter or Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
    // Escape to close
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Floating Input Panel */}
      <div
        className={cn(
          'fixed bottom-20 right-6 z-50 transition-all duration-200 ease-out',
          isOpen
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        <div className="bg-background border rounded-lg shadow-lg p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-slate-500" />
              クイックメモ
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="思いついたことをメモ..."
            className="min-h-[80px] resize-none"
          />

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">
              Ctrl+Enter で送信
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
