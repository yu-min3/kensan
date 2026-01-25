import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { Target, Check, Pencil, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TodayFocusCard() {
  const { todayFocus, setTodayFocus, completeTodayFocus, clearTodayFocus } = useDashboardStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleStartEdit = () => {
    setEditValue(todayFocus?.text ?? '')
    setIsEditing(true)
  }

  const handleSave = () => {
    if (editValue.trim()) {
      setTodayFocus(editValue.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue('')
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  const isCompleted = !!todayFocus?.completedAt

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 text-primary shrink-0" />
          <span className="text-sm font-medium text-muted-foreground">今日のフォーカス</span>
        </div>

        <div className="mt-3">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="今日達成したいこと..."
                className="flex-1"
              />
              <Button size="sm" variant="ghost" onClick={handleSave}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : todayFocus?.text ? (
            <div className="flex items-start gap-3 group">
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-lg font-semibold',
                    isCompleted && 'line-through text-muted-foreground'
                  )}
                >
                  {todayFocus.text}
                </p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {!isCompleted && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={completeTodayFocus}
                    title="完了"
                    className="text-green-600 hover:text-green-700"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleStartEdit}
                  title="編集"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearTodayFocus}
                  title="クリア"
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleStartEdit}
              className="w-full text-left text-muted-foreground hover:text-foreground py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
            >
              クリックしてフォーカスを設定...
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
