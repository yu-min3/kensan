import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MarkdownEditor } from '@/components/editor/MarkdownEditor'
import { DrawioEditor } from '@/components/editor/DrawioEditor'
import { useLearningRecordStore } from '@/stores/useLearningRecordStore'
import { useTaskStore } from '@/stores/useTaskStore'
import type { RecordFormat } from '@/types'
import { BookOpen, Save, Trash2, X, Clock } from 'lucide-react'

export function L02LearningRecordEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getById, add: addRecord, update: updateRecord, remove: deleteRecord } = useLearningRecordStore()
  const { goals, milestones, getMilestoneById, getGoalById } = useTaskStore()

  const isNew = !id
  const existingRecord = id ? getById(id) : undefined

  const [title, setTitle] = useState(existingRecord?.title || '')
  const [content, setContent] = useState(existingRecord?.content || '')
  const [format, setFormat] = useState<RecordFormat>(existingRecord?.format || 'markdown')
  const [milestoneId, setMilestoneId] = useState(existingRecord?.milestoneId || '')

  useEffect(() => {
    if (existingRecord) {
      setTitle(existingRecord.title)
      setContent(existingRecord.content)
      setFormat(existingRecord.format)
      setMilestoneId(existingRecord.milestoneId || '')
    }
  }, [existingRecord])

  const selectedMilestone = milestoneId ? getMilestoneById(milestoneId) : undefined
  const selectedGoal = selectedMilestone ? getGoalById(selectedMilestone.goalId) : undefined

  const handleSave = () => {
    const recordData = {
      title,
      content,
      format,
      milestoneId: milestoneId || undefined,
      milestoneName: selectedMilestone?.name,
      goalId: selectedGoal?.id,
      goalName: selectedGoal?.name,
      goalColor: selectedGoal?.color,
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
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder="学習内容をMarkdownで記述..."
            />
          ) : (
            <DrawioEditor
              value={content}
              onChange={setContent}
            />
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
                <Label>マイルストーン</Label>
                <Select
                  value={milestoneId || ''}
                  onValueChange={(v) => setMilestoneId(v || '')}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="選択..." />
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
