import { useState } from 'react'
import { Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GoalBadge } from '@/components/common/GoalBadge'
import { useTimerStore } from '@/stores/useTimerStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { cn } from '@/lib/utils'

// Format elapsed seconds to HH:MM:SS
function formatElapsedTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return [hours, minutes, secs]
    .map(v => v.toString().padStart(2, '0'))
    .join(':')
}

export function TimerWidget() {
  const {
    currentTimer,
    isLoading,
    elapsedSeconds,
    startTimer,
    stopTimer,
  } = useTimerStore()

  const { goals, milestones } = useTaskStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [taskName, setTaskName] = useState('')
  const [milestoneId, setMilestoneId] = useState<string>('')

  // Get goal from selected milestone
  const selectedMilestone = milestones.find(m => m.id === milestoneId)
  const selectedGoal = selectedMilestone
    ? goals.find(g => g.id === selectedMilestone.goalId)
    : undefined

  const handleStartTimer = async () => {
    if (!taskName.trim()) return

    await startTimer({
      taskName: taskName.trim(),
      milestoneId: milestoneId || undefined,
      goalId: selectedGoal?.id,
      goalName: selectedGoal?.name,
      goalColor: selectedGoal?.color,
    })

    // Reset form and close dialog
    setTaskName('')
    setMilestoneId('')
    setDialogOpen(false)
  }

  const handleStopTimer = async () => {
    await stopTimer()
  }

  // Timer is running
  if (currentTimer) {
    return (
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md',
            'bg-primary/10 border border-primary/20',
            'animate-pulse'
          )}
        >
          {currentTimer.goalName && currentTimer.goalColor && (
            <GoalBadge
              name={currentTimer.goalName}
              color={currentTimer.goalColor}
              size="sm"
            />
          )}
          <span className="text-sm font-medium max-w-32 truncate">
            {currentTimer.taskName}
          </span>
          <span className="text-sm font-mono font-semibold text-primary">
            {formatElapsedTime(elapsedSeconds)}
          </span>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleStopTimer}
          disabled={isLoading}
        >
          <Square className="h-4 w-4" />
          <span className="sr-only">Stop</span>
        </Button>
      </div>
    )
  }

  // No timer running
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 px-3" disabled={isLoading}>
        <Play className="h-4 w-4" />
        <span className="hidden sm:inline">Start Timer</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Timer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="taskName">Task Name *</Label>
            <Input
              id="taskName"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="What are you working on?"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="milestone">Milestone</Label>
            <Select value={milestoneId} onValueChange={setMilestoneId}>
              <SelectTrigger>
                <SelectValue placeholder="Select milestone (optional)" />
              </SelectTrigger>
              <SelectContent>
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
                            <div className="flex items-center gap-2">
                              <span>{milestone.name}</span>
                              {milestone.targetDate && (
                                <span className="text-xs text-muted-foreground">
                                  ({milestone.targetDate})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    )
                  })}
              </SelectContent>
            </Select>
            {selectedGoal && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Goal:</span>
                <GoalBadge
                  name={selectedGoal.name}
                  color={selectedGoal.color}
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartTimer}
            disabled={!taskName.trim() || isLoading}
          >
            <Play className="h-4 w-4" />
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
