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
import { TagInput } from '@/components/common/TagInput'
import { MetadataForm } from '@/components/note/MetadataForm'
import { getNoteTypeIcon } from '@/lib/noteTypeIcons'
import { useNoteTypeStore } from '@/stores/useNoteTypeStore'
import { FileText, Shapes, Calendar, Target, Milestone, ListTodo } from 'lucide-react'
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
  typeMetadata?: Record<string, string>
}

interface NoteEditorProps {
  value: NoteEditorValue
  onChange: (value: NoteEditorValue) => void
  // Optional data for selects
  goals?: Goal[]
  milestones?: MilestoneType[]
  tasks?: Task[]
  tags?: TagType[]
  // Tag creation callback
  onCreateTag?: (name: string, color: string) => Promise<TagType>
  // Mode
  showTypeSelector?: boolean
  showMetadata?: boolean
  placeholder?: string
  // Image upload
  onImageUpload?: (file: File) => Promise<string>
}

export function NoteEditor({
  value,
  onChange,
  goals = [],
  milestones = [],
  tasks = [],
  tags = [],
  onCreateTag,
  showTypeSelector = false,
  showMetadata = true,
  placeholder,
  onImageUpload,
}: NoteEditorProps) {
  const { types, getConstraints, getMetadataSchema } = useNoteTypeStore()
  const typeConstraints = getConstraints(value.type)
  const metadataSchema = getMetadataSchema(value.type)

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

  const handleTagsChange = (tagIds: string[]) => {
    handleChange({ tagIds })
  }

  const handleTypeMetadataChange = (typeMetadata: Record<string, string>) => {
    handleChange({ typeMetadata })
  }

  // Helper functions to get display names for select values
  const getGoalDisplayName = (goalId: string | undefined): string | undefined => {
    if (!goalId || goalId === '_none') return undefined
    const goal = goals.find((g) => g.id === goalId)
    return goal?.name
  }

  const getMilestoneDisplayName = (milestoneId: string | undefined): string | undefined => {
    if (!milestoneId || milestoneId === '_none') return undefined
    const milestone = filteredMilestones.find((m) => m.id === milestoneId)
    return milestone?.name
  }

  const getTaskDisplayName = (taskId: string | undefined): string | undefined => {
    if (!taskId || taskId === '_none') return undefined
    const task = filteredTasks.find((t) => t.id === taskId)
    return task?.name
  }

  const handleFormatChange = (fmt: NoteFormat) => {
    // If switching formats, show confirmation if content exists
    if (value.content && value.format !== fmt) {
      if (
        !window.confirm(
          'フォーマットを切り替えると現在の内容が失われる可能性があります。続けますか？'
        )
      ) {
        return
      }
    }
    handleChange({ format: fmt, content: '' })
  }

  const isTitleRequired = typeConstraints?.titleRequired ?? true
  const isDateRequired = typeConstraints?.dateRequired ?? false

  return (
    <div className="space-y-4">
      {/* Type selector (if enabled) */}
      {showTypeSelector && (
        <div className="space-y-2">
          <Label>ノートタイプ</Label>
          <Select
            value={value.type}
            onValueChange={(t) => handleChange({ type: t as NoteType, typeMetadata: {} })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map((noteType) => {
                const Icon = getNoteTypeIcon(noteType.icon)
                return (
                  <SelectItem key={noteType.slug} value={noteType.slug}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {noteType.displayName}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date (shown when type requires it) */}
      {isDateRequired && (
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
          placeholder="タイトルを入力"
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
            onImageUpload={onImageUpload}
          />
        ) : (
          <DrawioEditor
            value={value.content}
            onChange={(content) => handleChange({ content })}
          />
        )}
      </div>

      {/* Type-specific metadata form */}
      {metadataSchema.length > 0 && (
        <MetadataForm
          schema={metadataSchema}
          values={value.typeMetadata ?? {}}
          onChange={handleTypeMetadataChange}
        />
      )}

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
                  <span className="truncate">
                    {getGoalDisplayName(value.goalId) || '目標を選択'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">なし</SelectItem>
                  {goals
                    .filter((g) => g.status !== 'archived')
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
                  <span className="truncate">
                    {getMilestoneDisplayName(value.milestoneId) || 'マイルストーンを選択'}
                  </span>
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
                  <span className="truncate">
                    {getTaskDisplayName(value.taskId) || 'タスクを選択'}
                  </span>
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

          {/* Tag selector with autocomplete */}
          <TagInput
            tags={tags}
            selectedTagIds={value.tagIds || []}
            onChange={handleTagsChange}
            onCreateTag={onCreateTag}
          />
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
