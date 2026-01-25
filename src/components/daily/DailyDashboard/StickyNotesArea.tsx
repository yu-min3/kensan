import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { StickyNoteItem } from './StickyNoteItem'
import { StickyNote, Plus } from 'lucide-react'

export function StickyNotesArea() {
  const { stickyNotes, addStickyNote, reorderStickyNotes } = useDashboardStore()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const sortedNotes = [...stickyNotes].sort((a, b) => a.sortOrder - b.sortOrder)
  const sortableIds = sortedNotes.map((n) => `sticky-${n.id}`)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortableIds.indexOf(active.id as string)
      const newIndex = sortableIds.indexOf(over.id as string)

      const newOrder = arrayMove(sortedNotes, oldIndex, newIndex).map((n) => n.id)
      reorderStickyNotes(newOrder)
    }
  }

  const handleAddNote = () => {
    addStickyNote('', 'yellow')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-amber-500" />
            付箋
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddNote}
            className="h-7 w-7 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            付箋はありません
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 gap-3">
                {sortedNotes.map((note) => (
                  <StickyNoteItem key={note.id} note={note} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  )
}
