import { useRef } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TimeRangeInputProps {
  startTime: string
  endTime: string
  onStartTimeChange: (time: string) => void
  onEndTimeChange: (time: string) => void
  startHour?: number
  endHour?: number
  step?: number // minutes
}

// Generate time options in 15-minute increments
function generateTimeOptions(startHour: number, endHour: number, step: number): string[] {
  const options: string[] = []
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += step) {
      if (hour === endHour && minute > 0) break
      const h = hour.toString().padStart(2, '0')
      const m = minute.toString().padStart(2, '0')
      options.push(`${h}:${m}`)
    }
  }
  return options
}

// Convert minutes to time string (HH:mm)
function minutesToTime(minutes: number, maxHour: number): string {
  const clampedMinutes = Math.max(0, Math.min(minutes, maxHour * 60))
  const h = Math.floor(clampedMinutes / 60)
  const m = clampedMinutes % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export function TimeRangeInput({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  startHour = 6,
  endHour = 23,
  step = 15,
}: TimeRangeInputProps) {
  const timeOptions = generateTimeOptions(startHour, endHour, step)

  // 前回の開始時間と終了時間を記録して、変更時に duration を維持する
  const prevStartTimeRef = useRef(startTime)
  const prevEndTimeRef = useRef(endTime)

  // 開始時間変更時に時間間隔を維持して終了時間も移動
  const handleStartTimeChange = (newStartTime: string) => {
    const prevStartMinutes = timeToMinutes(prevStartTimeRef.current)
    const prevEndMinutes = timeToMinutes(prevEndTimeRef.current)
    const duration = prevEndMinutes - prevStartMinutes

    const newStartMinutes = timeToMinutes(newStartTime)
    let newEndMinutes = newStartMinutes + duration

    // 終了時間が範囲外の場合は調整（最低1時間は確保）
    const maxMinutes = endHour * 60
    if (newEndMinutes > maxMinutes) {
      newEndMinutes = maxMinutes
    }
    if (newEndMinutes <= newStartMinutes) {
      newEndMinutes = Math.min(newStartMinutes + 60, maxMinutes)
    }

    const newEndTime = minutesToTime(newEndMinutes, endHour)

    // 状態を更新
    prevStartTimeRef.current = newStartTime
    prevEndTimeRef.current = newEndTime

    onStartTimeChange(newStartTime)
    onEndTimeChange(newEndTime)
  }

  // 終了時間変更時はrefを更新
  const handleEndTimeChange = (newEndTime: string) => {
    prevEndTimeRef.current = newEndTime
    onEndTimeChange(newEndTime)
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={startTime} onValueChange={handleStartTimeChange} scrollToSelected>
        <SelectTrigger className="w-24">
          <SelectValue placeholder="開始" />
        </SelectTrigger>
        <SelectContent>
          {timeOptions.map((time) => (
            <SelectItem key={time} value={time}>
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-muted-foreground">~</span>

      <Select value={endTime} onValueChange={handleEndTimeChange} scrollToSelected>
        <SelectTrigger className="w-24">
          <SelectValue placeholder="終了" />
        </SelectTrigger>
        <SelectContent>
          {timeOptions
            .filter((time) => timeToMinutes(time) > timeToMinutes(startTime))
            .map((time) => (
              <SelectItem key={time} value={time}>
                {time}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
