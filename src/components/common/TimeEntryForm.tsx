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
import { TimeRangeInput } from '@/components/ui/time-range-input'
import { useTaskStore } from '@/stores/useTaskStore'
import type { TimeEntry } from '@/types'

interface TimeEntryFormInput {
  taskName: string
  date: string
  startTime: string
  endTime: string
  milestoneId?: string
  goalId?: string
  goalName?: string
  goalColor?: string
  description?: string
}

interface TimeEntryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: TimeEntryFormInput) => Promise<void>
  initialData?: TimeEntry
  defaultDate?: string
}

export function TimeEntryForm({
  open,
  onOpenChange,
  onSave,
  initialData,
  defaultDate,
}: TimeEntryFormProps) {
  const { goals, milestones } = useTaskStore()
  const isEditMode = !!initialData

  const [taskName, setTaskName] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [milestoneId, setMilestoneId] = useState<string | undefined>(undefined)
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get goal from selected milestone
  const selectedMilestone = milestones.find(m => m.id === milestoneId)
  const selectedGoal = selectedMilestone
    ? goals.find(g => g.id === selectedMilestone.goalId)
    : undefined

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setTaskName(initialData.taskName)
        setDate(initialData.date)
        setStartTime(initialData.startTime)
        setEndTime(initialData.endTime)
        setMilestoneId(initialData.milestoneId)
        setDescription(initialData.description || '')
      } else {
        setTaskName('')
        setDate(defaultDate || new Date().toISOString().split('T')[0])
        setStartTime('09:00')
        setEndTime('10:00')
        setMilestoneId(undefined)
        setDescription('')
      }
    }
  }, [open, initialData, defaultDate])

  const handleSubmit = async () => {
    if (!taskName || !date || !startTime || !endTime) return

    setIsSubmitting(true)
    try {
      await onSave({
        taskName,
        date,
        startTime,
        endTime,
        milestoneId: milestoneId || undefined,
        goalId: selectedGoal?.id,
        goalName: selectedGoal?.name,
        goalColor: selectedGoal?.color,
        description: description || undefined,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save time entry:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <div>
            <Label>時間 *</Label>
            <div className="mt-1">
              <TimeRangeInput
                startTime={startTime}
                endTime={endTime}
                onStartTimeChange={setStartTime}
                onEndTimeChange={setEndTime}
              />
            </div>
          </div>

          {/* Duration Display */}
          {duration && (
            <p className="text-sm text-muted-foreground">
              所要時間: {duration}
            </p>
          )}

          {/* Milestone Selector */}
          <div>
            <Label>マイルストーン</Label>
            <Select
              value={milestoneId || ''}
              onValueChange={(v) => setMilestoneId(v || undefined)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="マイルストーンを選択（任意）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">なし</SelectItem>
                {goals
                  .filter(g => !g.isArchived)
                  .map(goal => {
                    const goalMilestones = milestones.filter(
                      m => m.goalId === goal.id && m.status === 'active'
                    )
                    if (goalMilestones.length === 0) return null
                    return (
                      <div key={goal.id}>
                        <div className="px-2 py-1 text-xs text-muted-foreground flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: goal.color }}
                          />
                          {goal.name}
                        </div>
                        {goalMilestones.map(milestone => (
                          <SelectItem key={milestone.id} value={milestone.id}>
                            {milestone.name}
                          </SelectItem>
                        ))}
                      </div>
                    )
                  })}
              </SelectContent>
            </Select>
            {selectedGoal && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: selectedGoal.color }}
                />
                Goal: {selectedGoal.name}
              </p>
            )}
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
