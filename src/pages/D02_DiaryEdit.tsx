import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MarkdownEditorPlaceholder } from '@/components/editor/MarkdownEditorPlaceholder'
import { useDiaryStore } from '@/stores/useDiaryStore'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { format } from 'date-fns'
import { BookMarked, Save, Trash2, X, Clock, Plus } from 'lucide-react'

export function D02DiaryEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getById, add: addEntry, update: updateEntry, remove: deleteEntry } = useDiaryStore()
  const { getTodayTimeEntries } = useTimeBlockStore()

  const isNew = !id
  const existingEntry = id ? getById(id) : undefined

  const [date, setDate] = useState(existingEntry?.date || format(new Date(), 'yyyy-MM-dd'))
  const [title, setTitle] = useState(existingEntry?.title || '')
  const [content, setContent] = useState(existingEntry?.content || '')
  const [tags, setTags] = useState<string[]>(existingEntry?.tags || [])
  const [newTag, setNewTag] = useState('')

  const todayEntries = getTodayTimeEntries()

  useEffect(() => {
    if (existingEntry) {
      setDate(existingEntry.date)
      setTitle(existingEntry.title)
      setContent(existingEntry.content)
      setTags(existingEntry.tags)
    }
  }, [existingEntry])

  const handleSave = () => {
    const entryData = {
      date,
      title,
      content,
      tags,
    }

    if (isNew) {
      addEntry(entryData)
    } else if (id) {
      updateEntry(id, entryData)
    }

    navigate('/diary')
  }

  const handleDelete = () => {
    if (id && window.confirm('この日記を削除しますか？')) {
      deleteEntry(id)
      navigate('/diary')
    }
  }

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookMarked className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? '日記を書く' : '日記を編集'}
            </h1>
            <p className="text-sm text-muted-foreground">Phase 2 機能</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1">
              <Trash2 className="h-4 w-4" />
              削除
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate('/diary')} className="gap-1">
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
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="date">日付</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="title">タイトル（任意）</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="今日のタイトル"
                className="mt-1"
              />
            </div>
          </div>

          {/* タグ */}
          <div>
            <Label>タグ</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => handleRemoveTag(tag)}
                >
                  {tag} ×
                </Badge>
              ))}
              <div className="flex gap-1">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="新しいタグ"
                  className="h-6 w-24 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button size="sm" variant="ghost" className="h-6 px-2" onClick={handleAddTag}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* エディタ本体 */}
          <MarkdownEditorPlaceholder
            value={content}
            onChange={setContent}
            placeholder="今日の出来事、気づき、思いを書いてみましょう..."
          />
        </div>

        {/* サイドパネル */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                今日の時間記録
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayEntries.length > 0 ? (
                <div className="space-y-2 text-sm">
                  {todayEntries.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      className="p-2 rounded bg-muted"
                    >
                      <div className="font-medium truncate">{entry.taskName}</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.startTime} - {entry.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  今日の時間記録はありません
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">ヒント</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• 今日学んだこと</p>
              <p>• 嬉しかったこと</p>
              <p>• 改善したいこと</p>
              <p>• 明日の目標</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
