import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { Pin, Plus, Trash2, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatDeadline(deadline: string): string {
  const date = new Date(deadline)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(deadline)
  target.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return '期限切れ'
  if (diffDays === 0) return '今日'
  if (diffDays === 1) return '明日'
  if (diffDays <= 7) return `${diffDays}日後`

  return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}

function isOverdue(deadline: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(deadline)
  target.setHours(0, 0, 0, 0)
  return target < today
}

export function PinnedRemindersCard() {
  const {
    pinnedReminders,
    addPinnedReminder,
    togglePinnedReminder,
    deletePinnedReminder,
  } = useDashboardStore()

  const [isAdding, setIsAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  const handleAdd = () => {
    if (newText.trim()) {
      addPinnedReminder(newText.trim())
      setNewText('')
      setIsAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd()
    } else if (e.key === 'Escape') {
      setNewText('')
      setIsAdding(false)
    }
  }

  const sortedReminders = [...pinnedReminders].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Pin className="h-4 w-4 text-amber-500" />
            ピン留め
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7 w-7 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isAdding && (
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!newText.trim()) {
                  setIsAdding(false)
                }
              }}
              placeholder="リマインダーを追加..."
              className="h-8 text-sm"
            />
          </div>
        )}

        {sortedReminders.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            リマインダーはありません
          </p>
        ) : (
          <div className="space-y-1">
            {sortedReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="flex items-start gap-2 group py-1 px-1 rounded hover:bg-muted/50"
              >
                <Checkbox
                  checked={reminder.completed}
                  onCheckedChange={() => togglePinnedReminder(reminder.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm',
                      reminder.completed && 'line-through text-muted-foreground'
                    )}
                  >
                    {reminder.text}
                  </p>
                  {reminder.deadline && (
                    <div
                      className={cn(
                        'flex items-center gap-1 text-xs mt-0.5',
                        isOverdue(reminder.deadline) && !reminder.completed
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      )}
                    >
                      <Calendar className="h-3 w-3" />
                      {formatDeadline(reminder.deadline)}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive shrink-0"
                  onClick={() => deletePinnedReminder(reminder.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
