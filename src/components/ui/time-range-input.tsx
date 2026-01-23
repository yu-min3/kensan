import { useEffect } from 'react'
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

// Add 1 hour to time string
function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const newHour = Math.min(h + 1, 23)
  return `${newHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
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

  // Auto-adjust end time when start time changes
  useEffect(() => {
    if (startTime && endTime) {
      const startMinutes = timeToMinutes(startTime)
      const endMinutes = timeToMinutes(endTime)

      // If end time is before or equal to start time, set it to start + 1 hour
      if (endMinutes <= startMinutes) {
        onEndTimeChange(addHour(startTime))
      }
    }
  }, [startTime]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center gap-2">
      <Select value={startTime} onValueChange={onStartTimeChange} scrollToSelected>
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

      <Select value={endTime} onValueChange={onEndTimeChange} scrollToSelected>
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
