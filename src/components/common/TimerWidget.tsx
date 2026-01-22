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
import { TagBadge } from '@/components/common/TagBadge'
import { useTimerStore } from '@/stores/useTimerStore'
import { useTaskStore } from '@/stores/useTaskStore'
import type { GoalTag } from '@/types'
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

  const { projects } = useTaskStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [taskName, setTaskName] = useState('')
  const [projectId, setProjectId] = useState<string>('')
  const [goalTag, setGoalTag] = useState<GoalTag | ''>('')

  const handleStartTimer = async () => {
    if (!taskName.trim()) return

    await startTimer({
      taskName: taskName.trim(),
      projectId: projectId || undefined,
      goalTag: (goalTag as GoalTag) || undefined,
    })

    // Reset form and close dialog
    setTaskName('')
    setProjectId('')
    setGoalTag('')
    setDialogOpen(false)
  }

  const handleStopTimer = async () => {
    await stopTimer()
  }

  const handleProjectChange = (value: string) => {
    setProjectId(value)
    // Auto-set goal tag from project
    const project = projects.find(p => p.id === value)
    if (project?.goalTag) {
      setGoalTag(project.goalTag)
    }
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
          {currentTimer.goalTag && (
            <TagBadge tag={currentTimer.goalTag} size="sm" />
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
      <DialogTrigger>
        <Button size="sm" disabled={isLoading} asChild>
          <span>
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Start Timer</span>
          </span>
        </Button>
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
            <Label htmlFor="project">Project</Label>
            <Select value={projectId} onValueChange={handleProjectChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select project (optional)" />
              </SelectTrigger>
              <SelectContent>
                {projects
                  .filter(p => !p.isArchived)
                  .map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        {project.goalTag && (
                          <TagBadge tag={project.goalTag} size="sm" />
                        )}
                        <span>{project.name}</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goalTag">Goal Tag</Label>
            <Select
              value={goalTag}
              onValueChange={(v) => setGoalTag(v as GoalTag | '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select goal tag (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GK">
                  <div className="flex items-center gap-2">
                    <TagBadge tag="GK" size="sm" />
                    <span>Golden Kubestronaut</span>
                  </div>
                </SelectItem>
                <SelectItem value="OSS">
                  <div className="flex items-center gap-2">
                    <TagBadge tag="OSS" size="sm" />
                    <span>OSS Contribution</span>
                  </div>
                </SelectItem>
                <SelectItem value="Output">
                  <div className="flex items-center gap-2">
                    <TagBadge tag="Output" size="sm" />
                    <span>Output (Blog, etc.)</span>
                  </div>
                </SelectItem>
                <SelectItem value="Other">
                  <div className="flex items-center gap-2">
                    <TagBadge tag="Other" size="sm" />
                    <span>Other</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
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
