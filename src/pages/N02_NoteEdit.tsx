import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConfirmPopover } from '@/components/common/ConfirmPopover'
import { NoteEditor, NoteEditorValue } from '@/components/note/NoteEditor'
import { useNoteStore } from '@/stores/useNoteStore'
import { useTaskStore } from '@/stores/useTaskStore'
import type { NoteType, Note } from '@/types'
import { format } from 'date-fns'
import {
  Save,
  Trash2,
  X,
  Archive,
  ArchiveRestore,
  Clock,
  CalendarDays,
  BookOpen,
} from 'lucide-react'

const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  diary: '日記',
  learning: '学習記録',
}

const NOTE_TYPE_ICONS: Record<NoteType, React.ComponentType<{ className?: string }>> = {
  diary: CalendarDays,
  learning: BookOpen,
}

export function N02NoteEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const {
    fetchNote,
    createNote,
    updateNote,
    deleteNote,
    archiveNote,
  } = useNoteStore()
  const { goals, milestones, tasks, tags, addTag, getMilestoneById, getGoalById } = useTaskStore()

  const isNew = !id
  const initialType = (searchParams.get('type') as NoteType) || 'diary'

  // Local state for the editor
  const [editorValue, setEditorValue] = useState<NoteEditorValue>({
    type: initialType,
    title: '',
    content: '',
    format: 'markdown',
    date: (initialType === 'diary' || initialType === 'learning') ? format(new Date(), 'yyyy-MM-dd') : undefined,
    taskId: undefined,
    milestoneId: undefined,
    goalId: undefined,
    tagIds: [],
  })

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [existingNote, setExistingNote] = useState<Note | null>(null)

  // Fetch existing note
  useEffect(() => {
    if (id) {
      setIsLoading(true)
      fetchNote(id)
        .then((note) => {
          setExistingNote(note)
          setEditorValue({
            type: note.type,
            title: note.title,
            content: note.content,
            format: note.format,
            date: note.date,
            taskId: note.taskId,
            milestoneId: note.milestoneId,
            goalId: note.goalId,
            tagIds: note.tagIds || [],
          })
          setIsLoading(false)
        })
        .catch(() => {
          setIsLoading(false)
          navigate('/notes', { replace: true })
        })
    }
  }, [id, fetchNote, navigate])

  // Get denormalized names for saving
  const getDenormalizedData = () => {
    const milestone = editorValue.milestoneId
      ? getMilestoneById(editorValue.milestoneId)
      : undefined
    const goal = editorValue.goalId
      ? getGoalById(editorValue.goalId)
      : milestone
      ? getGoalById(milestone.goalId)
      : undefined

    return {
      milestoneName: milestone?.name,
      goalId: goal?.id || editorValue.goalId,
      goalName: goal?.name,
      goalColor: goal?.color,
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const denormalized = getDenormalizedData()
      const noteData = {
        type: editorValue.type,
        title: editorValue.title?.trim() || undefined,
        content: editorValue.content,
        format: editorValue.format,
        date: editorValue.date,
        taskId: editorValue.taskId,
        milestoneId: editorValue.milestoneId,
        milestoneName: denormalized.milestoneName,
        goalId: denormalized.goalId,
        goalName: denormalized.goalName,
        goalColor: denormalized.goalColor,
        tagIds: editorValue.tagIds,
      }

      if (isNew) {
        await createNote(noteData)
      } else if (id) {
        await updateNote(id, noteData)
      }

      navigate('/notes')
    } catch (error) {
      console.error('Failed to save note:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (id) {
      try {
        await deleteNote(id)
        navigate('/notes')
      } catch (error) {
        console.error('Failed to delete note:', error)
      }
    }
  }

  const handleArchive = async () => {
    if (id && existingNote) {
      try {
        await archiveNote(id, !existingNote.archived)
        // Refetch to update local state
        const updated = await fetchNote(id)
        setExistingNote(updated)
      } catch (error) {
        console.error('Failed to archive note:', error)
      }
    }
  }

  // Validation
  const isValid = () => {
    // Content is required
    if (!editorValue.content.trim()) return false

    // Title is always required
    if (!editorValue.title?.trim()) return false

    // Date is required for diary and learning
    if ((editorValue.type === 'diary' || editorValue.type === 'learning') && !editorValue.date) return false

    return true
  }

  const TypeIcon = NOTE_TYPE_ICONS[editorValue.type]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TypeIcon className="h-8 w-8 text-slate-500" />
          <h1 className="text-2xl font-bold">
            {isNew
              ? `${NOTE_TYPE_LABELS[editorValue.type]}を作成`
              : `${NOTE_TYPE_LABELS[editorValue.type]}を編集`}
          </h1>
        </div>
        <div className="flex gap-2">
          {!isNew && existingNote && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchive}
                className="gap-1"
              >
                {existingNote.archived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4" />
                    復元
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />
                    アーカイブ
                  </>
                )}
              </Button>
              <ConfirmPopover
                message="このノートを削除しますか？"
                confirmLabel="削除"
                onConfirm={handleDelete}
                variant="destructive"
              >
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  削除
                </Button>
              </ConfirmPopover>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/notes')}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            閉じる
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isValid() || isSaving}
            className="gap-1"
          >
            <Save className="h-4 w-4" />
            {isSaving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Editor */}
        <div className="lg:col-span-3">
          <NoteEditor
            value={editorValue}
            onChange={setEditorValue}
            goals={goals}
            milestones={milestones}
            tasks={tasks}
            tags={tags}
            onCreateTag={(name, color) => addTag({ name, color })}
            showTypeSelector={isNew}
            showMetadata={true}
          />
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Info card */}
          {existingNote && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">作成日</span>
                  <span>{format(existingNote.createdAt, 'yyyy-MM-dd HH:mm')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">更新日</span>
                  <span>{format(existingNote.updatedAt, 'yyyy-MM-dd HH:mm')}</span>
                </div>
                {existingNote.archived && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mt-2">
                    <Archive className="h-4 w-4" />
                    アーカイブ済み
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Related time entries */}
          {existingNote?.relatedTimeEntryIds && existingNote.relatedTimeEntryIds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  関連する時間記録
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {existingNote.relatedTimeEntryIds.map((entryId) => (
                    <div
                      key={entryId}
                      className="text-sm p-2 rounded bg-muted"
                    >
                      時間記録 #{entryId}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ヒント</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              {editorValue.type === 'diary' && (
                <p>日記は日付ごとに振り返りを記録できます。目標やタグを付けて分類しましょう。</p>
              )}
              {editorValue.type === 'learning' && (
                <p>
                  学習記録は技術メモやナレッジベースとして活用できます。
                  マイルストーンやタスクと紐付けて進捗を管理しましょう。
                </p>
              )}
              <p className="pt-2">
                Markdownまたはdraw.io形式で記述できます。
                draw.ioは図解やアーキテクチャ図の作成に便利です。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
