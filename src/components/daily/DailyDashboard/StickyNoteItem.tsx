import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDashboardStore } from '@/stores/useDashboardStore'
import type { StickyNote, StickyNoteColor } from '@/types'
import { Trash2, Palette, GripVertical, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const STICKY_NOTE_COLORS: Record<StickyNoteColor, { bg: string; border: string }> = {
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-200 dark:border-yellow-800' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-200 dark:border-pink-800' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800' },
  green: { bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-800' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-200 dark:border-orange-800' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-800' },
}

const COLOR_OPTIONS: { value: StickyNoteColor; label: string; dot: string }[] = [
  { value: 'yellow', label: '黄色', dot: 'bg-yellow-400' },
  { value: 'pink', label: 'ピンク', dot: 'bg-pink-400' },
  { value: 'blue', label: '青', dot: 'bg-blue-400' },
  { value: 'green', label: '緑', dot: 'bg-green-400' },
  { value: 'orange', label: 'オレンジ', dot: 'bg-orange-400' },
  { value: 'purple', label: '紫', dot: 'bg-purple-400' },
]

interface StickyNoteItemProps {
  note: StickyNote
}

export function StickyNoteItem({ note }: StickyNoteItemProps) {
  const { updateStickyNote, deleteStickyNote } = useDashboardStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `sticky-${note.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleStartEdit = () => {
    setEditValue(note.content)
    setIsEditing(true)
  }

  const handleSave = () => {
    if (editValue.trim()) {
      updateStickyNote(note.id, { content: editValue.trim() })
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue('')
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel()
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave()
    }
  }

  const colorStyle = STICKY_NOTE_COLORS[note.color]

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border p-3 shadow-sm group relative',
        colorStyle.bg,
        colorStyle.border,
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      {/* ドラッグハンドル */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* アクションボタン */}
      <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Palette className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {COLOR_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => updateStickyNote(note.id, { color: option.value })}
              >
                <span className={cn('w-3 h-3 rounded-full mr-2', option.dot)} />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          onClick={() => deleteStickyNote(note.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* コンテンツ */}
      {isEditing ? (
        <div className="pt-4">
          <Textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="min-h-[60px] text-sm resize-none bg-transparent border-none focus-visible:ring-0 p-0"
            placeholder="メモを入力..."
          />
          <div className="flex justify-end gap-1 mt-2">
            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={handleSave}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={handleCancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleStartEdit}
          className="pt-4 min-h-[60px] text-sm whitespace-pre-wrap cursor-text"
        >
          {note.content || <span className="text-muted-foreground">クリックして編集...</span>}
        </div>
      )}
    </div>
  )
}
