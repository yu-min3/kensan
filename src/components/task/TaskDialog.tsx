import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { DialogState } from '@/hooks/useDialogState'
import type { GoalTag, Project, Task } from '@/types'

const goalTagOptions: { value: GoalTag; label: string }[] = [
  { value: 'GK', label: 'GK (Golden Kubestronaut)' },
  { value: 'OSS', label: 'OSS' },
  { value: 'Output', label: 'Output' },
  { value: 'Other', label: 'Other' },
]

export interface TaskFormData {
  name: string
  projectId: string
  parentTaskId?: string
  goalTag: GoalTag | ''
}

interface TaskDialogProps {
  dialog: DialogState<TaskFormData>
  projects: Project[]
  tasks: Task[]
  onSave: (data: TaskFormData, editingId: string | null) => Promise<void>
}

export function TaskDialog({ dialog, projects, tasks, onSave }: TaskDialogProps) {
  const handleSave = async () => {
    if (!dialog.data.name || !dialog.data.projectId) return
    await onSave(dialog.data, dialog.editingId)
    dialog.close()
  }

  const parentTask = dialog.data.parentTaskId
    ? tasks.find((t) => t.id === dialog.data.parentTaskId)
    : null

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
            <Label>プロジェクト</Label>
            <Select value={dialog.data.projectId} onValueChange={(v) => dialog.setField('projectId', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="プロジェクトを選択" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>目標タグ</Label>
            <Select
              value={dialog.data.goalTag}
              onValueChange={(v) => dialog.setField('goalTag', v as GoalTag)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="タグを選択（任意）" />
              </SelectTrigger>
              <SelectContent>
                {goalTagOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {parentTask && (
            <div>
              <Label className="text-muted-foreground">
                親タスク: {parentTask.name}
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={dialog.close}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={!dialog.data.name || !dialog.data.projectId}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
