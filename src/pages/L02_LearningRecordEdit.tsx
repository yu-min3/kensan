import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MarkdownEditorPlaceholder } from '@/components/editor/MarkdownEditorPlaceholder'
import { DrawioEditorPlaceholder } from '@/components/editor/DrawioEditorPlaceholder'
import { useLearningRecordStore } from '@/stores/useLearningRecordStore'
import { useTaskStore } from '@/stores/useTaskStore'
import type { RecordFormat, GoalTag } from '@/types'
import { BookOpen, Save, Trash2, X, Clock } from 'lucide-react'

export function L02LearningRecordEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getById, add: addRecord, update: updateRecord, remove: deleteRecord } = useLearningRecordStore()
  const { projects } = useTaskStore()

  const isNew = !id
  const existingRecord = id ? getById(id) : undefined

  const [title, setTitle] = useState(existingRecord?.title || '')
  const [content, setContent] = useState(existingRecord?.content || '')
  const [format, setFormat] = useState<RecordFormat>(existingRecord?.format || 'markdown')
  const [projectId, setProjectId] = useState(existingRecord?.projectId || '')
  const [goalTag, setGoalTag] = useState<GoalTag | ''>(existingRecord?.goalTag || '')

  useEffect(() => {
    if (existingRecord) {
      setTitle(existingRecord.title)
      setContent(existingRecord.content)
      setFormat(existingRecord.format)
      setProjectId(existingRecord.projectId || '')
      setGoalTag(existingRecord.goalTag || '')
    }
  }, [existingRecord])

  const selectedProject = projects.find((p) => p.id === projectId)

  const handleSave = () => {
    const recordData = {
      title,
      content,
      format,
      projectId: projectId || undefined,
      projectName: selectedProject?.name,
      goalTag: (goalTag || selectedProject?.goalTag) as GoalTag | undefined,
    }

    if (isNew) {
      addRecord(recordData)
    } else if (id) {
      updateRecord(id, recordData)
    }

    navigate('/learning-records')
  }

  const handleDelete = () => {
    if (id && window.confirm('この記録を削除しますか？')) {
      deleteRecord(id)
      navigate('/learning-records')
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-slate-500" />
          <h1 className="text-2xl font-bold">
            {isNew ? '学習記録を作成' : '学習記録を編集'}
          </h1>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1">
              <Trash2 className="h-4 w-4" />
              削除
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/learning-records')} className="gap-1">
            <X className="h-4 w-4" />
            閉じる
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-1">
            <Save className="h-4 w-4" />
            保存
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* エディタ */}
        <div className="lg:col-span-3 space-y-4">
          <div>
            <Label htmlFor="title">タイトル</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="記録のタイトル"
              className="mt-1"
            />
          </div>

          {/* 形式選択 */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                checked={format === 'markdown'}
                onChange={() => setFormat('markdown')}
                className="h-4 w-4"
              />
              <span>Markdown</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="format"
                checked={format === 'drawio'}
                onChange={() => setFormat('drawio')}
                className="h-4 w-4"
              />
              <span>drawio</span>
            </label>
          </div>

          {/* エディタ本体 */}
          {format === 'markdown' ? (
            <MarkdownEditorPlaceholder
              value={content}
              onChange={setContent}
              placeholder="学習内容をMarkdownで記述..."
            />
          ) : (
            <DrawioEditorPlaceholder />
          )}
        </div>

        {/* サイドパネル */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">メタデータ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>プロジェクト</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">なし</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>目標タグ</Label>
                <Select
                  value={goalTag || selectedProject?.goalTag || ''}
                  onValueChange={(v) => setGoalTag(v as GoalTag)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">なし</SelectItem>
                    <SelectItem value="GK">GK (Golden Kube)</SelectItem>
                    <SelectItem value="OSS">OSS</SelectItem>
                    <SelectItem value="Output">Output</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {existingRecord && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  関連する時間記録
                </CardTitle>
              </CardHeader>
              <CardContent>
                {existingRecord.relatedTimeEntryIds?.length ? (
                  <div className="space-y-2">
                    {existingRecord.relatedTimeEntryIds.map((entryId) => (
                      <div
                        key={entryId}
                        className="text-sm p-2 rounded bg-muted"
                      >
                        時間記録 #{entryId}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    関連する時間記録はありません
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
