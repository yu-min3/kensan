import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { TagSelect } from '@/components/common/TagSelect'
import { EntityMemoSection } from '@/components/common/EntityMemoSection'
import type { DialogState } from '@/hooks/useDialogState'
import type { Goal, Milestone, Tag, Task } from '@/types'

export interface TaskFormData {
  name: string
  milestoneId: string
  parentTaskId?: string
  tagIds: string[]
}

interface TaskDialogProps {
  dialog: DialogState<TaskFormData>
  goals: Goal[]
  milestones: Milestone[]
  tags: Tag[]
  tasks: Task[]
  onSave: (data: TaskFormData, editingId: string | null) => Promise<void>
}

export function TaskDialog({ dialog, goals, milestones, tags, tasks, onSave }: TaskDialogProps) {
  const handleSave = async () => {
    if (!dialog.data.name) return
    await onSave(dialog.data, dialog.editingId)
    dialog.close()
  }

  const parentTask = dialog.data.parentTaskId
    ? tasks.find((t) => t.id === dialog.data.parentTaskId)
    : null

  // Get the goal for the selected milestone
  const selectedMilestone = dialog.data.milestoneId
    ? milestones.find((m) => m.id === dialog.data.milestoneId)
    : undefined
  const selectedGoal = selectedMilestone
    ? goals.find((g) => g.id === selectedMilestone.goalId)
    : undefined

  return (
    <Dialog open={dialog.isOpen} onOpenChange={dialog.setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dialog.isEditing ? 'タスクを編集' : 'タスクを追加'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="taskName">タスク名</Label>
            <Input
              id="taskName"
              value={dialog.data.name}
              onChange={(e) => dialog.setField('name', e.target.value)}
              placeholder="例: ドキュメント作成"
              className="mt-1"
            />
          </div>

          <div>
            <Label>マイルストーン（任意）</Label>
            <Select
              value={dialog.data.milestoneId || ''}
              onValueChange={(v) => dialog.setField('milestoneId', v || '')}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="マイルストーンを選択" />
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
                          <SelectItem key={milestone.id} value={milestone.id} label={milestone.name}>
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

          {/* Tag selection */}
          <div>
            <Label>タグ（任意）</Label>
            <div className="mt-1">
              <TagSelect
                tags={tags}
                selectedTagIds={dialog.data.tagIds || []}
                onSelectedTagIdsChange={(tagIds) => dialog.setField('tagIds', tagIds)}
                placeholder="タグを追加"
              />
            </div>
          </div>

          {parentTask && (
            <div>
              <Label className="text-muted-foreground">
                親タスク: {parentTask.name}
              </Label>
            </div>
          )}

          {/* Entity Memos - only show when editing existing task */}
          {dialog.editingId && (
            <EntityMemoSection
              entityType="task"
              entityId={dialog.editingId}
              maxHeight="150px"
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={dialog.close}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={!dialog.data.name}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
