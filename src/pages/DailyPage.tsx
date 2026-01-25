import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DailySummary } from '@/components/daily/DailySummary'
import { TimeBlockSection } from '@/components/daily/TimeBlockSection'
import { TaskListWidget, type TaskDragData } from '@/components/daily/TaskListWidget'
import { TodoBar } from '@/components/daily/TodoBar'
import { DashboardBar } from '@/components/daily/DailyDashboard'
import { calculateTimeFromY } from '@/components/common/TimeBlockTimeline'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useTimeBlockStore } from '@/stores/useTimeBlockStore'
import { formatDateJa, formatDateIso } from '@/lib/dateFormat'
import {
  Sun,
  Moon,
  BookOpen,
  BookMarked,
} from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
} from '@dnd-kit/core'

export function DailyPage() {
  const { userName } = useSettingsStore()
  const { addTimeBlock } = useTimeBlockStore()

  // 選択中の日付（状態リフトアップ）
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const selectedDateIso = formatDateIso(selectedDate)
  const isToday = formatDateIso(new Date()) === selectedDateIso

  // ドラッグ&ドロップ状態
  const [isDraggingTask, setIsDraggingTask] = useState(false)
  const [dragOverY, setDragOverY] = useState<number | null>(null)
  const [activeDragData, setActiveDragData] = useState<TaskDragData | null>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const hour = new Date().getHours()
  const isEvening = hour >= 17

  // 時間帯に応じた挨拶（今日の場合のみ）
  const Icon = isEvening ? Moon : Sun
  const iconColor = isEvening ? 'text-indigo-400' : 'text-slate-500'
  const greeting = isToday
    ? isEvening
      ? `お疲れさまです、${userName}さん`
      : `おはようございます、${userName}さん`
    : formatDateJa(selectedDate)

  // ドラッグ開始
  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as TaskDragData | undefined
    if (data?.type === 'task') {
      setIsDraggingTask(true)
      setActiveDragData(data)
    }
  }

  // ドラッグ中
  const handleDragMove = (event: DragMoveEvent) => {
    if (!isDraggingTask) return

    // ドロップ先がタイムラインの場合のみY座標を更新
    if (event.over?.id === 'timeblock-timeline-droppable') {
      const { activatorEvent, delta } = event
      if (activatorEvent && 'clientY' in activatorEvent) {
        const initialY = (activatorEvent as MouseEvent).clientY
        setDragOverY(initialY + delta.y)
      }
    } else {
      setDragOverY(null)
    }
  }

  // ドラッグ終了
  const handleDragEnd = async (event: DragEndEvent) => {
    const { over } = event

    if (over?.id === 'timeblock-timeline-droppable' && activeDragData && dragOverY !== null) {
      // タイムライン上にドロップされた場合
      const timelineElement = document.querySelector('[data-timeline-container]')
      if (timelineElement) {
        const rect = timelineElement.getBoundingClientRect()
        const { startTime, endTime } = calculateTimeFromY(dragOverY, rect, 8, 19, 15)

        // タイムブロックを作成（選択中の日付を使用）
        await addTimeBlock({
          date: selectedDateIso,
          startTime,
          endTime,
          taskId: activeDragData.taskId,
          taskName: activeDragData.taskName,
          milestoneId: activeDragData.milestoneId,
          milestoneName: activeDragData.milestoneName,
          goalId: activeDragData.goalId,
          goalName: activeDragData.goalName,
          goalColor: activeDragData.goalColor,
          isRoutine: false,
        })
      }
    }

    // 状態をリセット
    setIsDraggingTask(false)
    setDragOverY(null)
    setActiveDragData(null)
  }

  // ドラッグキャンセル
  const handleDragCancel = () => {
    setIsDraggingTask(false)
    setDragOverY(null)
    setActiveDragData(null)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-6">
        {/* ヘッダー + サマリー（インライン） */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Icon className={`h-8 w-8 ${iconColor}`} />
            <div>
              <h1 className="text-2xl font-bold">{greeting}</h1>
              {isToday && <p className="text-muted-foreground">{formatDateJa(new Date())}</p>}
            </div>
          </div>
          <DailySummary mode="compact" />
        </div>

        {/* ダッシュボード（コンパクトバー） */}
        <section>
          <DashboardBar />
        </section>

        {/* 作業 */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">作業</h2>

          {/* 今日のタスク（横長バー） */}
          <TodoBar date={selectedDateIso} />

          <div className="grid gap-4 lg:grid-cols-3">
            {/* タイムブロック */}
            <div className="lg:col-span-2">
              <TimeBlockSection
                showAddButtons={true}
                isDraggingTask={isDraggingTask}
                dragOverY={dragOverY}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            </div>

            {/* 右サイド: タスクリスト */}
            <div className="hidden lg:block">
              <TaskListWidget />
            </div>
          </div>
        </section>

        {/* 記録 */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">記録</h2>
          <div className="flex gap-2">
            <Link to="/notes/new?type=learning">
              <Button variant="outline" className="gap-2">
                <BookOpen className="h-4 w-4" />
                学習記録を作成
              </Button>
            </Link>
            <Link to="/notes/new?type=diary">
              <Button variant="outline" className="gap-2">
                <BookMarked className="h-4 w-4" />
                日記を書く
              </Button>
            </Link>
          </div>
        </section>

        {/* ドラッグオーバーレイ */}
        <DragOverlay>
          {activeDragData ? (
            <div className="px-3 py-2 bg-background border border-primary rounded-md shadow-lg text-sm font-medium max-w-48 truncate">
              {activeDragData.taskName}
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  )
}
