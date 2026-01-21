import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import type { DialogState } from '@/hooks/useDialogState'
import type { GoalTag } from '@/types'

const goalTagOptions: { value: GoalTag; label: string }[] = [
  { value: 'GK', label: 'GK (Golden Kubestronaut)' },
  { value: 'OSS', label: 'OSS' },
  { value: 'Output', label: 'Output' },
  { value: 'Other', label: 'Other' },
]

export interface ProjectFormData {
  name: string
  goalTag: GoalTag | ''
  color: string
}

interface ProjectDialogProps {
  dialog: DialogState<ProjectFormData>
  onSave: (data: ProjectFormData, editingId: string | null) => Promise<void>
}

export function ProjectDialog({ dialog, onSave }: ProjectDialogProps) {
  const handleSave = async () => {
    if (!dialog.data.name) return
    await onSave(dialog.data, dialog.editingId)
    dialog.close()
  }

  return (
    <Dialog open={dialog.isOpen} onOpenChange={dialog.setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dialog.isEditing ? 'プロジェクトを編集' : 'プロジェクトを追加'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="projectName">プロジェクト名</Label>
            <Input
              id="projectName"
              value={dialog.data.name}
              onChange={(e) => dialog.setField('name', e.target.value)}
              placeholder="例: 新規プロジェクト"
              className="mt-1"
            />
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

          <div>
            <Label htmlFor="projectColor">カラー</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="projectColor"
                type="color"
                value={dialog.data.color}
                onChange={(e) => dialog.setField('color', e.target.value)}
                className="w-12 h-10 p-1"
              />
              <Input
                value={dialog.data.color}
                onChange={(e) => dialog.setField('color', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
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
