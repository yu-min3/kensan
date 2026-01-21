import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useRoutineStore } from '@/stores/useRoutineStore'
import type { RoutineFrequency } from '@/types'
import { RotateCcw, Plus, Edit, Trash2 } from 'lucide-react'

const frequencyLabels: Record<RoutineFrequency, string> = {
  daily: '毎日',
  weekly: '毎週',
  monthly: '毎月',
  custom: 'カスタム',
}

const dayLabels = ['日', '月', '火', '水', '木', '金', '土']

export function R01RoutineTaskManagement() {
  const { items: routines, add: addRoutine, update: updateRoutine, remove: deleteRoutine, toggleRoutineEnabled } = useRoutineStore()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState<RoutineFrequency>('daily')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const [estimatedMinutes, setEstimatedMinutes] = useState(30)

  const openNewDialog = () => {
    setEditingId(null)
    setName('')
    setFrequency('daily')
    setDaysOfWeek([])
    setEstimatedMinutes(30)
    setIsDialogOpen(true)
  }

  const openEditDialog = (routine: typeof routines[0]) => {
    setEditingId(routine.id)
    setName(routine.name)
    setFrequency(routine.frequency)
    setDaysOfWeek(routine.daysOfWeek || [])
    setEstimatedMinutes(routine.estimatedMinutes)
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    const routineData = {
      name,
      frequency,
      daysOfWeek: frequency === 'custom' || frequency === 'weekly' ? daysOfWeek : undefined,
      estimatedMinutes,
      enabled: true,
    }

    if (editingId) {
      updateRoutine(editingId, routineData)
    } else {
      addRoutine(routineData)
    }

    setIsDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    if (window.confirm('この定期タスクを削除しますか？')) {
      deleteRoutine(id)
    }
  }

  const toggleDay = (day: number) => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== day))
    } else {
      setDaysOfWeek([...daysOfWeek, day].sort())
    }
  }

  const formatMinutes = (minutes: number) => {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      return m > 0 ? `${h}時間${m}分` : `${h}時間`
    }
    return `${minutes}分`
  }

  const getFrequencyDisplay = (routine: typeof routines[0]) => {
    if (routine.frequency === 'daily') return '毎日'
    if (routine.frequency === 'weekly' && routine.daysOfWeek) {
      return `毎週 ${routine.daysOfWeek.map((d) => dayLabels[d]).join('・')}`
    }
    if (routine.frequency === 'custom' && routine.daysOfWeek) {
      return routine.daysOfWeek.map((d) => dayLabels[d]).join('・')
    }
    return frequencyLabels[routine.frequency]
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RotateCcw className="h-8 w-8 text-purple-500" />
          <h1 className="text-2xl font-bold">定期タスク</h1>
        </div>
        <Button className="gap-2" onClick={openNewDialog}>
          <Plus className="h-4 w-4" />
          追加
        </Button>
      </div>

      {/* 定期タスク一覧 */}
      <div className="space-y-4">
        {routines.map((routine) => (
          <Card key={routine.id}>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Switch
                  checked={routine.enabled}
                  onCheckedChange={() => toggleRoutineEnabled(routine.id)}
                />
                <div className="flex-1">
                  <h3 className={`font-medium ${!routine.enabled && 'text-muted-foreground'}`}>
                    {routine.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {getFrequencyDisplay(routine)} | 目安: {formatMinutes(routine.estimatedMinutes)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditDialog(routine)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(routine.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {routines.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <RotateCcw className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground mt-4">定期タスクがありません</p>
              <Button variant="outline" className="mt-4 gap-2" onClick={openNewDialog}>
                <Plus className="h-4 w-4" />
                追加
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 追加/編集ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? '定期タスクを編集' : '定期タスクを追加'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">タスク名</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 技術ニュースチェック"
                className="mt-1"
              />
            </div>

            <div>
              <Label>頻度</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as RoutineFrequency)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">毎日</SelectItem>
                  <SelectItem value="weekly">毎週</SelectItem>
                  <SelectItem value="custom">曜日指定</SelectItem>
                  <SelectItem value="monthly">毎月</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(frequency === 'weekly' || frequency === 'custom') && (
              <div>
                <Label>曜日</Label>
                <div className="flex gap-2 mt-2">
                  {dayLabels.map((label, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                        daysOfWeek.includes(index)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted-foreground/20'
                      }`}
                      onClick={() => toggleDay(index)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="minutes">目安時間（分）</Label>
              <Input
                id="minutes"
                type="number"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                min={5}
                max={480}
                step={5}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={!name}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
