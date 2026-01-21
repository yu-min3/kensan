import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useTaskStore } from '@/stores/useTaskStore'
import type { TimeEntry, GoalTag } from '@/types'

interface TimeEntryFormInput {
  taskName: string
  date: string
  startTime: string
  endTime: string
  projectId?: string
  goalTag?: GoalTag
  description?: string
}

interface TimeEntryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: TimeEntryFormInput) => Promise<void>
  initialData?: TimeEntry
  defaultDate?: string
}

const GOAL_TAGS: { value: GoalTag; label: string }[] = [
  { value: 'GK', label: 'GK (Golden Kubestronaut)' },
  { value: 'OSS', label: 'OSS' },
  { value: 'Output', label: 'Output' },
  { value: 'Other', label: 'Other' },
]

export function TimeEntryForm({
  open,
  onOpenChange,
  onSave,
  initialData,
  defaultDate,
}: TimeEntryFormProps) {
  const { projects } = useTaskStore()
  const isEditMode = !!initialData

  const [taskName, setTaskName] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [projectId, setProjectId] = useState<string | undefined>(undefined)
  const [goalTag, setGoalTag] = useState<GoalTag | ''>('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setTaskName(initialData.taskName)
        setDate(initialData.date)
        setStartTime(initialData.startTime)
        setEndTime(initialData.endTime)
        setProjectId(initialData.projectId)
        setGoalTag(initialData.goalTag || '')
        setDescription(initialData.description || '')
      } else {
        setTaskName('')
        setDate(defaultDate || new Date().toISOString().split('T')[0])
        setStartTime('09:00')
        setEndTime('10:00')
        setProjectId(undefined)
        setGoalTag('')
        setDescription('')
      }
    }
  }, [open, initialData, defaultDate])

  // Auto-fill goal tag when project is selected
  useEffect(() => {
    if (projectId) {
      const project = projects.find((p) => p.id === projectId)
      if (project?.goalTag) {
        setGoalTag(project.goalTag)
      }
    }
  }, [projectId, projects])

  const handleSubmit = async () => {
    if (!taskName || !date || !startTime || !endTime) return

    setIsSubmitting(true)
    try {
      await onSave({
        taskName,
        date,
        startTime,
        endTime,
        projectId: projectId || undefined,
        goalTag: goalTag || undefined,
        description: description || undefined,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save time entry:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeProjects = projects.filter((p) => !p.isArchived)

  // Calculate duration
  const calculateDuration = () => {
    if (!startTime || !endTime) return null
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const startMinutes = sh * 60 + sm
    const endMinutes = eh * 60 + em
    const durationMinutes = endMinutes - startMinutes
    if (durationMinutes <= 0) return null
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const duration = calculateDuration()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? '時間記録を編集' : '時間記録を追加'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Name */}
          <div>
            <Label htmlFor="taskName">タスク名 *</Label>
            <Input
              id="taskName"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="例: ICA試験勉強"
              className="mt-1"
            />
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="date">日付 *</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">開始時刻 *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="endTime">終了時刻 *</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Duration Display */}
          {duration && (
            <p className="text-sm text-muted-foreground">
              所要時間: {duration}
            </p>
          )}

          {/* Project Selector */}
          <div>
            <Label>プロジェクト</Label>
            <Select
              value={projectId || ''}
              onValueChange={(v) => setProjectId(v || undefined)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="プロジェクトを選択（任意）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">なし</SelectItem>
                {activeProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Goal Tag Selector */}
          <div>
            <Label>目標タグ</Label>
            <Select
              value={goalTag}
              onValueChange={(v) => setGoalTag(v as GoalTag | '')}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="タグを選択（任意）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">なし</SelectItem>
                {GOAL_TAGS.map((tag) => (
                  <SelectItem key={tag.value} value={tag.value}>
                    {tag.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">説明（任意）</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="作業内容の詳細..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!taskName || !date || !startTime || !endTime || isSubmitting}
          >
            {isSubmitting ? '保存中...' : isEditMode ? '更新' : '追加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
