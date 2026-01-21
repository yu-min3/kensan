import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TagBadge } from '@/components/common/TagBadge'
import { TimeEntryForm } from '@/components/common/TimeEntryForm'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { useTaskStore } from '@/stores/useTaskStore'
import type { TimeEntry, GoalTag } from '@/types'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Clock, Plus, Pencil, Trash2 } from 'lucide-react'

interface TimeEntryListProps {
  entries: TimeEntry[]
  title?: string
  showAddButton?: boolean
  defaultDate?: string
  groupByDate?: boolean
}

export function TimeEntryList({
  entries,
  title = '時間記録',
  showAddButton = true,
  defaultDate,
  groupByDate = false,
}: TimeEntryListProps) {
  const { addTimeEntry, updateTimeEntry, deleteTimeEntry } = useTimeBlockStore()
  const { projects } = useTaskStore()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)

  // Calculate duration in minutes
  const calculateDuration = (startTime: string, endTime: string): number => {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    return (eh * 60 + em) - (sh * 60 + sm)
  }

  // Format duration as readable string
  const formatDuration = (minutes: number): string => {
    const h = Math.floor(Math.abs(minutes) / 60)
    const m = Math.abs(minutes) % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  // Group entries by date if needed
  const groupedEntries = groupByDate
    ? entries.reduce(
        (acc, entry) => {
          const dateKey = entry.date
          if (!acc[dateKey]) {
            acc[dateKey] = []
          }
          acc[dateKey].push(entry)
          return acc
        },
        {} as Record<string, TimeEntry[]>
      )
    : { '': entries }

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedEntries).sort((a, b) =>
    b.localeCompare(a)
  )

  const handleCreate = async (data: {
    taskName: string
    date: string
    startTime: string
    endTime: string
    projectId?: string
    goalTag?: GoalTag
    description?: string
  }) => {
    const project = data.projectId
      ? projects.find((p) => p.id === data.projectId)
      : undefined

    await addTimeEntry({
      taskName: data.taskName,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      projectId: data.projectId,
      projectName: project?.name,
      goalTag: data.goalTag,
      description: data.description,
    })
  }

  const handleUpdate = async (data: {
    taskName: string
    date: string
    startTime: string
    endTime: string
    projectId?: string
    goalTag?: GoalTag
    description?: string
  }) => {
    if (!editingEntry) return

    const project = data.projectId
      ? projects.find((p) => p.id === data.projectId)
      : undefined

    await updateTimeEntry(editingEntry.id, {
      taskName: data.taskName,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      projectId: data.projectId,
      projectName: project?.name,
      goalTag: data.goalTag,
      description: data.description,
    })
    setEditingEntry(null)
  }

  const handleDelete = async (entry: TimeEntry) => {
    if (window.confirm(`「${entry.taskName}」を削除しますか？`)) {
      await deleteTimeEntry(entry.id)
    }
  }

  const openCreateForm = () => {
    setEditingEntry(null)
    setIsFormOpen(true)
  }

  const openEditForm = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setIsFormOpen(true)
  }

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open)
    if (!open) {
      setEditingEntry(null)
    }
  }

  const renderEntryItem = (entry: TimeEntry) => {
    const duration = calculateDuration(entry.startTime, entry.endTime)

    return (
      <div
        key={entry.id}
        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group"
      >
        {/* Time Range */}
        <div className="text-sm text-muted-foreground whitespace-nowrap w-28">
          {entry.startTime} - {entry.endTime}
        </div>

        {/* Task Name and Project */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{entry.taskName}</p>
          {entry.projectName && (
            <p className="text-xs text-muted-foreground truncate">
              {entry.projectName}
            </p>
          )}
        </div>

        {/* Goal Tag */}
        {entry.goalTag && <TagBadge tag={entry.goalTag} size="sm" />}

        {/* Duration */}
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {formatDuration(duration)}
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => openEditForm(entry)}
            title="編集"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => handleDelete(entry)}
            title="削除"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {title}
          </CardTitle>
          {showAddButton && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={openCreateForm}
            >
              <Plus className="h-4 w-4" />
              手動追加
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              時間記録がありません
            </p>
          ) : (
            <div className="space-y-4">
              {sortedDates.map((dateKey) => {
                const dateEntries = groupedEntries[dateKey]
                // Sort entries by start time
                const sortedEntries = [...dateEntries].sort((a, b) =>
                  a.startTime.localeCompare(b.startTime)
                )

                return (
                  <div key={dateKey || 'default'}>
                    {groupByDate && dateKey && (
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        {format(parseISO(dateKey), 'M月d日（E）', { locale: ja })}
                      </h4>
                    )}
                    <div className="space-y-2">
                      {sortedEntries.map(renderEntryItem)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Form Dialog */}
      <TimeEntryForm
        open={isFormOpen}
        onOpenChange={handleFormClose}
        onSave={editingEntry ? handleUpdate : handleCreate}
        initialData={editingEntry || undefined}
        defaultDate={defaultDate}
      />
    </>
  )
}
