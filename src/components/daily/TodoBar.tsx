import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useTodos } from '@/hooks/useTodos'
import { cn } from '@/lib/utils'
import {
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { TodoFrequency, TodoWithStatus } from '@/types'

interface TodoBarProps {
  date: string // YYYY-MM-DD
  className?: string
}

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土']

export function TodoBar({ date, className }: TodoBarProps) {
  const { todos, isLoading, addTodo, toggleComplete, refresh } = useTodos({
    date,
    enabled: true,
  })

  const [isExpanded, setIsExpanded] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newTodoName, setNewTodoName] = useState('')
  const [newTodoFrequency, setNewTodoFrequency] = useState<TodoFrequency | ''>('')
  const [newTodoDaysOfWeek, setNewTodoDaysOfWeek] = useState<number[]>([])
  const [newTodoDueDate, setNewTodoDueDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const completedCount = todos.filter((t) => t.completedToday).length
  const totalCount = todos.length

  const handleAddTodo = async () => {
    if (!newTodoName.trim()) return

    setIsSubmitting(true)
    try {
      await addTodo({
        name: newTodoName.trim(),
        frequency: newTodoFrequency || undefined,
        daysOfWeek: newTodoFrequency && newTodoDaysOfWeek.length > 0 ? newTodoDaysOfWeek : undefined,
        dueDate: !newTodoFrequency && newTodoDueDate ? newTodoDueDate : undefined,
      })
      setNewTodoName('')
      setNewTodoFrequency('')
      setNewTodoDaysOfWeek([])
      setNewTodoDueDate('')
      setIsDialogOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleDayOfWeek = (day: number) => {
    setNewTodoDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  // 表示するTodo（コンパクト時は最初の5件、展開時は全件）
  const displayTodos = isExpanded ? todos : todos.slice(0, 6)
  const hasMore = todos.length > 6

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* コンパクトバー */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-sm font-medium shrink-0">今日のタスク</span>
        <span className="text-xs text-muted-foreground shrink-0">
          {completedCount}/{totalCount}
        </span>

        {/* Todo一覧（横並び） */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto min-w-0">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            displayTodos.map((todo) => (
              <TodoChip
                key={todo.id}
                todo={todo}
                onToggle={() => toggleComplete(todo.id)}
              />
            ))
          )}
          {!isExpanded && hasMore && (
            <span className="text-xs text-muted-foreground shrink-0">
              +{todos.length - 6}
            </span>
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={refresh}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* 展開時：残りを表示 */}
      {isExpanded && hasMore && (
        <div className="px-3 pb-2 flex flex-wrap gap-1 border-t pt-2">
          {todos.slice(6).map((todo) => (
            <TodoChip
              key={todo.id}
              todo={todo}
              onToggle={() => toggleComplete(todo.id)}
            />
          ))}
        </div>
      )}

      {/* Add Todo Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新しいタスクを追加</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="todoName">タスク名</Label>
              <Input
                id="todoName"
                value={newTodoName}
                onChange={(e) => setNewTodoName(e.target.value)}
                placeholder="例: 書類提出"
                className="mt-1"
              />
            </div>

            <div>
              <Label>繰り返し設定（任意）</Label>
              <Select
                value={newTodoFrequency}
                onValueChange={(v) => setNewTodoFrequency(v as TodoFrequency | '')}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="繰り返しなし（単発）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">繰り返しなし（単発）</SelectItem>
                  <SelectItem value="daily">毎日</SelectItem>
                  <SelectItem value="weekly">週次（曜日指定）</SelectItem>
                  <SelectItem value="custom">カスタム（曜日指定）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(newTodoFrequency === 'weekly' || newTodoFrequency === 'custom') && (
              <div>
                <Label>曜日</Label>
                <div className="flex gap-1 mt-1">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <Button
                      key={index}
                      type="button"
                      variant={newTodoDaysOfWeek.includes(index) ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => handleToggleDayOfWeek(index)}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {!newTodoFrequency && (
              <div>
                <Label htmlFor="dueDate">期日（任意）</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newTodoDueDate}
                  onChange={(e) => setNewTodoDueDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleAddTodo} disabled={!newTodoName.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface TodoChipProps {
  todo: TodoWithStatus
  onToggle: () => void
}

function TodoChip({ todo, onToggle }: TodoChipProps) {
  const isOverdue = todo.isOverdue && !todo.completedToday

  return (
    <button
      onClick={onToggle}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs whitespace-nowrap transition-colors',
        'hover:bg-muted',
        todo.completedToday
          ? 'bg-primary/10 text-muted-foreground'
          : isOverdue
            ? 'bg-destructive/10 text-destructive'
            : 'bg-muted/50'
      )}
    >
      {todo.completedToday ? (
        <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
      ) : (
        <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
      )}
      <span className={cn(todo.completedToday && 'line-through')}>
        {todo.name.length > 12 ? todo.name.slice(0, 12) + '...' : todo.name}
      </span>
    </button>
  )
}
