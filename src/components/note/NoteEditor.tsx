import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MarkdownEditor } from '@/components/editor/MarkdownEditor'
import { DrawioEditor } from '@/components/editor/DrawioEditor'
import { Badge } from '@/components/ui/badge'
import { X, FileText, Shapes, Calendar, Target, Milestone, ListTodo, Tag } from 'lucide-react'
import type { NoteType, NoteFormat, Goal, Milestone as MilestoneType, Task, Tag as TagType } from '@/types'
import { format } from 'date-fns'

export interface NoteEditorValue {
  type: NoteType
  title?: string
  content: string
  format: NoteFormat
  date?: string
  taskId?: string
  milestoneId?: string
  goalId?: string
  tagIds?: string[]
}

interface NoteEditorProps {
  value: NoteEditorValue
  onChange: (value: NoteEditorValue) => void
  // Optional data for selects
  goals?: Goal[]
  milestones?: MilestoneType[]
  tasks?: Task[]
  tags?: TagType[]
  // Mode
  showTypeSelector?: boolean
  showMetadata?: boolean
  placeholder?: string
}

export function NoteEditor({
  value,
  onChange,
  goals = [],
  milestones = [],
  tasks = [],
  tags = [],
  showTypeSelector = false,
  showMetadata = true,
  placeholder,
}: NoteEditorProps) {
  // Filter milestones by selected goal
  const filteredMilestones = value.goalId
    ? milestones.filter((m) => m.goalId === value.goalId)
    : milestones

  // Filter tasks by selected milestone
  const filteredTasks = value.milestoneId
    ? tasks.filter((t) => t.milestoneId === value.milestoneId)
    : value.goalId
    ? tasks.filter((t) => {
        const milestone = milestones.find((m) => m.id === t.milestoneId)
        return milestone?.goalId === value.goalId
      })
    : tasks

  const handleChange = (partial: Partial<NoteEditorValue>) => {
    onChange({ ...value, ...partial })
  }

  const handleGoalChange = (goalId: string | undefined) => {
    handleChange({
      goalId,
      milestoneId: undefined,
      taskId: undefined,
    })
  }

  const handleMilestoneChange = (milestoneId: string | undefined) => {
    handleChange({
      milestoneId,
      taskId: undefined,
    })
  }

  const handleTagToggle = (tagId: string) => {
    const currentTags = value.tagIds || []
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter((id) => id !== tagId)
      : [...currentTags, tagId]
    handleChange({ tagIds: newTags })
  }

  const handleFormatChange = (format: NoteFormat) => {
    // If switching formats, show confirmation if content exists
    if (value.content && value.format !== format) {
      if (
        !window.confirm(
          'フォーマットを切り替えると現在の内容が失われる可能性があります。続けますか？'
        )
      ) {
        return
      }
    }
    handleChange({ format, content: '' })
  }

  // Title is always required for notes
  const isTitleRequired = true

  return (
    <div className="space-y-4">
      {/* Type selector (if enabled) */}
      {showTypeSelector && (
        <div className="space-y-2">
          <Label>ノートタイプ</Label>
          <Select
            value={value.type}
            onValueChange={(t) => handleChange({ type: t as NoteType })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="diary">日記</SelectItem>
              <SelectItem value="learning">学習記録</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date (for diary type) */}
      {value.type === 'diary' && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            日付 *
          </Label>
          <Input
            type="date"
            value={value.date || format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => handleChange({ date: e.target.value })}
          />
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label>タイトル {isTitleRequired && '*'}</Label>
        <Input
          value={value.title || ''}
          onChange={(e) => handleChange({ title: e.target.value })}
          placeholder={
            value.type === 'diary'
              ? '今日の振り返り'
              : '学習内容のタイトル'
          }
        />
      </div>

      {/* Format selector */}
      <div className="space-y-2">
        <Label>フォーマット</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={value.format === 'markdown' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFormatChange('markdown')}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Markdown
          </Button>
          <Button
            type="button"
            variant={value.format === 'drawio' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFormatChange('drawio')}
            className="gap-2"
          >
            <Shapes className="h-4 w-4" />
            draw.io
          </Button>
        </div>
      </div>

      {/* Content editor */}
      <div className="space-y-2">
        <Label>内容 *</Label>
        {value.format === 'markdown' ? (
          <MarkdownEditor
            value={value.content}
            onChange={(content) => handleChange({ content })}
            placeholder={placeholder}
          />
        ) : (
          <DrawioEditor
            value={value.content}
            onChange={(content) => handleChange({ content })}
          />
        )}
      </div>

      {/* Metadata section */}
      {showMetadata && (
        <div className="space-y-4 pt-4 border-t">
          <h4 className="text-sm font-medium text-muted-foreground">関連情報（任意）</h4>

          {/* Goal selector */}
          {goals.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                目標
              </Label>
              <Select
                value={value.goalId || '_none'}
                onValueChange={(v) => handleGoalChange(v === '_none' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="目標を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">なし</SelectItem>
                  {goals
                    .filter((g) => !g.isArchived)
                    .map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: goal.color }}
                          />
                          {goal.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Milestone selector */}
          {filteredMilestones.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Milestone className="h-4 w-4" />
                マイルストーン
              </Label>
              <Select
                value={value.milestoneId || '_none'}
                onValueChange={(v) => handleMilestoneChange(v === '_none' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="マイルストーンを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">なし</SelectItem>
                  {filteredMilestones
                    .filter((m) => m.status === 'active')
                    .map((milestone) => (
                      <SelectItem key={milestone.id} value={milestone.id}>
                        {milestone.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Task selector */}
          {filteredTasks.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                関連タスク
              </Label>
              <Select
                value={value.taskId || '_none'}
                onValueChange={(v) => handleChange({ taskId: v === '_none' ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="タスクを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">なし</SelectItem>
                  {filteredTasks
                    .filter((t) => !t.completed)
                    .slice(0, 20)
                    .map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tag selector */}
          {tags.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                タグ
              </Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isSelected = value.tagIds?.includes(tag.id)
                  return (
                    <Badge
                      key={tag.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer"
                      style={
                        isSelected
                          ? { backgroundColor: tag.color, borderColor: tag.color }
                          : { borderColor: tag.color, color: tag.color }
                      }
                      onClick={() => handleTagToggle(tag.id)}
                    >
                      {tag.name}
                      {isSelected && <X className="h-3 w-3 ml-1" />}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper component for displaying note metadata badges
export function NoteMetadataBadges({
  goalName,
  goalColor,
  milestoneName,
  taskName,
  tagNames,
}: {
  goalName?: string
  goalColor?: string
  milestoneName?: string
  taskName?: string
  tagNames?: string[]
}) {
  if (!goalName && !milestoneName && !taskName && !tagNames?.length) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-1">
      {goalName && (
        <Badge
          variant="outline"
          className="text-xs"
          style={goalColor ? { borderColor: goalColor, color: goalColor } : undefined}
        >
          <Target className="h-3 w-3 mr-1" />
          {goalName}
        </Badge>
      )}
      {milestoneName && (
        <Badge variant="outline" className="text-xs">
          <Milestone className="h-3 w-3 mr-1" />
          {milestoneName}
        </Badge>
      )}
      {taskName && (
        <Badge variant="outline" className="text-xs">
          <ListTodo className="h-3 w-3 mr-1" />
          {taskName}
        </Badge>
      )}
      {tagNames?.map((name, i) => (
        <Badge key={i} variant="secondary" className="text-xs">
          {name}
        </Badge>
      ))}
    </div>
  )
}
